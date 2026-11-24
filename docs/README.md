# RAAH – Project Documentation

Welcome to the official documentation repository for RAAH.

RAAH is a unified emergency response ecosystem designed to connect patients, ambulance services, hospitals and emergency administrators through a shared backend system.

This documentation describes the project scope, architecture, portal requirements, backend APIs, database structure, operational workflows and development practices.

---

## 1. Documentation Structure

The documentation is organised into five sections.

### 00 – Project

Contains the overall project definition, scope and architecture.

| Document | Description |
|---|---|
| [Project Overview](00-project/PROJECT_OVERVIEW.md) | Introduction, objectives and overall system vision |
| [MVP Scope](00-project/MVP_SCOPE.md) | Minimum viable product features and boundaries |
| [System Architecture](00-project/SYSTEM_ARCHITECTURE.md) | Overall system design and component relationships |

### 01 – Portals

Describes the functional requirements of each user-facing portal.

| Document | Description |
|---|---|
| [Patient Portal](01-portals/PATIENT_PORTAL.md) | Patient emergency requests and patient-facing functionality |
| [Ambulance Portal](01-portals/AMBULANCE_PORTAL.md) | Driver operations and assignment management |
| [Hospital Portal](01-portals/HOSPITAL_PORTAL.md) | Hospital operations and resource management |
| [Admin Portal](01-portals/ADMIN_PORTAL.md) | Emergency monitoring and dispatch coordination |

### 02 – Backend

Documents backend APIs, database structure and integration contracts.

| Document | Description |
|---|---|
| [API Endpoints](02-backend/API_ENDPOINTS.md) | Backend endpoint reference |
| [API Integration Map](02-backend/API_INTEGRATION_MAP.md) | Relationships between portals and backend APIs |
| [Database Schema](02-backend/DATABASE_SCHEMA.md) | Database entities and relationships |
| [Status Mapping](02-backend/STATUS_MAPPING.md) | Emergency, assignment and resource statuses |

### 03 – Workflows

Describes the operational processes followed throughout an emergency.

| Document | Description |
|---|---|
| [Emergency Lifecycle](03-workflows/EMERGENCY_LIFECYCLE.md) | End-to-end emergency lifecycle |
| [Ambulance Workflow](03-workflows/AMBULANCE_WORKFLOW.md) | Ambulance assignment and response process |
| [Hospital Workflow](03-workflows/HOSPITAL_WORKFLOW.md) | Hospital coordination and reception |
| [Patient Handover](03-workflows/PATIENT_HANDOVER.md) | Patient transfer and handover process |

### 04 – Project Management

Contains development tracking, team collaboration and project decisions.

| Document | Description |
|---|---|
| [Milestones](04-project-management/MILESTONES.md) | Development milestones and stages |
| [Task Tracker](04-project-management/TASK_TRACKER.md) | Task status and pending work |
| [Team Assignments](04-project-management/TEAM_ASSIGNMENTS.md) | Team responsibility structure |
| [Decisions](04-project-management/DECISIONS.md) | Architectural decisions and open questions |
| [Contributing Guidelines](04-project-management/CONTRIBUTING.md) | Git workflow and contribution practices |
| [Changelog](04-project-management/CHANGELOG.md) | Record of significant project changes |

---

## 2. Recommended Reading Order

For someone new to RAAH, the recommended reading sequence is:

1. Project Overview
2. MVP Scope
3. System Architecture
4. Portal Documentation
5. Backend API and Database Documentation
6. Operational Workflows
7. Project Management Documentation

Developers should understand the relevant portal requirements, backend contracts and workflows before implementing dependent functionality.

---

## 3. Documentation Principles

1. Documentation should reflect the actual project direction.
2. Planned features must not be presented as completed implementation.
3. API documentation should remain consistent with backend code.
4. Database documentation should reflect the actual data models.
5. Changes to workflows and status definitions should be documented.
6. Important architectural decisions should be recorded in DECISIONS.md.
7. Significant project changes should be recorded in CHANGELOG.md.

---

## 4. Documentation Maintenance

Update the relevant documentation whenever a significant project change affects:

- Product scope or requirements.
- System architecture.
- Portal functionality.
- API contracts.
- Database models.
- Emergency or assignment workflows.
- Team responsibilities.
- Development milestones.

Documentation changes should be reviewed alongside the corresponding implementation changes.

---

## 5. Important Note

This documentation is a project reference and development guide.

A feature described in a requirements document or proposed workflow is not automatically evidence that the feature has been implemented.

Implementation status must be verified against the actual source code, tests and integration behaviour.

---

**Project:** RAAH
**Documentation:** Central Project Reference
**Maintenance:** RAAH Development Team
