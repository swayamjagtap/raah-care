# RAAH-CARE — Patient Portal Specification

**Application Directory:** `apps/patient-web`  
**Default Development Port:** `http://localhost:5173`  
**Primary User Roles:** `PATIENT` (with unauthenticated guest SOS support)  
**Last Updated:** 28 November 2026  

---

## 1. Overview & Purpose

The Patient Portal is the citizen-facing web application for RAAH-CARE. It provides emergency SOS dispatching, patient medical profile management, real-time emergency tracking, and the digital Cura Card emergency identification system.

The application is built using React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, and React Router v7.

---

## 2. Route Structure & Page Components

| Route | Page / Component | Protection | Description |
|---|---|---|---|
| `/` | `PatientPortalPage.tsx` | Public | Emergency SOS trigger interface and active emergency status tracker. |
| `/login` | `PatientLoginPage.tsx` | Public (Redirects if auth) | Supabase Auth email/password login and magic-link handler. |
| `/register` | `PatientRegisterPage.tsx` | Public (Redirects if auth) | User registration with immediate profile linking. |
| `/dashboard` | `PatientPortalPage.tsx` | Protected (`PATIENT`) | Primary patient dashboard displaying active alerts and medical baseline. |
| `/history` | `PatientEmergencyHistoryPage.tsx` | Protected (`PATIENT`) | Historical list of emergency requests with timeline and outcome status. |
| `/emergency-history` | Redirect to `/history` | Protected (`PATIENT`) | Backward compatibility redirect. |
| `/medical-profile` | `MedicalProfilePage.tsx` | Protected (`PATIENT`) | View and edit clinical details: blood group, allergies, chronic conditions, medications. |
| `/profile` | Redirect to `/medical-profile` | Protected (`PATIENT`) | Convenience alias. |
| `/cura-card` | `CuraCardPage.tsx` | Protected (`PATIENT`) | Cura Card viewer, 5-minute ephemeral QR generator, countdown timer, and instant revocation. |
| `/settings` | `PatientSettingsPage.tsx` | Protected (`PATIENT`) | Account configuration and emergency contact management (persisted via `PATCH /patients/me`). |
| `/about`, `/how-it-works`, `/contact` | `InfoPages.tsx` | Public | Static informational and support pages. |

---

## 3. Key Workflows & Features

### 3.1 Authentication & Profile Bridging
- Authenticates through Supabase Auth using `@raah/auth`.
- If an authenticated Supabase user does not have a linked backend record, the application coordinates self-registration via `POST /api/v1/auth/register`.
- Protected routes evaluate session status: unauthenticated users accessing protected paths are shown informative fallback cards with explicit login prompts rather than blank screens.

### 3.2 Emergency SOS Request
- Patients can trigger an emergency request with GPS coordinates.
- Unauthenticated users can submit a guest SOS, with clear messaging that live tracking requires an authenticated session.
- Real-time updates display ambulance assignment, paramedic ETA, and assigned hospital destination.

### 3.3 Medical Profile Management
- Direct integration with backend endpoints:
  - `GET /api/v1/patients/me`: Fetches blood group, allergies, chronic conditions, and medications.
  - `PATCH /api/v1/patients/me`: Persists modifications made by the patient.

### 3.4 Digital Cura Card System
- Displays the permanent stable Card ID (e.g. `RAAH-CR-91D9FBB9`).
- **QR Code Generation**: Requests a 256-bit cryptographic ephemeral token from `POST /api/v1/cura-card/token`.
- **Privacy Assurance**: The rendered QR code encodes only the resolution URL (`http://localhost:5173/cura-card?token=...`). It never contains raw patient PII or medical history.
- **5-Minute Countdown**: Displays a live countdown timer showing remaining token validity.
- **Instant Revocation**: Clicking "Revoke QR" immediately executes `POST /api/v1/cura-card/revoke`, transitioning the card state to `TOKEN INACTIVE`.
