import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseJwtPayload } from '../types/jwt-payload.types.js';
import { SupabaseJwksService } from '../services/supabase-jwks.service.js';

/**
 * Validates the cryptographic signature and expiration of a Supabase JWT (Bearer token)
 * without requiring the user to already exist in the database.
 * Used exclusively for onboarding/registration endpoints (e.g. POST /api/v1/auth/register).
 * Supports both modern asymmetric ES256 tokens (via Supabase JWKS) and HS256 tokens.
 * Attaches verified claims to `req.jwtPayload`.
 */
@Injectable()
export class SupabaseJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Optional() private readonly jwksService?: SupabaseJwksService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Invalid or malformed Bearer token');
    }

    let payload: SupabaseJwtPayload;
    try {
      if (this.jwksService) {
        payload = await this.jwksService.verifyToken(token, this.jwtService);
      } else {
        payload = await this.jwtService.verifyAsync<SupabaseJwtPayload>(token);
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token payload is missing sub claim');
    }
    request.jwtPayload = payload;
    return true;
  }
}
