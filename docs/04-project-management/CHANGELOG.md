# RAAH – Changelog

All notable project changes should be recorded in this document.

The changelog tracks meaningful project-level changes. It does not replace Git commit history or pull request descriptions.

## [Unreleased]

### Documentation

- Expanded project scope and system architecture documentation.
- Added and updated portal requirement documents.
- Documented backend API contracts and integration relationships.
- Documented database entities and status mappings.
- Added emergency lifecycle, ambulance workflow, hospital workflow and patient handover documentation.
- Added project milestones, task tracking, team assignment and contribution guidelines.
- Recorded accepted architectural directions and unresolved project decisions.

### Development

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
