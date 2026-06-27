-- Drop the table using the enum
DROP TABLE IF EXISTS "reinforcement_events";

-- Drop the enum type
DROP TYPE IF EXISTS "ReinforcementEventType";

-- Recreate the enum type with all values
CREATE TYPE "ReinforcementEventType" AS ENUM ('REVIEW_TRIGGERED', 'REVIEW_COMPLETED', 'RETENTION_DROP', 'REINFORCEMENT_SUCCESS', 'REINFORCEMENT_FAILED');

-- Recreate the table
CREATE TABLE "reinforcement_events" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "event_type" "ReinforcementEventType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reinforcement_events_pkey" PRIMARY KEY ("id")
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS "reinforcement_events_child_id_idx" ON "reinforcement_events"("child_id");
CREATE INDEX IF NOT EXISTS "reinforcement_events_child_id_skill_id_idx" ON "reinforcement_events"("child_id", "skill_id");
CREATE INDEX IF NOT EXISTS "reinforcement_events_child_id_event_type_idx" ON "reinforcement_events"("child_id", "event_type");

-- Recreate foreign key constraints
ALTER TABLE "reinforcement_events" ADD CONSTRAINT "reinforcement_events_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reinforcement_events" ADD CONSTRAINT "reinforcement_events_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
