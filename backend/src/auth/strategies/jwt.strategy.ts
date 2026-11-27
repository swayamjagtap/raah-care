import { Injectable, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../types/authenticated-request.js';
import { SupabaseJwtPayload } from '../types/jwt-payload.types.js';
import { UserProvisioningService } from '../services/user-provisioning.service.js';
import { SupabaseJwksService } from '../services/supabase-jwks.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly provisioningService: UserProvisioningService,
    @Optional() private readonly jwksService?: SupabaseJwksService,
  ) {
    const fallbackSecret =
      process.env.SUPABASE_JWT_SECRET || 'dev-fallback-supabase-jwt-secret-do-not-use-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: jwksService
        ? jwksService.secretOrKeyProvider
        : (_req: any, _rawToken: any, done: (err: any, secret?: string) => void) =>
            done(null, fallbackSecret),
      algorithms: ['HS256', 'ES256'],
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<AuthenticatedUser> {
    return this.provisioningService.resolveUserFromJwt(payload);
  }
}
