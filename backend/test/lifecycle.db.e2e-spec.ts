/**
 * M6.2 — Stateful Database-Backed E2E Integration Test
 *
 * Verifies the complete stateful emergency lifecycle against a REAL PostgreSQL
 * database using the real NestJS AppModule, real PrismaService, and real Prisma queries.
 *
 * Isolation strategy:
 *   - Spins up an in-process, isolated PostgreSQL instance using @electric-sql/pglite
 *     and @electric-sql/pglite-socket (a full PostgreSQL engine in WebAssembly).
 *   - Listens on a dedicated local port (127.0.0.1:5434).
 *   - Applies all repository Prisma migrations in sequence at startup.
 *   - Overrides TEST_DATABASE_URL and DIRECT_URL/DATABASE_URL to point ONLY to
 *     this local instance, strictly isolating from any remote Supabase database.
 *   - Cleans up and stops the local server after the test suite.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  AmbulanceStatus,
  AssignmentStatus,
  CaseEventType,
  CaseStatus,
  HandoverStatus,
  HospitalStatus,
  ResourceType,
  ResourceStatus,
  UserRole,
} from '../generated/prisma/enums.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..');

const PGLITE_PORT = 5434;
const TEST_DB_URL = `postgresql://postgres:postgres@127.0.0.1:${PGLITE_PORT}/postgres`;

describe('M6.2 — Stateful Database-Backed Emergency Lifecycle (Real PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let serverInstance: { stop: () => Promise<void> };

  // Seeded fixture entities
  let seededHospital: { id: string; name: string };
  let seededAmbulance: { id: string; callSign: string };
  let seededDispatcher: { id: string };
  let seededParamedic: { id: string };
  let seededDoctor: { id: string };
  let seededPatient: { id: string };

  // Stateful runtime variables across steps
  let emergencyCaseId: string;
  let assignmentId: string;
  let handoverId: string;

  beforeAll(async () => {
    // 1. Point environment variables to the isolated local test database
    process.env.TEST_DATABASE_URL = TEST_DB_URL;
    process.env.DIRECT_URL = TEST_DB_URL;
    process.env.DATABASE_URL = TEST_DB_URL;

    // 2. Instantiate and migrate in-memory PGlite PostgreSQL instance
    const { PGlite } = await import(
      '../../node_modules/.pnpm/@electric-sql+pglite@0.4.3/node_modules/@electric-sql/pglite/dist/index.js'
    );
    const { PGLiteSocketServer } = await import(
      '../../node_modules/.pnpm/@electric-sql+pglite-socket@0.1.3_@electric-sql+pglite@0.4.3/node_modules/@electric-sql/pglite-socket/dist/index.js'
    );

    const db = new PGlite();
    const migrationFiles = [
      'prisma/migrations/20261116111709_init/migration.sql',
      'prisma/migrations/20261118025500_add_hospital_resource_version_and_quantity_check/migration.sql',
      'prisma/migrations/20261124230000_add_active_handover_partial_unique_index/migration.sql',
      'prisma/migrations/20261124231000_add_handover_rejected_cancelled_events/migration.sql',
    ];

    for (const relPath of migrationFiles) {
      const fullPath = path.resolve(BACKEND_ROOT, relPath);
      const sql = fs.readFileSync(fullPath, 'utf-8');
      await db.exec(sql);
    }

    // 3. Start PostgreSQL TCP wire-protocol server on local port with multi-connection support
    const server = new PGLiteSocketServer({
      db,
      port: PGLITE_PORT,
      host: '127.0.0.1',
      maxConnections: 50,
    });
    await server.start();
    serverInstance = server;

    // 4. Bootstrap real Nest application with real AppModule and real PrismaService
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    prisma = app.get(PrismaService);
    await prisma.$connect();

    // 5. Seed initial fixtures directly into the real database
    seededHospital = await prisma.hospital.create({
      data: {
        name: 'State Trauma Center',
        code: 'STC-01',
        address: 'Worli Sea Face, Mumbai',
        latitude: 19.0176,
        longitude: 72.8561,
        status: HospitalStatus.OPERATIONAL,
        emergencyCapability: 'TRAUMA,ICU,CARDIAC',
        phone: '+912212345678',
        email: 'emergency@stc.org',
      },
    });

    await prisma.hospitalResource.create({
      data: {
        hospitalId: seededHospital.id,
        type: ResourceType.ICU,
        status: ResourceStatus.AVAILABLE,
        quantity: 10,
        availableQuantity: 5,
      },
    });

    seededAmbulance = await prisma.ambulance.create({
      data: {
        registrationNumber: 'MH01-RAAH-9999',
        callSign: 'AMB-99',
        type: 'ALS',
        status: AmbulanceStatus.AVAILABLE,
        isAvailable: true,
        currentLatitude: 18.9400,
        currentLongitude: 72.8350,
        hospitalId: seededHospital.id,
      },
    });

    seededDispatcher = await prisma.user.create({
      data: {
        name: 'Dispatcher Dan',
        email: 'dan-dispatcher@raah.care',
        role: UserRole.DISPATCHER,
      },
    });

    seededParamedic = await prisma.user.create({
      data: {
        name: 'Paramedic Priya',
        email: 'priya-paramedic@raah.care',
        role: UserRole.PARAMEDIC,
        ambulanceId: seededAmbulance.id,
      },
    });

    seededDoctor = await prisma.user.create({
      data: {
        name: 'Dr. Nair',
        email: 'nair-doctor@hospital.org',
        role: UserRole.DOCTOR,
        hospitalId: seededHospital.id,
      },
    });

    seededPatient = await prisma.patient.create({
      data: {
        fullName: 'Aarav Mehta',
        phoneNumber: '+919876543210',
        gender: 'MALE',
        medicalHistory: 'None',
      },
    });
  }, 30000);

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
    if (serverInstance) {
      await serverInstance.stop();
    }
    delete process.env.TEST_DATABASE_URL;
  });

  // ─── Step 1: Create Emergency ─────────────────────────────────────────────

  it('Step 1 — POST /emergencies persists new emergency in database with CREATED status', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .send({
        patientId: seededPatient.id,
        symptoms: 'Acute chest pain radiating to left arm',
        incidentAddress: 'Nariman Point, Mumbai',
        incidentLatitude: 18.9256,
        incidentLongitude: 72.8242,
        priority: 'CRITICAL',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.caseNumber).toMatch(/^RAAH-\d{4}-\d+/);
    expect(res.body.status).toBe(CaseStatus.CREATED);

    emergencyCaseId = res.body.id;

    // Verify persistence in real database
    const persisted = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    expect(persisted).not.toBeNull();
    expect(persisted?.caseNumber).toBe(res.body.caseNumber);
    expect(persisted?.status).toBe(CaseStatus.CREATED);
    expect(persisted?.priority).toBe('CRITICAL');

    // Verify CaseEvent was persisted
    const event = await prisma.caseEvent.findFirst({
      where: { caseId: emergencyCaseId, eventType: CaseEventType.CASE_CREATED },
    });
    expect(event).not.toBeNull();
  });

  // ─── Step 2: Transition to DISPATCHING ───────────────────────────────────

  it('Step 2 — PATCH /emergencies/:id/status updates status to DISPATCHING in database', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emergencies/${emergencyCaseId}/status`)
      .send({ status: 'DISPATCHING' })
      .expect(200);

    expect(res.body.status).toBe(CaseStatus.DISPATCHING);

    const persisted = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    expect(persisted?.status).toBe(CaseStatus.DISPATCHING);
  });

  // ─── Step 3: Assign Ambulance ─────────────────────────────────────────────

  it('Step 3 — POST /emergencies/:id/assignments transactionally assigns ambulance and updates case', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/emergencies/${emergencyCaseId}/assignments`)
      .send({
        ambulanceId: seededAmbulance.id,
        dispatcherId: seededDispatcher.id,
        notes: 'Priority dispatch for ALS unit',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe(AssignmentStatus.ASSIGNED);
    assignmentId = res.body.id;

    // Verify persisted Assignment
    const persistedAssignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    expect(persistedAssignment?.status).toBe(AssignmentStatus.ASSIGNED);

    // Verify persisted Ambulance state transition
    const persistedAmbulance = await prisma.ambulance.findUnique({
      where: { id: seededAmbulance.id },
    });
    expect(persistedAmbulance?.status).toBe(AmbulanceStatus.ASSIGNED);
    expect(persistedAmbulance?.isAvailable).toBe(false);

    // Verify persisted EmergencyCase state transition
    const persistedCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    expect(persistedCase?.status).toBe(CaseStatus.AMBULANCE_ASSIGNED);

    // Verify CaseEvent
    const event = await prisma.caseEvent.findFirst({
      where: { caseId: emergencyCaseId, eventType: CaseEventType.AMBULANCE_ASSIGNED },
    });
    expect(event).not.toBeNull();
  });

  // ─── Step 4: Driver Accepts Assignment ────────────────────────────────────

  it('Step 4 — PATCH /assignments/:id/accept updates assignment status to ACCEPTED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/assignments/${assignmentId}/accept`)
      .send({ notes: 'Dispatched and responding' })
      .expect(200);

    expect(res.body.status).toBe(AssignmentStatus.ACCEPTED);

    const persistedAssignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    expect(persistedAssignment?.status).toBe(AssignmentStatus.ACCEPTED);
    expect(persistedAssignment?.acceptedAt).not.toBeNull();
  });

  // ─── Step 5: En-Route to Scene ───────────────────────────────────────────

  it('Step 5 — PATCH /assignments/:id/status (EN_ROUTE) updates ambulance and case to EN_ROUTE', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/assignments/${assignmentId}/status`)
      .send({ status: 'EN_ROUTE' })
      .expect(200);

    expect(res.body.status).toBe(AssignmentStatus.EN_ROUTE);

    const persistedAssignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    const persistedAmbulance = await prisma.ambulance.findUnique({
      where: { id: seededAmbulance.id },
    });
    const persistedCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });

    expect(persistedAssignment?.status).toBe(AssignmentStatus.EN_ROUTE);
    expect(persistedAmbulance?.status).toBe(AmbulanceStatus.EN_ROUTE);
    expect(persistedCase?.status).toBe(CaseStatus.AMBULANCE_EN_ROUTE);
  });

  // ─── Step 6: Arrived at Scene ────────────────────────────────────────────

  it('Step 6 — PATCH /assignments/:id/status (ARRIVED_AT_SCENE) updates case to ARRIVED_AT_SCENE', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/assignments/${assignmentId}/status`)
      .send({ status: 'ARRIVED_AT_SCENE' })
      .expect(200);

    expect(res.body.status).toBe(AssignmentStatus.ARRIVED_AT_SCENE);

    const persistedAmbulance = await prisma.ambulance.findUnique({
      where: { id: seededAmbulance.id },
    });
    const persistedCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });

    expect(persistedAmbulance?.status).toBe(AmbulanceStatus.AT_SCENE);
    expect(persistedCase?.status).toBe(CaseStatus.ARRIVED_AT_SCENE);
  });

  // ─── Step 7: Patient Onboard ──────────────────────────────────────────────

  it('Step 7 — PATCH /assignments/:id/status (PATIENT_ONBOARD) updates case to PATIENT_ONBOARD', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/assignments/${assignmentId}/status`)
      .send({ status: 'PATIENT_ONBOARD' })
      .expect(200);

    expect(res.body.status).toBe(AssignmentStatus.PATIENT_ONBOARD);

    const persistedAmbulance = await prisma.ambulance.findUnique({
      where: { id: seededAmbulance.id },
    });
    const persistedCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });

    expect(persistedAmbulance?.status).toBe(AmbulanceStatus.PATIENT_ONBOARD);
    expect(persistedCase?.status).toBe(CaseStatus.PATIENT_ONBOARD);
  });

  // ─── Step 8: Hospital Recommendations ────────────────────────────────────

  it('Step 8 — GET /emergencies/:id/hospital-recommendations computes candidates from real hospital data', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/emergencies/${emergencyCaseId}/hospital-recommendations`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const match = res.body.find(
      (r: { hospitalId: string }) => r.hospitalId === seededHospital.id,
    );
    expect(match).toBeDefined();
    expect(match.isEligible).toBe(true);
    expect(match.name).toBe('State Trauma Center');
  });

  // ─── Step 9: Select Destination ──────────────────────────────────────────

  it('Step 9 — PATCH /emergencies/:id/destination persists destination hospital on case', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emergencies/${emergencyCaseId}/destination`)
      .send({ hospitalId: seededHospital.id })
      .expect(200);

    expect(res.body.status).toBe(CaseStatus.HOSPITAL_SELECTED);
    expect(res.body.destinationHospitalId).toBe(seededHospital.id);

    // Verify in database
    const persistedCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    expect(persistedCase?.status).toBe(CaseStatus.HOSPITAL_SELECTED);
    expect(persistedCase?.destinationHospitalId).toBe(seededHospital.id);

    const event = await prisma.caseEvent.findFirst({
      where: { caseId: emergencyCaseId, eventType: CaseEventType.HOSPITAL_SELECTED },
    });
    expect(event).not.toBeNull();
  });

  // ─── Step 10: En-Route to Hospital ───────────────────────────────────────

  it('Step 10 — PATCH /emergencies/:id/status updates status to EN_ROUTE_TO_HOSPITAL', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emergencies/${emergencyCaseId}/status`)
      .send({ status: 'EN_ROUTE_TO_HOSPITAL' })
      .expect(200);

    expect(res.body.status).toBe(CaseStatus.EN_ROUTE_TO_HOSPITAL);

    const persistedCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    expect(persistedCase?.status).toBe(CaseStatus.EN_ROUTE_TO_HOSPITAL);
  });

  // ─── Step 11: Arrived at Hospital ────────────────────────────────────────

  it('Step 11 — PATCH /emergencies/:id/status updates status to ARRIVED_AT_HOSPITAL', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emergencies/${emergencyCaseId}/status`)
      .send({ status: 'ARRIVED_AT_HOSPITAL' })
      .expect(200);

    expect(res.body.status).toBe(CaseStatus.ARRIVED_AT_HOSPITAL);

    const persistedCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    expect(persistedCase?.status).toBe(CaseStatus.ARRIVED_AT_HOSPITAL);

    const event = await prisma.caseEvent.findFirst({
      where: { caseId: emergencyCaseId, eventType: CaseEventType.PATIENT_ARRIVED },
    });
    expect(event).not.toBeNull();
  });

  // ─── Step 12: Initiate Handover ───────────────────────────────────────────

  it('Step 12 — POST /handovers creates handover record and updates case to HANDOVER_IN_PROGRESS', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/handovers')
      .send({
        caseId: emergencyCaseId,
        paramedicId: seededParamedic.id,
        receivingDoctorId: seededDoctor.id,
        clinicalSummary: 'Patient stable, pain managed with nitro and aspirin',
        patientCondition: 'Alert, vitals stable',
        vitals: {
          heartRate: 78,
          bloodPressureSystolic: 124,
          bloodPressureDiastolic: 82,
          oxygenSaturation: 98,
        },
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe(HandoverStatus.IN_PROGRESS);
    handoverId = res.body.id;

    // Verify in database
    const persistedHandover = await prisma.handover.findUnique({
      where: { id: handoverId },
    });
    expect(persistedHandover?.status).toBe(HandoverStatus.IN_PROGRESS);
    expect(persistedHandover?.caseId).toBe(emergencyCaseId);
    expect(persistedHandover?.hospitalId).toBe(seededHospital.id);
    expect(persistedHandover?.ambulanceId).toBe(seededAmbulance.id);

    const persistedCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    expect(persistedCase?.status).toBe(CaseStatus.HANDOVER_IN_PROGRESS);

    const event = await prisma.caseEvent.findFirst({
      where: { caseId: emergencyCaseId, eventType: CaseEventType.HANDOVER_STARTED },
    });
    expect(event).not.toBeNull();
  });

  // ─── Step 13: Complete Handover ───────────────────────────────────────────

  it('Step 13 — POST /handovers/:id/complete resolves case, completes assignment, and releases ambulance', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/handovers/${handoverId}/complete`)
      .send({ notes: 'Clinical care transfer completed. Patient in Bay 3.' })
      .expect(200);

    expect(res.body.status).toBe(HandoverStatus.COMPLETED);

    // Verify all final state mutations in the real database sequentially
    const finalCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    const finalAssignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    const finalAmbulance = await prisma.ambulance.findUnique({
      where: { id: seededAmbulance.id },
    });
    const finalHandover = await prisma.handover.findUnique({
      where: { id: handoverId },
    });

    expect(finalCase?.status).toBe(CaseStatus.COMPLETED);
    expect(finalCase?.resolvedAt).not.toBeNull();

    expect(finalAssignment?.status).toBe(AssignmentStatus.COMPLETED);
    expect(finalAssignment?.completedAt).not.toBeNull();

    expect(finalAmbulance?.status).toBe(AmbulanceStatus.AVAILABLE);
    expect(finalAmbulance?.isAvailable).toBe(true);

    expect(finalHandover?.status).toBe(HandoverStatus.COMPLETED);
    expect(finalHandover?.handoverCompletedAt).not.toBeNull();
  });

  // ─── Step 14: Comprehensive Verification of Final Persisted State ─────────

  it('Step 14 — Comprehensive verification of persisted database state and lifecycle events', async () => {
    // 1. EmergencyCase is COMPLETED with resolvedAt populated
    const caseRecord = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
    });
    expect(caseRecord?.status).toBe(CaseStatus.COMPLETED);
    expect(caseRecord?.resolvedAt).toBeInstanceOf(Date);
    expect(caseRecord?.destinationHospitalId).toBe(seededHospital.id);

    // 2. Handover is COMPLETED with handoverCompletedAt populated
    const handoverRecord = await prisma.handover.findUnique({
      where: { id: handoverId },
    });
    expect(handoverRecord?.status).toBe(HandoverStatus.COMPLETED);
    expect(handoverRecord?.handoverCompletedAt).toBeInstanceOf(Date);

    // 3. No active handover remains for this case
    const activeHandovers = await prisma.handover.findMany({
      where: {
        caseId: emergencyCaseId,
        status: { in: [HandoverStatus.PENDING, HandoverStatus.IN_PROGRESS] },
      },
    });
    expect(activeHandovers).toHaveLength(0);

    // 4. Assignment is COMPLETED with completedAt populated
    const assignmentRecord = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    expect(assignmentRecord?.status).toBe(AssignmentStatus.COMPLETED);
    expect(assignmentRecord?.completedAt).toBeInstanceOf(Date);

    // 5. Ambulance is AVAILABLE and isAvailable = true
    const ambulanceRecord = await prisma.ambulance.findUnique({
      where: { id: seededAmbulance.id },
    });
    expect(ambulanceRecord?.status).toBe(AmbulanceStatus.AVAILABLE);
    expect(ambulanceRecord?.isAvailable).toBe(true);

    // 6. Verify full sequence of persisted CaseEvents
    const events = await prisma.caseEvent.findMany({
      where: { caseId: emergencyCaseId },
      orderBy: { createdAt: 'asc' },
    });

    const recordedEventTypes = events.map((e) => e.eventType);

    expect(recordedEventTypes).toContain(CaseEventType.CASE_CREATED);
    expect(recordedEventTypes).toContain(CaseEventType.AMBULANCE_ASSIGNED);
    expect(recordedEventTypes).toContain(CaseEventType.AMBULANCE_ACCEPTED);
    expect(recordedEventTypes).toContain(CaseEventType.AMBULANCE_EN_ROUTE);
    expect(recordedEventTypes).toContain(CaseEventType.ARRIVED_AT_SCENE);
    expect(recordedEventTypes).toContain(CaseEventType.PATIENT_ONBOARD);
    expect(recordedEventTypes).toContain(CaseEventType.HOSPITAL_SELECTED);
    expect(recordedEventTypes).toContain(CaseEventType.PATIENT_ARRIVED);
    expect(recordedEventTypes).toContain(CaseEventType.HANDOVER_STARTED);
    expect(recordedEventTypes).toContain(CaseEventType.HANDOVER_COMPLETED);
    expect(recordedEventTypes).toContain(CaseEventType.CASE_COMPLETED);
  });
});
