# RAAH – Architecture and Project Decisions

## 1. Purpose

This document records important decisions affecting the RAAH product, architecture, backend, portals and team workflow.

It distinguishes confirmed project direction from proposals and decisions that still require discussion.

## 2. Decision Status

| Status | Meaning |
|---|---|
| ACCEPTED | Decision has been agreed upon. |
| PROPOSED | Suggested approach awaiting agreement. |
| OPEN | Requires discussion or clarification. |
| SUPERSEDED | Replaced by a later decision. |

## 3. Recorded Decisions

### D-001 – Shared Backend Architecture

**Status:** ACCEPTED

RAAH uses a shared backend to coordinate the Patient, Ambulance, Hospital and Admin portals.

The backend is the central source of truth for emergency records, assignments, status transitions and related events.

### D-002 – Separate Role-Based Portals

**Status:** ACCEPTED

The system is organised into separate interfaces for:

- Patients.
- Ambulance drivers.
- Hospital staff.
- Administrators and dispatchers.

Each portal should expose only the operations and information relevant to its authorised users.

### D-003 – Backend-Controlled Status Transitions

**Status:** ACCEPTED

Emergency and assignment statuses must be validated by the backend.

Portals must not independently define conflicting status vocabularies or bypass backend transition rules.

### D-004 – Cura Card

**Status:** ACCEPTED – PRODUCT CONCEPT

The Cura Card is part of the RAAH product concept and is intended to support quick patient identification and access to essential emergency information.

Its detailed technical implementation, validation, consent and access-control rules remain to be finalised.

### D-005 – Allocation Module

**Status:** CONDITIONALLY ACCEPTED (M5.3 Stage 2 Acceptance Review Completed)

The Allocation module integrates the pure allocation calculator with the NestJS backend and Prisma database layer.

It provides read-only recommendation endpoints for ambulances (`GET /api/v1/emergencies/:id/ambulance-recommendations`) and hospitals (`GET /api/v1/emergencies/:id/hospital-recommendations`), as well as destination hospital selection (`PATCH /api/v1/emergencies/:id/destination`).

The module directly accesses Prisma without circular dependencies on Emergencies or Hospitals modules. Operational safety rules (hard blocks on closed/diverting facilities, minimum override lengths, conditional update concurrency control) are enforced at the service layer.

The core implementation and automated tests (241 unit tests, 20 E2E tests) have passed local verification. Formal acceptance review resulted in **Conditional Acceptance**, recording specific architectural boundaries and tracking follow-up enhancements (resource reservation lifecycle, en-route GPS origin calculation, and live PostgreSQL multi-client integration tests).

### D-006 – Git Collaboration Workflow

**Status:** ACCEPTED

Development should take place on feature branches and be integrated through pull requests.

Direct changes to the main branch should be avoided unless explicitly authorised by the team.

## 4. Open Decisions

### D-007 – Disqualified Candidate Visibility

**Status:** ACCEPTED (Implemented in M5.3 Stage 2)

**Decision:** Both ambulance and hospital recommendation APIs support an `includeDisqualified` boolean query parameter defaulting to `true`.

**Reasoning:** Dispatchers operating in constrained or catastrophic scenarios require full situational awareness of why candidate units or facilities are unavailable. Candidates categorized as disqualified clearly list all disqualification reasons, while candidates requiring review are scored and highlighted separately. Dispatchers may filter out disqualified candidates by setting `includeDisqualified=false`.

### D-008 – Patient Authentication

**Status:** OPEN

The final patient authentication approach must be confirmed.

Consider:
- Patient registration.
- Emergency requests without an existing account.
- Identity verification.
- Access to a patient's own emergency records.
- Recovery and account security.

### D-009 – Cura Card Validation and Privacy

**Status:** OPEN

The team must define:
- Card identifier format.
- Whether QR validation is used.
- What information is visible during emergency access.
- Authentication and authorisation requirements.
- Patient consent and lost-card handling.

### D-010 – Real-Time Updates

**Status:** OPEN

The team must decide how portals receive live emergency and assignment updates.

Possible approaches should be evaluated against implementation complexity, reliability and project scope.

### D-011 – GPS Tracking

**Status:** OPEN

The team must confirm whether live ambulance tracking is part of the MVP or a later phase.

The implementation must consider location permissions, update frequency, accuracy and privacy.

### D-012 – Hard Operational Blocks for Hospital Selection

**Status:** ACCEPTED (Implemented in M5.3 Stage 2)

**Context:** During destination selection, dispatchers may attempt to route an ambulance to a hospital that is operationally unable to accept patients.

**Decision:**
- Hospitals with operational status `CLOSED` or `DIVERTING` cannot be selected under any circumstances. Overrides are unconditionally rejected.
- Hospitals with required clinical resources that have `availableQuantity: 0`, status `UNAVAILABLE`, or status `MAINTENANCE` cannot be selected. Overrides are unconditionally rejected.

**Reasoning:** Routing an active emergency to a closed or diverting facility, or a hospital lacking critical life-saving equipment, risks immediate patient harm and transport delays. Hard operational blocks prevent catastrophic routing errors.

### D-013 – Meaningful Override Justification Validation

**Status:** ACCEPTED (Implemented in M5.3 Stage 2)

**Context:** When selecting a hospital flagged as `REQUIRES_REVIEW` (e.g. `BUSY` status, `LOW_STOCK` warnings, unconfirmed resources), a dispatcher override is permitted.

**Decision:** An `overrideReason` is mandatory and must contain a minimum of 10 non-whitespace characters (and max 2000 characters), enforced both at the DTO layer (`@MinLength(10)`, `@Transform` trimming) and at the service layer (`overrideReason.trim().length >= 10`).

**Reasoning:** Trivial, empty, or whitespace-only justifications (e.g., "ok", " ", "override") bypass clinical governance without establishing an audit trail. A minimum threshold forces dispatchers to record a substantive rationale for audit history.

### D-014 – Geographic Radius Filtering with Unknown Location Fallback

**Status:** ACCEPTED (Implemented in M5.3 Stage 2)

**Context:** Clients can specify `maxRangeKm` to narrow recommendations to nearby facilities or units.

**Decision:** When `maxRangeKm` is supplied, candidates with known coordinates that exceed the distance are excluded. However, candidates with unknown coordinates (`distanceKm: null`) are retained for dispatcher visibility with an unknown distance flag.

**Reasoning:** If an ambulance or hospital record lacks valid geographic coordinates, silently discarding it could prevent dispatchers from utilizing a nearby resource whose GPS has not yet synced. Retaining it ensures the dispatcher can investigate or manually confirm location.

### D-015 – Optimistic Concurrency Control for Destination Selection

**Status:** ACCEPTED (Implemented in M5.3 Stage 2)

**Context:** In high-intensity coordination environments, multiple dispatchers or backend workflows could attempt to reassign destination or cancel the emergency simultaneously.

**Decision:** Use conditional database updates (`updateMany` matching `id`, expected `status`, and expected `destinationHospitalId`) rather than naive read-then-write or heavy pessimistic table locks. If the updated count is 0, throw `409 ConflictException`.

**Reasoning:** Conditional updates provide lightweight, portable race-condition protection without holding transaction locks. If another process updated the status (e.g., patient cancelled or completed) or changed the destination between evaluation and commit, the write fails safely.

### D-016 – Idempotent Destination Reselection

**Status:** ACCEPTED (Implemented in M5.3 Stage 2)

**Context:** Network retries or repeated dispatcher clicks may submit a destination selection request for a hospital that is already assigned to the emergency.

**Decision:** If `dto.hospitalId === emergency.destinationHospitalId`, the service returns the existing emergency record immediately. It does not regress status (e.g., preserving `HOSPITAL_NOTIFIED` or `EN_ROUTE_TO_HOSPITAL` without rolling back to `HOSPITAL_SELECTED`) and skips emitting duplicate audit events.

**Reasoning:** Reselection should be safely idempotent. Regressing status would break the downstream ambulance and hospital workflow.

### D-017 – Hospital Destination Intent vs. Resource Reservation Boundary

**Status:** ACCEPTED (Architectural Boundary Recorded in M5.3 Acceptance)

**Context:** Selecting a destination hospital routes an active emergency to a facility reporting available resources, but does not lock or decrement `HospitalResource` inventory.

**Decision:** Destination selection records operational routing intent and attaches clinical disclaimers (`HOSPITAL_ACCEPTANCE_DISCLAIMER`). Explicit bed/resource reservation and intake acceptance are decoupled from destination selection and assigned to a future hospital intake coordination lifecycle.

**Reasoning:** In emergency operations, reported resource capacity does not constitute clinical triage acceptance or bed guarantee. Decrementing inventory prior to hospital triage could orphan hospital beds on diversions or cancellations.

### D-018 – En-Route Dynamic Origin Coordinates for Hospital Allocation

**Status:** PROPOSED / FUTURE ENHANCEMENT (Tracked from M5.3 Acceptance)

**Context:** Currently, hospital recommendation proximity and travel time are calculated using the emergency case's incident pickup coordinates (`incidentLatitude`, `incidentLongitude`).

**Decision:** Tracked as an enhancement to query the active ambulance's live GPS coordinates (`currentLatitude`, `currentLongitude`) when status is `PATIENT_ONBOARD` or `EN_ROUTE_TO_HOSPITAL`, falling back to incident coordinates if live GPS is unavailable.

**Reasoning:** Enhances recommendation accuracy when the ambulance has already travelled a significant distance from the original scene.

### D-019 – Audit Event Actor Identification Deferred to M8

**Status:** ACCEPTED (M5.3 Acceptance)

**Context:** Allocation events currently set `actorId: null` in `CaseEvent` records.

**Decision:** Do not accept unauthenticated or spoofable client-supplied actor identifiers. Formal dispatcher/user identity tracking on audit events is deferred until M8 authentication and RBAC are implemented.

**Reasoning:** Setting `actorId: null` preserves audit integrity by distinguishing trusted system actions from untrusted client-supplied identity claims.

### D-020 – Patient Handover Module Conditional Acceptance & Lifecycle Boundaries

**Status:** CONDITIONALLY ACCEPTED (M5.4 Acceptance Review Completed)

**Context:** The Patient Handover module (`HandoversModule`) coordinates the digital transfer of care from ambulance crews to hospital emergency department personnel upon physical arrival at destination facilities.

**Decision:**
- Conditionally accept the M5.4 Patient Handover implementation based on verified local test suites (276 unit tests, 20 E2E tests, clean production build, 0 lint errors).
- Track the following follow-up conditions as prerequisites for full production acceptance:
  1. **Remote Schema Deployment:** Migrations `20261124230000_add_active_handover_partial_unique_index` and `20261124231000_add_handover_rejected_cancelled_events` must be applied to the remote Supabase database prior to live testing.
  2. **Authentication / RBAC Integration (M8):** Current endpoints are public; role and affiliation checks validate referenced database entities but do not prove caller identity. Endpoints must be protected by authentication guards and authenticated caller IDs extracted in M8.
  3. **Real PostgreSQL Concurrency Verification:** Live parallel request testing under real database contention remains a future integration task to stress-test the partial unique index.
  4. **Cross-Module E2E Lifecycle Journey (M6):** Full end-to-end integration across emergency creation, ambulance dispatch, destination selection, and hospital handover will be executed in Milestone M6.

**Reasoning:** Acknowledging operational boundaries and deployment prerequisites maintains architectural integrity while allowing dependent work on subsequent milestones to proceed.

## 5. Decision Recording Template

Use this format for future decisions:

### D-XXX – Decision Title

**Status:** PROPOSED / OPEN / ACCEPTED / SUPERSEDED

**Context:** Why the decision is needed.

**Options considered:** Alternatives discussed.

**Decision:** The agreed approach.

**Reasoning:** Why this approach was selected.

**Impact:** Affected modules, APIs, workflows or team responsibilities.

**Date:** YYYY-MM-DD

**Participants:** Team members involved in the decision.

## 6. Maintenance

- Do not silently overwrite earlier decisions.
- Mark replaced decisions as SUPERSEDED.
- Record the reason for significant changes.
- Keep implementation documentation aligned with accepted decisions.
