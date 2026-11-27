export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CaseStatus =
  | 'CREATED'
  | 'DISPATCHING'
  | 'AMBULANCE_ASSIGNED'
  | 'AMBULANCE_EN_ROUTE'
  | 'ARRIVED_AT_SCENE'
  | 'PATIENT_ONBOARD'
  | 'HOSPITAL_SELECTED'
  | 'HOSPITAL_NOTIFIED'
  | 'EN_ROUTE_TO_HOSPITAL'
  | 'ARRIVED_AT_HOSPITAL'
  | 'HANDOVER_IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CaseEvent {
  id: string;
  caseId: string;
  eventType: string;
  actorId?: string | null;
  actor?: {
    id: string;
    name: string;
    role: string;
  } | null;
  notes?: string | null;
  payload?: any;
  createdAt: string;
}

export interface AmbulanceAssignment {
  id: string;
  caseId: string;
  ambulanceId: string;
  status: string;
  assignedAt: string;
  ambulance?: {
    id: string;
    registrationNumber: string;
    callSign: string;
    type: string;
    status: string;
    currentLatitude?: number | null;
    currentLongitude?: number | null;
  } | null;
}

export interface DestinationHospital {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string | null;
  emergencyCapability?: string | null;
  status: string;
}

export interface EmergencyCase {
  id: string;
  caseNumber: string;
  priority: CasePriority;
  status: CaseStatus;
  incidentLatitude: number;
  incidentLongitude: number;
  incidentAddress: string;
  symptoms?: string | null;
  notes?: string | null;
  currentCondition?: string | null;
  patientId?: string | null;
  initiatorId?: string | null;
  destinationHospitalId?: string | null;
  destinationHospital?: DestinationHospital | null;
  assignments?: AmbulanceAssignment[];
  events?: CaseEvent[];
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
