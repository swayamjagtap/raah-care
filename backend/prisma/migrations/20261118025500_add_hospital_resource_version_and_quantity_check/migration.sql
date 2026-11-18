-- AlterTable
ALTER TABLE "HospitalResource" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- AddCheckConstraint
ALTER TABLE "HospitalResource" ADD CONSTRAINT "HospitalResource_quantity_check"
CHECK ("availableQuantity" >= 0 AND "quantity" >= 0 AND "availableQuantity" <= "quantity");
