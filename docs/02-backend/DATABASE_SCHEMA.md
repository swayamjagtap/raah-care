# RAAH-CARE — Database Schema Reference

**Database Engine:** PostgreSQL 15+ (Hosted on Supabase)  
**ORM:** Prisma 7  
**Schema File:** [backend/prisma/schema.prisma](file:///c:/Users/swaya/OneDrive/Desktop/raah-care/backend/prisma/schema.prisma)  
**Client Output Path:** `backend/generated/prisma`  
**Last Updated:** 28 November 2026  

---

## 1. Core Entity Models

### User
Represents human actors in the RAAH-CARE ecosystem.
```prisma
model User {
  id         String   @id @default(uuid())
  supabaseId String?  @unique // Maps directly to Supabase Auth sub claim UUID
  email      String?  @unique
  phone      String?  @unique
  name       String
  role       UserRole @default(PATIENT)
  isActive   Boolean  @default(true)

  hospitalId String?
  hospital   Hospital? @relation("HospitalStaff", fields: [hospitalId], references: [id], onDelete: SetNull)

  ambulanceId String?
  ambulance   Ambulance? @relation("AmbulanceCrew", fields: [ambulanceId], references: [id], onDelete: SetNull)

  patientProfile Patient?

  initiatedCases        EmergencyCase[] @relation("InitiatedByUser")
  dispatchedAssignments Assignment[]    @relation("DispatcherAssignments")
  paramedicHandovers    Handover[]      @relation("ParamedicHandovers")
  doctorHandovers       Handover[]      @relation("DoctorHandovers")
  caseEvents            CaseEvent[]     @relation("ActorEvents")
  curaCardAudits        CuraCardAudit[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([role])
  @@index([isActive])
  @@index([hospitalId])
  @@index([ambulanceId])
}
```

### Patient
Stores clinical profile data and permanent medical identity.
```prisma
model Patient {
  id     String  @id @default(uuid())
  cardId String? @unique // Permanent stable ID e.g. "RAAH-CR-91D9FBB9"
  userId String? @unique
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  fullName          String
  dateOfBirth       DateTime?
  gender            String?
  bloodGroup        String?
  phoneNumber       String?
  emergencyContact  String?
  medicalHistory    String?
  allergies         String?
  currentMedication String?

  emergencyCases EmergencyCase[]
  curaCardTokens CuraCardToken[]
  curaCardAudits CuraCardAudit[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([phoneNumber])
  @@index([fullName])
  @@index([cardId])
}
```

### CuraCardToken
Stores transient cryptographic tokens for emergency QR resolution.
```prisma
model CuraCardToken {
  id        String    @id @default(uuid())
  patientId String
  patient   Patient   @relation(fields: [patientId], references: [id], onDelete: Cascade)
  tokenHash String    @unique // SHA-256 hash of the 256-bit random token
  expiresAt DateTime
  revokedAt DateTime? // NULL indicates active token; Timestamp indicates revocation
  createdAt DateTime  @default(now())

  @@index([patientId])
  @@index([tokenHash])
}
```
> [!IMPORTANT]
> The database tracks token revocation using `revokedAt TIMESTAMP(3)` (nullable). There is no boolean `revoked` column. Active tokens satisfy `revokedAt IS NULL AND expiresAt > NOW()`.

### CuraCardAudit
Immutable regulatory audit log for emergency medical record access.
```prisma
model CuraCardAudit {
  id            String                @id @default(uuid())
  patientId     String?
  patient       Patient?              @relation(fields: [patientId], references: [id], onDelete: SetNull)
  responderId   String?
  responder     User?                 @relation(fields: [responderId], references: [id], onDelete: SetNull)
  responderRole UserRole
  outcome       CuraCardAccessOutcome
  caseId        String?
  metadata      Json?
  createdAt     DateTime              @default(now())

  @@index([patientId])
  @@index([responderId])
  @@index([outcome])
  @@index([createdAt])
}
```

---

## 2. Enums Reference

```prisma
enum UserRole {
  PATIENT
  PARAMEDIC
  AMBULANCE_DRIVER
  DOCTOR
  HOSPITAL_ADMIN
  DISPATCHER
  SYSTEM_ADMIN
}

enum CuraCardAccessOutcome {
  SUCCESS
  EXPIRED
  REVOKED
  INVALID
  UNAUTHORIZED
}

enum AcuityLevel {
  CRITICAL   // Immediate life threat (RED)
  URGENT     // Serious injury/illness (YELLOW)
  STANDARD   // Non-immediate (GREEN)
  NON_URGENT // Minor / Non-emergency (GREEN/WHITE)
}

enum EmergencyStatus {
  PENDING
  ASSIGNED
  EN_ROUTE_PICKUP
  ON_SCENE
  EN_ROUTE_HOSPITAL
  ARRIVED_HOSPITAL
  COMPLETED
  CANCELLED
}

enum AmbulanceStatus {
  AVAILABLE
  DISPATCHED
  EN_ROUTE
  ON_SCENE
  TRANSPORTING
  AT_HOSPITAL
  MAINTENANCE
  OUT_OF_SERVICE
}

enum HospitalStatus {
  NORMAL
  HIGH_LOAD
  DIVERTING
  SATURATED
}
```
