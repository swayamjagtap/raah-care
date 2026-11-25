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
| Handover authentication & RBAC protection | M8 / FUTURE | Guard endpoints and extract authenticated caller identity into audit events |
| PostgreSQL handover concurrency integration testing | PENDING / FUTURE | Live multi-connection race condition tests against real PostgreSQL |
| Full cross-module handover E2E journey (M6.1) | COMPLETED | Verified via mocked-Prisma HTTP harness in lifecycle.e2e-spec.ts (14 tests). Stateful database lifecycle pending (M6.2). |
| Hospital resource reservation & intake lifecycle | PENDING / FUTURE | Follow-up to M5.3: bed/resource lock upon formal hospital intake acceptance |
| En-route ambulance GPS for hospital recommendations | PENDING / FUTURE | Follow-up to M5.3: dynamic transit origin coordinates with incident fallback |

## 4. Portal Tasks

| Task | Status | Notes |
|---|---|---|
| Patient Portal requirements documentation | DOCUMENTED | Implementation requires separate verification |
| Ambulance Portal requirements documentation | DOCUMENTED | Implementation requires separate verification |
| Hospital Portal requirements documentation | DOCUMENTED | Implementation requires separate verification |
| Admin Portal requirements documentation | DOCUMENTED | Implementation requires separate verification |
| Patient authentication and access control | TO VERIFY | Role-specific access |
| Driver authentication and access control | TO VERIFY | Role-specific access |
| Hospital staff authentication and access control | TO VERIFY | Role-specific access |
| Admin role permissions | TO VERIFY | Verify existing guards and policies |
| Portal-to-backend integration | TO VERIFY | Validate endpoint usage |

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
