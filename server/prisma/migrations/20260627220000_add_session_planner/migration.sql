-- Drop old tables if they exist
DROP TABLE IF EXISTS "session_events";
DROP TABLE IF EXISTS "session_blocks";
DROP TABLE IF EXISTS "session_plans";
DROP TABLE IF EXISTS "session_templates";

-- Create types if they do not exist
DO $$ BEGIN
  CREATE TYPE "SessionStatus" AS ENUM ('GENERATED', 'STARTED', 'PAUSED', 'COMPLETED', 'ABANDONED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SessionBlockStatus" AS ENUM ('PENDING', 'STARTED', 'COMPLETED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SessionEventType" AS ENUM ('GENERATED', 'STARTED', 'PAUSED', 'RESUMED', 'BLOCK_COMPLETED', 'BLOCK_SKIPPED', 'COMPLETED', 'ABANDONED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Alter ActivityType enum safely
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WARMUP';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'REWARD';

-- Create SessionTemplate table
CREATE TABLE "session_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "block_sequence" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_templates_pkey" PRIMARY KEY ("id")
);

-- Create SessionPlan table
CREATE TABLE "session_plans" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'GENERATED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_plans_pkey" PRIMARY KEY ("id")
);

-- Create SessionBlock table
CREATE TABLE "session_blocks" (
    "id" TEXT NOT NULL,
    "session_plan_id" TEXT NOT NULL,
    "skill_id" TEXT,
    "subject_id" TEXT,
    "activity_type" "ActivityType" NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "SessionBlockStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_blocks_pkey" PRIMARY KEY ("id")
);

-- Create SessionEvent table
CREATE TABLE "session_events" (
    "id" TEXT NOT NULL,
    "session_plan_id" TEXT NOT NULL,
    "event_type" "SessionEventType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_events_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS "session_plans_child_id_idx" ON "session_plans"("child_id");
CREATE INDEX IF NOT EXISTS "session_plans_status_idx" ON "session_plans"("status");
CREATE INDEX IF NOT EXISTS "session_plans_created_at_idx" ON "session_plans"("created_at");

CREATE INDEX IF NOT EXISTS "session_blocks_session_plan_id_idx" ON "session_blocks"("session_plan_id");
CREATE INDEX IF NOT EXISTS "session_blocks_position_idx" ON "session_blocks"("position");
CREATE INDEX IF NOT EXISTS "session_blocks_skill_id_idx" ON "session_blocks"("skill_id");

CREATE INDEX IF NOT EXISTS "session_events_session_plan_id_idx" ON "session_events"("session_plan_id");
CREATE INDEX IF NOT EXISTS "session_events_event_type_idx" ON "session_events"("event_type");

-- Add Foreign Keys
ALTER TABLE "session_plans" ADD CONSTRAINT "session_plans_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_blocks" ADD CONSTRAINT "session_blocks_session_plan_id_fkey" FOREIGN KEY ("session_plan_id") REFERENCES "session_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_blocks" ADD CONSTRAINT "session_blocks_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "session_blocks" ADD CONSTRAINT "session_blocks_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "session_events" ADD CONSTRAINT "session_events_session_plan_id_fkey" FOREIGN KEY ("session_plan_id") REFERENCES "session_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
