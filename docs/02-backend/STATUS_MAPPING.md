# RAAH â€” Status Mapping Reference

**Document Status:** Draft â€” Requires Enum and Transition Verification
**Version:** 1.0
**Project:** RAAH
**Last Updated:** 24 November 2026

---

## 1. Purpose

This document defines how statuses are represented and interpreted across the RAAH backend and its four portals.

The purpose is to prevent inconsistent status labels, invalid transitions and confusion between emergency, assignment, ambulance, hospital and resource states.

The backend is the single source of truth for all operational statuses.

Frontend portals may use simpler display labels, but they must map to actual backend values.

## 2. Status Design Principles

1. Each domain must have its own clearly defined status.
2. Emergency status must not be confused with assignment status.
3. Assignment status must not be confused with ambulance availability.
4. Hospital operational status must not be confused with individual resource status.
5. Frontend display labels must map to backend values.
6. Only valid transitions may be accepted.
7. Important transitions must be recorded.
8. Failed transitions must return an appropriate error.
9. Status changes must be reflected consistently across relevant portals.

## 3. Emergency Status

### 3.1 Verified Backend Status Values

The Prisma `CaseStatus` enum in `backend/prisma/schema.prisma` defines the following 13 authoritative values:

| Backend status | General meaning |
| --- | --- |
| `CREATED` | Emergency record created |
| `DISPATCHING` | Response coordination or dispatch in progress |
| `AMBULANCE_ASSIGNED` | Ambulance assigned |
| `AMBULANCE_EN_ROUTE` | Ambulance travelling to patient |
| `ARRIVED_AT_SCENE` | Ambulance arrived at pickup location |
| `PATIENT_ONBOARD` | Patient onboard |
| `HOSPITAL_SELECTED` | Destination hospital selected |
| `HOSPITAL_NOTIFIED` | Hospital notified |
| `EN_ROUTE_TO_HOSPITAL` | Ambulance travelling to hospital |
| `ARRIVED_AT_HOSPITAL` | Ambulance arrived at hospital |
| `HANDOVER_IN_PROGRESS` | Patient handover underway |
| `COMPLETED` | Emergency completed and resolved |
| `CANCELLED` | Emergency cancelled |

**Verification status:** Confirmed against `backend/prisma/schema.prisma` and `backend/src/emergencies/emergencies.service.ts`.

### 3.2 Patient-Facing Display Mapping

The Patient Portal should display simplified, understandable labels.

| Backend value | Proposed patient-facing label |
| --- | --- |
| `CREATED` | Request received |
| `DISPATCHING` | Finding emergency assistance |
| `AMBULANCE_ASSIGNED` | Ambulance assigned |
| `AMBULANCE_EN_ROUTE` | Ambulance on the way |
| `ARRIVED_AT_SCENE` | Ambulance arrived |
| `PATIENT_ONBOARD` | Patient onboard |
| `HOSPITAL_SELECTED` | Hospital selected |
| `HOSPITAL_NOTIFIED` | Hospital notified |
| `EN_ROUTE_TO_HOSPITAL` | On the way to hospital |
| `ARRIVED_AT_HOSPITAL` | Arrived at hospital |
| `HANDOVER_IN_PROGRESS` | Patient handover in progress |
| `COMPLETED` | Emergency completed |
| `CANCELLED` | Request cancelled |

The frontend must not send these display labels to the backend as status values.

### 3.3 Emergency Transition Requirements

The backend validates:

- Whether the current status allows the requested next status.
- Whether an ambulance assignment exists where required.
- Whether the required mission event has occurred.
- Whether a hospital destination exists where required.
- Whether handover conditions are satisfied before completion.

## 4. Assignment Status

### 4.1 Purpose

Assignment status represents the lifecycle of an ambulance assignment.

It is distinct from the emergency lifecycle.

### 4.2 Verified Backend Values (`AssignmentStatus`)

The Prisma `AssignmentStatus` enum defines the following values:

| Backend status | Meaning in assignment lifecycle |
| --- | --- |
| `ASSIGNED` | Initial assignment created; pending driver response |
| `ACCEPTED` | Driver accepted the dispatch (`PATCH /api/v1/assignments/:id/accept`) |
| `REJECTED` | Driver rejected the dispatch (`PATCH /api/v1/assignments/:id/reject`) with mandatory reason |
| `EN_ROUTE` | Ambulance en route to scene (`PATCH /api/v1/assignments/:id/status`) |
| `ARRIVED_AT_SCENE` | Ambulance arrived at pickup location |
| `PATIENT_ONBOARD` | Paramedics have secured patient onboard |
| `COMPLETED` | Mission completed following successful hospital handover |
| `CANCELLED` | Assignment cancelled by dispatcher |

**Allowed transitions:**
- `ASSIGNED` → `ACCEPTED`, `REJECTED`, `CANCELLED`
- `ACCEPTED` → `EN_ROUTE`, `CANCELLED`
- `EN_ROUTE` → `ARRIVED_AT_SCENE`, `CANCELLED`
- `ARRIVED_AT_SCENE` → `PATIENT_ONBOARD`, `CANCELLED`
- `PATIENT_ONBOARD` → `COMPLETED`, `CANCELLED`
- Terminal states: `COMPLETED`, `CANCELLED`, `REJECTED`

### 4.3 Rules

- Assignment acceptance must be recorded.
- Rejection must include a reason (stored in assignment notes).
- An assignment must not be treated as completed merely because an ambulance arrives at the hospital. Arrival at hospital is an emergency case status (`ARRIVED_AT_HOSPITAL`); the assignment remains `PATIENT_ONBOARD` until handover completion.
- Assignment transitions drive emergency lifecycle status atomically:
  - `EN_ROUTE` → Case becomes `AMBULANCE_EN_ROUTE`
  - `ARRIVED_AT_SCENE` → Case becomes `ARRIVED_AT_SCENE`
  - `PATIENT_ONBOARD` → Case becomes `PATIENT_ONBOARD`
- Conflicting active assignments must be prevented: only one active assignment (`ASSIGNED`, `ACCEPTED`, `EN_ROUTE`, `ARRIVED_AT_SCENE`, `PATIENT_ONBOARD`) is permitted per ambulance.

## 5. Ambulance Status

### 5.1 Purpose

Ambulance status represents vehicle operational state. It is tracked via two fields in the `Ambulance` model:
1. `status` (`AmbulanceStatus` enum)
2. `isAvailable` (boolean operational flag)

### 5.2 Verified Backend Values (`AmbulanceStatus`)

| Backend status | Meaning | `isAvailable` |
| --- | --- | --- |
| `AVAILABLE` | Ready for dispatch | `true` |
| `ASSIGNED` | Assigned to an active emergency | `false` |
| `EN_ROUTE` | Responding towards incident pickup | `false` |
| `AT_SCENE` | Arrived at incident location | `false` |
| `PATIENT_ONBOARD` | Patient loaded in vehicle | `false` |
| `TRANSPORTING` | In transit to receiving hospital | `false` |
| `OUT_OF_SERVICE` | Maintenance, shift change, or offline | `false` |

### 5.3 Rules

- An ambulance with an active assignment must not become available for another conflicting assignment.
- When an assignment is accepted, ambulance status is updated to `ASSIGNED` and `isAvailable: false`.
- When handover is completed (`POST /api/v1/handovers/:id/complete`), ambulance status is atomically restored to `AVAILABLE` and `isAvailable: true`.
- If a handover is rejected or cancelled, the ambulance remains in `PATIENT_ONBOARD` and `isAvailable: false` (crew and vehicle are NOT released).

## 6. Hospital Operational Status

### 6.1 Purpose

Hospital operational status represents the hospital's overall facility readiness to receive emergencies.

### 6.2 Verified Backend Values (`HospitalStatus`)

The Prisma `HospitalStatus` enum defines the following values:

| Backend status | Meaning in allocation and routing |
| --- | --- |
| `OPERATIONAL` | Hospital is operating normally and accepting emergency patients |
| `BUSY` | Hospital is operating near capacity; requires dispatcher review justification (>= 10 chars) |
| `DIVERTING` | Emergency department is diverting incoming ambulances; **strictly blocked from destination selection** |
| `CLOSED` | Facility is closed; **strictly blocked from destination selection** |

### 6.3 Rules

- Allocation hard blocks: `CLOSED` and `DIVERTING` hospitals are strictly rejected during destination selection (`PATCH /api/v1/emergencies/:id/destination`). Overrides are not permitted.
- Dispatcher review: Selecting a hospital in `BUSY` status requires an `overrideReason` of at least 10 non-whitespace characters.

## 7. Hospital Resource Status

### 7.1 Verified Backend Values (`ResourceStatus`)

| Backend status | General meaning |
| --- | --- |
| `AVAILABLE` | Resource is in stock and operational |
| `LOW_STOCK` | Resource quantity is limited; triggers `REQUIRES_REVIEW` during allocation |
| `UNAVAILABLE` | Resource is depleted or non-operational; **strictly blocks selection if required** |
| `MAINTENANCE` | Resource is undergoing maintenance; **strictly blocks selection if required** |

### 7.2 Resource Types (`ResourceType`)

`ICU`, `EMERGENCY_BEDS`, `OXYGEN`, `VENTILATORS`, `BLOOD_BANK`, `CT_SCAN`, `MRI`, `CARDIAC_CARE`, `TRAUMA_CARE`, `OPERATING_ROOM`, `OTHER`.

### 7.3 Resource Status Rules

- Allocation hard blocks: If an emergency clinically requires a resource and that resource has `availableQuantity: 0`, status `UNAVAILABLE`, or status `MAINTENANCE`, destination selection is strictly rejected (no override permitted).
- Concurrency protection: `HospitalResource` uses version-based optimistic locking (`version` field with `@version` semantics).

## 8. Handover Status

### 8.1 Purpose

Handover status represents the clinical and operational transfer of care from the ambulance crew to the receiving hospital emergency department staff.

### 8.2 Verified Backend Values (`HandoverStatus`)

The Prisma `HandoverStatus` enum defines:

| Backend status | Meaning |
| --- | --- |
| `PENDING` | Reserved initial state |
| `IN_PROGRESS` | Handover actively initiated (`POST /api/v1/handovers`); case moved to `HANDOVER_IN_PROGRESS` |
| `COMPLETED` | Hospital doctor accepted patient (`POST /api/v1/handovers/:id/complete`); case resolved |
| `REJECTED` | Hospital doctor rejected patient (`POST /api/v1/handovers/:id/reject`); case reverts to `ARRIVED_AT_HOSPITAL` |
| `CANCELLED` | Handover cancelled (`POST /api/v1/handovers/:id/cancel`); case reverts to `ARRIVED_AT_HOSPITAL` |

### 8.3 Handover Lifecycle and Atomic State Rules

- **Initiation:** Requires emergency in `ARRIVED_AT_HOSPITAL`, active assignment in `PATIENT_ONBOARD`, and destination hospital set. Transitions case to `HANDOVER_IN_PROGRESS`, emits `HANDOVER_STARTED`.
- **Single active handover constraint:** At most one active (`PENDING` or `IN_PROGRESS`) handover is permitted per case, enforced by application guard (`409 Conflict`) and PostgreSQL partial unique index (`Handover_active_case_unique`).
- **Completion:** Hospital doctor accepts patient via `POST /api/v1/handovers/:id/complete`. Inside an atomic transaction: Handover → `COMPLETED`, EmergencyCase → `COMPLETED` (`resolvedAt`), Assignment → `COMPLETED` (`completedAt`), Ambulance → `AVAILABLE` (`isAvailable: true`), and emits `HANDOVER_COMPLETED` and `CASE_COMPLETED`.
- **Rejection / Cancellation:** Reverts EmergencyCase to `ARRIVED_AT_HOSPITAL`. Ambulance and assignment remain in `PATIENT_ONBOARD` (crew and vehicle are NOT released). Dispatcher can subsequently reassign destination via `PATCH /api/v1/emergencies/:id/destination`.

## 9. Portal-Specific Display Rules

| Portal | Status information displayed |
| --- | --- |
| Patient | Simplified emergency progress |
| Ambulance | Assignment and mission progress |
| Hospital | Incoming emergency, readiness and handover |
| Admin | Full operational emergency, assignment, ambulance and hospital states |

No portal should invent a separate authoritative lifecycle.

## 10. Status Transition Audit Requirements

Important transitions should record:

- Entity reference.
- Previous status.
- New status.
- Timestamp.
- Actor or initiating process.
- Relevant emergency or assignment reference.
- Reason where applicable.

The exact event structure must follow the existing backend model.

## 11. Verification Checklist

- [x] Confirm Emergency Prisma enum (`CaseStatus` 13 values confirmed).
- [x] Confirm Emergency service transition graph (validated in `EmergenciesService` and E2E tests).
- [x] Confirm Assignment Prisma enum (`AssignmentStatus` 8 values confirmed).
- [x] Confirm Assignment service transitions (`AssignmentsService` state machine confirmed).
- [x] Confirm Ambulance Prisma enum (`AmbulanceStatus` 7 values + `isAvailable` flag confirmed).
- [x] Confirm Ambulance status update validation (`AmbulancesService` confirmed).
- [x] Confirm Hospital Prisma enum (`HospitalStatus` 4 values confirmed).
- [x] Confirm Hospital status update validation (`HospitalsService` confirmed).
- [x] Confirm HospitalResource enum (`ResourceStatus` 4 values, `ResourceType` 11 values confirmed).
- [x] Confirm resource update validation (version locking and non-negative constraints confirmed).
- [x] Confirm Handover model and statuses (`HandoverStatus` 5 values, atomic completion confirmed).
- [x] Confirm cancellation and reassignment behaviour (rejection/cancellation reverts to `ARRIVED_AT_HOSPITAL`, retains ambulance for rerouting).
- [x] Confirm case event recording (`CaseEventType` 22 values, chronological audit trail verified).
- [ ] Confirm frontend display mapping (requires portal implementation review).
- [x] Add automated tests for important transitions (verified in M5.3, M5.4, M6.1 mocked E2E, and M6.2 stateful DB-backed E2E).

## 12. Related Documentation

- `DATABASE_SCHEMA.md`
- `API_ENDPOINTS.md`
- `API_INTEGRATION_MAP.md`
- `../00-project/SYSTEM_ARCHITECTURE.md`
- `../00-project/MVP_SCOPE.md`
- `../03-workflows/EMERGENCY_LIFECYCLE.md`
- `../03-workflows/AMBULANCE_WORKFLOW.md`
- `../03-workflows/HOSPITAL_WORKFLOW.md`
- `../03-workflows/PATIENT_HANDOVER.md`
