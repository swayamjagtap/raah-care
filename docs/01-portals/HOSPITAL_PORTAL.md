# RAAH-CARE — Hospital & Emergency Department Portal Specification

**Application Directory:** `apps/hospital-web`  
**Default Development Port:** `http://localhost:5175`  
**Primary User Roles:** `DOCTOR`, `HOSPITAL_ADMIN`  
**Last Updated:** 28 November 2026  

---

## 1. Overview & Purpose

The Hospital Portal provides Emergency Department (ED) clinicians and administrators with real-time situational awareness. It tracks inbound ambulances, manages ICU/Oxygen/Ventilator bed capacities, pre-populates trauma intake records via Cura Card scanning, and finalizes digital handovers from incoming paramedics.

---

## 2. Route Structure & Page Components

| Route | Page / Component | Protection | Description |
|---|---|---|---|
| `/login` | `HospitalLoginPage.tsx` | Public | Staff sign-in with hospital affiliation validation. |
| `/dashboard` | `HospitalDashboardPage.tsx` | Protected (`DOCTOR`, `HOSPITAL_ADMIN`) | Real-time inbound emergency queue and critical resource summary. |
| `/emergencies` | `InboundEmergencyQueue.tsx` | Protected | Live list of inbound cases, ETA countdowns, and acuity levels. |
| `/beds` | `BedManagementPage.tsx` | Protected | Live bed allocation matrix (Emergency, ICU, General, Trauma). |
| `/resources` | `ResourceTrackingPage.tsx` | Protected | Oxygen supply, ventilator readiness, and blood bank stock levels. |
| `/handover` | `HandoverReceptionPage.tsx` | Protected | Review and sign off digital handovers from paramedics. |
| `/cura-card-scan`| `CuraCardScanner.tsx` | Protected (`DOCTOR`) | Trauma intake scanner for immediate emergency medical record retrieval. |
| `/staff` | `StaffRosterPage.tsx` | Protected (`HOSPITAL_ADMIN`) | On-duty physician and trauma team roster. |

---

## 3. Trauma Intake Cura Card Scanner

When an inbound patient arrives at the Emergency Department or is wheeled into the trauma bay:
1. The triage nurse or ER physician opens `/cura-card-scan`.
2. Scans the patient's Cura Card QR code (or inputs the token) via the `CuraCardScanner` component.
3. Calls `POST /api/v1/cura-card/resolve` using their authenticated `DOCTOR` session.
4. Pre-fills the admission chart with blood group, documented allergies, and current medications, reducing critical prep time during trauma resuscitation.
