-- Add columns required by the adaptive-planning V2 domain model
-- (SessionPlan.roadmapId, SessionBlock.isReinforcement, SessionBlock.metadata)
-- onto the existing V1 session_plans / session_blocks tables.

ALTER TABLE "session_plans" ADD COLUMN "roadmap_id" TEXT;

ALTER TABLE "session_blocks" ADD COLUMN "is_reinforcement" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "session_blocks" ADD COLUMN "metadata" TEXT;
