import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import type { Request } from 'express';
import type { SupabaseJwtPayload } from '../types/jwt-payload.types.js';

interface JwkKey {
  kid?: string;
  kty: string;
  alg?: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
}

interface JwksResponse {
  keys: JwkKey[];
}

interface TokenHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

export interface ResolvedKey {
  key: string;
  algorithm: 'HS256' | 'ES256';
}

@Injectable()
export class SupabaseJwksService {
  private readonly logger = new Logger(SupabaseJwksService.name);
  private readonly keyCache = new Map<string, string>();
  private defaultEs256Key: string | null = null;
  private jwksFetchPromise: Promise<void> | null = null;

  private get jwksUrl(): string {
    if (process.env.SUPABASE_JWKS_URL) {
      return process.env.SUPABASE_JWKS_URL;
    }
    const baseUrl = process.env.SUPABASE_URL || 'https://ddhtnwgsdwzgibkqbqcx.supabase.co';
    return `${baseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
  }

  private get hs256Secret(): string {
    return (
      process.env.SUPABASE_JWT_SECRET ||
      'dev-fallback-supabase-jwt-secret-do-not-use-in-production'
    );
  }

  /**
   * Safely parses JWT header without validating signature yet.
   */
  parseJwtHeader(token: string): TokenHeader {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0]) {
      throw new UnauthorizedException('Invalid or malformed Bearer token');
    }
    try {
      const headerJson = Buffer.from(parts[0], 'base64url').toString('utf8');
      return JSON.parse(headerJson) as TokenHeader;
    } catch {
      throw new UnauthorizedException('Failed to parse token header');
    }
  }

  /**
   * Refreshes the in-memory cache of public keys from the JWKS endpoint.
   */
  async refreshJwks(): Promise<void> {
    if (this.jwksFetchPromise) {
      return this.jwksFetchPromise;
    }

    this.jwksFetchPromise = (async () => {
      try {
        const response = await fetch(this.jwksUrl);
        if (!response.ok) {
          throw new Error(`JWKS HTTP ${response.status}: ${response.statusText}`);
        }
        const data = (await response.json()) as JwksResponse;
        if (!data || !Array.isArray(data.keys)) {
          throw new Error('JWKS response has no keys array');
        }

        for (const jwk of data.keys) {
          try {
            const pubKey = crypto.createPublicKey({ key: jwk as any, format: 'jwk' });
            const pem = pubKey.export({ type: 'spki', format: 'pem' }).toString();
            if (jwk.kid) {
              this.keyCache.set(jwk.kid, pem);
            }
            if (jwk.alg === 'ES256' || jwk.kty === 'EC') {
              this.defaultEs256Key = pem;
            }
          } catch (err: any) {
            this.logger.warn(`Failed to import JWK key ${jwk.kid ?? 'unknown'}: ${err.message}`);
          }
        }
      } catch (err: any) {
        this.logger.error(`Failed to fetch JWKS from ${this.jwksUrl}: ${err.message}`);
        throw new UnauthorizedException('Failed to retrieve identity provider signing keys');
      } finally {
        this.jwksFetchPromise = null;
      }
    })();

    return this.jwksFetchPromise;
  }

  /**
   * Resolves the appropriate verification key and algorithm for a given raw token.
   */
  async getKeyForToken(rawToken: string): Promise<ResolvedKey> {
    const header = this.parseJwtHeader(rawToken);
    const alg = header.alg ?? 'HS256';

    if (alg === 'HS256') {
      return {
        key: this.hs256Secret,
        algorithm: 'HS256',
      };
    }

    if (alg === 'ES256') {
      const kid = header.kid;
      if (kid && this.keyCache.has(kid)) {
        return {
          key: this.keyCache.get(kid)!,
          algorithm: 'ES256',
        };
      }

      // Fetch or refresh JWKS
      await this.refreshJwks();

      if (kid && this.keyCache.has(kid)) {
        return {
          key: this.keyCache.get(kid)!,
          algorithm: 'ES256',
        };
      }

      if (this.defaultEs256Key) {
        return {
          key: this.defaultEs256Key,
          algorithm: 'ES256',
        };
      }

      throw new UnauthorizedException('No matching public key found for token');
    }

    throw new UnauthorizedException(`Unsupported JWT algorithm: ${alg}`);
  }

  /**
   * Passport-jwt secretOrKeyProvider callback.
   */
  secretOrKeyProvider = (
    _request: Request,
    rawJwtToken: any,
    done: (err: any, secretOrKey?: string | Buffer) => void,
  ): void => {
    if (typeof rawJwtToken !== 'string') {
      return done(new UnauthorizedException('Invalid token format'));
    }

    this.getKeyForToken(rawJwtToken)
      .then(({ key }) => done(null, key))
      .catch((err) => done(err));
  };

  /**
   * Validates a token using the appropriate key and algorithm.
   */
  async verifyToken(token: string, jwtService: JwtService): Promise<SupabaseJwtPayload> {
    const { key, algorithm } = await this.getKeyForToken(token);
    try {
      return await jwtService.verifyAsync<SupabaseJwtPayload>(token, {
        secret: algorithm === 'HS256' ? key : undefined,
        publicKey: algorithm === 'ES256' ? key : undefined,
        algorithms: [algorithm],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
