import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi, describe, beforeEach, it, afterEach } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('AppController, Emergencies, Ambulances & Assignments (e2e)', () => {
  let app: INestApplication<App>;
  let prismaMock: {
    $connect: ReturnType<typeof vi.fn>;
    $disconnect: ReturnType<typeof vi.fn>;
    patient: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
    emergencyCase: {
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
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
      findUnique: ReturnType<typeof vi.fn>;
    };
    caseEvent: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      patient: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
      emergencyCase: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
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
        findUnique: vi.fn(),
      },
      caseEvent: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: typeof prismaMock) => unknown) =>
        cb(prismaMock),
      ),
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

  // ─── Health ─────────────────────────────────────────────────────────────

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', service: 'raah-care-backend' });
  });

  // ─── Emergencies ────────────────────────────────────────────────────────

  it('/api/v1/emergencies (POST) rejects empty payload', () => {
    return request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .send({})
      .expect(400);
  });

  it('/api/v1/emergencies (POST) rejects non-whitelisted fields', () => {
    return request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .send({
        incidentLatitude: 19.076,
        incidentLongitude: 72.8777,
        incidentAddress: 'Test Address',
        arbitraryField: 'not allowed',
      })
      .expect(400);
  });

  // ─── Ambulances ──────────────────────────────────────────────────────────

  it('/api/v1/ambulances (POST) rejects empty payload', () => {
    return request(app.getHttpServer())
      .post('/api/v1/ambulances')
      .send({})
      .expect(400);
  });

  it('/api/v1/ambulances (POST) rejects non-whitelisted fields', () => {
    return request(app.getHttpServer())
      .post('/api/v1/ambulances')
      .send({
        registrationNumber: 'MH01-1234',
        callSign: 'RAAH-01',
        secretField: 'not allowed',
      })
      .expect(400);
  });

  it('/api/v1/ambulances (GET) returns paginated list', () => {
    prismaMock.ambulance.findMany.mockResolvedValue([]);
    prismaMock.ambulance.count.mockResolvedValue(0);

    return request(app.getHttpServer())
      .get('/api/v1/ambulances')
      .expect(200)
      .expect({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
  });

  it('/api/v1/ambulances/:id/status (PATCH) rejects invalid status enum', () => {
    return request(app.getHttpServer())
      .patch('/api/v1/ambulances/00000000-0000-0000-0000-000000000001/status')
      .send({ status: 'FLYING' })
      .expect(400);
  });

  // ─── Assignments ─────────────────────────────────────────────────────────

  it('/api/v1/emergencies/:emergencyId/assignments (POST) rejects non-UUID emergency ID', () => {
    return request(app.getHttpServer())
      .post('/api/v1/emergencies/not-a-uuid/assignments')
      .send({ ambulanceId: '00000000-0000-0000-0000-000000000001' })
      .expect(400);
  });

  it('/api/v1/emergencies/:emergencyId/assignments (POST) rejects empty body', () => {
    return request(app.getHttpServer())
      .post('/api/v1/emergencies/00000000-0000-0000-0000-000000000001/assignments')
      .send({})
      .expect(400);
  });

  it('/api/v1/assignments/:id/accept (PATCH) rejects non-UUID assignment ID', () => {
    return request(app.getHttpServer())
      .patch('/api/v1/assignments/not-a-uuid/accept')
      .send({})
      .expect(400);
  });

  it('/api/v1/assignments/:id/reject (PATCH) rejects non-UUID assignment ID', () => {
    return request(app.getHttpServer())
      .patch('/api/v1/assignments/not-a-uuid/reject')
      .send({})
      .expect(400);
  });

  it('/api/v1/assignments/:id/status (PATCH) rejects invalid AssignmentStatus', () => {
    return request(app.getHttpServer())
      .patch('/api/v1/assignments/00000000-0000-0000-0000-000000000001/status')
      .send({ status: 'INVALID_STATUS' })
      .expect(400);
  });
});
