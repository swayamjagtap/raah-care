import { Controller, Get } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UserRole } from '../../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../types/authenticated-request.js';
import { CurrentUser } from './current-user.decorator.js';

describe('CurrentUser decorator', () => {
  @Controller()
  class TestController {
    @Get('test')
    testRoute(@CurrentUser() user: AuthenticatedUser) {
      return user;
    }
  }

  it('extracts authenticated user from request', () => {
    // Retrieve parameter decorator factory metadata from route
    const metadata = Reflect.getMetadata('__routeArguments__', TestController, 'testRoute');
    const key = Object.keys(metadata)[0];
    const factory = metadata[key].factory;

    const mockUser: AuthenticatedUser = {
      userId: 'user-123',
      supabaseId: 'sub-456',
      role: UserRole.DOCTOR,
      hospitalId: 'hosp-1',
      ambulanceId: null,
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    };

    const extracted = factory(null, mockContext);
    expect(extracted).toEqual(mockUser);
  });

  it('returns undefined when request has no user', () => {
    const metadata = Reflect.getMetadata('__routeArguments__', TestController, 'testRoute');
    const key = Object.keys(metadata)[0];
    const factory = metadata[key].factory;

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };

    const extracted = factory(null, mockContext);
    expect(extracted).toBeUndefined();
  });
});
