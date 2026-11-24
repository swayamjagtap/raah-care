# RAAH + CARE — Project Overview

## 1. Project Introduction

**RAAH + CARE** is a resource-aware emergency care coordination platform designed to connect patients, caregivers, ambulance services, hospitals and emergency dispatchers through a unified digital ecosystem.

The platform aims to improve emergency response by coordinating the journey from the initiation of an emergency request to ambulance dispatch, hospital coordination and patient handover.

Instead of treating patients, ambulances and hospitals as separate systems, RAAH + CARE aims to provide a shared operational environment where relevant information and emergency updates can be coordinated throughout the response lifecycle.

## 2. Problem Statement

Emergency medical response can involve multiple parties operating with limited coordination and fragmented information.

Some of the key challenges the project aims to address are:

- Difficulty coordinating patients, ambulance services and hospitals.
- Delays in identifying and dispatching suitable ambulances.
- Limited visibility into hospital resource availability.
- Delayed communication between ambulance personnel and receiving hospitals.
- Difficulty accessing essential patient information during emergencies.
- Inefficient transfer of patient information during hospital handover.

RAAH + CARE aims to address these challenges through a centralized emergency coordination platform.

## 3. Project Objectives

The primary objectives are:

1. **Unified Connectivity:** Integrate patients, ambulance services and hospitals into a single emergency-response ecosystem.
2. **Faster Emergency Care:** Reduce response delays through real-time coordination, ambulance dispatch and hospital resource visibility.
3. **Patient Identification:** Introduce the Cura Card for quick patient identification and access to essential emergency information.

## 4. Target Users and Portals

The platform is planned around four role-specific portals.

### 4.1 Patient Portal

Designed for patients and, where permitted, caregivers.

The portal is intended to support:

- Patient registration and profile management.
- Access to essential medical information.
- Emergency SOS initiation.
- Sharing emergency location information.
- Viewing emergency response progress.
- Access to relevant ambulance and hospital information.
- Cura Card-related patient identification features.

### 4.2 Ambulance Driver Portal

Designed for ambulance drivers and associated emergency personnel.

The portal is intended to support:

- Ambulance and driver identification.
- Viewing assigned emergency requests.
- Accepting or rejecting assignments.
- Updating ambulance and emergency status.
- Sharing ambulance location.
- Viewing incident and patient information required for the assignment.
- Coordinating patient transport and hospital handover.

### 4.3 Hospital Staff Portal

Designed for authorized hospital personnel.

The portal is intended to support:

- Hospital profile and operational status management.
- Updating available emergency resources.
- Viewing incoming emergency requests.
- Reviewing relevant patient and emergency information.
- Communicating hospital readiness or inability to accommodate a case.
- Coordinating ambulance arrival.
- Confirming patient handover.

### 4.4 Admin / Control Centre Portal

Designed for authorized emergency dispatchers and system administrators.

The portal is intended to support:

- Monitoring emergency cases.
- Viewing ambulance and hospital availability.
- Coordinating ambulance allocation.
- Reviewing hospital recommendations and destination selection.
- Monitoring assignment progress.
- Intervening when emergency coordination requires manual action.

**Note:** These descriptions represent the intended portal responsibilities. Individual features must be classified as MVP, post-MVP or future scope in the corresponding portal specifications.

## 5. Core Emergency Response Journey

The intended end-to-end journey is:

1. A patient, caregiver or authorized person initiates an emergency request.
2. The platform records the emergency and relevant incident information.
3. The control centre coordinates the allocation of a suitable ambulance.
4. The ambulance receives and responds to the assignment.
5. Ambulance personnel reach the incident location and transport the patient.
6. A suitable receiving hospital is identified and coordinated with.
7. The hospital prepares to receive the patient.
8. Ambulance personnel transfer relevant patient information to the receiving hospital.
9. The handover is confirmed and the emergency case is completed.

The exact implementation sequence and responsibility of each portal will be documented in the workflow specifications.

## 6. Cura Card

The **Cura Card** is the proposed physical patient identification card associated with RAAH + CARE.

Its purpose is to help identify a patient during an emergency and provide a convenient way to access essential emergency information through an appropriate, secure identification mechanism.

The final card design, identification mechanism, accessible information and data-protection rules will be defined separately.

The card must not expose sensitive medical information to unauthorized individuals.

## 7. Technology Stack

### Backend

- Framework: NestJS
- Language: TypeScript
- Runtime: Node.js
- API architecture: REST-based backend
- Validation: class-validator and class-transformer

### Database

- Database: PostgreSQL
- Hosting: Supabase
- ORM: Prisma

### Development and Testing

- Package manager: pnpm
- Unit testing: Vitest
- End-to-end testing: Vitest with Supertest
- Linting: Oxlint
- Formatting: Prettier
- Version control: Git and GitHub
- Development environment: Visual Studio Code and Antigravity

### Frontend

The project is planned to have four role-specific frontend portals.

The final frontend frameworks, application structure and integration details must be recorded after reviewing the frontend team's existing implementation and requirements.

## 8. Repository Structure

The repository follows a pnpm monorepo structure.

```text
raah-care/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── allocation/
│   │   ├── ambulances/
│   │   ├── assignments/
│   │   ├── emergencies/
│   │   ├── hospitals/
│   │   └── prisma/
│   └── package.json
├── docs/
│   ├── 00-project/
│   ├── 01-portals/
│   ├── 02-backend/
│   ├── 03-workflows/
│   └── 04-project-management/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

The root README identifies frontend applications and shared packages as planned parts of the repository structure. Their actual directory structure should be updated here when verified.

## 9. Current Implementation Snapshot

This section describes the implementation verified during the documentation work. It must be updated as the repository evolves.

### 9.1 Backend Modules

The backend currently contains the following NestJS modules:

- Emergencies
- Ambulances
- Assignments
- Hospitals
- Allocation
- Prisma

### 9.2 Implemented Backend Foundations

The existing backend includes:

- Emergency case creation, retrieval, listing and status updates.
- Ambulance registration, retrieval, listing and status updates.
- Ambulance assignment creation and retrieval.
- Assignment acceptance and rejection.
- Assignment status updates.
- Hospital profile and resource management APIs.
- Prisma database models for users, patients, emergencies, ambulances, hospitals, resources, assignments, handovers and case events.

### 9.3 Allocation Calculation Engine

The Allocation module contains a substantial standalone calculation engine in `allocation.calculator.ts`.

The existing calculation functionality includes:

- Geographical distance calculation using the Haversine formula.
- Estimated travel-time calculation.
- Ambulance eligibility and capability evaluation.
- Ambulance candidate scoring and ranking.
- Hospital operational-status evaluation.
- Hospital resource availability evaluation.
- Hospital capability evaluation.
- Hospital candidate scoring and ranking.

Dedicated calculator tests are present in `allocation.calculator.spec.ts`. Allocation-related TypeScript types and request DTOs for ambulance recommendations, hospital recommendations and destination selection are also present.

However, the calculation engine is not yet integrated into the NestJS application as an operational API.

The current `AllocationModule` has no registered controllers, providers or exports. No allocation recommendation or destination-selection routes were found in the existing controllers during this verification.

**Implementation status:** Allocation calculation logic and its tests exist; integration into the backend API is pending.

### 9.4 Other Important Implementation Distinctions

The existence of database models for handover and patient information does not, by itself, establish that all corresponding portal workflows are operational.

Similarly, the existence of a backend module does not automatically mean that its functionality is exposed through usable API endpoints.

Implementation status must be established by inspecting the relevant source code, routes, services, validation, access controls and tests.

### 9.5 Known Implementation Gaps to Verify

The following areas require implementation-level review before being marked complete:

- Authentication and role-based access control.
- Patient-facing registration and SOS integration.
- Ambulance driver-facing workflows and live location updates.
- Hospital readiness and emergency acceptance workflows.
- Integration of the existing allocation calculation engine into recommendation APIs.
- Resource-aware hospital recommendation and destination selection.
- Complete digital patient handover.
- Real-time notifications and cross-portal updates.
- Cura Card identification and secure information access.

These are verification items, not assumptions that every feature is necessarily absent.

## 10. Development Principles

The project will follow these principles:

1. **Single source of truth:** The backend will maintain the authoritative emergency and assignment records.
2. **Consistent lifecycle:** All portals must use a shared emergency status model.
3. **Role-based access:** Users should only access information and operations permitted by their roles.
4. **Patient data protection:** Medical and personal information must be protected against unauthorized access.
5. **Modular architecture:** Backend features should be organized into maintainable modules.
6. **API-first integration:** Frontend applications should integrate through documented backend APIs.
7. **Tested implementation:** Important business rules and emergency workflows must be covered by automated tests.
8. **Incremental delivery:** Features should be implemented and integrated in manageable milestones.

## 11. Project Documentation Structure

The `docs/` directory is the central project knowledge base.

It is organized into:

| Directory | Responsibility |
|---|---|
| `00-project/` | Project overview, MVP scope and architecture |
| `01-portals/` | Requirements and functionality of the four portals |
| `02-backend/` | APIs, database schema, integration mapping and statuses |
| `03-workflows/` | Emergency, ambulance, hospital and handover workflows |
| `04-project-management/` | Milestones, tasks, team assignments, decisions and contribution guidelines |

Documentation should distinguish clearly between:

- **Implemented:** Verified in the current codebase.
- **Approved:** Agreed project requirement.
- **Planned:** Intended but not yet implemented.
- **Pending decision:** Requires discussion or approval.
- **Future:** Outside the current MVP scope.

## 12. Project Direction

The long-term direction of RAAH + CARE is to provide a coordinated emergency-response ecosystem in which patients, ambulance services, hospitals and emergency dispatchers can work together through a shared platform.

The immediate development priority is to establish an agreed MVP, map its requirements to the existing backend, identify implementation gaps and progressively deliver an integrated end-to-end emergency response workflow.

---

**Document status:** Initial project overview
**Last verified:** 24 November 2026
**Maintained in:** `docs/00-project/PROJECT_OVERVIEW.md`