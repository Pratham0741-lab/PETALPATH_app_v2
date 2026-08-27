-- AlterTable: Add name as nullable first to allow safe backfill
ALTER TABLE "waitlists" ADD COLUMN "name" TEXT;

-- Backfill existing records with 'Unknown' placeholder
UPDATE "waitlists" SET "name" = 'Unknown' WHERE "name" IS NULL;

-- AlterTable: Set name as NOT NULL
ALTER TABLE "waitlists" ALTER COLUMN "name" SET NOT NULL;
