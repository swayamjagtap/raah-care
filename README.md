# RAAH + CARE

**RAAH + CARE** is a resource-aware emergency care coordination platform connecting patients, caregivers, ambulances, dispatchers, and hospitals.

The platform provides dedicated, role-segregated portals running as independent web applications:
- **Patient Portal (`apps/patient-web` on port 5173):** Emergency SOS requests, digital Cura Card emergency identification (with 5-minute ephemeral QR tokens and instant revocation), medical profile management, and real-time response tracking.
- **Ambulance Portal (`apps/ambulance-web` on port 5174):** Paramedic and driver navigation, mission acceptance, live triage updates, HTML5 camera-based QR Cura Card scanner, and digital hospital handover initiation.
- **Hospital Portal (`apps/hospital-web` on port 5175):** ER bed capacity and critical resource tracking (ICU, Oxygen, Ventilators), inbound emergency visibility, ER camera-based Cura Card scanner, and digital patient reception.
- **Admin / Control Centre Portal (`apps/admin-web` on port 5176):** System-wide live operational monitoring, assisted dispatching, hospital allocation decision-support, and audit log analysis.

The system is coordinated by a unified NestJS backend API gateway connected to PostgreSQL (via Prisma ORM) and Supabase Authentication.

---

## Project Structure

RAAH-CARE is structured as a **pnpm monorepo**:

```text
raah-care/
├── apps/                                  # Independent frontend web applications
│   ├── patient-web/                       # Port 5173: Patient emergency, profile & Cura Card
│   ├── ambulance-web/                     # Port 5174: Paramedic missions, triage & QR scanner
│   ├── hospital-web/                      # Port 5175: ER inbound emergencies, beds & QR scanner
│   └── admin-web/                         # Port 5176: System admin & dispatch supervisor
├── backend/                               # NestJS backend API & WebSocket Gateway
│   ├── prisma/                            # Prisma schema, migrations, and seed script
│   │   ├── migrations/                    # Tracked database migrations (Supabase auth, Cura Card)
│   │   ├── schema.prisma                  # PostgreSQL schema with Prisma Client generator
│   │   └── seed.ts                        # Deterministic seed data (hospitals, beds, ambulances)
│   ├── generated/prisma/                  # Generated Prisma Client
│   ├── src/                               # NestJS domain modules
│   │   ├── auth/                          # Supabase JWT validation, user provisioning, RBAC
│   │   ├── patients/                      # Patient medical profile CRUD & emergency contacts
│   │   ├── cura-card/                     # Ephemeral QR token generation, revocation & resolver
│   │   ├── emergencies/                   # Emergency lifecycle, state machine, triage scoring
│   │   ├── dispatch/                      # Real-time WebSocket gateway and dispatch engine
│   │   ├── hospitals/                     # Hospital capacity and bed management
│   │   ├── responders/                    # Ambulance status and paramedic telemetry
│   │   ├── handovers/                     # Paramedic-to-doctor digital handover protocols
│   │   ├── audit/                         # Audit event logging
│   │   └── database/                      # PrismaService and database transactions
│   └── test/                              # End-to-end integration test suites
├── packages/                              # Shared monorepo packages
│   ├── shared-types/                      # TypeScript contracts, DTOs, and domain enums
│   ├── auth/                              # Shared Supabase Auth state machine & session hooks
│   └── api-client/                        # Typed Axios/Fetch API client wrappers
├── docs/                                  # Comprehensive architecture and workflow documentation
├── package.json                           # Root scripts (test, build, dev)
├── pnpm-workspace.yaml                    # Workspace definitions (backend, apps/*, packages/*)
└── pnpm-lock.yaml                         # Locked dependency versions
```

---

## Development Environment

### Prerequisites

| Tool | Verified Version | Notes |
|---|---|---|
| **Node.js** | `>= 20.x` (tested on `24.x`) | LTS recommended |
| **pnpm** | `>= 9.x` (tested on `12.x`) | Package manager for workspaces |
| **Git** | `>= 2.40.x` | Version control |
| **PostgreSQL** | `>= 15.x` | Hosted on Supabase or local instance |

Verify your environment:
```powershell
node --version
pnpm --version
git --version
```

---

## First-Time Setup on a Fresh Machine

### 1. Clone the Repository
```powershell
git clone https://github.com/swayamjagtap/raah-care.git
cd raah-care
```

### 2. Install Monorepo Dependencies
```powershell
pnpm install
```

### 3. Configure Environment Files

You must configure environment variables for the backend and the frontend portals. Tracked `.env.example` templates are provided in each directory.

#### Backend Environment (`backend/.env`):
Create `backend/.env` (copy from `backend/.env.example`):
```env
PORT=3000
NODE_ENV=development

# Database connection strings (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase Auth Configuration
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"

# Application URLs & CORS
FRONTEND_URL="http://localhost:5173"
CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"
```
> [!IMPORTANT]
> The backend requires both `DATABASE_URL` (connection pooler) and `DIRECT_URL` (direct connection for running Prisma migrations).

#### Frontend Portal Environments (`apps/*/.env`):
Copy `.env.example` to `.env` in each app:
- `apps/patient-web/.env`
- `apps/ambulance-web/.env`
- `apps/hospital-web/.env`
- `apps/admin-web/.env`

Required frontend variables:
```env
VITE_API_BASE_URL="http://localhost:3000/api/v1"
VITE_WS_URL="ws://localhost:3000"
VITE_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

---

## Database Initialization

### 1. Generate Prisma Client
Generate the type-safe Prisma Client into `backend/generated/prisma`:
```powershell
pnpm --filter backend exec prisma generate
```

### 2. Apply Database Migrations
Deploy tracked migrations to your PostgreSQL/Supabase database:
```powershell
pnpm --filter backend exec prisma migrate deploy
```

### 3. (Optional) Seed Initial Data
Seed the database with initial emergency hospitals, ambulances, and bed quotas:
```powershell
pnpm --filter backend seed
```

---

## Running in Development

You can start the backend and frontend portals independently or concurrently.

### Start the Backend API (Port 3000)
```powershell
pnpm dev:backend
# Or: pnpm --filter backend start:dev
```
The NestJS API will be available at `http://localhost:3000/api/v1`.  
Health check endpoint: `http://localhost:3000/api/v1/health`.

### Start the Frontend Portals
In separate terminals, run the desired portals:

```powershell
# Patient Portal (Port 5173)
pnpm dev:patient

# Ambulance / Paramedic Portal (Port 5174)
pnpm dev:ambulance

# Hospital / Doctor Portal (Port 5175)
pnpm dev:hospital

# Admin / Control Centre Portal (Port 5176)
pnpm dev:admin
```

| Portal | Port | Target Audience | Primary Role Guard |
|---|---|---|---|
| **Patient Web** | `http://localhost:5173` | Citizens, Patients, Caregivers | `PATIENT` |
| **Ambulance Web** | `http://localhost:5174` | EMTs, Paramedics, Drivers | `PARAMEDIC`, `AMBULANCE_DRIVER` |
| **Hospital Web** | `http://localhost:5175` | ER Doctors, Triage Nurses, Admins | `DOCTOR`, `HOSPITAL_ADMIN` |
| **Admin Web** | `http://localhost:5176` | Dispatchers, System Administrators | `DISPATCHER`, `SYSTEM_ADMIN` |

---

## Verification & Automated Testing

The monorepo uses **Vitest** across the backend and frontend applications.

### Run All Unit & Integration Tests (438 Passing Tests)
```powershell
pnpm test
```
This executes:
- `backend`: 363 tests across 28 test files (services, guards, controllers, DTOs).
- `apps/patient-web`: 52 tests across 4 test files (auth lifecycle, Cura Card, profile).
- `apps/ambulance-web`: 10 tests across 3 test files (scanner, dashboard, role boundary).
- `apps/hospital-web`: 8 tests across 3 test files (ER scanner, dashboard, role boundary).
- `apps/admin-web`: 5 tests across 2 test files (role boundary, dashboard).

### Run Backend Tests Only
```powershell
pnpm test:backend
```

### Run Frontend Tests Only
```powershell
pnpm test:web
```

### Verify Production Builds
Ensure all TypeScript projects and bundlers compile cleanly:
```powershell
pnpm build
```

---

## Core Architecture & Security Model

### Authentication & RBAC Boundary
1. **Supabase Auth**: Authenticates users and issues signed JWT tokens (`sub` matches Supabase user UUID).
2. **Backend Bridge**: When a user registers or logs in, their Supabase identity is resolved against the PostgreSQL `User` record (`User.supabaseId`).
3. **RolesGuard**: Every backend endpoint is protected by `@Roles(...)` decorators matching the `UserRole` enum (`PATIENT`, `PARAMEDIC`, `AMBULANCE_DRIVER`, `DOCTOR`, `HOSPITAL_ADMIN`, `DISPATCHER`, `SYSTEM_ADMIN`).

### Cura Card Emergency Identification System
The **Cura Card** provides life-saving medical profile visibility during the Golden Hour while strictly preserving patient privacy:
- **No Raw PII in QR Codes**: The QR code encodes only a transient resolution URL containing a 256-bit cryptographically random token (`http://localhost:5173/cura-card?token=...`). It never contains names, blood groups, or medical history.
- **5-Minute Ephemeral Lifecycle**: Tokens automatically expire after 5 minutes.
- **Instant Revocation**: Patients can click "Revoke QR" at any time, immediately invalidating the active token in PostgreSQL (`revokedAt = NOW()`).
- **Cryptographic Storage**: Raw tokens are never stored in the database; only SHA-256 hashes are persisted (`CuraCardToken.tokenHash`).
- **Role-Restricted Resolution**: Only authorized first responders (`PARAMEDIC` and `DOCTOR`) can resolve a token via `POST /api/v1/cura-card/resolve`.
- **Immutable Audit Logging**: Every scan attempt (successful, expired, revoked, or unauthorized) is permanently recorded in `CuraCardAudit`.
- **Offline Fallback**: If an emergency occurs in an area without connectivity, the permanent stable Card ID (e.g. `RAAH-CR-91D9FBB9`) displayed on the card can be manually referenced by responders.

---

## Current Project Status & Verified Milestones

- **M1–M3**: Monorepo architecture, database schema, NestJS backend API foundations.
- **M4–M7**: Core emergency dispatching, allocation engine, hospital capacity tracking, bed reservation, and digital handover workflows.
- **M8.1–M8.8**: Supabase JWT authentication, RBAC guards, user provisioning, and secure session management.
- **M9.1–M9.3**: Patient Portal emergency workflows, real-time response tracking, and incident history.
- **M9.4**: Authenticated Patient Medical Profile APIs (`GET /api/v1/patients/me`, `PATCH /api/v1/patients/me`) and emergency contact persistence.
- **M9.5**: Cura Card dual-layer QR generation (Patient Web) and HTML5 camera decoding scanners (`apps/ambulance-web`, `apps/hospital-web`) with audit logging.
- **M9.6**: Frontend route recovery, navigation stabilization, and NestJS development startup path alignment.
- **M9.7**: Database schema alignment (`revokedAt`), live patient settings integration, and monorepo pre-deployment test pass.

---

## Known Operational Considerations & Continuation Path

1. **Camera Permissions over Network (LAN Testing)**: Modern browsers block `navigator.mediaDevices.getUserMedia` when accessed over unencrypted HTTP (except on `localhost`). When testing responder QR scanning across physical mobile devices on a local Wi-Fi network, run the development server behind an HTTPS tunnel (such as `cloudflared` or `ngrok`).
2. **Privileged Demo Accounts**: Patient accounts can self-register via the Patient Portal. Privileged responder accounts (`PARAMEDIC`, `DOCTOR`, `DISPATCHER`) must have their roles provisioned in the database via seed scripts or administrative endpoints (`POST /api/v1/auth/users`).
3. **Production Deployment**: The backend is prepared for containerized deployment (e.g., Railway, Render, Fly.io, or AWS ECS), and the four frontend Vite applications are ready for deployment to Vercel or Netlify.
