import {
  BadRequestException,
  ConflictException,
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
  constructor(private readonly prisma: PrismaService) {}

  // ─── Initiate Handover ──────────────────────────────────────────────────────

  async initiateHandover(dto: CreateHandoverDto) {
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

    // 6. Validate paramedic identity if provided
    if (dto.paramedicId) {
      const paramedic = await this.prisma.user.findUnique({
        where: { id: dto.paramedicId },
      });
      if (!paramedic) {
        throw new NotFoundException(
          `Paramedic user with ID '${dto.paramedicId}' not found`,
        );
      }
      if (
        paramedic.role !== UserRole.PARAMEDIC &&
        paramedic.role !== UserRole.AMBULANCE_DRIVER
      ) {
        throw new BadRequestException(
          `User '${paramedic.name}' has role '${paramedic.role}', expected 'PARAMEDIC' or 'AMBULANCE_DRIVER'.`,
        );
      }
      if (
        paramedic.ambulanceId &&
        paramedic.ambulanceId !== activeAssignment.ambulanceId
      ) {
        throw new BadRequestException(
          `Paramedic '${paramedic.name}' is associated with ambulance '${paramedic.ambulanceId}', ` +
            `which does not match the active transport ambulance '${activeAssignment.ambulanceId}'.`,
        );
      }
    }

    // 7. Validate receiving staff identity if provided
    if (dto.receivingDoctorId) {
      const doctor = await this.prisma.user.findUnique({
        where: { id: dto.receivingDoctorId },
      });
      if (!doctor) {
        throw new NotFoundException(
          `Receiving staff user with ID '${dto.receivingDoctorId}' not found`,
        );
      }
      if (
        doctor.role !== UserRole.DOCTOR &&
        doctor.role !== UserRole.HOSPITAL_ADMIN
      ) {
        throw new BadRequestException(
          `User '${doctor.name}' has role '${doctor.role}', expected 'DOCTOR' or 'HOSPITAL_ADMIN'.`,
        );
      }
      if (
        doctor.hospitalId &&
        doctor.hospitalId !== emergency.destinationHospitalId
      ) {
        throw new BadRequestException(
          `Staff member '${doctor.name}' is affiliated with hospital '${doctor.hospitalId}', ` +
            `which does not match destination hospital '${emergency.destinationHospitalId}'.`,
        );
      }
    }

    // 8. Transactional creation: Handover + EmergencyCase transition + CaseEvent
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const handover = await tx.handover.create({
          data: {
            caseId: emergency.id,
            ambulanceId: activeAssignment.ambulanceId,
            hospitalId: emergency.destinationHospitalId!,
            paramedicId: dto.paramedicId ?? null,
            receivingDoctorId: dto.receivingDoctorId ?? null,
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
            actorId: dto.paramedicId ?? null,
            notes:
              dto.notes ?? 'Patient handover initiated at destination hospital',
            payload: {
              handoverId: handover.id,
              hospitalId: emergency.destinationHospitalId,
              ambulanceId: activeAssignment.ambulanceId,
              paramedicId: dto.paramedicId ?? null,
              receivingDoctorId: dto.receivingDoctorId ?? null,
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

  async findOne(id: string) {
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

    return {
      ...handover,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }

  // ─── Find Active Handover for Case ─────────────────────────────────────────

  async findActiveByCaseId(caseId: string) {
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

    return {
      ...handover,
      clinicalDisclaimer: HANDOVER_CLINICAL_DISCLAIMER,
      policyNotice: HANDOVER_POLICY_NOTICE,
    };
  }

  // ─── Find All Handovers for Case ───────────────────────────────────────────

  async findAllForCase(caseId: string) {
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id: caseId },
    });
    if (!emergency) {
      throw new NotFoundException(
        `Emergency case with ID '${caseId}' not found`,
      );
    }

    const items = await this.prisma.handover.findMany({
      where: { caseId },
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

  async updateHandover(id: string, dto: UpdateHandoverDto) {
    const handover = await this.prisma.handover.findUnique({
      where: { id },
    });

    if (!handover) {
      throw new NotFoundException(`Handover with ID '${id}' not found`);
    }

    if (
      handover.status === HandoverStatus.COMPLETED ||
      handover.status === HandoverStatus.CANCELLED ||
      handover.status === HandoverStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot update a handover in '${handover.status}' status.`,
      );
    }

    if (dto.paramedicId) {
      const paramedic = await this.prisma.user.findUnique({
        where: { id: dto.paramedicId },
      });
      if (!paramedic) {
        throw new NotFoundException(
          `Paramedic user with ID '${dto.paramedicId}' not found`,
        );
      }
      if (
        paramedic.role !== UserRole.PARAMEDIC &&
        paramedic.role !== UserRole.AMBULANCE_DRIVER
      ) {
        throw new BadRequestException(
          `User '${paramedic.name}' has role '${paramedic.role}', expected 'PARAMEDIC' or 'AMBULANCE_DRIVER'.`,
        );
      }
    }

    if (dto.receivingDoctorId) {
      const doctor = await this.prisma.user.findUnique({
        where: { id: dto.receivingDoctorId },
      });
      if (!doctor) {
        throw new NotFoundException(
          `Receiving staff user with ID '${dto.receivingDoctorId}' not found`,
        );
      }
      if (
        doctor.role !== UserRole.DOCTOR &&
        doctor.role !== UserRole.HOSPITAL_ADMIN
      ) {
        throw new BadRequestException(
          `User '${doctor.name}' has role '${doctor.role}', expected 'DOCTOR' or 'HOSPITAL_ADMIN'.`,
        );
      }
    }

    const updated = await this.prisma.handover.update({
      where: { id },
      data: {
        clinicalSummary: dto.clinicalSummary ?? undefined,
        patientCondition: dto.patientCondition ?? undefined,
        vitals: (dto.vitals as object) ?? undefined,
        notes: dto.notes ?? undefined,
        paramedicId: dto.paramedicId ?? undefined,
        receivingDoctorId: dto.receivingDoctorId ?? undefined,
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

  // ─── Complete Handover ─────────────────────────────────────────────────────

  async completeHandover(id: string, dto: CompleteHandoverDto) {
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

    // Must be in IN_PROGRESS status
    if (handover.status !== HandoverStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Handover can only be completed when in 'IN_PROGRESS' status. ` +
          `Current status: '${handover.status}'.`,
      );
    }

    // Validate receiving doctor if provided
    if (dto.receivingDoctorId) {
      const doctor = await this.prisma.user.findUnique({
        where: { id: dto.receivingDoctorId },
      });
      if (!doctor) {
        throw new NotFoundException(
          `Receiving staff user with ID '${dto.receivingDoctorId}' not found`,
        );
      }
      if (
        doctor.role !== UserRole.DOCTOR &&
        doctor.role !== UserRole.HOSPITAL_ADMIN
      ) {
        throw new BadRequestException(
          `User '${doctor.name}' has role '${doctor.role}', expected 'DOCTOR' or 'HOSPITAL_ADMIN'.`,
        );
      }
      if (doctor.hospitalId && doctor.hospitalId !== handover.hospitalId) {
        throw new BadRequestException(
          `Staff member '${doctor.name}' is affiliated with hospital '${doctor.hospitalId}', ` +
            `not the handover destination hospital '${handover.hospitalId}'.`,
        );
      }
    }

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
          receivingDoctorId:
            dto.receivingDoctorId ?? handover.receivingDoctorId,
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
          actorId: dto.receivingDoctorId ?? handover.receivingDoctorId ?? null,
          notes:
            dto.notes ??
            'Patient handover successfully completed and accepted by hospital staff',
          payload: {
            handoverId: id,
            hospitalId: handover.hospitalId,
            ambulanceId: handover.ambulanceId,
            receivingDoctorId:
              dto.receivingDoctorId ?? handover.receivingDoctorId ?? null,
          },
        },
      });

      // 6. Create CASE_COMPLETED event
      await tx.caseEvent.create({
        data: {
          caseId: handover.caseId,
          eventType: CaseEventType.CASE_COMPLETED,
          actorId: dto.receivingDoctorId ?? handover.receivingDoctorId ?? null,
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

  async rejectHandover(id: string, dto: RejectHandoverDto) {
    const handover = await this.prisma.handover.findUnique({
      where: { id },
    });

    if (!handover) {
      throw new NotFoundException(`Handover with ID '${id}' not found`);
    }

    if (
      handover.status !== HandoverStatus.IN_PROGRESS &&
      handover.status !== HandoverStatus.PENDING
    ) {
      throw new BadRequestException(
        `Only active handovers ('PENDING' or 'IN_PROGRESS') can be rejected. Current status: '${handover.status}'.`,
      );
    }

    if (dto.rejectingStaffId) {
      const staff = await this.prisma.user.findUnique({
        where: { id: dto.rejectingStaffId },
      });
      if (!staff) {
        throw new NotFoundException(
          `Staff member with ID '${dto.rejectingStaffId}' not found`,
        );
      }
      if (
        staff.role !== UserRole.DOCTOR &&
        staff.role !== UserRole.HOSPITAL_ADMIN
      ) {
        throw new BadRequestException(
          `User '${staff.name}' has role '${staff.role}', expected 'DOCTOR' or 'HOSPITAL_ADMIN'.`,
        );
      }
    }

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
          actorId: dto.rejectingStaffId ?? null,
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

  async cancelHandover(id: string, dto: CancelHandoverDto) {
    const handover = await this.prisma.handover.findUnique({
      where: { id },
    });

    if (!handover) {
      throw new NotFoundException(`Handover with ID '${id}' not found`);
    }

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
          actorId: dto.actorId ?? null,
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
