-- Link a lesson to the skill it teaches.
--
-- Lessons hang off modules and the garden is built from skills, with nothing
-- joining them: finishing "Letter A" never advanced the matching skill, so its
-- flower stayed a seed and the subject patch disagreed with the journey.
--
-- Nullable on purpose - existing lessons have no mapping yet, and a lesson
-- without one simply does not move a flower. Backfill with
-- `npx tsx prisma/link-lessons-to-skills.ts`.
ALTER TABLE "lessons" ADD COLUMN "skill_id" TEXT;

ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_skill_id_fkey"
  FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
