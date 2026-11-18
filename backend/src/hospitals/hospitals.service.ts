import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HospitalStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateHospitalDto,
  CreateHospitalResourceDto,
  QueryHospitalsDto,
  UpdateHospitalDto,
  UpdateHospitalResourceDto,
} from './dto/index.js';

function isEmptyPayload(dto: object): boolean {
  if (!dto || Object.keys(dto).length === 0) {
    return true;
  }
  return !Object.values(dto).some((val) => val !== undefined);
}

@Injectable()
export class HospitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHospitalDto) {
    const existing = await this.prisma.hospital.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Hospital with code '${dto.code}' already exists`,
      );
    }

    try {
      return await this.prisma.hospital.create({
        data: {
          name: dto.name,
          code: dto.code,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          emergencyCapability: dto.emergencyCapability,
          status: dto.status ?? HospitalStatus.OPERATIONAL,
          phone: dto.phone,
          email: dto.email,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        const message = dto.code
          ? `Hospital with code '${dto.code}' already exists`
          : 'Hospital unique constraint violation';
        throw new ConflictException(message);
      }
      throw error;
    }
  }

  async findAll(query: QueryHospitalsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: {
      status?: HospitalStatus;
    } = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.hospital.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.hospital.count({ where }),
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
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      include: {
        resources: {
          orderBy: { type: 'asc' },
        },
      },
    });

    if (!hospital) {
      throw new NotFoundException(`Hospital with ID '${id}' not found`);
    }

    return hospital;
  }

  async update(id: string, dto: UpdateHospitalDto) {
    if (isEmptyPayload(dto)) {
      throw new BadRequestException('Update payload cannot be empty');
    }

    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
    });
    if (!hospital) {
      throw new NotFoundException(`Hospital with ID '${id}' not found`);
    }

    if (dto.code && dto.code !== hospital.code) {
      const existing = await this.prisma.hospital.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Hospital with code '${dto.code}' already exists`,
        );
      }
    }

    try {
      return await this.prisma.hospital.update({
        where: { id },
        data: {
          name: dto.name,
          code: dto.code,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          emergencyCapability: dto.emergencyCapability,
          status: dto.status,
          phone: dto.phone,
          email: dto.email,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        const message = dto.code
          ? `Hospital with code '${dto.code}' already exists`
          : 'Hospital unique constraint violation';
        throw new ConflictException(message);
      }
      throw error;
    }
  }

  async createResource(hospitalId: string, dto: CreateHospitalResourceDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });
    if (!hospital) {
      throw new NotFoundException(`Hospital with ID '${hospitalId}' not found`);
    }

    if (dto.quantity < 0 || dto.availableQuantity < 0) {
      throw new BadRequestException('Resource quantities cannot be negative');
    }

    if (dto.availableQuantity > dto.quantity) {
      throw new BadRequestException(
        `availableQuantity (${dto.availableQuantity}) cannot exceed quantity (${dto.quantity})`,
      );
    }

    const existingResource = await this.prisma.hospitalResource.findUnique({
      where: {
        hospitalId_type: {
          hospitalId,
          type: dto.type,
        },
      },
    });
    if (existingResource) {
      throw new ConflictException(
        `Resource of type '${dto.type}' already exists for this hospital`,
      );
    }

    try {
      return await this.prisma.hospitalResource.create({
        data: {
          hospitalId,
          type: dto.type,
          status: dto.status,
          quantity: dto.quantity,
          availableQuantity: dto.availableQuantity,
          notes: dto.notes,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        const message = dto.type
          ? `Resource of type '${dto.type}' already exists for this hospital`
          : 'Hospital resource unique constraint violation';
        throw new ConflictException(message);
      }
      throw error;
    }
  }

  async findResources(hospitalId: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });
    if (!hospital) {
      throw new NotFoundException(`Hospital with ID '${hospitalId}' not found`);
    }

    return this.prisma.hospitalResource.findMany({
      where: { hospitalId },
      orderBy: { type: 'asc' },
    });
  }

  async updateResource(
    hospitalId: string,
    resourceId: string,
    dto: UpdateHospitalResourceDto,
  ) {
    if (isEmptyPayload(dto)) {
      throw new BadRequestException('Update payload cannot be empty');
    }

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });
    if (!hospital) {
      throw new NotFoundException(`Hospital with ID '${hospitalId}' not found`);
    }

    const resource = await this.prisma.hospitalResource.findFirst({
      where: {
        id: resourceId,
        hospitalId,
      },
    });
    if (!resource) {
      throw new NotFoundException(
        `Hospital resource with ID '${resourceId}' not found for hospital '${hospitalId}'`,
      );
    }

    const targetQuantity =
      dto.quantity !== undefined ? dto.quantity : resource.quantity;
    const targetAvailable =
      dto.availableQuantity !== undefined
        ? dto.availableQuantity
        : resource.availableQuantity;

    if (targetQuantity < 0 || targetAvailable < 0) {
      throw new BadRequestException('Resource quantities cannot be negative');
    }

    if (targetAvailable > targetQuantity) {
      throw new BadRequestException(
        `availableQuantity (${targetAvailable}) cannot exceed quantity (${targetQuantity})`,
      );
    }

    if (dto.type && dto.type !== resource.type) {
      const existingResource = await this.prisma.hospitalResource.findUnique({
        where: {
          hospitalId_type: {
            hospitalId,
            type: dto.type,
          },
        },
      });
      if (existingResource) {
        throw new ConflictException(
          `Resource of type '${dto.type}' already exists for this hospital`,
        );
      }
    }

    try {
      const result = await this.prisma.hospitalResource.updateMany({
        where: {
          id: resourceId,
          hospitalId,
          version: resource.version,
        },
        data: {
          type: dto.type,
          status: dto.status,
          quantity: dto.quantity,
          availableQuantity: dto.availableQuantity,
          notes: dto.notes,
          version: {
            increment: 1,
          },
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          'Hospital resource was modified concurrently. Please retry.',
        );
      }

      return await this.prisma.hospitalResource.findUnique({
        where: { id: resourceId },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        const message = dto.type
          ? `Resource of type '${dto.type}' already exists for this hospital`
          : 'Hospital resource unique constraint violation';
        throw new ConflictException(message);
      }
      throw error;
    }
  }
}
