-- The previous composite-unique migration (20260714130000) used
-- `DROP CONSTRAINT` to remove the single-column unique on event_id. That
-- constraint was originally created as a UNIQUE INDEX, so DROP CONSTRAINT is a
-- no-op and the single-column index remained, still blocking multiple
-- evidence types per event.
--
-- This migration drops that leftover unique index (if present) and ensures the
-- composite unique on (event_id, evidence_type) exists. It is idempotent so it
-- is safe to run whether or not the previous migration took effect.

DROP INDEX IF EXISTS "learning_evidence_event_id_key";

ALTER TABLE "learning_evidence" DROP CONSTRAINT IF EXISTS "learning_evidence_event_id_evidence_type_key";
ALTER TABLE "learning_evidence" ADD CONSTRAINT "learning_evidence_event_id_evidence_type_key" UNIQUE ("event_id", "evidence_type");
