import {
  AmbulanceStatus,
  AmbulanceType,
  CasePriority,
  HospitalStatus,
  ResourceStatus,
  ResourceType,
} from '../../generated/prisma/enums.js';

/**
 * Explicit recommendation evaluation states separating ordinary eligibility
 * from unverified clinical suitability and hard operational disqualification.
 */
export type EvaluationState = 'ELIGIBLE' | 'REQUIRES_REVIEW' | 'DISQUALIFIED';

/**
 * Location coordinate verification status.
 */
export type LocationStatus =
  'VERIFIED' | 'UNKNOWN_LOCATION' | 'INVALID_LOCATION';

/**
 * Status of clinical resource evaluation for a hospital.
 */
export type ResourceAssessmentStatus =
  | 'CONFIRMED'
  | 'LOW_STOCK_WARNING'
  | 'UNCONFIRMED_MISSING'
  | 'INCOMPATIBLE'
  | 'NOT_SPECIFIED';

/**
 * Suitability tiers reflecting overall match quality.
 */
export type SuitabilityTier =
  'OPTIMAL' | 'SUITABLE' | 'SUBOPTIMAL' | 'DISQUALIFIED';

/**
 * Geographic coordinate pair representing a latitude/longitude point.
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Configurable parameters for travel time estimation.
 *
 * NOTE: Travel time generated using these options is an empirical heuristic
 * approximation based on adjusted great-circle distance and an average speed.
 * It is NOT live road-routing navigation ETA and must never be represented as such.
 */
export interface TravelTimeOptions {
  /** Average travel speed in km/h (default: 35) */
  averageSpeedKmh: number;
  /** Road network tortuosity factor to approximate actual street distance (default: 1.35) */
  roadDistanceFactor: number;
  /** Fixed dispatch turnout and preparation buffer in minutes (default: 2.0) */
  dispatchBufferMinutes: number;
}

/**
 * Configurable options for calculating proximity scores.
 */
export interface ProximityScoreOptions {
  /** Maximum distance in km beyond which proximity score is 0 (default: 30.0) */
  maxRangeKm: number;
}

/**
 * A single capability matching rule mapping ambulance type to emergency priority.
 */
export interface AmbulanceCapabilityRule {
  ambulanceType: AmbulanceType;
  priority: CasePriority;
  score: number;
  /** Whether this specific rule has been validated by qualified medical direction */
  isClinicallyValidated: boolean;
  notes: string;
}

/**
 * Policy governing ambulance capability matching.
 * Must be explicitly documented as provisional if not clinically validated.
 */
export interface AmbulanceCapabilityPolicy {
  policyName: string;
  policyVersion: string;
  /** Whether the overall policy has been validated by medical direction */
  isClinicallyValidated: boolean;
  rules: AmbulanceCapabilityRule[];
}

/**
 * Configurable weights for ambulance suitability evaluation.
 * Heuristic defaults requiring domain validation; NOT clinically validated.
 */
export interface AmbulanceScoringWeights {
  /** Weight assigned to proximity / travel time (default: 0.55) */
  proximity: number;
  /** Weight assigned to ambulance type & clinical capability compatibility (default: 0.35) */
  capability: number;
  /** Weight assigned to vehicle readiness & operational baseline (default: 0.10) */
  readiness: number;
}

/**
 * Configurable weights for hospital suitability evaluation.
 * Heuristic defaults requiring domain validation; NOT clinically validated.
 */
export interface HospitalScoringWeights {
  /** Weight assigned to proximity / travel time from scene (default: 0.40) */
  proximity: number;
  /** Weight assigned to facility operational status (default: 0.25) */
  operationalStatus: number;
  /** Weight assigned to critical resource availability (default: 0.25) */
  resources: number;
  /** Weight assigned to emergency capability & specialty alignment (default: 0.10) */
  capability: number;
}

/**
 * Candidate ambulance input data for suitability evaluation.
 */
export interface AmbulanceCandidateInput {
  id: string;
  callSign: string;
  registrationNumber: string;
  type: AmbulanceType;
  status: AmbulanceStatus;
  isAvailable: boolean;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  baseHospitalId?: string | null;
}

/**
 * Emergency incident context required for suitability matching.
 */
export interface EmergencyContextInput {
  priority: CasePriority;
  incidentLatitude: number;
  incidentLongitude: number;
  incidentAddress?: string;
  symptoms?: string | null;
  notes?: string | null;
  currentCondition?: string | null;
  /** Explicit clinical resources required by the patient condition */
  requiredResources?: ResourceType[];
  /** Specialty capabilities required (e.g. 'TRAUMA', 'CARDIAC', 'STROKE') */
  requiredCapabilities?: string[];
}

/**
 * Component factor scores for ambulance suitability (normalized 0 - 100).
 */
export interface AmbulanceFactorScores {
  proximityScore: number;
  capabilityScore: number;
  readinessScore: number;
}

/**
 * Evaluated suitability result for a single ambulance candidate.
 */
export interface AmbulanceSuitabilityResult {
  candidateId: string;
  callSign: string;
  registrationNumber: string;
  type: AmbulanceType;
  evaluationState: EvaluationState;
  isEligible: boolean;
  requiresDispatcherReview: boolean;
  disqualificationReasons: string[];
  reviewReasons: string[];
  distanceKm: number | null;
  estimatedTravelTimeMinutes: number | null;
  locationStatus: LocationStatus;
  hasUnknownLocation: boolean;
  score: number;
  factors: AmbulanceFactorScores;
  tier: SuitabilityTier;
  reasons: string[];
  policyNotice: string;
}

/**
 * Snapshot of a single hospital resource inventory record.
 */
export interface HospitalResourceSnapshot {
  type: ResourceType;
  status: ResourceStatus;
  quantity: number;
  availableQuantity: number;
}

/**
 * Candidate hospital input data for suitability evaluation.
 * Note: activeIncomingCases is deferred to future milestones when live queue telemetry is available.
 */
export interface HospitalCandidateInput {
  id: string;
  name: string;
  code: string;
  latitude?: number | null;
  longitude?: number | null;
  status: HospitalStatus;
  emergencyCapability?: string | null;
  resources?: HospitalResourceSnapshot[];
}

/**
 * Component factor scores for hospital suitability (normalized 0 - 100).
 */
export interface HospitalFactorScores {
  proximityScore: number;
  operationalStatusScore: number;
  resourceScore: number;
  capabilityScore: number;
}

/**
 * Resource compatibility assessment for a single resource type.
 */
export interface ResourceCompatibilityDetail {
  type: ResourceType;
  isRequired: boolean;
  isConfirmedAvailable: boolean;
  status: ResourceStatus | 'NOT_REPORTED';
  availableQuantity: number;
  totalQuantity: number;
  assessment:
    | 'CONFIRMED'
    | 'LOW_STOCK'
    | 'DEPLETED'
    | 'INCOMPATIBLE_STATUS'
    | 'NOT_REPORTED';
  notes: string;
}

/**
 * Evaluated suitability result for a single hospital candidate.
 */
export interface HospitalSuitabilityResult {
  hospitalId: string;
  name: string;
  code: string;
  evaluationState: EvaluationState;
  isEligible: boolean;
  requiresDispatcherReview: boolean;
  disqualificationReasons: string[];
  reviewReasons: string[];
  distanceKm: number | null;
  estimatedTravelTimeMinutes: number | null;
  locationStatus: LocationStatus;
  score: number;
  factors: HospitalFactorScores;
  tier: SuitabilityTier;
  reasons: string[];
  resourceAssessmentStatus: ResourceAssessmentStatus;
  resourceDetails: ResourceCompatibilityDetail[];
  clinicalDisclaimer: string;
  policyNotice: string;
}
