-- CreateIndex: Partial unique index to enforce at most one active handover per emergency case
CREATE UNIQUE INDEX "Handover_active_case_unique" ON "Handover"("caseId") WHERE "status" IN ('PENDING', 'IN_PROGRESS');
