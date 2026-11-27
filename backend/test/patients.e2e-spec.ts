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
  E2E_TEST_PATIENT_USER,
} from './test-auth.helper.js';

describe('Patients Medical Profile API (e2e)', () => {
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
  };

  const patientToken = createTestJwt(E2E_TEST_PATIENT_USER.supabaseId);
  const patientAuthHeader = `Bearer ${patientToken}`;

  const doctorToken = createTestJwt(E2E_TEST_DOCTOR_USER.supabaseId);
  const doctorAuthHeader = `Bearer ${doctorToken}`;

  const mockPatientRecord = {
    id: '00000000-0000-4000-a000-000000000077',
    userId: E2E_TEST_PATIENT_USER.id,
    fullName: E2E_TEST_PATIENT_USER.name,
    dateOfBirth: new Date('1990-01-01T00:00:00Z'),
    gender: 'Male',
    bloodGroup: 'O+',
    phoneNumber: '+919876543210',
    emergencyContact: 'Emergency: +919876511111',
    medicalHistory: 'Hypertension',
    allergies: 'Peanuts',
    currentMedication: 'Amlodipine 5mg',
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
    };

    // User lookup mock for JWT strategy
    prismaMock.user.findUnique.mockImplementation(({ where }) => {
      if (where.supabaseId === E2E_TEST_PATIENT_USER.supabaseId) {
        return Promise.resolve(E2E_TEST_PATIENT_USER);
      }
      if (where.supabaseId === E2E_TEST_DOCTOR_USER.supabaseId) {
        return Promise.resolve(E2E_TEST_DOCTOR_USER);
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

  describe('GET /api/v1/patients/me', () => {
    it('returns 200 with patient medical profile for authenticated patient', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(mockPatientRecord);

      const response = await request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .set('Authorization', patientAuthHeader)
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockPatientRecord.id,
        userId: E2E_TEST_PATIENT_USER.id,
        fullName: E2E_TEST_PATIENT_USER.name,
        bloodGroup: 'O+',
        allergies: 'Peanuts',
        medicalHistory: 'Hypertension',
        currentMedication: 'Amlodipine 5mg',
      });
    });

    it('returns 200 and safe empty profile when patient has no clinical record yet', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(null);
      prismaMock.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === E2E_TEST_PATIENT_USER.id) {
          return Promise.resolve(E2E_TEST_PATIENT_USER);
        }
        if (where.supabaseId === E2E_TEST_PATIENT_USER.supabaseId) {
          return Promise.resolve(E2E_TEST_PATIENT_USER);
        }
        return Promise.resolve(null);
      });

      prismaMock.patient.create.mockResolvedValue({
        id: 'new-pat-uuid',
        userId: E2E_TEST_PATIENT_USER.id,
        fullName: E2E_TEST_PATIENT_USER.name,
        dateOfBirth: null,
        gender: null,
        bloodGroup: null,
        phoneNumber: null,
        emergencyContact: null,
        medicalHistory: null,
        allergies: null,
        currentMedication: null,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: new Date('2026-01-01T10:00:00Z'),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .set('Authorization', patientAuthHeader)
        .expect(200);

      expect(response.body.id).toBe('new-pat-uuid');
      expect(response.body.bloodGroup).toBeNull();
      expect(response.body.allergies).toBeNull();
    });

    it('returns 401 when request is unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .expect(401);
    });

    it('returns 403 when caller is not PATIENT or CAREGIVER (e.g. DOCTOR)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .set('Authorization', doctorAuthHeader)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/patients/me', () => {
    it('returns 200 and updates permitted medical fields', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(mockPatientRecord);
      prismaMock.patient.update.mockResolvedValue({
        ...mockPatientRecord,
        bloodGroup: 'B+',
        allergies: 'Penicillin, Dust',
        medicalHistory: 'Asthma',
        currentMedication: 'Inhaler',
        emergencyContact: 'Father: +919876599999',
        updatedAt: new Date('2026-02-01T10:00:00Z'),
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/patients/me')
        .set('Authorization', patientAuthHeader)
        .send({
          bloodGroup: 'B+',
          allergies: 'Penicillin, Dust',
          medicalHistory: 'Asthma',
          currentMedication: 'Inhaler',
          emergencyContact: 'Father: +919876599999',
        })
        .expect(200);

      expect(response.body.bloodGroup).toBe('B+');
      expect(response.body.allergies).toBe('Penicillin, Dust');
      expect(response.body.emergencyContact).toBe('Father: +919876599999');
    });

    it('returns 400 when invalid blood group is provided', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/patients/me')
        .set('Authorization', patientAuthHeader)
        .send({
          bloodGroup: 'XYZ_INVALID',
        })
        .expect(400);
    });

    it('returns 400 when unsupported or identity fields are submitted (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/patients/me')
        .set('Authorization', patientAuthHeader)
        .send({
          bloodGroup: 'A+',
          role: 'SYSTEM_ADMIN',
          id: 'hacked-id',
          userId: 'hacked-user-id',
          supabaseId: 'hacked-sub',
        })
        .expect(400);
    });

    it('returns 401 when update is unauthenticated', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/patients/me')
        .send({ bloodGroup: 'A+' })
        .expect(401);
    });

    it('returns 403 when update is attempted by non-PATIENT role', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/patients/me')
        .set('Authorization', doctorAuthHeader)
        .send({ bloodGroup: 'A+' })
        .expect(403);
    });
  });
});
