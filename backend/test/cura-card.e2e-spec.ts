import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createTestJwt,
  E2E_TEST_DOCTOR_USER,
  E2E_TEST_PARAMEDIC_USER,
  E2E_TEST_PATIENT_USER,
  E2E_TEST_USER,
} from './test-auth.helper.js';

describe('Cura Card QR System (e2e)', () => {
  let app: INestApplication<App>;
  let prismaMock: {
    $connect: ReturnType<typeof vi.fn>;
    $disconnect: ReturnType<typeof vi.fn>;
    user: { findUnique: ReturnType<typeof vi.fn> };
    patient: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    curaCardToken: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    curaCardAudit: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  const patientToken = createTestJwt(E2E_TEST_PATIENT_USER.supabaseId);
  const patientAuthHeader = `Bearer ${patientToken}`;

  const paramedicToken = createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId);
  const paramedicAuthHeader = `Bearer ${paramedicToken}`;

  const doctorToken = createTestJwt(E2E_TEST_DOCTOR_USER.supabaseId);
  const doctorAuthHeader = `Bearer ${doctorToken}`;

  const dispatcherToken = createTestJwt(E2E_TEST_USER.supabaseId);
  const dispatcherAuthHeader = `Bearer ${dispatcherToken}`;

  const mockPatientRecord = {
    id: '00000000-0000-4000-a000-000000000088',
    userId: E2E_TEST_PATIENT_USER.id,
    cardId: 'RAAH-CR-E2E12345',
    fullName: E2E_TEST_PATIENT_USER.name,
    bloodGroup: 'AB+',
    allergies: 'Latex',
    medicalHistory: 'None',
    currentMedication: 'None',
    emergencyContact: 'Family: +919876543210',
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-02T10:00:00Z'),
  };

  beforeEach(async () => {
    prismaMock = {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      user: {
        findUnique: vi.fn(),
      },
      patient: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      curaCardToken: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      curaCardAudit: {
        create: vi.fn(),
      },
    };

    prismaMock.user.findUnique.mockImplementation(({ where }) => {
      if (where.supabaseId === E2E_TEST_PATIENT_USER.supabaseId) {
        return Promise.resolve(E2E_TEST_PATIENT_USER);
      }
      if (where.supabaseId === E2E_TEST_PARAMEDIC_USER.supabaseId) {
        return Promise.resolve(E2E_TEST_PARAMEDIC_USER);
      }
      if (where.supabaseId === E2E_TEST_DOCTOR_USER.supabaseId) {
        return Promise.resolve(E2E_TEST_DOCTOR_USER);
      }
      if (where.supabaseId === E2E_TEST_USER.supabaseId) {
        return Promise.resolve(E2E_TEST_USER);
      }
      return Promise.resolve(null);
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/cura-card/me', () => {
    it('returns card details for authenticated patient', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(mockPatientRecord);
      prismaMock.curaCardToken.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/cura-card/me')
        .set('Authorization', patientAuthHeader)
        .expect(200);

      expect(res.body.cardId).toBe('RAAH-CR-E2E12345');
      expect(res.body.status).toBe('INACTIVE');
    });

    it('rejects unauthorized roles like DOCTOR or PARAMEDIC on patient self-management', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/cura-card/me')
        .set('Authorization', doctorAuthHeader)
        .expect(403);
    });
  });

  describe('POST /api/v1/cura-card/token & /revoke', () => {
    it('generates secure 256-bit token and returns payload and expiry', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(mockPatientRecord);
      prismaMock.curaCardToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.curaCardToken.create.mockResolvedValue({ id: 'tok-1' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/cura-card/token')
        .set('Authorization', patientAuthHeader)
        .expect(200);

      expect(res.body.cardId).toBe('RAAH-CR-E2E12345');
      expect(res.body.qrPayload).toContain('/cura-card/scan?token=');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('revokes active token', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(mockPatientRecord);
      prismaMock.curaCardToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/cura-card/revoke')
        .set('Authorization', patientAuthHeader)
        .expect(200);

      expect(res.body.revoked).toBe(true);
    });
  });

  describe('POST /api/v1/cura-card/resolve', () => {
    it('allows PARAMEDIC to resolve valid QR token to medical facts', async () => {
      const rawToken = 'sample-scanned-token-hex-string';
      const crypto = await import('node:crypto');
      const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

      prismaMock.curaCardToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        patient: mockPatientRecord,
      });
      prismaMock.curaCardAudit.create.mockResolvedValue({ id: 'aud-1' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/cura-card/resolve')
        .set('Authorization', paramedicAuthHeader)
        .send({ token: rawToken })
        .expect(200);

      expect(res.body.fullName).toBe(E2E_TEST_PATIENT_USER.name);
      expect(res.body.bloodGroup).toBe('AB+');
      expect(res.body.allergies).toBe('Latex');
    });

    it('rejects DISPATCHER or PATIENT role from resolving token and records UNAUTHORIZED audit log', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cura-card/resolve')
        .set('Authorization', dispatcherAuthHeader)
        .send({ token: 'any-token' })
        .expect(403);

      expect(prismaMock.curaCardAudit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          outcome: 'UNAUTHORIZED',
          responderId: E2E_TEST_USER.id,
          responderRole: E2E_TEST_USER.role,
        }),
      });
    });

    it('rejects expired token with 401', async () => {
      const rawToken = 'expired-token';
      const crypto = await import('node:crypto');
      const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

      prismaMock.curaCardToken.findUnique.mockResolvedValue({
        id: 'tok-exp',
        tokenHash: hash,
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
        patient: mockPatientRecord,
      });

      await request(app.getHttpServer())
        .post('/api/v1/cura-card/resolve')
        .set('Authorization', paramedicAuthHeader)
        .send({ token: rawToken })
        .expect(401);
    });
  });
});
