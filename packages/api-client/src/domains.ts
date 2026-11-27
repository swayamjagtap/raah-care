import { apiClient } from './client';

export interface CreateEmergencyPayload {
  incidentLatitude: number;
  incidentLongitude: number;
  incidentAddress?: string;
  symptoms?: string;
  notes?: string;
  priority?: string;
  patientId?: string;
}

export const emergenciesApi = {
  create: (payload: CreateEmergencyPayload) =>
    apiClient<any>('/emergencies', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    }),

  createAnonymous: (payload: CreateEmergencyPayload) =>
    apiClient<any>('/emergencies', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    }),

  getById: (id: string) => apiClient<any>(`/emergencies/${id}`),

  getAll: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<any>(`/emergencies${query}`);
  },

  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient<any>(`/emergencies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  getAmbulanceRecommendations: (id: string) =>
    apiClient<any>(`/emergencies/${id}/ambulance-recommendations`),

  getHospitalRecommendations: (id: string) =>
    apiClient<any>(`/emergencies/${id}/hospital-recommendations`),

  selectDestination: (id: string, hospitalId: string, overrideReason?: string) =>
    apiClient<any>(`/emergencies/${id}/destination`, {
      method: 'PATCH',
      body: JSON.stringify({ hospitalId, overrideReason }),
    }),
};

export const assignmentsApi = {
  create: (emergencyId: string, ambulanceId: string, notes?: string) =>
    apiClient<any>(`/emergencies/${emergencyId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ ambulanceId, notes }),
    }),

  getById: (id: string) => apiClient<any>(`/assignments/${id}`),

  accept: (id: string, notes?: string) =>
    apiClient<any>(`/assignments/${id}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  reject: (id: string, reason: string) =>
    apiClient<any>(`/assignments/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient<any>(`/assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
};

export const handoversApi = {
  initiate: (caseId: string, notes?: string) =>
    apiClient<any>('/handovers', {
      method: 'POST',
      body: JSON.stringify({ caseId, notes }),
    }),

  getActiveForCase: (caseId: string) =>
    apiClient<any>(`/handovers/case/${caseId}/active`),

  complete: (id: string, notes?: string) =>
    apiClient<any>(`/handovers/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  reject: (id: string, reason: string) =>
    apiClient<any>(`/handovers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  cancel: (id: string, reason: string) =>
    apiClient<any>(`/handovers/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export const patientsApi = {
  getMe: () =>
    apiClient<import('@raah/shared-types').PatientMedicalProfile>('/patients/me'),

  updateMe: (payload: import('@raah/shared-types').UpdatePatientMedicalProfilePayload) =>
    apiClient<import('@raah/shared-types').PatientMedicalProfile>('/patients/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export const curaCardApi = {
  getMe: () =>
    apiClient<import('@raah/shared-types').CuraCardDetails>('/cura-card/me'),

  generateToken: () =>
    apiClient<import('@raah/shared-types').GenerateCuraCardTokenResponse>('/cura-card/token', {
      method: 'POST',
    }),

  revokeToken: () =>
    apiClient<{ revoked: boolean; message: string }>('/cura-card/revoke', {
      method: 'POST',
    }),

  resolveToken: (payload: import('@raah/shared-types').ResolveCuraCardPayload) =>
    apiClient<import('@raah/shared-types').ResponderPatientMedicalRecord>('/cura-card/resolve', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
