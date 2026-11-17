import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AmbulanceStatus,
  AmbulanceType,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AmbulancesService } from './ambulances.service.js';

describe('AmbulancesService', () => {
  let service: AmbulancesService;
  let prisma: {
    ambulance: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    hospital: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockAmbulance = {
    id: 'amb-uuid-1',
    registrationNumber: 'MH01-1234',
    callSign: 'RAAH-01',
    type: AmbulanceType.BLS,
    status: AmbulanceStatus.AVAILABLE,
    currentLatitude: 19.076,
    currentLongitude: 72.877,
    isAvailable: true,
    hospitalId: null,
    baseHospital: null,
    crew: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      ambulance: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      hospital: { findUnique: vi.fn() },
      $transaction: vi.fn(async (cb: (tx: typeof prisma) => unknown) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmbulancesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AmbulancesService>(AmbulancesService);
  });

  // ─── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an ambulance successfully', async () => {
      prisma.ambulance.findUnique.mockResolvedValue(null); // no dupe reg
      prisma.ambulance.findUnique.mockResolvedValueOnce(null); // no dupe callSign
      prisma.ambulance.create.mockResolvedValue(mockAmbulance);

      const result = await service.create({
        registrationNumber: 'MH01-1234',
        callSign: 'RAAH-01',
        type: AmbulanceType.BLS,
      });

      expect(result).toEqual(mockAmbulance);
      expect(prisma.ambulance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            registrationNumber: 'MH01-1234',
            callSign: 'RAAH-01',
            status: AmbulanceStatus.AVAILABLE,
            isAvailable: true,
          }),
        }),
      );
    });

    it('rejects duplicate registration number', async () => {
      prisma.ambulance.findUnique.mockResolvedValueOnce(mockAmbulance);

      await expect(
        service.create({
          registrationNumber: 'MH01-1234',
          callSign: 'RAAH-02',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects duplicate call sign', async () => {
      prisma.ambulance.findUnique
        .mockResolvedValueOnce(null)      // reg check: no dupe
        .mockResolvedValueOnce(mockAmbulance); // callSign check: dupe

      await expect(
        service.create({
          registrationNumber: 'MH01-9999',
          callSign: 'RAAH-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if baseHospitalId does not exist', async () => {
      prisma.ambulance.findUnique.mockResolvedValue(null);
      prisma.hospital.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          registrationNumber: 'MH01-5555',
          callSign: 'RAAH-05',
          baseHospitalId: 'non-existent-hospital',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns a paginated list of ambulances', async () => {
      prisma.ambulance.findMany.mockResolvedValue([mockAmbulance]);
      prisma.ambulance.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
    });

    it('filters by status', async () => {
      prisma.ambulance.findMany.mockResolvedValue([]);
      prisma.ambulance.count.mockResolvedValue(0);

      await service.findAll({ status: AmbulanceStatus.AVAILABLE });

      expect(prisma.ambulance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: AmbulanceStatus.AVAILABLE },
        }),
      );
    });

    it('filters by type and availability', async () => {
      prisma.ambulance.findMany.mockResolvedValue([]);
      prisma.ambulance.count.mockResolvedValue(0);

      await service.findAll({ type: AmbulanceType.ALS, isAvailable: true });

      expect(prisma.ambulance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: AmbulanceType.ALS, isAvailable: true },
        }),
      );
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns an ambulance with relations when found', async () => {
      prisma.ambulance.findUnique.mockResolvedValue(mockAmbulance);

      const result = await service.findOne('amb-uuid-1');
      expect(result).toEqual(mockAmbulance);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.ambulance.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStatus ────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('transitions from AVAILABLE to ASSIGNED', async () => {
      prisma.ambulance.findUnique.mockResolvedValue(mockAmbulance);
      prisma.ambulance.update.mockResolvedValue({
        ...mockAmbulance,
        status: AmbulanceStatus.ASSIGNED,
        isAvailable: false,
      });

      const result = await service.updateStatus('amb-uuid-1', {
        status: AmbulanceStatus.ASSIGNED,
      });

      expect(result.status).toBe(AmbulanceStatus.ASSIGNED);
      expect(prisma.ambulance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AmbulanceStatus.ASSIGNED,
            isAvailable: false,
          }),
        }),
      );
    });

    it('sets isAvailable=true when transitioning to AVAILABLE', async () => {
      const assignedAmbulance = {
        ...mockAmbulance,
        status: AmbulanceStatus.TRANSPORTING,
        isAvailable: false,
      };
      prisma.ambulance.findUnique.mockResolvedValue(assignedAmbulance);
      prisma.ambulance.update.mockResolvedValue({
        ...assignedAmbulance,
        status: AmbulanceStatus.AVAILABLE,
        isAvailable: true,
      });

      const result = await service.updateStatus('amb-uuid-1', {
        status: AmbulanceStatus.AVAILABLE,
      });

      expect(result.isAvailable).toBe(true);
    });

    it('rejects an invalid status transition', async () => {
      // AVAILABLE → PATIENT_ONBOARD is not allowed
      prisma.ambulance.findUnique.mockResolvedValue(mockAmbulance);

      await expect(
        service.updateStatus('amb-uuid-1', { status: AmbulanceStatus.PATIENT_ONBOARD }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if ambulance does not exist', async () => {
      prisma.ambulance.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('missing-id', { status: AmbulanceStatus.ASSIGNED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns current ambulance on no-op same-status update', async () => {
      prisma.ambulance.findUnique.mockResolvedValue(mockAmbulance);

      const result = await service.updateStatus('amb-uuid-1', {
        status: AmbulanceStatus.AVAILABLE,
      });

      expect(prisma.ambulance.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockAmbulance);
    });
  });
});
