export const UserRole = {
  PATIENT: 'PATIENT',
  CAREGIVER: 'CAREGIVER',
  AMBULANCE_DRIVER: 'AMBULANCE_DRIVER',
  PARAMEDIC: 'PARAMEDIC',
  DISPATCHER: 'DISPATCHER',
  DOCTOR: 'DOCTOR',
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface AuthenticatedUserProfile {
  id: string;
  supabaseId: string | null;
  email: string | null;
  phone: string | null;
  name: string;
  role: UserRole;
  isActive: boolean;
  hospitalId: string | null;
  ambulanceId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
