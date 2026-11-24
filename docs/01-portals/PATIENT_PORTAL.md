# RAAH â€“ Patient Portal

## 1. Purpose

The Patient Portal is the primary interface through which patients or individuals requesting emergency assistance interact with the RAAH emergency-response ecosystem.

It enables patients to raise emergency requests, share their location and essential medical information, monitor ambulance allocation and access relevant hospital information.

The portal connects to the shared RAAH backend, which coordinates emergency cases, ambulance assignments, hospital allocation and emergency lifecycle updates.

## 2. Core Objectives

- Enable patients to request emergency assistance quickly.
- Provide access to essential patient and medical information.
- Share the patient's emergency location with authorised responders.
- Allow patients to monitor the progress of their emergency request.
- Provide ambulance and destination hospital information.
- Support quick patient identification through the Cura Card.

## 3. Functional Requirements

### 3.1 Patient Registration and Authentication

The portal should support:

- Patient registration.
- Secure login and logout.
- Patient identity management.
- Access to the patient's own profile and emergency records.
- Secure session management.

**Backend dependency:** Patient authentication, account management and patient-specific authorisation must be verified and implemented.

### 3.2 Patient Profile

Patients should be able to maintain relevant personal information.

Proposed information includes:

- Full name.
- Date of birth.
- Gender, where required.
- Contact number.
- Emergency contact details.
- Blood group, if known.
- Relevant allergies.
- Existing medical conditions.
- Important medical notes.

Sensitive medical information must only be accessible to authorised users for legitimate emergency-response purposes.

### 3.3 Emergency SOS

The SOS feature is the central function of the Patient Portal.

Expected workflow:

1. Patient initiates an emergency request.
2. Portal captures or requests the patient's current location.
3. Patient provides relevant emergency information, where possible.
4. Emergency request is submitted to the backend.
5. Backend creates an emergency case.
6. The patient receives confirmation and an emergency reference.
7. The emergency progresses through the dispatch and response lifecycle.

The interface should prioritise speed and minimise the number of steps required to raise an SOS.

**Existing backend foundation:** `POST /emergencies`.

The exact request payload, authentication requirements and response contract must follow the implemented backend DTOs.

### 3.4 Location Sharing

The portal should support:

- Capturing the patient's current geographical coordinates.
- Displaying the detected location.
- Allowing location correction where necessary.
- Associating location information with the emergency request.
- Updating location when the emergency workflow requires it.

Location accuracy and permission failures should be handled gracefully.

**Backend dependency:** Continuous GPS updates and live location synchronisation require additional verified backend support.

### 3.5 Emergency Tracking

Patients should be able to view the current status of their emergency.

Expected information:

- Emergency reference number.
- Current emergency status.
- Request submission confirmation.
- Ambulance assignment information.
- Ambulance arrival and journey progress.
- Destination hospital, once selected.
- Important emergency updates.

**Existing backend foundation:**

- `GET /emergencies/:id`
- Emergency lifecycle and case-event records.

Patient-specific access restrictions must be enforced.

### 3.6 Ambulance Information

Once an ambulance is assigned, the patient should be able to view relevant information such as:

- Ambulance identification.
- Assigned driver information, where permitted.
- Assignment status.
- Estimated arrival information, when supported.
- Ambulance location, when live tracking is implemented.

The portal must not display unverified arrival estimates or stale GPS information as real-time data.

### 3.7 Hospital Information

After a destination hospital has been selected, the patient should be able to view:

- Hospital name.
- Hospital address.
- Relevant contact information.
- Destination details.
- Emergency journey status.

Hospital recommendation and destination selection depend on the Allocation module and its implementation.

### 3.8 Cura Card

The Cura Card is RAAH's proposed patient identification card.

Its purpose is to provide quick access to essential patient identification and emergency information.

Proposed information:

- Patient name.
- Cura Card identification number.
- Emergency contact details.
- Blood group, if available.
- Critical allergies.
- Essential medical information.
- A QR code or other supported identification mechanism.

The Cura Card should help authorised emergency responders identify a patient quickly.

It must not expose unrestricted medical records through a publicly accessible QR code.

### 3.9 Emergency History

Patients should eventually be able to view their previous emergency requests.

Potential information:

- Emergency reference.
- Date and time.
- Emergency type.
- Emergency outcome.
- Associated hospital.
- Case completion status.

This functionality depends on patient-specific emergency history APIs.

## 4. Main Portal Sections

| Section | Purpose |
| --- | --- |
| Patient Dashboard | Overview of patient information and active emergencies |
| SOS / Emergency | Initiate an emergency request |
| My Profile | Manage personal information |
| Cura Card | View patient identification and emergency details |
| Emergency Tracking | Monitor active emergency progress |
| Ambulance Details | View assigned ambulance information |
| Hospital Details | View selected destination hospital |
| Emergency History | Review previous emergency cases |
| Settings | Manage account preferences and security |

## 5. Backend Integration

| Feature | Existing backend support | Status |
| --- | --- | --- |
| Create emergency | `POST /emergencies` | Foundation exists |
| Retrieve emergency | `GET /emergencies/:id` | Foundation exists |
| Emergency status | `PATCH /emergencies/:id/status` | Existing API; patient authorisation to verify |
| Patient registration | Not verified | Backend verification required |
| Patient authentication | Not verified | Backend verification required |
| Patient profile management | Not verified | Backend verification required |
| Location updates | Not verified | Backend development required |
| Live ambulance tracking | Not verified | Backend development required |
| Hospital recommendations | Allocation implementation pending | Backend development required |
| Cura Card data access | Not verified | Backend development required |
| Patient emergency history | Patient-specific filtering not verified | Backend verification required |

## 6. MVP Classification

### MVP

- Patient registration and secure authentication.
- Patient profile and essential emergency details.
- SOS emergency request.
- Emergency location capture.
- Emergency request confirmation.
- Emergency status tracking.
- Assigned ambulance information.
- Selected hospital information.
- Basic Cura Card identification.

### Post-MVP

- Advanced live ambulance tracking.
- Complete emergency history.
- Expanded medical profile management.
- Advanced notification preferences.
- Additional Cura Card functionality.
- Integration with external medical systems.

### Future Scope

- Integration with external healthcare providers.
- Advanced patient analytics.
- Long-term medical record management.
- Additional digital health services.

## 7. Security and Privacy Requirements

- Patients must only access their own records.
- Medical information must be protected against unauthorised access.
- Emergency information must only be shared with authorised responders.
- Authentication and authorisation must be enforced by the backend.
- Public Cura Card access must be restricted to approved emergency identification information.
- Sensitive information must not be unnecessarily exposed in API responses or application logs.

## 8. Dependencies

The Patient Portal depends on:

- Patient authentication and identity management.
- Emergency management APIs.
- Patient profile APIs.
- Location management.
- Ambulance assignment information.
- Allocation and hospital destination selection.
- Emergency lifecycle management.
- Notification and real-time communication infrastructure.

## 9. Implementation Notes

The Patient Portal must integrate with the shared RAAH backend rather than maintain independent emergency records.

Emergency status, ambulance assignment and hospital destination must be retrieved from authoritative backend records.

Frontend developers must verify the actual API contracts before implementing integrations.

Planned backend capabilities must not be treated as implemented functionality.

---

**Document Status:** Requirements documentation
**Scope:** Patient Portal
**Project:** RAAH
**Source:** Patient Portal functional blueprint and consolidated project requirements
