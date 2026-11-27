import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../generated/prisma/enums.js';
import { UserProvisioningService } from '../services/user-provisioning.service.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let provisioningService: {
    resolveUserFromJwt: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    provisioningService = {
      resolveUserFromJwt: vi.fn(),
    };
    strategy = new JwtStrategy(provisioningService as unknown as UserProvisioningService);
  });

  it('delegates validation to UserProvisioningService.resolveUserFromJwt', async () => {
    const payload = { sub: 'test-sub-1' };
    const mockUser = {
      userId: 'uuid-1',
      supabaseId: 'test-sub-1',
      role: UserRole.DISPATCHER,
      hospitalId: null,
      ambulanceId: null,
    };
    provisioningService.resolveUserFromJwt.mockResolvedValue(mockUser);

    const result = await strategy.validate(payload);
    expect(provisioningService.resolveUserFromJwt).toHaveBeenCalledWith(payload);
    expect(result).toEqual(mockUser);
  });

  it('propagates UnauthorizedException when provisioning service rejects user', async () => {
    const payload = { sub: 'unknown-sub' };
    provisioningService.resolveUserFromJwt.mockRejectedValue(
      new UnauthorizedException('User not found in system'),
    );

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
