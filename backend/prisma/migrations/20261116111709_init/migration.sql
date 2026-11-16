-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'CAREGIVER', 'PARAMEDIC', 'AMBULANCE_DRIVER', 'DISPATCHER', 'DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('CREATED', 'DISPATCHING', 'AMBULANCE_ASSIGNED', 'AMBULANCE_EN_ROUTE', 'ARRIVED_AT_SCENE', 'PATIENT_ONBOARD', 'HOSPITAL_SELECTED', 'HOSPITAL_NOTIFIED', 'EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL', 'HANDOVER_IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AmbulanceType" AS ENUM ('BLS', 'ALS', 'PATIENT_TRANSPORT', 'NEONATAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AmbulanceStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'AT_SCENE', 'PATIENT_ONBOARD', 'TRANSPORTING', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "HospitalStatus" AS ENUM ('OPERATIONAL', 'BUSY', 'DIVERTING', 'CLOSED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ICU', 'EMERGENCY_BEDS', 'OXYGEN', 'VENTILATORS', 'BLOOD_BANK', 'CT_SCAN', 'MRI', 'CARDIAC_CARE', 'TRAUMA_CARE', 'OPERATING_ROOM', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'UNAVAILABLE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'EN_ROUTE', 'ARRIVED_AT_SCENE', 'PATIENT_ONBOARD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('SOS_INITIATED', 'CASE_CREATED', 'AMBULANCE_ASSIGNED', 'AMBULANCE_ACCEPTED', 'AMBULANCE_REJECTED', 'AMBULANCE_EN_ROUTE', 'ARRIVED_AT_SCENE', 'PATIENT_ONBOARD', 'HOSPITAL_SELECTED', 'HOSPITAL_NOTIFIED', 'HOSPITAL_ACCEPTED', 'HOSPITAL_REDIRECTED', 'DESTINATION_CHANGED', 'CONDITION_UPDATED', 'DELAY_REPORTED', 'PATIENT_ARRIVED', 'HANDOVER_STARTED', 'HANDOVER_COMPLETED', 'CASE_COMPLETED', 'CASE_CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT,
    "ambulanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "bloodGroup" TEXT,
    "phoneNumber" TEXT,
    "emergencyContact" TEXT,
    "medicalHistory" TEXT,
    "allergies" TEXT,
    "currentMedication" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "priority" "CasePriority" NOT NULL DEFAULT 'HIGH',
    "status" "CaseStatus" NOT NULL DEFAULT 'CREATED',
    "incidentLatitude" DOUBLE PRECISION NOT NULL,
    "incidentLongitude" DOUBLE PRECISION NOT NULL,
    "incidentAddress" TEXT NOT NULL,
    "symptoms" TEXT,
    "notes" TEXT,
    "currentCondition" TEXT,
    "patientId" TEXT,
    "initiatorId" TEXT,
    "destinationHospitalId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ambulance" (
    "id" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "callSign" TEXT NOT NULL,
    "type" "AmbulanceType" NOT NULL DEFAULT 'BLS',
    "status" "AmbulanceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ambulance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "emergencyCapability" TEXT,
    "status" "HospitalStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalResource" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "dispatcherId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "arrivedAtSceneAt" TIMESTAMP(3),
    "patientOnboardAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "paramedicId" TEXT,
    "receivingDoctorId" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'PENDING',
    "clinicalSummary" TEXT,
    "patientCondition" TEXT,
    "vitals" JSONB,
    "notes" TEXT,
    "handoverStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handoverCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" "CaseEventType" NOT NULL,
    "actorId" TEXT,
    "payload" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_hospitalId_idx" ON "User"("hospitalId");

-- CreateIndex
CREATE INDEX "User_ambulanceId_idx" ON "User"("ambulanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE INDEX "Patient_phoneNumber_idx" ON "Patient"("phoneNumber");

-- CreateIndex
CREATE INDEX "Patient_fullName_idx" ON "Patient"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyCase_caseNumber_key" ON "EmergencyCase"("caseNumber");

-- CreateIndex
CREATE INDEX "EmergencyCase_status_idx" ON "EmergencyCase"("status");

-- CreateIndex
CREATE INDEX "EmergencyCase_priority_idx" ON "EmergencyCase"("priority");

-- CreateIndex
CREATE INDEX "EmergencyCase_createdAt_idx" ON "EmergencyCase"("createdAt");

-- CreateIndex
CREATE INDEX "EmergencyCase_patientId_idx" ON "EmergencyCase"("patientId");

-- CreateIndex
CREATE INDEX "EmergencyCase_initiatorId_idx" ON "EmergencyCase"("initiatorId");

-- CreateIndex
CREATE INDEX "EmergencyCase_destinationHospitalId_idx" ON "EmergencyCase"("destinationHospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "Ambulance_registrationNumber_key" ON "Ambulance"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Ambulance_callSign_key" ON "Ambulance"("callSign");

-- CreateIndex
CREATE INDEX "Ambulance_status_idx" ON "Ambulance"("status");

-- CreateIndex
CREATE INDEX "Ambulance_isAvailable_idx" ON "Ambulance"("isAvailable");

-- CreateIndex
CREATE INDEX "Ambulance_type_idx" ON "Ambulance"("type");

-- CreateIndex
CREATE INDEX "Ambulance_hospitalId_idx" ON "Ambulance"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_code_key" ON "Hospital"("code");

-- CreateIndex
CREATE INDEX "Hospital_status_idx" ON "Hospital"("status");

-- CreateIndex
CREATE INDEX "Hospital_code_idx" ON "Hospital"("code");

-- CreateIndex
CREATE INDEX "HospitalResource_hospitalId_idx" ON "HospitalResource"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalResource_type_idx" ON "HospitalResource"("type");

-- CreateIndex
CREATE INDEX "HospitalResource_status_idx" ON "HospitalResource"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalResource_hospitalId_type_key" ON "HospitalResource"("hospitalId", "type");

-- CreateIndex
CREATE INDEX "Assignment_caseId_idx" ON "Assignment"("caseId");

-- CreateIndex
CREATE INDEX "Assignment_ambulanceId_idx" ON "Assignment"("ambulanceId");

-- CreateIndex
CREATE INDEX "Assignment_dispatcherId_idx" ON "Assignment"("dispatcherId");

-- CreateIndex
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");

-- CreateIndex
CREATE INDEX "Assignment_assignedAt_idx" ON "Assignment"("assignedAt");

-- CreateIndex
CREATE INDEX "Handover_caseId_idx" ON "Handover"("caseId");

-- CreateIndex
CREATE INDEX "Handover_ambulanceId_idx" ON "Handover"("ambulanceId");

-- CreateIndex
CREATE INDEX "Handover_hospitalId_idx" ON "Handover"("hospitalId");

-- CreateIndex
CREATE INDEX "Handover_paramedicId_idx" ON "Handover"("paramedicId");

-- CreateIndex
CREATE INDEX "Handover_receivingDoctorId_idx" ON "Handover"("receivingDoctorId");

-- CreateIndex
CREATE INDEX "Handover_status_idx" ON "Handover"("status");

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_createdAt_idx" ON "CaseEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseEvent_eventType_idx" ON "CaseEvent"("eventType");

-- CreateIndex
CREATE INDEX "CaseEvent_actorId_idx" ON "CaseEvent"("actorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyCase" ADD CONSTRAINT "EmergencyCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyCase" ADD CONSTRAINT "EmergencyCase_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyCase" ADD CONSTRAINT "EmergencyCase_destinationHospitalId_fkey" FOREIGN KEY ("destinationHospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ambulance" ADD CONSTRAINT "Ambulance_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalResource" ADD CONSTRAINT "HospitalResource_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "EmergencyCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "EmergencyCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_paramedicId_fkey" FOREIGN KEY ("paramedicId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_receivingDoctorId_fkey" FOREIGN KEY ("receivingDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "EmergencyCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
