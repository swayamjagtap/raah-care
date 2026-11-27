import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AmbulanceStatus,
  AmbulanceType,
  AssignmentStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import {
  CreateAmbulanceDto,
  QueryAmbulancesDto,
  UpdateAmbulanceStatusDto,
} from './dto/index.js';

// Sensible forward transitions. OUT_OF_SERVICE is reachable from any state.
// Recovery from OUT_OF_SERVICE is AVAILABLE only.
const ALLOWED_AMBULANCE_TRANSITIONS: Record<AmbulanceStatus, AmbulanceStatus[]> = {
  [AmbulanceStatus.AVAILABLE]: [
    AmbulanceStatus.ASSIGNED,
    AmbulanceStatus.OUT_OF_SERVICE,
  ],
  [AmbulanceStatus.ASSIGNED]: [
    AmbulanceStatus.EN_ROUTE,
    AmbulanceStatus.AVAILABLE,     // reassignment/cancellation
    AmbulanceStatus.OUT_OF_SERVICE,
  ],
  [AmbulanceStatus.EN_ROUTE]: [
    AmbulanceStatus.AT_SCENE,
    AmbulanceStatus.AVAILABLE,     // cancelled en-route
    AmbulanceStatus.OUT_OF_SERVICE,
  ],
  [AmbulanceStatus.AT_SCENE]: [
    AmbulanceStatus.PATIENT_ONBOARD,
    AmbulanceStatus.AVAILABLE,     // patient refused transport
    AmbulanceStatus.OUT_OF_SERVICE,
  ],
  [AmbulanceStatus.PATIENT_ONBOARD]: [
    AmbulanceStatus.TRANSPORTING,
    AmbulanceStatus.OUT_OF_SERVICE,
  ],
  [AmbulanceStatus.TRANSPORTING]: [
    AmbulanceStatus.AVAILABLE,
    AmbulanceStatus.OUT_OF_SERVICE,
  ],
  [AmbulanceStatus.OUT_OF_SERVICE]: [
    AmbulanceStatus.AVAILABLE,
  ],
};

@Injectable()
export class AmbulancesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAmbulanceDto) {
    // Prevent duplicate registration number
    const existing = await this.prisma.ambulance.findUnique({
      where: { registrationNumber: dto.registrationNumber },
    });
    if (existing) {
      throw new ConflictException(
        `Ambulance with registration number '${dto.registrationNumber}' already exists`,
      );
    }

    // Validate callSign uniqueness
    const existingCallSign = await this.prisma.ambulance.findUnique({
      where: { callSign: dto.callSign },
    });
    if (existingCallSign) {
      throw new ConflictException(
        `Ambulance with call sign '${dto.callSign}' already exists`,
      );
    }

    // Validate hospital if provided
    if (dto.baseHospitalId) {
      const hospital = await this.prisma.hospital.findUnique({
        where: { id: dto.baseHospitalId },
      });
      if (!hospital) {
        throw new NotFoundException(
          `Hospital with ID '${dto.baseHospitalId}' not found`,
        );
      }
    }

    return this.prisma.ambulance.create({
      data: {
        registrationNumber: dto.registrationNumber,
        callSign: dto.callSign,
        type: dto.type ?? AmbulanceType.BLS,
        status: AmbulanceStatus.AVAILABLE,
        currentLatitude: dto.currentLatitude,
        currentLongitude: dto.currentLongitude,
        isAvailable: dto.isAvailable ?? true,
        hospitalId: dto.baseHospitalId,
      },
      include: {
        baseHospital: {
          select: { id: true, name: true, code: true, status: true },
        },
        crew: {
          select: { id: true, name: true, role: true },
        },
      },
    });
  }

  async findAll(query: QueryAmbulancesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: {
      status?: AmbulanceStatus;
      type?: AmbulanceType;
      isAvailable?: boolean;
    } = {};

    if (query.status !== undefined) where.status = query.status;
    if (query.type !== undefined) where.type = query.type;
    if (query.isAvailable !== undefined) where.isAvailable = query.isAvailable;

    const [items, total] = await Promise.all([
      this.prisma.ambulance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isAvailable: 'desc' }, { createdAt: 'asc' }],
        include: {
          baseHospital: {
            select: { id: true, name: true, code: true, status: true },
          },
          crew: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      this.prisma.ambulance.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    if (user) {
      if (
        user.role === UserRole.PARAMEDIC ||
        user.role === UserRole.AMBULANCE_DRIVER
      ) {
        if (!user.ambulanceId || user.ambulanceId !== id) {
          throw new ForbiddenException(
            'Insufficient permissions: crew can only view details of their own ambulance',
          );
        }
      }
    }

    const ambulance = await this.prisma.ambulance.findUnique({
      where: { id },
      include: {
        baseHospital: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            status: true,
            phone: true,
          },
        },
        crew: {
          select: { id: true, name: true, role: true, phone: true },
        },
        assignments: {
          where: {
            status: {
              notIn: [
                AssignmentStatus.COMPLETED,
                AssignmentStatus.CANCELLED,
                AssignmentStatus.REJECTED,
              ],
            },
          },
          take: 1,
          orderBy: { assignedAt: 'desc' },
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                status: true,
                priority: true,
                incidentAddress: true,
              },
            },
          },
        },
      },
    });

    if (!ambulance) {
      throw new NotFoundException(`Ambulance with ID '${id}' not found`);
    }

    return ambulance;
  }

  async updateStatus(id: string, dto: UpdateAmbulanceStatusDto) {
    const ambulance = await this.prisma.ambulance.findUnique({
      where: { id },
    });

    if (!ambulance) {
      throw new NotFoundException(`Ambulance with ID '${id}' not found`);
    }

    if (ambulance.status === dto.status) {
      return ambulance;
    }

    const allowed = ALLOWED_AMBULANCE_TRANSITIONS[ambulance.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid ambulance status transition from ${ambulance.status} to ${dto.status}`,
      );
    }

    const isNowAvailable = dto.status === AmbulanceStatus.AVAILABLE;

    return this.prisma.ambulance.update({
      where: { id },
      data: {
        status: dto.status,
        isAvailable: isNowAvailable,
      },
    });
  }
}
