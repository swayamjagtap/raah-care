import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createTestJwt,
  E2E_TEST_ADMIN_USER,
  E2E_TEST_DOCTOR_USER,
  E2E_TEST_PARAMEDIC_USER,
  E2E_TEST_PATIENT_USER,
  E2E_TEST_USER,
} from './test-auth.helper.js';

describe('Authentication & Global RBAC Guards (e2e)', () => {
  let app: INestApplication<App>;
  let prismaMock: {
    $connect: ReturnType<typeof vi.fn>;
    $disconnect: ReturnType<typeof vi.fn>;
    user: { findUnique: ReturnType<typeof vi.fn> };
    patient: { findUnique: ReturnType<typeof vi.fn> };
    ambulance: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    hospital: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    emergencyCase: {
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    assignment: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    handover: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    caseEvent: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      user: { findUnique: vi.fn() },
      patient: { findUnique: vi.fn() },
      ambulance: {
        create: vi.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: '00000000-0000-0000-0000-000000000001', ...data }),
        ),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      hospital: {
        create: vi.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: '00000000-0000-0000-0000-000000000002', ...data }),
        ),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      emergencyCase: {
        create: vi.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: 'case-uuid-new', caseNumber: 'RAAH-2026-000001', ...data }),
        ),
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
      assignment: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: 'assignment-1', status: 'ACCEPTED' }),
      },
      handover: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      caseEvent: {
        create: vi.fn().mockResolvedValue({ id: 'event-uuid-new' }),
      },
      $transaction: vi.fn(async (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock)),
    };

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
    if (app) {
      await app.close();
    }
  });

  it('rejects unauthenticated request to protected route with 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ambulances')
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });

  it('rejects request with malformed / invalid Bearer token with 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ambulances')
      .set('Authorization', 'Bearer invalid-not-a-jwt')
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });

  it('rejects request when token subject does not exist in database', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const token = createTestJwt('unknown-sub-999');

    const res = await request(app.getHttpServer())
      .get('/api/v1/ambulances')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'User not found in system',
    });
  });

  it('rejects request when user account is inactive', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...E2E_TEST_USER,
      isActive: false,
    });
    const token = createTestJwt(E2E_TEST_USER.supabaseId);

    const res = await request(app.getHttpServer())
      .get('/api/v1/ambulances')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'User account is inactive',
    });
  });

  it('allows access to protected route when valid JWT and active user are provided', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: E2E_TEST_USER.id,
      supabaseId: E2E_TEST_USER.supabaseId,
      role: UserRole.DISPATCHER,
      hospitalId: null,
      ambulanceId: null,
      isActive: true,
    });
    const token = createTestJwt(E2E_TEST_USER.supabaseId);

    const res = await request(app.getHttpServer())
      .get('/api/v1/ambulances')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  });

  // ─── M8.3 Public Health & Optional Auth Emergency SOS ─────────────────────

  it('GET /api/v1/health without token succeeds with 200 OK (@Public)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body).toEqual({
      status: 'ok',
      service: 'raah-care-backend',
    });
  });

  it('GET /api/v1/health with invalid Bearer token succeeds with 200 OK (@Public bypasses auth)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Authorization', 'Bearer invalid-token-string')
      .expect(200);

    expect(res.body).toEqual({
      status: 'ok',
      service: 'raah-care-backend',
    });
  });

  it('POST /api/v1/emergencies without token succeeds with 201 and creates anonymous emergency (initiatorId: null)', async () => {
    const payload = {
      incidentLatitude: 19.076,
      incidentLongitude: 72.8777,
      incidentAddress: 'Gateway of India, Mumbai',
      symptoms: 'Patient collapsed',
      priority: 'HIGH',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .send(payload)
      .expect(201);

    expect(res.body).toMatchObject({
      incidentAddress: payload.incidentAddress,
      initiatorId: null,
    });
    expect(prismaMock.emergencyCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        initiatorId: null,
      }),
    });
    expect(prismaMock.caseEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: null,
      }),
    });
  });

  it('POST /api/v1/emergencies with valid JWT succeeds with 201 and sets initiatorId to authenticated User.id', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: E2E_TEST_USER.id,
      supabaseId: E2E_TEST_USER.supabaseId,
      role: UserRole.PATIENT,
      hospitalId: null,
      ambulanceId: null,
      isActive: true,
    });
    const token = createTestJwt(E2E_TEST_USER.supabaseId);

    const payload = {
      incidentLatitude: 19.076,
      incidentLongitude: 72.8777,
      incidentAddress: 'Colaba, Mumbai',
      priority: 'HIGH',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(res.body).toMatchObject({
      incidentAddress: payload.incidentAddress,
      initiatorId: E2E_TEST_USER.id,
    });
    expect(prismaMock.emergencyCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        initiatorId: E2E_TEST_USER.id,
      }),
    });
    expect(prismaMock.caseEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: E2E_TEST_USER.id,
      }),
    });
  });

  it('POST /api/v1/emergencies with valid JWT overrides client-supplied spoofed initiatorId', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: E2E_TEST_USER.id,
      supabaseId: E2E_TEST_USER.supabaseId,
      role: UserRole.PATIENT,
      hospitalId: null,
      ambulanceId: null,
      isActive: true,
    });
    const token = createTestJwt(E2E_TEST_USER.supabaseId);

    const spoofedId = '11111111-1111-4111-a111-111111111111';
    const payload = {
      initiatorId: spoofedId, // Client attempts to spoof another user
      incidentLatitude: 19.076,
      incidentLongitude: 72.8777,
      incidentAddress: 'Marine Drive, Mumbai',
      priority: 'CRITICAL',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    // Trusted JWT identity wins
    expect(res.body.initiatorId).toBe(E2E_TEST_USER.id);
    expect(res.body.initiatorId).not.toBe(spoofedId);
    expect(prismaMock.emergencyCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        initiatorId: E2E_TEST_USER.id,
      }),
    });
  });

  it('POST /api/v1/emergencies with malformed / invalid Bearer token rejects with 401 Unauthorized', async () => {
    const payload = {
      incidentLatitude: 19.076,
      incidentLongitude: 72.8777,
      incidentAddress: 'Dadar, Mumbai',
      priority: 'MEDIUM',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .set('Authorization', 'Bearer invalid-token-for-emergency')
      .send(payload)
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });

  // ─── M8.4 Role-Based Access Control (@Roles) ───────────────────────────

  describe('M8.4 Endpoint Role Enforcement', () => {
    it('allowed role (DISPATCHER) can list emergencies (GET /emergencies → 200)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER);
      const token = createTestJwt(E2E_TEST_USER.supabaseId);

      const res = await request(app.getHttpServer())
        .get('/api/v1/emergencies')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
    });

    it('disallowed role (PATIENT) is rejected from listing emergencies (GET /emergencies → 403)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PATIENT_USER);
      const token = createTestJwt(E2E_TEST_PATIENT_USER.supabaseId);

      const res = await request(app.getHttpServer())
        .get('/api/v1/emergencies')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body).toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('Insufficient permissions'),
      });
    });

    it('multiple allowed roles: DISPATCHER, PARAMEDIC, DOCTOR can read single emergency, but CAREGIVER is rejected (403)', async () => {
      const validCaseId = '11111111-1111-4111-a111-111111111111';
      prismaMock.emergencyCase.findUnique.mockResolvedValue({
        id: validCaseId,
        caseNumber: 'RAAH-2026-000001',
        status: 'DISPATCHING',
      });

      // Allowed 1: DISPATCHER
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER);
      await request(app.getHttpServer())
        .get(`/api/v1/emergencies/${validCaseId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .expect(200);

      // Allowed 2: PARAMEDIC
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PARAMEDIC_USER);
      await request(app.getHttpServer())
        .get(`/api/v1/emergencies/${validCaseId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId)}`)
        .expect(200);

      // Allowed 3: DOCTOR
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_DOCTOR_USER);
      await request(app.getHttpServer())
        .get(`/api/v1/emergencies/${validCaseId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_DOCTOR_USER.supabaseId)}`)
        .expect(200);

      // Disallowed: CAREGIVER (not in allowed roles for GET /emergencies/:id without patient ownership)
      prismaMock.user.findUnique.mockResolvedValue({
        ...E2E_TEST_USER,
        role: UserRole.CAREGIVER,
        supabaseId: 'caregiver-sub-1',
      });
      const res = await request(app.getHttpServer())
        .get(`/api/v1/emergencies/${validCaseId}`)
        .set('Authorization', `Bearer ${createTestJwt('caregiver-sub-1')}`)
        .expect(403);

      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('SYSTEM_ADMIN can access administrative endpoints (POST /ambulances → 201), while DISPATCHER is rejected (403)', async () => {
      const payload = {
        callSign: 'AMB-ADMIN-01',
        registrationNumber: 'MH-01-AB-9999',
        type: 'ALS',
      };

      // Disallowed: DISPATCHER cannot create ambulances
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER);
      await request(app.getHttpServer())
        .post('/api/v1/ambulances')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .send(payload)
        .expect(403);

      // Allowed: SYSTEM_ADMIN can create ambulances
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_ADMIN_USER);
      const res = await request(app.getHttpServer())
        .post('/api/v1/ambulances')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_ADMIN_USER.supabaseId)}`)
        .send(payload)
        .expect(201);

      expect(res.body.callSign).toBe('AMB-ADMIN-01');
    });

    it('SYSTEM_ADMIN can create hospitals (POST /hospitals → 201), while DOCTOR is rejected (403)', async () => {
      const payload = {
        name: 'Apollo Hospital',
        code: 'APO-01',
        address: 'Bandra West, Mumbai',
        latitude: 19.0596,
        longitude: 72.8295,
      };

      // Disallowed: DOCTOR cannot create hospitals
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_DOCTOR_USER);
      await request(app.getHttpServer())
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_DOCTOR_USER.supabaseId)}`)
        .send(payload)
        .expect(403);

      // Allowed: SYSTEM_ADMIN can create hospitals
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_ADMIN_USER);
      const res = await request(app.getHttpServer())
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_ADMIN_USER.supabaseId)}`)
        .send(payload)
        .expect(201);

      expect(res.body.name).toBe('Apollo Hospital');
    });

    it('PARAMEDIC can accept assignment (PATCH /assignments/:id/accept → 200), while DISPATCHER is rejected (403)', async () => {
      const assignmentId = '22222222-2222-4222-a222-222222222222';
      prismaMock.assignment.findUnique.mockResolvedValue({
        id: assignmentId,
        status: 'ASSIGNED',
        caseId: '11111111-1111-4111-a111-111111111111',
        ambulanceId: E2E_TEST_PARAMEDIC_USER.ambulanceId,
        ambulance: { id: E2E_TEST_PARAMEDIC_USER.ambulanceId, callSign: 'AMB-01', type: 'ALS', status: 'ASSIGNED' },
      });

      // Disallowed: DISPATCHER cannot accept assignment (driver/paramedic/admin operation)
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER);
      await request(app.getHttpServer())
        .patch(`/api/v1/assignments/${assignmentId}/accept`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .send({ notes: 'Accepting' })
        .expect(403);

      // Allowed: PARAMEDIC can accept assignment
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PARAMEDIC_USER);
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/assignments/${assignmentId}/accept`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId)}`)
        .send({ notes: 'Accepting' })
        .expect(200);

      expect(res.body.status).toBe('ACCEPTED');
    });
  });

  // ─── M8.5 Ownership & Resource-Scope Authorization ──────────────────────

  describe('M8.5 Ownership & Resource-Scope Authorization', () => {
    // ── Hospital Scope ───────────────────────────────────────────────────────

    it('DOCTOR can GET own hospital (hospitalId match → 200)', async () => {
      const hospitalId = E2E_TEST_DOCTOR_USER.hospitalId!;
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_DOCTOR_USER);
      prismaMock.hospital.findUnique.mockResolvedValue({
        id: hospitalId,
        name: 'Own Hospital',
        code: 'OWN-01',
        status: 'OPERATIONAL',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${hospitalId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_DOCTOR_USER.supabaseId)}`)
        .expect(200);

      expect(res.body.id).toBe(hospitalId);
    });

    it('DOCTOR accessing a different hospital is rejected with 403 Forbidden', async () => {
      const otherHospitalId = '99999999-9999-4999-a999-999999999999';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_DOCTOR_USER);
      prismaMock.hospital.findUnique.mockResolvedValue({
        id: otherHospitalId,
        name: 'Other Hospital',
        code: 'OTH-01',
        status: 'OPERATIONAL',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${otherHospitalId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_DOCTOR_USER.supabaseId)}`)
        .expect(403);

      expect(res.body).toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('hospital'),
      });
    });

    it('DISPATCHER can GET any hospital regardless of hospitalId (bypass scope → 200)', async () => {
      const anyHospitalId = '99999999-9999-4999-a999-999999999999';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER); // DISPATCHER
      prismaMock.hospital.findUnique.mockResolvedValue({
        id: anyHospitalId,
        name: 'Any Hospital',
        code: 'ANY-01',
        status: 'OPERATIONAL',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${anyHospitalId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .expect(200);

      expect(res.body.id).toBe(anyHospitalId);
    });

    it('SYSTEM_ADMIN can GET any hospital regardless of hospitalId (bypass scope → 200)', async () => {
      const anyHospitalId = '88888888-8888-4888-a888-888888888888';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_ADMIN_USER);
      prismaMock.hospital.findUnique.mockResolvedValue({
        id: anyHospitalId,
        name: 'Any Hospital',
        code: 'ANY-02',
        status: 'OPERATIONAL',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hospitals/${anyHospitalId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_ADMIN_USER.supabaseId)}`)
        .expect(200);

      expect(res.body.id).toBe(anyHospitalId);
    });

    // ── Ambulance / Crew Scope ────────────────────────────────────────────────

    it('PARAMEDIC can GET own ambulance (ambulanceId match → 200)', async () => {
      const ambulanceId = E2E_TEST_PARAMEDIC_USER.ambulanceId!;
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PARAMEDIC_USER);
      prismaMock.ambulance.findUnique.mockResolvedValue({
        id: ambulanceId,
        callSign: 'AMB-OWN',
        status: 'AVAILABLE',
        isAvailable: true,
        type: 'ALS',
        registrationNumber: 'MH-01-OWN-01',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/ambulances/${ambulanceId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId)}`)
        .expect(200);

      expect(res.body.id).toBe(ambulanceId);
    });

    it('PARAMEDIC accessing a different ambulance is rejected with 403 Forbidden', async () => {
      const otherAmbulanceId = '77777777-7777-4777-a777-777777777777';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PARAMEDIC_USER);
      prismaMock.ambulance.findUnique.mockResolvedValue({
        id: otherAmbulanceId,
        callSign: 'AMB-OTHER',
        status: 'AVAILABLE',
        isAvailable: true,
        type: 'BLS',
        registrationNumber: 'MH-02-OTH-02',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/ambulances/${otherAmbulanceId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId)}`)
        .expect(403);

      expect(res.body).toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('ambulance'),
      });
    });

    it('PARAMEDIC accepting an assignment for their own ambulance succeeds (200)', async () => {
      const ownAmbulanceId = E2E_TEST_PARAMEDIC_USER.ambulanceId!;
      const assignmentId = '33333333-3333-4333-a333-333333333333';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PARAMEDIC_USER);
      prismaMock.assignment.findUnique.mockResolvedValue({
        id: assignmentId,
        status: 'ASSIGNED',
        caseId: 'case-uuid-1',
        ambulanceId: ownAmbulanceId,
        ambulance: { id: ownAmbulanceId, callSign: 'AMB-OWN', type: 'ALS', status: 'ASSIGNED' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/assignments/${assignmentId}/accept`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId)}`)
        .send({ notes: 'On our way' })
        .expect(200);

      expect(res.body.status).toBe('ACCEPTED');
    });

    it('PARAMEDIC accepting assignment for a different ambulance is rejected with 403 Forbidden', async () => {
      const otherAmbulanceId = '66666666-6666-4666-a666-666666666666';
      const assignmentId = '44444444-4444-4444-a444-444444444444';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PARAMEDIC_USER);
      prismaMock.assignment.findUnique.mockResolvedValue({
        id: assignmentId,
        status: 'ASSIGNED',
        caseId: 'case-uuid-2',
        ambulanceId: otherAmbulanceId,
        ambulance: { id: otherAmbulanceId, callSign: 'AMB-OTHER', type: 'BLS', status: 'ASSIGNED' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/assignments/${assignmentId}/accept`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId)}`)
        .send({ notes: 'Not my unit' })
        .expect(403);

      expect(res.body).toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('ambulance'),
      });
    });

    // ── Patient Ownership ─────────────────────────────────────────────────────

    it('PATIENT can GET own emergency (initiatorId match → 200)', async () => {
      const caseId = '55555555-5555-4555-a555-555555555555';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PATIENT_USER);
      prismaMock.emergencyCase.findUnique.mockResolvedValue({
        id: caseId,
        caseNumber: 'RAAH-2026-000099',
        status: 'CREATED',
        initiatorId: E2E_TEST_PATIENT_USER.id,
        patient: null,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/emergencies/${caseId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PATIENT_USER.supabaseId)}`)
        .expect(200);

      expect(res.body.id).toBe(caseId);
    });

    it('PATIENT accessing another patient emergency is rejected with 403 Forbidden', async () => {
      const otherCaseId = '55555555-5555-4555-a555-555555555556';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PATIENT_USER);
      prismaMock.emergencyCase.findUnique.mockResolvedValue({
        id: otherCaseId,
        caseNumber: 'RAAH-2026-000100',
        status: 'CREATED',
        initiatorId: 'other-user-id-9999',
        patient: null,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/emergencies/${otherCaseId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PATIENT_USER.supabaseId)}`)
        .expect(403);

      expect(res.body).toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('emergency'),
      });
    });

    it('DISPATCHER can GET any emergency regardless of ownership (bypass scope → 200)', async () => {
      const anyCaseId = '55555555-5555-4555-a555-555555555557';
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER); // DISPATCHER
      prismaMock.emergencyCase.findUnique.mockResolvedValue({
        id: anyCaseId,
        caseNumber: 'RAAH-2026-000101',
        status: 'DISPATCHING',
        initiatorId: 'some-other-user-id',
        patient: null,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/emergencies/${anyCaseId}`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .expect(200);

      expect(res.body.id).toBe(anyCaseId);
    });
  });

  // ─── M8.6 Actor-ID Cleanup & Trusted JWT Identity ───────────────────────

  describe('M8.6 Actor-ID Cleanup & Trusted JWT Identity', () => {
    it('rejects obsolete/spoofed dispatcherId in CreateAssignmentDto with 400 Bad Request', async () => {
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER); // DISPATCHER
      const caseId = '11111111-1111-4111-a111-111111111111';

      const res = await request(app.getHttpServer())
        .post(`/api/v1/emergencies/${caseId}/assignments`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .send({
          ambulanceId: '00000000-0000-4000-a000-000000000010',
          dispatcherId: '99999999-9999-4999-a999-999999999999', // Non-whitelisted field
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('property dispatcherId should not exist')]),
      );
    });

    it('rejects obsolete/spoofed actorId in UpdateEmergencyStatusDto with 400 Bad Request', async () => {
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER); // DISPATCHER
      const caseId = '11111111-1111-4111-a111-111111111111';

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/emergencies/${caseId}/status`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .send({
          status: 'DISPATCHING',
          actorId: '99999999-9999-4999-a999-999999999999', // Non-whitelisted field
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('property actorId should not exist')]),
      );
    });

    it('rejects obsolete/spoofed paramedicId in CreateHandoverDto with 400 Bad Request', async () => {
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PARAMEDIC_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/handovers')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId)}`)
        .send({
          caseId: '11111111-1111-4111-a111-111111111111',
          paramedicId: '99999999-9999-4999-a999-999999999999', // Non-whitelisted field
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('property paramedicId should not exist')]),
      );
    });

    it('rejects obsolete/spoofed receivingDoctorId in CompleteHandoverDto with 400 Bad Request', async () => {
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_DOCTOR_USER);
      const handoverId = '22222222-2222-4222-a222-222222222222';

      const res = await request(app.getHttpServer())
        .post(`/api/v1/handovers/${handoverId}/complete`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_DOCTOR_USER.supabaseId)}`)
        .send({
          receivingDoctorId: '99999999-9999-4999-a999-999999999999', // Non-whitelisted field
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('property receivingDoctorId should not exist')]),
      );
    });

    it('derives dispatcher identity from authenticated JWT User.id on assignment creation', async () => {
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_USER); // DISPATCHER
      const caseId = '11111111-1111-4111-a111-111111111111';
      const ambulanceId = '00000000-0000-4000-a000-000000000010';

      prismaMock.emergencyCase.findUnique.mockResolvedValue({
        id: caseId,
        caseNumber: 'RAAH-2026-000001',
        status: 'DISPATCHING',
      });
      prismaMock.ambulance.findUnique.mockResolvedValue({
        id: ambulanceId,
        callSign: 'AMB-01',
        registrationNumber: 'MH01-1234',
        status: 'AVAILABLE',
        isAvailable: true,
      });
      prismaMock.assignment.findMany.mockResolvedValue([]);
      prismaMock.assignment.create = vi.fn().mockResolvedValue({
        id: 'new-assignment-id',
        caseId,
        ambulanceId,
        dispatcherId: E2E_TEST_USER.id,
        status: 'ASSIGNED',
        ambulance: { id: ambulanceId, callSign: 'AMB-01', type: 'ALS', status: 'ASSIGNED' },
        dispatcher: { id: E2E_TEST_USER.id, name: E2E_TEST_USER.name, role: E2E_TEST_USER.role },
        case: { id: caseId, caseNumber: 'RAAH-2026-000001', status: 'AMBULANCE_ASSIGNED', priority: 'HIGH' },
      });
      (prismaMock as any).ambulance.updateMany = vi.fn().mockResolvedValue({ count: 1 });
      prismaMock.emergencyCase.update = vi.fn().mockResolvedValue({});
      (prismaMock as any).assignment.findFirst = vi.fn().mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/emergencies/${caseId}/assignments`)
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .send({
          ambulanceId,
          notes: 'Dispatch assignment from test',
        })
        .expect(201);

      expect(res.body.dispatcherId).toBe(E2E_TEST_USER.id);
      expect(prismaMock.caseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: E2E_TEST_USER.id,
          eventType: 'AMBULANCE_ASSIGNED',
        }),
      });
    });
  });

  // ─── M9.1 Supabase Auth User Provisioning & Role Metadata ───────────────

  describe('M9.1 Supabase Auth User Provisioning & Role Metadata', () => {
    it('GET /api/v1/auth/me returns profile for authenticated user', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(E2E_TEST_USER) // JwtStrategy lookup
        .mockResolvedValueOnce({
          id: E2E_TEST_USER.id,
          supabaseId: E2E_TEST_USER.supabaseId,
          email: 'dispatcher@raah.care',
          phone: '+919999999999',
          name: E2E_TEST_USER.name,
          role: E2E_TEST_USER.role,
          isActive: true,
          hospitalId: null,
          ambulanceId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }); // Profile lookup

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .expect(200);

      expect(res.body.id).toBe(E2E_TEST_USER.id);
      expect(res.body.role).toBe(UserRole.DISPATCHER);
      expect(res.body.email).toBe('dispatcher@raah.care');
    });

    it('rejects unknown Supabase identity with 401 Unauthorized without creating or granting roles', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${createTestJwt('completely-unknown-sub')}`)
        .expect(401);

      expect(res.body.message).toContain('User not found in system');
    });

    it('rejects inactive linked user with 401 Unauthorized', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...E2E_TEST_USER,
        isActive: false,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_USER.supabaseId)}`)
        .expect(401);

      expect(res.body.message).toContain('User account is inactive');
    });

    it('authoritative DB role is preserved even if user_metadata or app_metadata attempts privilege escalation', async () => {
      // User in DB is PATIENT
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PATIENT_USER);

      // Malicious JWT attempting to inject SYSTEM_ADMIN via user_metadata & app_metadata
      const maliciousToken = createTestJwt(E2E_TEST_PATIENT_USER.supabaseId);

      // Attempt administrative operation (POST /ambulances requires SYSTEM_ADMIN)
      await request(app.getHttpServer())
        .post('/api/v1/ambulances')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .send({ callSign: 'HACK-01', registrationNumber: 'HACK-999', type: 'ALS' })
        .expect(403);
    });

    it('SYSTEM_ADMIN can explicitly create a new user (POST /auth/users → 201)', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(E2E_TEST_ADMIN_USER) // Auth guard
        .mockResolvedValueOnce(null) // sub check
        .mockResolvedValueOnce(null); // email check
      (prismaMock.user as any).create = vi.fn().mockResolvedValue({
        id: 'new-seeded-user-id',
        name: 'New Doctor',
        email: 'doc@raah.care',
        role: UserRole.DOCTOR,
        isActive: true,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/users')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_ADMIN_USER.supabaseId)}`)
        .send({
          name: 'New Doctor',
          email: 'doc@raah.care',
          role: UserRole.DOCTOR,
        })
        .expect(201);

      expect(res.body.id).toBe('new-seeded-user-id');
      expect(res.body.role).toBe(UserRole.DOCTOR);
    });

    it('non-admin user is rejected from user creation (POST /auth/users → 403)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(E2E_TEST_PARAMEDIC_USER);

      await request(app.getHttpServer())
        .post('/api/v1/auth/users')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_PARAMEDIC_USER.supabaseId)}`)
        .send({ name: 'Unauthorized User' })
        .expect(403);
    });

    it('SYSTEM_ADMIN can explicitly link Supabase identity (POST /auth/users/link → 200)', async () => {
      const targetUserId = '11111111-2222-4333-a444-555555555555';
      const targetSub = 'new-supabase-sub-999';

      prismaMock.user.findUnique
        .mockResolvedValueOnce(E2E_TEST_ADMIN_USER) // Auth guard
        .mockResolvedValueOnce({ id: targetUserId, supabaseId: null }) // Target user
        .mockResolvedValueOnce(null); // Existing with sub check
      (prismaMock.user as any).update = vi.fn().mockResolvedValue({
        id: targetUserId,
        supabaseId: targetSub,
        name: 'Linked Doctor',
        role: UserRole.DOCTOR,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/users/link')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_ADMIN_USER.supabaseId)}`)
        .send({
          userId: targetUserId,
          supabaseId: targetSub,
        })
        .expect(200);

      expect(res.body.supabaseId).toBe(targetSub);
    });

    it('rejects identity linking if target user is already linked to a different supabaseId (409 Conflict)', async () => {
      const targetUserId = '11111111-2222-4333-a444-555555555555';

      prismaMock.user.findUnique
        .mockResolvedValueOnce(E2E_TEST_ADMIN_USER) // Auth guard
        .mockResolvedValueOnce({ id: targetUserId, supabaseId: 'already-linked-sub' }); // Target user

      await request(app.getHttpServer())
        .post('/api/v1/auth/users/link')
        .set('Authorization', `Bearer ${createTestJwt(E2E_TEST_ADMIN_USER.supabaseId)}`)
        .send({
          userId: targetUserId,
          supabaseId: 'new-sub',
        })
        .expect(409);
    });
  });

  // ─── M9.2 Patient Self-Registration & Supabase Identity Linking ──────────

  describe('M9.2 Patient Self-Registration & Supabase Identity Linking', () => {
    const newPatientSub = 'new-supabase-patient-sub-001';
    const newPatientJwt = createTestJwt(newPatientSub);

    it('rejects registration without Authorization header (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Alice Patient' })
        .expect(401);
    });

    it('rejects registration with invalid Bearer token (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', 'Bearer completely-invalid-token')
        .send({ name: 'Alice Patient' })
        .expect(401);
    });

    it('allows valid authenticated Supabase identity to register as PATIENT (201 Created)', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // sub check
        .mockResolvedValueOnce(null); // email check
      (prismaMock.user as any).create = vi.fn().mockResolvedValue({
        id: 'new-registered-patient-id',
        supabaseId: newPatientSub,
        name: 'Alice Patient',
        email: 'alice@patient.care',
        phone: '+919876543210',
        role: UserRole.PATIENT,
        isActive: true,
        hospitalId: null,
        ambulanceId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .send({
          name: 'Alice Patient',
          email: 'alice@patient.care',
          phone: '+919876543210',
        })
        .expect(201);

      expect(res.body.id).toBe('new-registered-patient-id');
      expect(res.body.supabaseId).toBe(newPatientSub);
      expect(res.body.role).toBe(UserRole.PATIENT);
      expect(res.body.isActive).toBe(true);
      expect(res.body.hospitalId).toBeNull();
      expect(res.body.ambulanceId).toBeNull();
    });

    it('subsequent GET /api/v1/auth/me returns the registered user profile', async () => {
      const registeredUser = {
        id: 'new-registered-patient-id',
        supabaseId: newPatientSub,
        name: 'Alice Patient',
        email: 'alice@patient.care',
        role: UserRole.PATIENT,
        isActive: true,
        hospitalId: null,
        ambulanceId: null,
      };

      prismaMock.user.findUnique
        .mockResolvedValueOnce(registeredUser) // JwtStrategy lookup
        .mockResolvedValueOnce(registeredUser); // Profile lookup

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .expect(200);

      expect(res.body.id).toBe(registeredUser.id);
      expect(res.body.role).toBe(UserRole.PATIENT);
      expect(res.body.supabaseId).toBe(newPatientSub);
    });

    it('rejects duplicate registration for already-registered supabaseId (409 Conflict)', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'already-existing-user-id',
        supabaseId: newPatientSub,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .send({ name: 'Alice Patient' })
        .expect(409);
    });

    it('handles concurrent race condition (Prisma P2002) with 409 Conflict', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      (prismaMock.user as any).create = vi.fn().mockRejectedValue(p2002Error);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .send({ name: 'Alice Patient' })
        .expect(409);
    });

    it('rejects client-supplied role attempting privilege escalation (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .send({
          name: 'Hacker',
          role: 'SYSTEM_ADMIN',
        })
        .expect(400);
    });

    it('rejects client-supplied supabaseId (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .send({
          name: 'Spoofer',
          supabaseId: 'spoofed-sub-uuid',
        })
        .expect(400);
    });

    it('rejects client-supplied userId (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .send({
          name: 'Spoofer',
          userId: '00000000-0000-0000-0000-000000000001',
        })
        .expect(400);
    });

    it('rejects client-supplied hospitalId or ambulanceId (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .send({
          name: 'Spoofer',
          hospitalId: '00000000-0000-4000-a000-000000000020',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${newPatientJwt}`)
        .send({
          name: 'Spoofer',
          ambulanceId: '00000000-0000-4000-a000-000000000010',
        })
        .expect(400);
    });
  });
});
