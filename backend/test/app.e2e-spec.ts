import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi, describe, beforeEach, it, afterEach } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('AppController & Emergencies (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
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
        caseEvent: {
          create: vi.fn(),
        },
        $transaction: vi.fn(),
      })
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

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'raah-care-backend',
      });
  });

  it('/api/v1/emergencies (POST) rejects invalid/empty payload', () => {
    return request(app.getHttpServer())
      .post('/api/v1/emergencies')
      .send({})
      .expect(400);
  });

  it('/api/v1/emergencies (POST) rejects arbitrary non-whitelisted fields', () => {
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

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
