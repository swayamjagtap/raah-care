# RAAH â€” Backend API Endpoints

**Document Status:** Draft â€” Requires Current Controller and DTO Verification
**Version:** 1.0
**Project:** RAAH
**Last Updated:** 24 November 2026

---

## 1. Purpose

This document maintains the API reference for the RAAH backend.

It is intended to help frontend developers integrate the four portals with the shared backend.

It records:

- API endpoint paths.
- HTTP methods.
- Functional responsibilities.
- Request and response contracts.
- Authentication requirements.
- Validation requirements.
- Integration dependencies.

The actual NestJS controllers and DTOs are the authoritative sources for API contracts.

**Important:** Endpoint paths listed below are historical candidates from an earlier repository inspection. They must be checked against the current source code before being treated as verified or used as final frontend contracts.

## 2. API Architecture

The backend uses NestJS.

The four portals communicate with the backend through HTTP APIs.

```text
Patient Portal â”€â”€â”€â”€â”€â”€â”€â”
Ambulance Portal â”€â”€â”€â”€â”€â”¤
Hospital Portal â”€â”€â”€â”€â”€â”€â”¼â”€â”€> RAAH NestJS Backend
Admin Portal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

The backend validates requests, performs business operations and interacts with the database through Prisma.

## 3. API Documentation Rules

Every endpoint documented as verified must include:

1. HTTP method.
2. Exact route.
3. Controller responsible.
4. Authentication requirement.
5. Authorised roles or ownership rules.
6. Request parameters.
7. Request body DTO.
8. Response structure.
9. Validation rules.
10. Possible error responses.

Do not invent response examples or DTO fields.

## 4. Emergency APIs

**Module:** Emergencies

Previously inspected endpoint candidates:

| Method | Endpoint | Purpose | Verification |
| --- | --- | --- | --- |
| POST | `/emergencies` | Create an emergency | Recheck |
| GET | `/emergencies` | List emergencies | Recheck |
| GET | `/emergencies/:id` | Retrieve an emergency | Recheck |
| PATCH | `/emergencies/:id/status` | Update emergency status | Recheck |

### Functional responsibilities

The Emergency API is responsible for:

- Creating emergency records.
- Retrieving emergency details.
- Listing emergency cases.
- Validating emergency status transitions.
- Recording relevant case events.
- Maintaining resolution information.

### Required verification

Inspect:

- Emergency controller.
- Emergency service.
- Create emergency DTO.
- Update emergency status DTO.
- Query and pagination DTOs.
- Response serialization.
- Authentication and authorisation guards.

## 5. Ambulance APIs

**Module:** Ambulances

Previously inspected endpoint candidates:

| Method | Endpoint | Purpose | Verification |
| --- | --- | --- | --- |
| POST | `/ambulances` | Register an ambulance | Recheck |
| GET | `/ambulances` | List ambulances | Recheck |
| GET | `/ambulances/:id` | Retrieve an ambulance | Recheck |
| PATCH | `/ambulances/:id/status` | Update ambulance status | Recheck |

### Functional responsibilities

- Ambulance registration.
- Ambulance retrieval.
- Ambulance listing.
- Ambulance status management.
- Operational availability.

### Required verification

Inspect:

- Ambulance controller.
- Ambulance service.
- Create ambulance DTO.
- Update ambulance status DTO.
- Query DTOs.
- Permission requirements.
- Actual response structures.

## 6. Hospital APIs

**Module:** Hospitals

Previously inspected endpoint candidates:

| Method | Endpoint | Purpose | Verification |
| --- | --- | --- | --- |
| POST | `/hospitals` | Register a hospital | Recheck |
| GET | `/hospitals` | List hospitals | Recheck |
| GET | `/hospitals/:id` | Retrieve a hospital | Recheck |
| PATCH | `/hospitals/:id` | Update hospital information | Recheck |
| POST | `/hospitals/:id/resources` | Create a hospital resource | Recheck |
| GET | `/hospitals/:id/resources` | List hospital resources | Recheck |
| PATCH | `/hospitals/:id/resources/:resourceId` | Update a hospital resource | Recheck |

### Functional responsibilities

- Hospital registration.
- Hospital information retrieval.
- Hospital profile updates.
- Resource creation.
- Resource listing.
- Resource availability updates.

### Required verification

Inspect:

- Hospital controller.
- Hospital service.
- Resource controller or nested routes.
- Create hospital DTO.
- Update hospital DTO.
- Create resource DTO.
- Update resource DTO.
- Hospital query DTOs.
- Resource validation and concurrency handling.

## 7. Assignment APIs

**Module:** Assignments

Previously inspected endpoint candidates:

| Method | Endpoint | Purpose | Verification |
| --- | --- | --- | --- |
| POST | `/emergencies/:emergencyId/assignments` | Create an assignment | Recheck |
| GET | `/emergencies/:emergencyId/assignments` | List emergency assignments | Recheck |
| GET | `/assignments/:id` | Retrieve an assignment | Recheck |
| PATCH | `/assignments/:id/accept` | Accept an assignment | Recheck |
| PATCH | `/assignments/:id/reject` | Reject an assignment | Recheck |
| PATCH | `/assignments/:id/status` | Update mission status | Recheck |

### Functional responsibilities

- Assignment creation.
- Emergency eligibility validation.
- Ambulance availability validation.
- Duplicate or conflicting assignment prevention.
- Driver acceptance.
- Driver rejection.
- Mission status updates.
- Related emergency and ambulance state updates.
- Case event recording.

### Important architecture rule

Assignment creation must remain the responsibility of the Assignment module.

Allocation logic must not directly duplicate assignment creation.

## 8. Allocation and Recommendation APIs

**Module:** Allocation (`AllocationModule`)
**Controller:** `AllocationController` (`backend/src/allocation/allocation.controller.ts`)
**Service:** `AllocationService` (`backend/src/allocation/allocation.service.ts`)
**Status:** VERIFIED & OPERATIONAL (M5.3 Stage 2 Accepted)
**Authentication & Authorization:** Deferred to M8 (`actorId: null` in audit events; public controller routes currently).

The Allocation module integrates the pure allocation calculator with the NestJS backend and Prisma database layer. It provides read-only recommendation endpoints for ambulances and hospitals, along with an operational destination selection endpoint.

### 8.1 Ambulance Recommendations

Evaluates and ranks available ambulance candidates for an active emergency based on proximity, vehicle capabilities, and operational status.

- **Method:** `GET`
- **Route:** `/api/v1/emergencies/:id/ambulance-recommendations`
- **Controller Action:** `AllocationController.getAmbulanceRecommendations`
- **Route Parameters:**
  - `id` (UUID, required): The ID of the emergency case.
- **Query Parameters (`QueryAmbulanceRecommendationsDto`):**
  - `includeDisqualified` (boolean, optional, default: `true`): Whether to include disqualified ambulances in the response.
  - `maxRangeKm` (number, optional, integer 1â€“500): Maximum search radius in kilometers. Amublances beyond this radius are filtered out. Ambulances with unknown locations (`distanceKm: null`) are preserved for dispatcher review.
- **Behavior & Safety:**
  - **Read-Only:** Strictly read-only with zero database side effects. Does not assign an ambulance or alter emergency state.
  - Evaluates ambulance candidates from the database whose statuses allow consideration.
  - Calculates geographic distance and travel time using incident pickup coordinates.
- **Response (`200 OK`):**
  - Array of `AmbulanceSuitabilityResult`:
    ```json
    [
      {
        "candidateId": "amb-uuid",
        "score": 92.5,
        "tier": "OPTIMAL",
        "evaluationState": "ELIGIBLE",
        "disqualificationReasons": [],
        "reviewReasons": [],
        "distanceKm": 4.2,
        "estimatedTravelTimeMinutes": 11.2,
        "policyNotice": "AMBULANCE_ALLOCATION_RECOMMENDATION_ONLY"
      }
    ]
    ```
- **Error Responses:**
  - `400 Bad Request`: Invalid emergency UUID, invalid query parameter format, or out-of-bounds `maxRangeKm`.
  - `404 Not Found`: Emergency with the given ID does not exist.

---

### 8.2 Hospital Recommendations

Evaluates and ranks hospitals for an active emergency based on proximity, operational status, department capabilities, and resource availability.

- **Method:** `GET`
- **Route:** `/api/v1/emergencies/:id/hospital-recommendations`
- **Controller Action:** `AllocationController.getHospitalRecommendations`
- **Route Parameters:**
  - `id` (UUID, required): The ID of the emergency case.
- **Query Parameters (`QueryHospitalRecommendationsDto`):**
  - `requiredResources` (array of `ResourceType`, optional): Specific resources required (e.g., `ICU_BED`, `VENTILATOR`, `OXYGEN_CYLINDER`).
  - `requiredCapabilities` (array of strings, optional, max 50 chars each): Clinical capabilities required (e.g., `TRAUMA_CARE`, `CARDIAC_CATH_LAB`).
  - `includeDisqualified` (boolean, optional, default: `true`): Whether to include disqualified hospitals.
  - `maxRangeKm` (number, optional, integer 1â€“500): Maximum search radius in kilometers. Hospitals beyond this distance are excluded; hospitals with unknown locations (`distanceKm: null`) are retained for dispatcher visibility.
- **Behavior & Safety:**
  - **Read-Only:** Strictly read-only with zero database side effects. Does not select a hospital or notify facilities.
  - **Distance Heuristic:** Computes straight-line distance and estimated travel time from incident pickup coordinates to hospital coordinates (does not track live en-route ambulance GPS during transit).
  - Evaluates hospital resources (`availableQuantity`, operational status) and clinical capabilities.
- **Response (`200 OK`):**
  - Array of `HospitalSuitabilityResult`:
    ```json
    [
      {
        "hospitalId": "hosp-uuid",
        "name": "City General Hospital",
        "score": 88.0,
        "tier": "SUITABLE",
        "evaluationState": "ELIGIBLE",
        "resourceAssessmentStatus": "ALL_CONFIRMED_AVAILABLE",
        "resourceDetails": [],
        "disqualificationReasons": [],
        "reviewReasons": [],
        "clinicalDisclaimer": "HOSPITAL_RECOMMENDATION_CLINICAL_DISCLAIMER: Recommendations are assistive decision-support only and do not guarantee hospital intake, clinical acceptance, bed availability, or physician triage.",
        "policyNotice": "HOSPITAL_ALLOCATION_RECOMMENDATION_ONLY"
      }
    ]
    ```
- **Error Responses:**
  - `400 Bad Request`: Invalid emergency UUID, invalid resource type, or malformed query parameters.
  - `404 Not Found`: Emergency with the given ID does not exist.

---

### 8.3 Destination Selection

Selects or reassigns the destination hospital for an active emergency, enforcing strict operational safety checks, clinical validation, and concurrency protection.

- **Method:** `PATCH`
- **Route:** `/api/v1/emergencies/:id/destination`
- **Controller Action:** `AllocationController.selectDestination`
- **Route Parameters:**
  - `id` (UUID, required): The ID of the emergency case.
- **Request Body (`SelectDestinationDto`):**
  - `hospitalId` (UUID, required): The destination hospital to select.
  - `overrideReason` (string, optional): Justification required when overriding a `REQUIRES_REVIEW` evaluation. Must contain at least 10 non-whitespace characters and at most 2000 characters.
  - `requiredResources` (array of `ResourceType`, optional): Clinically required resources to evaluate during selection.
  - `requiredCapabilities` (array of strings, optional): Clinically required capabilities to evaluate during selection.
  - `notes` (string, optional, max 2000 characters): Additional operational dispatcher notes.
- **Operational Safety Rules & Hard Blocks:**
  - **No Guarantee of Intake Disclaimer:** Includes mandatory disclaimer: *"Destination selection records intent but does not guarantee hospital intake, clinical bed availability, or triage acceptance."*
  - **State Guard:** Can only be called when emergency status is `PATIENT_ONBOARD`, `HOSPITAL_SELECTED`, `HOSPITAL_NOTIFIED`, or `EN_ROUTE_TO_HOSPITAL`. Rejected with `400 Bad Request` if emergency is in `CREATED`, `DISPATCHING`, `AMBULANCE_ASSIGNED`, `AMBULANCE_EN_ROUTE`, `ARRIVED_AT_SCENE`, `COMPLETED`, or `CANCELLED`.
  - **CLOSED Facility Hard Block:** Hospitals with status `CLOSED` cannot be selected under any circumstances (throws `BadRequestException`). Overrides are rejected.
  - **DIVERTING Facility Hard Block:** Hospitals with status `DIVERTING` cannot be selected under any circumstances (throws `BadRequestException`). Overrides are rejected.
  - **Incompatible Required Resources Hard Block:** If a specified required resource has `availableQuantity: 0`, status `UNAVAILABLE`, or status `MAINTENANCE`, selection is strictly rejected (throws `BadRequestException`). Overrides are not permitted for depleted required resources.
  - **Dispatcher Review Override Justification:** If a hospital is operational (`OPERATIONAL` or `BUSY`) but flagged `REQUIRES_REVIEW` (e.g. `BUSY` status, `LOW_STOCK`, or unconfirmed resources), selection is permitted only if `overrideReason` is provided and contains at least 10 non-whitespace characters.
  - **Idempotency:** Reselecting the same destination hospital returns the current emergency record without mutating status (e.g., preserves `HOSPITAL_NOTIFIED` or `EN_ROUTE_TO_HOSPITAL` without regressing to `HOSPITAL_SELECTED`) and avoids generating duplicate audit events.
  - **Concurrency Protection:** Uses conditional database updates (`updateMany` matching `id`, `status: expectedStatus`, `destinationHospitalId: expectedPreviousDestination`). Throws `409 ConflictException` if a concurrent modification altered the emergency status or destination between evaluation and commit.
- **Response (`200 OK`):**
  - The updated emergency object with updated `destinationHospitalId` and status (`HOSPITAL_SELECTED`, or preserved active transport status).
- **Audit Events Emitted:**
  - `HOSPITAL_SELECTED`: Recorded on initial destination selection.
  - `DESTINATION_CHANGED`: Recorded when reassigning to a different destination hospital.
- **Error Responses:**
  - `400 Bad Request`: Invalid emergency or hospital UUID, emergency in non-transport status, hard operational block (closed/diverting/depleted resource), missing or insufficient override reason (<10 characters).
  - `404 Not Found`: Emergency or hospital does not exist.
  - `409 Conflict`: Concurrent update detected (status or destination changed concurrently).

## 9. Authentication and User APIs

**Status:** Requires repository verification.

The portal requirements depend on authentication and authorisation functionality for:

- Patients.
- Ambulance drivers.
- Hospital employees.
- Super Administrators.

The exact authentication endpoints and supported mechanisms must be documented after inspecting the current backend.

Do not assume OTP, email invitations or multi-role support are implemented simply because they appear in the portal requirements.

## 10. Handover APIs

**Module:** Handovers (`HandoversModule`)
**Controller:** `HandoversController` (`backend/src/handovers/handovers.controller.ts`)
**Service:** `HandoversService` (`backend/src/handovers/handovers.service.ts`)
**Status:** VERIFIED & OPERATIONAL (M5.4 Implemented; Remote Migrations Pending)
**Authentication & Authorization:** Deferred to M8 (`actorId: null` or caller-provided IDs in audit events; controller endpoints are unauthenticated).

The Handover module governs the transition of clinical and operational responsibility from ambulance crews to receiving hospital emergency department staff upon arrival at the destination hospital.

### 10.1 Initiate Handover

Initiates a digital patient handover record for an emergency case that has arrived at the destination hospital.

- **Method:** `POST`
- **Route:** `/api/v1/handovers`
- **Controller Action:** `HandoversController.create`
- **Request Body (`CreateHandoverDto`):**
  - `caseId` (UUID, required): The ID of the emergency case.
  - `paramedicId` (UUID, optional): User ID of the handing-over paramedic or driver (validated to have role `PARAMEDIC` or `AMBULANCE_DRIVER` and affiliation with the active ambulance).
  - `receivingDoctorId` (UUID, optional): User ID of the receiving hospital staff (validated to have role `DOCTOR` or `HOSPITAL_ADMIN` and affiliation with the destination hospital).
  - `clinicalSummary` (string, optional, max 5000 characters): Pre-hospital clinical summary.
  - `patientCondition` (string, optional, max 1000 characters): Observed patient condition upon arrival.
  - `vitals` (`VitalsDto`, optional): Structured physiological vital signs measured during transport:
    - `heartRate` (integer, 20â€“300 bpm)
    - `bloodPressureSystolic` (integer, 40â€“300 mmHg)
    - `bloodPressureDiastolic` (integer, 20â€“200 mmHg)
    - `respiratoryRate` (integer, 4â€“80 breaths/min)
    - `oxygenSaturation` (number, 50â€“100 %)
    - `temperature` (number, 25.0â€“45.0 Â°C)
    - `glasgowComaScale` (integer, 3â€“15 GCS)
    - `bloodGlucose` (number, 10â€“1000 mg/dL)
    - `painScore` (integer, 0â€“10 scale)
  - `notes` (string, optional, max 2000 characters): Additional operational notes.
- **State Guards & Prerequisite Validations:**
  - **Case Arrival Guard:** The emergency case must be in status `ARRIVED_AT_HOSPITAL`. Cannot initiate if in `EN_ROUTE_TO_HOSPITAL` or earlier statuses.
  - **Destination Hospital Guard:** `emergencyCase.destinationHospitalId` must be non-null.
  - **Active Transport Guard:** The case must have an active assignment with status `PATIENT_ONBOARD`.
  - **Active Handover Uniqueness Guard:** At most one active (`PENDING` or `IN_PROGRESS`) handover is permitted per case. Duplicate initiation requests are rejected with `409 ConflictException`.
- **Database Transactional Effects:**
  - Creates `Handover` record with status `IN_PROGRESS` and `handoverStartedAt = now()`.
  - Transitions `EmergencyCase` status from `ARRIVED_AT_HOSPITAL` to `HANDOVER_IN_PROGRESS`.
  - Emits `CaseEvent` of type `HANDOVER_STARTED`.
- **Response (`201 Created`):**
  - Complete Handover record with related `case`, `ambulance`, `hospital`, `paramedic`, `receivingDoctor`, plus `clinicalDisclaimer` and `policyNotice`.
- **Error Responses:**
  - `400 Bad Request`: Validation failure on DTO fields, emergency case not arrived at hospital, missing destination hospital, missing `PATIENT_ONBOARD` assignment, or role/affiliation mismatch.
  - `404 Not Found`: Emergency case, paramedic, or doctor not found.
  - `409 Conflict`: An active handover already exists for this emergency case.

---

### 10.2 Retrieve Handover

Retrieves an individual handover record by its UUID.

- **Method:** `GET`
- **Route:** `/api/v1/handovers/:id`
- **Controller Action:** `HandoversController.findOne`
- **Route Parameters:**
  - `id` (UUID, required): The ID of the handover record.
- **Response (`200 OK`):**
  - Complete handover object including associated case, ambulance, hospital, paramedic, and receiving doctor relations, plus policy disclaimers.
- **Error Responses:**
  - `400 Bad Request`: Invalid UUID format.
  - `404 Not Found`: Handover record does not exist.

---

### 10.3 Retrieve Active Handover for Case

Retrieves the currently active (`PENDING` or `IN_PROGRESS`) handover for an emergency case.

- **Method:** `GET`
- **Route:** `/api/v1/handovers/case/:caseId/active`
- **Controller Action:** `HandoversController.findActiveByCaseId`
- **Route Parameters:**
  - `caseId` (UUID, required): Emergency case UUID.
- **Response (`200 OK`):**
  - Handover object if an active handover exists, or `null` if none is active.
- **Error Responses:**
  - `400 Bad Request`: Invalid case UUID.
  - `404 Not Found`: Emergency case does not exist.

---

### 10.4 List Handovers for Case

Retrieves all historical and active handover records for an emergency case, ordered latest first.

- **Method:** `GET`
- **Route:** `/api/v1/handovers/case/:caseId`
- **Controller Action:** `HandoversController.findAllForCase`
- **Route Parameters:**
  - `caseId` (UUID, required): Emergency case UUID.
- **Response (`200 OK`):**
  - Array of handover records associated with the case.
- **Error Responses:**
  - `400 Bad Request`: Invalid case UUID.
  - `404 Not Found`: Emergency case does not exist.

---

### 10.5 Update Handover

Progressively updates observations, clinical summary, structured vitals, or operational notes on an active handover.

- **Method:** `PATCH`
- **Route:** `/api/v1/handovers/:id`
- **Controller Action:** `HandoversController.update`
- **Route Parameters:**
  - `id` (UUID, required): The ID of the handover record.
- **Request Body (`UpdateHandoverDto`):**
  - `paramedicId` (UUID, optional)
  - `receivingDoctorId` (UUID, optional)
  - `clinicalSummary` (string, optional, max 5000 characters)
  - `patientCondition` (string, optional, max 1000 characters)
  - `vitals` (`VitalsDto`, optional)
  - `notes` (string, optional, max 2000 characters)
- **State Guard:**
  - Updates are permitted only while handover is in `PENDING` or `IN_PROGRESS` status. Rejects modification of completed, rejected, or cancelled handovers with `400 Bad Request`.
- **Response (`200 OK`):**
  - Updated handover record.
- **Error Responses:**
  - `400 Bad Request`: Handover is completed/rejected/cancelled, or DTO validation failure.
  - `404 Not Found`: Handover record, paramedic, or doctor not found.

---

### 10.6 Complete Handover

Finalises patient transfer of care when receiving hospital medical staff formally accept the patient.

- **Method:** `POST`
- **Route:** `/api/v1/handovers/:id/complete`
- **Controller Action:** `HandoversController.complete`
- **Route Parameters:**
  - `id` (UUID, required): Handover UUID.
- **Request Body (`CompleteHandoverDto`):**
  - `receivingDoctorId` (UUID, optional): User ID of the confirming hospital doctor.
  - `clinicalSummary` (string, optional, max 5000 characters): Final handover summary.
  - `patientCondition` (string, optional, max 1000 characters): Condition at transfer of care.
  - `notes` (string, optional, max 2000 characters): Final closing notes.
- **State Guard:**
  - Handover must be in `PENDING` or `IN_PROGRESS` status.
- **Database Transactional Effects:**
  1. Updates `Handover` status to `COMPLETED` and sets `handoverCompletedAt = now()`.
  2. Updates `EmergencyCase` status to `COMPLETED` and sets `resolvedAt = now()`.
  3. Updates active `Assignment` status to `COMPLETED` and sets `completedAt = now()`.
  4. Releases `Ambulance` back to available fleet: status becomes `AVAILABLE` and `isAvailable: true`.
  5. Emits `CaseEvent` of type `HANDOVER_COMPLETED`.
  6. Emits `CaseEvent` of type `CASE_COMPLETED`.
- **Response (`200 OK`):**
  - Completed handover object with all updated relations and policy disclaimers.
- **Error Responses:**
  - `400 Bad Request`: Handover is not in active state (`PENDING` or `IN_PROGRESS`), or receiving staff role mismatch.
  - `404 Not Found`: Handover or receiving doctor not found.

---

### 10.7 Reject Handover

Records hospital rejection of a patient handover (e.g. sudden power failure, unanticipated facility closure, or emergency divert).

- **Method:** `POST`
- **Route:** `/api/v1/handovers/:id/reject`
- **Controller Action:** `HandoversController.reject`
- **Route Parameters:**
  - `id` (UUID, required): Handover UUID.
- **Request Body (`RejectHandoverDto`):**
  - `reason` (string, required): Operational justification for handover rejection. **Must contain at least 10 non-whitespace characters** (max 2000 characters).
  - `rejectingStaffId` (UUID, optional): User ID of the rejecting staff (validated for role `DOCTOR` or `HOSPITAL_ADMIN`).
  - `notes` (string, optional, max 2000 characters): Additional context.
- **State Guard:**
  - Handover must be in `PENDING` or `IN_PROGRESS` status.
- **Operational Safety & Database Transactional Effects:**
  1. Updates `Handover` status to `REJECTED` and appends rejection reason to notes.
  2. Reverts `EmergencyCase` status to `ARRIVED_AT_HOSPITAL`.
  3. **Ambulance and crew are NOT released:** Ambulance remains in status `PATIENT_ONBOARD` (or transport state) and `Assignment` remains active in status `PATIENT_ONBOARD`.
  4. Emits dedicated `CaseEvent` of type `HANDOVER_REJECTED`.
  5. Rerouting the patient to an alternative facility is a separate subsequent operation performed by dispatchers via `PATCH /api/v1/emergencies/:id/destination`.
- **Response (`200 OK`):**
  - Rejected handover record with details and policy notices.
- **Error Responses:**
  - `400 Bad Request`: Reason missing or shorter than 10 non-whitespace characters, handover not active, or rejecting staff role invalid.
  - `404 Not Found`: Handover or rejecting staff not found.

---

### 10.8 Cancel Handover

Cancels an erroneous or duplicate handover initiation (e.g. administrative error).

- **Method:** `POST`
- **Route:** `/api/v1/handovers/:id/cancel`
- **Controller Action:** `HandoversController.cancel`
- **Route Parameters:**
  - `id` (UUID, required): Handover UUID.
- **Request Body (`CancelHandoverDto`):**
  - `reason` (string, required): Justification for cancellation. **Must contain at least 10 non-whitespace characters** (max 2000 characters).
  - `actorId` (UUID, optional): User ID performing the cancellation.
  - `notes` (string, optional, max 2000 characters): Additional operational context.
- **State Guard:**
  - Handover must be in `PENDING` or `IN_PROGRESS` status.
- **Database Transactional Effects:**
  1. Updates `Handover` status to `CANCELLED` and appends reason to notes.
  2. Reverts `EmergencyCase` status to `ARRIVED_AT_HOSPITAL`.
  3. **Ambulance and assignment are NOT released** (remain in `PATIENT_ONBOARD`).
  4. Emits dedicated `CaseEvent` of type `HANDOVER_CANCELLED`.
- **Response (`200 OK`):**
  - Cancelled handover record.
- **Error Responses:**
  - `400 Bad Request`: Reason missing or shorter than 10 non-whitespace characters, or handover not active.
  - `404 Not Found`: Handover not found.

## 11. Location APIs

**Status:** Requires repository verification.

The integrated system requires location functionality for:

- Emergency pickup location.
- Ambulance location updates.
- Retrieving relevant ambulance location.
- Displaying last update timestamps.
- Identifying stale location data.

The exact API contract and location update mechanism must be verified.

## 12. Notification APIs

**Status:** Requires repository verification.

Required capabilities may include:

- Creating notifications.
- Retrieving user notifications.
- Marking notifications as read.
- Delivering operational alerts.
- Associating notifications with emergencies and assignments.

Do not document these as implemented until corresponding backend functionality exists.

## 13. API Contract Template

Use the following template when documenting a newly verified endpoint.

### Endpoint: [Name]

| Property | Value |
| --- | --- |
| Method | [HTTP method] |
| Route | [Exact route] |
| Module | [NestJS module] |
| Controller | [Controller name] |
| Authentication | [Required / Not required] |
| Authorised access | [Roles / ownership rules] |
| Purpose | [Description] |
| Implementation status | [Verified / Partial / Pending] |

**Request parameters**

Document path and query parameters from the controller and DTO.

**Request body**

Document the actual DTO fields, types, validation and required/optional status.

**Response**

Document the actual response structure.

**Errors**

Document relevant validation, authentication, authorisation and business-rule errors.

**Source files**

Record the controller, service and DTO paths used to verify the contract.

## 14. API Verification Checklist

Before frontend integration, verify:

- [ ] Route exists in the current controller.
- [ ] HTTP method is correct.
- [ ] DTO matches the current source.
- [ ] Required and optional fields are identified.
- [ ] Response structure is verified.
- [ ] Authentication requirement is known.
- [ ] Authorisation rules are known.
- [ ] Error handling is documented.
- [ ] Database side effects are understood.
- [ ] Relevant tests exist or are planned.
- [ ] API behaviour is tested.

## 15. Related Documentation

- `DATABASE_SCHEMA.md`
- `STATUS_MAPPING.md`
- `API_INTEGRATION_MAP.md`
- `../00-project/SYSTEM_ARCHITECTURE.md`
- `../00-project/MVP_SCOPE.md`
- `../03-workflows/EMERGENCY_LIFECYCLE.md`
- `../03-workflows/AMBULANCE_WORKFLOW.md`
- `../03-workflows/HOSPITAL_WORKFLOW.md`
- `../03-workflows/PATIENT_HANDOVER.md`
