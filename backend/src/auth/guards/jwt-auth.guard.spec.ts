import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  function createMockContext(headers: Record<string, string> = {}): ExecutionContext {
    return {
      getHandler: () => () => {},
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('@Public() route bypasses authentication when no token provided', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return true;
      return false;
    });
    const context = createMockContext();

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('@Public() route with invalid JWT is still allowed because @Public bypasses auth entirely', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return true;
      return false;
    });
    const context = createMockContext({
      authorization: 'Bearer completely-invalid-token',
    });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('@OptionalAuth() route with no Authorization header allows request through', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === IS_OPTIONAL_AUTH_KEY) return true;
      return false;
    });
    const context = createMockContext({});

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('@OptionalAuth() route with whitespace-only Authorization header allows request through', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === IS_OPTIONAL_AUTH_KEY) return true;
      return false;
    });
    const context = createMockContext({
      authorization: '   ',
    });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('@OptionalAuth() route with valid JWT executes Passport AuthGuard and succeeds', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === IS_OPTIONAL_AUTH_KEY) return true;
      return false;
    });
    const context = createMockContext({
      authorization: 'Bearer valid-jwt-token',
    });

    const superCanActivateSpy = vi.fn().mockReturnValue(true);
    vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate').mockImplementation(superCanActivateSpy);

    const result = guard.canActivate(context);

    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    expect(result).toBe(true);
  });

  it('@OptionalAuth() route with invalid JWT delegates to Passport AuthGuard which rejects (401)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === IS_OPTIONAL_AUTH_KEY) return true;
      return false;
    });
    const context = createMockContext({
      authorization: 'Bearer malformed-token',
    });

    const superCanActivateSpy = vi.fn().mockImplementation(() => {
      throw new UnauthorizedException('Invalid token');
    });
    vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate').mockImplementation(superCanActivateSpy);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
  });

  it('protected route without @Public() executes Passport AuthGuard', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext();

    const superCanActivateSpy = vi.fn().mockReturnValue(false);
    vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate').mockImplementation(superCanActivateSpy);

    const result = guard.canActivate(context);

    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    expect(result).toBe(false);
  });
});
