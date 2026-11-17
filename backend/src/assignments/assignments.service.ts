import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AmbulanceStatus,
  AssignmentStatus,
  CaseEventType,
  CaseStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AcceptAssignmentDto,
  CreateAssignmentDto,
  RejectAssignmentDto,
  UpdateAssignmentStatusDto,
} from './dto/index.js';

// ─── State Transition Tables ────────────────────────────────────────────────

const ALLOWED_ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  [AssignmentStatus.ASSIGNED]: [
    AssignmentStatus.ACCEPTED,
    AssignmentStatus.REJECTED,
    AssignmentStatus.CANCELLED,
  ],
  [AssignmentStatus.ACCEPTED]: [
    AssignmentStatus.EN_ROUTE,
    AssignmentStatus.CANCELLED,
  ],
  [AssignmentStatus.EN_ROUTE]: [
    AssignmentStatus.ARRIVED_AT_SCENE,
    AssignmentStatus.CANCELLED,
  ],
  [AssignmentStatus.ARRIVED_AT_SCENE]: [
    AssignmentStatus.PATIENT_ONBOARD,
    AssignmentStatus.CANCELLED,
  ],
  [AssignmentStatus.PATIENT_ONBOARD]: [
    AssignmentStatus.COMPLETED,
    AssignmentStatus.CANCELLED,
  ],
  [AssignmentStatus.COMPLETED]: [],
  [AssignmentStatus.CANCELLED]: [],
  [AssignmentStatus.REJECTED]: [],
};

// Assignment status → Ambulance status
const ASSIGNMENT_TO_AMBULANCE_STATUS: Partial<Record<AssignmentStatus, AmbulanceStatus>> = {
  [AssignmentStatus.ASSIGNED]: AmbulanceStatus.ASSIGNED,
  [AssignmentStatus.ACCEPTED]: AmbulanceStatus.ASSIGNED,  // still assigned, not en-route yet
  [AssignmentStatus.EN_ROUTE]: AmbulanceStatus.EN_ROUTE,
  [AssignmentStatus.ARRIVED_AT_SCENE]: AmbulanceStatus.AT_SCENE,
  [AssignmentStatus.PATIENT_ONBOARD]: AmbulanceStatus.PATIENT_ONBOARD,
  [AssignmentStatus.COMPLETED]: AmbulanceStatus.AVAILABLE,
  [AssignmentStatus.CANCELLED]: AmbulanceStatus.AVAILABLE,
  [AssignmentStatus.REJECTED]: AmbulanceStatus.AVAILABLE,
};

// Assignment status → EmergencyCase status (only the transitions that drive case state)
const ASSIGNMENT_TO_CASE_STATUS: Partial<Record<AssignmentStatus, CaseStatus>> = {
  [AssignmentStatus.EN_ROUTE]: CaseStatus.AMBULANCE_EN_ROUTE,
  [AssignmentStatus.ARRIVED_AT_SCENE]: CaseStatus.ARRIVED_AT_SCENE,
  [AssignmentStatus.PATIENT_ONBOARD]: CaseStatus.PATIENT_ONBOARD,
  // COMPLETED and CANCELLED do NOT auto-complete the case —
  // the case continues through hospital/handover workflow
  [AssignmentStatus.CANCELLED]: CaseStatus.DISPATCHING,
  [AssignmentStatus.REJECTED]: CaseStatus.DISPATCHING,
};

// Assignment status → CaseEvent type
const ASSIGNMENT_TO_EVENT_TYPE: Partial<Record<AssignmentStatus, CaseEventType>> = {
  [AssignmentStatus.ASSIGNED]: CaseEventType.AMBULANCE_ASSIGNED,
  [AssignmentStatus.ACCEPTED]: CaseEventType.AMBULANCE_ACCEPTED,
  [AssignmentStatus.REJECTED]: CaseEventType.AMBULANCE_REJECTED,
  [AssignmentStatus.EN_ROUTE]: CaseEventType.AMBULANCE_EN_ROUTE,
  [AssignmentStatus.ARRIVED_AT_SCENE]: CaseEventType.ARRIVED_AT_SCENE,
  [AssignmentStatus.PATIENT_ONBOARD]: CaseEventType.PATIENT_ONBOARD,
};

// States that mean the ambulance is actively occupied on a case
const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  AssignmentStatus.ASSIGNED,
  AssignmentStatus.ACCEPTED,
  AssignmentStatus.EN_ROUTE,
  AssignmentStatus.ARRIVED_AT_SCENE,
  AssignmentStatus.PATIENT_ONBOARD,
];

// EmergencyCase statuses from which a new assignment can be created
const ASSIGNABLE_CASE_STATUSES: CaseStatus[] = [
  CaseStatus.CREATED,
  CaseStatus.DISPATCHING,
];

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Assignment ───────────────────────────────────────────────────

  async create(emergencyId: string, dto: CreateAssignmentDto) {
    // 1. Verify emergency exists and is assignable
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id: emergencyId },
    });
    if (!emergency) {
      throw new NotFoundException(
        `Emergency case with ID '${emergencyId}' not found`,
      );
    }
    if (!ASSIGNABLE_CASE_STATUSES.includes(emergency.status as CaseStatus)) {
      throw new BadRequestException(
        `Emergency case '${emergency.caseNumber}' cannot receive a new assignment in status '${emergency.status}'. ` +
          `Assignable statuses: ${ASSIGNABLE_CASE_STATUSES.join(', ')}`,
      );
    }

    // 2. Verify ambulance exists and is available
    const ambulance = await this.prisma.ambulance.findUnique({
      where: { id: dto.ambulanceId },
    });
    if (!ambulance) {
      throw new NotFoundException(
        `Ambulance with ID '${dto.ambulanceId}' not found`,
      );
    }
    if (!ambulance.isAvailable || ambulance.status !== AmbulanceStatus.AVAILABLE) {
      throw new BadRequestException(
        `Ambulance '${ambulance.callSign}' is not available (current status: ${ambulance.status})`,
      );
    }

    // 3. Verify no active assignment already exists for this ambulance
    // (secondary guard — the isAvailable flag above is the primary)
    const activeAssignment = await this.prisma.assignment.findFirst({
      where: {
        ambulanceId: dto.ambulanceId,
        status: { in: ACTIVE_ASSIGNMENT_STATUSES },
      },
    });
    if (activeAssignment) {
      throw new BadRequestException(
        `Ambulance already has an active assignment (ID: ${activeAssignment.id})`,
      );
    }

    // 4. Verify dispatcher exists if provided
    if (dto.dispatcherId) {
      const dispatcher = await this.prisma.user.findUnique({
        where: { id: dto.dispatcherId },
      });
      if (!dispatcher) {
        throw new NotFoundException(
          `Dispatcher user with ID '${dto.dispatcherId}' not found`,
        );
      }
    }

    // 5. Transactional creation — all-or-nothing
    return this.prisma.$transaction(async (tx) => {
      // Use conditional update as an optimistic concurrency guard:
      // only mark the ambulance unavailable if it is STILL available.
      // If another request beat us to it, updateMany returns count=0 and we abort.
      const updated = await tx.ambulance.updateMany({
        where: {
          id: dto.ambulanceId,
          isAvailable: true,
          status: AmbulanceStatus.AVAILABLE,
        },
        data: {
          status: AmbulanceStatus.ASSIGNED,
          isAvailable: false,
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException(
          `Ambulance '${ambulance.callSign}' was just assigned by another dispatcher. Please choose a different ambulance.`,
        );
      }

      // Update emergency case status
      await tx.emergencyCase.update({
        where: { id: emergencyId },
        data: { status: CaseStatus.AMBULANCE_ASSIGNED },
      });

      // Create assignment record
      const assignment = await tx.assignment.create({
        data: {
          caseId: emergencyId,
          ambulanceId: dto.ambulanceId,
          dispatcherId: dto.dispatcherId ?? null,
          status: AssignmentStatus.ASSIGNED,
          notes: dto.notes ?? null,
        },
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
            },
          },
          dispatcher: {
            select: { id: true, name: true, role: true },
          },
          case: {
            select: { id: true, caseNumber: true, status: true, priority: true },
          },
        },
      });

      // Create CaseEvent
      await tx.caseEvent.create({
        data: {
          caseId: emergencyId,
          eventType: CaseEventType.AMBULANCE_ASSIGNED,
          actorId: dto.dispatcherId ?? null,
          notes: dto.notes ?? null,
          payload: {
            assignmentId: assignment.id,
            ambulanceId: dto.ambulanceId,
            ambulanceCallSign: ambulance.callSign,
            ambulanceRegistration: ambulance.registrationNumber,
            dispatcherId: dto.dispatcherId ?? null,
          },
        },
      });

      return assignment;
    });
  }

  // ─── List Assignments for a Case ────────────────────────────────────────

  async findAllForCase(emergencyId: string) {
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id: emergencyId },
    });
    if (!emergency) {
      throw new NotFoundException(
        `Emergency case with ID '${emergencyId}' not found`,
      );
    }

    return this.prisma.assignment.findMany({
      where: { caseId: emergencyId },
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
          select: { id: true, name: true, role: true },
        },
      },
    });
  }

  // ─── Get Single Assignment ───────────────────────────────────────────────

  async findOne(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            status: true,
            priority: true,
            incidentAddress: true,
            incidentLatitude: true,
            incidentLongitude: true,
          },
        },
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
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID '${id}' not found`);
    }

    return assignment;
  }

  // ─── Accept Assignment ───────────────────────────────────────────────────

  async accept(id: string, dto: AcceptAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { ambulance: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID '${id}' not found`);
    }

    if (assignment.status !== AssignmentStatus.ASSIGNED) {
      throw new BadRequestException(
        `Assignment can only be accepted when in ASSIGNED status. Current status: ${assignment.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
        where: { id },
        data: {
          status: AssignmentStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          ambulance: { select: { id: true, callSign: true, type: true, status: true } },
          dispatcher: { select: { id: true, name: true, role: true } },
        },
      });

      await tx.caseEvent.create({
        data: {
          caseId: assignment.caseId,
          eventType: CaseEventType.AMBULANCE_ACCEPTED,
          actorId: dto.actorId ?? null,
          notes: dto.notes ?? null,
          payload: {
            assignmentId: id,
            ambulanceCallSign: assignment.ambulance.callSign,
          },
        },
      });

      return updated;
    });
  }

  // ─── Reject Assignment ───────────────────────────────────────────────────

  async reject(id: string, dto: RejectAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { ambulance: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID '${id}' not found`);
    }

    if (assignment.status !== AssignmentStatus.ASSIGNED) {
      throw new BadRequestException(
        `Assignment can only be rejected when in ASSIGNED status. Current status: ${assignment.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Reject the assignment
      const updated = await tx.assignment.update({
        where: { id },
        data: {
          status: AssignmentStatus.REJECTED,
          rejectedAt: new Date(),
          notes: dto.notes ?? assignment.notes,
        },
      });

      // Return ambulance to available
      await tx.ambulance.update({
        where: { id: assignment.ambulanceId },
        data: {
          status: AmbulanceStatus.AVAILABLE,
          isAvailable: true,
        },
      });

      // Return emergency to DISPATCHING so dispatcher can reassign
      await tx.emergencyCase.update({
        where: { id: assignment.caseId },
        data: { status: CaseStatus.DISPATCHING },
      });

      // CaseEvent
      await tx.caseEvent.create({
        data: {
          caseId: assignment.caseId,
          eventType: CaseEventType.AMBULANCE_REJECTED,
          actorId: dto.actorId ?? null,
          notes: dto.notes ?? null,
          payload: {
            assignmentId: id,
            ambulanceCallSign: assignment.ambulance.callSign,
            reason: dto.notes ?? null,
          },
        },
      });

      return updated;
    });
  }

  // ─── Generic Status Update ───────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateAssignmentStatusDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { ambulance: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID '${id}' not found`);
    }

    if (assignment.status === dto.status) {
      return assignment;
    }

    const allowed = ALLOWED_ASSIGNMENT_TRANSITIONS[assignment.status as AssignmentStatus] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid assignment status transition from ${assignment.status} to ${dto.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Build timestamp fields for the new status
      const timestampData = this.buildTimestampData(dto.status);

      // Update assignment
      const updated = await tx.assignment.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.notes ?? assignment.notes,
          ...timestampData,
        },
        include: {
          ambulance: { select: { id: true, callSign: true, type: true, status: true } },
          dispatcher: { select: { id: true, name: true, role: true } },
        },
      });

      // Update ambulance status
      const newAmbulanceStatus = ASSIGNMENT_TO_AMBULANCE_STATUS[dto.status];
      if (newAmbulanceStatus !== undefined) {
        const isNowAvailable = newAmbulanceStatus === AmbulanceStatus.AVAILABLE;
        await tx.ambulance.update({
          where: { id: assignment.ambulanceId },
          data: {
            status: newAmbulanceStatus,
            isAvailable: isNowAvailable,
          },
        });
      }

      // Update EmergencyCase status where applicable
      const newCaseStatus = ASSIGNMENT_TO_CASE_STATUS[dto.status];
      if (newCaseStatus !== undefined) {
        await tx.emergencyCase.update({
          where: { id: assignment.caseId },
          data: { status: newCaseStatus },
        });
      }

      // Create CaseEvent for meaningful transitions
      const eventType = ASSIGNMENT_TO_EVENT_TYPE[dto.status];
      if (eventType !== undefined) {
        await tx.caseEvent.create({
          data: {
            caseId: assignment.caseId,
            eventType,
            actorId: dto.actorId ?? null,
            notes: dto.notes ?? null,
            payload: {
              assignmentId: id,
              fromStatus: assignment.status,
              toStatus: dto.status,
              ambulanceCallSign: assignment.ambulance.callSign,
            },
          },
        });
      }

      return updated;
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private buildTimestampData(status: AssignmentStatus): Record<string, Date> {
    const now = new Date();
    switch (status) {
      case AssignmentStatus.ACCEPTED:
        return { acceptedAt: now };
      case AssignmentStatus.REJECTED:
        return { rejectedAt: now };
      case AssignmentStatus.ARRIVED_AT_SCENE:
        return { arrivedAtSceneAt: now };
      case AssignmentStatus.PATIENT_ONBOARD:
        return { patientOnboardAt: now };
      case AssignmentStatus.COMPLETED:
        return { completedAt: now };
      case AssignmentStatus.CANCELLED:
        return { cancelledAt: now };
      default:
        return {};
    }
  }
}
