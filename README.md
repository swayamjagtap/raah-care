# RAAH + CARE

**RAAH + CARE** is a resource-aware emergency care coordination platform
connecting patients, caregivers, ambulances, dispatchers, and hospitals.

The platform provides dedicated role-based portals for four primary user groups:
- **Patient Portal:** Emergency requests, Cura Card emergency identification, and real-time response tracking.
- **Ambulance Portal:** Driver and paramedic navigation, assignment acceptance/rejection, mission updates, and digital handover initiation.
- **Hospital Portal:** Resource tracking (ICU beds, oxygen, ventilators), incoming emergency visibility, and patient handover reception.
- **Admin / Dispatcher Portal:** System-wide operational monitoring, assisted dispatching, hospital allocation decision-support, and destination management.

The project brings together emergency requests, ambulance allocation,
hospital resource awareness, real-time coordination, and digital patient
handover.

------------------------------------------------------------------------

## Project structure

``` text
raah-care/
├── apps/                  # Role-specific frontend applications (planned)
├── backend/               # NestJS backend API
│   ├── prisma/             # Prisma schema and migrations
│   └── src/                # Backend modules and services
├── packages/               # Shared packages (planned)
├── database/               # Additional database resources (if needed)
├── tests/                  # Shared tests (if needed)
├── docs/                   # Project documentation
├── package.json            # Root workspace configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
├── pnpm-lock.yaml          # Locked dependency versions
└── README.md
```

The repository is a **pnpm monorepo**. The backend is implemented with
NestJS, TypeScript, PostgreSQL, and Prisma. The frontend applications
and shared packages are part of the planned project structure.

------------------------------------------------------------------------

## Development environment

### Required software

Install:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) --- use the project-tested version
  below
- [pnpm](https://pnpm.io/)
- [Visual Studio Code](https://code.visualstudio.com/) or another
  editor

### Versions used for the current development setup

| Tool    | Version   |
|---------|-----------|
| Node.js | `24.19.0` |
| pnpm    | `12.21.0` |
| Git     | `2.53.0`  |

Check your installed versions:

``` powershell
node --version
pnpm --version
git --version
```

------------------------------------------------------------------------

## First-time setup on a new computer

### 1. Clone the repository

``` powershell
git clone https://github.com/swayamjagtap/raah-care.git
Set-Location raah-care
```

### 2. Enable the project's pnpm version

``` powershell
corepack enable
corepack prepare pnpm@12.21.0 --activate
```

Check:

``` powershell
pnpm --version
```

### 3. Install dependencies

Run this from the repository root (`raah-care`):

``` powershell
pnpm install
```

This installs the dependencies for the workspace. Keep `package.json`
files and `pnpm-lock.yaml` committed whenever dependencies change.

------------------------------------------------------------------------

## Environment variables

The backend connects to the project's Supabase PostgreSQL database.
Database credentials are **not stored in Git**.

### 1. Create your local environment file

Run from the repository root:

``` powershell
Copy-Item backend/.env.example backend/.env
```

### 2. Add your database connection strings

Open the new file:

``` powershell
code backend/.env
```

If the `code` command is unavailable, open `backend/.env` from VS Code's
Explorer.

Set both values using the connection strings from the Supabase project:

``` env
DATABASE_URL="YOUR_SUPABASE_POOLER_CONNECTION_STRING"
DIRECT_URL="YOUR_SUPABASE_DIRECT_CONNECTION_STRING"
```

Use the exact connection details shown by Supabase for this project. If
your database password contains reserved URL characters, URL-encode
those characters before placing the password in the connection string.

**Never commit `backend/.env` or share its contents.** The tracked
`backend/.env.example` contains placeholders only.

------------------------------------------------------------------------

## Backend setup

Run these commands from the repository root:

``` powershell
Set-Location backend
```

Generate the Prisma client:

``` powershell
pnpm exec prisma generate
```

Validate the Prisma schema:

``` powershell
pnpm exec prisma validate
```

Apply committed migrations to the configured database:

``` powershell
pnpm exec prisma migrate deploy
```

`migrate deploy` applies migrations that are already present in the
repository. Do not use migration commands that create or reset a
database unless you specifically intend to change the database schema.

------------------------------------------------------------------------

## Start the backend

Keep the terminal in the `backend` directory and run:

``` powershell
pnpm run start:dev
```

The API is available at:

``` text
http://localhost:3000
```

All API routes use this global prefix:

``` text
/api/v1
```

### Health check

Open a second PowerShell terminal and run:

``` powershell
curl.exe http://localhost:3000/api/v1/health
```

Expected response:

``` json
{
  "status": "ok",
  "service": "raah-care-backend"
}
```

------------------------------------------------------------------------

## Implemented backend API

The following routes are currently implemented.

### Emergency cases

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/emergencies` | Create an emergency case |
| `GET` | `/api/v1/emergencies` | List emergency cases |
| `GET` | `/api/v1/emergencies/:id` | Get an emergency case |
| `PATCH` | `/api/v1/emergencies/:id/status` | Update case status |

### Ambulances

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/ambulances` | Register an ambulance |
| `GET` | `/api/v1/ambulances` | List ambulances |
| `GET` | `/api/v1/ambulances/:id` | Get an ambulance |
| `PATCH` | `/api/v1/ambulances/:id/status` | Update ambulance status |

### Assignments

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/emergencies/:emergencyId/assignments` | Assign an ambulance to an emergency |
| `GET` | `/api/v1/emergencies/:emergencyId/assignments` | List assignments for an emergency |
| `GET` | `/api/v1/assignments/:id` | Get an assignment |
| `PATCH` | `/api/v1/assignments/:id/accept` | Accept an assignment |
| `PATCH` | `/api/v1/assignments/:id/reject` | Reject an assignment |
| `PATCH` | `/api/v1/assignments/:id/status` | Update assignment status |

### Hospitals and Resources

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/hospitals` | Register a hospital |
| `GET` | `/api/v1/hospitals` | List hospitals |
| `GET` | `/api/v1/hospitals/:id` | Get a hospital |
| `PATCH` | `/api/v1/hospitals/:id` | Update hospital details |
| `POST` | `/api/v1/hospitals/:id/resources` | Create a hospital resource |
| `GET` | `/api/v1/hospitals/:id/resources` | List hospital resources |
| `PATCH` | `/api/v1/hospitals/:id/resources/:resourceId` | Update resource status and quantity |

### Allocation & Recommendations (M5.3 Stage 2)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/emergencies/:id/ambulance-recommendations` | Score and rank candidate ambulances |
| `GET` | `/api/v1/emergencies/:id/hospital-recommendations` | Score and rank destination hospitals |
| `PATCH` | `/api/v1/emergencies/:id/destination` | Select/reassign hospital with safety and concurrency guards |

### Patient Handover (M5.4)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/handovers` | Initiate patient handover at destination hospital |
| `GET` | `/api/v1/handovers/:id` | Get handover record details |
| `GET` | `/api/v1/handovers/case/:caseId/active` | Get current active handover for an emergency case |
| `GET` | `/api/v1/handovers/case/:caseId` | List all handovers for an emergency case |
| `PATCH` | `/api/v1/handovers/:id` | Update handover notes, vitals, or clinical summary |
| `POST` | `/api/v1/handovers/:id/complete` | Complete handover, resolve case, and release ambulance |
| `POST` | `/api/v1/handovers/:id/reject` | Reject handover, preserve hospital arrival, retain ambulance |
| `POST` | `/api/v1/handovers/:id/cancel` | Cancel handover, preserve hospital arrival, retain ambulance |

------------------------------------------------------------------------

## Current emergency workflow

The implemented backend supports the following core flow:

``` text
Emergency created
       |
       v
Dispatcher assigns an ambulance (or uses M5.3 recommendations)
       |
       v
Ambulance accepts the assignment
       |
       v
Ambulance travels to the scene
       |
       v
Ambulance arrives at the scene
       |
       v
Patient is onboard
       |
       v
Hospital recommendation & destination selected (M5.3)
       |
       v
Ambulance en route to hospital & arrives at hospital
       |
       v
Patient handover initiated, updated, & accepted (M5.4)
       |
       v
Emergency case & assignment completed; ambulance released to available
```

Emergency status changes and key workflow actions are recorded as
`CaseEvent` audit records.

**Status Note:** Core emergency case management, ambulance assignments,
hospital resource management, recommendation and destination selection APIs
(M5.3 Stage 2), and digital patient handover APIs (M5.4) are fully implemented
and verified at the backend service and API layer with 276 unit tests and 20
E2E tests passing. Dedicated frontend portals (`apps/`), remote database
migration execution, and deployment to production environments remain in progress.

------------------------------------------------------------------------

## Testing and verification

Run these commands from the `backend` directory.

### Unit tests

``` powershell
pnpm test
```

### End-to-end tests

``` powershell
pnpm run test:e2e
```

### Production build

``` powershell
pnpm run build
```

### Lint

``` powershell
pnpm run lint
```

### Prisma validation

``` powershell
pnpm exec prisma validate
```

Before pushing a substantial backend change, run the full verification:

``` powershell
pnpm exec prisma validate
pnpm test
pnpm run test:e2e
pnpm run build
pnpm run lint
```

------------------------------------------------------------------------

## Database

The backend uses:

- **Database:** PostgreSQL
- **Hosting:** Supabase
- **ORM:** Prisma
- **Backend framework:** NestJS

Important database files:

| File or directory | Purpose |
| --- | --- |
| `backend/prisma/schema.prisma` | Database models and relations |
| `backend/prisma/migrations/` | Version-controlled database migrations |
| `backend/generated/` | Generated Prisma client output |

The generated Prisma client is recreated locally with
`pnpm exec prisma generate` and should not be committed.

Commit new Prisma migration files whenever you make a database schema
change.

------------------------------------------------------------------------

## Switching between computers

Use this checklist when moving development from your personal laptop to
a college computer (or another machine).

### On the new computer

``` powershell
git clone https://github.com/swayamjagtap/raah-care.git
Set-Location raah-care

corepack enable
corepack prepare pnpm@12.21.0 --activate

pnpm install
```

### Configure the local database environment

``` powershell
Copy-Item backend/.env.example backend/.env
code backend/.env
```

Add the required Supabase connection strings. Do not copy the `.env`
file into Git or send it through chat.

### Prepare and run the backend

``` powershell
Set-Location backend

pnpm exec prisma generate
pnpm exec prisma migrate deploy

pnpm run start:dev
```

To get the latest committed work on a computer that already has the
repository:

``` powershell
git pull origin main
pnpm install
```

If the Prisma schema or migrations have changed, also run:

``` powershell
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

------------------------------------------------------------------------

## Files that must not be committed

Do not commit:

``` text
.env
backend/.env
node_modules/
dist/
build/
coverage/
backend/generated/
```

Do not put database passwords, API keys, JWT secrets, or other
credentials in source files, documentation, screenshots, or commits.

Use `backend/.env.example` to document the names of required environment
variables without including real credentials.

------------------------------------------------------------------------

## Development and Git workflow

Before starting work:

``` powershell
git status
git pull origin main
```

After making changes, review them:

``` powershell
git status
git diff
```

Run the backend verification commands before committing:

``` powershell
Set-Location backend
pnpm exec prisma validate
pnpm test
pnpm run test:e2e
pnpm run build
pnpm run lint
Set-Location ..
```

Stage and commit only the intended files:

``` powershell
git add <files-to-commit>
git diff --cached --check
git diff --cached --stat
git commit -m "describe the change"
git push origin main
```

Avoid using `git add .` blindly. Check `git status` first to make sure
local environment files and generated files are not staged.

------------------------------------------------------------------------

## Project status

- **Backend Architecture & Foundation (M1–M3):** Core emergencies, ambulances, assignments, hospitals, and hospital resource management are implemented and verified.
- **Allocation & Recommendations (M5.3):** Ambulance and hospital recommendation APIs along with destination selection, operational safety blocks, and concurrency guards are implemented and verified (241/241 unit tests).
- **Patient Handover (M5.4):** Complete digital handover lifecycle (initiation, active update, completion/resolution, rejection, cancellation) with transactional state guards, active-handover partial unique index, and dedicated event types is implemented and verified locally (276/276 unit tests, 20/20 E2E tests).
- **Database Migrations:** All M5.3 schema requirements and M5.4 migrations (`20261124230000_add_active_handover_partial_unique_index`, `20261124231000_add_handover_rejected_cancelled_events`) are version-controlled locally. Remote execution against the Supabase instance is pending deployment.
- **Portals (M4) & Shared Frontend:** Architecture documented; portal applications in `apps/` are under development.
- **Auth & RBAC (M8):** Authentication and role-based guards remain deferred.
