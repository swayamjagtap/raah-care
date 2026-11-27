# RAAH-CARE — Admin & Control Centre Portal Specification

**Application Directory:** `apps/admin-web`  
**Default Development Port:** `http://localhost:5176`  
**Primary User Roles:** `DISPATCHER`, `SYSTEM_ADMIN`  
**Last Updated:** 28 November 2026  

---

## 1. Overview & Purpose

The Admin & Control Centre Portal is designed for dispatch supervisors, emergency call center operators, and healthcare system administrators. It provides macro-level oversight across the entire emergency care network, including dispatch override capabilities, ambulance fleet tracking, hospital diversion status, and compliance audit log reviews.

---

## 2. Route Structure & Page Components

| Route | Page / Component | Protection | Description |
|---|---|---|---|
| `/login` | `AdminLoginPage.tsx` | Public | High-privilege administrator sign-in. |
| `/dashboard` | `AdminDashboardPage.tsx` | Protected (`DISPATCHER`, `SYSTEM_ADMIN`) | High-level metrics: active emergencies, response times, fleet readiness. |
| `/control-centre`| `ControlCentrePage.tsx` | Protected | Unified dispatch console with active cases and hospital load heatmap. |
| `/emergencies` | `EmergencySupervisionPage.tsx` | Protected | Live emergency table with manual reassignment and override controls. |
| `/ambulances` | `AmbulanceFleetPage.tsx` | Protected | Real-time map of all ambulances with status (`AVAILABLE`, `ASSIGNED`, `MAINTENANCE`). |
| `/hospitals` | `HospitalNetworkPage.tsx` | Protected | Hospital network capacity, diversion management, and bed statistics. |
| `/users` | `UserManagementPage.tsx` | Protected (`SYSTEM_ADMIN`) | Staff provisioning and Supabase identity linking. |

---

## 3. Administrative Capabilities

### 3.1 Assisted Dispatch & Override
- While the backend `AllocationEngine` computes optimal ambulance-to-patient recommendations automatically via Haversine distance and clinical acuity, dispatchers have full authority to manually assign or reassign ambulances based on real-world constraints (e.g., road closures, specialized medical equipment).

### 3.2 Audit & Regulatory Oversight
- Evaluates system-wide event streams via the backend `AuditService`.
- Monitors Cura Card access logs (`CuraCardAudit`) to prevent clinical misuse or unauthorized patient record lookups.
