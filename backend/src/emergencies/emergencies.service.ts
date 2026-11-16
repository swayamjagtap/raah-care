import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CaseEventType,
  CasePriority,
  CaseStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateEmergencyDto,
  QueryEmergenciesDto,
  UpdateEmergencyStatusDto,
} from './dto/index.js';

const ALLOWED_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.CREATED]: [
    CaseStatus.DISPATCHING,
    CaseStatus.AMBULANCE_ASSIGNED,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.DISPATCHING]: [
    CaseStatus.AMBULANCE_ASSIGNED,
    CaseStatus.CREATED,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.AMBULANCE_ASSIGNED]: [
    CaseStatus.AMBULANCE_EN_ROUTE,
    CaseStatus.DISPATCHING,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.AMBULANCE_EN_ROUTE]: [
    CaseStatus.ARRIVED_AT_SCENE,
    CaseStatus.AMBULANCE_ASSIGNED,
    CaseStatus.DISPATCHING,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.ARRIVED_AT_SCENE]: [
    CaseStatus.PATIENT_ONBOARD,
    CaseStatus.AMBULANCE_EN_ROUTE,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.PATIENT_ONBOARD]: [
    CaseStatus.HOSPITAL_SELECTED,
    CaseStatus.HOSPITAL_NOTIFIED,
    CaseStatus.EN_ROUTE_TO_HOSPITAL,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.HOSPITAL_SELECTED]: [
    CaseStatus.HOSPITAL_NOTIFIED,
    CaseStatus.EN_ROUTE_TO_HOSPITAL,
    CaseStatus.PATIENT_ONBOARD,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.HOSPITAL_NOTIFIED]: [
    CaseStatus.EN_ROUTE_TO_HOSPITAL,
    CaseStatus.HOSPITAL_SELECTED,
    CaseStatus.ARRIVED_AT_HOSPITAL,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.EN_ROUTE_TO_HOSPITAL]: [
    CaseStatus.ARRIVED_AT_HOSPITAL,
    CaseStatus.HOSPITAL_SELECTED,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.ARRIVED_AT_HOSPITAL]: [
    CaseStatus.HANDOVER_IN_PROGRESS,
    CaseStatus.COMPLETED,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.HANDOVER_IN_PROGRESS]: [
    CaseStatus.COMPLETED,
    CaseStatus.ARRIVED_AT_HOSPITAL,
    CaseStatus.CANCELLED,
  ],
  [CaseStatus.COMPLETED]: [],
  [CaseStatus.CANCELLED]: [],
};

const STATUS_TO_EVENT_MAP: Partial<Record<CaseStatus, CaseEventType>> = {
  [CaseStatus.CREATED]: CaseEventType.CASE_CREATED,
  [CaseStatus.DISPATCHING]: CaseEventType.CASE_CREATED,
  [CaseStatus.AMBULANCE_ASSIGNED]: CaseEventType.AMBULANCE_ASSIGNED,
  [CaseStatus.AMBULANCE_EN_ROUTE]: CaseEventType.AMBULANCE_EN_ROUTE,
  [CaseStatus.ARRIVED_AT_SCENE]: CaseEventType.ARRIVED_AT_SCENE,
  [CaseStatus.PATIENT_ONBOARD]: CaseEventType.PATIENT_ONBOARD,
  [CaseStatus.HOSPITAL_SELECTED]: CaseEventType.HOSPITAL_SELECTED,
  [CaseStatus.HOSPITAL_NOTIFIED]: CaseEventType.HOSPITAL_NOTIFIED,
  [CaseStatus.EN_ROUTE_TO_HOSPITAL]: CaseEventType.AMBULANCE_EN_ROUTE,
  [CaseStatus.ARRIVED_AT_HOSPITAL]: CaseEventType.PATIENT_ARRIVED,
  [CaseStatus.HANDOVER_IN_PROGRESS]: CaseEventType.HANDOVER_STARTED,
  [CaseStatus.COMPLETED]: CaseEventType.CASE_COMPLETED,
  [CaseStatus.CANCELLED]: CaseEventType.CASE_CANCELLED,
};

@Injectable()
export class EmergenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmergencyDto) {
    if (dto.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
      });
      if (!patient) {
        throw new NotFoundException(`Patient with ID '${dto.patientId}' not found`);
      }
    }

    if (dto.initiatorId) {
      const initiator = await this.prisma.user.findUnique({
        where: { id: dto.initiatorId },
      });
      if (!initiator) {
        throw new NotFoundException(`Initiator user with ID '${dto.initiatorId}' not found`);
      }
    }

    const caseNumber = await this.generateUniqueCaseNumber();

    const emergency = await this.prisma.$transaction(async (tx) => {
      const createdCase = await tx.emergencyCase.create({
        data: {
          caseNumber,
          priority: dto.priority ?? CasePriority.HIGH,
          status: CaseStatus.CREATED,
          incidentLatitude: dto.incidentLatitude,
          incidentLongitude: dto.incidentLongitude,
          incidentAddress: dto.incidentAddress,
          symptoms: dto.symptoms,
          notes: dto.notes,
          currentCondition: dto.currentCondition,
          patientId: dto.patientId,
          initiatorId: dto.initiatorId,
        },
      });

      await tx.caseEvent.create({
        data: {
          caseId: createdCase.id,
          eventType: CaseEventType.CASE_CREATED,
          actorId: dto.initiatorId ?? null,
          notes: dto.notes ?? 'Emergency case created',
          payload: {
            priority: createdCase.priority,
            incidentAddress: dto.incidentAddress,
            coordinates: [dto.incidentLatitude, dto.incidentLongitude],
            symptoms: dto.symptoms ?? null,
            condition: dto.currentCondition ?? null,
          },
        },
      });

      return createdCase;
    });

    return emergency;
  }

  async findAll(query: QueryEmergenciesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: {
      status?: CaseStatus;
      priority?: CasePriority;
    } = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    const [items, total] = await Promise.all([
      this.prisma.emergencyCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              emergencyContact: true,
              bloodGroup: true,
            },
          },
          initiator: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
          destinationHospital: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.emergencyCase.count({ where }),
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

  async findOne(id: string) {
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            phoneNumber: true,
            emergencyContact: true,
            medicalHistory: true,
            allergies: true,
            currentMedication: true,
          },
        },
        initiator: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },
        destinationHospital: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            latitude: true,
            longitude: true,
            emergencyCapability: true,
            status: true,
            phone: true,
          },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            ambulance: {
              select: {
                id: true,
                registrationNumber: true,
                callSign: true,
                type: true,
                status: true,
                currentLatitude: true,
                currentLongitude: true,
                isAvailable: true,
              },
            },
            dispatcher: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!emergency) {
      throw new NotFoundException(`Emergency case with ID '${id}' not found`);
    }

    return emergency;
  }

  async updateStatus(id: string, dto: UpdateEmergencyStatusDto) {
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id },
    });

    if (!emergency) {
      throw new NotFoundException(`Emergency case with ID '${id}' not found`);
    }

    if (emergency.status === dto.status) {
      return emergency;
    }

    if (
      emergency.status === CaseStatus.COMPLETED ||
      emergency.status === CaseStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot change status of a ${emergency.status.toLowerCase()} emergency case`,
      );
    }

    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[emergency.status] ?? [];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${emergency.status} to ${dto.status}`,
      );
    }

    const isTerminal =
      dto.status === CaseStatus.COMPLETED || dto.status === CaseStatus.CANCELLED;

    const eventType =
      STATUS_TO_EVENT_MAP[dto.status] ?? CaseEventType.CONDITION_UPDATED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedCase = await tx.emergencyCase.update({
        where: { id },
        data: {
          status: dto.status,
          resolvedAt: isTerminal ? new Date() : undefined,
        },
      });

      await tx.caseEvent.create({
        data: {
          caseId: id,
          eventType,
          actorId: dto.actorId ?? null,
          notes: dto.notes ?? null,
          payload: {
            fromStatus: emergency.status,
            toStatus: dto.status,
            notes: dto.notes ?? null,
          },
        },
      });

      return updatedCase;
    });

    return updated;
  }

  private async generateUniqueCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.emergencyCase.count();
    const sequence = String(count + 1).padStart(6, '0');
    let candidate = `RAAH-${year}-${sequence}`;

    const existing = await this.prisma.emergencyCase.findUnique({
      where: { caseNumber: candidate },
    });

    if (existing) {
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      candidate = `RAAH-${year}-${sequence}-${randomSuffix}`;
    }

    return candidate;
  }
}
