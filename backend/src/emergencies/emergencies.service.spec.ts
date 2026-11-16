import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CaseEventType,
  CasePriority,
  CaseStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmergenciesService } from './emergencies.service.js';

describe('EmergenciesService', () => {
  let service: EmergenciesService;
  let prisma: {
    patient: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
    emergencyCase: {
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    caseEvent: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      patient: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
      emergencyCase: {
        count: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      caseEvent: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: typeof prisma) => unknown) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergenciesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<EmergenciesService>(EmergenciesService);
  });

  describe('create', () => {
    it('creates an emergency case and initial CaseEvent successfully', async () => {
      const mockCreatedCase = {
        id: 'case-uuid-1',
        caseNumber: `RAAH-${new Date().getFullYear()}-000001`,
        status: CaseStatus.CREATED,
        priority: CasePriority.CRITICAL,
        incidentLatitude: 19.076,
        incidentLongitude: 72.8777,
        incidentAddress: 'Andheri West, Mumbai',
        symptoms: 'Severe chest pain',
        notes: 'Patient conscious',
        currentCondition: 'Unstable',
        patientId: null,
        initiatorId: null,
      };

      prisma.emergencyCase.count.mockResolvedValue(0);
      prisma.emergencyCase.findUnique.mockResolvedValue(null);
      prisma.emergencyCase.create.mockResolvedValue(mockCreatedCase);
      prisma.caseEvent.create.mockResolvedValue({ id: 'event-uuid-1' });

      const result = await service.create({
        incidentLatitude: 19.076,
        incidentLongitude: 72.8777,
        incidentAddress: 'Andheri West, Mumbai',
        priority: CasePriority.CRITICAL,
        symptoms: 'Severe chest pain',
        notes: 'Patient conscious',
        currentCondition: 'Unstable',
      });

      expect(result).toEqual(mockCreatedCase);
      expect(prisma.emergencyCase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: CaseStatus.CREATED,
          priority: CasePriority.CRITICAL,
          caseNumber: expect.stringMatching(/^RAAH-\d{4}-\d{6}/),
          incidentAddress: 'Andheri West, Mumbai',
        }),
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'case-uuid-1',
          eventType: CaseEventType.CASE_CREATED,
          payload: expect.objectContaining({
            coordinates: [19.076, 72.8777],
            priority: CasePriority.CRITICAL,
          }),
        }),
      });
    });

    it('throws NotFoundException if patientId is provided but patient does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          patientId: 'missing-patient-id',
          incidentLatitude: 19.076,
          incidentLongitude: 72.8777,
          incidentAddress: 'Mumbai',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if initiatorId is provided but user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          initiatorId: 'missing-user-id',
          incidentLatitude: 19.076,
          incidentLongitude: 72.8777,
          incidentAddress: 'Mumbai',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns a paginated list of emergencies', async () => {
      const mockCases = [
        { id: '1', caseNumber: 'RAAH-2026-000001', status: CaseStatus.CREATED },
        { id: '2', caseNumber: 'RAAH-2026-000002', status: CaseStatus.DISPATCHING },
      ];

      prisma.emergencyCase.findMany.mockResolvedValue(mockCases);
      prisma.emergencyCase.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockCases);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('filters by status and priority', async () => {
      prisma.emergencyCase.findMany.mockResolvedValue([]);
      prisma.emergencyCase.count.mockResolvedValue(0);

      await service.findAll({
        status: CaseStatus.AMBULANCE_ASSIGNED,
        priority: CasePriority.CRITICAL,
      });

      expect(prisma.emergencyCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: CaseStatus.AMBULANCE_ASSIGNED,
            priority: CasePriority.CRITICAL,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns an emergency case with relations when found', async () => {
      const mockCase = {
        id: 'case-uuid-1',
        caseNumber: 'RAAH-2026-000001',
        status: CaseStatus.CREATED,
        patient: null,
        initiator: null,
        destinationHospital: null,
        assignments: [],
        events: [],
      };

      prisma.emergencyCase.findUnique.mockResolvedValue(mockCase);

      const result = await service.findOne('case-uuid-1');
      expect(result).toEqual(mockCase);
    });

    it('throws NotFoundException when emergency is not found', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('executes a valid status transition and creates corresponding CaseEvent', async () => {
      const existingCase = {
        id: 'case-uuid-1',
        status: CaseStatus.CREATED,
      };

      const updatedCase = {
        id: 'case-uuid-1',
        status: CaseStatus.AMBULANCE_ASSIGNED,
      };

      prisma.emergencyCase.findUnique.mockResolvedValue(existingCase);
      prisma.emergencyCase.update.mockResolvedValue(updatedCase);
      prisma.caseEvent.create.mockResolvedValue({ id: 'event-uuid-2' });

      const result = await service.updateStatus('case-uuid-1', {
        status: CaseStatus.AMBULANCE_ASSIGNED,
        notes: 'Dispatched unit 101',
      });

      expect(result).toEqual(updatedCase);
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'case-uuid-1' },
        data: expect.objectContaining({
          status: CaseStatus.AMBULANCE_ASSIGNED,
        }),
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'case-uuid-1',
          eventType: CaseEventType.AMBULANCE_ASSIGNED,
          notes: 'Dispatched unit 101',
          payload: {
            fromStatus: CaseStatus.CREATED,
            toStatus: CaseStatus.AMBULANCE_ASSIGNED,
            notes: 'Dispatched unit 101',
          },
        }),
      });
    });

    it('rejects an invalid status transition (e.g. CREATED -> COMPLETED)', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue({
        id: 'case-uuid-1',
        status: CaseStatus.CREATED,
      });

      await expect(
        service.updateStatus('case-uuid-1', {
          status: CaseStatus.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transitioning from a terminal status (COMPLETED)', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue({
        id: 'case-uuid-1',
        status: CaseStatus.COMPLETED,
      });

      await expect(
        service.updateStatus('case-uuid-1', {
          status: CaseStatus.DISPATCHING,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if emergency does not exist', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent-id', {
          status: CaseStatus.DISPATCHING,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
