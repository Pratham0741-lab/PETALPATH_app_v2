-- Allow multiple evidence records per learning event (one per evidence type).
-- Replaces the single-column unique on event_id with a composite
-- unique on (event_id, evidence_type).

ALTER TABLE "learning_evidence" DROP CONSTRAINT IF EXISTS "learning_evidence_event_id_key";

ALTER TABLE "learning_evidence" ADD CONSTRAINT "learning_evidence_event_id_evidence_type_key" UNIQUE ("event_id", "evidence_type");
