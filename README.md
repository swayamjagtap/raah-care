\# RAAH + CARE



Resource-aware emergency care coordination platform connecting patients, caregivers, ambulances, dispatchers, and hospitals through real-time emergency coordination, ambulance allocation, hospital resource awareness, and digital patient handover.



\---



\## Project Structure



```text

raah-care/

├── apps/              # Frontend applications

├── backend/           # NestJS backend API

├── packages/          # Shared frontend/backend packages

├── database/          # Database-related resources

├── tests/             # Shared tests

├── docs/              # Project documentation

├── package.json       # Root workspace configuration

├── pnpm-workspace.yaml

├── pnpm-lock.yaml     # Locked dependency versions

├── .env.example       # Environment variable template

└── README.md

```



\---



\# Development Environment



\## Required Software



Install the following before working on the project:



\- Git

\- Node.js

\- pnpm

\- VS Code or another code editor



\### Current project versions



```text

Node.js: v24.19.0

pnpm:    v12.21.0

Git:     v2.53.0

```



Check your installation:



```powershell

node --version

pnpm --version

git --version

```



\---



\# First-Time Setup on a New Computer



Clone the repository:



```powershell

git clone <YOUR\_GITHUB\_REPOSITORY\_URL>

cd raah-care

```



Enable pnpm:



```powershell

corepack enable

corepack prepare pnpm@12.21.0 --activate

```



Install all project dependencies:



```powershell

pnpm install

```



\---



\# Environment Variables



The backend requires environment variables for the Supabase PostgreSQL database.



Create the backend environment file:



```powershell

Copy-Item backend/.env.example backend/.env

```



Then open it:



```powershell

notepad backend/.env

```



Add the required Supabase database credentials.



\*\*Never commit `backend/.env` to GitHub.\*\*



\---



\# Backend Setup



Go into the backend:



```powershell

cd backend

```



Generate the Prisma client:



```powershell

pnpm exec prisma generate

```



Validate the Prisma schema:



```powershell

pnpm exec prisma validate

```



If database migrations are present, apply them with:



```powershell

pnpm exec prisma migrate deploy

```



\---



\# Start the Backend



From:



```text

raah-care/backend

```



run:



```powershell

pnpm run start:dev

```



The API runs on:



```text

http://localhost:3000

```



API prefix:



```text

/api/v1

```



Health check:



```powershell

curl.exe http://localhost:3000/api/v1/health

```



Expected response:



```json

{

&#x20; "status": "ok",

&#x20; "service": "raah-care-backend"

}

```



\---



\# Backend API



Current implemented modules:



\## Emergency Cases



```text

POST   /api/v1/emergencies

GET    /api/v1/emergencies

GET    /api/v1/emergencies/:id

PATCH  /api/v1/emergencies/:id/status

```



\## Ambulances



```text

POST   /api/v1/ambulances

GET    /api/v1/ambulances

GET    /api/v1/ambulances/:id

PATCH  /api/v1/ambulances/:id/status

```



\## Assignments



```text

POST   /api/v1/emergencies/:emergencyId/assignments

GET    /api/v1/emergencies/:emergencyId/assignments

GET    /api/v1/assignments/:id

PATCH  /api/v1/assignments/:id/accept

PATCH  /api/v1/assignments/:id/reject

PATCH  /api/v1/assignments/:id/status

```



\---



\# Current Emergency Workflow



The backend currently supports:



```text

Emergency Created

&#x20;      ↓

Dispatcher assigns ambulance

&#x20;      ↓

Ambulance accepts assignment

&#x20;      ↓

Ambulance en route

&#x20;      ↓

Arrives at scene

&#x20;      ↓

Patient onboard

&#x20;      ↓

Transport / hospital workflow

&#x20;      ↓

Handover

&#x20;      ↓

Case completed

```



Emergency status changes are recorded through `CaseEvent` audit records.



\---



\# Testing



From the backend directory:



\### Unit tests



```powershell

pnpm test

```



\### E2E tests



```powershell

pnpm run test:e2e

```



\### Build



```powershell

pnpm run build

```



\### Lint



```powershell

pnpm run lint

```



\### Prisma validation



```powershell

pnpm exec prisma validate

```



Before pushing major changes, run the full verification:



```powershell

pnpm exec prisma validate

pnpm test

pnpm run test:e2e

pnpm run build

pnpm run lint

```



\---



\# Database



The project uses:



```text

PostgreSQL

&#x20;  ↓

Supabase

&#x20;  ↓

Prisma ORM

&#x20;  ↓

NestJS API

```



Prisma schema:



```text

backend/prisma/schema.prisma

```



Prisma migrations:



```text

backend/prisma/migrations/

```



Generated Prisma client:



```text

backend/generated/

```



The generated client should not be committed to Git.



\---



\# Switching Computers



When moving from the personal laptop to the college computer:



```powershell

git clone <YOUR\_GITHUB\_REPOSITORY\_URL>

cd raah-care



corepack enable

corepack prepare pnpm@12.21.0 --activate



pnpm install

```



Then configure:



```text

backend/.env

```



using the Supabase credentials.



Then:



```powershell

cd backend



pnpm exec prisma generate

pnpm exec prisma migrate deploy



pnpm run start:dev

```



\---



\# Important



Do not commit:



```text

.env

node\_modules/

dist/

generated/

```



Do not put database passwords, API keys, JWT secrets, or other credentials into source files.



Use:



```text

.env.example

```



for documenting required environment variables without real secrets.



\---



\# Development Rule



Before making a major change:



```powershell

git status

```



After making changes:



```powershell

git status

git diff

```



Before committing:



```powershell

pnpm exec prisma validate

pnpm test

pnpm run test:e2e

pnpm run build

pnpm run lint

```



Then:



```powershell

git add .

git commit -m "describe the change"

git push origin main

```