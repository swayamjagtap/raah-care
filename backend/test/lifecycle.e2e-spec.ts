/**
 * M6.1 — Cross-Module Emergency Lifecycle E2E Test
 *
 * Verifies the complete 13-step emergency lifecycle across all backend modules
 * using the same mocked-Prisma pattern as the existing app.e2e-spec.ts harness.
 *
 * Database safety: PrismaService is fully replaced by vi.fn() mocks.
 * No real database connection is made. No migrations are applied.
 *
 * Lifecycle under test:
 *   1.  POST   /api/v1/emergencies                           → CREATED
 *   2.  PATCH  /api/v1/emergencies/:id/status               → DISPATCHING
 *   3.  POST   /api/v1/emergencies/:id/assignments           → AMBULANCE_ASSIGNED
 *   4.  PATCH  /api/v1/assignments/:id/accept               → ACCEPTED
 *   5.  PATCH  /api/v1/assignments/:id/status (EN_ROUTE)    → AMBULANCE_EN_ROUTE
 *   6.  PATCH  /api/v1/assignments/:id/status (ARRIVED_AT_SCENE)
 *   7.  PATCH  /api/v1/assignments/:id/status (PATIENT_ONBOARD)
 *   8.  GET    /api/v1/emergencies/:id/hospital-recommendations
 *   9.  PATCH  /api/v1/emergencies/:id/destination          → HOSPITAL_SELECTED
 *   10. PATCH  /api/v1/emergencies/:id/status               → EN_ROUTE_TO_HOSPITAL
 *   11. PATCH  /api/v1/emergencies/:id/status               → ARRIVED_AT_HOSPITAL
 *   12. POST   /api/v1/handovers                            → HANDOVER_IN_PROGRESS
 *   13. POST   /api/v1/handovers/:id/complete               → COMPLETED
 *
 * Integration rule verified:
 *   - Assignment status transitions drive case status up to PATIENT_ONBOARD.
 *   - Hospital-phase transitions (EN_ROUTE_TO_HOSPITAL, ARRIVED_AT_HOSPITAL)
 *     are intentionally driven through the emergency status endpoint.
 *   - Handover completion resolves the case and releases the ambulance.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import {
  AmbulanceStatus,
  AssignmentStatus,
  CaseStatus,
  HandoverStatus,
  HospitalStatus,
} from './../generated/prisma/enums.js';

// ─── Shared fixture UUIDs (valid RFC 4122 v4) ────────────────────────────────

const CASE_ID = '11111111-1111-4111-8111-111111111111';
const AMBULANCE_ID = '22222222-2222-4222-8222-222222222222';
const HOSPITAL_ID = '33333333-3333-4333-8333-333333333333';
const ASSIGNMENT_ID = '44444444-4444-4444-8444-444444444444';
const HANDOVER_ID = '55555555-5555-4555-8555-555555555555';

// ─── Prisma mock type ────────────────────────────────────────────────────────

type PrismaMock = {
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
  $transaction: ReturnType<typeof vi.fn>;
  patient: { findUnique: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
  emergencyCase: {
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  ambulance: {
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  assignment: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  hospital: {
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  hospitalResource: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  caseEvent: { create: ReturnType<typeof vi.fn> };
  handover: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPrismaMock(): PrismaMock {
  const mock: PrismaMock = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
    patient: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    emergencyCase: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    ambulance: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    assignment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    hospital: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    hospitalResource: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    caseEvent: { create: vi.fn() },
    handover: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };

  // Default $transaction: execute the callback with the mock itself as the tx
  mock.$transaction.mockImplementation(
    async (cb: (tx: PrismaMock) => unknown) => cb(mock),
  );

  return mock;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCase(status: CaseStatus, extra: object = {}) {
  return {
    id: CASE_ID,
    caseNumber: 'RAAH-001',
    status,
    priority: 'HIGH',
    description: 'Chest pain',
    incidentAddress: 'Marine Drive, Mumbai',
    incidentLatitude: 18.944,
    incidentLongitude: 72.823,
    patientId: null,
    initiatorId: null,
    destinationHospitalId: null,
    resolvedAt: null,
    createdAt: new Date('2026-11-24T10:00:00Z'),
    updatedAt: new Date('2026-11-24T10:00:00Z'),
    ...extra,
  };
}

function makeAmbulance(status: AmbulanceStatus, available: boolean) {
  return {
    id: AMBULANCE_ID,
    registrationNumber: 'MH01-RAAH-01',
    callSign: 'RAAH-AMB-01',
    type: 'ALS',
    status,
    isAvailable: available,
    currentLatitude: 18.930,
    currentLongitude: 72.831,
  };
}

function makeAssignment(
  status: AssignmentStatus,
  caseStatus: CaseStatus = CaseStatus.AMBULANCE_ASSIGNED,
) {
  return {
    id: ASSIGNMENT_ID,
    caseId: CASE_ID,
    ambulanceId: AMBULANCE_ID,
    dispatcherId: null,
    status,
    notes: null,
    assignedAt: new Date(),
    acceptedAt: null,
    rejectedAt: null,
    arrivedAtSceneAt: null,
    patientOnboardAt: null,
    completedAt: null,
    cancelledAt: null,
    ambulance: {
      id: AMBULANCE_ID,
      callSign: 'RAAH-AMB-01',
      type: 'ALS',
      status: AmbulanceStatus.ASSIGNED,
    },
    dispatcher: null,
    case: {
      id: CASE_ID,
      caseNumber: 'RAAH-001',
      status: caseStatus,
      priority: 'HIGH',
    },
  };
}

function makeHospital() {
  return {
    id: HOSPITAL_ID,
    name: 'City Emergency Hospital',
    code: 'CEH-01',
    address: 'Worli, Mumbai',
    latitude: 18.998,
    longitude: 72.816,
    status: HospitalStatus.OPERATIONAL,
    emergencyCapacity: 20,
    emergencyCapability: ['TRAUMA', 'ICU'],
    contactNumber: '+912212345678',
    email: 'emergency@ceh.org',
    isActive: true,
    resources: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeHandover(status: HandoverStatus) {
  return {
    id: HANDOVER_ID,
    caseId: CASE_ID,
    ambulanceId: AMBULANCE_ID,
    hospitalId: HOSPITAL_ID,
    paramedicId: null,
    receivingDoctorId: null,
    status,
    clinicalSummary: 'Patient stable, chest pain 7/10',
    patientCondition: 'Conscious',
    vitals: null,
    notes: null,
    handoverStartedAt: new Date(),
    handoverCompletedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    rejectionReason: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    case: { id: CASE_ID, caseNumber: 'RAAH-001', status: CaseStatus.HANDOVER_IN_PROGRESS, priority: 'HIGH' },
    ambulance: { id: AMBULANCE_ID, callSign: 'RAAH-AMB-01', registrationNumber: 'MH01-RAAH-01', status: AmbulanceStatus.PATIENT_ONBOARD },
    hospital: { id: HOSPITAL_ID, name: 'City Emergency Hospital', code: 'CEH-01' },
    paramedic: null,
    receivingDoctor: null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('M6.1 — Full Emergency Lifecycle (E2E, mocked Prisma)', () => {
  let app: INestApplication<App>;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();

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

  // ─── Step 1: Create Emergency ─────────────────────────────────────────────

  it('Step 1 — POST /emergencies creates a new emergency in CREATED status', async () => {
    const createdCase = makeCase(CaseStatus.CREATED);
    prismaMock.emergencyCase.count.mockResolvedValue(0);
    prismaMock.emergencyCase.findUnique.mockResolvedValue(null);
    prismaMock.emergencyCase.create.mockResolvedValue(createdCase);

    const res = await request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .send({
        symptoms: 'Chest pain',
        incidentAddress: 'Marine Drive, Mumbai',
        incidentLatitude: 18.944,
        incidentLongitude: 72.823,
        priority: 'HIGH',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      id: CASE_ID,
      status: CaseStatus.CREATED,
      caseNumber: 'RAAH-001',
    });
    expect(prismaMock.emergencyCase.create).toHaveBeenCalledOnce();
  });

  // ─── Step 2: Transition to DISPATCHING ───────────────────────────────────

  it('Step 2 — PATCH /emergencies/:id/status transitions CREATED → DISPATCHING', async () => {
    const currentCase = makeCase(CaseStatus.CREATED);
    const updatedCase = makeCase(CaseStatus.DISPATCHING);

    prismaMock.emergencyCase.findUnique.mockResolvedValue(currentCase);
    prismaMock.emergencyCase.update.mockResolvedValue(updatedCase);
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emergencies/${CASE_ID}/status`)
      .send({ status: 'DISPATCHING' })
      .expect(200);

    expect(res.body).toMatchObject({ id: CASE_ID, status: CaseStatus.DISPATCHING });
    expect(prismaMock.emergencyCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CASE_ID },
        data: expect.objectContaining({ status: CaseStatus.DISPATCHING }),
      }),
    );
  });

  // ─── Step 3: Assign Ambulance ─────────────────────────────────────────────

  it('Step 3 — POST /emergencies/:id/assignments creates assignment → case becomes AMBULANCE_ASSIGNED', async () => {
    // Service reads: emergency, ambulance, existing active assignment, creates all inside $transaction
    const dispatchingCase = makeCase(CaseStatus.DISPATCHING);
    const availableAmbulance = makeAmbulance(AmbulanceStatus.AVAILABLE, true);
    const createdAssignment = makeAssignment(AssignmentStatus.ASSIGNED);

    prismaMock.emergencyCase.findUnique.mockResolvedValue(dispatchingCase);
    prismaMock.ambulance.findUnique.mockResolvedValue(availableAmbulance);
    prismaMock.assignment.findFirst.mockResolvedValue(null); // no active assignment

    // Inside transaction: ambulance.updateMany, emergencyCase.update, assignment.create, caseEvent.create
    prismaMock.ambulance.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.emergencyCase.update.mockResolvedValue(makeCase(CaseStatus.AMBULANCE_ASSIGNED));
    prismaMock.assignment.create.mockResolvedValue(createdAssignment);
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post(`/api/v1/emergencies/${CASE_ID}/assignments`)
      .send({ ambulanceId: AMBULANCE_ID })
      .expect(201);

    expect(res.body).toMatchObject({
      id: ASSIGNMENT_ID,
      caseId: CASE_ID,
      ambulanceId: AMBULANCE_ID,
      status: AssignmentStatus.ASSIGNED,
    });

    // Verify the case was updated to AMBULANCE_ASSIGNED inside the transaction
    expect(prismaMock.emergencyCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: CaseStatus.AMBULANCE_ASSIGNED }),
      }),
    );
  });

  // ─── Step 4: Driver Accepts ───────────────────────────────────────────────

  it('Step 4 — PATCH /assignments/:id/accept transitions ASSIGNED → ACCEPTED', async () => {
    const assignedAssignment = makeAssignment(AssignmentStatus.ASSIGNED);
    const acceptedAssignment = { ...assignedAssignment, status: AssignmentStatus.ACCEPTED };

    prismaMock.assignment.findUnique.mockResolvedValue(assignedAssignment);
    prismaMock.assignment.update.mockResolvedValue(acceptedAssignment);
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/assignments/${ASSIGNMENT_ID}/accept`)
      .send({})
      .expect(200);

    expect(res.body).toMatchObject({
      id: ASSIGNMENT_ID,
      status: AssignmentStatus.ACCEPTED,
    });
  });

  // ─── Step 5: En-Route to Scene ───────────────────────────────────────────

  it('Step 5 — PATCH /assignments/:id/status EN_ROUTE → case becomes AMBULANCE_EN_ROUTE', async () => {
    const acceptedAssignment = {
      ...makeAssignment(AssignmentStatus.ACCEPTED),
      ambulance: makeAmbulance(AmbulanceStatus.ASSIGNED, false),
    };
    const enRouteAssignment = { ...acceptedAssignment, status: AssignmentStatus.EN_ROUTE };

    prismaMock.assignment.findUnique.mockResolvedValue(acceptedAssignment);
    prismaMock.assignment.update.mockResolvedValue(enRouteAssignment);
    prismaMock.ambulance.update.mockResolvedValue({});
    prismaMock.emergencyCase.update.mockResolvedValue(makeCase(CaseStatus.AMBULANCE_EN_ROUTE));
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/assignments/${ASSIGNMENT_ID}/status`)
      .send({ status: 'EN_ROUTE' })
      .expect(200);

    expect(res.body).toMatchObject({ status: AssignmentStatus.EN_ROUTE });

    // Case status driven by assignment transition
    expect(prismaMock.emergencyCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: CaseStatus.AMBULANCE_EN_ROUTE }),
      }),
    );
  });

  // ─── Step 6: Arrived at Scene ────────────────────────────────────────────

  it('Step 6 — PATCH /assignments/:id/status ARRIVED_AT_SCENE → case becomes ARRIVED_AT_SCENE', async () => {
    const enRouteAssignment = {
      ...makeAssignment(AssignmentStatus.EN_ROUTE),
      ambulance: makeAmbulance(AmbulanceStatus.EN_ROUTE, false),
    };
    const arrivedAssignment = { ...enRouteAssignment, status: AssignmentStatus.ARRIVED_AT_SCENE };

    prismaMock.assignment.findUnique.mockResolvedValue(enRouteAssignment);
    prismaMock.assignment.update.mockResolvedValue(arrivedAssignment);
    prismaMock.ambulance.update.mockResolvedValue({});
    prismaMock.emergencyCase.update.mockResolvedValue(makeCase(CaseStatus.ARRIVED_AT_SCENE));
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/assignments/${ASSIGNMENT_ID}/status`)
      .send({ status: 'ARRIVED_AT_SCENE' })
      .expect(200);

    expect(res.body).toMatchObject({ status: AssignmentStatus.ARRIVED_AT_SCENE });
    expect(prismaMock.emergencyCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: CaseStatus.ARRIVED_AT_SCENE }),
      }),
    );
  });

  // ─── Step 7: Patient Onboard ──────────────────────────────────────────────

  it('Step 7 — PATCH /assignments/:id/status PATIENT_ONBOARD → case becomes PATIENT_ONBOARD', async () => {
    const arrivedAssignment = {
      ...makeAssignment(AssignmentStatus.ARRIVED_AT_SCENE),
      ambulance: makeAmbulance(AmbulanceStatus.AT_SCENE, false),
    };
    const onboardAssignment = { ...arrivedAssignment, status: AssignmentStatus.PATIENT_ONBOARD };

    prismaMock.assignment.findUnique.mockResolvedValue(arrivedAssignment);
    prismaMock.assignment.update.mockResolvedValue(onboardAssignment);
    prismaMock.ambulance.update.mockResolvedValue({});
    prismaMock.emergencyCase.update.mockResolvedValue(makeCase(CaseStatus.PATIENT_ONBOARD));
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/assignments/${ASSIGNMENT_ID}/status`)
      .send({ status: 'PATIENT_ONBOARD' })
      .expect(200);

    expect(res.body).toMatchObject({ status: AssignmentStatus.PATIENT_ONBOARD });
    expect(prismaMock.emergencyCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: CaseStatus.PATIENT_ONBOARD }),
      }),
    );
  });

  // ─── Step 8: Hospital Recommendations ────────────────────────────────────

  it('Step 8 — GET /emergencies/:id/hospital-recommendations returns ranked list', async () => {
    const patientOnboardCase = makeCase(CaseStatus.PATIENT_ONBOARD);
    const hospital = makeHospital();

    prismaMock.emergencyCase.findUnique.mockResolvedValue(patientOnboardCase);
    prismaMock.hospital.findMany.mockResolvedValue([hospital]);
    prismaMock.hospitalResource.findMany.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/emergencies/${CASE_ID}/hospital-recommendations`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      hospitalId: HOSPITAL_ID,
      name: 'City Emergency Hospital',
      tier: 'SUITABLE',
    });
  });

  // ─── Step 9: Select Destination ──────────────────────────────────────────

  it('Step 9 — PATCH /emergencies/:id/destination selects hospital → case becomes HOSPITAL_SELECTED', async () => {
    const patientOnboardCase = makeCase(CaseStatus.PATIENT_ONBOARD);
    const hospital = makeHospital();
    const selectedCase = makeCase(CaseStatus.HOSPITAL_SELECTED, {
      destinationHospitalId: HOSPITAL_ID,
    });

    prismaMock.emergencyCase.findUnique.mockResolvedValue(patientOnboardCase);
    prismaMock.hospital.findUnique.mockResolvedValue(hospital);
    prismaMock.hospitalResource.findMany.mockResolvedValue([]);
    prismaMock.emergencyCase.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.emergencyCase.findUnique
      .mockResolvedValueOnce(patientOnboardCase)
      .mockResolvedValue(selectedCase);
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emergencies/${CASE_ID}/destination`)
      .send({ hospitalId: HOSPITAL_ID })
      .expect(200);

    expect(res.body).toMatchObject({
      id: CASE_ID,
      status: CaseStatus.HOSPITAL_SELECTED,
      destinationHospitalId: HOSPITAL_ID,
    });
  });

  // ─── Step 10: En-Route to Hospital ───────────────────────────────────────

  it('Step 10 — PATCH /emergencies/:id/status transitions HOSPITAL_SELECTED → EN_ROUTE_TO_HOSPITAL', async () => {
    // Integration rule: hospital-phase case transitions are driven by the emergency
    // status endpoint, NOT by the assignment service. This is by design.
    const hospitalSelectedCase = makeCase(CaseStatus.HOSPITAL_SELECTED, {
      destinationHospitalId: HOSPITAL_ID,
    });
    const enRouteCase = makeCase(CaseStatus.EN_ROUTE_TO_HOSPITAL, {
      destinationHospitalId: HOSPITAL_ID,
    });

    prismaMock.emergencyCase.findUnique.mockResolvedValue(hospitalSelectedCase);
    prismaMock.emergencyCase.update.mockResolvedValue(enRouteCase);
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emergencies/${CASE_ID}/status`)
      .send({ status: 'EN_ROUTE_TO_HOSPITAL' })
      .expect(200);

    expect(res.body).toMatchObject({
      id: CASE_ID,
      status: CaseStatus.EN_ROUTE_TO_HOSPITAL,
    });
  });

  // ─── Step 11: Arrived at Hospital ────────────────────────────────────────

  it('Step 11 — PATCH /emergencies/:id/status transitions EN_ROUTE_TO_HOSPITAL → ARRIVED_AT_HOSPITAL', async () => {
    // Integration rule: This transition is owned by the emergency status endpoint.
    // The assignment service has no ARRIVED_AT_HOSPITAL state — this is intentional:
    // physical arrival at the hospital is an emergency-level event, not assignment-level.
    const enRouteCase = makeCase(CaseStatus.EN_ROUTE_TO_HOSPITAL, {
      destinationHospitalId: HOSPITAL_ID,
    });
    const arrivedCase = makeCase(CaseStatus.ARRIVED_AT_HOSPITAL, {
      destinationHospitalId: HOSPITAL_ID,
    });

    prismaMock.emergencyCase.findUnique.mockResolvedValue(enRouteCase);
    prismaMock.emergencyCase.update.mockResolvedValue(arrivedCase);
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emergencies/${CASE_ID}/status`)
      .send({ status: 'ARRIVED_AT_HOSPITAL' })
      .expect(200);

    expect(res.body).toMatchObject({
      id: CASE_ID,
      status: CaseStatus.ARRIVED_AT_HOSPITAL,
    });
  });

  // ─── Step 12: Initiate Handover ───────────────────────────────────────────

  it('Step 12 — POST /handovers initiates handover → case becomes HANDOVER_IN_PROGRESS', async () => {
    const arrivedCase = makeCase(CaseStatus.ARRIVED_AT_HOSPITAL, {
      destinationHospitalId: HOSPITAL_ID,
      destinationHospital: { id: HOSPITAL_ID, name: 'City Emergency Hospital', code: 'CEH-01' },
    });
    const activePationtOnboardAssignment = {
      ...makeAssignment(AssignmentStatus.PATIENT_ONBOARD),
      ambulance: makeAmbulance(AmbulanceStatus.PATIENT_ONBOARD, false),
    };
    const createdHandover = makeHandover(HandoverStatus.IN_PROGRESS);

    // HandoversService reads:
    //   1. emergencyCase.findUnique (with destinationHospital)
    //   2. assignment.findFirst     (PATIENT_ONBOARD active assignment)
    //   3. handover.findFirst       (existing active handover check → null)
    // Then inside $transaction:
    //   4. handover.create
    //   5. emergencyCase.update     (→ HANDOVER_IN_PROGRESS)
    //   6. caseEvent.create
    prismaMock.emergencyCase.findUnique.mockResolvedValue(arrivedCase);
    prismaMock.assignment.findFirst.mockResolvedValue(activePationtOnboardAssignment);
    prismaMock.handover.findFirst.mockResolvedValue(null); // no existing active handover
    prismaMock.handover.create.mockResolvedValue(createdHandover);
    prismaMock.emergencyCase.update.mockResolvedValue(
      makeCase(CaseStatus.HANDOVER_IN_PROGRESS, { destinationHospitalId: HOSPITAL_ID }),
    );
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post('/api/v1/handovers')
      .send({
        caseId: CASE_ID,
        clinicalSummary: 'Patient stable, chest pain 7/10',
        patientCondition: 'Conscious',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      id: HANDOVER_ID,
      caseId: CASE_ID,
      status: HandoverStatus.IN_PROGRESS,
      clinicalDisclaimer: expect.any(String),
    });

    // Case must have been transitioned to HANDOVER_IN_PROGRESS
    expect(prismaMock.emergencyCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CASE_ID },
        data: expect.objectContaining({ status: CaseStatus.HANDOVER_IN_PROGRESS }),
      }),
    );

    // HANDOVER_STARTED event must have been recorded
    expect(prismaMock.caseEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          caseId: CASE_ID,
          eventType: 'HANDOVER_STARTED',
        }),
      }),
    );
  });

  // ─── Step 13: Complete Handover ───────────────────────────────────────────

  it('Step 13 — POST /handovers/:id/complete resolves case → COMPLETED, releases ambulance', async () => {
    const inProgressHandover = makeHandover(HandoverStatus.IN_PROGRESS);
    const completedHandover = {
      ...inProgressHandover,
      status: HandoverStatus.COMPLETED,
      handoverCompletedAt: new Date(),
      case: { ...inProgressHandover.case, status: CaseStatus.COMPLETED },
    };

    // HandoversService.complete reads:
    //   1. handover.findUnique (with full includes)
    // Then inside $transaction:
    //   2. handover.update     (→ COMPLETED)
    //   3. emergencyCase.update (→ COMPLETED, resolvedAt)
    //   4. assignment.update   (→ COMPLETED, completedAt)
    //   5. ambulance.update    (→ AVAILABLE, isAvailable: true)
    //   6. caseEvent.create    (HANDOVER_COMPLETED)
    //   7. caseEvent.create    (CASE_COMPLETED)
    prismaMock.handover.findUnique.mockResolvedValue({
      ...inProgressHandover,
      case: {
        ...inProgressHandover.case,
        status: CaseStatus.HANDOVER_IN_PROGRESS,
        destinationHospitalId: HOSPITAL_ID,
      },
    });
    prismaMock.assignment.findFirst.mockResolvedValue({
      ...makeAssignment(AssignmentStatus.PATIENT_ONBOARD),
      ambulance: makeAmbulance(AmbulanceStatus.PATIENT_ONBOARD, false),
    });
    prismaMock.handover.update.mockResolvedValue(completedHandover);
    prismaMock.emergencyCase.update.mockResolvedValue(
      makeCase(CaseStatus.COMPLETED, { destinationHospitalId: HOSPITAL_ID }),
    );
    prismaMock.assignment.update.mockResolvedValue({
      ...makeAssignment(AssignmentStatus.COMPLETED),
    });
    prismaMock.ambulance.update.mockResolvedValue(
      makeAmbulance(AmbulanceStatus.AVAILABLE, true),
    );
    prismaMock.caseEvent.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post(`/api/v1/handovers/${HANDOVER_ID}/complete`)
      .send({ notes: 'Patient successfully transferred to ED team.' })
      .expect(200);

    expect(res.body).toMatchObject({
      id: HANDOVER_ID,
      status: HandoverStatus.COMPLETED,
    });

    // Case must be resolved
    expect(prismaMock.emergencyCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: CaseStatus.COMPLETED,
          resolvedAt: expect.any(Date),
        }),
      }),
    );

    // Ambulance must be released back to fleet
    expect(prismaMock.ambulance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AmbulanceStatus.AVAILABLE,
          isAvailable: true,
        }),
      }),
    );

    // Both HANDOVER_COMPLETED and CASE_COMPLETED events must be emitted
    const eventCalls = prismaMock.caseEvent.create.mock.calls.map(
      (call) => call[0].data.eventType,
    );
    expect(eventCalls).toContain('HANDOVER_COMPLETED');
    expect(eventCalls).toContain('CASE_COMPLETED');
  });

  // ─── Integration architecture verification ────────────────────────────────

  it('Architecture — hospital-phase transitions use emergency endpoint, not assignment endpoint', () => {
    // This test documents the intentional architectural split:
    //
    // - AssignmentStatus transitions handle: ASSIGNED → ACCEPTED → EN_ROUTE →
    //   ARRIVED_AT_SCENE → PATIENT_ONBOARD
    //   Each drives the corresponding CaseStatus automatically.
    //
    // - After PATIENT_ONBOARD, the case enters the hospital coordination phase.
    //   HOSPITAL_SELECTED, EN_ROUTE_TO_HOSPITAL, and ARRIVED_AT_HOSPITAL are
    //   driven by PATCH /emergencies/:id/status (EmergenciesService).
    //
    // - The assignment service does NOT have an ARRIVED_AT_HOSPITAL state.
    //   This is by design: hospital arrival is an emergency-level event.
    //
    // This test acts as a living documentation assertion.
    const assignmentStatuses = Object.values(AssignmentStatus);
    expect(assignmentStatuses).not.toContain('ARRIVED_AT_HOSPITAL');
    expect(assignmentStatuses).not.toContain('EN_ROUTE_TO_HOSPITAL');
    expect(assignmentStatuses).not.toContain('HOSPITAL_SELECTED');
  });
});
