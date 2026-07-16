-- AlterTable: add nullable skill_code first, backfill, then make required
ALTER TABLE "skills" ADD COLUMN "skill_code" TEXT;

-- Backfill existing rows (dev/test data) with a generated code
UPDATE "skills" SET "skill_code" = 'MIGRATED_' || id WHERE "skill_code" IS NULL;

-- Make NOT NULL
ALTER TABLE "skills" ALTER COLUMN "skill_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "skills_skill_code_key" ON "skills"("skill_code");

-- CreateIndex
CREATE INDEX "skills_skill_code_idx" ON "skills"("skill_code");

-- CreateIndex
CREATE INDEX "skills_subject_id_original_grade_idx" ON "skills"("subject_id", "original_grade");

-- CreateIndex
CREATE INDEX "skills_domain_id_display_order_idx" ON "skills"("domain_id", "display_order");
