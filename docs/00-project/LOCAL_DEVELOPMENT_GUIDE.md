# RAAH-CARE — Local Development & Setup Guide

**Guide Version:** 2.0  
**Target Platform:** Windows, macOS, Linux  
**Last Updated:** 28 November 2026  

---

## 1. Prerequisites

Before setting up the repository, verify the following dependencies:

| Software | Required Version | Verification Command |
|---|---|---|
| **Node.js** | `>= 20.x` LTS (tested on `24.x`) | `node --version` |
| **pnpm** | `>= 9.x` (tested on `12.x`) | `pnpm --version` |
| **Git** | `>= 2.40.x` | `git --version` |
| **PostgreSQL** | `>= 15.x` | Available locally or via Supabase |

---

## 2. Step-by-Step Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/swayamjagtap/raah-care.git
cd raah-care
```

### Step 2: Install Monorepo Dependencies
```bash
pnpm install
```

### Step 3: Configure Environment Variables

The repository provides `.env.example` templates in every application.

#### 1. Backend Configuration (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=3000
NODE_ENV=development

# PostgreSQL Connection Strings
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase Auth Configuration
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"

# Frontend Integration & CORS
FRONTEND_URL="http://localhost:5173"
CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"
```

#### 2. Frontend Portals Configuration (`apps/*/.env`)
Create `.env` in each portal directory (`apps/patient-web`, `apps/ambulance-web`, `apps/hospital-web`, `apps/admin-web`):
```env
VITE_API_BASE_URL="http://localhost:3000/api/v1"
VITE_WS_URL="ws://localhost:3000"
VITE_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

---

## 3. Database Migration & Prisma Generation

### Step 1: Generate Prisma Client
Generates the typed Prisma Client into `backend/generated/prisma`:
```bash
pnpm --filter backend exec prisma generate
```

### Step 2: Apply Migrations
Deploys tracked migrations to your database:
```bash
pnpm --filter backend exec prisma migrate deploy
```

### Step 3: (Optional) Seed Emergency Network Data
Seeds demo hospitals, ambulances, and emergency departments:
```bash
pnpm --filter backend seed
```

---

## 4. Verification & Testing

Verify that your local clone passes all monorepo checks:

```bash
# Run the entire test suite (438 automated tests across backend and 4 frontend apps)
pnpm test

# Verify production builds across backend and all four frontend portals
pnpm build
```

---

## 5. Development Startup

Start the backend and portals concurrently or in separate terminal sessions:

```bash
# Terminal 1: Backend API (Port 3000)
pnpm dev:backend

# Terminal 2: Patient Portal (Port 5173)
pnpm dev:patient

# Terminal 3: Ambulance Portal (Port 5174)
pnpm dev:ambulance

# Terminal 4: Hospital Portal (Port 5175)
pnpm dev:hospital

# Terminal 5: Admin / Dispatch Portal (Port 5176)
pnpm dev:admin
```

---

## 6. Common Troubleshooting

### 1. `Cannot find module '../generated/prisma'`
- **Cause**: Prisma client has not been generated for the current platform.
- **Fix**: Run `pnpm --filter backend exec prisma generate`.

### 2. Camera scanner displays "Permission Denied"
- **Cause**: Browsers restrict `navigator.mediaDevices.getUserMedia` on non-HTTPS origins (except `localhost`).
- **Fix**: When testing across mobile devices over local Wi-Fi, run the portal behind a local HTTPS tunnel (e.g., `cloudflared tunnel` or `ngrok`).

### 3. Backend Dev Process Crashes on Startup
- **Cause**: Nest CLI entryFile mismatch.
- **Fix**: Ensure `backend/nest-cli.json` specifies `"entryFile": "src/main"`.
