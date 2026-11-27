# RAAH – Task Tracker

## 1. Purpose

This document provides a central overview of project tasks, their current status and dependencies.

The tracker should be updated as work progresses and should reflect actual implementation rather than assumptions.

## 2. Status Definitions

| Status | Meaning |
|---|---|
| NOT STARTED | Work has not begun. |
| IN PROGRESS | Work is actively being implemented. |
| BLOCKED | Work cannot proceed because of a dependency or unresolved issue. |
| REVIEW | Work is awaiting review or verification. |
| COMPLETED | Work has been implemented and verified. |
| DEFERRED | Work has intentionally been moved to a later phase. |

## 3. Backend Tasks

| Task | Status | Notes |
|---|---|---|
| Core emergency management | Existing foundation | Verify against current repository |
| Emergency retrieval and status management | Existing foundation | Verify current tests |
| Ambulance assignment management | Existing foundation | Assignment lifecycle validation exists |
| Assignment acceptance and rejection | Existing foundation | Verify integration |
| Hospital management | Existing foundation | Verify current implementation |
| Hospital resource management | Existing foundation | Verify current implementation |
| Allocation DTO foundation | COMPLETED | M5.3 Stage 1 |
| Ambulance recommendation API | COMPLETED | M5.3 Stage 2 (`GET /api/v1/emergencies/:id/ambulance-recommendations`) |
| Hospital recommendation API | COMPLETED | M5.3 Stage 2 (`GET /api/v1/emergencies/:id/hospital-recommendations`) |
| Destination selection API | CONDITIONALLY ACCEPTED | M5.3 Stage 2 (`PATCH /api/v1/emergencies/:id/destination`). Core implementation verified; follow-up items tracked. |
| Patient Handover module & lifecycle APIs | CONDITIONALLY ACCEPTED | M5.4 (`POST /api/v1/handovers`, `complete`, `reject`, `cancel`, `GET`, `PATCH`). Core implementation & tests verified; follow-ups tracked. |
| Remote handover migration deployment | PENDING | Deploy 20261124230000 and 20261124231000 to remote Supabase database |
| M8.1 — Prisma identity mapping (`User.supabaseId`) | COMPLETED | Schema updated, migration authored, Prisma client regenerated, 276/276 unit + 48/48 E2E passing. Migration not yet applied to production. |
| M8.2 — `AuthModule`, `JwtStrategy`, global guards, decorators | COMPLETED | Installed @nestjs/jwt, @nestjs/passport, passport, passport-jwt. Implemented JwtStrategy, JwtAuthGuard, RolesGuard, @Public(), @Roles(), @CurrentUser(). Registered globally in AppModule. 289 unit tests + 53 E2E tests passing. |
| M8.3 — Public route annotations, optional-auth SOS | COMPLETED | `@Public()` on health; `@OptionalAuth()` on `POST /emergencies`; verified 296 unit + 59 E2E tests. |
| M8.4 — `@Roles()` applied to all protected routes | COMPLETED | Decorated all protected controller endpoints per M8 blueprint role matrix; 299 unit + 65 E2E tests pass. |
| M8.5 — Ownership / affiliation guards (service layer) | COMPLETED | Hospital scope, ambulance crew scope, patient ownership. 316/316 unit + 76/76 E2E tests pass. |
| M8.6 — Remove client-supplied actor IDs; populate from JWT | COMPLETED | 12 DTO fields removed; `CaseEvent.actorId` from `req.user`. 315/315 unit + 81/81 E2E tests pass. |
| M8.7 — M8 final validation, docs, production migration | COMPLETED | Production migration `20261126000000` applied to Supabase; 315 unit + 81 E2E tests pass. |
| M9.1 — Supabase Auth User Provisioning & Role Metadata | COMPLETED | UserProvisioningService, AuthController (/auth/me, /auth/users, /auth/users/link); 325 unit + 89 E2E tests pass. |
| M9.2 — Patient Self-Registration & Supabase Identity Linking | COMPLETED | POST /auth/register, SupabaseJwtAuthGuard, RegisterPatientDto; 335 unit + 99 E2E tests pass. |
| M9.3 — Patient Emergency History & Navigation Integration | COMPLETED | Real-time emergency tracking, incident history, resolved /login to /register bounce in patient-web. |
| M9.4 — Patient Clinical Profile APIs (`/patients/me`) | COMPLETED | Implemented PatientsModule, GET/PATCH /api/v1/patients/me, emergency contact persistence. |
| M9.5 — Secure Cura Card Ephemeral QR & Responder Scanning | COMPLETED | 5-minute ephemeral QR crypto, jsQR HTML5 camera scanners in ambulance-web & hospital-web, CuraCardAudit logging. |
| M9.6 — Frontend Route Recovery & Local Stability | COMPLETED | Fixed backend entryFile in nest-cli.json, fixed blank screens with defensive fallbacks, restored portal routes. |
| M9.7 — Database Schema Alignment & Monorepo Pre-Deployment Pass | COMPLETED | Aligned schema.prisma to revokedAt TIMESTAMP(3), Vitest timeouts updated, 438/438 automated tests pass across monorepo. |
| Handover authentication & RBAC protection | IN PROGRESS (M8) | Covered by M8.4–M8.6. |
| PostgreSQL handover concurrency integration testing | PENDING / FUTURE | Live multi-connection race condition tests against real PostgreSQL |
| Full cross-module handover E2E journey (M6.1) | COMPLETED | Verified via mocked-Prisma HTTP harness in lifecycle.e2e-spec.ts (14 tests). Stateful database lifecycle pending (M6.2). |
| Hospital resource reservation & intake lifecycle | PENDING / FUTURE | Follow-up to M5.3: bed/resource lock upon formal hospital intake acceptance |
| En-route ambulance GPS for hospital recommendations | PENDING / FUTURE | Follow-up to M5.3: dynamic transit origin coordinates with incident fallback |

## 4. Portal Tasks

| Task | Status | Notes |
|---|---|---|
| M3 — Frontend Foundation | COMPLETED | Historical foundation. |
| M4 / M9.3 — Patient Portal Implementation (`apps/patient-web`) | COMPLETED | Patient signup, login, emergency SOS request, live response status, medical profile, Cura Card viewer & QR generator. Port 5173. |
| Ambulance Portal Implementation (`apps/ambulance-web`) | COMPLETED | Missions, GPS routing, camera-based Cura Card scanner (`jsQR`), digital handover initiation. Port 5174. |
| Hospital Portal Implementation (`apps/hospital-web`) | COMPLETED | Inbound emergency queue, bed/resource matrix, trauma intake Cura Card scanner, handover reception. Port 5175. |
| Admin / Dispatch Portal Implementation (`apps/admin-web`) | COMPLETED | Global dispatch supervision, ambulance fleet tracking, hospital diversion status, audit log reviews. Port 5176. |
| Shared Monorepo Packages | COMPLETED | `@raah/shared-types`, `@raah/auth`, `@raah/api-client` established and linked via workspace protocol. |

## 5. Integration and Testing Tasks

| Task | Status | Notes |
|---|---|---|
| Unified emergency lifecycle | TO VERIFY | Cross-portal consistency |
| Assignment lifecycle integration | TO VERIFY | Driver and dispatcher coordination |
| Hospital destination integration | CONDITIONALLY ACCEPTED (API Layer) | Operational destination selection and concurrency guards verified; follow-ups tracked |
| Patient handover integration | CONDITIONALLY ACCEPTED (API Layer) | Handover workflow, case/ambulance lifecycle transitions, and dedicated events verified in M5.4; portal UI & deployment pending |
| PostgreSQL destination concurrency integration testing | PENDING / FUTURE | Follow-up to M5.3: live multi-connection race condition tests against real PostgreSQL |
| Real-time notifications | TO VERIFY | Not confirmed |
| GPS-based live tracking | TO VERIFY | Not confirmed |
| Cross-module HTTP lifecycle E2E testing (M6.1) | COMPLETED | Verified 13-step emergency journey using mocked-Prisma harness (34/34 E2E passed). No real database used. |
| Stateful database-backed E2E testing (M6.2) | COMPLETED | 14/14 stateful lifecycle tests passing against isolated in-process PGlite PostgreSQL. Real PrismaService, real migrations, real transactions. 48/48 full E2E suite passing. No remote Supabase database used or modified. |
| Security and access-control testing | NOT STARTED / TO VERIFY | Validate role restrictions |

## 6. Documentation Tasks

| Task | Status |
|---|---|
| Project overview and scope documentation | IN PROGRESS |
| System architecture documentation | IN PROGRESS |
| Portal documentation | IN PROGRESS |
| Backend documentation | IN PROGRESS |
| Emergency workflow documentation | IN PROGRESS |
| Project-management documentation | IN PROGRESS |
| Full documentation consistency review | PENDING |

## 7. Task Ownership

Every active task should have:
- One clearly identified owner.
- A defined expected outcome.
- Relevant dependencies.
- A branch or pull request where applicable.
- Verification criteria.

Do not assign ownership based on assumptions. Confirm responsibilities with the team.

## 8. Updating the Tracker

When updating a task:
1. Confirm the actual implementation state.
2. Update its status.
3. Record the relevant branch or pull request.
4. Identify unresolved dependencies.
5. Add verification evidence before marking it completed.
