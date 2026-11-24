# RAAH â€” Minimum Viable Product (MVP) Scope

**Document Status:** Draft for Team Approval
**Version:** 1.0
**Project:** RAAH
**Last Updated:** 24 November 2026

---

## 1. Purpose

This document defines the proposed Minimum Viable Product (MVP) scope for RAAH.

RAAH is an integrated emergency-response coordination platform connecting patients, ambulance drivers, hospitals and the central Admin / Control Centre through a shared backend.

The MVP focuses on implementing one complete emergency-response journey rather than independently developing every feature of the four portals.

The purpose is to establish a functional, testable and integrated system that demonstrates how an emergency is initiated, coordinated, transported and handed over to a hospital.

This document distinguishes between:

- MVP: Essential functionality required for the first integrated release.
- Post-MVP: Important functionality planned for subsequent development.
- Future: Advanced capabilities intended for later versions.
- Pending Decision: Functionality requiring further team approval.

**Important:** Inclusion in the MVP does not mean a feature has already been implemented. Implementation status must be verified against the actual repository.

## 2. Core MVP Objective

The primary objective is to demonstrate the following complete workflow:

1. A patient raises an emergency request through the Patient Portal.
2. The backend creates and manages the emergency case.
3. RESQNET evaluates suitable ambulance candidates.
4. An ambulance is assigned and the driver receives the dispatch.
5. A suitable hospital is identified and selected.
6. The ambulance transports the patient to the designated hospital.
7. Hospital staff receive the emergency and prepare for arrival.
8. The hospital and ambulance driver complete patient handover.
9. The emergency is marked completed.
10. The Admin / Control Centre monitors and coordinates the entire process.

The backend remains the single source of truth throughout this workflow.

## 3. MVP Scope by Portal

### 3.1 Patient Portal

**Objective:** Allow patients to request emergency assistance and monitor the response.

| Feature | Priority | Description |
|---|---|---|
| Patient registration and login | MVP | Secure patient account access |
| Patient profile | MVP | Basic personal and contact information |
| Emergency medical information | MVP | Essential emergency details such as blood group, allergies and conditions |
| Emergency dashboard | MVP | View current emergency and relevant information |
| SOS request | MVP | Create an emergency request |
| Location sharing | MVP | Share GPS coordinates or manually confirmed location |
| Emergency category | MVP | Select the emergency type |
| Emergency status tracking | MVP | View backend-confirmed emergency progress |
| Ambulance information | MVP | View assigned ambulance and driver information |
| Ambulance location tracking | MVP dependency | Display location when location updates are supported |
| Hospital information | MVP | Display the designated hospital and relevant details |
| Cura Card | MVP, subject to final security design | Display a secure patient identification QR code |
| Emergency history | Post-MVP | View previous emergency requests |
| Emergency contact management | Post-MVP | Manage family and emergency contacts |
| Medical document uploads | Post-MVP | Upload and manage supporting medical documents |
| Advanced medical records | Future | Comprehensive medical record management |
| Family accounts | Future | Manage dependent and family profiles |
| Appointments and reminders | Future | Non-emergency healthcare functionality |

**MVP acceptance criteria:**

- A registered patient can submit an emergency request.
- The backend stores the request and returns its identifier.
- The patient's location is associated with the request where available.
- The patient can retrieve the status of their own emergency.
- The patient can see relevant ambulance and hospital information when assigned.
- Sensitive patient information is not exposed through an unsecured QR code.

### 3.2 Ambulance Driver Portal

**Objective:** Allow authorised drivers to receive dispatches, update mission progress and coordinate patient transport.

| Feature | Priority | Description |
|---|---|---|
| Driver authentication | MVP | Secure driver access |
| Driver profile | MVP | Display driver information |
| Assigned ambulance selection | MVP | Select an ambulance associated with the driver |
| Availability management | MVP | Update operational availability |
| Dispatch notification | MVP | Receive an assigned emergency |
| Assignment acceptance | MVP | Accept an assigned mission |
| Assignment rejection | MVP | Reject with a recorded reason |
| Emergency information | MVP | View authorised emergency details |
| Mission status updates | MVP | Update operational progress |
| GPS location sharing | MVP dependency | Send ambulance location to backend |
| Navigation | MVP | Navigate to pickup and designated hospital |
| Hospital destination | MVP | View the hospital selected by the system |
| Patient arrival confirmation | MVP | Record pickup and arrival events |
| Patient handover | MVP | Participate in handover confirmation |
| Mission history | Post-MVP | View completed missions |
| Performance analytics | Future | Detailed driver and ambulance analytics |
| Vehicle maintenance | Post-MVP | Maintenance and service tracking |
| Fuel management | Future | Fuel consumption and reporting |
| Offline mission support | Future | Continue selected operations during connectivity loss |

**MVP acceptance criteria:**

- Only authorised drivers can access their accounts.
- A driver can view missions assigned to them.
- A driver can accept or reject an assignment.
- Rejection requires a reason.
- Mission status updates are validated by the backend.
- Location updates are associated with the correct ambulance and mission.
- The driver cannot independently select an arbitrary destination hospital.
- Handover must follow the agreed confirmation process.

### 3.3 Hospital Staff Portal

**Objective:** Allow hospital personnel to monitor incoming emergencies, communicate readiness and complete patient handover.

| Feature | Priority | Description |
|---|---|---|
| Hospital staff authentication | MVP | Secure authorised access |
| Hospital dashboard | MVP | Display hospital operations and incoming cases |
| Hospital profile | MVP | Display hospital information |
| Operational status | MVP | Update hospital operational availability |
| Resource availability | MVP | Manage essential emergency resource availability |
| Incoming emergencies | MVP | View relevant allocated emergencies |
| Emergency details | MVP | Access authorised emergency information |
| Hospital acknowledgement | MVP | Acknowledge an incoming emergency |
| Readiness response | MVP | Confirm readiness or report inability to accommodate |
| Ambulance visibility | MVP | View relevant ambulance information |
| Ambulance arrival | MVP | Record arrival at hospital |
| Patient handover | MVP | Confirm receipt of patient |
| Staff invitations | Post-MVP | Invite hospital employees |
| Detailed role management | Post-MVP | Manage specialised hospital permissions |
| Individual bed management | Post-MVP | Manage individual beds and occupancy |
| Doctor management | Post-MVP | Manage doctors and availability |
| Department management | Post-MVP | Manage departments and specialisations |
| Surgery and OT scheduling | Future | Manage theatre schedules and readiness |
| Detailed inventory | Post-MVP | Track medical inventory |
| Advanced analytics | Future | Detailed hospital performance reporting |
| HMS integration | Future | Connect external Hospital Management Systems |

**MVP acceptance criteria:**

- Authorised hospital staff can access their hospital's information.
- Hospitals can update operational status and essential resources.
- Hospitals can view emergencies allocated to them.
- Hospitals can acknowledge and respond to incoming emergencies.
- Hospitals can report inability to accommodate a case.
- Hospital staff can confirm ambulance arrival.
- Hospital staff can participate in the patient handover process.
- Access to patient information is authorised, limited and auditable.

### 3.4 Admin / Control Centre Portal

**Objective:** Provide central operational visibility and control over emergency-response activities.

| Feature | Priority | Description |
|---|---|---|
| Admin authentication | MVP | Secure Admin access |
| Admin dashboard | MVP | System-wide operational overview |
| Emergency Control Centre | MVP | Monitor active emergency cases |
| Emergency details | MVP | View relevant case information |
| Ambulance management | MVP | Register and manage ambulances |
| Driver management | MVP | Manage driver accounts and assignments |
| Hospital management | MVP | Register and manage hospitals |
| Hospital availability | MVP | Monitor operational status and resources |
| Ambulance availability | MVP | Monitor ambulance availability |
| Ambulance recommendations | MVP | View ranked ambulance candidates |
| Ambulance assignment | MVP | Assign suitable ambulances |
| Hospital recommendations | MVP | View suitable hospital candidates |
| Hospital selection | MVP | Select or confirm destination hospital |
| Manual intervention | MVP | Handle allocation exceptions |
| Mission monitoring | MVP | Monitor assignment progress |
| Emergency map | MVP | Visualise relevant operational locations |
| Hospital coordination | MVP | Coordinate with hospitals |
| Emergency history | Post-MVP | Detailed historical records |
| Advanced analytics | Post-MVP | Response time and performance analysis |
| Report exports | Post-MVP | Export operational reports |
| Advanced resource allocation | Future | Predictive system-wide resource management |
| Multiple Admin roles | Future | Advanced administrative role hierarchy |

**MVP acceptance criteria:**

- The Admin can view active emergency cases.
- The Admin can view registered ambulances and hospitals.
- The Admin can inspect candidate recommendations.
- The Admin can perform authorised ambulance assignments.
- The Admin can select a suitable hospital.
- The Admin can monitor mission progress.
- The Admin can intervene when automated coordination cannot proceed.
- Important operational actions are recorded.

## 4. Shared Backend Requirements

The following capabilities are essential across the four portals.

| Capability | MVP requirement |
|---|---|
| Authentication | Secure identity verification |
| Authorisation | Role- and resource-based access |
| Emergency management | Central emergency records and lifecycle |
| Assignment management | Central ambulance assignment lifecycle |
| Allocation | Candidate evaluation and recommendation |
| Hospital selection | Validated destination selection |
| Resource management | Hospital resource availability |
| Location management | Ambulance and emergency location updates |
| Status management | Validated status transitions |
| Case events | Traceable emergency activity |
| Patient data protection | Authorised access to medical information |
| Handover | Driver and hospital confirmation |
| Data consistency | Transactional and concurrency safeguards |
| API validation | DTO and input validation |
| Error handling | Consistent failure responses |
| Auditability | Traceable sensitive and operational actions |

Real-time communication is desirable for the integrated MVP. Where it is not yet implemented, a controlled polling mechanism may be used temporarily, provided freshness and failure states are communicated accurately.

## 5. Explicitly Excluded from Initial MVP

The following complete feature sets are excluded from the initial release unless the team approves a narrower essential subset:

- Full Hospital Management System integration.
- Predictive ambulance and hospital allocation.
- Machine-learning-based emergency prioritisation.
- Traffic-aware predictive routing.
- Advanced hospital readiness scoring.
- Detailed doctor scheduling and shift optimisation.
- Automated individual bed reservation.
- Comprehensive medicine inventory and expiry management.
- Advanced analytics dashboards and report exports.
- Native Android and iOS applications.
- Advanced offline mission functionality.
- Full patient appointment management.

Excluding these features from the MVP does not mean they are permanently abandoned.

## 6. Dependencies and Implementation Considerations

### 6.1 Authentication and Authorisation

Each portal requires appropriate authentication and permissions.

A frontend login screen alone does not provide secure access control. The backend must enforce identity, role, ownership and resource-level permissions.

### 6.2 Allocation and Assignment

Allocation and Assignment must remain separate responsibilities.

- Allocation evaluates and recommends candidates.
- Assignment validates and performs the actual ambulance assignment.
- Hospital selection must be validated against the emergency and hospital state.

### 6.3 Hospital Readiness

An allocation is not a permanent guarantee of resource availability.

Hospitals must be able to report a change in availability, allowing the Admin or allocation process to reassess the destination.

### 6.4 Patient Information

Patient medical information must be protected.

The Cura Card must not expose sensitive medical information through a publicly readable QR payload. Access should use a secure identifier and backend authorisation.

Emergency access must be governed by applicable clinical and privacy rules and recorded through audit mechanisms.

### 6.5 Handover

Emergency completion must not be treated as equivalent to ambulance arrival.

The system must record the handover process and the required confirmations from the driver and hospital.

## 7. MVP Completion Criteria

The MVP can be considered ready for integrated demonstration when:

1. All four portals can communicate with the shared backend through verified API contracts.
2. A patient can create an emergency request.
3. The emergency can be processed through the allocation and assignment workflow.
4. An authorised ambulance driver can receive and execute the mission.
5. A destination hospital can be selected and notified.
6. Hospital staff can acknowledge and prepare for arrival.
7. Ambulance and hospital staff can complete the handover process.
8. The emergency can be completed using validated backend transitions.
9. Admin can monitor the entire emergency lifecycle.
10. Access controls prevent unauthorised access to emergency and medical information.
11. Automated tests cover critical operational workflows.
12. All four portals display consistent backend-confirmed information.

## 8. Scope Governance

Changes to the approved MVP must be recorded in `DECISIONS.md`.

A feature must not be treated as part of the approved MVP merely because it appears in a portal blueprint or development discussion.

Every feature must have:

- A documented requirement.
- An agreed priority.
- A defined owner or responsible module.
- Identified backend dependencies.
- Acceptance criteria.
- Verification evidence before being marked completed.

## 9. Related Documentation

- `PROJECT_OVERVIEW.md`
- `SYSTEM_ARCHITECTURE.md`
- `../01-portals/PATIENT_PORTAL.md`
- `../01-portals/AMBULANCE_PORTAL.md`
- `../01-portals/HOSPITAL_PORTAL.md`
- `../01-portals/ADMIN_PORTAL.md`
- `../02-backend/API_ENDPOINTS.md`
- `../02-backend/API_INTEGRATION_MAP.md`
- `../04-project-management/DECISIONS.md`
