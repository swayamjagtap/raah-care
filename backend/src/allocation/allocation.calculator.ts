import {
  AmbulanceStatus,
  AmbulanceType,
  CasePriority,
  HospitalStatus,
  ResourceStatus,
  ResourceType,
} from '../../generated/prisma/enums.js';
import {
  AmbulanceCandidateInput,
  AmbulanceCapabilityPolicy,
  AmbulanceScoringWeights,
  AmbulanceSuitabilityResult,
  EmergencyContextInput,
  EvaluationState,
  GeoCoordinates,
  HospitalCandidateInput,
  HospitalResourceSnapshot,
  HospitalScoringWeights,
  HospitalSuitabilityResult,
  LocationStatus,
  ProximityScoreOptions,
  ResourceAssessmentStatus,
  ResourceCompatibilityDetail,
  SuitabilityTier,
  TravelTimeOptions,
} from './allocation.types.js';

// ─── Centralized Constants & Heuristic Defaults ────────────────────────────────

/** Earth's mean spherical radius in kilometres (WGS-84 approximation). */
export const EARTH_RADIUS_KM = 6371;

/**
 * Default travel time calculation options.
 *
 * IMPORTANT: Travel time calculated with these parameters is an empirical heuristic
 * approximation (great-circle * road factor / speed + turnout buffer). It is NOT
 * a live road-routing navigation ETA and must never be represented as such.
 */
export const DEFAULT_TRAVEL_TIME_OPTIONS: Readonly<TravelTimeOptions> =
  Object.freeze({
    averageSpeedKmh: 35.0,
    roadDistanceFactor: 1.35,
    dispatchBufferMinutes: 2.0,
  });

/**
 * Default proximity scoring options.
 */
export const DEFAULT_PROXIMITY_OPTIONS: Readonly<ProximityScoreOptions> =
  Object.freeze({
    maxRangeKm: 30.0,
  });

/**
 * Default heuristic weights for ambulance evaluation.
 * NOTE: These weights are heuristic defaults and have NOT been clinically validated.
 * They are configurable and require operational calibration by emergency medical directors.
 */
export const DEFAULT_AMBULANCE_WEIGHTS: Readonly<AmbulanceScoringWeights> =
  Object.freeze({
    proximity: 0.55,
    capability: 0.35,
    readiness: 0.1,
  });

/**
 * Default heuristic weights for hospital evaluation.
 * NOTE: These weights are heuristic defaults and have NOT been clinically validated.
 * They are configurable and require operational calibration by emergency medical directors.
 */
export const DEFAULT_HOSPITAL_WEIGHTS: Readonly<HospitalScoringWeights> =
  Object.freeze({
    proximity: 0.4,
    operationalStatus: 0.25,
    resources: 0.25,
    capability: 0.1,
  });

/**
 * Clinical governance disclaimer appended to hospital evaluations.
 */
export const HOSPITAL_ACCEPTANCE_DISCLAIMER =
  'Hospital resource availability indicates reported capacity but does not constitute clinical triage acceptance or an intake guarantee by the facility.';

/**
 * Policy notice appended to unvalidated provisional allocations.
 */
export const PROVISIONAL_POLICY_NOTICE =
  'Allocation score and capability compatibility are evaluated under provisional heuristic policies that have NOT been validated by qualified emergency medical direction. Dispatcher review is required.';

/**
 * Default provisional ambulance capability policy.
 * Marked explicitly as isClinicallyValidated: false to enforce dispatcher review.
 */
export const DEFAULT_PROVISIONAL_AMBULANCE_POLICY: Readonly<AmbulanceCapabilityPolicy> =
  Object.freeze({
    policyName: 'Provisional Heuristic Ambulance Capability Policy',
    policyVersion: '0.1.0-provisional',
    isClinicallyValidated: false,
    rules: [
      {
        ambulanceType: AmbulanceType.ALS,
        priority: CasePriority.CRITICAL,
        score: 100,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: ALS assigned score 100 for CRITICAL priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.ALS,
        priority: CasePriority.HIGH,
        score: 100,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: ALS assigned score 100 for HIGH priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.ALS,
        priority: CasePriority.MEDIUM,
        score: 80,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: ALS assigned score 80 for MEDIUM priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.ALS,
        priority: CasePriority.LOW,
        score: 70,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: ALS assigned score 70 for LOW priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.BLS,
        priority: CasePriority.CRITICAL,
        score: 40,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: BLS assigned score 40 for CRITICAL priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.BLS,
        priority: CasePriority.HIGH,
        score: 75,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: BLS assigned score 75 for HIGH priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.BLS,
        priority: CasePriority.MEDIUM,
        score: 100,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: BLS assigned score 100 for MEDIUM priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.BLS,
        priority: CasePriority.LOW,
        score: 100,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: BLS assigned score 100 for LOW priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.PATIENT_TRANSPORT,
        priority: CasePriority.CRITICAL,
        score: 10,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: PATIENT_TRANSPORT assigned score 10 for CRITICAL priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.PATIENT_TRANSPORT,
        priority: CasePriority.HIGH,
        score: 25,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: PATIENT_TRANSPORT assigned score 25 for HIGH priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.PATIENT_TRANSPORT,
        priority: CasePriority.MEDIUM,
        score: 60,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: PATIENT_TRANSPORT assigned score 60 for MEDIUM priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.PATIENT_TRANSPORT,
        priority: CasePriority.LOW,
        score: 100,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: PATIENT_TRANSPORT assigned score 100 for LOW priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.NEONATAL,
        priority: CasePriority.CRITICAL,
        score: 50,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: NEONATAL assigned score 50 for CRITICAL priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.NEONATAL,
        priority: CasePriority.HIGH,
        score: 50,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: NEONATAL assigned score 50 for HIGH priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.NEONATAL,
        priority: CasePriority.MEDIUM,
        score: 50,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: NEONATAL assigned score 50 for MEDIUM priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.NEONATAL,
        priority: CasePriority.LOW,
        score: 50,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: NEONATAL assigned score 50 for LOW priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.OTHER,
        priority: CasePriority.CRITICAL,
        score: 15,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: OTHER type assigned score 15 for CRITICAL priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.OTHER,
        priority: CasePriority.HIGH,
        score: 25,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: OTHER type assigned score 25 for HIGH priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.OTHER,
        priority: CasePriority.MEDIUM,
        score: 40,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: OTHER type assigned score 40 for MEDIUM priority. Clinical suitability must be confirmed by dispatcher.',
      },
      {
        ambulanceType: AmbulanceType.OTHER,
        priority: CasePriority.LOW,
        score: 50,
        isClinicallyValidated: false,
        notes:
          'Provisional unvalidated scoring rule: OTHER type assigned score 50 for LOW priority. Clinical suitability must be confirmed by dispatcher.',
      },
    ],
  });

// ─── Coordinate & Geographic Functions ─────────────────────────────────────────

/**
 * Validates that coordinate values are finite numbers within valid geographic ranges:
 * Latitude: [-90, 90], Longitude: [-180, 180].
 *
 * @throws {RangeError} if coordinates are non-finite or outside geographic boundaries.
 */
export function validateCoordinates(
  coords: GeoCoordinates,
  label = 'Coordinates',
): void {
  if (
    typeof coords.latitude !== 'number' ||
    !Number.isFinite(coords.latitude) ||
    coords.latitude < -90 ||
    coords.latitude > 90
  ) {
    throw new RangeError(
      `${label}: latitude must be a finite number between -90 and 90 (received: ${coords.latitude})`,
    );
  }

  if (
    typeof coords.longitude !== 'number' ||
    !Number.isFinite(coords.longitude) ||
    coords.longitude < -180 ||
    coords.longitude > 180
  ) {
    throw new RangeError(
      `${label}: longitude must be a finite number between -180 and 180 (received: ${coords.longitude})`,
    );
  }
}

/**
 * Checks whether coordinates are valid without throwing, returning boolean.
 */
export function areCoordinatesValid(coords?: {
  latitude?: number | null;
  longitude?: number | null;
}): coords is GeoCoordinates {
  if (!coords) return false;
  if (
    typeof coords.latitude !== 'number' ||
    !Number.isFinite(coords.latitude) ||
    coords.latitude < -90 ||
    coords.latitude > 90
  ) {
    return false;
  }
  if (
    typeof coords.longitude !== 'number' ||
    !Number.isFinite(coords.longitude) ||
    coords.longitude < -180 ||
    coords.longitude > 180
  ) {
    return false;
  }
  return true;
}

/**
 * Calculates great-circle distance between two geographic points using the Haversine formula.
 *
 * Returns distance in kilometres rounded to 3 decimal places (meter precision).
 * Identical coordinates return 0.0.
 *
 * @throws {RangeError} if either coordinate pair contains invalid or non-finite values.
 */
export function calculateHaversineDistanceKm(
  from: GeoCoordinates,
  to: GeoCoordinates,
): number {
  validateCoordinates(from, 'Origin coordinates');
  validateCoordinates(to, 'Destination coordinates');

  if (from.latitude === to.latitude && from.longitude === to.longitude) {
    return 0.0;
  }

  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const deltaLat = toRad(to.latitude - from.latitude);
  const deltaLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  const distance = EARTH_RADIUS_KM * c;

  if (!Number.isFinite(distance)) {
    throw new RangeError(
      `Haversine calculation produced a non-finite result (${distance}). Inputs: from=[${from.latitude},${from.longitude}] to=[${to.latitude},${to.longitude}]`,
    );
  }

  return Math.round(distance * 1000) / 1000;
}

/**
 * Estimates travel time in minutes based on distance, road network tortuosity,
 * assumed average speed, and dispatch turnout latency.
 *
 * DISCLAIMER: This is an empirical estimation heuristic, NOT an actual navigation ETA.
 */
export function estimateTravelTimeMinutes(
  distanceKm: number,
  options?: Partial<TravelTimeOptions>,
): number {
  if (
    typeof distanceKm !== 'number' ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0
  ) {
    throw new RangeError(
      `distanceKm must be a non-negative finite number (received: ${distanceKm})`,
    );
  }

  const opts: TravelTimeOptions = {
    ...DEFAULT_TRAVEL_TIME_OPTIONS,
    ...options,
  };

  if (opts.averageSpeedKmh <= 0 || !Number.isFinite(opts.averageSpeedKmh)) {
    throw new RangeError(
      `averageSpeedKmh must be a positive finite number (received: ${opts.averageSpeedKmh})`,
    );
  }
  if (
    opts.roadDistanceFactor < 1.0 ||
    !Number.isFinite(opts.roadDistanceFactor)
  ) {
    throw new RangeError(
      `roadDistanceFactor must be >= 1.0 (received: ${opts.roadDistanceFactor})`,
    );
  }
  if (
    opts.dispatchBufferMinutes < 0 ||
    !Number.isFinite(opts.dispatchBufferMinutes)
  ) {
    throw new RangeError(
      `dispatchBufferMinutes must be a non-negative number (received: ${opts.dispatchBufferMinutes})`,
    );
  }

  if (distanceKm === 0) {
    const roundedBuffer = Math.round(opts.dispatchBufferMinutes * 10) / 10;
    if (!Number.isFinite(roundedBuffer)) {
      throw new RangeError(
        `Dispatch buffer rounding overflowed to a non-finite value (${roundedBuffer}). Received dispatchBufferMinutes=${opts.dispatchBufferMinutes}`,
      );
    }
    return roundedBuffer;
  }

  const effectiveRoadDistanceKm = distanceKm * opts.roadDistanceFactor;
  const transitMinutes = (effectiveRoadDistanceKm / opts.averageSpeedKmh) * 60;
  const totalMinutes = transitMinutes + opts.dispatchBufferMinutes;

  if (!Number.isFinite(totalMinutes)) {
    throw new RangeError(
      `Travel time calculation overflowed to a non-finite value (${totalMinutes}). Parameters: distanceKm=${distanceKm}, roadDistanceFactor=${opts.roadDistanceFactor}, averageSpeedKmh=${opts.averageSpeedKmh}, dispatchBufferMinutes=${opts.dispatchBufferMinutes}`,
    );
  }

  const roundedMinutes = Math.round(totalMinutes * 10) / 10;
  if (!Number.isFinite(roundedMinutes)) {
    throw new RangeError(
      `Travel time rounding overflowed to a non-finite value (${roundedMinutes}). Calculated totalMinutes=${totalMinutes}`,
    );
  }

  return roundedMinutes;
}

/**
 * Calculates a normalized proximity score from 0 to 100.
 * A distance of 0 yields 100; distances >= maxRangeKm yield 0.
 */
export function calculateProximityScore(
  distanceKm: number,
  options?: Partial<ProximityScoreOptions>,
): number {
  if (
    typeof distanceKm !== 'number' ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0
  ) {
    throw new RangeError(
      `distanceKm must be a non-negative finite number (received: ${distanceKm})`,
    );
  }

  const maxRange = options?.maxRangeKm ?? DEFAULT_PROXIMITY_OPTIONS.maxRangeKm;
  if (maxRange <= 0 || !Number.isFinite(maxRange)) {
    throw new RangeError(
      `maxRangeKm must be a positive finite number (received: ${maxRange})`,
    );
  }

  if (distanceKm >= maxRange) {
    return 0.0;
  }

  const score = 100 * (1 - distanceKm / maxRange);
  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
}

// ─── Weight Normalization Helper ───────────────────────────────────────────────

/**
 * Normalizes heuristic weights to sum to 1.0.
 * Validates that all weights are non-negative finite numbers and their sum is > 0.
 *
 * @throws {RangeError} if any weight is negative, non-finite, or sum is <= 0.
 */
export function normalizeWeights<T extends Record<string, number>>(
  weights: T,
): T {
  const keys = Object.keys(weights) as (keyof T)[];
  let sum = 0;
  for (const k of keys) {
    const val = Number(weights[k]);
    if (!Number.isFinite(val) || val < 0) {
      throw new RangeError(
        `Weight '${String(k)}' must be a non-negative finite number`,
      );
    }
    sum += val;
  }

  if (sum === 0) {
    throw new RangeError('Total sum of weights must be greater than zero');
  }

  if (!Number.isFinite(sum)) {
    throw new RangeError('Total sum of weights must be a finite number');
  }

  const normalized = {} as T;
  for (const k of keys) {
    normalized[k] = (weights[k] / sum) as T[keyof T];
  }
  return normalized;
}

// ─── Ambulance Suitability Evaluation ──────────────────────────────────────────

/**
 * Evaluates ambulance capability using an injectable capability policy.
 * When the policy or rule is provisional (not clinically validated), flags requiresReview.
 */
export function evaluateAmbulanceCapability(
  ambulanceType: AmbulanceType,
  priority: CasePriority,
  policy: AmbulanceCapabilityPolicy = DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
): {
  capabilityScore: number;
  reasons: string[];
  requiresReview: boolean;
  reviewReason?: string;
} {
  const rule = policy.rules.find(
    (r) => r.ambulanceType === ambulanceType && r.priority === priority,
  );

  if (!rule) {
    return {
      capabilityScore: 20,
      reasons: [
        `No configured capability rule for ambulance type '${ambulanceType}' with priority '${priority}'.`,
      ],
      requiresReview: true,
      reviewReason: `NO_CAPABILITY_RULE: Clinical compatibility of '${ambulanceType}' for priority '${priority}' is undefined in policy '${policy.policyName}'. Dispatcher review required.`,
    };
  }

  const reasons = [rule.notes];
  const isClinicallyApproved =
    policy.isClinicallyValidated && rule.isClinicallyValidated;

  if (!isClinicallyApproved) {
    const reviewReason = `PROVISIONAL_CAPABILITY: Ambulance capability compatibility is evaluated under provisional policy '${policy.policyName}' (unvalidated by medical direction). Dispatcher review required.`;
    return {
      capabilityScore: rule.score,
      reasons,
      requiresReview: true,
      reviewReason,
    };
  }

  return {
    capabilityScore: rule.score,
    reasons,
    requiresReview: false,
  };
}

/**
 * Pure evaluation function assessing a single ambulance candidate against an emergency context.
 *
 * Evaluation States:
 * - DISQUALIFIED: isAvailable is false, or status is not AVAILABLE.
 * - REQUIRES_REVIEW: missing or invalid GPS coordinates, or unvalidated clinical capability.
 * - ELIGIBLE: passes operational checks, has verified coordinates, and validated capability policy.
 */
export function evaluateAmbulanceCandidate(
  ambulance: AmbulanceCandidateInput,
  context: EmergencyContextInput,
  policy: AmbulanceCapabilityPolicy = DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
  weights?: Partial<AmbulanceScoringWeights>,
  travelTimeOpts?: Partial<TravelTimeOptions>,
  proximityOpts?: Partial<ProximityScoreOptions>,
): AmbulanceSuitabilityResult {
  // Validate emergency incident coordinates strictly (fail fast on bad incident data)
  validateCoordinates(
    {
      latitude: context.incidentLatitude,
      longitude: context.incidentLongitude,
    },
    'Incident coordinates',
  );

  const normWeights = normalizeWeights({
    ...DEFAULT_AMBULANCE_WEIGHTS,
    ...weights,
  });

  const disqualificationReasons: string[] = [];
  const reviewReasons: string[] = [];
  const reasons: string[] = [];

  // 1. Hard Operational Eligibility Checks
  if (!ambulance.isAvailable) {
    disqualificationReasons.push(
      'Ambulance is marked unavailable (isAvailable: false).',
    );
  }

  if (ambulance.status !== AmbulanceStatus.AVAILABLE) {
    disqualificationReasons.push(
      `Ambulance status is '${ambulance.status}'; only AVAILABLE units can be dispatched.`,
    );
  }

  // 2. Ambulance Location & Proximity Evaluation
  let locationStatus: LocationStatus = 'VERIFIED';
  let distanceKm: number | null = null;
  let estimatedTravelTimeMinutes: number | null = null;
  let proximityScore = 0;

  if (ambulance.currentLatitude == null || ambulance.currentLongitude == null) {
    locationStatus = 'UNKNOWN_LOCATION';
    proximityScore = 0;
    reviewReasons.push(
      'UNKNOWN_LOCATION: Ambulance GPS coordinates are missing; proximity and transit time cannot be computed. Vehicle position must be verified before dispatch.',
    );
    reasons.push(
      'Location Status: UNKNOWN_LOCATION (GPS coordinates missing).',
    );
  } else if (
    !areCoordinatesValid({
      latitude: ambulance.currentLatitude,
      longitude: ambulance.currentLongitude,
    })
  ) {
    locationStatus = 'INVALID_LOCATION';
    proximityScore = 0;
    reviewReasons.push(
      `INVALID_LOCATION: Ambulance GPS coordinates [${ambulance.currentLatitude}, ${ambulance.currentLongitude}] are invalid. Dispatcher must verify vehicle position.`,
    );
    reasons.push(
      'Location Status: INVALID_LOCATION (GPS coordinates outside valid range).',
    );
  } else {
    locationStatus = 'VERIFIED';
    const from: GeoCoordinates = {
      latitude: ambulance.currentLatitude,
      longitude: ambulance.currentLongitude,
    };
    const to: GeoCoordinates = {
      latitude: context.incidentLatitude,
      longitude: context.incidentLongitude,
    };

    distanceKm = calculateHaversineDistanceKm(from, to);
    estimatedTravelTimeMinutes = estimateTravelTimeMinutes(
      distanceKm,
      travelTimeOpts,
    );
    proximityScore = calculateProximityScore(distanceKm, proximityOpts);

    reasons.push(
      `Great-circle distance: ~${distanceKm} km (estimated travel time: ~${estimatedTravelTimeMinutes} mins approximation).`,
    );
  }

  // 3. Clinical Capability Evaluation
  const capabilityResult = evaluateAmbulanceCapability(
    ambulance.type,
    context.priority,
    policy,
  );
  reasons.push(...capabilityResult.reasons);
  if (capabilityResult.requiresReview && capabilityResult.reviewReason) {
    reviewReasons.push(capabilityResult.reviewReason);
  }

  // 4. Vehicle Readiness Evaluation
  const readinessScore = ambulance.baseHospitalId ? 100 : 90;

  // 5. Evaluation State & Tier Assessment
  let evaluationState: EvaluationState;
  let overallScore = 0;
  let tier: SuitabilityTier;

  if (disqualificationReasons.length > 0) {
    evaluationState = 'DISQUALIFIED';
    overallScore = 0;
    tier = 'DISQUALIFIED';
    reasons.push(...disqualificationReasons.map((r) => `DISQUALIFIED: ${r}`));
  } else if (reviewReasons.length > 0) {
    evaluationState = 'REQUIRES_REVIEW';
    const rawScore =
      proximityScore * normWeights.proximity +
      capabilityResult.capabilityScore * normWeights.capability +
      readinessScore * normWeights.readiness;

    overallScore = Math.round(Math.max(0, Math.min(100, rawScore)) * 10) / 10;
    if (
      capabilityResult.capabilityScore < 50 ||
      locationStatus !== 'VERIFIED'
    ) {
      tier = 'SUBOPTIMAL';
      reasons.push(
        'Tier capped at SUBOPTIMAL due to capability deficit or unverified location.',
      );
    } else {
      tier = overallScore >= 50 ? 'SUITABLE' : 'SUBOPTIMAL';
    }
    reasons.push(...reviewReasons.map((r) => `REQUIRES_REVIEW: ${r}`));
  } else {
    evaluationState = 'ELIGIBLE';
    const rawScore =
      proximityScore * normWeights.proximity +
      capabilityResult.capabilityScore * normWeights.capability +
      readinessScore * normWeights.readiness;

    overallScore = Math.round(Math.max(0, Math.min(100, rawScore)) * 10) / 10;
    if (overallScore >= 80) {
      tier = 'OPTIMAL';
    } else if (overallScore >= 50) {
      tier = 'SUITABLE';
    } else {
      tier = 'SUBOPTIMAL';
    }
  }

  return {
    candidateId: ambulance.id,
    callSign: ambulance.callSign,
    registrationNumber: ambulance.registrationNumber,
    type: ambulance.type,
    evaluationState,
    isEligible: evaluationState === 'ELIGIBLE',
    requiresDispatcherReview: evaluationState === 'REQUIRES_REVIEW',
    disqualificationReasons,
    reviewReasons,
    distanceKm,
    estimatedTravelTimeMinutes,
    locationStatus,
    hasUnknownLocation: locationStatus !== 'VERIFIED',
    score: overallScore,
    factors: {
      proximityScore,
      capabilityScore: capabilityResult.capabilityScore,
      readinessScore,
    },
    tier,
    reasons,
    policyNotice: PROVISIONAL_POLICY_NOTICE,
  };
}

// ─── Hospital Suitability Evaluation ───────────────────────────────────────────

/**
 * Evaluates facility operational status.
 * CLOSED and DIVERTING hospitals are hard-disqualified from ordinary dispatch.
 * BUSY status incurs an operational penalty.
 */
export function evaluateHospitalStatus(status: HospitalStatus): {
  operationalStatusScore: number;
  isEligible: boolean;
  disqualificationReason?: string;
  reason: string;
} {
  switch (status) {
    case HospitalStatus.OPERATIONAL:
      return {
        operationalStatusScore: 100,
        isEligible: true,
        reason:
          'Hospital operational status is OPERATIONAL with active emergency intake.',
      };
    case HospitalStatus.BUSY:
      return {
        operationalStatusScore: 50,
        isEligible: true,
        reason:
          'Hospital status is BUSY; intake delays and triage queuing are expected.',
      };
    case HospitalStatus.DIVERTING:
      return {
        operationalStatusScore: 10,
        isEligible: false,
        disqualificationReason:
          'Hospital is currently DIVERTING ambulances; general intake redirected.',
        reason:
          'Hospital is on DIVERTING status; not an eligible ordinary destination.',
      };
    case HospitalStatus.CLOSED:
      return {
        operationalStatusScore: 0,
        isEligible: false,
        disqualificationReason: 'Hospital is CLOSED.',
        reason: 'Hospital is CLOSED and cannot accept patients.',
      };
  }
}

/**
 * Evaluates hospital resource availability without invented assumptions.
 *
 * Rules:
 * - Only explicitly specified required resources are checked.
 * - If requiredResources is undefined/empty, reports NOT_SPECIFIED and applies a neutral score.
 * - Only inventory records for explicitly required resources affect evaluation and review.
 * - AVAILABLE with positive, valid availableQuantity: confirmed reported availability.
 * - LOW_STOCK (by status flag): requires dispatcher review; never confirmed available.
 * - UNAVAILABLE or MAINTENANCE: hard resource incompatibility for required resources.
 * - availableQuantity <= 0 for a required resource: hard disqualification.
 * - Negative, non-finite, or contradictory (availableQuantity > quantity) required inventory: REQUIRES_REVIEW.
 * - Missing required resource record: unconfirmed; triggers review requirement.
 * - Duplicate records for a required resource: excluded from map; triggers review requirement.
 */
export function evaluateHospitalResources(
  resources: HospitalResourceSnapshot[] | undefined,
  requiredResources: ResourceType[] | undefined,
): {
  resourceScore: number;
  resourceAssessmentStatus: ResourceAssessmentStatus;
  details: ResourceCompatibilityDetail[];
  disqualificationReasons: string[];
  reviewReasons: string[];
  reasons: string[];
} {
  // ── Step 0: No required resources specified ──────────────────────────────────
  if (!requiredResources || requiredResources.length === 0) {
    return {
      resourceScore: 50.0,
      resourceAssessmentStatus: 'NOT_SPECIFIED',
      details: [],
      disqualificationReasons: [],
      reviewReasons: [],
      reasons: [
        'Clinical resource requirements were NOT_SPECIFIED for this emergency. Hospital capacity has not been checked against specific clinical needs.',
      ],
    };
  }

  // Deduplicate required resources before evaluation and scoring
  const uniqueRequiredResources = [...new Set(requiredResources)];
  const requiredSet = new Set(uniqueRequiredResources);

  // ── Step 1: Detect duplicate & invalid inventory for required resources ───────
  const seenTypes = new Set<ResourceType>();
  const duplicateTypes = new Set<ResourceType>();
  const invalidTypes = new Set<ResourceType>();
  const resourceMap = new Map<ResourceType, HospitalResourceSnapshot>();
  const buildReviewReasons: string[] = [];

  // Pass 1: Duplicate detection using seenTypes before validating individual records.
  // Only records for required resource types are considered.
  if (resources) {
    for (const r of resources) {
      if (!requiredSet.has(r.type)) {
        continue;
      }
      if (seenTypes.has(r.type)) {
        duplicateTypes.add(r.type);
      } else {
        seenTypes.add(r.type);
      }
    }
  }

  // Record review reasons for duplicate required resource types
  for (const dup of duplicateTypes) {
    buildReviewReasons.push(
      `INVALID_RESOURCE_DATA: Duplicate inventory records found for required resource type '${dup}'. No record is authoritative; dispatcher must verify.`,
    );
  }

  // Pass 2: Validate numeric fields and populate resourceMap for non-duplicate required resources.
  if (resources) {
    for (const r of resources) {
      if (!requiredSet.has(r.type) || duplicateTypes.has(r.type)) {
        continue;
      }

      // Validate numeric fields: must be non-negative finite numbers
      if (
        !Number.isFinite(r.quantity) ||
        r.quantity < 0 ||
        !Number.isFinite(r.availableQuantity) ||
        r.availableQuantity < 0
      ) {
        invalidTypes.add(r.type);
        buildReviewReasons.push(
          `INVALID_RESOURCE_DATA: Inventory numbers for required resource '${r.type}' are invalid (quantity=${r.quantity}, availableQuantity=${r.availableQuantity}). Record excluded from evaluation.`,
        );
        continue;
      }

      // availableQuantity must not exceed total quantity
      if (r.availableQuantity > r.quantity) {
        invalidTypes.add(r.type);
        buildReviewReasons.push(
          `INVALID_RESOURCE_DATA: availableQuantity (${r.availableQuantity}) exceeds total quantity (${r.quantity}) for required resource '${r.type}'. Record excluded from evaluation.`,
        );
        continue;
      }

      resourceMap.set(r.type, r);
    }
  }

  // ── Step 2: Evaluate each required resource ──────────────────────────────────
  const details: ResourceCompatibilityDetail[] = [];
  const disqualificationReasons: string[] = [];
  const reviewReasons: string[] = [...buildReviewReasons];
  const reasons: string[] = [];

  let confirmedCount = 0;
  let lowStockCount = 0;
  let unconfirmedCount = 0;

  for (const type of uniqueRequiredResources) {
    // 1. Duplicate required resource records
    if (duplicateTypes.has(type)) {
      unconfirmedCount++;
      details.push({
        type,
        isRequired: true,
        isConfirmedAvailable: false,
        status: 'NOT_REPORTED',
        availableQuantity: 0,
        totalQuantity: 0,
        assessment: 'NOT_REPORTED',
        notes: `Required resource '${type}' has duplicate inventory records; availability cannot be confirmed.`,
      });
      continue;
    }

    // 2. Invalid numeric data in required resource record
    if (invalidTypes.has(type)) {
      unconfirmedCount++;
      details.push({
        type,
        isRequired: true,
        isConfirmedAvailable: false,
        status: 'NOT_REPORTED',
        availableQuantity: 0,
        totalQuantity: 0,
        assessment: 'NOT_REPORTED',
        notes: `Required resource '${type}' has invalid inventory data; availability cannot be confirmed.`,
      });
      continue;
    }

    const snap = resourceMap.get(type);

    // 3. Missing required resource record
    if (!snap) {
      unconfirmedCount++;
      details.push({
        type,
        isRequired: true,
        isConfirmedAvailable: false,
        status: 'NOT_REPORTED',
        availableQuantity: 0,
        totalQuantity: 0,
        assessment: 'NOT_REPORTED',
        notes: `Required resource '${type}' is NOT REPORTED in hospital inventory. Unreported inventory cannot be assumed available.`,
      });
      reviewReasons.push(
        `UNCONFIRMED_RESOURCE: Required resource '${type}' is not reported in hospital inventory; availability cannot be verified.`,
      );
      continue;
    }

    // 4. Hard incompatibility: bad operational status (MAINTENANCE or UNAVAILABLE)
    if (
      snap.status === ResourceStatus.MAINTENANCE ||
      snap.status === ResourceStatus.UNAVAILABLE
    ) {
      details.push({
        type,
        isRequired: true,
        isConfirmedAvailable: false,
        status: snap.status,
        availableQuantity: snap.availableQuantity,
        totalQuantity: snap.quantity,
        assessment: 'INCOMPATIBLE_STATUS',
        notes: `Required resource '${type}' is currently in status '${snap.status}'.`,
      });
      disqualificationReasons.push(
        `INCOMPATIBLE_RESOURCE: Required resource '${type}' is in status '${snap.status}'.`,
      );
      continue;
    }

    // 5. Hard incompatibility: zero available quantity for a required resource
    if (snap.availableQuantity <= 0) {
      details.push({
        type,
        isRequired: true,
        isConfirmedAvailable: false,
        status: snap.status,
        availableQuantity: snap.availableQuantity,
        totalQuantity: snap.quantity,
        assessment: 'DEPLETED',
        notes: `Required resource '${type}' has 0 available capacity (0/${snap.quantity}).`,
      });
      disqualificationReasons.push(
        `DEPLETED_RESOURCE: Required resource '${type}' has 0 available capacity (0/${snap.quantity}).`,
      );
      continue;
    }

    // 6. LOW_STOCK by explicit status flag → review (never confirmed available)
    if (snap.status === ResourceStatus.LOW_STOCK) {
      lowStockCount++;
      details.push({
        type,
        isRequired: true,
        isConfirmedAvailable: false,
        status: snap.status,
        availableQuantity: snap.availableQuantity,
        totalQuantity: snap.quantity,
        assessment: 'LOW_STOCK',
        notes: `Required resource '${type}' is at LOW_STOCK (${snap.availableQuantity}/${snap.quantity} remaining).`,
      });
      reviewReasons.push(
        `LOW_STOCK: Required resource '${type}' is at LOW_STOCK (${snap.availableQuantity}/${snap.quantity}); availability must be verified with facility intake before transfer.`,
      );
      continue;
    }

    // 7. AVAILABLE with positive available quantity → confirmed
    confirmedCount++;
    details.push({
      type,
      isRequired: true,
      isConfirmedAvailable: true,
      status: snap.status,
      availableQuantity: snap.availableQuantity,
      totalQuantity: snap.quantity,
      assessment: 'CONFIRMED',
      notes: `Required resource '${type}' confirmed available (${snap.availableQuantity}/${snap.quantity}).`,
    });
  }

  // ── Step 3: Compute overall resource score and status ────────────────────────
  // Precedence: INCOMPATIBLE > UNCONFIRMED_MISSING > LOW_STOCK_WARNING > CONFIRMED
  let resourceAssessmentStatus: ResourceAssessmentStatus;
  let resourceScore: number;

  const denominator = uniqueRequiredResources.length;

  if (disqualificationReasons.length > 0) {
    resourceAssessmentStatus = 'INCOMPATIBLE';
    resourceScore = 0.0;
    reasons.push(
      ...disqualificationReasons.map((r) => `Resource Failure: ${r}`),
    );
  } else if (unconfirmedCount > 0) {
    resourceAssessmentStatus = 'UNCONFIRMED_MISSING';
    const effectiveAvailable = confirmedCount + lowStockCount * 0.5;
    resourceScore =
      Math.round((effectiveAvailable / denominator) * 100 * 10) / 10;
    reasons.push(...reviewReasons.map((r) => `Resource Warning: ${r}`));
  } else if (lowStockCount > 0) {
    resourceAssessmentStatus = 'LOW_STOCK_WARNING';
    const effectiveAvailable = confirmedCount + lowStockCount * 0.5;
    resourceScore =
      Math.round((effectiveAvailable / denominator) * 100 * 10) / 10;
    reasons.push(...reviewReasons.map((r) => `Resource Warning: ${r}`));
  } else {
    resourceAssessmentStatus = 'CONFIRMED';
    resourceScore = 100.0;
    reasons.push(
      `All ${denominator} required clinical resources confirmed available in reported inventory.`,
    );
  }

  return {
    resourceScore,
    resourceAssessmentStatus,
    details,
    disqualificationReasons,
    reviewReasons,
    reasons,
  };
}

/**
 * Evaluates specialty capability alignment conservatively.
 * Substring matches against freeform text provide an UNVERIFIED indication only;
 * requested capabilities always require dispatcher confirmation.
 */
export function evaluateHospitalCapability(
  capabilityString: string | null | undefined,
  requiredCapabilities?: string[],
): {
  capabilityScore: number;
  reasons: string[];
  requiresReview: boolean;
  reviewReasons: string[];
} {
  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return {
      capabilityScore: 80.0,
      reasons: [
        'No specialized hospital capabilities requested for this case context.',
      ],
      requiresReview: false,
      reviewReasons: [],
    };
  }

  const normalizedText = (capabilityString ?? '').toUpperCase();
  const matchedHints: string[] = [];
  const missingHints: string[] = [];
  const reviewReasons: string[] = [];

  for (const cap of requiredCapabilities) {
    const term = cap.trim().toUpperCase();
    if (term.length > 0 && normalizedText.includes(term)) {
      matchedHints.push(term);
    } else {
      missingHints.push(term);
    }
    reviewReasons.push(
      `UNVERIFIED_SPECIALTY: Specialty '${cap}' cannot be confirmed from verified structured data. Freeform record ('${capabilityString ?? 'NONE'}') provides an unverified indication only; intake capability must be confirmed.`,
    );
  }

  const scoreRatio = matchedHints.length / requiredCapabilities.length;
  // Score reflects keyword indication (max 70 since unverified, 30 base)
  const capabilityScore = Math.round((30 + scoreRatio * 40) * 10) / 10;
  const reasons: string[] = [];

  if (matchedHints.length > 0) {
    reasons.push(
      `Unverified capability text hints found for: ${matchedHints.join(', ')} (requires clinical confirmation).`,
    );
  }
  if (missingHints.length > 0) {
    reasons.push(
      `No capability text mentions found for requested specialty: ${missingHints.join(', ')}.`,
    );
  }

  return {
    capabilityScore,
    reasons,
    requiresReview: true,
    reviewReasons,
  };
}

/**
 * Pure evaluation function assessing a single hospital candidate against an emergency context.
 *
 * Evaluation States:
 * - DISQUALIFIED: facility CLOSED/DIVERTING, or required resource exhausted/incompatible.
 * - REQUIRES_REVIEW: missing/invalid location, LOW_STOCK required resource, unconfirmed resource record, or unverified specialty capability.
 * - ELIGIBLE: passes operational status, verified location, all required resources confirmed available, and no unverified clinical flags.
 */
export function evaluateHospitalCandidate(
  hospital: HospitalCandidateInput,
  context: EmergencyContextInput,
  weights?: Partial<HospitalScoringWeights>,
  travelTimeOpts?: Partial<TravelTimeOptions>,
  proximityOpts?: Partial<ProximityScoreOptions>,
): HospitalSuitabilityResult {
  // Validate emergency incident coordinates strictly (fail fast on bad incident data)
  validateCoordinates(
    {
      latitude: context.incidentLatitude,
      longitude: context.incidentLongitude,
    },
    'Incident coordinates',
  );

  const normWeights = normalizeWeights({
    ...DEFAULT_HOSPITAL_WEIGHTS,
    ...weights,
  });

  const disqualificationReasons: string[] = [];
  const reviewReasons: string[] = [];
  const reasons: string[] = [];

  // 1. Operational Status Check
  const statusEval = evaluateHospitalStatus(hospital.status);
  reasons.push(statusEval.reason);
  if (!statusEval.isEligible && statusEval.disqualificationReason) {
    disqualificationReasons.push(statusEval.disqualificationReason);
  }

  // 2. Hospital Location & Proximity Evaluation
  let locationStatus: LocationStatus = 'VERIFIED';
  let distanceKm: number | null = null;
  let estimatedTravelTimeMinutes: number | null = null;
  let proximityScore = 0;

  if (hospital.latitude == null || hospital.longitude == null) {
    locationStatus = 'UNKNOWN_LOCATION';
    proximityScore = 0;
    reviewReasons.push(
      'UNKNOWN_LOCATION: Hospital coordinates missing; distance and transit time cannot be computed. Facility location must be verified before dispatch.',
    );
    reasons.push(
      'Location Status: UNKNOWN_LOCATION (hospital coordinates missing).',
    );
  } else if (
    !areCoordinatesValid({
      latitude: hospital.latitude,
      longitude: hospital.longitude,
    })
  ) {
    locationStatus = 'INVALID_LOCATION';
    proximityScore = 0;
    reviewReasons.push(
      `INVALID_LOCATION: Hospital coordinates [${hospital.latitude}, ${hospital.longitude}] are invalid. Facility location must be verified.`,
    );
    reasons.push(
      'Location Status: INVALID_LOCATION (hospital coordinates outside valid range).',
    );
  } else {
    locationStatus = 'VERIFIED';
    const from: GeoCoordinates = {
      latitude: context.incidentLatitude,
      longitude: context.incidentLongitude,
    };
    const to: GeoCoordinates = {
      latitude: hospital.latitude,
      longitude: hospital.longitude,
    };

    distanceKm = calculateHaversineDistanceKm(from, to);
    estimatedTravelTimeMinutes = estimateTravelTimeMinutes(
      distanceKm,
      travelTimeOpts,
    );
    proximityScore = calculateProximityScore(distanceKm, proximityOpts);

    reasons.push(
      `Great-circle distance: ~${distanceKm} km (estimated transit time: ~${estimatedTravelTimeMinutes} mins approximation).`,
    );
  }

  // 3. Resource Availability Check
  const resourceEval = evaluateHospitalResources(
    hospital.resources,
    context.requiredResources,
  );
  reasons.push(...resourceEval.reasons);
  disqualificationReasons.push(...resourceEval.disqualificationReasons);
  reviewReasons.push(...resourceEval.reviewReasons);

  // 4. Clinical Specialty Capability Check
  const capabilityEval = evaluateHospitalCapability(
    hospital.emergencyCapability,
    context.requiredCapabilities,
  );
  reasons.push(...capabilityEval.reasons);
  if (capabilityEval.requiresReview) {
    reviewReasons.push(...capabilityEval.reviewReasons);
  }

  // 5. Evaluation State & Tier Assessment
  let evaluationState: EvaluationState;
  let overallScore = 0;
  let tier: SuitabilityTier;

  if (disqualificationReasons.length > 0) {
    evaluationState = 'DISQUALIFIED';
    overallScore = 0;
    tier = 'DISQUALIFIED';
    reasons.push(...disqualificationReasons.map((r) => `DISQUALIFIED: ${r}`));
  } else if (reviewReasons.length > 0) {
    evaluationState = 'REQUIRES_REVIEW';
    const rawScore =
      proximityScore * normWeights.proximity +
      statusEval.operationalStatusScore * normWeights.operationalStatus +
      resourceEval.resourceScore * normWeights.resources +
      capabilityEval.capabilityScore * normWeights.capability;

    overallScore = Math.round(Math.max(0, Math.min(100, rawScore)) * 10) / 10;
    if (locationStatus !== 'VERIFIED' || resourceEval.resourceScore < 50) {
      tier = 'SUBOPTIMAL';
      reasons.push(
        'Tier capped at SUBOPTIMAL due to resource deficit or unverified location.',
      );
    } else {
      tier = overallScore >= 50 ? 'SUITABLE' : 'SUBOPTIMAL';
    }
    reasons.push(...reviewReasons.map((r) => `REQUIRES_REVIEW: ${r}`));
  } else {
    evaluationState = 'ELIGIBLE';
    const rawScore =
      proximityScore * normWeights.proximity +
      statusEval.operationalStatusScore * normWeights.operationalStatus +
      resourceEval.resourceScore * normWeights.resources +
      capabilityEval.capabilityScore * normWeights.capability;

    overallScore = Math.round(Math.max(0, Math.min(100, rawScore)) * 10) / 10;
    if (overallScore >= 80) {
      tier = 'OPTIMAL';
    } else if (overallScore >= 50) {
      tier = 'SUITABLE';
    } else {
      tier = 'SUBOPTIMAL';
    }
  }

  return {
    hospitalId: hospital.id,
    name: hospital.name,
    code: hospital.code,
    evaluationState,
    isEligible: evaluationState === 'ELIGIBLE',
    requiresDispatcherReview: evaluationState === 'REQUIRES_REVIEW',
    disqualificationReasons,
    reviewReasons,
    distanceKm,
    estimatedTravelTimeMinutes,
    locationStatus,
    score: overallScore,
    factors: {
      proximityScore,
      operationalStatusScore: statusEval.operationalStatusScore,
      resourceScore: resourceEval.resourceScore,
      capabilityScore: capabilityEval.capabilityScore,
    },
    tier,
    reasons,
    resourceAssessmentStatus: resourceEval.resourceAssessmentStatus,
    resourceDetails: resourceEval.details,
    clinicalDisclaimer: HOSPITAL_ACCEPTANCE_DISCLAIMER,
    policyNotice: PROVISIONAL_POLICY_NOTICE,
  };
}

// ─── Ranking Functions ─────────────────────────────────────────────────────────

const STATE_SORT_ORDER: Record<EvaluationState, number> = {
  ELIGIBLE: 1,
  REQUIRES_REVIEW: 2,
  DISQUALIFIED: 3,
};

/**
 * Pure helper function ranking a list of ambulance candidates.
 *
 * Sorting Hierarchy:
 * 1. Evaluation State: ELIGIBLE candidates first, REQUIRES_REVIEW second, DISQUALIFIED last.
 * 2. Score: Higher score first.
 * 3. Distance: Closer distance first (null distance sorted to the end of its state/score group).
 * 4. candidateId ascending: deterministic tie-breaker for otherwise identical candidates.
 */
export function rankAmbulanceCandidates(
  candidates: AmbulanceCandidateInput[],
  context: EmergencyContextInput,
  policy: AmbulanceCapabilityPolicy = DEFAULT_PROVISIONAL_AMBULANCE_POLICY,
  weights?: Partial<AmbulanceScoringWeights>,
  travelTimeOpts?: Partial<TravelTimeOptions>,
  proximityOpts?: Partial<ProximityScoreOptions>,
): AmbulanceSuitabilityResult[] {
  const evaluated = candidates.map((c) =>
    evaluateAmbulanceCandidate(
      c,
      context,
      policy,
      weights,
      travelTimeOpts,
      proximityOpts,
    ),
  );

  return evaluated.sort((a, b) => {
    if (
      STATE_SORT_ORDER[a.evaluationState] !==
      STATE_SORT_ORDER[b.evaluationState]
    ) {
      return (
        STATE_SORT_ORDER[a.evaluationState] -
        STATE_SORT_ORDER[b.evaluationState]
      );
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const distA = a.distanceKm ?? Infinity;
    const distB = b.distanceKm ?? Infinity;
    if (distA !== distB) {
      return distA - distB;
    }
    // Deterministic final tie-breaker: candidateId ascending
    return a.candidateId < b.candidateId
      ? -1
      : a.candidateId > b.candidateId
        ? 1
        : 0;
  });
}

/**
 * Pure helper function ranking a list of hospital candidates.
 *
 * Sorting Hierarchy:
 * 1. Evaluation State: ELIGIBLE candidates first, REQUIRES_REVIEW second, DISQUALIFIED last.
 * 2. Score: Higher score first.
 * 3. Distance: Closer distance first (null distance sorted to the end of its state/score group).
 * 4. hospitalId ascending: deterministic tie-breaker for otherwise identical candidates.
 */
export function rankHospitalCandidates(
  candidates: HospitalCandidateInput[],
  context: EmergencyContextInput,
  weights?: Partial<HospitalScoringWeights>,
  travelTimeOpts?: Partial<TravelTimeOptions>,
  proximityOpts?: Partial<ProximityScoreOptions>,
): HospitalSuitabilityResult[] {
  const evaluated = candidates.map((h) =>
    evaluateHospitalCandidate(
      h,
      context,
      weights,
      travelTimeOpts,
      proximityOpts,
    ),
  );

  return evaluated.sort((a, b) => {
    if (
      STATE_SORT_ORDER[a.evaluationState] !==
      STATE_SORT_ORDER[b.evaluationState]
    ) {
      return (
        STATE_SORT_ORDER[a.evaluationState] -
        STATE_SORT_ORDER[b.evaluationState]
      );
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const distA = a.distanceKm ?? Infinity;
    const distB = b.distanceKm ?? Infinity;
    if (distA !== distB) {
      return distA - distB;
    }
    // Deterministic final tie-breaker: hospitalId ascending
    return a.hospitalId < b.hospitalId
      ? -1
      : a.hospitalId > b.hospitalId
        ? 1
        : 0;
  });
}
