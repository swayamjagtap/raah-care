# RAAH – Project Milestones

## 1. Purpose

This document tracks the major development milestones of RAAH, including backend development, portal integration, testing and final delivery.

Milestone completion must be based on verified implementation, not merely on documentation or planned work.

## 2. Milestone Overview

| Milestone | Focus | Status |
|---|---|---|
| M1 | Project foundation and requirements | Historical status to be confirmed |
| M2 | Backend architecture and core modules | Historical status to be confirmed |
| M3 | Core emergency and resource management | Historical status to be confirmed |
| M4 | Portal development and integration | Historical status to be confirmed |
| M5 | Advanced emergency coordination | In progress |
| M5.3 Stage 1 | Allocation DTO foundation | Completed |
| M5.3 Stage 2 | Allocation recommendation APIs | Conditionally Accepted |
| M5.4 | Patient Handover | Conditionally Accepted |
| M6 | End-to-end integration and testing | Pending |
| M7 | Final validation and deployment preparation | Pending |

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
   - Full cross-module HTTP integration testing across the complete lifecycle (`/emergencies` → `/assignments` → `/destination` → `/handovers` → `/complete`) remains part of the later integration milestone (M6).

## 5. Integration Milestone

The integration milestone should verify that:

- Patient requests reach the shared backend.
- Emergency records are created and retrieved correctly.
- Dispatcher actions use authorised APIs.
- Ambulance assignments follow backend validation.
- Hospital information and resources are available to authorised users.
- Destination selection is consistent across portals.
- Emergency statuses remain consistent.
- Patient handover and resolution are handled correctly.

## 6. Testing and Validation Milestone

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

## 7. Completion Criteria

A milestone is complete only when:

1. Required implementation is present.
2. Relevant tests pass.
3. API contracts are documented.
4. Integration dependencies are addressed.
5. Code review is completed.
6. Documentation reflects the actual implementation.
7. Changes are merged through the agreed Git workflow.

## 8. Updating Milestones

Update this document whenever a milestone changes.

Record:
- Milestone identifier.
- Scope.
- Completion status.
- Relevant pull requests or commits.
- Outstanding dependencies.
- Verification evidence.
