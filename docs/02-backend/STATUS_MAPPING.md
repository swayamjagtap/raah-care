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

### 3.1 Known Backend Status Values

A previously inspected Emergency lifecycle included the following values:

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
| `COMPLETED` | Emergency completed |

**Verification note:** These values were observed in an earlier implementation review. Recheck the current Prisma enum and transition logic before using this table as the final backend contract.

Additional transitions for cancellation, reassignment or exceptional cases may exist and must be verified.

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

The frontend must not send these display labels to the backend as status values.

### 3.3 Emergency Transition Requirements

The backend must validate:

- Whether the current status allows the requested next status.
- Whether an ambulance assignment exists where required.
- Whether the required mission event has occurred.
- Whether a hospital destination exists where required.
- Whether handover conditions are satisfied before completion.

The exact transition graph must be extracted from the current Emergency service and tests.

## 4. Assignment Status

### 4.1 Purpose

Assignment status represents the lifecycle of an ambulance assignment.

It is distinct from the emergency lifecycle.

### 4.2 Required Conceptual States

The system requires the ability to represent:

- Assignment created or pending driver response.
- Accepted.
- Rejected.
- Active mission.
- Completed.
- Cancelled or otherwise terminated, where supported.

**Verification required:** The exact Prisma enum values, service transitions and endpoint behaviour must be inspected before documenting exact backend labels.

### 4.3 Rules

- Assignment acceptance must be recorded.
- Rejection must include a reason.
- An assignment must not be treated as completed merely because an ambulance arrives at the hospital.
- Assignment transitions must remain consistent with the emergency lifecycle.
- Conflicting active assignments must be prevented.

## 5. Ambulance Status

### 5.1 Purpose

Ambulance status represents vehicle operational availability.

It must not be used as a substitute for assignment or emergency status.

### 5.2 Proposed Driver-Facing Labels

| Driver-facing label | Meaning |
| --- | --- |
| Available | Ambulance can receive a new mission |
| Off Duty | Driver or ambulance is not on operational duty |
| Unavailable | Ambulance cannot currently receive a mission |

The mapping to backend enum values must be verified.

### 5.3 Rules

- An ambulance with an active assignment must not become available for another conflicting assignment.
- Driver availability and ambulance availability must not be assumed to be the same field.
- Vehicle faults may require an unavailable state.
- The backend must validate status changes.

## 6. Hospital Operational Status

### 6.1 Purpose

Hospital operational status represents the hospital's ability to receive emergencies.

### 6.2 Previously Observed Backend Values

An earlier repository inspection identified the following hospital status values:

- `OPERATIONAL`
- `BUSY`
- `DIVERTING`
- `CLOSED`

These values require current schema and service verification.

### 6.3 Proposed Hospital-Facing Labels

The Hospital Portal blueprint proposed:

- Fully Operational.
- Limited Capacity.
- Temporarily Unavailable.

These labels are not necessarily equivalent to the backend enum values.

### 6.4 Mapping Decision

A final mapping must be approved by the team.

The following is a conceptual guide, not an approved mapping:

| Proposed hospital-facing label | Potential interpretation |
| --- | --- |
| Fully Operational | Hospital can receive suitable emergencies |
| Limited Capacity | Hospital can receive only certain emergencies |
| Temporarily Unavailable | Hospital should not receive new emergencies |

Do not automatically map `BUSY` to `LIMITED CAPACITY` or `DIVERTING` to `CLOSED` without reviewing their actual business meaning.

### 6.5 Rules

- Hospital status changes must influence suitability evaluation.
- A hospital must be able to report unexpected availability changes.
- Existing emergency allocations must be reassessed where necessary.
- Hospital status changes must be recorded.

## 7. Hospital Resource Status

### 7.1 Previously Observed Backend Values

The earlier inspected resource model included:

| Backend value | General meaning |
| --- | --- |
| `AVAILABLE` | Resource available |
| `LOW_STOCK` | Resource availability or stock is low |
| `UNAVAILABLE` | Resource unavailable |
| `MAINTENANCE` | Resource under maintenance |

Current schema and validation must be checked.

### 7.2 Resource Status Rules

- Resource availability must influence relevant hospital suitability calculations.
- Resource updates must be validated.
- Conflicting updates must be handled.
- Resource history should be retained where required.

### 7.3 Important Distinction

Resource status is not the same as individual bed occupancy.

For example:

- `AVAILABLE` is a resource availability state.
- `LOW_STOCK` describes limited stock.
- `MAINTENANCE` describes maintenance.

Individual bed management may require separate states such as:

- Available.
- Occupied.
- Reserved.
- Under maintenance.

These must not be forced into the same enum without an explicit data-model decision.

## 8. Handover Status

### 8.1 Purpose

Handover status represents the progress of transferring patient responsibility from ambulance staff to hospital staff.

### 8.2 Required Conceptual States

The intended workflow requires representation of:

- Not initiated.
- In progress.
- Driver confirmation received.
- Hospital confirmation received.
- Completed.
- Exception or cancelled, where supported.

**Verification required:** The actual handover model, status values and transition rules must be inspected.

### 8.3 Completion Rule

The proposed RAAH workflow requires confirmation from both the ambulance driver and hospital staff.

The backend must validate the required confirmations before recording completed handover.

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

- [ ] Confirm Emergency Prisma enum.
- [ ] Confirm Emergency service transition graph.
- [ ] Confirm Assignment Prisma enum.
- [ ] Confirm Assignment service transitions.
- [ ] Confirm Ambulance Prisma enum.
- [ ] Confirm Ambulance status update validation.
- [ ] Confirm Hospital Prisma enum.
- [ ] Confirm Hospital status update validation.
- [ ] Confirm HospitalResource enum.
- [ ] Confirm resource update validation.
- [ ] Confirm Handover model and statuses.
- [ ] Confirm cancellation and reassignment behaviour.
- [ ] Confirm case event recording.
- [ ] Confirm frontend display mapping.
- [ ] Add automated tests for important transitions.

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
