# RAAH + CARE — System Architecture

**Document Version:** 2.0  
**Status:** Active Implementation Reference  
**Last Updated:** 28 November 2026  

---

## 1. Architectural Overview

RAAH-CARE is an emergency medical coordination platform designed for the critical "Golden Hour". It coordinates emergency dispatch, resource-aware hospital allocation, real-time paramedic navigation, and instant patient medical identification.

The system is architected as a modern **pnpm monorepo** consisting of four role-segregated Single Page Applications (SPAs), shared workspace libraries, and a unified NestJS API Gateway backed by PostgreSQL and Supabase Authentication.

```text
                               +----------------------------------+
                               |     End Users & Clinicians       |
                               +----------------------------------+
                                  |         |         |         |
             +--------------------+         |         |         +--------------------+
             |                              |         |                              |
             v                              v         v                              v
   +--------------------+        +--------------------+ +--------------------+ +--------------------+
   |    Patient Web     |        |   Ambulance Web    | |    Hospital Web    | |     Admin Web      |
   | (apps/patient-web) |        |(apps/ambulance-web)| |(apps/hospital-web) | |  (apps/admin-web)  |
   |    Port: 5173      |        |    Port: 5174      | |    Port: 5175      | |    Port: 5176      |
   +--------------------+        +--------------------+ +--------------------+ +--------------------+
             |                              |         |                              |
             +------------------------------+----+----+------------------------------+
                                                 |
                       HTTPS REST / WSS WebSocket (Token Bearer Auth)
                                                 |
                                                 v
                               +----------------------------------+
                               |       NestJS API Gateway         |
                               |          (backend/src)           |
                               |            Port: 3000            |
                               +----------------------------------+
                                                 |
                     +---------------------------+---------------------------+
                     |                           |                           |
                     v                           v                           v
         +-----------------------+   +-----------------------+   +-----------------------+
         |     Auth Module       |   |   Dispatch & Cases    |   |   Cura Card Module    |
         | - Supabase JWKS       |   | - WebSocket Gateway   |   | - Ephemeral QR Tokens |
         | - RBAC Roles Guard    |   | - Allocation Engine   |   | - Responder Resolver  |
         | - User Provisioning   |   | - Triage Scoring      |   | - Access Audit Trail  |
         +-----------------------+   +-----------------------+   +-----------------------+
         | Patients Module       |   | Hospitals Module      |   | Responders Module     |
         | - Clinical Profiles   |   | - Bed Capacities      |   | - Fleet Telemetry     |
         | - Emergency Contacts  |   | - Intake Handover     |   | - Mission Assignment  |
         +-----------------------+   +-----------------------+   +-----------------------+
                                                 |
                                                 v
                               +----------------------------------+
                               |      Prisma ORM Layer            |
                               |    (backend/generated/prisma)    |
                               +----------------------------------+
                                                 |
                                                 v
                               +----------------------------------+
                               |    PostgreSQL Database           |
                               |   (Hosted on Supabase)           |
                               +----------------------------------+
```

---

## 2. Frontend Portal Architecture

Rather than combining multiple disparate user roles into a single monolithic bundle, RAAH-CARE separates the user experience into four dedicated Vite SPAs.

### Why Role Separation Exists
1. **Security & Surface Minimization**: Administrative and clinical tools (dispatch overrides, patient medical resolver) are never bundled or exposed to general patient portal code.
2. **Context-Specific Performance**: The Ambulance portal is optimized for mobile touchscreens, low-bandwidth telemetry, and hardware camera decoding. The Hospital portal is optimized for high-density multi-bed tracking displays.
3. **Independent Deployability**: Each application can be built, updated, and hosted independently (e.g. on distinct subdomains or edge networks).

| Application | Port | Workspace Path | Target Role | Key Features |
|---|---|---|---|---|
| **Patient Web** | `5173` | `apps/patient-web` | `PATIENT` | SOS emergency trigger, real-time responder tracking, Medical Profile CRUD, Cura Card QR code generation, 5-minute countdown, token revocation. |
| **Ambulance Web** | `5174` | `apps/ambulance-web` | `PARAMEDIC`, `AMBULANCE_DRIVER` | Incident assignment alert, GPS navigation, live patient vitals, camera-based Cura Card scanner (`jsQR`), digital hospital handover. |
| **Hospital Web** | `5175` | `apps/hospital-web` | `DOCTOR`, `HOSPITAL_ADMIN` | Inbound emergency queue, live ICU/Oxygen/Ventilator bed counts, ER trauma camera scanner, handover acceptance. |
| **Admin Web** | `5176` | `apps/admin-web` | `DISPATCHER`, `SYSTEM_ADMIN` | Global emergency heatmap, manual ambulance override dispatch, hospital status supervision, system audit logs. |

---

## 3. Shared Workspace Packages

To prevent code duplication while enforcing strong type safety across the monorepo boundary, three shared packages reside in `packages/`:

1. **`@raah/shared-types` (`packages/shared-types`)**:
   - Monorepo source of truth for TypeScript interfaces, DTO definitions, and domain enums.
   - Defines `CuraCardTokenPayload`, `ResponderPatientMedicalRecord`, `CuraCardAccessOutcome`, `EmergencyCase`, `AcuityLevel`, and `HospitalStatus`.
2. **`@raah/auth` (`packages/auth`)**:
   - Client-side authentication logic and session management.
   - Wraps Supabase Auth client (`@supabase/supabase-js`), handles JWT refresh, and provides React `AuthContext` and `useAuth()` hooks.
3. **`@raah/api-client` (`packages/api-client`)**:
   - Strongly-typed HTTP client wrapping Axios/Fetch.
   - Configures base URLs, bearer token injection, and unified error handling across all four frontend portals.

---

## 4. Backend System Modules (`backend/src`)

The NestJS backend API is built using clean modular boundaries:

```text
src/
├── auth/            # Supabase JWKS verification, JWT validation strategy, RolesGuard, UserProvisioningService
├── patients/        # PatientsController, PatientsService (clinical profile CRUD, emergency contact persistence)
├── cura-card/       # CuraCardController, CuraCardService (ephemeral QR crypto, resolver, audit logging)
├── emergencies/     # EmergenciesController, EmergenciesService (SOS creation, lifecycle state machine)
├── dispatch/        # DispatchGateway (WebSocket), DispatchService, AllocationEngine (haversine scoring)
├── hospitals/       # HospitalsController, HospitalsService (departments, bed capacities, resource tracking)
├── responders/      # RespondersController, RespondersService (ambulance telemetry, mission status)
├── handovers/       # HandoversController, HandoversService (digital transfer from paramedic to physician)
├── audit/           # AuditService (system-wide regulatory compliance event logging)
└── database/        # PrismaModule, PrismaService (PostgreSQL connection and transaction lifecycle)
```

---

## 5. Security & Authentication Boundaries

### 1. Identity Verification Boundary
- User identities are managed by **Supabase Auth**.
- The client receives an industry-standard signed JWT containing `sub` (Supabase UUID), `email`, and standard claims.
- The NestJS backend validates the JWT using the project's Supabase JWT Secret or JWKS endpoint.
- `UserProvisioningService` bridges the Supabase identity to the PostgreSQL `User` record via `User.supabaseId`.

### 2. Role-Based Access Control (RBAC)
- All endpoints are closed by default and protected by `JwtAuthGuard` and `RolesGuard`.
- The `@Roles(UserRole...)` decorator specifies which roles are authorized:
  - `PATIENT`: Access only to own profile (`/patients/me`) and card (`/cura-card/me`).
  - `PARAMEDIC`, `DOCTOR`: Authorized to resolve emergency QR tokens (`POST /cura-card/resolve`).
  - `SYSTEM_ADMIN`: Authorized to create staff accounts and link identities (`/auth/users`).

### 3. Cura Card Privacy & Security Boundary
- **Privacy by Design**: The QR code encodes only a transient resolution URL containing a 256-bit cryptographically random token (`http://localhost:5173/cura-card?token=...`). It never contains names, blood groups, or medical history.
- **5-Minute Ephemeral Lifecycle**: Tokens automatically expire after 5 minutes.
- **Instant Revocation**: Patients can click "Revoke QR" at any time, immediately invalidating the active token in PostgreSQL (`revokedAt = NOW()`).
- **Cryptographic Storage**: Raw tokens are never stored in the database; only SHA-256 hashes are persisted (`CuraCardToken.tokenHash`).
- **Role-Restricted Resolution**: Only authorized first responders (`PARAMEDIC` and `DOCTOR`) can resolve a token via `POST /api/v1/cura-card/resolve`.
- **Immutable Audit Logging**: Every scan attempt (successful, expired, revoked, or unauthorized) is permanently recorded in `CuraCardAudit`.
- **Offline Fallback**: If an emergency occurs in an area without connectivity, the permanent stable Card ID (e.g. `RAAH-CR-91D9FBB9`) displayed on the card can be manually referenced by responders.

---

## 6. Real-Time Communication Layer

- Emergency dispatch and responder telemetry utilize WebSockets via NestJS `@WebSocketGateway()`.
- Real-time events include:
  - `emergency:created`: Broadcast to dispatch supervisors and nearby ambulances.
  - `ambulance:telemetry`: High-frequency location updates sent from `apps/ambulance-web`.
  - `handover:initiated`: Alert sent to `apps/hospital-web` when an inbound patient is 5 minutes from arrival.
