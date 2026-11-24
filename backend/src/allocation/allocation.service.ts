import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CaseEventType,
  CaseStatus,
  HospitalStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
  evaluateHospitalCandidate,
  HOSPITAL_ACCEPTANCE_DISCLAIMER,
  PROVISIONAL_POLICY_NOTICE,
  rankAmbulanceCandidates,
  rankHospitalCandidates,
} from './allocation.calculator.js';
import {
  AmbulanceCandidateInput,
  AmbulanceSuitabilityResult,
  EmergencyContextInput,
  HospitalCandidateInput,
  HospitalSuitabilityResult,
} from './allocation.types.js';
import {
  QueryAmbulanceRecommendationsDto,
  QueryHospitalRecommendationsDto,
  SelectDestinationDto,
} from './dto/index.js';

const VALID_DESTINATION_SELECTION_STATUSES: CaseStatus[] = [
  CaseStatus.PATIENT_ONBOARD,
  CaseStatus.HOSPITAL_SELECTED,
  CaseStatus.HOSPITAL_NOTIFIED,
  CaseStatus.EN_ROUTE_TO_HOSPITAL,
];

function validateOverrideReason(reason?: string): string | null {
  if (reason === undefined || reason === null) {
    return null;
  }
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException(
      'Override reason must not be empty or whitespace-only.',
    );
  }
  if (trimmed.length < 10) {
    throw new BadRequestException(
      'Override reason must be at least 10 non-whitespace characters long.',
    );
  }
  if (trimmed.length > 2000) {
    throw new BadRequestException(
      'Override reason must not exceed 2000 characters.',
    );
  }
  return trimmed;
}

@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async getAmbulanceRecommendations(
    emergencyId: string,
    query: QueryAmbulanceRecommendationsDto,
  ): Promise<AmbulanceSuitabilityResult[]> {
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id: emergencyId },
    });

    if (!emergency) {
      throw new NotFoundException(
        `Emergency case with ID '${emergencyId}' not found`,
      );
    }

    const ambulances = await this.prisma.ambulance.findMany();

    const candidates: AmbulanceCandidateInput[] = ambulances.map((amb) => ({
      id: amb.id,
      callSign: amb.callSign,
      registrationNumber: amb.registrationNumber,
      type: amb.type,
      status: amb.status,
      isAvailable: amb.isAvailable,
      currentLatitude: amb.currentLatitude,
      currentLongitude: amb.currentLongitude,
      baseHospitalId: amb.hospitalId,
    }));

    const context: EmergencyContextInput = {
      priority: emergency.priority,
      incidentLatitude: emergency.incidentLatitude,
      incidentLongitude: emergency.incidentLongitude,
      incidentAddress: emergency.incidentAddress,
      symptoms: emergency.symptoms,
      notes: emergency.notes,
      currentCondition: emergency.currentCondition,
    };

    const proximityOpts =
      query.maxRangeKm !== undefined
        ? { maxRangeKm: query.maxRangeKm }
        : undefined;

    let ranked = rankAmbulanceCandidates(
      candidates,
      context,
      DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
      undefined,
      undefined,
      proximityOpts,
    );

    if (query.maxRangeKm !== undefined) {
      ranked = ranked.filter((c) => {
        if (c.distanceKm === null) {
          return true; // Preserve unknown-location candidates with review warnings
        }
        return c.distanceKm <= query.maxRangeKm!;
      });
    }

    if (query.includeDisqualified === false) {
      ranked = ranked.filter((c) => c.evaluationState !== 'DISQUALIFIED');
    }

    return ranked;
  }

  async getHospitalRecommendations(
    emergencyId: string,
    query: QueryHospitalRecommendationsDto,
  ): Promise<HospitalSuitabilityResult[]> {
    const emergency = await this.prisma.emergencyCase.findUnique({
      where: { id: emergencyId },
    });

    if (!emergency) {
      throw new NotFoundException(
        `Emergency case with ID '${emergencyId}' not found`,
      );
    }

    const hospitals = await this.prisma.hospital.findMany({
      include: {
        resources: true,
      },
    });

    const candidates: HospitalCandidateInput[] = hospitals.map((h) => ({
      id: h.id,
      name: h.name,
      code: h.code,
      latitude: h.latitude,
      longitude: h.longitude,
      status: h.status,
      emergencyCapability: h.emergencyCapability,
      resources: h.resources.map((r) => ({
        type: r.type,
        status: r.status,
        quantity: r.quantity,
        availableQuantity: r.availableQuantity,
      })),
    }));

    const context: EmergencyContextInput = {
      priority: emergency.priority,
      incidentLatitude: emergency.incidentLatitude,
      incidentLongitude: emergency.incidentLongitude,
      incidentAddress: emergency.incidentAddress,
      symptoms: emergency.symptoms,
      notes: emergency.notes,
      currentCondition: emergency.currentCondition,
      requiredResources: query.requiredResources,
      requiredCapabilities: query.requiredCapabilities,
    };

    const proximityOpts =
      query.maxRangeKm !== undefined
        ? { maxRangeKm: query.maxRangeKm }
        : undefined;

    let ranked = rankHospitalCandidates(
      candidates,
      context,
      undefined,
      undefined,
      proximityOpts,
    );

    if (query.maxRangeKm !== undefined) {
      ranked = ranked.filter((h) => {
        if (h.distanceKm === null) {
          return true; // Preserve unknown-location candidates with review warnings
        }
        return h.distanceKm <= query.maxRangeKm!;
      });
    }

    if (query.includeDisqualified === false) {
      ranked = ranked.filter((h) => h.evaluationState !== 'DISQUALIFIED');
    }

    return ranked;
  }

  async selectDestination(emergencyId: string, dto: SelectDestinationDto) {
    // Validate override reason at service boundary to prevent bypass
    const validatedOverrideReason = validateOverrideReason(dto.overrideReason);

    return this.prisma.$transaction(async (tx) => {
      const emergency = await tx.emergencyCase.findUnique({
        where: { id: emergencyId },
      });

      if (!emergency) {
        throw new NotFoundException(
          `Emergency case with ID '${emergencyId}' not found`,
        );
      }

      if (
        emergency.status === CaseStatus.COMPLETED ||
        emergency.status === CaseStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `Cannot select destination for a ${emergency.status.toLowerCase()} emergency case`,
        );
      }

      if (!VALID_DESTINATION_SELECTION_STATUSES.includes(emergency.status)) {
        throw new BadRequestException(
          `Emergency case in state '${emergency.status}' is not eligible for destination selection. Destination selection requires the patient to be onboard or in transport (appropriate states: PATIENT_ONBOARD, HOSPITAL_SELECTED, HOSPITAL_NOTIFIED, EN_ROUTE_TO_HOSPITAL).`,
        );
      }

      const hospital = await tx.hospital.findUnique({
        where: { id: dto.hospitalId },
        include: {
          resources: true,
        },
      });

      if (!hospital) {
        throw new NotFoundException(
          `Hospital with ID '${dto.hospitalId}' not found`,
        );
      }

      const candidate: HospitalCandidateInput = {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        status: hospital.status,
        emergencyCapability: hospital.emergencyCapability,
        resources: hospital.resources.map((r) => ({
          type: r.type,
          status: r.status,
          quantity: r.quantity,
          availableQuantity: r.availableQuantity,
        })),
      };

      const context: EmergencyContextInput = {
        priority: emergency.priority,
        incidentLatitude: emergency.incidentLatitude,
        incidentLongitude: emergency.incidentLongitude,
        incidentAddress: emergency.incidentAddress,
        symptoms: emergency.symptoms,
        notes: emergency.notes,
        currentCondition: emergency.currentCondition,
        requiredResources: dto.requiredResources,
        requiredCapabilities: dto.requiredCapabilities,
      };

      const evaluation = evaluateHospitalCandidate(candidate, context);

      // ── 1. Hard Operational Disqualifications (NEVER OVERRIDEABLE) ──
      if (hospital.status === HospitalStatus.CLOSED) {
        throw new BadRequestException(
          `Hospital '${hospital.name}' is CLOSED and cannot accept emergency patients under any circumstances. Overrides are not permitted.`,
        );
      }

      if (hospital.status === HospitalStatus.DIVERTING) {
        throw new BadRequestException(
          `Hospital '${hospital.name}' is DIVERTING emergency patients and cannot be selected. Overrides are not permitted.`,
        );
      }

      if (evaluation.resourceAssessmentStatus === 'INCOMPATIBLE') {
        throw new BadRequestException(
          `Hospital '${hospital.name}' has incompatible or depleted required clinical resources (${evaluation.disqualificationReasons.join('; ')}). Clinical incompatibility cannot be overridden.`,
        );
      }

      if (evaluation.evaluationState === 'DISQUALIFIED') {
        throw new BadRequestException(
          `Hospital '${hospital.name}' is DISQUALIFIED: ${evaluation.disqualificationReasons.join('; ')}. Hard operational disqualification cannot be overridden.`,
        );
      }

      // ── 2. Review-Required Warnings (REQUIRES_REVIEW) ──
      const requiresReview = evaluation.evaluationState === 'REQUIRES_REVIEW';
      if (requiresReview && !validatedOverrideReason) {
        throw new BadRequestException(
          `Hospital '${hospital.name}' requires dispatcher review: ${evaluation.reviewReasons.join('; ')}. An explicit override justification of at least 10 non-whitespace characters is required.`,
        );
      }

      const wasOverridden = requiresReview && Boolean(validatedOverrideReason);

      // ── 3. Idempotent Destination Reselection ──
      // When the selected hospital is already the emergency's destination:
      // - Do not regress status from HOSPITAL_NOTIFIED or EN_ROUTE_TO_HOSPITAL
      // - Do not emit duplicate or unnecessary DESTINATION_CHANGED audit events
      if (emergency.destinationHospitalId === dto.hospitalId) {
        return {
          ...emergency,
          destinationHospital: {
            id: hospital.id,
            name: hospital.name,
            code: hospital.code,
            status: hospital.status,
          },
          evaluation,
          clinicalDisclaimer: HOSPITAL_ACCEPTANCE_DISCLAIMER,
        };
      }

      // ── 4. State Transition & Concurrency Protection ──
      const expectedStatus = emergency.status;
      const expectedPreviousDestination = emergency.destinationHospitalId;
      const isDestinationChange = expectedPreviousDestination !== null;

      const eventType = isDestinationChange
        ? CaseEventType.DESTINATION_CHANGED
        : CaseEventType.HOSPITAL_SELECTED;

      const targetStatus = CaseStatus.HOSPITAL_SELECTED;

      // Conditional atomic update guarding against concurrent status or destination modifications
      const updateResult = await tx.emergencyCase.updateMany({
        where: {
          id: emergencyId,
          status: expectedStatus,
          destinationHospitalId: expectedPreviousDestination,
        },
        data: {
          destinationHospitalId: dto.hospitalId,
          status: targetStatus,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Concurrent modification detected: emergency case status or destination has been modified concurrently.',
        );
      }

      const updatedCase = {
        ...emergency,
        destinationHospitalId: dto.hospitalId,
        status: targetStatus,
      };

      await tx.caseEvent.create({
        data: {
          caseId: emergencyId,
          eventType,
          actorId: null, // Client-supplied actorId is untrusted prior to M8 authentication
          notes: dto.notes ?? validatedOverrideReason ?? null,
          payload: {
            destinationHospitalId: dto.hospitalId,
            hospitalName: hospital.name,
            hospitalCode: hospital.code,
            previousDestinationHospitalId: expectedPreviousDestination,
            eventType,
            targetStatus,
            evaluationState: evaluation.evaluationState,
            wasOverridden,
            overrideReason: validatedOverrideReason ?? null,
            disqualificationReasons: evaluation.disqualificationReasons,
            reviewReasons: evaluation.reviewReasons,
            resourceAssessmentStatus: evaluation.resourceAssessmentStatus,
            score: evaluation.score,
            tier: evaluation.tier,
            clinicalDisclaimer: HOSPITAL_ACCEPTANCE_DISCLAIMER,
            policyNotice: PROVISIONAL_POLICY_NOTICE,
          },
        },
      });

      return {
        ...updatedCase!,
        destinationHospital: {
          id: hospital.id,
          name: hospital.name,
          code: hospital.code,
          status: hospital.status,
        },
        evaluation,
        clinicalDisclaimer: HOSPITAL_ACCEPTANCE_DISCLAIMER,
      };
    });
  }
}
