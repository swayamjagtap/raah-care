import { apiClient } from './client';
import type { AuthenticatedUserProfile } from '@raah/shared-types';

export interface RegisterPatientPayload {
  name: string;
  email?: string;
  phone?: string;
}

export const authApi = {
  /**
   * Retrieves profile of current authenticated user from backend.
   */
  getMe: () => apiClient<AuthenticatedUserProfile>('/auth/me'),

  /**
   * Patient self-registration: links verified Supabase identity with new PATIENT user.
   */
  registerPatient: (payload: RegisterPatientPayload) =>
    apiClient<AuthenticatedUserProfile>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Health check endpoint
   */
  checkHealth: () =>
    apiClient<{ status: string; service: string }>('/health', {
      requiresAuth: false,
    }),
};
