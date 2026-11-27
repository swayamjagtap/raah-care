import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseJwksService } from './supabase-jwks.service.js';

describe('SupabaseJwksService', () => {
  let service: SupabaseJwksService;
  let jwtService: JwtService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new SupabaseJwksService();
    jwtService = new JwtService();
  });

  it('resolves HS256 secret directly without fetching JWKS', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const token = jwtService.sign({ sub: 'user-1' }, { secret: 'test-secret', algorithm: 'HS256' });

    const result = await service.getKeyForToken(token);
    expect(result.algorithm).toBe('HS256');
    expect(result.key).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException for malformed tokens', () => {
    expect(() => service.parseJwtHeader('not-a-token')).toThrow(UnauthorizedException);
    expect(() => service.parseJwtHeader('a.b')).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for unsupported algorithms', async () => {
    // Header with alg: 'none'
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'u1' })).toString('base64url');
    const token = `${header}.${payload}.sig`;

    await expect(service.getKeyForToken(token)).rejects.toThrow(UnauthorizedException);
  });

  it('fetches and caches EC public keys for ES256 tokens', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = publicKey.export({ format: 'jwk' });
    const jwksMock = {
      keys: [{ ...jwk, kid: 'test-kid-1', alg: 'ES256', kty: 'EC' }],
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => jwksMock,
    } as unknown as Response);

    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const token = jwtService.sign(
      { sub: 'user-es-1' },
      {
        algorithm: 'ES256',
        privateKey: privatePem,
        header: { alg: 'ES256', kid: 'test-kid-1' },
      },
    );

    const result = await service.getKeyForToken(token);
    expect(result.algorithm).toBe('ES256');
    expect(result.key).toContain('BEGIN PUBLIC KEY');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call should hit the in-memory cache without refetching
    const cachedResult = await service.getKeyForToken(token);
    expect(cachedResult.key).toBe(result.key);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('verifies an ES256 token using verifyToken', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = publicKey.export({ format: 'jwk' });
    const jwksMock = {
      keys: [{ ...jwk, kid: 'test-kid-2', alg: 'ES256', kty: 'EC' }],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => jwksMock,
    } as unknown as Response);

    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const token = jwtService.sign(
      { sub: 'user-es-2' },
      {
        algorithm: 'ES256',
        privateKey: privatePem,
        header: { alg: 'ES256', kid: 'test-kid-2' },
      },
    );

    const verified = await service.verifyToken(token, jwtService);
    expect(verified.sub).toBe('user-es-2');
  });

  it('supplies secretOrKey via secretOrKeyProvider for passport-jwt', () => {
    const token = jwtService.sign({ sub: 'user-1' }, { secret: 'test-secret', algorithm: 'HS256' });

    return new Promise<void>((resolve) => {
      service.secretOrKeyProvider({} as any, token, (err, key) => {
        expect(err).toBeNull();
        expect(key).toBeDefined();
        resolve();
      });
    });
  });
});
