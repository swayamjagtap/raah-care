import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient, ApiError } from './client';
import { supabase } from './supabase';

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('automatically attaches Bearer token when a Supabase session exists and requiresAuth is true', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-supabase-access-token',
        } as any,
      },
      error: null,
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiClient<{ status: string }>('/health');

    expect(result).toEqual({ status: 'ok' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/health',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );

    const callHeaders: Headers = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders.get('Authorization')).toBe('Bearer mock-supabase-access-token');
  });

  it('omits Bearer token when requiresAuth is false', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-supabase-access-token',
        } as any,
      },
      error: null,
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await apiClient<{ status: string }>('/health', { requiresAuth: false });

    const callHeaders: Headers = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders.get('Authorization')).toBeNull();
  });

  it('throws ApiError with status and message when backend returns an error', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        statusCode: 403,
        message: 'Insufficient permissions',
        error: 'Forbidden',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiClient('/protected')).rejects.toThrow(ApiError);
    await expect(apiClient('/protected')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Insufficient permissions',
      error: 'Forbidden',
    });
  });
});
