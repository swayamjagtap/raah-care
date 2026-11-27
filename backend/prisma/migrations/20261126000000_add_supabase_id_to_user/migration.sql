-- M8.1: Add supabaseId column to User for Supabase Auth identity mapping
-- Additive migration: nullable TEXT column + unique index; no data deleted, no existing columns altered.

ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");
