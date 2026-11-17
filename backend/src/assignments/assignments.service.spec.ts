import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AmbulanceStatus,
  AmbulanceType,
  AssignmentStatus,
  CaseEventType,
  CasePriority,
  CaseStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignmentsService } from './assignments.service.js';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: {
    emergencyCase: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    ambulance: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    assignment: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    user: { findUnique: ReturnType<typeof vi.fn> };
    caseEvent: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const mockEmergency = {
    id: 'emg-uuid-1',
    caseNumber: 'RAAH-2026-000001',
    status: CaseStatus.CREATED,
    priority: CasePriority.HIGH,
  };

  const mockAmbulance = {
    id: 'amb-uuid-1',
    registrationNumber: 'MH01-1234',
    callSign: 'RAAH-01',
    type: AmbulanceType.BLS,
    status: AmbulanceStatus.AVAILABLE,
    isAvailable: true,
  };

  const mockAssignment = {
    id: 'asg-uuid-1',
    caseId: 'emg-uuid-1',
    ambulanceId: 'amb-uuid-1',
    dispatcherId: 'disp-uuid-1',
    status: AssignmentStatus.ASSIGNED,
    assignedAt: new Date(),
    notes: 'Urgent response',
    ambulance: mockAmbulance,
    case: mockEmergency,
  };

  beforeEach(async () => {
    prisma = {
      emergencyCase: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      ambulance: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      assignment: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: { findUnique: vi.fn() },
      caseEvent: { create: vi.fn() },
      $transaction: vi.fn(async (cb: (tx: typeof prisma) => unknown) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  // ─── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an assignment transactionally and updates ambulance, case, and creates event', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findUnique.mockResolvedValue(mockAmbulance);
      prisma.assignment.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'disp-uuid-1', role: 'DISPATCHER' });
      prisma.ambulance.updateMany.mockResolvedValue({ count: 1 });
      prisma.emergencyCase.update.mockResolvedValue({
        ...mockEmergency,
        status: CaseStatus.AMBULANCE_ASSIGNED,
      });
      prisma.assignment.create.mockResolvedValue(mockAssignment);
      prisma.caseEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.create('emg-uuid-1', {
        ambulanceId: 'amb-uuid-1',
        dispatcherId: 'disp-uuid-1',
        notes: 'Urgent response',
      });

      expect(result).toEqual(mockAssignment);
      expect(prisma.ambulance.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'amb-uuid-1',
          isAvailable: true,
          status: AmbulanceStatus.AVAILABLE,
        },
        data: {
          status: AmbulanceStatus.ASSIGNED,
          isAvailable: false,
        },
      });
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'emg-uuid-1' },
        data: { status: CaseStatus.AMBULANCE_ASSIGNED },
      });
      expect(prisma.assignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'emg-uuid-1',
          ambulanceId: 'amb-uuid-1',
          dispatcherId: 'disp-uuid-1',
          status: AssignmentStatus.ASSIGNED,
        }),
        include: expect.any(Object),
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'emg-uuid-1',
          eventType: CaseEventType.AMBULANCE_ASSIGNED,
          payload: expect.objectContaining({
            assignmentId: 'asg-uuid-1',
            ambulanceCallSign: 'RAAH-01',
          }),
        }),
      });
    });

    it('throws NotFoundException if emergency does not exist', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(
        service.create('missing-emg', { ambulanceId: 'amb-uuid-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if emergency is not in assignable status', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue({
        ...mockEmergency,
        status: CaseStatus.COMPLETED,
      });

      await expect(
        service.create('emg-uuid-1', { ambulanceId: 'amb-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if ambulance does not exist', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findUnique.mockResolvedValue(null);

      await expect(
        service.create('emg-uuid-1', { ambulanceId: 'missing-amb' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if ambulance is not available', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findUnique.mockResolvedValue({
        ...mockAmbulance,
        isAvailable: false,
        status: AmbulanceStatus.ASSIGNED,
      });

      await expect(
        service.create('emg-uuid-1', { ambulanceId: 'amb-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if ambulance already has active assignment', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findUnique.mockResolvedValue(mockAmbulance);
      prisma.assignment.findFirst.mockResolvedValue({ id: 'active-asg' });

      await expect(
        service.create('emg-uuid-1', { ambulanceId: 'amb-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if dispatcherId does not exist', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findUnique.mockResolvedValue(mockAmbulance);
      prisma.assignment.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create('emg-uuid-1', {
          ambulanceId: 'amb-uuid-1',
          dispatcherId: 'missing-disp',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException on concurrent assignment conflict (count === 0)', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.ambulance.findUnique.mockResolvedValue(mockAmbulance);
      prisma.assignment.findFirst.mockResolvedValue(null);
      prisma.ambulance.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.create('emg-uuid-1', { ambulanceId: 'amb-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── accept ────────────────────────────────────────────────────────────

  describe('accept', () => {
    it('accepts assignment, updates status to ACCEPTED, and records CaseEvent', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      const updatedAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.ACCEPTED,
        acceptedAt: new Date(),
      };
      prisma.assignment.update.mockResolvedValue(updatedAssignment);
      prisma.caseEvent.create.mockResolvedValue({ id: 'evt-2' });

      const result = await service.accept('asg-uuid-1', { notes: 'Confirmed' });

      expect(result.status).toBe(AssignmentStatus.ACCEPTED);
      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: 'asg-uuid-1' },
        data: expect.objectContaining({
          status: AssignmentStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'emg-uuid-1',
          eventType: CaseEventType.AMBULANCE_ACCEPTED,
        }),
      });
    });

    it('throws NotFoundException if assignment does not exist', async () => {
      prisma.assignment.findUnique.mockResolvedValue(null);

      await expect(service.accept('missing-id', {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if assignment is not in ASSIGNED status', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.ACCEPTED,
      });

      await expect(service.accept('asg-uuid-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  // ─── reject ────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('rejects assignment, frees ambulance, resets emergency to DISPATCHING, and records CaseEvent', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      const rejectedAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.REJECTED,
        rejectedAt: new Date(),
      };
      prisma.assignment.update.mockResolvedValue(rejectedAssignment);
      prisma.ambulance.update.mockResolvedValue({ ...mockAmbulance, status: AmbulanceStatus.AVAILABLE, isAvailable: true });
      prisma.emergencyCase.update.mockResolvedValue({ ...mockEmergency, status: CaseStatus.DISPATCHING });
      prisma.caseEvent.create.mockResolvedValue({ id: 'evt-3' });

      const result = await service.reject('asg-uuid-1', { notes: 'Crew unavailable' });

      expect(result.status).toBe(AssignmentStatus.REJECTED);
      expect(prisma.ambulance.update).toHaveBeenCalledWith({
        where: { id: 'amb-uuid-1' },
        data: {
          status: AmbulanceStatus.AVAILABLE,
          isAvailable: true,
        },
      });
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'emg-uuid-1' },
        data: { status: CaseStatus.DISPATCHING },
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'emg-uuid-1',
          eventType: CaseEventType.AMBULANCE_REJECTED,
          notes: 'Crew unavailable',
        }),
      });
    });

    it('throws BadRequestException if assignment is not in ASSIGNED status', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.EN_ROUTE,
      });

      await expect(
        service.reject('asg-uuid-1', { notes: 'Too late' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateStatus (Lifecycle) ──────────────────────────────────────────

  describe('updateStatus lifecycle', () => {
    it('transitions ACCEPTED -> EN_ROUTE maintaining consistent states', async () => {
      const acceptedAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.ACCEPTED,
      };
      prisma.assignment.findUnique.mockResolvedValue(acceptedAssignment);
      prisma.assignment.update.mockResolvedValue({
        ...acceptedAssignment,
        status: AssignmentStatus.EN_ROUTE,
      });

      const result = await service.updateStatus('asg-uuid-1', {
        status: AssignmentStatus.EN_ROUTE,
      });

      expect(result.status).toBe(AssignmentStatus.EN_ROUTE);
      expect(prisma.ambulance.update).toHaveBeenCalledWith({
        where: { id: 'amb-uuid-1' },
        data: {
          status: AmbulanceStatus.EN_ROUTE,
          isAvailable: false,
        },
      });
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'emg-uuid-1' },
        data: { status: CaseStatus.AMBULANCE_EN_ROUTE },
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'emg-uuid-1',
          eventType: CaseEventType.AMBULANCE_EN_ROUTE,
        }),
      });
    });

    it('transitions EN_ROUTE -> ARRIVED_AT_SCENE maintaining consistent states', async () => {
      const enRouteAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.EN_ROUTE,
      };
      prisma.assignment.findUnique.mockResolvedValue(enRouteAssignment);
      prisma.assignment.update.mockResolvedValue({
        ...enRouteAssignment,
        status: AssignmentStatus.ARRIVED_AT_SCENE,
      });

      await service.updateStatus('asg-uuid-1', {
        status: AssignmentStatus.ARRIVED_AT_SCENE,
      });

      expect(prisma.ambulance.update).toHaveBeenCalledWith({
        where: { id: 'amb-uuid-1' },
        data: {
          status: AmbulanceStatus.AT_SCENE,
          isAvailable: false,
        },
      });
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'emg-uuid-1' },
        data: { status: CaseStatus.ARRIVED_AT_SCENE },
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'emg-uuid-1',
          eventType: CaseEventType.ARRIVED_AT_SCENE,
        }),
      });
    });

    it('transitions ARRIVED_AT_SCENE -> PATIENT_ONBOARD maintaining consistent states', async () => {
      const atSceneAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.ARRIVED_AT_SCENE,
      };
      prisma.assignment.findUnique.mockResolvedValue(atSceneAssignment);
      prisma.assignment.update.mockResolvedValue({
        ...atSceneAssignment,
        status: AssignmentStatus.PATIENT_ONBOARD,
      });

      await service.updateStatus('asg-uuid-1', {
        status: AssignmentStatus.PATIENT_ONBOARD,
      });

      expect(prisma.ambulance.update).toHaveBeenCalledWith({
        where: { id: 'amb-uuid-1' },
        data: {
          status: AmbulanceStatus.PATIENT_ONBOARD,
          isAvailable: false,
        },
      });
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'emg-uuid-1' },
        data: { status: CaseStatus.PATIENT_ONBOARD },
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'emg-uuid-1',
          eventType: CaseEventType.PATIENT_ONBOARD,
        }),
      });
    });

    it('completes assignment and makes ambulance available again without auto-completing emergency', async () => {
      const onboardAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.PATIENT_ONBOARD,
      };
      prisma.assignment.findUnique.mockResolvedValue(onboardAssignment);
      prisma.assignment.update.mockResolvedValue({
        ...onboardAssignment,
        status: AssignmentStatus.COMPLETED,
      });

      await service.updateStatus('asg-uuid-1', {
        status: AssignmentStatus.COMPLETED,
      });

      expect(prisma.ambulance.update).toHaveBeenCalledWith({
        where: { id: 'amb-uuid-1' },
        data: {
          status: AmbulanceStatus.AVAILABLE,
          isAvailable: true,
        },
      });
      // EmergencyCase should NOT be updated to completed
      expect(prisma.emergencyCase.update).not.toHaveBeenCalled();
    });

    it('rejects invalid status transitions (e.g. ASSIGNED -> PATIENT_ONBOARD)', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);

      await expect(
        service.updateStatus('asg-uuid-1', {
          status: AssignmentStatus.PATIENT_ONBOARD,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns current assignment on no-op same status update', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);

      const result = await service.updateStatus('asg-uuid-1', {
        status: AssignmentStatus.ASSIGNED,
      });

      expect(prisma.assignment.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockAssignment);
    });
  });

  // ─── findOne & findAllForCase ──────────────────────────────────────────

  describe('findOne and findAllForCase', () => {
    it('returns single assignment with relations', async () => {
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);

      const result = await service.findOne('asg-uuid-1');
      expect(result).toEqual(mockAssignment);
    });

    it('throws NotFoundException if assignment not found', async () => {
      prisma.assignment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns all assignments for an emergency case', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(mockEmergency);
      prisma.assignment.findMany.mockResolvedValue([mockAssignment]);

      const result = await service.findAllForCase('emg-uuid-1');
      expect(result).toEqual([mockAssignment]);
    });

    it('throws NotFoundException when fetching assignments for non-existent case', async () => {
      prisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(service.findAllForCase('missing-case')).rejects.toThrow(NotFoundException);
    });
  });
});
