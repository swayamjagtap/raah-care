import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../generated/prisma/enums.js';

export const TEST_JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET || 'dev-fallback-supabase-jwt-secret-do-not-use-in-production';

const jwtService = new JwtService({
  secret: TEST_JWT_SECRET,
  signOptions: { algorithm: 'HS256' },
});

export const E2E_TEST_USER = {
  id: '00000000-0000-0000-0000-000000000099',
  supabaseId: 'e2e-test-supabase-sub-001',
  role: UserRole.DISPATCHER,
  name: 'E2E Test Dispatcher',
  isActive: true,
  hospitalId: null,
  ambulanceId: null,
};

export const E2E_TEST_ADMIN_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  supabaseId: 'e2e-test-admin-sub-001',
  role: UserRole.SYSTEM_ADMIN,
  name: 'E2E Test Admin',
  isActive: true,
  hospitalId: null,
  ambulanceId: null,
};

export const E2E_TEST_PARAMEDIC_USER = {
  id: '00000000-0000-0000-0000-000000000002',
  supabaseId: 'e2e-test-paramedic-sub-001',
  role: UserRole.PARAMEDIC,
  name: 'E2E Test Paramedic',
  isActive: true,
  hospitalId: null,
  ambulanceId: '00000000-0000-4000-a000-000000000010',
};

export const E2E_TEST_DOCTOR_USER = {
  id: '00000000-0000-0000-0000-000000000003',
  supabaseId: 'e2e-test-doctor-sub-001',
  role: UserRole.DOCTOR,
  name: 'E2E Test Doctor',
  isActive: true,
  hospitalId: '00000000-0000-4000-a000-000000000020',
  ambulanceId: null,
};

export const E2E_TEST_PATIENT_USER = {
  id: '00000000-0000-0000-0000-000000000004',
  supabaseId: 'e2e-test-patient-sub-001',
  role: UserRole.PATIENT,
  name: 'E2E Test Patient',
  isActive: true,
  hospitalId: null,
  ambulanceId: null,
};

export function createTestJwt(sub = E2E_TEST_USER.supabaseId): string {
  return jwtService.sign({ sub });
}

export const E2E_TEST_TOKEN = createTestJwt();
export const E2E_TEST_AUTH_HEADER = `Bearer ${E2E_TEST_TOKEN}`;
export const E2E_TEST_ADMIN_TOKEN = createTestJwt(E2E_TEST_ADMIN_USER.supabaseId);
export const E2E_TEST_ADMIN_AUTH_HEADER = `Bearer ${E2E_TEST_ADMIN_TOKEN}`;
