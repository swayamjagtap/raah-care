export interface PatientMedicalProfile {
  id: string;
  cardId?: string | null;
  userId: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  phoneNumber?: string | null;
  emergencyContact?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
  currentMedication?: string | null;
  surgicalHistory?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdatePatientMedicalProfilePayload {
  bloodGroup?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
  currentMedication?: string | null;
  surgicalHistory?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
}

export type CuraCardStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING_ACTIVATION';

export interface CuraCardDetails {
  cardId: string;
  patientId: string;
  fullName: string;
  bloodGroup?: string | null;
  allergies?: string | null;
  status: CuraCardStatus;
  hasActiveToken: boolean;
  qrPayload?: string | null;
  expiresAt?: string | null;
  issuedAt?: string | null;
}

export interface GenerateCuraCardTokenResponse {
  cardId: string;
  qrPayload: string;
  expiresAt: string;
  status: 'ACTIVE';
}

export interface ResolveCuraCardPayload {
  token: string;
  caseId?: string;
}

export interface ResponderPatientMedicalRecord {
  patientId: string;
  cardId: string;
  fullName: string;
  bloodGroup: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  currentMedication: string | null;
  emergencyContact: string | null;
  verifiedAt: string;
}
