# RAAH – Hospital Workflow

## 1. Purpose

This document defines how hospitals participate in the RAAH emergency-response ecosystem.

The Hospital Portal enables authorised hospital staff to maintain hospital information, manage resource availability and coordinate incoming emergency patients.

## 2. Participants

- **Hospital Administrator:** Manages hospital-level information and access.
- **Hospital Staff:** Updates operational information and coordinates patient reception.
- **Dispatcher:** Reviews hospital readiness and coordinates destination selection.
- **Ambulance Driver:** Transports the patient to the destination hospital.
- **Backend:** Maintains hospital, resource and emergency records.

## 3. Workflow Overview

1. Hospital staff access the Hospital Portal.
2. Hospital information is maintained.
3. Hospital operational status is updated.
4. Resource availability is maintained.
5. Dispatcher reviews suitable hospitals.
6. A destination hospital is selected.
7. Hospital coordinates incoming patient reception.
8. Ambulance arrives with the patient.
9. Hospital staff receive the patient.
10. Handover information is recorded according to the supported workflow.

## 4. Hospital Profile Management

The hospital profile may contain:

- Hospital name and identification.
- Address and geographical coordinates.
- Contact information.
- Emergency-care capabilities.
- Operational status.
- Other approved hospital details.

Hospital profile information should be maintained by authorised hospital users.

## 5. Hospital Operational Status

The existing backend hospital status values include:

| Status | Meaning |
|---|---|
| `OPERATIONAL` | Hospital is operating normally. |
| `BUSY` | Hospital is operating with significant workload. |
| `DIVERTING` | Hospital is temporarily diverting incoming cases. |
| `CLOSED` | Hospital is not accepting emergency cases. |

The portal should display these backend values consistently.

Hospital staff must not use a portal-specific status vocabulary that conflicts with the backend.

## 6. Resource Management

Hospitals should be able to maintain information about available emergency resources.

Existing resource categories include:
- ICU.
- Emergency beds.
- Oxygen.
- Ventilators.
- Blood bank.
- CT scan.
- MRI.
- Cardiac care.
- Trauma care.
- Operating room.

Resource records may contain:
- Resource type.
- Total quantity.
- Available quantity.
- Resource status.

Existing resource status values include:

| Status | Meaning |
|---|---|
| `AVAILABLE` | Resource is available. |
| `LOW_STOCK` | Resource availability is limited. |
| `UNAVAILABLE` | Resource is not available. |
| `MAINTENANCE` | Resource is under maintenance. |

Resource quantities and status must be updated accurately and only by authorised users.

## 7. Incoming Emergency Coordination

When a hospital is selected as a destination, the hospital should receive the relevant incoming emergency information through the supported coordination workflow.

The information may include:
- Emergency reference.
- Expected arrival information, if available.
- Patient identification information permitted for the hospital.
- Emergency category and relevant medical details.
- Ambulance and driver information required for coordination.

Access must be role-based and limited to information necessary for patient care.

## 8. Destination Selection

Hospital selection should consider:

1. Hospital operational status.
2. Relevant emergency-care capabilities.
3. Available resources.
4. Geographical distance.
5. Patient requirements.
6. Dispatcher or authorised clinical coordination decisions.

The closest hospital must not automatically be treated as the most suitable hospital.

**Current implementation note:** Hospital and resource management foundations exist. Complete hospital recommendation and destination selection through the Allocation module remain pending implementation or verification.

## 9. Patient Arrival and Reception

When the ambulance reaches the hospital:

- Hospital staff should identify the incoming emergency.
- The patient's identity should be verified using the approved process.
- Essential emergency information should be reviewed.
- The patient should be received by authorised staff.
- Handover information should be recorded through the supported workflow.

## 10. Exceptions

The system should support coordination when:

- Hospital status changes after selection.
- A required resource becomes unavailable.
- The hospital cannot receive the patient.
- The ambulance is delayed.
- A different destination is required.
- Patient information is incomplete.
- Network connectivity is unavailable.

A destination change must be communicated to the dispatcher and ambulance driver.

## 11. Implementation Status

| Capability | Status |
|---|---|
| Hospital profile management | Existing backend foundation |
| Hospital operational status | Existing backend foundation |
| Hospital resource management | Existing backend foundation |
| Resource availability and quantity | Existing backend foundation |
| Hospital recommendation | Pending implementation |
| Destination selection API | Pending implementation |
| Incoming emergency notification | Not verified |
| Complete hospital reception workflow | Not verified |
| Complete handover workflow | Not verified |

## 12. Related Documents

- `EMERGENCY_LIFECYCLE.md`
- `AMBULANCE_WORKFLOW.md`
- `PATIENT_HANDOVER.md`
- `API_ENDPOINTS.md`
- `DATABASE_SCHEMA.md`
- `STATUS_MAPPING.md`
