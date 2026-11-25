# RAAH – Ambulance Workflow

## 1. Purpose

This document defines how ambulance drivers interact with RAAH during an emergency response, from receiving an assignment to transporting the patient to the destination hospital.

## 2. Participants

- **Dispatcher:** Coordinates ambulance allocation.
- **Ambulance Driver:** Receives and acts on assignments.
- **Patient:** Receives emergency assistance.
- **Hospital Staff:** Coordinates patient reception.
- **Backend:** Maintains ambulance, assignment and emergency records.

## 3. Workflow Overview

1. Ambulance driver logs into the Ambulance Portal.
2. Driver views ambulance and duty information.
3. Dispatcher identifies a suitable ambulance.
4. Backend creates an assignment.
5. Driver receives the assignment.
6. Driver accepts or rejects it.
7. Accepted assignment proceeds to the emergency location.
8. Driver picks up the patient.
9. Driver transports the patient to the selected hospital.
10. Driver completes arrival and handover-related actions.
11. Assignment is completed according to the authorised workflow.

## 4. Driver Portal Responsibilities

The Ambulance Portal should provide:

- Driver authentication and profile access.
- Ambulance information.
- Duty and availability information.
- Incoming assignment details.
- Accept and reject actions.
- Emergency location and relevant case information.
- Destination hospital information.
- Assignment status updates.
- Relevant emergency history.

Only information necessary for the driver's operational responsibilities should be exposed.

## 5. Assignment Workflow

### 5.1 Assignment Creation

The dispatcher selects an ambulance and creates an assignment against an emergency.

Existing backend endpoint:

`POST /emergencies/:emergencyId/assignments`

The backend validates:
- Emergency existence.
- Emergency assignability.
- Ambulance existence.
- Ambulance availability.
- Conflicting active assignments.

### 5.2 Assignment Retrieval

The system supports retrieving assignments associated with an emergency:

`GET /emergencies/:emergencyId/assignments`

An individual assignment can be retrieved through:

`GET /assignments/:id`

### 5.3 Assignment Acceptance

The driver accepts the assignment through:

`PATCH /assignments/:id/accept`

The backend should validate that the assignment is still actionable before confirming acceptance.

### 5.4 Assignment Rejection

The driver rejects an assignment through:

`PATCH /assignments/:id/reject`

The system should record the rejection and make the case available for further dispatch coordination.

The dispatcher must be able to identify that another ambulance may be required.

## 6. Operational Response

After accepting an assignment, the driver follows the operational sequence:

### Stage 1 – Responding

The driver proceeds towards the emergency location.

The portal should display the relevant location and assignment details.

### Stage 2 – Reaching the Patient

The driver reaches the emergency location and confirms the relevant operational milestone through an authorised status update.

### Stage 3 – Patient Pickup

The driver confirms that the patient has been picked up.

Relevant information may include pickup time and observations required for hospital handover.

### Stage 4 – Transport

The driver proceeds to the assigned destination hospital.

The portal should display the destination and any updated coordination instructions.

### Stage 5 – Hospital Arrival

The driver confirms arrival at the destination hospital.

### Stage 6 – Handover

The driver transfers the patient and relevant information to authorised hospital staff.

The assignment should only be completed according to the agreed handover and completion rules.

## 7. Assignment Status Management

The assignment status must be controlled by backend validation.

The driver portal must:
- Display the current backend status.
- Offer only permitted actions.
- Prevent invalid or repeated transitions.
- Display failures when an update is rejected.
- Refresh the assignment after a successful update.

The exact status vocabulary must remain consistent with `STATUS_MAPPING.md`.

Do not introduce independent portal-only status values.

## 8. Exceptions

The workflow must handle:

- Driver rejection.
- Driver unavailability.
- Ambulance breakdown.
- Patient not found at the reported location.
- Incorrect or inaccessible location.
- Patient already transported by another service.
- Destination hospital change.
- Network failure.
- Assignment cancellation or reassignment.

Exceptions must be communicated to the dispatcher and recorded where appropriate.

## 9. Implementation Status

| Capability | Status |
|---|---|
| Assignment creation | Verified — `POST /api/v1/emergencies/:emergencyId/assignments` (Assignment module) |
| Assignment retrieval | Verified — `GET /api/v1/emergencies/:emergencyId/assignments`, `GET /api/v1/assignments/:id` |
| Driver acceptance | Verified — `PATCH /api/v1/assignments/:id/accept` |
| Driver rejection | Verified — `PATCH /api/v1/assignments/:id/reject` with mandatory reason |
| Assignment status validation | Verified — `PATCH /api/v1/assignments/:id/status` drives case and ambulance status |
| Ambulance availability updates | Verified — Atomic updates across assignment lifecycle (`isAvailable: false` on dispatch, `true` on completion) |
| Complete pickup-to-handover workflow | Verified — End-to-end integration verified in M6.1 (mocked) and M6.2 (stateful database-backed) |
| Driver authentication and portal permissions | Requires verification — Deferred to M8 authentication/RBAC |
| GPS-based live tracking | Not verified — In-transit live GPS polling API not yet implemented |
| Driver notifications | Not verified — Real-time push/socket not yet confirmed |

## 10. Related Documents

- `EMERGENCY_LIFECYCLE.md`
- `HOSPITAL_WORKFLOW.md`
- `PATIENT_HANDOVER.md`
- `API_ENDPOINTS.md`
- `STATUS_MAPPING.md`
