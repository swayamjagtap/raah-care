import { describe, expect, it } from 'vitest';
import {
  AmbulanceStatus,
  AmbulanceType,
  CasePriority,
  HospitalStatus,
  ResourceStatus,
  ResourceType,
} from '../../generated/prisma/enums.js';
import {
  areCoordinatesValid,
  calculateHaversineDistanceKm,
  calculateProximityScore,
  DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
  DEFAULT_TRAVEL_TIME_OPTIONS,
  estimateTravelTimeMinutes,
  evaluateAmbulanceCandidate,
  evaluateHospitalCandidate,
  evaluateHospitalResources,
  HOSPITAL_ACCEPTANCE_DISCLAIMER,
  normalizeWeights,
  PROVISIONAL_POLICY_NOTICE,
  rankAmbulanceCandidates,
  rankHospitalCandidates,
  validateCoordinates,
} from './allocation.calculator.js';
import {
  AmbulanceCandidateInput,
  AmbulanceCapabilityPolicy,
  EmergencyContextInput,
  GeoCoordinates,
  HospitalCandidateInput,
} from './allocation.types.js';

describe('Allocation Calculator Engine — Safety & Scoring Integrity', () => {
  // A medically validated test policy to verify the ELIGIBLE state when clinical approval is present
  const validatedTestPolicy: AmbulanceCapabilityPolicy = {
    policyName: 'Clinically Validated Medical Direction Policy',
    policyVersion: '1.0.0',
    isClinicallyValidated: true,
    rules: [
      {
        ambulanceType: AmbulanceType.ALS,
        priority: CasePriority.CRITICAL,
        score: 100,
        isClinicallyValidated: true,
        notes: 'Validated ALS critical protocol.',
      },
      {
        ambulanceType: AmbulanceType.BLS,
        priority: CasePriority.MEDIUM,
        score: 100,
        isClinicallyValidated: true,
        notes: 'Validated BLS medium protocol.',
      },
      {
        ambulanceType: AmbulanceType.BLS,
        priority: CasePriority.LOW,
        score: 100,
        isClinicallyValidated: true,
        notes: 'Validated BLS low protocol.',
      },
      {
        ambulanceType: AmbulanceType.BLS,
        priority: CasePriority.CRITICAL,
        score: 40,
        isClinicallyValidated: true,
        notes: 'Validated BLS critical protocol.',
      },
    ],
  };

  const baseIncidentCoords: GeoCoordinates = {
    latitude: 19.076,
    longitude: 72.877,
  };

  const baseEmergencyContext: EmergencyContextInput = {
    priority: CasePriority.CRITICAL,
    incidentLatitude: baseIncidentCoords.latitude,
    incidentLongitude: baseIncidentCoords.longitude,
    incidentAddress: 'Marine Drive, Mumbai',
  };

  // ─── 1. Geographic Calculations ───────────────────────────────────────────

  describe('Geographic Calculations', () => {
    const cst: GeoCoordinates = { latitude: 18.9401, longitude: 72.8347 };
    const bkc: GeoCoordinates = { latitude: 19.0657, longitude: 72.8687 };

    it('calculates zero distance for identical coordinates', () => {
      const distance = calculateHaversineDistanceKm(cst, cst);
      expect(distance).toBe(0.0);
    });

    it('calculates accurate distance between known coordinate pairs (CST to BKC)', () => {
      const distance = calculateHaversineDistanceKm(cst, bkc);
      expect(distance).toBe(14.416);
    });

    it('is symmetric: dist(A, B) === dist(B, A)', () => {
      const distAB = calculateHaversineDistanceKm(cst, bkc);
      const distBA = calculateHaversineDistanceKm(bkc, cst);
      expect(distAB).toBe(distBA);
    });

    it('rejects invalid latitude (> 90)', () => {
      expect(() =>
        validateCoordinates({ latitude: 91.0, longitude: 72.0 }),
      ).toThrow(RangeError);
    });

    it('rejects invalid latitude (< -90)', () => {
      expect(() =>
        validateCoordinates({ latitude: -90.5, longitude: 72.0 }),
      ).toThrow(RangeError);
    });

    it('rejects invalid longitude (> 180)', () => {
      expect(() =>
        validateCoordinates({ latitude: 19.0, longitude: 180.5 }),
      ).toThrow(RangeError);
    });

    it('rejects invalid longitude (< -180)', () => {
      expect(() =>
        validateCoordinates({ latitude: 19.0, longitude: -180.5 }),
      ).toThrow(RangeError);
    });

    it('rejects NaN and Infinity coordinates', () => {
      expect(() =>
        validateCoordinates({ latitude: NaN, longitude: 72.0 }),
      ).toThrow(RangeError);
      expect(() =>
        validateCoordinates({ latitude: 19.0, longitude: Infinity }),
      ).toThrow(RangeError);
    });

    it('areCoordinatesValid correctly identifies valid and invalid coordinates', () => {
      expect(areCoordinatesValid({ latitude: 19.0, longitude: 72.0 })).toBe(
        true,
      );
      expect(areCoordinatesValid({ latitude: 95.0, longitude: 72.0 })).toBe(
        false,
      );
      expect(areCoordinatesValid({ latitude: null, longitude: 72.0 })).toBe(
        false,
      );
      expect(areCoordinatesValid(undefined)).toBe(false);
    });

    it('returns dispatch buffer minutes for zero distance travel time', () => {
      const time = estimateTravelTimeMinutes(0.0);
      expect(time).toBe(DEFAULT_TRAVEL_TIME_OPTIONS.dispatchBufferMinutes);
    });

    it('estimates travel time with configured parameters predictably', () => {
      const time = estimateTravelTimeMinutes(10.0, {
        averageSpeedKmh: 35.0,
        roadDistanceFactor: 1.35,
        dispatchBufferMinutes: 2.0,
      });
      expect(time).toBe(25.1);
    });

    it('rejects negative distance in estimateTravelTimeMinutes', () => {
      expect(() => estimateTravelTimeMinutes(-5)).toThrow(RangeError);
    });

    it('rejects invalid travel time options', () => {
      expect(() =>
        estimateTravelTimeMinutes(10, { averageSpeedKmh: -10 }),
      ).toThrow(RangeError);
      expect(() =>
        estimateTravelTimeMinutes(10, { roadDistanceFactor: 0.5 }),
      ).toThrow(RangeError);
      expect(() =>
        estimateTravelTimeMinutes(10, { dispatchBufferMinutes: -1 }),
      ).toThrow(RangeError);
    });

    it('throws RangeError when a very large roadDistanceFactor causes calculation overflow', () => {
      expect(() =>
        estimateTravelTimeMinutes(10.0, {
          roadDistanceFactor: Number.MAX_VALUE,
        }),
      ).toThrow(RangeError);
    });

    it('throws RangeError when a very small averageSpeedKmh causes calculation overflow', () => {
      expect(() =>
        estimateTravelTimeMinutes(10.0, {
          averageSpeedKmh: Number.MIN_VALUE,
        }),
      ).toThrow(RangeError);
    });

    it('throws RangeError for zero distance when dispatchBufferMinutes rounding overflows', () => {
      expect(() =>
        estimateTravelTimeMinutes(0.0, {
          dispatchBufferMinutes: Number.MAX_VALUE,
        }),
      ).toThrow(RangeError);
    });

    it('throws RangeError when totalMinutes is finite but multiplication by 10 overflows during rounding', () => {
      expect(() =>
        estimateTravelTimeMinutes(Number.MAX_VALUE / 100, {
          roadDistanceFactor: 1.0,
          averageSpeedKmh: 1.0,
        }),
      ).toThrow(RangeError);
    });

    it('calculates proximity score accurately across ranges', () => {
      expect(calculateProximityScore(0.0)).toBe(100.0);
      expect(calculateProximityScore(15.0, { maxRangeKm: 30.0 })).toBe(50.0);
      expect(calculateProximityScore(30.0, { maxRangeKm: 30.0 })).toBe(0.0);
      expect(calculateProximityScore(45.0, { maxRangeKm: 30.0 })).toBe(0.0);
    });

    it('rejects negative distance or invalid maxRange in calculateProximityScore', () => {
      expect(() => calculateProximityScore(-1)).toThrow(RangeError);
      expect(() => calculateProximityScore(10, { maxRangeKm: 0 })).toThrow(
        RangeError,
      );
    });
  });

  // ─── 2. Ambulance Suitability ─────────────────────────────────────────────

  describe('Ambulance Suitability & Safety Boundaries', () => {
    const readyAls: AmbulanceCandidateInput = {
      id: 'amb-als-1',
      callSign: 'RAAH-ALS-01',
      registrationNumber: 'MH01-AB-1234',
      type: AmbulanceType.ALS,
      status: AmbulanceStatus.AVAILABLE,
      isAvailable: true,
      currentLatitude: 19.085,
      currentLongitude: 72.885,
      baseHospitalId: 'hosp-1',
    };

    const readyBls: AmbulanceCandidateInput = {
      id: 'amb-bls-1',
      callSign: 'RAAH-BLS-01',
      registrationNumber: 'MH01-CD-5678',
      type: AmbulanceType.BLS,
      status: AmbulanceStatus.AVAILABLE,
      isAvailable: true,
      currentLatitude: 19.085,
      currentLongitude: 72.885,
      baseHospitalId: 'hosp-1',
    };

    it('evaluates available ALS with validated policy as ELIGIBLE', () => {
      const result = evaluateAmbulanceCandidate(
        readyAls,
        baseEmergencyContext,
        validatedTestPolicy,
      );

      expect(result.evaluationState).toBe('ELIGIBLE');
      expect(result.isEligible).toBe(true);
      expect(result.requiresDispatcherReview).toBe(false);
      expect(result.disqualificationReasons).toHaveLength(0);
      expect(result.reviewReasons).toHaveLength(0);
      expect(result.locationStatus).toBe('VERIFIED');
      expect(result.score).toBeGreaterThan(80);
      expect(result.tier).toBe('OPTIMAL');
    });

    it('evaluates ambulance under provisional heuristic policy as REQUIRES_REVIEW', () => {
      const result = evaluateAmbulanceCandidate(
        readyAls,
        baseEmergencyContext,
        DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(
        result.reviewReasons.some((r) => r.includes('PROVISIONAL_CAPABILITY')),
      ).toBe(true);
      expect(result.policyNotice).toBe(PROVISIONAL_POLICY_NOTICE);
    });

    it('evaluates available BLS for CRITICAL priority as REQUIRES_REVIEW under provisional policy', () => {
      const result = evaluateAmbulanceCandidate(
        readyBls,
        baseEmergencyContext,
        DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(result.tier).toBe('SUBOPTIMAL');
    });

    it('handles missing ambulance GPS with UNKNOWN_LOCATION and marks REQUIRES_REVIEW', () => {
      const missingGps: AmbulanceCandidateInput = {
        ...readyAls,
        currentLatitude: null,
        currentLongitude: null,
      };

      const result = evaluateAmbulanceCandidate(
        missingGps,
        baseEmergencyContext,
        validatedTestPolicy,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(result.locationStatus).toBe('UNKNOWN_LOCATION');
      expect(result.distanceKm).toBeNull();
      expect(result.estimatedTravelTimeMinutes).toBeNull();
      expect(result.factors.proximityScore).toBe(0);
      expect(
        result.reviewReasons.some((r) => r.includes('UNKNOWN_LOCATION')),
      ).toBe(true);
    });

    it('handles invalid ambulance GPS with INVALID_LOCATION and marks REQUIRES_REVIEW', () => {
      const invalidGps: AmbulanceCandidateInput = {
        ...readyAls,
        currentLatitude: 95.0, // Invalid latitude > 90
        currentLongitude: 72.885,
      };

      const result = evaluateAmbulanceCandidate(
        invalidGps,
        baseEmergencyContext,
        validatedTestPolicy,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(result.locationStatus).toBe('INVALID_LOCATION');
      expect(result.distanceKm).toBeNull();
      expect(result.estimatedTravelTimeMinutes).toBeNull();
      expect(
        result.reviewReasons.some((r) => r.includes('INVALID_LOCATION')),
      ).toBe(true);
    });

    it('throws RangeError immediately when incident GPS is invalid', () => {
      const invalidContext: EmergencyContextInput = {
        ...baseEmergencyContext,
        incidentLatitude: 99.0, // Invalid incident lat
      };

      expect(() =>
        evaluateAmbulanceCandidate(
          readyAls,
          invalidContext,
          validatedTestPolicy,
        ),
      ).toThrow(RangeError);
    });

    it('hard-disqualifies unavailable ambulance (isAvailable: false)', () => {
      const unavailable: AmbulanceCandidateInput = {
        ...readyAls,
        isAvailable: false,
      };

      const result = evaluateAmbulanceCandidate(
        unavailable,
        baseEmergencyContext,
        validatedTestPolicy,
      );

      expect(result.evaluationState).toBe('DISQUALIFIED');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.tier).toBe('DISQUALIFIED');
      expect(result.disqualificationReasons).toContain(
        'Ambulance is marked unavailable (isAvailable: false).',
      );
    });

    it('hard-disqualifies assigned or out-of-service ambulance', () => {
      const assigned: AmbulanceCandidateInput = {
        ...readyAls,
        status: AmbulanceStatus.ASSIGNED,
      };

      const result = evaluateAmbulanceCandidate(
        assigned,
        baseEmergencyContext,
        validatedTestPolicy,
      );

      expect(result.evaluationState).toBe('DISQUALIFIED');
      expect(result.isEligible).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.tier).toBe('DISQUALIFIED');
      expect(result.disqualificationReasons[0]).toContain('ASSIGNED');
    });

    it('marks ambulance with unconfigured type/capability rule as REQUIRES_REVIEW', () => {
      const otherAmbulance: AmbulanceCandidateInput = {
        ...readyAls,
        type: AmbulanceType.OTHER,
      };

      const result = evaluateAmbulanceCandidate(
        otherAmbulance,
        baseEmergencyContext,
        validatedTestPolicy, // policy has no rule for OTHER
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.requiresDispatcherReview).toBe(true);
      expect(
        result.reviewReasons.some((r) => r.includes('NO_CAPABILITY_RULE')),
      ).toBe(true);
    });

    it('ensures high proximity cannot override an unvalidated/review-required capability', () => {
      // Ambulance is at the exact scene location (distance 0 km -> proximity score 100)
      const zeroDistanceAmbulance: AmbulanceCandidateInput = {
        ...readyAls,
        currentLatitude: baseIncidentCoords.latitude,
        currentLongitude: baseIncidentCoords.longitude,
      };

      // Under provisional policy, it must still be REQUIRES_REVIEW, NOT ELIGIBLE
      const result = evaluateAmbulanceCandidate(
        zeroDistanceAmbulance,
        baseEmergencyContext,
        DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
      );

      expect(result.factors.proximityScore).toBe(100.0);
      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
    });

    it('ranks candidates in strict hierarchy: ELIGIBLE first, REQUIRES_REVIEW second, DISQUALIFIED last', () => {
      // Candidate A: Validated policy, known location -> ELIGIBLE
      const eligibleAls: AmbulanceCandidateInput = {
        ...readyAls,
        id: 'amb-eligible',
        currentLatitude: 19.1, // ~3 km away
        currentLongitude: 72.88,
      };

      // Candidate B: Missing GPS, but 0 distance in theory -> REQUIRES_REVIEW
      const unknownGpsAls: AmbulanceCandidateInput = {
        ...readyAls,
        id: 'amb-unknown-gps',
        currentLatitude: null,
        currentLongitude: null,
      };

      // Candidate C: Disqualified (isAvailable: false)
      const disqualifiedAls: AmbulanceCandidateInput = {
        ...readyAls,
        id: 'amb-disqualified',
        isAvailable: false,
      };

      const ranked = rankAmbulanceCandidates(
        [disqualifiedAls, unknownGpsAls, eligibleAls],
        baseEmergencyContext,
        validatedTestPolicy,
      );

      expect(ranked).toHaveLength(3);
      expect(ranked[0].candidateId).toBe('amb-eligible');
      expect(ranked[0].evaluationState).toBe('ELIGIBLE');

      expect(ranked[1].candidateId).toBe('amb-unknown-gps');
      expect(ranked[1].evaluationState).toBe('REQUIRES_REVIEW');

      expect(ranked[2].candidateId).toBe('amb-disqualified');
      expect(ranked[2].evaluationState).toBe('DISQUALIFIED');
    });
  });

  // ─── 3. Hospital Suitability ──────────────────────────────────────────────

  describe('Hospital Suitability & Resource Integrity', () => {
    const operationalHospital: HospitalCandidateInput = {
      id: 'hosp-1',
      name: 'City Trauma Center',
      code: 'CTC-01',
      latitude: 19.09,
      longitude: 72.88,
      status: HospitalStatus.OPERATIONAL,
      emergencyCapability: 'Level 1 Trauma, Comprehensive Stroke',
      resources: [
        {
          type: ResourceType.ICU,
          status: ResourceStatus.AVAILABLE,
          quantity: 10,
          availableQuantity: 4,
        },
        {
          type: ResourceType.EMERGENCY_BEDS,
          status: ResourceStatus.AVAILABLE,
          quantity: 20,
          availableQuantity: 8,
        },
      ],
    };

    const contextWithResources: EmergencyContextInput = {
      ...baseEmergencyContext,
      requiredResources: [ResourceType.ICU, ResourceType.EMERGENCY_BEDS],
    };

    it('evaluates OPERATIONAL hospital with confirmed required resources as ELIGIBLE', () => {
      const result = evaluateHospitalCandidate(
        operationalHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('ELIGIBLE');
      expect(result.isEligible).toBe(true);
      expect(result.requiresDispatcherReview).toBe(false);
      expect(result.resourceAssessmentStatus).toBe('CONFIRMED');
      expect(result.factors.operationalStatusScore).toBe(100);
      expect(result.factors.resourceScore).toBe(100);
      expect(result.clinicalDisclaimer).toBe(HOSPITAL_ACCEPTANCE_DISCLAIMER);
    });

    it('penalizes a BUSY hospital but keeps it ELIGIBLE if other factors pass', () => {
      const busyHospital: HospitalCandidateInput = {
        ...operationalHospital,
        status: HospitalStatus.BUSY,
      };

      const result = evaluateHospitalCandidate(
        busyHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('ELIGIBLE');
      expect(result.isEligible).toBe(true);
      expect(result.factors.operationalStatusScore).toBe(50);
      expect(result.reasons.some((r) => r.includes('BUSY'))).toBe(true);
    });

    it('hard-disqualifies a CLOSED hospital', () => {
      const closedHospital: HospitalCandidateInput = {
        ...operationalHospital,
        status: HospitalStatus.CLOSED,
      };

      const result = evaluateHospitalCandidate(
        closedHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('DISQUALIFIED');
      expect(result.isEligible).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.tier).toBe('DISQUALIFIED');
      expect(result.disqualificationReasons).toContain('Hospital is CLOSED.');
    });

    it('hard-disqualifies a DIVERTING hospital from ordinary dispatch', () => {
      const divertHospital: HospitalCandidateInput = {
        ...operationalHospital,
        status: HospitalStatus.DIVERTING,
      };

      const result = evaluateHospitalCandidate(
        divertHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('DISQUALIFIED');
      expect(result.isEligible).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.tier).toBe('DISQUALIFIED');
      expect(
        result.disqualificationReasons.some((r) => r.includes('DIVERTING')),
      ).toBe(true);
    });

    it('evaluates LOW_STOCK required resource as REQUIRES_REVIEW (not fully confirmed)', () => {
      const lowStockHospital: HospitalCandidateInput = {
        ...operationalHospital,
        resources: [
          {
            type: ResourceType.ICU,
            status: ResourceStatus.LOW_STOCK,
            quantity: 10,
            availableQuantity: 1, // Low stock!
          },
          {
            type: ResourceType.EMERGENCY_BEDS,
            status: ResourceStatus.AVAILABLE,
            quantity: 20,
            availableQuantity: 8,
          },
        ],
      };

      const result = evaluateHospitalCandidate(
        lowStockHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(result.resourceAssessmentStatus).toBe('LOW_STOCK_WARNING');
      expect(result.reviewReasons.some((r) => r.includes('LOW_STOCK'))).toBe(
        true,
      );
    });

    it('hard-disqualifies hospital when required resource has zero available quantity', () => {
      const depletedHospital: HospitalCandidateInput = {
        ...operationalHospital,
        resources: [
          {
            type: ResourceType.ICU,
            status: ResourceStatus.AVAILABLE,
            quantity: 10,
            availableQuantity: 0, // Depleted!
          },
        ],
      };

      const result = evaluateHospitalCandidate(
        depletedHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('DISQUALIFIED');
      expect(result.isEligible).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.resourceAssessmentStatus).toBe('INCOMPATIBLE');
      expect(
        result.disqualificationReasons.some((r) =>
          r.includes('DEPLETED_RESOURCE'),
        ),
      ).toBe(true);
    });

    it('hard-disqualifies hospital when required resource is in MAINTENANCE or UNAVAILABLE', () => {
      const maintHospital: HospitalCandidateInput = {
        ...operationalHospital,
        resources: [
          {
            type: ResourceType.ICU,
            status: ResourceStatus.MAINTENANCE,
            quantity: 10,
            availableQuantity: 5,
          },
        ],
      };

      const result = evaluateHospitalCandidate(
        maintHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('DISQUALIFIED');
      expect(result.isEligible).toBe(false);
      expect(result.resourceAssessmentStatus).toBe('INCOMPATIBLE');
      expect(
        result.disqualificationReasons.some((r) => r.includes('MAINTENANCE')),
      ).toBe(true);
    });

    it('evaluates missing required resource record as unconfirmed and REQUIRES_REVIEW', () => {
      const missingResourceHospital: HospitalCandidateInput = {
        ...operationalHospital,
        resources: [], // No resources reported!
      };

      const result = evaluateHospitalCandidate(
        missingResourceHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(result.resourceAssessmentStatus).toBe('UNCONFIRMED_MISSING');
      expect(
        result.reviewReasons.some((r) => r.includes('UNCONFIRMED_RESOURCE')),
      ).toBe(true);
    });

    it('reports NOT_SPECIFIED when no required resources are supplied without inventing requirements', () => {
      // Empty context with no requiredResources
      const unspecifiedContext: EmergencyContextInput = {
        ...baseEmergencyContext,
        requiredResources: undefined,
      };

      const result = evaluateHospitalCandidate(
        operationalHospital,
        unspecifiedContext,
      );

      expect(result.evaluationState).toBe('ELIGIBLE');
      expect(result.resourceAssessmentStatus).toBe('NOT_SPECIFIED');
      expect(result.resourceDetails).toHaveLength(0);
      expect(result.reasons.some((r) => r.includes('NOT_SPECIFIED'))).toBe(
        true,
      );
    });

    it('handles missing hospital coordinates with UNKNOWN_LOCATION and REQUIRES_REVIEW', () => {
      const missingCoordsHospital: HospitalCandidateInput = {
        ...operationalHospital,
        latitude: null,
        longitude: null,
      };

      const result = evaluateHospitalCandidate(
        missingCoordsHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(result.locationStatus).toBe('UNKNOWN_LOCATION');
      expect(result.distanceKm).toBeNull();
      expect(result.estimatedTravelTimeMinutes).toBeNull();
      expect(
        result.reviewReasons.some((r) => r.includes('UNKNOWN_LOCATION')),
      ).toBe(true);
    });

    it('handles invalid hospital coordinates with INVALID_LOCATION and REQUIRES_REVIEW', () => {
      const invalidCoordsHospital: HospitalCandidateInput = {
        ...operationalHospital,
        latitude: -105.0, // Invalid latitude
        longitude: 72.88,
      };

      const result = evaluateHospitalCandidate(
        invalidCoordsHospital,
        contextWithResources,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(result.locationStatus).toBe('INVALID_LOCATION');
      expect(result.distanceKm).toBeNull();
      expect(
        result.reviewReasons.some((r) => r.includes('INVALID_LOCATION')),
      ).toBe(true);
    });

    it('treats freeform capability substring match as UNVERIFIED hint and marks REQUIRES_REVIEW', () => {
      const specialtyContext: EmergencyContextInput = {
        ...baseEmergencyContext,
        requiredCapabilities: ['TRAUMA'],
      };

      const result = evaluateHospitalCandidate(
        operationalHospital,
        specialtyContext,
      );

      expect(result.evaluationState).toBe('REQUIRES_REVIEW');
      expect(result.isEligible).toBe(false);
      expect(result.requiresDispatcherReview).toBe(true);
      expect(
        result.reviewReasons.some((r) => r.includes('UNVERIFIED_SPECIALTY')),
      ).toBe(true);
    });

    it('ranks hospital candidates in strict state hierarchy: ELIGIBLE first, REQUIRES_REVIEW second, DISQUALIFIED last', () => {
      const eligibleHospital: HospitalCandidateInput = {
        ...operationalHospital,
        id: 'hosp-eligible',
      };

      const reviewHospital: HospitalCandidateInput = {
        ...operationalHospital,
        id: 'hosp-review',
        latitude: null, // missing coordinates
      };

      const closedHospital: HospitalCandidateInput = {
        ...operationalHospital,
        id: 'hosp-closed',
        status: HospitalStatus.CLOSED,
      };

      const ranked = rankHospitalCandidates(
        [closedHospital, reviewHospital, eligibleHospital],
        contextWithResources,
      );

      expect(ranked).toHaveLength(3);
      expect(ranked[0].hospitalId).toBe('hosp-eligible');
      expect(ranked[0].evaluationState).toBe('ELIGIBLE');

      expect(ranked[1].hospitalId).toBe('hosp-review');
      expect(ranked[1].evaluationState).toBe('REQUIRES_REVIEW');

      expect(ranked[2].hospitalId).toBe('hosp-closed');
      expect(ranked[2].evaluationState).toBe('DISQUALIFIED');
    });
  });

  // ─── 4. General Scoring, Weights & Numerical Integrity ─────────────────────

  describe('Scoring Integrity, Weights & Numerical Boundaries', () => {
    it('normalizes valid custom weights accurately', () => {
      const custom = normalizeWeights({
        proximity: 2.0,
        capability: 2.0,
        readiness: 0.0,
      });

      expect(custom.proximity).toBe(0.5);
      expect(custom.capability).toBe(0.5);
      expect(custom.readiness).toBe(0.0);
    });

    it('rejects negative weights', () => {
      expect(() =>
        normalizeWeights({ proximity: -0.5, capability: 0.5 }),
      ).toThrow(RangeError);
    });

    it('rejects NaN and Infinity weights', () => {
      expect(() =>
        normalizeWeights({ proximity: NaN, capability: 0.5 }),
      ).toThrow(RangeError);
      expect(() =>
        normalizeWeights({ proximity: Infinity, capability: 0.5 }),
      ).toThrow(RangeError);
    });

    it('rejects all-zero weights', () => {
      expect(() =>
        normalizeWeights({ proximity: 0.0, capability: 0.0 }),
      ).toThrow(RangeError);
    });

    it('rejects weights summing to non-finite values (two Number.MAX_VALUE weights)', () => {
      expect(() =>
        normalizeWeights({
          w1: Number.MAX_VALUE,
          w2: Number.MAX_VALUE,
        }),
      ).toThrow(RangeError);
    });

    it('flags negative resource quantities as INVALID_RESOURCE_DATA requiring review (not a hard throw)', () => {
      const result = evaluateHospitalResources(
        [
          {
            type: ResourceType.ICU,
            status: ResourceStatus.AVAILABLE,
            quantity: -5,
            availableQuantity: 2,
          },
        ],
        [ResourceType.ICU],
      );
      // Invalid inventory data must NOT be treated as confirmed availability
      expect(result.resourceAssessmentStatus).not.toBe('CONFIRMED');
      // The required resource was invalidated, so it appears as unconfirmed/missing
      expect(result.reviewReasons.length).toBeGreaterThan(0);
      expect(result.disqualificationReasons).toHaveLength(0);
      // A review reason must reference the invalid data
      const mentionsInvalid = result.reviewReasons.some(
        (r) => r.includes('INVALID_RESOURCE_DATA') || r.includes('ICU'),
      );
      expect(mentionsInvalid).toBe(true);
    });

    it('flags availableQuantity > quantity as INVALID_RESOURCE_DATA requiring review', () => {
      const result = evaluateHospitalResources(
        [
          {
            type: ResourceType.ICU,
            status: ResourceStatus.AVAILABLE,
            quantity: 5,
            availableQuantity: 10, // contradictory
          },
        ],
        [ResourceType.ICU],
      );
      expect(result.resourceAssessmentStatus).not.toBe('CONFIRMED');
      expect(result.reviewReasons.length).toBeGreaterThan(0);
      const mentionsInvalid = result.reviewReasons.some(
        (r) => r.includes('INVALID_RESOURCE_DATA') || r.includes('ICU'),
      );
      expect(mentionsInvalid).toBe(true);
    });

    it('flags duplicate resource records as INVALID_RESOURCE_DATA requiring review', () => {
      const result = evaluateHospitalResources(
        [
          {
            type: ResourceType.ICU,
            status: ResourceStatus.AVAILABLE,
            quantity: 10,
            availableQuantity: 8,
          },
          {
            type: ResourceType.ICU, // duplicate
            status: ResourceStatus.AVAILABLE,
            quantity: 5,
            availableQuantity: 4,
          },
        ],
        [ResourceType.ICU],
      );
      // Duplicates must never silently confirm availability
      expect(result.resourceAssessmentStatus).not.toBe('CONFIRMED');
      expect(result.reviewReasons.length).toBeGreaterThan(0);
      const mentionsDuplicate = result.reviewReasons.some(
        (r) => r.includes('Duplicate') || r.includes('ICU'),
      );
      expect(mentionsDuplicate).toBe(true);
    });

    it('ensures an invalid unrelated resource does not trigger review', () => {
      const result = evaluateHospitalResources(
        [
          {
            type: ResourceType.OXYGEN,
            status: ResourceStatus.AVAILABLE,
            quantity: 10,
            availableQuantity: 8,
          },
          {
            type: ResourceType.MRI, // Unrelated invalid record
            status: ResourceStatus.AVAILABLE,
            quantity: -5,
            availableQuantity: 2,
          },
        ],
        [ResourceType.OXYGEN],
      );

      expect(result.resourceAssessmentStatus).toBe('CONFIRMED');
      expect(result.reviewReasons).toHaveLength(0);
      expect(result.disqualificationReasons).toHaveLength(0);
      expect(result.resourceScore).toBe(100.0);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].isConfirmedAvailable).toBe(true);
      expect(result.details[0].assessment).toBe('CONFIRMED');
    });

    it('ensures a duplicate unrelated resource does not trigger review', () => {
      const result = evaluateHospitalResources(
        [
          {
            type: ResourceType.OXYGEN,
            status: ResourceStatus.AVAILABLE,
            quantity: 10,
            availableQuantity: 8,
          },
          {
            type: ResourceType.MRI, // Unrelated duplicate
            status: ResourceStatus.AVAILABLE,
            quantity: 1,
            availableQuantity: 1,
          },
          {
            type: ResourceType.MRI, // Unrelated duplicate
            status: ResourceStatus.AVAILABLE,
            quantity: 2,
            availableQuantity: 2,
          },
        ],
        [ResourceType.OXYGEN],
      );

      expect(result.resourceAssessmentStatus).toBe('CONFIRMED');
      expect(result.reviewReasons).toHaveLength(0);
      expect(result.disqualificationReasons).toHaveLength(0);
      expect(result.resourceScore).toBe(100.0);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].isConfirmedAvailable).toBe(true);
    });

    it('ensures a required resource with an invalid first record and valid duplicate remains unconfirmed', () => {
      const result = evaluateHospitalResources(
        [
          {
            type: ResourceType.ICU, // invalid first occurrence
            status: ResourceStatus.AVAILABLE,
            quantity: -5,
            availableQuantity: 2,
          },
          {
            type: ResourceType.ICU, // valid duplicate
            status: ResourceStatus.AVAILABLE,
            quantity: 10,
            availableQuantity: 8,
          },
        ],
        [ResourceType.ICU],
      );

      expect(result.resourceAssessmentStatus).toBe('UNCONFIRMED_MISSING');
      expect(result.reviewReasons.length).toBeGreaterThan(0);
      expect(result.reviewReasons.some((r) => r.includes('Duplicate'))).toBe(
        true,
      );
      expect(result.details).toHaveLength(1);
      expect(result.details[0].isConfirmedAvailable).toBe(false);
      expect(result.details[0].assessment).toBe('NOT_REPORTED');
    });

    it('ensures a required resource with duplicate valid records remains unconfirmed', () => {
      const result = evaluateHospitalResources(
        [
          {
            type: ResourceType.ICU,
            status: ResourceStatus.AVAILABLE,
            quantity: 10,
            availableQuantity: 8,
          },
          {
            type: ResourceType.ICU, // duplicate valid
            status: ResourceStatus.AVAILABLE,
            quantity: 10,
            availableQuantity: 8,
          },
        ],
        [ResourceType.ICU],
      );

      expect(result.resourceAssessmentStatus).toBe('UNCONFIRMED_MISSING');
      expect(result.reviewReasons.length).toBeGreaterThan(0);
      expect(result.reviewReasons.some((r) => r.includes('Duplicate'))).toBe(
        true,
      );
      expect(result.details).toHaveLength(1);
      expect(result.details[0].isConfirmedAvailable).toBe(false);
      expect(result.details[0].assessment).toBe('NOT_REPORTED');
    });

    it('ensures a required resource with invalid inventory still requires review', () => {
      const result = evaluateHospitalResources(
        [
          {
            type: ResourceType.ICU,
            status: ResourceStatus.AVAILABLE,
            quantity: 5,
            availableQuantity: 10, // invalid (avail > total)
          },
        ],
        [ResourceType.ICU],
      );

      expect(result.resourceAssessmentStatus).toBe('UNCONFIRMED_MISSING');
      expect(result.reviewReasons.length).toBeGreaterThan(0);
      expect(
        result.reviewReasons.some((r) => r.includes('INVALID_RESOURCE_DATA')),
      ).toBe(true);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].isConfirmedAvailable).toBe(false);
      expect(result.details[0].assessment).toBe('NOT_REPORTED');
    });

    it('guarantees deterministic output across repeated identical evaluations', () => {
      const candidate: AmbulanceCandidateInput = {
        id: 'amb-det-1',
        callSign: 'RAAH-01',
        registrationNumber: 'MH01-01',
        type: AmbulanceType.ALS,
        status: AmbulanceStatus.AVAILABLE,
        isAvailable: true,
        currentLatitude: 19.08,
        currentLongitude: 72.88,
      };

      const run1 = evaluateAmbulanceCandidate(
        candidate,
        baseEmergencyContext,
        validatedTestPolicy,
      );
      const run2 = evaluateAmbulanceCandidate(
        candidate,
        baseEmergencyContext,
        validatedTestPolicy,
      );

      expect(run1).toEqual(run2);
    });

    it('never produces NaN or Infinity in any returned score or factor field', () => {
      const hospital: HospitalCandidateInput = {
        id: 'hosp-num-1',
        name: 'Test Hospital',
        code: 'TEST-01',
        status: HospitalStatus.OPERATIONAL,
        latitude: 19.076,
        longitude: 72.877,
      };

      const result = evaluateHospitalCandidate(hospital, baseEmergencyContext);
      expect(Number.isFinite(result.score)).toBe(true);
      expect(Number.isFinite(result.factors.proximityScore)).toBe(true);
      expect(Number.isFinite(result.factors.operationalStatusScore)).toBe(true);
      expect(Number.isFinite(result.factors.resourceScore)).toBe(true);
      expect(Number.isFinite(result.factors.capabilityScore)).toBe(true);
    });
  });
});
