-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ReinforcementEventType" AS ENUM ('REVIEW_TRIGGERED', 'REVIEW_COMPLETED', 'RETENTION_DROP', 'REINFORCEMENT_SUCCESS', 'REINFORCEMENT_FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: ReinforcementQueue - add new columns (idempotent)
ALTER TABLE "reinforcement_queue"
ADD COLUMN IF NOT EXISTS "is_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "mastery_state" "MasteryState" NOT NULL DEFAULT 'LEARNING',
ADD COLUMN IF NOT EXISTS "next_review_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "reinforcement_queue"
ALTER COLUMN "priority" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable: ReinforcementHistory
CREATE TABLE IF NOT EXISTS "reinforcement_history" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "before_score" DOUBLE PRECISION NOT NULL,
    "after_score" DOUBLE PRECISION NOT NULL,
    "score_difference" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reinforcement_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReinforcementEvent
CREATE TABLE IF NOT EXISTS "reinforcement_events" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "event_type" "ReinforcementEventType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reinforcement_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ReinforcementQueue
CREATE INDEX IF NOT EXISTS "reinforcement_queue_child_id_idx" ON "reinforcement_queue"("child_id");
CREATE INDEX IF NOT EXISTS "reinforcement_queue_child_id_is_completed_idx" ON "reinforcement_queue"("child_id", "is_completed");
CREATE INDEX IF NOT EXISTS "reinforcement_queue_next_review_date_idx" ON "reinforcement_queue"("next_review_date");
CREATE INDEX IF NOT EXISTS "reinforcement_queue_priority_idx" ON "reinforcement_queue"("priority");

-- CreateIndex: ReinforcementHistory
CREATE INDEX IF NOT EXISTS "reinforcement_history_child_id_idx" ON "reinforcement_history"("child_id");
CREATE INDEX IF NOT EXISTS "reinforcement_history_child_id_skill_id_idx" ON "reinforcement_history"("child_id", "skill_id");

-- CreateIndex: ReinforcementEvent
CREATE INDEX IF NOT EXISTS "reinforcement_events_child_id_idx" ON "reinforcement_events"("child_id");
CREATE INDEX IF NOT EXISTS "reinforcement_events_child_id_skill_id_idx" ON "reinforcement_events"("child_id", "skill_id");
CREATE INDEX IF NOT EXISTS "reinforcement_events_child_id_event_type_idx" ON "reinforcement_events"("child_id", "event_type");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "reinforcement_history" ADD CONSTRAINT "reinforcement_history_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "reinforcement_history" ADD CONSTRAINT "reinforcement_history_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "reinforcement_events" ADD CONSTRAINT "reinforcement_events_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "reinforcement_events" ADD CONSTRAINT "reinforcement_events_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
