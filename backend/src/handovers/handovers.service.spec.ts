import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AmbulanceStatus,
  AssignmentStatus,
  CaseEventType,
  CasePriority,
  CaseStatus,
  HandoverStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HandoversService } from './handovers.service.js';

describe('HandoversService', () => {
  let service: HandoversService;
  let prisma: PrismaService;

  const mockEmergency = {
    id: 'case-1',
    caseNumber: 'RAAH-2026-000001',
    status: CaseStatus.ARRIVED_AT_HOSPITAL,
    priority: CasePriority.HIGH,
    destinationHospitalId: 'hosp-1',
  };

  const mockAssignment = {
    id: 'asgn-1',
    caseId: 'case-1',
    ambulanceId: 'amb-1',
    status: AssignmentStatus.PATIENT_ONBOARD,
  };

  const mockParamedic = {
    id: 'user-para-1',
    name: 'Paramedic John',
    role: UserRole.PARAMEDIC,
    ambulanceId: 'amb-1',
  };

  const mockHandover = {
    id: 'handover-1',
    caseId: 'case-1',
    ambulanceId: 'amb-1',
    hospitalId: 'hosp-1',
    paramedicId: 'user-para-1',
    receivingDoctorId: 'user-doc-1',
    status: HandoverStatus.IN_PROGRESS,
    clinicalSummary: 'Stable',
    patientCondition: 'Conscious',
    vitals: { heartRate: 72 },
    notes: 'Arrived safely',
    handoverStartedAt: new Date(),
    handoverCompletedAt: null,
  };

  beforeEach(() => {
    prisma = {
      emergencyCase: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      assignment: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      ambulance: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      hospital: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      handover: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      caseEvent: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    } as unknown as PrismaService;

    service = new HandoversService(prisma);
  });

  describe('initiateHandover', () => {
    it('throws NotFoundException when emergency case is not found', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue(null);

      await expect(
        service.initiateHandover({ caseId: 'missing-case' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects EN_ROUTE_TO_HOSPITAL with explicit arrival requirement', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue({
        ...mockEmergency,
        status: CaseStatus.EN_ROUTE_TO_HOSPITAL,
      } as any);

      await expect(
        service.initiateHandover({ caseId: 'case-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects case in other invalid status (e.g. CREATED)', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue({
        ...mockEmergency,
        status: CaseStatus.CREATED,
      } as any);

      await expect(
        service.initiateHandover({ caseId: 'case-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects case without destinationHospitalId', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue({
        ...mockEmergency,
        destinationHospitalId: null,
      } as any);

      await expect(
        service.initiateHandover({ caseId: 'case-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects case without active PATIENT_ONBOARD assignment', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue(
        mockEmergency as any,
      );
      vi.mocked(prisma.assignment.findFirst).mockResolvedValue(null);

      await expect(
        service.initiateHandover({ caseId: 'case-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when active handover already exists', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue(
        mockEmergency as any,
      );
      vi.mocked(prisma.assignment.findFirst).mockResolvedValue(
        mockAssignment as any,
      );
      vi.mocked(prisma.handover.findFirst).mockResolvedValue(
        mockHandover as any,
      );

      await expect(
        service.initiateHandover({ caseId: 'case-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates paramedic user role and ambulance affiliation', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue(
        mockEmergency as any,
      );
      vi.mocked(prisma.assignment.findFirst).mockResolvedValue(
        mockAssignment as any,
      );
      vi.mocked(prisma.handover.findFirst).mockResolvedValue(null);

      // User not found
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await expect(
        service.initiateHandover({
          caseId: 'case-1',
          paramedicId: 'missing-user',
        }),
      ).rejects.toThrow(NotFoundException);

      // Wrong role
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-1',
        name: 'Patient',
        role: UserRole.PATIENT,
      } as any);
      await expect(
        service.initiateHandover({ caseId: 'case-1', paramedicId: 'u-1' }),
      ).rejects.toThrow(BadRequestException);

      // Wrong ambulance
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-1',
        name: 'Other Para',
        role: UserRole.PARAMEDIC,
        ambulanceId: 'different-ambulance',
      } as any);
      await expect(
        service.initiateHandover({ caseId: 'case-1', paramedicId: 'u-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates receiving doctor role and hospital affiliation', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue(
        mockEmergency as any,
      );
      vi.mocked(prisma.assignment.findFirst).mockResolvedValue(
        mockAssignment as any,
      );
      vi.mocked(prisma.handover.findFirst).mockResolvedValue(null);

      // Wrong doctor role
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-doc',
        name: 'Nurse',
        role: UserRole.CAREGIVER,
      } as any);
      await expect(
        service.initiateHandover({
          caseId: 'case-1',
          receivingDoctorId: 'u-doc',
        }),
      ).rejects.toThrow(BadRequestException);

      // Wrong hospital affiliation
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-doc',
        name: 'Other Doc',
        role: UserRole.DOCTOR,
        hospitalId: 'different-hospital',
      } as any);
      await expect(
        service.initiateHandover({
          caseId: 'case-1',
          receivingDoctorId: 'u-doc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('initiates handover successfully and transitions case to HANDOVER_IN_PROGRESS', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue(
        mockEmergency as any,
      );
      vi.mocked(prisma.assignment.findFirst).mockResolvedValue(
        mockAssignment as any,
      );
      vi.mocked(prisma.handover.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockParamedic as any);
      vi.mocked(prisma.handover.create).mockResolvedValue({
        ...mockHandover,
        status: HandoverStatus.IN_PROGRESS,
      } as any);

      const result = await service.initiateHandover({
        caseId: 'case-1',
        paramedicId: 'user-para-1',
        clinicalSummary: 'Patient stable',
      });

      expect(result.status).toBe(HandoverStatus.IN_PROGRESS);
      expect(result.clinicalDisclaimer).toBeDefined();
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'case-1' },
        data: { status: CaseStatus.HANDOVER_IN_PROGRESS },
      });
      expect(prisma.caseEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caseId: 'case-1',
            eventType: CaseEventType.HANDOVER_STARTED,
          }),
        }),
      );
    });

    it('handles P2002 partial unique constraint error by throwing ConflictException', async () => {
      vi.mocked(prisma.emergencyCase.findUnique).mockResolvedValue(
        mockEmergency as any,
      );
      vi.mocked(prisma.assignment.findFirst).mockResolvedValue(
        mockAssignment as any,
      );
      vi.mocked(prisma.handover.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.$transaction).mockRejectedValue({ code: 'P2002' });

      await expect(
        service.initiateHandover({ caseId: 'case-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('completeHandover', () => {
    it('throws NotFoundException when handover does not exist', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue(null);

      await expect(service.completeHandover('missing-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects handover that is not in IN_PROGRESS status', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue({
        ...mockHandover,
        status: HandoverStatus.PENDING,
      } as any);

      await expect(service.completeHandover('handover-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when active PATIENT_ONBOARD assignment is missing', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue(
        mockHandover as any,
      );
      vi.mocked(prisma.assignment.findFirst).mockResolvedValue(null);

      await expect(service.completeHandover('handover-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('completes handover, case, assignment, and releases ambulance to AVAILABLE', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue(
        mockHandover as any,
      );
      vi.mocked(prisma.assignment.findFirst).mockResolvedValue(
        mockAssignment as any,
      );
      vi.mocked(prisma.handover.update).mockResolvedValue({
        ...mockHandover,
        status: HandoverStatus.COMPLETED,
        handoverCompletedAt: new Date(),
      } as any);

      const result = await service.completeHandover('handover-1', {
        notes: 'Handover complete without issues',
      });

      expect(result.status).toBe(HandoverStatus.COMPLETED);
      // Case completed
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'case-1' },
          data: expect.objectContaining({ status: CaseStatus.COMPLETED }),
        }),
      );
      // Assignment completed
      expect(prisma.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'asgn-1' },
          data: expect.objectContaining({ status: AssignmentStatus.COMPLETED }),
        }),
      );
      // Ambulance released
      expect(prisma.ambulance.update).toHaveBeenCalledWith({
        where: { id: 'amb-1' },
        data: {
          status: AmbulanceStatus.AVAILABLE,
          isAvailable: true,
        },
      });
      // Both events logged
      expect(prisma.caseEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: CaseEventType.HANDOVER_COMPLETED,
          }),
        }),
      );
      expect(prisma.caseEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: CaseEventType.CASE_COMPLETED,
          }),
        }),
      );
    });
  });

  describe('rejectHandover', () => {
    it('throws NotFoundException when handover does not exist', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue(null);

      await expect(
        service.rejectHandover('missing-id', {
          reason: 'No ICU beds available at this time',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects already completed handover', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue({
        ...mockHandover,
        status: HandoverStatus.COMPLETED,
      } as any);

      await expect(
        service.rejectHandover('handover-1', {
          reason: 'No ICU beds available at this time',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reverts case to ARRIVED_AT_HOSPITAL and preserves assignment/ambulance state', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue(
        mockHandover as any,
      );
      vi.mocked(prisma.handover.update).mockResolvedValue({
        ...mockHandover,
        status: HandoverStatus.REJECTED,
      } as any);

      const result = await service.rejectHandover('handover-1', {
        reason: 'Hospital power failure; divert required immediately',
      });

      expect(result.status).toBe(HandoverStatus.REJECTED);
      // Preserves physical arrival
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'case-1' },
        data: { status: CaseStatus.ARRIVED_AT_HOSPITAL },
      });
      // Does NOT release ambulance
      expect(prisma.ambulance.update).not.toHaveBeenCalled();
      // Emits handover rejected event
      expect(prisma.caseEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: CaseEventType.HANDOVER_REJECTED,
          }),
        }),
      );
    });
  });

  describe('cancelHandover', () => {
    it('cancels handover and preserves arrival state', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue(
        mockHandover as any,
      );
      vi.mocked(prisma.handover.update).mockResolvedValue({
        ...mockHandover,
        status: HandoverStatus.CANCELLED,
      } as any);

      const result = await service.cancelHandover('handover-1', {
        reason: 'Duplicate handover record created accidentally',
      });

      expect(result.status).toBe(HandoverStatus.CANCELLED);
      expect(prisma.emergencyCase.update).toHaveBeenCalledWith({
        where: { id: 'case-1' },
        data: { status: CaseStatus.ARRIVED_AT_HOSPITAL },
      });
      expect(prisma.ambulance.update).not.toHaveBeenCalled();
      // Emits handover cancelled event
      expect(prisma.caseEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caseId: 'case-1',
            eventType: CaseEventType.HANDOVER_CANCELLED,
            payload: expect.objectContaining({
              handoverId: 'handover-1',
            }),
          }),
        }),
      );
    });
  });

  describe('updateHandover', () => {
    it('throws BadRequestException when updating completed handover', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue({
        ...mockHandover,
        status: HandoverStatus.COMPLETED,
      } as any);

      await expect(
        service.updateHandover('handover-1', { notes: 'New note' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates active handover successfully', async () => {
      vi.mocked(prisma.handover.findUnique).mockResolvedValue(
        mockHandover as any,
      );
      vi.mocked(prisma.handover.update).mockResolvedValue({
        ...mockHandover,
        clinicalSummary: 'Updated vitals recorded',
      } as any);

      const result = await service.updateHandover('handover-1', {
        clinicalSummary: 'Updated vitals recorded',
      });

      expect(result.clinicalSummary).toBe('Updated vitals recorded');
    });
  });
});
