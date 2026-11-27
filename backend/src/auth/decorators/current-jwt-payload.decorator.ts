import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseJwtPayload } from '../types/jwt-payload.types.js';

/**
 * Extracts verified Supabase JWT payload claims (specifically `sub`)
 * attached to `req.jwtPayload` by `SupabaseJwtAuthGuard`.
 */
export const CurrentJwtPayload = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupabaseJwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    const payload = request.jwtPayload;
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Valid JWT payload with sub claim is required');
    }
    return payload;
  },
);
