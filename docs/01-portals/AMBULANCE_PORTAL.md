# RAAH-CARE — Ambulance & Paramedic Portal Specification

**Application Directory:** `apps/ambulance-web`  
**Default Development Port:** `http://localhost:5174`  
**Primary User Roles:** `PARAMEDIC`, `AMBULANCE_DRIVER`  
**Last Updated:** 28 November 2026  

---

## 1. Overview & Purpose

The Ambulance Portal is the mission critical interface for emergency vehicle drivers and paramedics. It coordinates emergency dispatch acceptance, route navigation to the patient, on-scene clinical assessment, hardware camera decoding of patient Cura Cards, and digital handover to receiving emergency departments.

---

## 2. Route Structure & Page Components

| Route | Page / Component | Protection | Description |
|---|---|---|---|
| `/login` | `AmbulanceLoginPage.tsx` | Public | Credential authentication for paramedics and drivers. |
| `/dashboard` | `AmbulanceDashboardPage.tsx` | Protected (`PARAMEDIC`, `AMBULANCE_DRIVER`) | Active incident alert, vehicle telemetry status, and quick-action menu. |
| `/missions` | `MissionManagementPage.tsx` | Protected | Inbound dispatch requests, accept/reject controls, and mission timeline. |
| `/navigation` | `NavigationPage.tsx` | Protected | Turn-by-turn routing to patient scene and destination hospital. |
| `/handover` | `HandoverPage.tsx` | Protected | Digital patient handover initiation to receiving hospital. |
| `/cura-card-scan`| `CuraCardScanner.tsx` | Protected (`PARAMEDIC`, `DOCTOR`) | Camera QR scanner and manual fallback token resolver. |
| `/history` | `MissionHistoryPage.tsx` | Protected | Completed mission logs and transport records. |
| `/vehicle` | `VehicleStatusPage.tsx` | Protected | Vehicle checklist (fuel, oxygen levels, medical equipment). |

---

## 3. Hardware Camera Cura Card Scanner

The Paramedic portal includes a real-time camera-based QR scanner (`apps/ambulance-web/src/components/CuraCardScanner.tsx`):

### 3.1 Scanner Implementation
- Initializes video capture via `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`.
- Streams frames into a hidden HTML5 `<canvas>` and rasterizes image data using `jsQR`.
- Extracts the ephemeral token from the scanned URL (`token=...`).

### 3.2 Secure Token Resolution
- Submits the token to the backend:
  ```http
  POST /api/v1/cura-card/resolve
  Content-Type: application/json
  Authorization: Bearer <PARAMEDIC_JWT>

  {
    "token": "4f18d7b80a...",
    "caseId": "optional-uuid"
  }
  ```
- Upon verification, displays the patient's critical medical record:
  - Full Name, Date of Birth, Gender
  - Blood Group (highlighted badge)
  - Known Allergies & Adverse Reactions
  - Chronic Conditions & Medical History
  - Current Medications
  - Emergency Contact Phone Number

### 3.3 Manual Fallback Resolution
- If the patient's phone screen is cracked or camera access fails, the paramedic can manually type the permanent Card ID or raw token string into the resolver form.
