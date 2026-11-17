# RAAH + CARE

**RAAH + CARE** is a resource-aware emergency care coordination platform
connecting patients, caregivers, ambulances, dispatchers, and hospitals.

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

------------------------------------------------------------------------

## Current emergency workflow

The implemented backend supports the following core flow:

``` text
Emergency created
       |
       v
Dispatcher assigns an ambulance
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
Hospital and transport workflow
       |
       v
Patient handover
       |
       v
Emergency case completed
```

Emergency status changes and key workflow actions are recorded as
`CaseEvent` audit records.

**Note:** Hospital selection, resource-aware hospital allocation, and
the complete digital handover workflow are future implementation
milestones; the workflow diagram shows the intended end-to-end
direction, not a claim that every stage is already implemented.

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

This README describes the current development setup and implemented
backend routes. Update the API, workflow, and setup sections whenever
the implementation changes so that a new contributor can reproduce the
project on another computer.
