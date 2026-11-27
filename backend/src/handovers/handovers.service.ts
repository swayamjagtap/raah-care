import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AmbulanceStatus,
  AssignmentStatus,
  CaseEventType,
  CaseStatus,
  HandoverStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.js';
import {
  CancelHandoverDto,
  CompleteHandoverDto,
  CreateHandoverDto,
  RejectHandoverDto,
  UpdateHandoverDto,
} from './dto/index.js';
import {
  HANDOVER_CLINICAL_DISCLAIMER,
  HANDOVER_POLICY_NOTICE,
} from './handovers.constants.js';

@Injectable()
export class HandoversService {
  constructor(private readonly prisma: PrismaService) { }

  private validateHandoverScope(
    user: AuthenticatedUser | undefined,
    handover: { hospitalId: string; ambulanceId: string },
    action: string = 'access',
  ): void {
    if (!user) return;
    if (user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.DISPATCHER) {
      return;
    }
    if (
      user.role === UserRole.PARAMEDIC ||
      user.role === UserRole.AMBULANCE_DRIVER
    ) {
      if (!user.ambulanceId || user.ambulanceId !== handover.ambulanceId) {
        throw new ForbiddenException(
          `Insufficient permissions: crew can only ${action} handovers for their own ambulance`,
        );
      }
    }
    if (
      user.role === UserRole.DOCTOR ||
      user.role === UserRole.HOSPITAL_ADMIN
    ) {
      if (!user.hospitalId || user.hospitalId !== handover.hospitalId) {
        throw new ForbiddenException(
          `Insufficient permissions: hospital staff can only ${action} handovers for their own hospital`,
        );
      }
    }
  }

  // ─── Initiate Handover ──────────────────────────────────────────────────────

  async initiateHandover(dto: CreateHandoverDto, user?: AuthenticatedUser) {
    // 1. Verify emergency case exists
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id: dto.caseId },
      include: {
        destinationHospital: true,
      },
    });

    if (!emergency) {
      throw new NotFoundException(
        `Emergency case with ID '${dto.caseId}' not found`,
      );
    }

    // 2. Strict state guard: case must already be ARRIVED_AT_HOSPITAL
    if (emergency.status === CaseStatus.EN_ROUTE_TO_HOSPITAL) {
      throw new BadRequestException(
        `Emergency case '${emergency.caseNumber}' must be in status 'ARRIVED_AT_HOSPITAL' to initiate handover. ` +
        `Current status is 'EN_ROUTE_TO_HOSPITAL'. Physical arrival must be recorded before starting handover.`,
      );
    }

    if (emergency.status !== CaseStatus.ARRIVED_AT_HOSPITAL) {
      throw new BadRequestException(
        `Emergency case '${emergency.caseNumber}' cannot initiate handover in status '${emergency.status}'. ` +
        `Required status: 'ARRIVED_AT_HOSPITAL'.`,
      );
    }

    // 3. Destination hospital guard: destinationHospitalId must be set
    if (!emergency.destinationHospitalId) {
      throw new BadRequestException(
        `Emergency case '${emergency.caseNumber}' does not have a destination hospital assigned. ` +
        `A destination hospital must be selected before initiating handover.`,
      );
    }

    // 4. Active assignment guard: must have assignment with status PATIENT_ONBOARD
    const activeAssignment = await this.prisma.assignment.findFirst({
      where: {
        caseId: emergency.id,
        status: AssignmentStatus.PATIENT_ONBOARD,
      },
      include: { ambulance: true },
    });

    if (!activeAssignment) {
      throw new BadRequestException(
        `Emergency case '${emergency.caseNumber}' does not have an active ambulance assignment ` +
        `with status 'PATIENT_ONBOARD'. Cannot initiate handover without an active patient transport.`,
      );
    }

    if (
      user &&
      (user.role === UserRole.PARAMEDIC ||
        user.role === UserRole.AMBULANCE_DRIVER)
    ) {
      if (!user.ambulanceId || user.ambulanceId !== activeAssignment.ambulanceId) {
        throw new ForbiddenException(
          'Insufficient permissions: crew can only initiate handover for their own ambulance',
        );
      }
    }

    // 5. Active handover check: only one PENDING or IN_PROGRESS handover permitted per case
    const existingActiveHandover = await this.prisma.handover.findFirst({
      where: {
        caseId: emergency.id,
        status: { in: [HandoverStatus.PENDING, HandoverStatus.IN_PROGRESS] },
      },
    });

    if (existingActiveHandover) {
      throw new ConflictException(
        `An active handover already exists for emergency case '${emergency.caseNumber}' ` +
        `(Handover ID: '${existingActiveHandover.id}', Status: '${existingActiveHandover.status}').`,
      );
    }

    // 6. Automatically populate paramedic identity from authenticated user
    const paramedicId = user?.userId ?? null;

    // 8. Transactional creation: Handover + EmergencyCase transition + CaseEvent
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const handover = await tx.handover.create({
          data: {
            caseId: emergency.id,
            ambulanceId: activeAssignment.ambulanceId,
            hospitalId: emergency.destinationHospitalId!,
            paramedicId,
            receivingDoctorId: null,
            status: HandoverStatus.IN_PROGRESS,
            clinicalSummary: dto.clinicalSummary ?? null,
            patientCondition: dto.patientCondition ?? null,
            vitals: (dto.vitals as object) ?? undefined,
            notes: dto.notes ?? null,
            handoverStartedAt: new Date(),
          },
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                status: true,
                priority: true,
              },
            },
            ambulance: {
              select: {
                id: true,
                callSign: true,
                registrationNumber: true,
                status: true,
              },
            },
            hospital: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            paramedic: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            receivingDoctor: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        });

        // Transition case to HANDOVER_IN_PROGRESS
        await tx.emergencyCase.update({
          where: { id: emergency.id },
          data: { status: CaseStatus.HANDOVER_IN_PROGRESS },
        });

        // Record CaseEvent
        await tx.caseEvent.create({
          data: {
            caseId: emergency.id,
            eventType: CaseEventType.HANDOVER_STARTED,
            actorId: paramedicId,
            notes:
              dto.notes ?? 'Patient handover initiated at destination hospital',
            payload: {
              handoverId: handover.id,
              hospitalId: emergency.destinationHospitalId,
              ambulanceId: activeAssignment.ambulanceId,
              paramedicId,
              receivingDoctorId: null,
            },
          },
        });

        return handover;
      });

      return {
        ...result,
        clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
        policyNotice: HANDOVER_POLICY_NOTICE,
      };
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          `An active handover already exists for emergency case '${emergency.caseNumber}'.`,
        );
      }
      throw err;
    }
  }

  // ─── Find Handover By ID ───────────────────────────────────────────────────

  async findOne(id: string, user?: AuthenticatedUser) {
    const handover = await this.prisma.handover.findUnique({
      where: { id },
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
        ambulance: {
          select: {
            id: true,
            callSign: true,
            registrationNumber: true,
            type: true,
            status: true,
          },
        },
        hospital: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            phone: true,
          },
        },
        paramedic: {
          select: {
            id: true,
            name: true,
            role: true,
            phone: true,
          },
        },
        receivingDoctor: {
          select: {
            id: true,
            name: true,
            role: true,
            phone: true,
          },
        },
      },
    });

    if (!handover) {
      throw new NotFoundException(`Handover with ID '${id}' not found`);
    }

    this.validateHandoverScope(user, handover, 'view');

    return {
      ...handover,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }

  // ─── Find Active Handover for Case ─────────────────────────────────────────

  async findActiveByCaseId(caseId: string, user?: AuthenticatedUser) {
    const handover = await this.prisma.handover.findFirst({
      where: {
        caseId,
        status: { in: [HandoverStatus.PENDING, HandoverStatus.IN_PROGRESS] },
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, status: true, priority: true },
        },
        ambulance: {
          select: {
            id: true,
            callSign: true,
            registrationNumber: true,
            status: true,
          },
        },
        hospital: { select: { id: true, name: true, code: true } },
        paramedic: { select: { id: true, name: true, role: true } },
        receivingDoctor: { select: { id: true, name: true, role: true } },
      },
    });

    if (!handover) {
      return null;
    }

    this.validateHandoverScope(user, handover, 'view');

    return {
      ...handover,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }

  // ─── Find All Handovers for Case ───────────────────────────────────────────

  async findAllForCase(caseId: string, user?: AuthenticatedUser) {
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id: caseId },
    });
    if (!emergency) {
      throw new NotFoundException(
        `Emergency case with ID '${caseId}' not found`,
      );
    }

    const where: any = { caseId };
    if (user) {
      if (
        user.role === UserRole.PARAMEDIC ||
        user.role === UserRole.AMBULANCE_DRIVER
      ) {
        if (user.ambulanceId) {
          where.ambulanceId = user.ambulanceId;
        }
      } else if (
        user.role === UserRole.DOCTOR ||
        user.role === UserRole.HOSPITAL_ADMIN
      ) {
        if (user.hospitalId) {
          where.hospitalId = user.hospitalId;
        }
      }
    }

    const items = await this.prisma.handover.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        hospital: { select: { id: true, name: true, code: true } },
        ambulance: {
          select: { id: true, callSign: true, registrationNumber: true },
        },
        paramedic: { select: { id: true, name: true, role: true } },
        receivingDoctor: { select: { id: true, name: true, role: true } },
      },
    });

    return {
      data: items,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }

  // ─── Update Handover Details / Vitals ─────────────────────────────────────

  async updateHandover(id: string, dto: UpdateHandoverDto, user?: AuthenticatedUser) {
    const handover = await this.prisma.handover.findUnique({
      where: { id },
    });

    if (!handover) {
      throw new NotFoundException(`Handover with ID '${id}' not found`);
    }

    this.validateHandoverScope(user, handover, 'update');

    if (
      handover.status === HandoverStatus.COMPLETED ||
      handover.status === HandoverStatus.CANCELLED ||
      handover.status === HandoverStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot update a handover in '${handover.status}' status.`,
      );
    }

    const updated = await this.prisma.handover.update({
      where: { id },
      data: {
        clinicalSummary: dto.clinicalSummary ?? undefined,
        patientCondition: dto.patientCondition ?? undefined,
        vitals: (dto.vitals as object) ?? undefined,
        notes: dto.notes ?? undefined,
      },
      include: {
        case: { select: { id: true, caseNumber: true, status: true } },
        ambulance: {
          select: { id: true, callSign: true, registrationNumber: true },
        },
        hospital: { select: { id: true, name: true, code: true } },
        paramedic: { select: { id: true, name: true, role: true } },
        receivingDoctor: { select: { id: true, name: true, role: true } },
      },
    });

    return {
      ...updated,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }

  // ─── Complete Handover ── ───────────────────────────────────────────────────

  async completeHandover(id: string, dto: CompleteHandoverDto, user?: AuthenticatedUser) {
    const handover = await this.prisma.handover.findUnique({
      where: { id },
      include: {
        case: true,
        ambulance: true,
      },
    });

    if (!handover) {
      throw new NotFoundException(`Handover with ID '${id}' not found`);
    }

    this.validateHandoverScope(user, handover, 'complete');

    // Must be in IN_PROGRESS status
    if (handover.status !== HandoverStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Handover can only be completed when in 'IN_PROGRESS' status. ` +
        `Current status: '${handover.status}'.`,
      );
    }

    // Validate receiving doctor from authenticated user if doctor/hospital_admin
    const receivingDoctorId = user?.userId ?? handover.receivingDoctorId ?? null;

    // Find active assignment
    const activeAssignment = await this.prisma.assignment.findFirst({
      where: {
        caseId: handover.caseId,
        ambulanceId: handover.ambulanceId,
        status: AssignmentStatus.PATIENT_ONBOARD,
      },
    });

    if (!activeAssignment) {
      throw new BadRequestException(
        `Active ambulance assignment with status 'PATIENT_ONBOARD' not found for this handover case.`,
      );
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Set handover COMPLETED
      const completedHandover = await tx.handover.update({
        where: { id },
        data: {
          status: HandoverStatus.COMPLETED,
          handoverCompletedAt: now,
          receivingDoctorId,
          clinicalSummary: dto.clinicalSummary ?? handover.clinicalSummary,
          patientCondition: dto.patientCondition ?? handover.patientCondition,
          notes: dto.notes ?? handover.notes,
        },
        include: {
          case: { select: { id: true, caseNumber: true, status: true } },
          ambulance: {
            select: { id: true, callSign: true, registrationNumber: true },
          },
          hospital: { select: { id: true, name: true, code: true } },
          paramedic: { select: { id: true, name: true, role: true } },
          receivingDoctor: { select: { id: true, name: true, role: true } },
        },
      });

      // 2. Transition EmergencyCase to COMPLETED
      await tx.emergencyCase.update({
        where: { id: handover.caseId },
        data: {
          status: CaseStatus.COMPLETED,
          resolvedAt: now,
        },
      });

      // 3. Transition active Assignment to COMPLETED
      await tx.assignment.update({
        where: { id: activeAssignment.id },
        data: {
          status: AssignmentStatus.COMPLETED,
          completedAt: now,
        },
      });

      // 4. Release ambulance to AVAILABLE
      await tx.ambulance.update({
        where: { id: handover.ambulanceId },
        data: {
          status: AmbulanceStatus.AVAILABLE,
          isAvailable: true,
        },
      });

      // 5. Create HANDOVER_COMPLETED event
      await tx.caseEvent.create({
        data: {
          caseId: handover.caseId,
          eventType: CaseEventType.HANDOVER_COMPLETED,
          actorId: receivingDoctorId,
          notes:
            dto.notes ??
            'Patient handover successfully completed and accepted by hospital staff',
          payload: {
            handoverId: id,
            hospitalId: handover.hospitalId,
            ambulanceId: handover.ambulanceId,
            receivingDoctorId,
          },
        },
      });

      // 6. Create CASE_COMPLETED event
      await tx.caseEvent.create({
        data: {
          caseId: handover.caseId,
          eventType: CaseEventType.CASE_COMPLETED,
          actorId: receivingDoctorId,
          notes: 'Emergency case resolved upon successful patient handover',
          payload: {
            handoverId: id,
            resolvedAt: now.toISOString(),
          },
        },
      });

      return completedHandover;
    });

    return {
      ...result,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }

  // ─── Reject Handover ───────────────────────────────────────────────────────

  async rejectHandover(id: string, dto: RejectHandoverDto, user?: AuthenticatedUser) {
    const handover = await this.prisma.handover.findUnique({
      where: { id },
    });

    if (!handover) {
      throw new NotFoundException(`Handover with ID '${id}' not found`);
    }

    this.validateHandoverScope(user, handover, 'reject');

    if (
      handover.status !== HandoverStatus.IN_PROGRESS &&
      handover.status !== HandoverStatus.PENDING
    ) {
      throw new BadRequestException(
        `Only active handovers ('PENDING' or 'IN_PROGRESS') can be rejected. Current status: '${handover.status}'.`,
      );
    }

    const rejectingStaffId = user?.userId ?? null;

    const notesCombined = [
      handover.notes,
      `Rejection reason: ${dto.reason}`,
      dto.notes,
    ]
      .filter(Boolean)
      .join(' | ');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark handover REJECTED
      const rejected = await tx.handover.update({
        where: { id },
        data: {
          status: HandoverStatus.REJECTED,
          notes: notesCombined,
        },
        include: {
          case: { select: { id: true, caseNumber: true, status: true } },
          ambulance: { select: { id: true, callSign: true } },
          hospital: { select: { id: true, name: true, code: true } },
          paramedic: { select: { id: true, name: true, role: true } },
          receivingDoctor: { select: { id: true, name: true, role: true } },
        },
      });

      // 2. Preserve arrival state: case reverts to ARRIVED_AT_HOSPITAL
      await tx.emergencyCase.update({
        where: { id: handover.caseId },
        data: { status: CaseStatus.ARRIVED_AT_HOSPITAL },
      });

      // (Ambulance and Assignment remain PATIENT_ONBOARD - not released)

      // 3. Record CaseEvent
      await tx.caseEvent.create({
        data: {
          caseId: handover.caseId,
          eventType: CaseEventType.HANDOVER_REJECTED,
          actorId: rejectingStaffId,
          notes: `Handover rejected by hospital: ${dto.reason}`,
          payload: {
            handoverId: id,
            hospitalId: handover.hospitalId,
            reason: dto.reason,
            status: HandoverStatus.REJECTED,
          },
        },
      });

      return rejected;
    });

    return {
      ...result,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }

  // ─── Cancel Handover ───────────────────────────────────────────────────────

  async cancelHandover(id: string, dto: CancelHandoverDto, user?: AuthenticatedUser) {
    const handover = await this.prisma.handover.findUnique({
      where: { id },
    });

    if (!handover) {
      throw new NotFoundException(`Handover with ID '${id}' not found`);
    }

    this.validateHandoverScope(user, handover, 'cancel');

    if (
      handover.status !== HandoverStatus.IN_PROGRESS &&
      handover.status !== HandoverStatus.PENDING
    ) {
      throw new BadRequestException(
        `Only active handovers ('PENDING' or 'IN_PROGRESS') can be cancelled. Current status: '${handover.status}'.`,
      );
    }

    const notesCombined = [
      handover.notes,
      `Cancellation reason: ${dto.reason}`,
      dto.notes,
    ]
      .filter(Boolean)
      .join(' | ');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark handover CANCELLED
      const cancelled = await tx.handover.update({
        where: { id },
        data: {
          status: HandoverStatus.CANCELLED,
          notes: notesCombined,
        },
        include: {
          case: { select: { id: true, caseNumber: true, status: true } },
          ambulance: { select: { id: true, callSign: true } },
          hospital: { select: { id: true, name: true, code: true } },
        },
      });

      // 2. Revert case to ARRIVED_AT_HOSPITAL
      await tx.emergencyCase.update({
        where: { id: handover.caseId },
        data: { status: CaseStatus.ARRIVED_AT_HOSPITAL },
      });

      // (Ambulance and Assignment remain PATIENT_ONBOARD - not released)

      // 3. Record CaseEvent
      await tx.caseEvent.create({
        data: {
          caseId: handover.caseId,
          eventType: CaseEventType.HANDOVER_CANCELLED,
          actorId: user?.userId ?? null,
          notes: `Handover cancelled: ${dto.reason}`,
          payload: {
            handoverId: id,
            reason: dto.reason,
            status: HandoverStatus.CANCELLED,
          },
        },
      });

      return cancelled;
    });

    return {
      ...result,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }
}
