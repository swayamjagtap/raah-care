import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseJwtAuthGuard } from './supabase-jwt-auth.guard.js';

describe('SupabaseJwtAuthGuard', () => {
  let guard: SupabaseJwtAuthGuard;
  let jwtService: {
    verifyAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: vi.fn(),
    };
    guard = new SupabaseJwtAuthGuard(jwtService as unknown as JwtService);
  });

  function createMockContext(authHeader?: string, requestTarget: Record<string, any> = {}): ExecutionContext {
    const request = {
      headers: {
        authorization: authHeader,
      },
      ...requestTarget,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('throws UnauthorizedException when authorization header is missing', async () => {
    const ctx = createMockContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Authorization header is missing'),
    );
  });

  it('throws UnauthorizedException when authorization header is not Bearer', async () => {
    const ctx = createMockContext('Basic xyz');
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Invalid or malformed Bearer token'),
    );
  });

  it('throws UnauthorizedException when token verification fails', async () => {
    const ctx = createMockContext('Bearer invalid.jwt.token');
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  it('throws UnauthorizedException when verified payload lacks sub claim', async () => {
    const ctx = createMockContext('Bearer valid.jwt.token');
    jwtService.verifyAsync.mockResolvedValue({ role: 'authenticated' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Token payload is missing sub claim'),
    );
  });

  it('attaches payload to req.jwtPayload and returns true when token is valid', async () => {
    const req: Record<string, any> = {};
    const ctx = createMockContext('Bearer valid.jwt.token', req);
    const mockPayload = { sub: 'supa-sub-123', email: 'test@raah.care' };
    jwtService.verifyAsync.mockResolvedValue(mockPayload);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().jwtPayload).toEqual(mockPayload);
  });
});
