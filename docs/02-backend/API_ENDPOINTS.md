# RAAH-CARE — Backend API Specification

**Base URL:** `http://localhost:3000/api/v1`  
**Authentication Scheme:** Bearer JWT (`Authorization: Bearer <TOKEN>`)  
**Status:** Verified Implementation  
**Last Updated:** 28 November 2026  

---

## 1. System Health

### `GET /api/v1/health`
- **Auth:** None (Public)
- **Description:** Verifies service availability.
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "service": "raah-care-backend"
  }
  ```

---

## 2. Authentication & User Provisioning (`/api/v1/auth`)

### `GET /api/v1/auth/me`
- **Auth:** Bearer JWT
- **Role:** Any active authenticated user
- **Description:** Returns the linked RAAH user profile for the current Supabase session.
- **Response (200 OK):**
  ```json
  {
    "id": "uuid-here",
    "supabaseId": "supabase-sub-uuid",
    "email": "user@example.com",
    "phone": "9876543210",
    "name": "Alex Doe",
    "role": "PATIENT",
    "isActive": true
  }
  ```

### `POST /api/v1/auth/register`
- **Auth:** Supabase JWT (Self-registration)
- **Role:** Public / Unlinked Supabase User
- **Body:**
  ```json
  {
    "name": "Jane Doe",
    "phone": "9876543210"
  }
  ```
- **Response (201 Created):** Newly created `User` record mapped to `JWT.sub`.

### `POST /api/v1/auth/users`
- **Auth:** Bearer JWT
- **Role:** `SYSTEM_ADMIN`
- **Description:** Administrative creation of staff accounts (`PARAMEDIC`, `DOCTOR`, etc.).

### `POST /api/v1/auth/users/link`
- **Auth:** Bearer JWT
- **Role:** `SYSTEM_ADMIN`
- **Description:** Links an existing RAAH `User.id` with a Supabase `sub` UUID.

---

## 3. Patient Medical Profile (`/api/v1/patients`)

### `GET /api/v1/patients/me`
- **Auth:** Bearer JWT
- **Role:** `PATIENT`
- **Description:** Returns the clinical medical profile of the authenticated patient.
- **Response (200 OK):**
  ```json
  {
    "id": "074f20ed-a740-4491-9411-c2e1527534e9",
    "userId": "2e9673a0-eef1-4329-a05d-fe67c153458f",
    "fullName": "Jane Doe",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "gender": "Female",
    "bloodGroup": "O+",
    "phoneNumber": "9876543210",
    "emergencyContact": "9876543210",
    "medicalHistory": "Hypertension, previous appendectomy",
    "allergies": "Penicillin, Peanuts",
    "currentMedication": "Lisinopril 10mg daily",
    "cardId": "RAAH-CR-91D9FBB9",
    "createdAt": "2026-11-20T10:00:00.000Z",
    "updatedAt": "2026-11-27T18:00:00.000Z"
  }
  ```

### `PATCH /api/v1/patients/me`
- **Auth:** Bearer JWT
- **Role:** `PATIENT`
- **Description:** Updates permitted clinical fields and emergency contact number.
- **Body:**
  ```json
  {
    "bloodGroup": "O+",
    "allergies": "Penicillin",
    "medicalHistory": "Mild asthma",
    "currentMedication": "Albuterol inhaler PRN",
    "emergencyContact": "9876543210"
  }
  ```
- **Response (200 OK):** Updated patient record.

---

## 4. Cura Card Emergency Identity (`/api/v1/cura-card`)

### `GET /api/v1/cura-card/me`
- **Auth:** Bearer JWT
- **Role:** `PATIENT`
- **Description:** Retrieves the patient's permanent card ID, active token expiration, and emergency medical summary.
- **Response (200 OK):**
  ```json
  {
    "cardId": "RAAH-CR-91D9FBB9",
    "status": "ACTIVE",
    "hasActiveToken": true,
    "expiresAt": "2026-11-28T04:05:00.000Z",
    "medicalProfile": {
      "fullName": "Jane Doe",
      "bloodGroup": "O+",
      "allergies": "Penicillin",
      "medicalHistory": "Mild asthma",
      "currentMedication": "Albuterol inhaler PRN",
      "emergencyContact": "9876543210"
    }
  }
  ```

### `POST /api/v1/cura-card/token`
- **Auth:** Bearer JWT
- **Role:** `PATIENT`
- **Description:** Generates or refreshes a 256-bit cryptographically random token valid for exactly 5 minutes.
- **Response (200 OK):**
  ```json
  {
    "cardId": "RAAH-CR-91D9FBB9",
    "qrPayload": "http://localhost:5173/cura-card?token=4f18d7b80a...",
    "expiresAt": "2026-11-28T04:10:00.000Z"
  }
  ```

### `POST /api/v1/cura-card/revoke`
- **Auth:** Bearer JWT
- **Role:** `PATIENT`
- **Description:** Immediately invalidates the patient's currently active token by setting `revokedAt = NOW()`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "revokedAt": "2026-11-28T04:02:15.000Z",
    "message": "Cura Card QR token revoked successfully."
  }
  ```

### `POST /api/v1/cura-card/resolve`
- **Auth:** Bearer JWT
- **Allowed Roles:** `PARAMEDIC`, `DOCTOR`
- **Description:** Resolves a scanned ephemeral QR token or raw token string to the patient's emergency medical record.
- **Body:**
  ```json
  {
    "token": "4f18d7b80a...",
    "caseId": "optional-uuid"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "cardId": "RAAH-CR-91D9FBB9",
    "fullName": "Jane Doe",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "gender": "Female",
    "bloodGroup": "O+",
    "allergies": "Penicillin",
    "medicalHistory": "Mild asthma",
    "currentMedication": "Albuterol inhaler PRN",
    "emergencyContact": "9876543210",
    "resolvedAt": "2026-11-28T04:03:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Token string empty or malformed.
  - `403 Forbidden`: Caller does not hold `PARAMEDIC` or `DOCTOR` role.
  - `404 Not Found`: Token expired, revoked (`revokedAt != null`), or does not match any patient.
- **Audit Logging:** Every invocation automatically records a `CuraCardAudit` entry with `outcome: SUCCESS | EXPIRED | REVOKED | INVALID | UNAUTHORIZED`.

---

## 5. Emergency Lifecycle & Dispatch (`/api/v1/emergencies`, `/api/v1/dispatch`)

- `POST /api/v1/emergencies`: Creates an emergency case (Supports both authenticated users and anonymous guest SOS).
- `GET /api/v1/emergencies/:id`: Retrieves emergency state, location, timeline, and assigned resources.
- `PATCH /api/v1/emergencies/:id/status`: Updates emergency status (`PENDING` → `ASSIGNED` → `ON_SCENE` → `COMPLETED`).
- `GET /api/v1/dispatch/recommendations/:emergencyId`: Executes Haversine distance and clinical acuity ranking algorithm to recommend nearest available ambulances.
- `POST /api/v1/assignments`: Assigns an ambulance to an emergency case.

---

## 6. Hospitals & Resource Management (`/api/v1/hospitals`)

- `GET /api/v1/hospitals`: Lists participating hospitals with location, status, and bed occupancy.
- `GET /api/v1/hospitals/:id/beds`: Detailed bed capacity breakdown (ICU, Trauma, General, Pediatric).
- `PATCH /api/v1/hospitals/:id/status`: Updates hospital diversion status (`NORMAL`, `DIVERTING`, `SATURATED`).

---

## 7. Digital Handover (`/api/v1/handovers`)

- `POST /api/v1/handovers`: Initiates digital clinical handover from paramedic to receiving hospital.
- `PATCH /api/v1/handovers/:id/accept`: Doctor reviews patient vitals and signs off on hospital admission.
