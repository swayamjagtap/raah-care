import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../generated/prisma/enums.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user?: any): ExecutionContext {
    return {
      getHandler: () => () => {},
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('no @Roles() metadata allows access', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('empty @Roles() metadata allows access', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('user with matching role is allowed', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.DISPATCHER,
      UserRole.SYSTEM_ADMIN,
    ]);
    const context = createMockContext({
      userId: 'u-1',
      role: UserRole.DISPATCHER,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('user with non-matching role is forbidden (403)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.DISPATCHER,
      UserRole.SYSTEM_ADMIN,
    ]);
    const context = createMockContext({
      userId: 'u-1',
      role: UserRole.PATIENT,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('missing user when role is required throws UnauthorizedException (401)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.DISPATCHER,
    ]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('multiple allowed roles allows any of the permitted roles', () => {
    const allowed = [
      UserRole.PARAMEDIC,
      UserRole.DOCTOR,
      UserRole.SYSTEM_ADMIN,
    ];
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(allowed);

    for (const role of allowed) {
      const context = createMockContext({ userId: 'u-1', role });
      expect(guard.canActivate(context)).toBe(true);
    }
  });

  it('SYSTEM_ADMIN is allowed on routes declaring SYSTEM_ADMIN alongside operational roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.HOSPITAL_ADMIN,
      UserRole.SYSTEM_ADMIN,
    ]);
    const context = createMockContext({
      userId: 'admin-1',
      role: UserRole.SYSTEM_ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('user with undefined or null role throws ForbiddenException (403)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      UserRole.DISPATCHER,
    ]);
    const context = createMockContext({
      userId: 'u-no-role',
      role: null,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
