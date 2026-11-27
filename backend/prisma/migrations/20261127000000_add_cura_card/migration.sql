-- M9.5: Add Cura Card identity, tokens, and audit log
-- Additive migration: nullable cardId on Patient + CuraCardToken table + CuraCardAudit table

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "cardId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_cardId_key" ON "Patient"("cardId");

DO $$ BEGIN
    CREATE TYPE "CuraCardAccessOutcome" AS ENUM ('SUCCESS', 'EXPIRED', 'REVOKED', 'INVALID', 'UNAUTHORIZED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CuraCardToken" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuraCardToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CuraCardToken_tokenHash_key" ON "CuraCardToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "CuraCardToken_patientId_idx" ON "CuraCardToken"("patientId");
CREATE INDEX IF NOT EXISTS "CuraCardToken_tokenHash_idx" ON "CuraCardToken"("tokenHash");

DO $$ BEGIN
    ALTER TABLE "CuraCardToken" ADD CONSTRAINT "CuraCardToken_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CuraCardAudit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "responderRole" "UserRole" NOT NULL,
    "outcome" "CuraCardAccessOutcome" NOT NULL,
    "caseId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuraCardAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CuraCardAudit_patientId_idx" ON "CuraCardAudit"("patientId");
CREATE INDEX IF NOT EXISTS "CuraCardAudit_responderId_idx" ON "CuraCardAudit"("responderId");
CREATE INDEX IF NOT EXISTS "CuraCardAudit_createdAt_idx" ON "CuraCardAudit"("createdAt");

DO $$ BEGIN
    ALTER TABLE "CuraCardAudit" ADD CONSTRAINT "CuraCardAudit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CuraCardAudit" ADD CONSTRAINT "CuraCardAudit_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
