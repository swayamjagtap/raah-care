import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HospitalStatus,
  ResourceStatus,
  ResourceType,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HospitalsService } from './hospitals.service.js';

describe('HospitalsService', () => {
  let service: HospitalsService;
  let prisma: {
    hospital: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    hospitalResource: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };

  const mockHospital = {
    id: 'hosp-uuid-1',
    name: 'City Care Hospital',
    code: 'CITY-01',
    address: '123 Health Ave, Mumbai',
    latitude: 19.076,
    longitude: 72.877,
    emergencyCapability: 'Level 1 Trauma',
    status: HospitalStatus.OPERATIONAL,
    phone: '+919876543210',
    email: 'contact@citycare.org',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResource = {
    id: 'res-uuid-1',
    hospitalId: 'hosp-uuid-1',
    type: ResourceType.ICU,
    status: ResourceStatus.AVAILABLE,
    quantity: 10,
    availableQuantity: 5,
    version: 0,
    notes: 'Main ICU block',
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      hospital: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      hospitalResource: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<HospitalsService>(HospitalsService);
  });

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a hospital with default status when not provided', async () => {
      prisma.hospital.findUnique.mockResolvedValue(null);
      prisma.hospital.create.mockResolvedValue(mockHospital);

      const result = await service.create({
        name: 'City Care Hospital',
        code: 'CITY-01',
        address: '123 Health Ave, Mumbai',
        latitude: 19.076,
        longitude: 72.877,
      });

      expect(result).toEqual(mockHospital);
      expect(prisma.hospital.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'CITY-01',
          status: HospitalStatus.OPERATIONAL,
        }),
      });
    });

    it('creates a hospital with explicit status', async () => {
      prisma.hospital.findUnique.mockResolvedValue(null);
      prisma.hospital.create.mockResolvedValue({
        ...mockHospital,
        status: HospitalStatus.BUSY,
      });

      const result = await service.create({
        name: 'City Care Hospital',
        code: 'CITY-01',
        address: '123 Health Ave, Mumbai',
        latitude: 19.076,
        longitude: 72.877,
        status: HospitalStatus.BUSY,
      });

      expect(result.status).toBe(HospitalStatus.BUSY);
      expect(prisma.hospital.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: HospitalStatus.BUSY,
        }),
      });
    });

    it('rejects duplicate hospital code', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);

      await expect(
        service.create({
          name: 'Another Hospital',
          code: 'CITY-01',
          address: '456 Road',
          latitude: 19.1,
          longitude: 72.8,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('handles Prisma P2002 race condition on hospital create', async () => {
      prisma.hospital.findUnique.mockResolvedValue(null);
      prisma.hospital.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create({
          name: 'Another Hospital',
          code: 'CITY-01',
          address: '456 Road',
          latitude: 19.1,
          longitude: 72.8,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns a paginated list of hospitals', async () => {
      prisma.hospital.findMany.mockResolvedValue([mockHospital]);
      prisma.hospital.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('filters by status', async () => {
      prisma.hospital.findMany.mockResolvedValue([]);
      prisma.hospital.count.mockResolvedValue(0);

      await service.findAll({ status: HospitalStatus.OPERATIONAL });

      expect(prisma.hospital.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: HospitalStatus.OPERATIONAL },
        }),
      );
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a hospital with resources included', async () => {
      const hospitalWithResources = {
        ...mockHospital,
        resources: [mockResource],
      };
      prisma.hospital.findUnique.mockResolvedValue(hospitalWithResources);

      const result = await service.findOne('hosp-uuid-1');
      expect(result).toEqual(hospitalWithResources);
      expect(prisma.hospital.findUnique).toHaveBeenCalledWith({
        where: { id: 'hosp-uuid-1' },
        include: {
          resources: {
            orderBy: { type: 'asc' },
          },
        },
      });
    });

    it('throws NotFoundException when hospital is not found', async () => {
      prisma.hospital.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates hospital information successfully', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      const updated = { ...mockHospital, name: 'Renamed Hospital' };
      prisma.hospital.update.mockResolvedValue(updated);

      const result = await service.update('hosp-uuid-1', {
        name: 'Renamed Hospital',
      });
      expect(result).toEqual(updated);
    });

    it('rejects empty hospital updates', async () => {
      await expect(service.update('hosp-uuid-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException if hospital does not exist', async () => {
      prisma.hospital.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects updating code to an existing code of another hospital', async () => {
      prisma.hospital.findUnique
        .mockResolvedValueOnce(mockHospital) // find hospital by id
        .mockResolvedValueOnce({ id: 'hosp-uuid-2', code: 'TAKEN-01' }); // code check

      await expect(
        service.update('hosp-uuid-1', { code: 'TAKEN-01' }),
      ).rejects.toThrow(ConflictException);
    });

    it('handles Prisma P2002 race condition on hospital update with code', async () => {
      prisma.hospital.findUnique
        .mockResolvedValueOnce(mockHospital)
        .mockResolvedValueOnce(null);
      prisma.hospital.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.update('hosp-uuid-1', { code: 'NEW-01' }),
      ).rejects.toThrow("Hospital with code 'NEW-01' already exists");
    });

    it('handles Prisma P2002 on hospital update when code is omitted by returning generic conflict message', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospital.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.update('hosp-uuid-1', { name: 'New Name' }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.update('hosp-uuid-1', { name: 'New Name' }),
      ).rejects.toThrow('Hospital unique constraint violation');
    });
  });

  // ─── createResource ─────────────────────────────────────────────────────

  describe('createResource', () => {
    it('creates a resource under a hospital successfully', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findUnique.mockResolvedValue(null);
      prisma.hospitalResource.create.mockResolvedValue(mockResource);

      const result = await service.createResource('hosp-uuid-1', {
        type: ResourceType.ICU,
        quantity: 10,
        availableQuantity: 5,
        status: ResourceStatus.AVAILABLE,
      });

      expect(result).toEqual(mockResource);
    });

    it('throws NotFoundException if hospital does not exist', async () => {
      prisma.hospital.findUnique.mockResolvedValue(null);

      await expect(
        service.createResource('missing-hosp', {
          type: ResourceType.ICU,
          quantity: 10,
          availableQuantity: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if availableQuantity > quantity', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);

      await expect(
        service.createResource('hosp-uuid-1', {
          type: ResourceType.ICU,
          quantity: 5,
          availableQuantity: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if quantity or availableQuantity is negative', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);

      await expect(
        service.createResource('hosp-uuid-1', {
          type: ResourceType.ICU,
          quantity: -1,
          availableQuantity: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createResource('hosp-uuid-1', {
          type: ResourceType.ICU,
          quantity: 5,
          availableQuantity: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate resource type within the same hospital', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findUnique.mockResolvedValue(mockResource);

      await expect(
        service.createResource('hosp-uuid-1', {
          type: ResourceType.ICU,
          quantity: 10,
          availableQuantity: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('handles Prisma P2002 race condition on resource create', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findUnique.mockResolvedValue(null);
      prisma.hospitalResource.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.createResource('hosp-uuid-1', {
          type: ResourceType.ICU,
          quantity: 10,
          availableQuantity: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── findResources ──────────────────────────────────────────────────────

  describe('findResources', () => {
    it('returns list of resources for an existing hospital', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findMany.mockResolvedValue([mockResource]);

      const result = await service.findResources('hosp-uuid-1');
      expect(result).toEqual([mockResource]);
    });

    it('throws NotFoundException when hospital does not exist', async () => {
      prisma.hospital.findUnique.mockResolvedValue(null);

      await expect(service.findResources('missing-hosp')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── updateResource ─────────────────────────────────────────────────────

  describe('updateResource', () => {
    it('updates resource details successfully using optimistic concurrency', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue(mockResource);
      prisma.hospitalResource.updateMany.mockResolvedValue({ count: 1 });
      const updatedResource = { ...mockResource, availableQuantity: 8 };
      prisma.hospitalResource.findUnique.mockResolvedValue(updatedResource);

      const result = await service.updateResource(
        'hosp-uuid-1',
        'res-uuid-1',
        { availableQuantity: 8 },
      );

      expect(result).toEqual(updatedResource);
      expect(prisma.hospitalResource.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'res-uuid-1',
          hospitalId: 'hosp-uuid-1',
          version: mockResource.version,
        },
        data: expect.objectContaining({
          availableQuantity: 8,
          version: { increment: 1 },
        }),
      });
    });

    it('rejects empty resource updates', async () => {
      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if hospital does not exist', async () => {
      prisma.hospital.findUnique.mockResolvedValue(null);

      await expect(
        service.updateResource('missing-hosp', 'res-uuid-1', {
          availableQuantity: 3,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if resource does not exist', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue(null);

      await expect(
        service.updateResource('hosp-uuid-1', 'missing-res', {
          availableQuantity: 3,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if resource exists but belongs to another hospital', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue(null);

      await expect(
        service.updateResource('hosp-uuid-1', 'res-from-other-hosp', {
          availableQuantity: 3,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.hospitalResource.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'res-from-other-hosp',
          hospitalId: 'hosp-uuid-1',
        },
      });
    });

    it('throws ConflictException when concurrent modification results in zero updated records', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue(mockResource);
      prisma.hospitalResource.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          availableQuantity: 8,
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          availableQuantity: 8,
        }),
      ).rejects.toThrow('Hospital resource was modified concurrently. Please retry.');
    });

    it('two concurrent updates using the same version: only the first succeeds, second gets 409', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      // Both requests read initial version: 0
      prisma.hospitalResource.findFirst.mockResolvedValue({
        ...mockResource,
        version: 0,
      });
      // First update: count=1 (success)
      // Second update: count=0 (the version was already incremented by first update)
      prisma.hospitalResource.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      prisma.hospitalResource.findUnique.mockResolvedValue({
        ...mockResource,
        version: 1,
      });

      // First succeeds
      const result = await service.updateResource(
        'hosp-uuid-1',
        'res-uuid-1',
        { availableQuantity: 8 },
      );
      expect(result?.version).toBe(1);

      // Second (same initial version: 0) conflicts because version in DB is now 1
      const conflictPromise = service.updateResource(
        'hosp-uuid-1',
        'res-uuid-1',
        { availableQuantity: 9 },
      );
      await expect(conflictPromise).rejects.toThrow(ConflictException);
      await expect(conflictPromise).rejects.toThrow(
        'Hospital resource was modified concurrently. Please retry.',
      );
    });

    it('partially updates only quantity field', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue({
        ...mockResource,
        quantity: 10,
        availableQuantity: 5,
      });
      prisma.hospitalResource.updateMany.mockResolvedValue({ count: 1 });
      const updatedResource = { ...mockResource, quantity: 15, availableQuantity: 5 };
      prisma.hospitalResource.findUnique.mockResolvedValue(updatedResource);

      const result = await service.updateResource('hosp-uuid-1', 'res-uuid-1', {
        quantity: 15,
      });

      expect(result?.quantity).toBe(15);
      expect(prisma.hospitalResource.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'res-uuid-1',
          hospitalId: 'hosp-uuid-1',
          version: mockResource.version,
        },
        data: expect.objectContaining({
          quantity: 15,
          version: { increment: 1 },
        }),
      });
    });

    it('partially updates only availableQuantity field', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue({
        ...mockResource,
        quantity: 10,
        availableQuantity: 5,
      });
      prisma.hospitalResource.updateMany.mockResolvedValue({ count: 1 });
      const updatedResource = { ...mockResource, quantity: 10, availableQuantity: 8 };
      prisma.hospitalResource.findUnique.mockResolvedValue(updatedResource);

      const result = await service.updateResource('hosp-uuid-1', 'res-uuid-1', {
        availableQuantity: 8,
      });

      expect(result?.availableQuantity).toBe(8);
      expect(prisma.hospitalResource.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'res-uuid-1',
          hospitalId: 'hosp-uuid-1',
          version: mockResource.version,
        },
        data: expect.objectContaining({
          availableQuantity: 8,
          version: { increment: 1 },
        }),
      });
    });

    it('throws BadRequestException if updated availableQuantity > existing quantity', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue({
        ...mockResource,
        quantity: 5,
        availableQuantity: 2,
      });

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          availableQuantity: 8,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if updated quantity < existing availableQuantity', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue({
        ...mockResource,
        quantity: 10,
        availableQuantity: 8,
      });

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          quantity: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if updated quantities are negative', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue(mockResource);

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          quantity: -2,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          availableQuantity: -2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects updating resource type to an existing type in the same hospital', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue(mockResource);
      prisma.hospitalResource.findUnique.mockResolvedValue({
        id: 'res-uuid-2',
        type: ResourceType.OXYGEN,
      });

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          type: ResourceType.OXYGEN,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('handles Prisma P2002 race condition on resource update with type', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue(mockResource);
      prisma.hospitalResource.findUnique.mockResolvedValue(null);
      prisma.hospitalResource.updateMany.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          type: ResourceType.OXYGEN,
        }),
      ).rejects.toThrow("Resource of type 'OXYGEN' already exists for this hospital");
    });

    it('handles Prisma P2002 race condition on resource update without type using generic message', async () => {
      prisma.hospital.findUnique.mockResolvedValue(mockHospital);
      prisma.hospitalResource.findFirst.mockResolvedValue(mockResource);
      prisma.hospitalResource.updateMany.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.updateResource('hosp-uuid-1', 'res-uuid-1', {
          quantity: 20,
        }),
      ).rejects.toThrow('Hospital resource unique constraint violation');
    });
  });
});
