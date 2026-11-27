# RAAH – Changelog

All notable project changes should be recorded in this document.

The changelog tracks meaningful project-level changes. It does not replace Git commit history or pull request descriptions.

## [Unreleased]

### Development

- **27–28 November 2026 — M9.3–M9.7 Finalization, Cura Card & Monorepo Pass:**
  - **M9.3 (Patient Emergency History & Navigation)**: Connected `apps/patient-web` to live backend emergency lifecycle; resolved `/login` → `/register` authentication routing bounce; verified emergency timeline and status polling.
  - **M9.4 (Patient Clinical Profile APIs)**: Created `PatientsModule` with `GET /api/v1/patients/me` and `PATCH /api/v1/patients/me`; wired `MedicalProfilePage.tsx` and `PatientSettingsPage.tsx` to live backend endpoints for allergies, chronic conditions, and emergency contact persistence.
  - **M9.5 (Cura Card Dual-Layer QR System)**:
    - Designed and implemented secure ephemeral QR system: QR encodes transient URL with 256-bit token; zero patient PII embedded in payload.
    - Implemented `CuraCardService` with 5-minute expiry, SHA-256 token hashing, and instant revocation (`POST /cura-card/revoke`).
    - Implemented `POST /cura-card/resolve` restricted to `PARAMEDIC` and `DOCTOR`.
    - Built HTML5 canvas video camera decoding via `jsQR` in `apps/ambulance-web` and `apps/hospital-web` with manual Card ID fallback.
    - Added immutable audit trail via `CuraCardAudit` model capturing lookup timestamps, responder IDs, and outcomes.
  - **M9.6 (Frontend Route Recovery & NestJS Startup Alignment)**:
    - Fixed backend startup issue by setting `"entryFile": "src/main"` in `backend/nest-cli.json`.
    - Added defensive unauthenticated UI fallback cards to `MedicalProfilePage` and `CuraCardPage`, eliminating blank screen errors.
    - Stabilized routing across all four portals (`patient-web`, `ambulance-web`, `hospital-web`, `admin-web`).
  - **M9.7 (Database Schema Alignment & Monorepo Pre-Deployment Pass)**:
    - Aligned `backend/prisma/schema.prisma` with production PostgreSQL schema (`revokedAt DateTime?` nullable; removed non-existent `revoked` boolean).
    - Updated `CuraCardService` queries for `revokedAt: null`.
    - Adjusted Vitest hook and test timeouts (`hookTimeout: 30000`, `testTimeout: 30000`) in `backend/vitest.config.ts`.
    - Verified entire monorepo: 438/438 automated tests passing (363 backend, 75 frontend) and clean production builds across all 5 projects.

- **26 November 2026 — M3 Frontend Foundation:**
  - Established the production-quality frontend application in `apps/web` utilizing React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, and React Router v7.
  - Environment Configuration: created `.env.example` and `.env` in `apps/web` for public Supabase configuration (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and backend API connection (`VITE_API_BASE_URL`). No secrets or service keys exposed.
  - Supabase Auth Integration: configured Supabase client in `src/lib/supabase.ts` with session persistence, automatic token refreshing, and auth state change listeners.
  - Centralized API Client: created `apiClient` in `src/api/client.ts` with automatic Supabase JWT Bearer token injection on authenticated requests, typed responses, and structured `ApiError` handling. Added modular domain APIs (`authApi`, `emergenciesApi`, `assignmentsApi`, `handoversApi`).
  - Auth State & Route Protection: built `AuthProvider`, `useAuth` hook, and `ProtectedRoute` enforcing session verification, unknown-identity onboarding redirect (`needsRegistration`), and role-based access restrictions (`allowedRoles`).
  - Role-Aware Application Shell: built `AppLayout`, top navigation, `DashboardPage`, `LoginPage`, `RegisterPage` (patient self-registration), and initial portal route containers (`PatientPortalPage`, `DispatcherPortalPage`, `AmbulancePortalPage`, `HospitalPortalPage`, `AdminPortalPage`).
  - Testing & Verification:
    - Frontend unit & integration tests: 8/8 passed across 2 test files (`client.spec.ts`, `Auth.spec.tsx`).
    - Frontend build: `tsc -b && vite build` clean (exit code 0).
    - Frontend lint: `oxlint` 0 warnings, 0 errors across 27 files.
    - Backend baseline: 335/335 unit tests and 99/99 E2E tests fully preserved.
  - Production Supabase database was **not touched**.

- **26 November 2026 — M9.2 Patient Self-Registration & Supabase Identity Linking:**
  - Implemented `POST /api/v1/auth/register` enabling newly authenticated Supabase identities to self-register their RAAH application user profile:
    - Dedicated authentication guard `SupabaseJwtAuthGuard`: validates cryptographic Bearer JWT signature and expiration without requiring prior database existence, attaching claims to `req.jwtPayload`.
    - `CurrentJwtPayload` decorator: extracts verified JWT claims (`sub`) directly in controller handlers.
    - Strict role enforcement: always assigns `UserRole.PATIENT` server-side; client role self-selection is prohibited.
    - Security & scope isolation: client-supplied `role`, `supabaseId`, `userId`, `hospitalId`, `ambulanceId`, or `isActive` are rejected with `400 Bad Request` via global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`).
    - Duplicate & race-condition handling: checks for existing `User.supabaseId` (409 Conflict) and maps Prisma P2002 unique constraint violations to controlled 409 responses.
    - Profile continuity: newly registered users can immediately access `GET /api/v1/auth/me`.
  - Added unit test suite `supabase-jwt-auth.guard.spec.ts` (5 tests) and expanded `user-provisioning.service.spec.ts` (+5 tests).
  - Added 10 new E2E tests in `test/auth.e2e-spec.ts` covering missing/invalid token rejection, successful registration, immediate `/auth/me` profile access, duplicate registration conflict (409), concurrent P2002 conflict (409), and rejection of spoofed client fields (`role`, `supabaseId`, `userId`, `hospitalId`, `ambulanceId`).
  - Verification: `npm test` (335/335 passed across 23 test files), `npm run test:e2e` (99/99 passed across 4 test files), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint .` (0 warnings, 0 errors across 109 files), `git diff --check` (clean).
  - Production Supabase database was **not touched**.

- **26 November 2026 — M9.1 Supabase Auth User Provisioning & Role Metadata:**
  - Implemented `UserProvisioningService` in `backend/src/auth/services/user-provisioning.service.ts`:
    - Handles safe identity resolution from cryptographically verified Supabase JWTs (`payload.sub`).
    - Resolves RAAH user via `User.supabaseId === payload.sub`.
    - Enforces active status check (`isActive: true`), rejecting inactive accounts with `401 Unauthorized`.
    - Handles unknown identities safely with `401 Unauthorized` without silently provisioning privileged roles or creating ghost records.
    - Role consistency: Database `User.role` remains strictly authoritative for all runtime RBAC and domain scope checks. `user_metadata` is completely ignored for authorization.
    - Added explicit administrative user creation (`createUser`) and identity linking (`linkIdentity`) restricted to `SYSTEM_ADMIN` via `@Roles(UserRole.SYSTEM_ADMIN)`.
    - Added safe read-only profile lookup (`getProfile`) exposed via `GET /api/v1/auth/me`.
  - Updated `JwtStrategy` to consume `UserProvisioningService.resolveUserFromJwt` for clean separation of concerns.
  - Implemented `AuthController` with endpoints:
    - `GET /api/v1/auth/me`: caller profile lookup
    - `POST /api/v1/auth/users`: explicit administrative user creation (`SYSTEM_ADMIN` only)
    - `POST /api/v1/auth/users/link`: explicit administrative Supabase identity linking (`SYSTEM_ADMIN` only)
  - Added unit test suite `user-provisioning.service.spec.ts` (12 tests) and updated `jwt.strategy.spec.ts` (2 tests).
  - Added 8 new E2E tests in `test/auth.e2e-spec.ts` covering `/auth/me`, unknown sub rejection, inactive rejection, privilege escalation prevention from JWT metadata, administrative user creation and RBAC gating, and administrative identity linking conflict checks.
  - Verification: `npm test` (325/325 passed across 22 test files), `npm run test:e2e` (89/89 passed across 4 test files), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint .` (0 warnings, 0 errors across 105 files), `git diff --check` (clean).
  - Production Supabase database was **not touched**.

- **26 November 2026 — M8.8 Production Migration Deployment & Verification:**
  - Deployed migration `20261126000000_add_supabase_id_to_user` to the production Supabase database (`ddhtnwgsdwzgibkqbqcx`) via `npx prisma migrate deploy`.
  - Confirmed production migration status via `npx prisma migrate status`: 5/5 migrations applied, database schema is completely up to date.
  - Performed direct read-only SQL verification on production database:
    - Confirmed column `User.supabaseId` exists, data type `text`, and `is_nullable: YES`.
    - Confirmed unique index `User_supabaseId_key` exists (`CREATE UNIQUE INDEX "User_supabaseId_key" ON public."User" USING btree ("supabaseId")`).
    - Confirmed zero data loss / destructive changes occurred.
  - Validated auth readiness: the production database is now structurally capable of supporting the full M8 Supabase authentication flow (`JWT sub` → `User.supabaseId` → `User.id` → `AuthenticatedUser` → RBAC & scope checks).
  - Executed post-deployment validation suite: `npm test` (315/315 passed), `npm run test:e2e` (81/81 passed), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint .` (clean), `git diff --check` (clean).
  - Git working tree remains uncommitted; no commit or push was performed.

- **26 November 2026 — M8.7 Final Validation & Production Readiness:**
  - Audited full M8 end-to-end authorization flow: Supabase JWT (`sub`) → `JwtAuthGuard` → `JwtStrategy` (DB lookup by `User.supabaseId`, active check) → `AuthenticatedUser` → `@CurrentUser()` → `RolesGuard` (`@Roles(...)`) → Service domain ownership checks (`validateHospitalScope`, `validateAmbulanceScope`, patient ownership) → trusted `user.userId` audit attribution (`CaseEvent.actorId`).
  - Confirmed repository-wide cleanup: zero client-controlled actor IDs remain in any API request DTOs (`dispatcherId`, `actorId`, `paramedicId`, `receivingDoctorId`, `rejectingStaffId`). Obsolete fields are rejected with `400 Bad Request` via NestJS `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
  - Audited migration `20261126000000_add_supabase_id_to_user/migration.sql`: verified additive, nullable, non-destructive SQL (`ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT; CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");`). Compatible with existing rows and ready for production deployment.
  - Verified local database test runner (`backend/test/lifecycle.db.e2e-spec.ts` using PGlite) executes `20261126000000_add_supabase_id_to_user` locally, testing against identical post-migration schema shape.
  - Verified environment configuration: `.env.example` documents `DATABASE_URL`, `DIRECT_URL`, `PORT`, `SUPABASE_JWT_SECRET`, and `FRONTEND_ORIGINS`. No production secrets are committed.
  - Production Supabase database was **not touched**. Migration remains unapplied to remote production.
  - Verification: `npm test` (315/315 passed), `npm run test:e2e` (81/81 passed), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint .` (0 warnings, 0 errors across 100 files), `git diff --check` (clean).

- **26 November 2026 — M8.6 Actor-ID Cleanup & Trusted JWT Identity:**
  - Removed client-controlled actor/identity IDs across all request DTOs:
    - `CreateAssignmentDto`: removed `dispatcherId?: string`.
    - `AcceptAssignmentDto`: removed `actorId?: string`.
    - `RejectAssignmentDto`: removed `actorId?: string`.
    - `UpdateAssignmentStatusDto`: removed `actorId?: string`.
    - `UpdateEmergencyStatusDto`: removed `actorId?: string`.
    - `CreateHandoverDto`: removed `paramedicId?: string`, `receivingDoctorId?: string`.
    - `UpdateHandoverDto`: removed `paramedicId?: string`, `receivingDoctorId?: string`.
    - `CompleteHandoverDto`: removed `receivingDoctorId?: string`.
    - `RejectHandoverDto`: removed `rejectingStaffId?: string`.
    - `CancelHandoverDto`: removed `actorId?: string`.
  - Configured NestJS `ValidationPipe` (`forbidNonWhitelisted: true`, `whitelist: true`) strictly rejects any client payloads sending obsolete actor IDs with `400 Bad Request`.
  - Updated controllers to inject `@CurrentUser() user?: AuthenticatedUser` and pass verified caller identity into services:
    - `AssignmentsController` / `AssignmentsNestedController`: `create(emergencyId, dto, user)`.
    - `EmergenciesController`: `updateStatus(id, dto, user)`.
    - `HandoversController`: already injecting `user` since M8.5; now trusted for actor attribution.
  - Derived trusted actor identity in services exclusively from authenticated JWT (`user.userId`):
    - `AssignmentsService.create`: sets `dispatcherId = user.userId` on Assignment and `actorId = user.userId` on `AMBULANCE_ASSIGNED` CaseEvent.
    - `AssignmentsService.accept`, `reject`, `updateStatus`: sets `actorId = user.userId` on CaseEvents.
    - `EmergenciesService.updateStatus`: sets `actorId = user.userId` on CaseEvents.
    - `HandoversService.initiateHandover`: sets `paramedicId = user.userId` on Handover and `actorId = user.userId` on `HANDOVER_STARTED` CaseEvent.
    - `HandoversService.completeHandover`: sets `receivingDoctorId = user.userId` on Handover and `actorId = user.userId` on `HANDOVER_COMPLETED` / `CASE_COMPLETED` CaseEvents.
    - `HandoversService.rejectHandover`: sets `actorId = user.userId` on `HANDOVER_REJECTED` CaseEvent.
    - `HandoversService.cancelHandover`: sets `actorId = user.userId` on `HANDOVER_CANCELLED` CaseEvent.
  - Preserved anonymous emergency creation on `POST /api/v1/emergencies`: `actorId` remains `null` when no JWT is provided, and authenticated callers have their identity populated as `initiatorId` and `CaseEvent.actorId`.
  - Added 5 new E2E tests in `backend/test/auth.e2e-spec.ts` under M8.6 verifying strict 400 rejection of client-supplied IDs (`dispatcherId`, `actorId`, `paramedicId`, `receivingDoctorId`) and verified JWT actor attribution in database/CaseEvent records.
  - Updated `backend/test/lifecycle.db.e2e-spec.ts` to include M8.1 migration in PGlite migration runner, attach Bearer auth token, and remove deprecated DTO fields.
  - Production Supabase database was **not touched**. M8.1 migration remains local/unapplied.
  - Verification: `npm test` (315/315 passed), `npm run test:e2e` (81/81 passed), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint` (0 warnings, 0 errors), `git diff --check` (clean).

- **26 November 2026 — M8.5 Ownership & Resource-Scope Authorization:**
  - Implemented service-layer ownership and affiliation guards across all scoped resources:
    - **Hospital scope** (`HospitalsService`): `validateHospitalScope` restricts `DOCTOR` and `HOSPITAL_ADMIN` to their own `hospitalId` on `findAll`, `findOne`, `update`, `createResource`, `findResources`, and `updateResource`; `SYSTEM_ADMIN` and `DISPATCHER` bypass.
    - **Ambulance crew scope** (`AssignmentsService`, `AmbulancesService`): `validateAmbulanceScope` restricts `PARAMEDIC` and `AMBULANCE_DRIVER` to assignments and ambulances matching their own `ambulanceId`; `SYSTEM_ADMIN` and `DISPATCHER` bypass.
    - **Patient ownership** (`EmergenciesService`): `PATIENT` role may only access emergencies where `initiatorId === user.userId` or `patient.userId === user.userId`; all operational roles bypass.
    - **Handover scope** (`HandoversService`): `validateHandoverScope` restricts paramedic to their own `ambulanceId`, doctor/hospital admin to their own `hospitalId`, system admin/dispatcher bypass.
  - All scope violations return `403 Forbidden`; unauthenticated requests continue to return `401 Unauthorized`.
  - Injected `@CurrentUser() user?: AuthenticatedUser` into all scoped controller methods; controllers remain thin and delegate scope decisions entirely to services.
  - Fixed 20 controller unit test assertions to match new service signatures (extra `user` parameter as `undefined` in anonymous calls).
  - Added 17 M8.5-specific service unit tests covering own-resource allow, cross-resource deny, and admin/dispatcher bypass for hospital, ambulance, and patient scopes.
  - Added 11 M8.5 E2E ownership tests in `test/auth.e2e-spec.ts`: own hospital 200, cross-hospital 403, DISPATCHER hospital bypass 200, ADMIN hospital bypass 200, own ambulance 200, cross-ambulance 403, own-ambulance assignment accept 200, cross-ambulance assignment accept 403, own emergency 200, cross-patient emergency 403, DISPATCHER emergency bypass 200.
  - Fixed `test/test-auth.helper.ts` fixture IDs: updated `ambulanceId` and `hospitalId` to valid UUID v4 format (`0000-4000-a000`) to pass `ParseUUIDPipe` route param validation.
  - Production Supabase database was untouched. M8.1 migration remains unapplied to production.
  - Verification: `npm test` (316/316), `npm run test:e2e` (76/76), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint` (0 warnings, 0 errors), `git diff --check` (clean).

- **26 November 2026 — M8.4 Role-Based Access Control to Protected API Endpoints:**
  - Applied declarative `@Roles(...UserRole[])` decorators across all protected endpoints in `EmergenciesController`, `AssignmentsNestedController`, `AssignmentsController`, `AmbulancesController`, `HospitalsController`, `AllocationController`, and `HandoversController` matching the blueprint specification.
  - Kept global `JwtAuthGuard` + `RolesGuard` architecture unchanged; preserved `@OptionalAuth()` on `POST /api/v1/emergencies` and `@Public()` on `GET /api/v1/health`.
  - Added test user fixtures in `test/test-auth.helper.ts` (`E2E_TEST_ADMIN_USER`, `E2E_TEST_PARAMEDIC_USER`, `E2E_TEST_DOCTOR_USER`, `E2E_TEST_PATIENT_USER`).
  - Updated `test/lifecycle.db.e2e-spec.ts` with seeded Paramedic and Doctor tokens for realistic role-specific lifecycle actions (`PARAMEDIC` accepting assignment, `DOCTOR` completing handover).
  - Expanded unit test suite to 299/299 passing tests (+3 tests in `roles.guard.spec.ts`).
  - Expanded E2E test suite to 65/65 passing tests (+6 tests in `test/auth.e2e-spec.ts` verifying representative 200/201 success and 403 Forbidden enforcement).
  - Production Supabase database was untouched.
  - Verification: `npm test` (299/299), `npm run test:e2e` (65/65), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint` (0 warnings, 0 errors), `git diff --check` (clean).

- **26 November 2026 — M8.3 Public Health & Optional Authentication for Emergency SOS:**
  - Implemented `@OptionalAuth()` decorator and enhanced `JwtAuthGuard` to allow unauthenticated access when no Authorization header is present on `@OptionalAuth()` routes, while rejecting invalid tokens with 401 Unauthorized.
  - Decorated `GET /api/v1/health` with `@Public()` in `AppController` for unrestricted health monitoring.
  - Implemented optional authentication on `POST /api/v1/emergencies`:
    - Anonymous requests succeed with 201 Created and set `initiatorId: null` on the case and `actorId: null` on the initial `CaseEvent`.
    - Authenticated requests resolve caller `userId` from the verified Supabase JWT and assign it to `initiatorId` and `CaseEvent.actorId`.
    - Client-supplied `initiatorId` spoofing attempts are ignored in favor of the verified token identity.
    - Invalid or malformed tokens on `POST /api/v1/emergencies` are rejected with 401 Unauthorized.
  - Expanded unit test suite to 296/296 passing tests (+7 tests across `jwt-auth.guard.spec.ts`, `emergencies.controller.spec.ts`, and `emergencies.service.spec.ts`).
  - Expanded E2E test suite to 59/59 passing tests (+6 tests in `backend/test/auth.e2e-spec.ts` covering public health, anonymous SOS, authenticated SOS, spoofed ID prevention, and malformed token rejection).
  - Production Supabase database was untouched.
  - Verification: `npm test` (296/296), `npm run test:e2e` (59/59), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint` (0 warnings, 0 errors), `git diff --check` (clean).

- **26 November 2026 — M8.2 AuthModule, JWT Authentication & Global RBAC Guards:**
  - Installed core authentication packages: `@nestjs/jwt` (12.0.5), `@nestjs/passport` (12.0.2), `passport` (0.7.0), `passport-jwt` (4.0.1), and `@types/passport-jwt` (4.0.2).
  - Implemented `AuthModule` under `backend/src/auth/` providing:
    - `JwtStrategy`: extracts Bearer JWT tokens, validates against `SUPABASE_JWT_SECRET` (HS256), resolves internal `User` by `supabaseId`, rejects unknown/inactive users with 401 Unauthorized, and populates `req.user`.
    - `JwtAuthGuard`: extends Passport `AuthGuard('jwt')` with `@Public()` decorator bypass. Registered as global `APP_GUARD` in `AppModule`.
    - `RolesGuard`: evaluates `@Roles(...UserRole[])` route metadata, blocks non-matching users with 403 Forbidden, and ensures authenticated context. Registered as second global `APP_GUARD` in `AppModule`.
    - Decorators: `@Public()`, `@Roles()`, and `@CurrentUser()`.
    - Types: `SupabaseJwtPayload`, `AuthenticatedUser`, and `AuthenticatedRequest`.
  - Added documentation for `SUPABASE_JWT_SECRET` in `backend/.env.example`.
  - Added 13 unit tests across `jwt.strategy.spec.ts`, `jwt-auth.guard.spec.ts`, `roles.guard.spec.ts`, and `current-user.decorator.spec.ts` (all 289 unit tests pass).
  - Created dedicated E2E test suite `backend/test/auth.e2e-spec.ts` (5 tests) verifying 401 rejection for unauthenticated requests, malformed tokens, unknown users, and inactive users, and 200 acceptance for valid tokens.
  - Updated E2E test harnesses with `test/test-auth.helper.ts` providing deterministic JWTs, exercising real JWT signature validation and database lookups without compromising production guard integrity.
  - Production Supabase database was untouched.
  - Validation: `npm test` (289/289), `npm run test:e2e` (53/53), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint` (0 warnings, 0 errors), `git diff --check` (clean).

- **26 November 2026 — M8.1 Prisma Identity Mapping (`User.supabaseId`):**
  - Added `supabaseId String? @unique` to the `User` model in `backend/prisma/schema.prisma` as the second field (after `id`), positioned before `email` and `phone`. Additive change; `User.id` and all existing foreign keys are unchanged.
  - Authored migration `backend/prisma/migrations/20261126000000_add_supabase_id_to_user/migration.sql`: `ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT; CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");`. Nullable column, unique constraint. No data deleted, no existing columns altered.
  - Updated `backend/test/lifecycle.db.e2e-spec.ts` to include the new migration in the PGlite `migrationFiles` array, keeping the in-process database schema in sync with the Prisma schema.
  - Regenerated Prisma Client (7.10.1) from the updated schema.
  - Migration not yet deployed to production Supabase (deferred to M8.7).
  - Verification: `npm test` 276/276, `npm run test:e2e` 48/48, `npm run build` clean, `npx tsc --noEmit` clean, `npx oxlint` 0 warnings 0 errors, `git diff --check` clean.

### Documentation

- Expanded project scope and system architecture documentation.
- Added and updated portal requirement documents.
- Documented backend API contracts and integration relationships.
- Documented database entities and status mappings.
- Added emergency lifecycle, ambulance workflow, hospital workflow and patient handover documentation.
- Added project milestones, task tracking, team assignment and contribution guidelines.
- Recorded accepted architectural directions and unresolved project decisions.

### Development

- **25 November 2026 — M6.2 Stateful Database-Backed E2E Integration:**
  - Implemented `backend/test/lifecycle.db.e2e-spec.ts`: a 14-step stateful emergency lifecycle integration test suite running against a real PostgreSQL database using real `AppModule`, real `PrismaService`, real Prisma queries, and real multi-table ACID transactions.
  - Database isolation strategy: `@electric-sql/pglite` v0.4.3 (in-process WASM PostgreSQL) + `PGLiteSocketServer` v0.1.3 bound to `127.0.0.1:5434`; all 4 Prisma SQL migrations applied in `beforeAll`; `process.env.DIRECT_URL` redirected before NestJS module compilation; production `PrismaService` unchanged from HEAD.
  - Seed fixtures: Hospital, 3 HospitalResource rows (`ICU_BED`, `GENERAL_BED`, `OXYGEN_CYLINDER`), Ambulance, Dispatcher, Paramedic, Doctor, Patient.
  - Stateful lifecycle chain verified: `EmergencyCase` creation → `DISPATCHING` → Ambulance `ASSIGNED` → `ACCEPTED` → `EN_ROUTE` → `ARRIVED_AT_SCENE` → `PATIENT_ONBOARD` → hospital recommendations (real SQL scoring) → destination selection (`HOSPITAL_SELECTED`) → `EN_ROUTE_TO_HOSPITAL` → `ARRIVED_AT_HOSPITAL` → handover initiation (`HANDOVER_IN_PROGRESS`) → handover completion (Handover `COMPLETED`, EmergencyCase `COMPLETED` with `resolvedAt`, Assignment `COMPLETED` with `completedAt`, Ambulance `AVAILABLE` with `isAvailable: true`).
  - Final state verification: 11 persisted `CaseEvent` records confirmed in chronological order; no active handover remains.
  - No remote Supabase database was connected, queried, or modified. No application source code changed.
  - Test verification: 14/14 M6.2 database lifecycle E2E passing; 48/48 full E2E suite passing; 276/276 unit tests passing; `npm run build` clean; `npx tsc --noEmit` clean; `npx oxlint` 0 warnings 0 errors; `git diff --check` clean.
  - **M6 milestone fully completed.**
- **25 November 2026 — M6.1 Cross-Module Emergency Lifecycle E2E Integration:**
  - Implemented comprehensive 13-step HTTP lifecycle end-to-end integration test in `backend/test/lifecycle.e2e-spec.ts`.
  - Verified full operational sequence: case creation (`POST /emergencies`), dispatch transition (`PATCH /emergencies/:id/status`), ambulance assignment (`POST /emergencies/:id/assignments`), driver acceptance (`PATCH /assignments/:id/accept`), en-route (`PATCH /assignments/:id/status`), scene arrival, patient onboard, hospital recommendation query (`GET /emergencies/:id/hospital-recommendations`), destination selection (`PATCH /emergencies/:id/destination`), hospital en-route and arrival transitions, handover initiation (`POST /handovers`), and handover completion with case resolution and ambulance fleet release.
  - Verified lifecycle architecture contract: assignment status updates automatically advance case status up to `PATIENT_ONBOARD`; hospital transit and arrival phases are driven through the emergency status endpoint.
  - Test verification: 14/14 lifecycle E2E tests passing, 34/34 full E2E suite passing, 276/276 unit tests passing, `npm run build` passing, `npx tsc --noEmit` passing.
  - Scope boundary: Uses the existing mocked-Prisma NestJS HTTP test harness; no real PostgreSQL/Supabase database was used. This verifies cross-module HTTP integration, not a stateful database-backed lifecycle.
- **24 November 2026 — M5.4 Patient Handover Implementation & Event Semantics Correction:**
  - Implemented the complete `HandoversModule` (`HandoversController`, `HandoversService`, DTOs) supporting the digital transfer of care lifecycle between ambulance crews and hospital receiving staff.
  - Implemented `POST /api/v1/handovers` (initiate handover): enforces prerequisite case state `ARRIVED_AT_HOSPITAL`, active assignment with `PATIENT_ONBOARD`, transitions case to `HANDOVER_IN_PROGRESS`, and emits `HANDOVER_STARTED`.
  - Implemented `GET /api/v1/handovers/:id`, `GET /api/v1/handovers/case/:caseId/active`, and `GET /api/v1/handovers/case/:caseId` for comprehensive handover visibility.
  - Implemented `PATCH /api/v1/handovers/:id` for active data entry (structured vitals, clinical summary, notes) with state guards.
  - Implemented `POST /api/v1/handovers/:id/complete`: atomic transaction completing handover, resolving emergency case (`COMPLETED`, `resolvedAt`), completing assignment (`COMPLETED`, `completedAt`), releasing ambulance to `AVAILABLE` (`isAvailable: true`), and logging `HANDOVER_COMPLETED` and `CASE_COMPLETED` events.
  - Implemented `POST /api/v1/handovers/:id/reject`: requires >=10 char justification, atomically marks handover `REJECTED`, reverts case to `ARRIVED_AT_HOSPITAL`, retains ambulance and crew in `PATIENT_ONBOARD`, and emits dedicated `HANDOVER_REJECTED` event.
  - Implemented `POST /api/v1/handovers/:id/cancel`: requires >=10 char justification, atomically marks handover `CANCELLED`, reverts case to `ARRIVED_AT_HOSPITAL`, retains ambulance in `PATIENT_ONBOARD`, and emits dedicated `HANDOVER_CANCELLED` event.
  - Added PostgreSQL partial unique index migration `20261124230000_add_active_handover_partial_unique_index` ensuring at most one active (`PENDING` or `IN_PROGRESS`) handover per case.
  - Added `HANDOVER_REJECTED` and `HANDOVER_CANCELLED` enum values to `CaseEventType` with migration `20261124231000_add_handover_rejected_cancelled_events`.
  - Verification: 276/276 unit tests passed, 20/20 E2E tests passed, clean production build, 0 lint errors.
- **24 November 2026 — M5.3 Stage 2 Allocation Recommendation & Destination APIs:**
  - Implemented `GET /api/v1/emergencies/:id/ambulance-recommendations` for candidate scoring, proximity ranking, and availability filtering.
  - Implemented `GET /api/v1/emergencies/:id/hospital-recommendations` for hospital capability, resource assessment, and proximity ranking.
  - Implemented `PATCH /api/v1/emergencies/:id/destination` for destination selection with state guards (`PATIENT_ONBOARD`, `HOSPITAL_SELECTED`, `HOSPITAL_NOTIFIED`, `EN_ROUTE_TO_HOSPITAL`).
  - Added strict operational safety guards: hard blocks on `CLOSED` and `DIVERTING` hospitals (non-overridable).
  - Added hard resource compatibility blocks: depleted (`availableQuantity: 0`) or non-operational (`UNAVAILABLE`, `MAINTENANCE`) required resources cannot be selected.
  - Enforced meaningful override justifications (minimum 10 non-whitespace characters) for `REQUIRES_REVIEW` hospital candidates.
  - Added geographic radius filtering (`maxRangeKm`) preserving unlocated candidates for dispatcher review.
  - Implemented optimistic concurrency control using conditional database updates (`updateMany` matching `id`, expected `status`, and expected `destinationHospitalId`).
  - Enforced idempotent destination reselection preserving advanced transport states without duplicate audit events.
  - Verification: 241/241 unit tests passing, 20/20 E2E tests passing, clean production build, 0 lint warnings/errors.
- **M5.3 Stage 1 (Allocation DTO Foundation):** Initial DTO foundation recorded as completed.

### Pending Verification

- Apply local database migrations (`20261124230000` and `20261124231000`) to the remote Supabase database.
- Confirm the implementation status of all documented backend features against live database.
- Verify portal-to-backend integration across frontend applications.
- Review authentication and role-based access control (M8).
- Confirm real-time notification and GPS tracking scope.
- Complete end-to-end integration testing.
- Perform a full documentation consistency audit.

## Changelog Guidelines

For each significant update, record:
- Version or release identifier, if applicable.
- Date of the change.
- Added functionality.
- Changed functionality.
- Fixed issues.
- Removed or deprecated functionality.
- Relevant pull requests or commits, where available.

Do not record proposed or planned functionality as implemented.
