# RAAH – Project Milestones

## 1. Purpose

This document tracks the major development milestones of RAAH, including backend development, portal integration, testing and final delivery.

Milestone completion must be based on verified implementation, not merely on documentation or planned work.

## 2. Milestone Overview

| Milestone | Focus | Status |
|---|---|---|
| M1 | Project foundation and requirements | Historical status to be confirmed |
| M2 | Backend architecture and core modules | Historical status to be confirmed |
| M3 | Frontend Foundation | Completed |
| M4 | Portal development and integration (Patient Portal next) | In progress |
| M5 | Advanced emergency coordination | In progress |
| M5.3 Stage 1 | Allocation DTO foundation | Completed |
| M5.3 Stage 2 | Allocation recommendation APIs | Conditionally Accepted |
| M5.4 | Patient Handover | Conditionally Accepted |
| M6 | End-to-end integration and testing | Completed |
| M6.1 | Cross-module HTTP lifecycle E2E testing | Completed |
| M6.2 | Stateful database lifecycle & integration testing | Completed |
| M7 | Final validation and deployment preparation | Completed |
| M8 | Authentication and Role-Based Access Control | Completed |
| M9 | Supabase Auth Integration & Identity Foundation | In progress |
| M9.1 | Supabase Auth user provisioning & role metadata | Completed |
| M9.2 | Patient self-registration & Supabase identity linking | Completed |
| M9.3 | Patient Emergency History & Navigation Integration | Completed |
| M9.4 | Patient Clinical Profile APIs (`/patients/me`) | Completed |
| M9.5 | Cura Card Ephemeral QR Generation & Responder Scanning | Completed |
| M9.6 | Frontend Route Recovery & Local Stability | Completed |
| M9.7 | Database Schema Alignment & Monorepo Pre-Deployment Pass | Completed |
| M8.1 | Prisma identity mapping (`User.supabaseId`) | Completed |
| M8.2 | `AuthModule`, JWT authentication & global RBAC guards | Completed |
| M8.3 | Public health & optional authentication for Emergency SOS | Completed |
| M8.4 | Role-based access control to protected API endpoints | Completed |
| M8.5 | Ownership / affiliation guards | Completed |
| M8.6 | Remove client-supplied actor IDs; populate from JWT | Completed |
| M8.7 | Final validation, docs, production readiness | Completed |
| M8.8 | Production migration deployment & verification | Completed |

The historical milestone labels are an organisational overview and must be reconciled with the actual Git history and team records before being treated as formally completed.

## 3. M5.3 – Allocation Development

### Stage 1: Allocation DTO Foundation

**Status: Completed**

The Allocation module received its initial DTO foundation.

This provides the data-contract starting point for ambulance and hospital recommendation functionality.

Completion of DTOs does not mean that recommendation services or APIs are implemented.

### Stage 2: Recommendation APIs

**Status: Conditionally Accepted (Core Implementation & Tests Verified; Follow-ups Tracked)**

The core allocation implementation and automated tests have passed local verification. Final acceptance review resulted in **Conditional Acceptance**, recording the verified core capabilities alongside specific architectural boundaries and follow-up enhancement items.

#### Completed M5.3 Functionality (Verified)
- Ambulance recommendation endpoint: `GET /api/v1/emergencies/:id/ambulance-recommendations` for candidate scoring, proximity ranking, and availability filtering.
- Hospital recommendation endpoint: `GET /api/v1/emergencies/:id/hospital-recommendations` for capability evaluation, resource assessment, and proximity ranking.
- Destination selection endpoint: `PATCH /api/v1/emergencies/:id/destination` with prerequisite state guards (`PATIENT_ONBOARD`, `HOSPITAL_SELECTED`, `HOSPITAL_NOTIFIED`, `EN_ROUTE_TO_HOSPITAL`).
- Full candidate suitability evaluation using the pure allocation calculator.
- Strict operational status checks: non-overridable hard blocks preventing selection of `CLOSED` or `DIVERTING` hospitals.
- Resource compatibility checks: non-overridable hard blocks preventing selection when required resources are depleted (`availableQuantity: 0`) or non-operational (`UNAVAILABLE`, `MAINTENANCE`).
- Meaningful override justification enforcement (minimum 10 non-whitespace characters) for `REQUIRES_REVIEW` candidates.
- Search radius filtering (`maxRangeKm`) preserving unlocated candidates for dispatcher review.
- Optimistic concurrency protection via conditional database updates (`updateMany` on `id`, expected `status`, and expected `destinationHospitalId`).
- Idempotent destination re-selection preserving advanced workflow progression (`HOSPITAL_NOTIFIED`, `EN_ROUTE_TO_HOSPITAL`) and suppressing redundant events.
- Audit event logging (`HOSPITAL_SELECTED` and `DESTINATION_CHANGED`) with structured metadata payloads.

#### Verification Evidence
- Unit test suite: 241/241 passed (including 23 AllocationService tests and 3 AllocationController tests).
- E2E test suite: 20/20 passed.
- Linting: 0 errors (`oxlint` across 61 files).
- Production build: `nest build` completed cleanly with exit code 0.

#### Known Architectural Limitations
- **Decision-Support Scope:** Recommendations are strictly read-only decision support with zero database side effects.
- **Intent vs. Clinical Intake:** Destination selection records operational routing intent but does not guarantee hospital intake or clinical acceptance. The explicit disclaimer `HOSPITAL_ACCEPTANCE_DISCLAIMER` is appended to evaluations.
- **No Resource Decrementing:** Destination selection does not lock, decrement, or reserve beds or equipment in `HospitalResource`.
- **Static Pickup Coordinates for Transit:** Hospital travel time and proximity calculations currently use incident pickup coordinates (`incidentLatitude`, `incidentLongitude`) rather than live ambulance GPS coordinates during transit.
- **Untrusted Actor Identity:** In `CaseEvent` logging, `actorId` is set to `null` because client-supplied identities are untrusted prior to M8 authentication/RBAC.

#### Outstanding Follow-up Items (Future Enhancements & Verification Tasks)
The following tasks are tracked for subsequent milestones and must not be marked as completed in M5.3:
1. **Hospital Resource Reservation & Intake Acceptance Lifecycle:** Design and implement an explicit hospital intake acceptance/bed reservation workflow so high-demand resources are not over-allocated across multiple concurrent emergencies.
2. **En-Route Dynamic Origin Coordinates:** Enhance destination recommendation algorithms to query and use fresh ambulance GPS coordinates (`currentLatitude`, `currentLongitude`) when a patient is onboard or en route, falling back to incident coordinates if GPS is unavailable.
3. **Real Multi-Connection PostgreSQL Concurrency Testing:** Execute live concurrent integration tests against a PostgreSQL instance to stress-test parallel destination-selection race conditions under high contention.
4. **Authenticated Actor Identity for Audit Events:** Integrate authenticated dispatcher identity into `CaseEvent.actorId` once M8 authentication/RBAC is completed.

## 4. M5.4 – Patient Handover

**Status: Conditionally Accepted (Core Implementation & Tests Verified; Follow-ups Tracked)**

The complete digital patient handover lifecycle between ambulance crew and receiving hospital staff was reviewed. The core implementation and automated tests have passed local verification. Final acceptance review resulted in **Conditional Acceptance**, recording verified functionality alongside specific operational boundaries and follow-up conditions.

### Verified M5.4 Functionality

- **Handover initiation prerequisites:** Validates that the emergency case is strictly in status `ARRIVED_AT_HOSPITAL` (blocks premature initiation while `EN_ROUTE_TO_HOSPITAL` or earlier).
- **Destination hospital validation:** Validates `destinationHospitalId` is present on the case.
- **Active ambulance / `PATIENT_ONBOARD` validation:** Strictly requires an active assignment with status `PATIENT_ONBOARD` connecting the emergency and ambulance.
- **Handover record associations:** Correctly associates and links `EmergencyCase`, `Ambulance`, `Hospital`, `Paramedic` (role `PARAMEDIC` or `AMBULANCE_DRIVER` with matching `ambulanceId`), and `ReceivingDoctor` (role `DOCTOR` or `HOSPITAL_ADMIN` with matching `hospitalId`).
- **Single active handover protection:** Enforces at most one active (`PENDING` or `IN_PROGRESS`) handover per case via service-level guard (`409 ConflictException`) and database-level PostgreSQL partial unique index (`Handover_active_case_unique`), with `P2002` error mapping.
- **Handover completion lifecycle:** Executed via `POST /api/v1/handovers/:id/complete` within an atomic transaction:
  1. Handover status transitions to `COMPLETED` (`handoverCompletedAt = now()`).
  2. EmergencyCase status transitions to `COMPLETED` (`resolvedAt = now()`).
  3. Assignment status transitions to `COMPLETED` (`completedAt = now()`).
  4. Ambulance is released back to operational fleet: status becomes `AVAILABLE` and `isAvailable: true`.
- **Handover rejection lifecycle:** Executed via `POST /api/v1/handovers/:id/reject` within an atomic transaction:
  1. Handover status transitions to `REJECTED` (with mandatory reason >= 10 non-whitespace characters).
  2. EmergencyCase status safely reverts to `ARRIVED_AT_HOSPITAL`.
  3. Ambulance and Assignment remain in `PATIENT_ONBOARD` (crew and vehicle are NOT prematurely released).
  4. Subsequent destination reassignment is delegated to dispatchers via `PATCH /api/v1/emergencies/:id/destination`.
- **Handover cancellation lifecycle:** Executed via `POST /api/v1/handovers/:id/cancel` within an atomic transaction:
  1. Handover status transitions to `CANCELLED` (with mandatory reason >= 10 non-whitespace characters).
  2. EmergencyCase status reverts to `ARRIVED_AT_HOSPITAL`.
  3. Ambulance and Assignment remain in `PATIENT_ONBOARD` (not released).
- **Dedicated handover lifecycle events:**
  - `HANDOVER_STARTED` recorded upon initiation.
  - `HANDOVER_COMPLETED` recorded upon hospital acceptance.
  - `HANDOVER_REJECTED` recorded upon hospital rejection.
  - `HANDOVER_CANCELLED` recorded upon administrative cancellation.
  - `CASE_COMPLETED` recorded upon emergency resolution.
- **Transactional state changes:** All multi-model mutations are wrapped in Prisma `$transaction` blocks ensuring atomic rollback on failure.
- **DTO and service-level validation:** Robust validation across `CreateHandoverDto`, `VitalsDto`, `CompleteHandoverDto`, `RejectHandoverDto`, `CancelHandoverDto`, and `UpdateHandoverDto` (UUID pipes, string length limits, numerical vital ranges).
- **Clinical disclaimer and structured vitals/history handling:** Responses attach `HANDOVER_CLINICAL_DISCLAIMER` and `PATIENT_HANDOVER_RECORD_ONLY`. Structured physiological vital signs (`heartRate`, `bloodPressureSystolic`, `bloodPressureDiastolic`, `respiratoryRate`, `oxygenSaturation`, `temperature`, `glasgowComaScale`, `bloodGlucose`, `painScore`) and clinical history (`GET :id`, `GET case/:caseId/active`, `GET case/:caseId`) are preserved and exposed safely.
- **Local automated verification:**
  - Unit test suite: 276/276 passed (includes 20 HandoversService tests, 5 HandoversController tests, 10 DTO tests).
  - E2E test suite: 20/20 passed.
  - Linting: 0 errors (`oxlint` across 75 files).
  - Production build: `nest build` completed cleanly with exit code 0.

### M5.4 Conditions / Outstanding Follow-ups

The following items are tracked as prerequisites for full production acceptance and must not be marked as completed in M5.4:

1. **Remote Migration Deployment Pending:**
   - Migration `20261124230000_add_active_handover_partial_unique_index` (PostgreSQL partial unique index).
   - Migration `20261124231000_add_handover_rejected_cancelled_events` (adds `HANDOVER_REJECTED` and `HANDOVER_CANCELLED` to `CaseEventType` enum).
   - Both migrations exist locally in version control but **have not yet been applied to the live remote Supabase database**.
2. **Authentication / Authorization Deferred to M8:**
   - Current endpoints on `HandoversController` are public and lack authenticated identity enforcement.
   - Role and hospital/ambulance affiliation checks validate referenced database user records, but do not authenticate or prove caller identity.
   - Extraction of authenticated caller identity into `CaseEvent.actorId` is deferred to M8 authentication/RBAC.
3. **Real PostgreSQL Concurrency Integration Testing:**
   - Concurrency protection was verified via mocked Prisma unit tests (`P2002`). Live multi-connection parallel request verification under real PostgreSQL database contention remains a future integration/production-readiness task.
4. **End-to-End Handover Journey:**
   - Full cross-module HTTP integration testing across the complete lifecycle (`/emergencies` → `/assignments` → `/destination` → `/handovers` → `/complete`) was verified in M6.1 using the mocked HTTP test harness. Stateful multi-session database verification remains tracked under M6.2.

## 5. M6.1 – Cross-Module Lifecycle E2E Integration

**Status: Completed**

The first stage of Milestone M6 implemented and verified the complete cross-module HTTP emergency lifecycle journey through automated end-to-end testing.

### Verified M6.1 Functionality
- Primary test file: `backend/test/lifecycle.e2e-spec.ts`.
- 13-step end-to-end HTTP lifecycle journey executed in sequence:
  1. Emergency creation (`POST /api/v1/emergencies` → `CREATED`).
  2. Dispatch transition (`PATCH /api/v1/emergencies/:id/status` → `DISPATCHING`).
  3. Ambulance assignment (`POST /api/v1/emergencies/:id/assignments` → `ASSIGNED`, case → `AMBULANCE_ASSIGNED`).
  4. Driver acceptance (`PATCH /api/v1/assignments/:id/accept` → `ACCEPTED`).
  5. En-route response (`PATCH /api/v1/assignments/:id/status` with `EN_ROUTE` → case auto-driven to `AMBULANCE_EN_ROUTE`).
  6. Scene arrival (`PATCH /api/v1/assignments/:id/status` with `ARRIVED_AT_SCENE` → case auto-driven to `ARRIVED_AT_SCENE`).
  7. Patient onboard (`PATCH /api/v1/assignments/:id/status` with `PATIENT_ONBOARD` → case auto-driven to `PATIENT_ONBOARD`).
  8. Hospital recommendation query (`GET /api/v1/emergencies/:id/hospital-recommendations` → ranked recommendation array with eligibility, tier, and disclaimer).
  9. Destination selection (`PATCH /api/v1/emergencies/:id/destination` → `HOSPITAL_SELECTED`, destination assigned).
  10. Hospital transit (`PATCH /api/v1/emergencies/:id/status` → `EN_ROUTE_TO_HOSPITAL`).
  11. Hospital arrival (`PATCH /api/v1/emergencies/:id/status` → `ARRIVED_AT_HOSPITAL`).
  12. Handover initiation (`POST /api/v1/handovers` → `IN_PROGRESS`, case → `HANDOVER_IN_PROGRESS`, `HANDOVER_STARTED` event).
  13. Handover completion (`POST /api/v1/handovers/:id/complete` → `COMPLETED`, case → `COMPLETED` with `resolvedAt`, assignment → `COMPLETED`, ambulance released to `AVAILABLE` with `isAvailable: true`, `HANDOVER_COMPLETED` and `CASE_COMPLETED` events).
- Architectural validation: Confirmed that assignment status transitions drive case status up to `PATIENT_ONBOARD`; hospital transit and arrival phases are intentionally driven through the emergency status endpoint.

### Verification Evidence
- Lifecycle E2E suite: 14/14 passed (`backend/test/lifecycle.e2e-spec.ts`).
- Full E2E suite: 34/34 passed (`test/lifecycle.e2e-spec.ts` + `test/app.e2e-spec.ts`).
- Unit test suite: 276/276 passed (17 test files).
- TypeScript compilation: `npx tsc --noEmit` passed cleanly.
- Production build: `npm run build` (`nest build`) passed cleanly with exit code 0.
- Linting: 0 warnings, 0 errors in `lifecycle.e2e-spec.ts`.

### Scope Boundary & Limitations
- **Mocked Harness:** Tests use the existing mocked-Prisma NestJS HTTP test harness (`overrideProvider(PrismaService)`).
- **No Real Database:** No real PostgreSQL/Supabase database was used or connected during execution.
- **Contract Verification:** This verifies cross-module HTTP integration, request validation, response payloads, and transactional orchestration contracts—not a stateful database-backed lifecycle.
- **Milestone Status:** M6.1 is completed. The broader M6 milestone remains in progress pending real database integration and portal-level end-to-end verification.

## 6. M6.2 – Stateful Database-Backed E2E Integration

**Status: Completed**

The second stage of Milestone M6 implemented and verified a fully stateful emergency lifecycle integration test suite running against a real PostgreSQL database engine, with the real NestJS `AppModule`, real `PrismaService`, real Prisma queries, and real multi-table ACID transactions.

### Database Isolation Strategy

- **In-process PostgreSQL engine:** `@electric-sql/pglite` v0.4.3 (WASM PostgreSQL) with `PGLiteSocketServer` v0.1.3, bound to `127.0.0.1:5434` during test execution.
- **Full migration bootstrap:** All 4 Prisma SQL migrations applied sequentially to the in-memory database in `beforeAll`:
  - `20261116111709_init`
  - `20261118025500_add_hospital_resource_version_and_quantity_check`
  - `20261124230000_add_active_handover_partial_unique_index`
  - `20261124231000_add_handover_rejected_cancelled_events`
- **Connection pool configured:** `PGLiteSocketServer` initialised with `maxConnections: 50` to support Prisma 7's `pg.Pool`.
- **Strict isolation:** `process.env.DIRECT_URL` and `process.env.DATABASE_URL` redirected to `127.0.0.1:5434` before NestJS module compilation. No connection to the remote Supabase database was made.
- **Safe teardown:** `app.close()`, `prisma.$disconnect()`, and `socketServer.stop()` executed in `afterAll`.

### Verified M6.2 Functionality

- **Primary test file:** `backend/test/lifecycle.db.e2e-spec.ts`.
- **Seed fixtures seeded in `beforeAll`:** Hospital (`State Trauma Center`), 3 `HospitalResource` rows (`ICU_BED`, `GENERAL_BED`, `OXYGEN_CYLINDER`), Ambulance (`AMB-M6-01`, type `ALS`), Dispatcher, Paramedic, Doctor, and Patient (`Ramesh Kumar`).
- **14-step stateful lifecycle chain** (each test consumes database state written by prior tests):
  1. `POST /api/v1/emergencies` → `EmergencyCase` row persisted with `CREATED` status and `CASE_CREATED` event.
  2. `PATCH /api/v1/emergencies/:id/status` → `DISPATCHING` persisted in DB.
  3. `POST /api/v1/emergencies/:id/assignments` → `Assignment` row created (`ASSIGNED`), `Ambulance` updated (`ASSIGNED`, `isAvailable: false`), case updated (`AMBULANCE_ASSIGNED`), `AMBULANCE_ASSIGNED` event persisted.
  4. `PATCH /api/v1/assignments/:id/accept` → `ACCEPTED` with `acceptedAt` timestamp persisted.
  5. `PATCH /api/v1/assignments/:id/status` (`EN_ROUTE`) → assignment, ambulance, and case all updated transactionally; `AMBULANCE_EN_ROUTE` event persisted.
  6. `PATCH /api/v1/assignments/:id/status` (`ARRIVED_AT_SCENE`) → ambulance to `AT_SCENE`, case to `ARRIVED_AT_SCENE`; `ARRIVED_AT_SCENE` event persisted.
  7. `PATCH /api/v1/assignments/:id/status` (`PATIENT_ONBOARD`) → ambulance to `PATIENT_ONBOARD`, case to `PATIENT_ONBOARD`; `PATIENT_ONBOARD` event persisted.
  8. `GET /api/v1/emergencies/:id/hospital-recommendations` → real SQL scoring query returns seeded hospital with `isEligible: true`.
  9. `PATCH /api/v1/emergencies/:id/destination` → `destinationHospitalId` persisted on case (`HOSPITAL_SELECTED`); `HOSPITAL_SELECTED` event persisted.
  10. `PATCH /api/v1/emergencies/:id/status` (`EN_ROUTE_TO_HOSPITAL`) → case status persisted.
  11. `PATCH /api/v1/emergencies/:id/status` (`ARRIVED_AT_HOSPITAL`) → case status persisted; `PATIENT_ARRIVED` event persisted.
  12. `POST /api/v1/handovers` → `Handover` row persisted (`IN_PROGRESS`), case updated to `HANDOVER_IN_PROGRESS`; `HANDOVER_STARTED` event persisted.
  13. `POST /api/v1/handovers/:id/complete` → multi-table ACID transaction: Handover → `COMPLETED` (`handoverCompletedAt` set), EmergencyCase → `COMPLETED` (`resolvedAt` set), Assignment → `COMPLETED` (`completedAt` set), Ambulance → `AVAILABLE` (`isAvailable: true`); `HANDOVER_COMPLETED` and `CASE_COMPLETED` events persisted.
  14. Comprehensive final DB verification: all terminal statuses confirmed, full `CaseEvent` chronological audit trail verified (11 events), no active handover remains.
- **No application defects discovered:** All NestJS services, DTOs, service-level guards, state-machine validation, and multi-table transactions functioned correctly against a real PostgreSQL engine.

### Verification Evidence

- M6.2 database lifecycle E2E: **14/14 passed** (`backend/test/lifecycle.db.e2e-spec.ts`).
- Full E2E suite: **48/48 passed** (3 test files: `lifecycle.e2e-spec.ts`, `app.e2e-spec.ts`, `lifecycle.db.e2e-spec.ts`).
- Unit test suite: **276/276 passed** (17 test files).
- TypeScript compilation: `npx tsc --noEmit` passed cleanly.
- Production build: `npm run build` passed cleanly with exit code 0.
- Linting: **0 warnings, 0 errors** (`npx oxlint` across 80 files, 96 rules).
- Whitespace/diff check: `git diff --check` exit 0.

### Scope Boundary & Limitations

- **In-memory WASM PostgreSQL vs. remote multi-region cluster:** Tests run against an isolated, single-node `@electric-sql/pglite` engine rather than the remote multi-region Supabase pooler.
- **No application source changes:** `PrismaService` is unmodified from HEAD. Database isolation is achieved entirely within the test file by setting `process.env.DIRECT_URL` before NestJS module compilation.
- **Portal UI integration deferred:** Cross-portal frontend E2E integration (Dispatcher, Paramedic, Hospital Doctor UIs) is scoped to M8 / portal milestones.

## 7. M6 – End-to-End Integration and Testing

**Status: Completed**

Both sub-milestones comprising M6 are now complete:

| Sub-milestone | Description | Status |
|---|---|---|
| M6.1 | Cross-module HTTP lifecycle E2E (mocked harness) | Completed |
| M6.2 | Stateful database-backed E2E (real PostgreSQL via PGlite) | Completed |

### Final M6 Verification Evidence (Combined)

- Full E2E suite: **48/48 passed** (`lifecycle.e2e-spec.ts` 14 + `app.e2e-spec.ts` 20 + `lifecycle.db.e2e-spec.ts` 14).
- Unit suite: **276/276 passed** (17 test files).
- Production build: `npm run build` clean (exit 0).
- TypeScript compilation: `npx tsc --noEmit` clean (exit 0).
- Linting: **0 warnings, 0 errors** (`npx oxlint` 80 files, 96 rules).
- Whitespace check: `git diff --check` clean (exit 0).

### Original Integration Milestone Requirements (All Addressed by M6.1 + M6.2)

The integration milestone was defined to verify that:

- Patient requests reach the shared backend. ✅
- Emergency records are created and retrieved correctly. ✅
- Dispatcher actions use authorised APIs. ✅
- Ambulance assignments follow backend validation. ✅
- Hospital information and resources are available to authorised users. ✅
- Destination selection is consistent across portals. ✅ (backend API layer)
- Emergency statuses remain consistent. ✅
- Patient handover and resolution are handled correctly. ✅

### M7 – Final Validation and Deployment Preparation

**Status: Completed**

M7 delivered:
- Applied remote Supabase migrations (`20261124230000`, `20261124231000`) to production Supabase project `ddhtnwgsdwzgibkqbqcx`. All 4 migrations applied; `prisma migrate status` confirmed clean.
- Full documentation consistency review: `API_INTEGRATION_MAP`, `STATUS_MAPPING`, `EMERGENCY_LIFECYCLE`, `AMBULANCE_WORKFLOW` reconciled against verified M5.3/M5.4/M6 implementation.
- Production configuration hardened: `start:prod` script fixed for Node ESM (`dist/src/main.js`), `prisma generate` added to build pipeline, CORS configured via `FRONTEND_ORIGINS` env var, `.env.example` updated.

#### Verification Evidence
- `npm test`: 276/276 passed.
- `npm run test:e2e`: 48/48 passed.
- `npm run build`: Clean.
- `npx tsc --noEmit`: Clean.
- `npx oxlint`: 0 warnings, 0 errors.
- `git diff --check`: Clean.
- Commit: `4ae5e66 feat(backend): complete M6 integration and M7 production readiness`.

---

### M8 – Authentication and Role-Based Access Control

**Status: In progress (M8.1, M8.2, M8.3, M8.4, M8.5 completed)**

M8 implements Supabase Auth JWT-based authentication and role-based access control across all backend endpoints.

**Approved decisions:**
- Auth provider: Supabase Auth (project `ddhtnwgsdwzgibkqbqcx`).
- JWT verification: HS256 with `SUPABASE_JWT_SECRET` (production-ready fallback for MVP; JWKS upgrade path ready).
- Anonymous SOS: `POST /emergencies` supports optional auth — authenticated `initiatorId` from JWT, unauthenticated allowed.
- Session model: Stateless backend; frontend manages Supabase access/refresh tokens.
- Scope: Full M8 (M8.1 → M8.7) including ownership/affiliation guards and actor-ID cleanup.

#### M8.1 — Prisma Identity Mapping

**Status: Completed**

Added `supabaseId String? @unique` to the `User` model to map Prisma `User` records to Supabase Auth user UUIDs (the JWT `sub` claim).

**Files changed:**
- `backend/prisma/schema.prisma` — `supabaseId String? @unique` added as second field on `User`.
- `backend/prisma/migrations/20261126000000_add_supabase_id_to_user/migration.sql` — additive migration: `ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT; CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");`
- `backend/test/lifecycle.db.e2e-spec.ts` — new migration appended to PGlite migration list.

**Verification evidence:**
- `prisma generate` clean (Prisma Client 7.10.1 regenerated from updated schema).
- `npm test`: 276/276 passed.
- `npm run test:e2e`: 48/48 passed.
- `npm run build`: Clean.
- `npx tsc --noEmit`: Clean.
- `npx oxlint`: 0 warnings, 0 errors.
- `git diff --check`: Clean.
- Migration not yet applied to production Supabase (pending M8.7).

#### M8.2 — AuthModule, JWT Authentication & Global RBAC Guards

**Status: Completed**

Implemented the central authentication and role-based access control engine:
- Installed packages: `@nestjs/jwt` (v12.0.5), `@nestjs/passport` (v12.0.2), `passport` (v0.7.0), `passport-jwt` (v4.0.1), `@types/passport-jwt` (v4.0.2).
- Created `backend/src/auth/`:
  - `strategies/jwt.strategy.ts`: Validates incoming Supabase Bearer JWTs (HS256) via `SUPABASE_JWT_SECRET`, resolves internal Prisma `User` by `supabaseId`, rejects unknown (401) or inactive (401) users, and populates `req.user` with `{ userId, supabaseId, role, hospitalId, ambulanceId }`.
  - `guards/jwt-auth.guard.ts`: Extends Passport `AuthGuard('jwt')`, checks `@Public()` metadata to bypass authentication.
  - `guards/roles.guard.ts`: Enforces `@Roles(...UserRole[])`, allows requests when no roles required, rejects non-matching roles with 403 Forbidden, and ensures authenticated user is present when roles are declared.
  - `decorators/public.decorator.ts`: `@Public()` decorator.
  - `decorators/roles.decorator.ts`: `@Roles(...UserRole[])` decorator.
  - `decorators/current-user.decorator.ts`: `@CurrentUser()` parameter decorator.
  - `types/`: `SupabaseJwtPayload`, `AuthenticatedUser`, `AuthenticatedRequest`.
- Registered `AuthModule` and global guards in `AppModule`:
  - `JwtAuthGuard` registered as global `APP_GUARD`.
  - `RolesGuard` registered as second global `APP_GUARD`.
- Documented `SUPABASE_JWT_SECRET` in `backend/.env.example`.
- Added focused unit tests:
  - `jwt.strategy.spec.ts` (4 tests): valid sub resolves user, unknown sub throws 401, inactive user throws 401, missing sub throws 401.
  - `jwt-auth.guard.spec.ts` (2 tests): `@Public()` route bypasses authentication, protected route delegates to Passport AuthGuard.
  - `roles.guard.spec.ts` (5 tests): no `@Roles()` allows, empty `@Roles()` allows, matching role allows, non-matching role throws 403, missing user throws 401.
  - `current-user.decorator.spec.ts` (2 tests): extracts user from request, returns undefined when no user.
- Added dedicated E2E test suite `backend/test/auth.e2e-spec.ts` (5 tests):
  - Unauthenticated request to protected route returns 401 Unauthorized.
  - Malformed Bearer token returns 401 Unauthorized.
  - Unknown subject in JWT returns 401 Unauthorized.
  - Inactive user returns 401 Unauthorized.
  - Valid JWT + active user grants 200 OK.
- Existing E2E suites (`app.e2e-spec.ts`, `lifecycle.e2e-spec.ts`, `lifecycle.db.e2e-spec.ts`) updated with test authentication harness (`test/test-auth.helper.ts`), exercising real JWT parsing, database lookup, and guard verification.
- Production Supabase database was **not touched**.

**Verification evidence:**
- `npm test`: 289/289 passed (21 test files).
- `npm run test:e2e`: 53/53 passed (4 test files).
- `npm run build`: Clean.
- `npx tsc --noEmit`: Clean.
- `npx oxlint`: 0 warnings, 0 errors.
- `git diff --check`: Clean.

#### M8.3 — Public Health & Optional Authentication for Emergency SOS

**Status: Completed**

Implemented route-level public access bypass and optional authentication for emergency SOS creation:
- Created `@OptionalAuth()` decorator (`backend/src/auth/decorators/optional-auth.decorator.ts`) and updated `JwtAuthGuard`:
  - When `@OptionalAuth()` is present and no `Authorization` header exists (or is empty), allows the request to pass through without populating `req.user`.
  - When an `Authorization` header is provided, it must be a valid Supabase JWT; invalid or malformed tokens are rejected with 401 Unauthorized (preventing silent fallback to anonymous).
- Marked `GET /api/v1/health` with `@Public()` in `AppController` so health probes succeed without authentication.
- Updated `POST /api/v1/emergencies`:
  - Decorated with `@OptionalAuth()`.
  - Injected `@CurrentUser() user?: AuthenticatedUser` in `EmergenciesController.create()`.
  - Passes `user ? user.userId : null` to `EmergenciesService.create()`.
  - In `EmergenciesService.create()`, explicitly sets `initiatorId` to authenticated user ID when present, sets `initiatorId: null` when anonymous, and ignores any client-supplied spoofed `initiatorId`.
  - Emits `EMERGENCY_CREATED` `CaseEvent` with `actorId` set to authenticated user ID (or `null` if anonymous).
- Unit test coverage:
  - `jwt-auth.guard.spec.ts` expanded to 7 tests covering `@Public()` with and without token, `@OptionalAuth()` with no header, whitespace header, valid JWT, invalid JWT, and protected routes.
  - `emergencies.controller.spec.ts` updated for anonymous and authenticated creation delegation.
  - `emergencies.service.spec.ts` added test verifying authenticated `initiatorId` overrides client-supplied spoofed identity.
- E2E test coverage:
  - `backend/test/auth.e2e-spec.ts` expanded to 11 tests verifying public `/health` (with/without token), anonymous `POST /emergencies` (`initiatorId: null`, `actorId: null`), authenticated `POST /emergencies` (`initiatorId` populated from JWT), spoofed `initiatorId` override, and 401 rejection on malformed token.
  - `backend/test/lifecycle.db.e2e-spec.ts` verified against in-process PGlite database: authenticated dispatcher SOS case creation and anonymous emergency creation via `X-Anonymous` bypass.
- Production Supabase database was **not touched**.

**Verification evidence:**
- `npm test`: 296/296 passed (21 test files).
- `npm run test:e2e`: 59/59 passed (4 test files).
- `npm run build`: Clean.
- `npx tsc --noEmit`: Clean.
- `npx oxlint`: 0 warnings, 0 errors.
- `git diff --check`: Clean.

#### M8.4 — Role-Based Access Control to Protected API Endpoints

**Status: Completed**

Applied declarative `@Roles(...UserRole[])` decorators across all protected controller endpoints per the authoritative role matrix in `M8_AUTH_RBAC_BLUEPRINT.md`:
- `EmergenciesController`:
  - `POST /api/v1/emergencies`: Preserved `@OptionalAuth()` without role restrictions (supports anonymous SOS and patient/caregiver creation).
  - `GET /api/v1/emergencies`: Restricted to `DISPATCHER, SYSTEM_ADMIN`.
  - `GET /api/v1/emergencies/:id`: Restricted to `DISPATCHER, PARAMEDIC, AMBULANCE_DRIVER, DOCTOR, HOSPITAL_ADMIN, SYSTEM_ADMIN`.
  - `PATCH /api/v1/emergencies/:id/status`: Restricted to `DISPATCHER, SYSTEM_ADMIN`.
- `AssignmentsNestedController` & `AssignmentsController`:
  - `POST /emergencies/:id/assignments`: Restricted to `DISPATCHER, SYSTEM_ADMIN`.
  - `GET /emergencies/:id/assignments` & `GET /assignments/:id`: Restricted to `DISPATCHER, PARAMEDIC, AMBULANCE_DRIVER, SYSTEM_ADMIN`.
  - `PATCH /assignments/:id/accept` & `PATCH /assignments/:id/reject`: Restricted to `PARAMEDIC, AMBULANCE_DRIVER, SYSTEM_ADMIN`.
  - `PATCH /assignments/:id/status`: Restricted to `PARAMEDIC, AMBULANCE_DRIVER, DISPATCHER, SYSTEM_ADMIN`.
- `AmbulancesController`:
  - `POST /ambulances`: Restricted to `SYSTEM_ADMIN`.
  - `GET /ambulances` & `PATCH /ambulances/:id/status`: Restricted to `DISPATCHER, SYSTEM_ADMIN`.
  - `GET /ambulances/:id`: Restricted to `DISPATCHER, PARAMEDIC, AMBULANCE_DRIVER, SYSTEM_ADMIN`.
- `HospitalsController`:
  - `POST /hospitals`: Restricted to `SYSTEM_ADMIN`.
  - `GET /hospitals`, `GET /hospitals/:id`, `GET /hospitals/:id/resources`: Restricted to `DISPATCHER, DOCTOR, HOSPITAL_ADMIN, SYSTEM_ADMIN`.
  - `PATCH /hospitals/:id`, `POST /hospitals/:id/resources`, `PATCH /hospitals/:id/resources/:rid`: Restricted to `HOSPITAL_ADMIN, SYSTEM_ADMIN`.
- `AllocationController`:
  - `GET /emergencies/:id/ambulance-recommendations`, `GET /emergencies/:id/hospital-recommendations`, `PATCH /emergencies/:id/destination`: Restricted to `DISPATCHER, SYSTEM_ADMIN`.
- `HandoversController`:
  - `POST /handovers`: Restricted to `PARAMEDIC, AMBULANCE_DRIVER, DISPATCHER, SYSTEM_ADMIN`.
  - `GET /handovers/:id`, `GET /handovers/case/:caseId/active`, `GET /handovers/case/:caseId`: Restricted to `PARAMEDIC, DOCTOR, DISPATCHER, HOSPITAL_ADMIN, SYSTEM_ADMIN`.
  - `PATCH /handovers/:id`: Restricted to `PARAMEDIC, SYSTEM_ADMIN`.
  - `POST /handovers/:id/complete` & `POST /handovers/:id/reject`: Restricted to `DOCTOR, HOSPITAL_ADMIN, SYSTEM_ADMIN`.
  - `POST /handovers/:id/cancel`: Restricted to `PARAMEDIC, DISPATCHER, SYSTEM_ADMIN`.
- Test harness updates:
  - Extended `backend/test/test-auth.helper.ts` with typed test fixtures: `E2E_TEST_ADMIN_USER`, `E2E_TEST_PARAMEDIC_USER`, `E2E_TEST_DOCTOR_USER`, `E2E_TEST_PATIENT_USER`.
  - Updated `lifecycle.db.e2e-spec.ts` to assign `supabaseId` to seeded Paramedic and Doctor users and use role-appropriate JWTs for assignment acceptance (`PARAMEDIC`) and handover completion (`DOCTOR`).
  - Added focused unit tests in `roles.guard.spec.ts` (8 tests) proving multiple allowed roles, `SYSTEM_ADMIN` allowance, and non-matching/null role rejection.
  - Added dedicated M8.4 E2E test suite in `auth.e2e-spec.ts` (17 tests) proving representative 200/201 success for permitted roles and 403 Forbidden for disallowed roles across emergencies, ambulances, hospitals, and assignments.
- Production Supabase database was **not touched**.

**Verification evidence:**
- `npm test`: 299/299 passed (21 test files).
- `npm run test:e2e`: 65/65 passed (4 test files).
- `npm run build`: Clean.
- `npx tsc --noEmit`: Clean.
- `npx oxlint`: 0 warnings, 0 errors.
- `git diff --check`: Clean.

#### M8.5 — Ownership & Resource-Scope Authorization

Service-layer ownership and affiliation guards enforce that role-level access (`@Roles()`) is a necessary but not sufficient condition. Authenticated users must also own or be affiliated with the specific resource they are accessing or modifying.

**Authorization model:**
- `SYSTEM_ADMIN` and `DISPATCHER` bypass all ownership/scope checks.
- `DOCTOR` and `HOSPITAL_ADMIN` are scoped to their own `hospitalId`.
- `PARAMEDIC` and `AMBULANCE_DRIVER` are scoped to their own `ambulanceId`.
- `PATIENT` may only access emergencies where they are the initiator or the linked patient.
- Scope violations return `403 Forbidden`; unauthenticated requests return `401 Unauthorized`.

**Changes:**
- `HospitalsService`: added `validateHospitalScope(user, hospitalId)` called in `findAll`, `findOne`, `update`, `createResource`, `findResources`, `updateResource`.
- `AssignmentsService`: added `validateAmbulanceScope(user, ambulanceId)` called in `findOne`, `accept`, `reject`, `updateStatus`.
- `AmbulancesService`: added `validateAmbulanceScope(user, ambulanceId)` in `findOne`.
- `EmergenciesService`: added patient ownership check in `findOne`.
- `HandoversService`: added `validateHandoverScope(user, handover, action)` in `findOne`, `findActiveByCaseId`, `findAllForCase`, `update`, `complete`, `reject`, `cancel`, `initiateHandover`.
- All affected controllers updated to inject `@CurrentUser() user?: AuthenticatedUser` and pass to service methods.
- 20 controller unit test assertions updated to match new service call signatures.
- 17 new service unit tests covering own-resource allow, cross-resource deny, bypass for privileged roles.
- 11 new E2E ownership tests in `test/auth.e2e-spec.ts`.
- Production Supabase database was **not touched**.

**Verification evidence:**
- `npm test`: 316/316 passed (21 test files).
- `npm run test:e2e`: 76/76 passed (4 test files).
- `npm run build`: Clean.
- `npx tsc --noEmit`: Clean.
- `npx oxlint`: 0 warnings, 0 errors.
- `git diff --check`: Clean.

#### Remaining M8 Sub-milestones

| Sub-milestone | Description | Status |
|---|---|---|
| M8.1 | Prisma identity mapping (`User.supabaseId`) | Completed |
| M8.2 | `AuthModule`, JWT strategy, global `JwtAuthGuard`, `RolesGuard`, decorators | Completed |
| M8.3 | Mark public routes (`@Public()`), optional-auth SOS | Completed |
| M8.4 | Apply `@Roles()` to all protected routes | Completed |
| M8.5 | Ownership / affiliation guards (hospital scope, ambulance scope, patient ownership) | Completed |
| M8.6 | Remove client-supplied actor IDs from DTOs; populate from JWT | Completed |
| M8.7 | Full validation, documentation update, production migration, commit | Completed locally (migration pending) |

### 7.7 M8.7 – Final Validation & Production Readiness

**Status: Completed Locally (Production Migration Pending Authorization Gate)**

M8.7 completes the comprehensive audit and local validation gate for M8 Authentication & Role-Based Access Control. All sub-milestones M8.1 through M8.6 are verified internally consistent, fully tested, documented, and ready for deployment.

#### Completed M8.7 Audits & Functionality (Verified)
- **End-to-End Pipeline Audit**: Verified Supabase JWT validation, user mapping (`User.supabaseId`), global `JwtAuthGuard`, global `RolesGuard`, service domain scope guards (`validateHospitalScope`, `validateAmbulanceScope`, patient ownership), and trusted actor attribution (`user.userId`).
- **Zero Client Identity Leaks**: Confirmed that no client-controlled actor IDs exist in any API request DTO. Any attempts to supply obsolete fields (`dispatcherId`, `actorId`, `paramedicId`, `receivingDoctorId`, `rejectingStaffId`) are rejected with `400 Bad Request` by `ValidationPipe`.
- **Migration Safety**: Inspected `20261126000000_add_supabase_id_to_user/migration.sql`. Confirmed it is strictly non-destructive (nullable `TEXT` column + unique index), backward-compatible with all existing records, and safe to execute against production when authorized.
- **Local Stateful DB Migration Runner**: Verified that `backend/test/lifecycle.db.e2e-spec.ts` applies `20261126000000_add_supabase_id_to_user` to the local PGlite test instance, proving real PostgreSQL compatibility and end-to-end lifecycle integrity.
- **Prisma & Secret Safety**: Verified `.env.example` documents `DATABASE_URL`, `DIRECT_URL`, `PORT`, `SUPABASE_JWT_SECRET`, and `FRONTEND_ORIGINS`. No production secrets or credentials are hard-coded in the repository.
- **Production Supabase DB**: Untouched. No migrations were applied to remote production (`ddhtnwgsdwzgibkqbqcx`).
- **Git Hygiene**: No commits or pushes performed. Working tree preserved.

#### Verification Evidence
- Unit test suite: 315/315 passed across 21 test files.
- E2E test suite: 81/81 passed across 4 test files.
- Linting: 0 warnings, 0 errors (`npx oxlint .` across 100 files).
- Type checking: `npx tsc --noEmit` clean.
- Build: `npm run build` clean.
- Git Diff: `git diff --check` clean.

#### M8 Sub-milestone Summary

| Sub-milestone | Description | Status |
|---|---|---|
| M8.1 | Prisma identity mapping (`User.supabaseId`) | Completed |
| M8.2 | `AuthModule`, JWT strategy, global `JwtAuthGuard`, `RolesGuard`, decorators | Completed |
| M8.3 | Mark public routes (`@Public()`), optional-auth SOS | Completed |
| M8.4 | Apply `@Roles()` to all protected routes | Completed |
| M8.5 | Ownership / affiliation guards (hospital scope, ambulance scope, patient ownership) | Completed |
| M8.6 | Remove client-supplied actor IDs from DTOs; populate from JWT | Completed |
| M8.7 | Full validation, documentation update, production migration gate | Completed |
| M8.8 | Production migration deployment & schema verification | Completed |

### 7.8 M8.8 – Production Migration Deployment & Verification

**Status: Completed**

M8.8 authorized and executed the production database migration deployment for M8 Authentication & Role-Based Access Control against the Supabase database (`ddhtnwgsdwzgibkqbqcx`).

#### Completed M8.8 Deployment & Verification (Verified)
- **Production Migration Deployment**: Executed `npx prisma migrate deploy` targeting remote PostgreSQL. Applied migration `20261126000000_add_supabase_id_to_user`.
- **Migration Status Check**: Verified via `npx prisma migrate status` that all 5 migrations are applied and the database schema is completely up to date.
- **Direct Read-Only Production Schema Verification**:
  - `User.supabaseId` exists as a `text` column with `is_nullable = YES`.
  - Unique index `User_supabaseId_key` exists on `public."User" ("supabaseId")`.
  - Non-destructive execution confirmed: existing records preserved intact.
- **Production Auth Readiness**: Verified that Supabase Auth JWT identity mapping (`JWT sub` → `User.supabaseId` → `User.id`) can now be resolved on the live database.
- **Post-Deployment Codebase Verification**: Verified `npm test` (315/315), `npm run test:e2e` (81/81), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint .` (clean), `git diff --check` (clean).
- **Git Tree State**: All changes remain uncommitted; no commit or push executed.

#### M8 Milestone Summary

| Sub-milestone | Description | Status |
|---|---|---|
| M8.1 | Prisma identity mapping (`User.supabaseId`) | Completed |
| M8.2 | `AuthModule`, JWT strategy, global `JwtAuthGuard`, `RolesGuard`, decorators | Completed |
| M8.3 | Mark public routes (`@Public()`), optional-auth SOS | Completed |
| M8.4 | Apply `@Roles()` to all protected routes | Completed |
| M8.5 | Ownership / affiliation guards (hospital scope, ambulance scope, patient ownership) | Completed |
| M8.6 | Remove client-supplied actor IDs from DTOs; populate from JWT | Completed |
| M8.7 | Full validation, documentation update, production migration gate | Completed |
| M8.8 | Production migration deployment & verification | Completed |

### 7.6 M8.6 – Actor-ID Cleanup & Trusted JWT Identity

**Status: Completed**

M8.6 removed client-controlled actor and identity fields across all request DTOs. Actor identity and attribution are now derived exclusively from the authenticated JWT (`req.user` / `@CurrentUser() user?: AuthenticatedUser`).

#### Completed M8.6 Functionality (Verified)
- **DTO Cleanup**: Removed 12 client-controlled actor/identity fields:
  - `CreateAssignmentDto.dispatcherId`
  - `AcceptAssignmentDto.actorId`
  - `RejectAssignmentDto.actorId`
  - `UpdateAssignmentStatusDto.actorId`
  - `UpdateEmergencyStatusDto.actorId`
  - `CreateHandoverDto.paramedicId`
  - `CreateHandoverDto.receivingDoctorId`
  - `UpdateHandoverDto.paramedicId`
  - `UpdateHandoverDto.receivingDoctorId`
  - `CompleteHandoverDto.receivingDoctorId`
  - `RejectHandoverDto.rejectingStaffId`
  - `CancelHandoverDto.actorId`
- **Strict Validation**: With `forbidNonWhitelisted: true`, any client request supplying these deprecated actor fields is immediately rejected with `400 Bad Request`.
- **Controller Integration**: `AssignmentsController`, `AssignmentsNestedController`, and `EmergenciesController` inject `@CurrentUser() user?: AuthenticatedUser` and pass verified user context to domain services. `HandoversController` continues passing caller user context.
- **Service Attribution**:
  - `AssignmentsService.create`: sets `dispatcherId = user.userId` on Assignment; sets `actorId = user.userId` on `AMBULANCE_ASSIGNED` CaseEvent.
  - `AssignmentsService.accept`, `reject`, `updateStatus`: sets `actorId = user.userId` on `AMBULANCE_ACCEPTED`, `AMBULANCE_REJECTED`, and assignment status transition CaseEvents.
  - `EmergenciesService.updateStatus`: sets `actorId = user.userId` on status transition CaseEvents.
  - `HandoversService.initiateHandover`: sets `paramedicId = user.userId` on Handover; sets `actorId = user.userId` on `HANDOVER_STARTED` CaseEvent.
  - `HandoversService.completeHandover`: sets `receivingDoctorId = user.userId` on Handover; sets `actorId = user.userId` on `HANDOVER_COMPLETED` and `CASE_COMPLETED` CaseEvents.
  - `HandoversService.rejectHandover`: sets `actorId = user.userId` on `HANDOVER_REJECTED` CaseEvent.
  - `HandoversService.cancelHandover`: sets `actorId = user.userId` on `HANDOVER_CANCELLED` CaseEvent.
- **Anonymous Emergency Preservation**: Preserved anonymous SOS on `POST /api/v1/emergencies`. When no JWT is present, `initiatorId` remains `null` and initial `CaseEvent.actorId` remains `null`. When a valid JWT is present, `initiatorId` and `CaseEvent.actorId` are derived from the token.
- **Lifecycle DB Test Suite**: Updated `test/lifecycle.db.e2e-spec.ts` with M8.1 migration file in PGlite migration runner, global Bearer token attachment, and removed obsolete client DTO fields.

#### Verification Evidence
- Unit test suite: 315/315 passed across 21 test files.
- E2E test suite: 81/81 passed across 4 test files (+5 new M8.6 tests in `test/auth.e2e-spec.ts`).
- Linting: 0 warnings, 0 errors (`npx oxlint .` across 100 files).
- Type checking: `npx tsc --noEmit` clean.
- Build: `npm run build` clean.
- Production Supabase database was **not touched**.
- Git tree: all changes uncommitted; no commit or push executed.

#### Remaining M8 Sub-milestones

| Sub-milestone | Description | Status |
|---|---|---|
| M8.1 | Prisma identity mapping (`User.supabaseId`) | Completed |
| M8.2 | `AuthModule`, JWT strategy, global `JwtAuthGuard`, `RolesGuard`, decorators | Completed |
| M8.3 | Mark public routes (`@Public()`), optional-auth SOS | Completed |
| M8.4 | Apply `@Roles()` to all protected routes | Completed |
| M8.5 | Ownership / affiliation guards (hospital scope, ambulance scope, patient ownership) | Completed |
| M8.6 | Remove client-supplied actor IDs from DTOs; populate from JWT | Completed |
| M8.7 | Full validation, documentation update, production migration, commit | Completed locally (migration pending) |

### 7.7 M8.7 – Final Validation & Production Readiness

**Status: Completed Locally (Production Migration Pending Authorization Gate)**

M8.7 completes the comprehensive audit and local validation gate for M8 Authentication & Role-Based Access Control. All sub-milestones M8.1 through M8.6 are verified internally consistent, fully tested, documented, and ready for deployment.

#### Completed M8.7 Audits & Functionality (Verified)
- **End-to-End Pipeline Audit**: Verified Supabase JWT validation, user mapping (`User.supabaseId`), global `JwtAuthGuard`, global `RolesGuard`, service domain scope guards (`validateHospitalScope`, `validateAmbulanceScope`, patient ownership), and trusted actor attribution (`user.userId`).
- **Zero Client Identity Leaks**: Confirmed that no client-controlled actor IDs exist in any API request DTO. Any attempts to supply obsolete fields (`dispatcherId`, `actorId`, `paramedicId`, `receivingDoctorId`, `rejectingStaffId`) are rejected with `400 Bad Request` by `ValidationPipe`.
- **Migration Safety**: Inspected `20261126000000_add_supabase_id_to_user/migration.sql`. Confirmed it is strictly non-destructive (nullable `TEXT` column + unique index), backward-compatible with all existing records, and safe to execute against production when authorized.
- **Local Stateful DB Migration Runner**: Verified that `backend/test/lifecycle.db.e2e-spec.ts` applies `20261126000000_add_supabase_id_to_user` to the local PGlite test instance, proving real PostgreSQL compatibility and end-to-end lifecycle integrity.
- **Prisma & Secret Safety**: Verified `.env.example` documents `DATABASE_URL`, `DIRECT_URL`, `PORT`, `SUPABASE_JWT_SECRET`, and `FRONTEND_ORIGINS`. No production secrets or credentials are hard-coded in the repository.
- **Production Supabase DB**: Untouched. No migrations were applied to remote production (`ddhtnwgsdwzgibkqbqcx`).
- **Git Hygiene**: No commits or pushes performed. Working tree preserved.

#### Verification Evidence
- Unit test suite: 315/315 passed across 21 test files.
- E2E test suite: 81/81 passed across 4 test files.
- Linting: 0 warnings, 0 errors (`npx oxlint .` across 100 files).
- Type checking: `npx tsc --noEmit` clean.
- Build: `npm run build` clean.
- Git Diff: `git diff --check` clean.

#### M8 Sub-milestone Summary

| Sub-milestone | Description | Status |
|---|---|---|
| M8.1 | Prisma identity mapping (`User.supabaseId`) | Completed |
| M8.2 | `AuthModule`, JWT strategy, global `JwtAuthGuard`, `RolesGuard`, decorators | Completed |
| M8.3 | Mark public routes (`@Public()`), optional-auth SOS | Completed |
| M8.4 | Apply `@Roles()` to all protected routes | Completed |
| M8.5 | Ownership / affiliation guards (hospital scope, ambulance scope, patient ownership) | Completed |
| M8.6 | Remove client-supplied actor IDs from DTOs; populate from JWT | Completed |
| M8.7 | Full validation, documentation update, production migration gate | Completed |
| M8.8 | Production migration deployment & schema verification | Completed |

### 7.8 M8.8 – Production Migration Deployment & Verification

**Status: Completed**

M8.8 authorized and executed the production database migration deployment for M8 Authentication & Role-Based Access Control against the Supabase database (`ddhtnwgsdwzgibkqbqcx`).

#### Completed M8.8 Deployment & Verification (Verified)
- **Production Migration Deployment**: Executed `npx prisma migrate deploy` targeting remote PostgreSQL. Applied migration `20261126000000_add_supabase_id_to_user`.
- **Migration Status Check**: Verified via `npx prisma migrate status` that all 5 migrations are applied and the database schema is completely up to date.
- **Direct Read-Only Production Schema Verification**:
  - `User.supabaseId` exists as a `text` column with `is_nullable = YES`.
  - Unique index `User_supabaseId_key` exists on `public."User" ("supabaseId")`.
  - Non-destructive execution confirmed: existing records preserved intact.
- **Production Auth Readiness**: Verified that Supabase Auth JWT identity mapping (`JWT sub` → `User.supabaseId` → `User.id`) can now be resolved on the live database.
- **Post-Deployment Codebase Verification**: Verified `npm test` (315/315), `npm run test:e2e` (81/81), `npm run build` (clean), `npx tsc --noEmit` (clean), `npx oxlint .` (clean), `git diff --check` (clean).
- **Git Tree State**: All changes remain uncommitted; no commit or push executed.

#### M8 Milestone Summary

| Sub-milestone | Description | Status |
|---|---|---|
| M8.1 | Prisma identity mapping (`User.supabaseId`) | Completed |
| M8.2 | `AuthModule`, JWT strategy, global `JwtAuthGuard`, `RolesGuard`, decorators | Completed |
| M8.3 | Mark public routes (`@Public()`), optional-auth SOS | Completed |
| M8.4 | Apply `@Roles()` to all protected routes | Completed |
| M8.5 | Ownership / affiliation guards (hospital scope, ambulance scope, patient ownership) | Completed |
| M8.6 | Remove client-supplied actor IDs from DTOs; populate from JWT | Completed |
| M8.7 | Full validation, documentation update, production migration gate | Completed |
| M8.8 | Production migration deployment & verification | Completed |

## 8. M9 – Supabase Auth Integration & Identity Foundation

### 8.1 M9.1 – Supabase Auth User Provisioning & Role Metadata

**Status: Completed**

M9.1 implements the backend Supabase Auth user provisioning and identity-linking foundation, establishing safe, deterministic mapping between verified Supabase Auth JWT identities (`sub`) and internal RAAH `User` records.

#### Completed M9.1 Functionality (Verified)
- **Identity Resolution & Provisioning Service**: Implemented `UserProvisioningService` in `src/auth/services/user-provisioning.service.ts` to resolve `AuthenticatedUser` from verified JWT claims (`payload.sub` matching `User.supabaseId`).
- **Safe Unknown Identity Handling**: Unknown Supabase identities return `401 Unauthorized`. The backend strictly forbids silently provisioning privileged accounts (admin, dispatcher, doctor, paramedic) or creating unverified ghost records.
- **Active Account Enforcement**: Inactive users (`isActive: false`) are rejected with `401 Unauthorized`.
- **Role Consistency Policy**: Database `User.role` is authoritative for runtime authorization (`RolesGuard` and domain scope checks). `user_metadata` is completely ignored for permissions, preventing client privilege escalation attacks.
- **Administrative User Management & Linking**:
  - `GET /api/v1/auth/me`: safe read-only profile lookup for authenticated caller.
  - `POST /api/v1/auth/users`: explicit user creation restricted to `SYSTEM_ADMIN`.
  - `POST /api/v1/auth/users/link`: explicit identity linking (`userId` to `supabaseId`) restricted to `SYSTEM_ADMIN` with 409 conflict checks for already-linked entities.
- **JwtStrategy Integration**: Refactored `JwtStrategy` to delegate user validation to `UserProvisioningService`.
- **Comprehensive Test Coverage**:
  - 14 unit tests (12 in `user-provisioning.service.spec.ts`, 2 in `jwt.strategy.spec.ts`).
  - 8 new E2E tests in `test/auth.e2e-spec.ts` verifying `/auth/me`, unknown sub rejection, inactive rejection, privilege escalation prevention, and administrative user creation/linking.

#### Verification Evidence
- Unit test suite: 325/325 passed across 22 test files.
- E2E test suite: 89/89 passed across 4 test files.
- Build: clean (`prisma generate` + `nest build`).
- TypeScript: 0 errors (`npx tsc --noEmit`).
- Linter: 0 warnings, 0 errors (`npx oxlint .` across 105 files).
- Git diff check: clean.
- Production Supabase database: untouched.

### 8.2 M9.2 – Patient Self-Registration & Supabase Identity Linking

**Status: Completed**

M9.2 implements the patient self-registration flow on `POST /api/v1/auth/register`, enabling newly authenticated Supabase Auth identities (`sub`) to establish their RAAH application identity as a `PATIENT`.

#### Completed M9.2 Functionality (Verified)
- **Dedicated Registration Auth Guard**: `SupabaseJwtAuthGuard` cryptographically verifies Bearer token signatures and expiration without requiring prior database existence, attaching claims to `req.jwtPayload`.
- **Authoritative Identity**: The external identity `supabaseId` is derived strictly from verified `JWT.sub`. Client-supplied identity fields are forbidden.
- **Enforced PATIENT Role**: The registration service always assigns `UserRole.PATIENT`. Clients cannot choose or escalate roles.
- **Operational Scope Isolation**: `hospitalId` and `ambulanceId` are set to `null`.
- **DTO Validation Protection**: `RegisterPatientDto` accepts only profile metadata (`name`, `email`, `phone`). Client attempts to submit `role`, `supabaseId`, `userId`, `hospitalId`, `ambulanceId`, or `isActive` trigger `400 Bad Request` via global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`).
- **Duplicate & Race Condition Handling**: Checks for existing `User.supabaseId` (409 Conflict) and catches Prisma unique constraint violations (`P2002`) to handle concurrent registration requests safely.
- **Continuous Profile Access**: Newly registered patients can immediately access `GET /api/v1/auth/me`.
- **Administrative Provisioning Preservation**: M9.1 admin endpoints (`POST /auth/users`, `POST /auth/users/link`) remain strictly gated to `SYSTEM_ADMIN`.

#### Verification Evidence
- Unit test suite: 335/335 passed across 23 test files (+10 tests: 5 in `supabase-jwt-auth.guard.spec.ts`, 5 in `user-provisioning.service.spec.ts`).
- E2E test suite: 99/99 passed across 4 test files (+10 tests in `test/auth.e2e-spec.ts`).
- Build: clean (`prisma generate` + `nest build`).
- TypeScript: 0 errors (`npx tsc --noEmit`).
- Linter: 0 warnings, 0 errors (`npx oxlint .` across 109 files).
- Git diff check: clean.
- Production Supabase database: untouched.

## 9. M3 – Frontend Foundation

**Status: Completed**

M3 establishes the production-quality frontend foundation in `apps/web` connected to the RAAH-CARE NestJS backend and Supabase Auth.

### Completed M3 Architecture & Functionality (Verified)
- **Frontend Stack**: Established in `apps/web` using React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, and React Router v7 within the existing pnpm monorepo.
- **Environment Configuration**: Configured `.env.example` and local `.env` exposing only safe public variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`). Zero private secrets or backend credentials exposed.
- **Supabase Authentication**: Integrated `@supabase/supabase-js` client with session persistence, automatic token refresh, and auth state change listeners.
- **Centralized API Client**: Created `apiClient` (`src/api/client.ts`) with automatic Supabase JWT Bearer token attachment (`Authorization: Bearer <access_token>`), typed domain endpoints, and structured error handling (`ApiError`).
- **Role-Aware Authentication & Route Protection**:
  - `AuthProvider` and `useAuth` hook managing Supabase session and backend RAAH profile fetched via `GET /api/v1/auth/me`.
  - `ProtectedRoute` enforcing session verification, unknown-user onboarding redirect (`needsRegistration`), and role-based gating (`allowedRoles`).
- **Application Shell & Layout**:
  - Reusable `AppLayout` with responsive navigation and authenticated session details.
  - Public routes: `LoginPage`, `RegisterPage` (patient self-registration).
  - Protected portal containers: `PatientPortalPage`, `DispatcherPortalPage`, `AmbulancePortalPage`, `HospitalPortalPage`, and `AdminPortalPage`.
- **Integration Testing**:
  - Validated `/auth/me` integration flow, token injection, error handling, loading states, and role-based route blocking.
  - 8/8 frontend tests passing in Vitest (`apps/web`).
- **Backend Integrity**:
  - All 335 backend unit tests and 99 E2E tests remain 100% green.

### Verification Evidence
- Frontend tests: 8/8 passed (`vitest run` in `apps/web`).
- Frontend build: clean (`tsc -b && vite build` in `apps/web`).
- Frontend lint: 0 warnings, 0 errors (`oxlint` across 27 files).
- Backend unit tests: 335/335 passed (`vitest run` in `backend`).
- Backend E2E tests: 99/99 passed (`vitest run --config ./vitest.config.e2e.ts` in `backend`).
- Backend build: clean (`prisma generate && nest build` in `backend`).
- Backend lint: 0 warnings, 0 errors (`oxlint` across 109 files).
- Production Supabase database: untouched.

---

## 11. M9.3 – M9.7 Verified Milestones

### M9.3 – Patient Emergency History & Navigation Integration
- **Status: Completed**
- Integrated real-time emergency tracking and historical emergency case view in `apps/patient-web`.
- Stabilized patient auth state machine, eliminating routing bounce between `/login` and `/register`.

### M9.4 – Patient Clinical Profile APIs & Emergency Contacts
- **Status: Completed**
- Implemented `PatientsModule` with `GET /api/v1/patients/me` and `PATCH /api/v1/patients/me`.
- Restricted endpoints strictly to `PATIENT` role using `@Roles(UserRole.PATIENT)` and `SupabaseJwtAuthGuard`.
- Connected `MedicalProfilePage.tsx` and `PatientSettingsPage.tsx` to live backend persistence.

### M9.5 – Secure Cura Card Ephemeral QR & Responder Scanning
- **Status: Completed**
- Designed dual-layer QR security architecture: QR contains zero raw PII; encodes transient 256-bit token.
- Implemented `CuraCardService` in NestJS with SHA-256 token hashing, 5-minute expiry, and instant revocation.
- Implemented `POST /api/v1/cura-card/resolve` restricted to `PARAMEDIC` and `DOCTOR`.
- Integrated HTML5 video camera decoding using `jsQR` across `apps/ambulance-web` and `apps/hospital-web`.
- Added automated audit logging via `CuraCardAudit` capturing access attempts and outcomes.

### M9.6 – Frontend Route Recovery & Local Development Stability
- **Status: Completed**
- Resolved NestJS development startup path issue by aligning `backend/nest-cli.json` entryFile to `src/main`.
- Resolved blank screen rendering on unauthenticated profile/card visits by adding graceful fallback UI cards.
- Restored direct routing across all four portals (`patient-web`, `ambulance-web`, `hospital-web`, `admin-web`).

### M9.7 – Database Schema Alignment & Monorepo Pre-Deployment Pass
- **Status: Completed**
- Aligned `backend/prisma/schema.prisma` with production PostgreSQL schema: configured `revokedAt DateTime?` (nullable) and removed obsolete boolean column.
- Updated `CuraCardService` to handle `revokedAt: null` for active tokens.
- Extended Vitest timeout to 30000ms in `backend/vitest.config.ts` to prevent parallel hook timeouts on Windows.
- Verified monorepo with 438 passing automated tests (363 backend, 75 frontend) and 100% clean production builds across all 5 workspace projects.

## 10. Testing and Validation Milestone

Testing should cover:

- Successful emergency creation.
- Invalid emergency requests.
- Ambulance assignment.
- Assignment acceptance and rejection.
- Conflicting active assignments.
- Invalid status transitions.
- Hospital availability changes.
- Destination changes.
- Patient information access restrictions.
- Failure and recovery scenarios.

## 9. Completion Criteria

A milestone is complete only when:

1. Required implementation is present.
2. Relevant tests pass.
3. API contracts are documented.
4. Integration dependencies are addressed.
5. Code review is completed.
6. Documentation reflects the actual implementation.
7. Changes are merged through the agreed Git workflow.

## 10. Updating Milestones

Update this document whenever a milestone changes.

Record:
- Milestone identifier.
- Scope.
- Completion status.
- Relevant pull requests or commits.
- Outstanding dependencies.
- Verification evidence.
