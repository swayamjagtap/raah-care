import { supabase } from './supabase';
import type { ApiErrorResponse } from '@raah/shared-types';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:3000/api/v1';

export class ApiError extends Error {
  statusCode: number;
  error?: string;
  details?: string | string[];

  constructor(statusCode: number, message: string | string[], error?: string) {
    super(Array.isArray(message) ? message.join(', ') : message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = message;
    this.error = error;
  }
}

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...customConfig } = options;

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Content-Type') && !(customConfig.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  // Attach Supabase access token if session exists and requiresAuth isn't false
  if (requiresAuth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      requestHeaders.set('Authorization', `Bearer ${session.access_token}`);
    }
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const response = await fetch(url, {
    ...customConfig,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        statusCode: response.status,
        message: response.statusText || 'An unexpected error occurred',
      };
    }
    throw new ApiError(response.status, errorData.message, errorData.error);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
