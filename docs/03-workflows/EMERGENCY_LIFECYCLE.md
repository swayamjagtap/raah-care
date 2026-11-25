# RAAH – Emergency Lifecycle

## 1. Purpose

This document defines the end-to-end lifecycle of an emergency case in RAAH. It establishes how the Patient, Ambulance, Hospital and Admin portals coordinate through the shared backend.

The backend is the central source of truth for emergency records, assignments, status changes and case events.

## 2. Main Participants

- **Patient:** Requests emergency assistance and provides relevant information.
- **Admin / Dispatcher:** Monitors incoming cases and coordinates dispatch.
- **Ambulance Driver:** Receives and responds to an ambulance assignment.
- **Hospital Staff:** Maintains hospital readiness and coordinates patient reception.
- **RAAH Backend:** Stores emergency data and enforces workflow rules.

## 3. High-Level Lifecycle

1. Emergency request is created.
2. Emergency details and patient information are recorded.
3. Dispatcher reviews the emergency.
4. Suitable ambulance options are identified.
5. An ambulance is assigned.
6. Driver accepts or rejects the assignment.
7. Ambulance responds to the emergency location.
8. Patient is picked up and transported.
9. Destination hospital is selected and coordinated.
10. Patient arrives at the hospital.
11. Patient handover is completed.
12. Emergency case is resolved and closed.

Some stages depend on functionality that is still planned or not yet verified in the backend.

## 4. Lifecycle Stages

### 4.1 Emergency Creation

The patient or an authorised initiating user submits an emergency request.

Information may include:
- Patient identification and contact information.
- Emergency description and category.
- Current location.
- Relevant medical information.
- Additional notes.

**Backend foundation:** Emergency creation is supported through `POST /emergencies`.

**Pending verification:** Patient-facing authentication, location acquisition, consent and patient-specific access controls.

### 4.2 Emergency Review

The dispatcher reviews the new emergency and confirms the information required for coordination.

The dispatcher should be able to:
- View emergency details.
- Identify the patient's location.
- Review urgency and relevant medical information.
- Monitor the case status.
- Initiate ambulance coordination.

### 4.3 Ambulance Selection and Assignment

The system identifies suitable ambulances based on availability, location and emergency requirements.

The dispatcher selects an ambulance and initiates an assignment.

**Verified backend implementation:**
- `POST /api/v1/emergencies/:emergencyId/assignments` — creates assignment with ambulance availability and conflict validation.
- `GET /api/v1/emergencies/:emergencyId/assignments` — lists assignments for an emergency.
- `GET /api/v1/assignments/:id` — retrieves a specific assignment.
- `PATCH /api/v1/assignments/:id/accept` — driver acceptance (transitions assignment to `ACCEPTED`).
- `PATCH /api/v1/assignments/:id/reject` — driver rejection with mandatory reason.
- `PATCH /api/v1/assignments/:id/status` — mission status progression (`EN_ROUTE`, `ARRIVED_AT_SCENE`, `PATIENT_ONBOARD`).
- Assignment status transitions drive corresponding `EmergencyCase` and `Ambulance` status updates atomically.
- Ambulance recommendation endpoint: `GET /api/v1/emergencies/:id/ambulance-recommendations` (Verified — M5.3 Stage 2).

### 4.4 Ambulance Response

After receiving an assignment, the driver accepts or rejects it.

An accepted assignment proceeds through the operational response stages.

The backend must remain authoritative for assignment status and emergency status. A portal must not independently invent or overwrite lifecycle states.

### 4.5 Hospital Coordination

A destination hospital must be selected according to the patient's needs and available hospital resources.

Relevant information may include:
- Hospital operational status.
- Emergency-care capabilities.
- Available beds and resources.
- Distance and estimated travel time, where supported.

**Verified backend implementation:**
- Hospital recommendation endpoint: `GET /api/v1/emergencies/:id/hospital-recommendations` — evaluates hospitals by proximity, operational status, capabilities, and resource availability (Verified — M5.3 Stage 2).
- Destination selection endpoint: `PATCH /api/v1/emergencies/:id/destination` — selects or reassigns destination hospital with strict operational safety guards, concurrency protection, and audit event logging (Verified — M5.3 Stage 2).

### 4.6 Arrival and Handover

The ambulance reaches the destination hospital and transfers the patient to authorised hospital staff.

The handover should include essential patient information, emergency details and relevant treatment or transport observations.

**Verified backend implementation:** See `PATIENT_HANDOVER.md` and Section 10 of `API_ENDPOINTS.md` for the complete implemented handover lifecycle (`POST /api/v1/handovers`, `complete`, `reject`, `cancel`, `GET`, `PATCH`). Verified in M5.4 and M6.1 / M6.2.

### 4.7 Emergency Resolution

Once the emergency response and required handover activities are complete, the authorised user or backend workflow resolves the emergency.

The system should:
- Record the final case status.
- Preserve relevant case events.
- Record resolution time.
- Retain the emergency record for authorised review.

## 5. Core Workflow Rules

1. Each emergency must have a unique identifier.
2. Each assignment must be associated with the correct emergency.
3. An unavailable ambulance must not receive a new active assignment.
4. An ambulance must not have conflicting active assignments.
5. Only authorised roles may perform their permitted operations.
6. Status changes must be validated by the backend.
7. Important lifecycle events must be recorded.
8. Patient information must only be accessible to authorised users.
9. A failed assignment must not silently advance the emergency lifecycle.
10. Emergency resolution must not erase historical records.

## 6. Error and Exception Handling

The system must account for:
- Invalid or incomplete emergency information.
- Patient or emergency record not found.
- No suitable ambulance available.
- Driver rejection of an assignment.
- Ambulance becoming unavailable.
- Hospital becoming unavailable.
- Destination change.
- Network or communication failure.
- Assignment or status transition failure.

Errors should be visible to the appropriate portal user, and the backend must preserve a consistent case state.

## 7. Implementation Status

| Capability | Status |
|---|---|
| Emergency creation and retrieval | Verified — `POST /api/v1/emergencies`, `GET /api/v1/emergencies`, `GET /api/v1/emergencies/:id` |
| Emergency status management | Verified — `PATCH /api/v1/emergencies/:id/status` with state-machine validation |
| Assignment creation and retrieval | Verified — `POST /api/v1/emergencies/:id/assignments`, `GET /api/v1/emergencies/:id/assignments`, `GET /api/v1/assignments/:id` |
| Driver acceptance and rejection | Verified — `PATCH /api/v1/assignments/:id/accept`, `PATCH /api/v1/assignments/:id/reject` |
| Assignment status validation | Verified — `PATCH /api/v1/assignments/:id/status` drives case and ambulance status atomically |
| Ambulance recommendation | Verified — `GET /api/v1/emergencies/:id/ambulance-recommendations` (M5.3 Stage 2) |
| Hospital recommendation | Verified — `GET /api/v1/emergencies/:id/hospital-recommendations` (M5.3 Stage 2) |
| Destination selection workflow | Verified — `PATCH /api/v1/emergencies/:id/destination` with safety guards, concurrency control, and audit events (M5.3 Stage 2) |
| Complete handover workflow | Verified — `POST /api/v1/handovers`, `complete`, `reject`, `cancel`, `GET`, `PATCH` (M5.4); stateful database lifecycle verified (M6.2) |
| Patient live tracking | Not verified — GPS/location API not confirmed in backend |
| Real-time notifications | Not verified — WebSocket/SSE not confirmed in backend |

## 8. Related Documents

- `MVP_SCOPE.md`
- `SYSTEM_ARCHITECTURE.md`
- `API_ENDPOINTS.md`
- `STATUS_MAPPING.md`
- `AMBULANCE_WORKFLOW.md`
- `HOSPITAL_WORKFLOW.md`
- `PATIENT_HANDOVER.md`
