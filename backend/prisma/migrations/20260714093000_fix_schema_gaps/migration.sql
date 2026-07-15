DO $$ BEGIN
  CREATE TYPE "LearningEventType" AS ENUM ('SESSION_STARTED', 'SESSION_PAUSED', 'SESSION_RESUMED', 'SESSION_COMPLETED', 'SESSION_CANCELLED', 'TOPIC_STARTED', 'TOPIC_COMPLETED', 'TOPIC_SKIPPED', 'ACTIVITY_STARTED', 'ACTIVITY_COMPLETED', 'ACTIVITY_SKIPPED', 'ACTIVITY_FAILED', 'VIDEO_COMPLETED', 'AUDIO_COMPLETED', 'SPEECH_COMPLETED', 'WRITING_COMPLETED', 'RECOVERY_STARTED', 'RECOVERY_COMPLETED', 'DAILY_PRACTICE_COMPLETED', 'MASTERY_PRACTICE_COMPLETED', 'REINFORCEMENT_COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Modality" AS ENUM ('VIDEO', 'AUDIO', 'SPEECH', 'WRITING', 'GAME', 'STORY', 'MOTOR', 'CREATIVE', 'WARMUP', 'REWARD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EvidenceType" AS ENUM ('ATTEMPTS', 'RETRIES', 'ACCURACY', 'COMPLETION', 'DURATION', 'HINT_USAGE', 'HELP_REQUESTS', 'ENGAGEMENT', 'CONFIDENCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TopicStateType" AS ENUM ('NEW', 'LEARNING', 'NEEDS_PRACTICE', 'STABLE', 'REINFORCEMENT', 'MASTERED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ModalityStateType" AS ENUM ('NEW', 'LEARNING', 'NEEDS_PRACTICE', 'STABLE', 'REINFORCEMENT', 'MASTERED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MetricCategory" AS ENUM ('PERFORMANCE', 'MODALITY', 'TOPIC', 'SESSION', 'RETENTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "KnowledgeStateType" AS ENUM ('NEW', 'LEARNING', 'NEEDS_PRACTICE', 'STABLE', 'REINFORCEMENT', 'MASTERED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LearningDebtType" AS ENUM ('MASTERY_GAP', 'SKILL_DECAY', 'PREREQUISITE_MISSING', 'MODALITY_IMBALANCE', 'PACING_ISSUE', 'ENGAGEMENT_DROP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PracticeType" AS ENUM ('DAILY', 'MASTERY', 'REINFORCEMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecoveryModeStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ESCALATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "learner_state" ADD COLUMN     "adaptive_constraints" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "learning_events" DROP COLUMN "metadata",
DROP COLUMN "value",
ADD COLUMN     "activity_id" TEXT,
ADD COLUMN     "concept_id" TEXT,
ADD COLUMN     "curriculum_id" TEXT,
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "event_id" TEXT NOT NULL,
ADD COLUMN     "event_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "idempotency_key" TEXT NOT NULL,
ADD COLUMN     "modality" "Modality",
ADD COLUMN     "module_id" TEXT,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "session_id" TEXT NOT NULL,
ADD COLUMN     "subject_id" TEXT,
ADD COLUMN     "topic_id" TEXT,
DROP COLUMN "event_type",
ADD COLUMN     "event_type" "LearningEventType" NOT NULL;

-- AlterTable
ALTER TABLE "reinforcement_queue" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "next_review_date" DROP DEFAULT;

-- CreateTable
CREATE TABLE "learning_evidence" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "activity_id" TEXT,
    "topic_id" TEXT,
    "modality" "Modality",
    "evidence_type" "EvidenceType" NOT NULL,
    "observation" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "category" "MetricCategory" NOT NULL,
    "metrics" JSONB NOT NULL,
    "calculation_version" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_states" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "state" "TopicStateType" NOT NULL DEFAULT 'NEW',
    "modality_states" JSONB NOT NULL DEFAULT '{}',
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_transition_at" TIMESTAMP(3) NOT NULL,
    "transition_reason" TEXT,
    "evidence_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_states" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "state" "KnowledgeStateType" NOT NULL DEFAULT 'NEW',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "modality_coverage" JSONB NOT NULL DEFAULT '{}',
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_transition_at" TIMESTAMP(3) NOT NULL,
    "transition_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "forgetting_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "review_interval_days" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMP(3),
    "last_practiced_at" TIMESTAMP(3),
    "correct_attempts" INTEGER NOT NULL DEFAULT 0,
    "incorrect_attempts" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "average_response_time_ms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hint_usage" INTEGER NOT NULL DEFAULT 0,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "current_difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "currentModality" "Modality",

    CONSTRAINT "knowledge_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_debts" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "modality" "Modality",
    "debt_type" "LearningDebtType" NOT NULL,
    "severity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "learning_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_reinforcement_queues" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "modality" "Modality",
    "started_at" TIMESTAMP(3) NOT NULL,
    "next_review_at" TIMESTAMP(3) NOT NULL,
    "review_frequency" INTEGER NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "successful_reviews" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_reinforcement_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_roadmaps" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "roadmap_json" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practices" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "modality" "Modality",
    "type" "PracticeType" NOT NULL,
    "debt_id" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_modes" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "status" "RecoveryModeStatus" NOT NULL DEFAULT 'ACTIVE',
    "trigger_reason" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "effort_tier_drop" INTEGER NOT NULL DEFAULT 2,
    "min_topics_at_tier" INTEGER NOT NULL DEFAULT 2,
    "current_tier" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_modes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_evidence_event_id_key" ON "learning_evidence"("event_id");

-- CreateIndex
CREATE INDEX "learning_evidence_child_id_idx" ON "learning_evidence"("child_id");

-- CreateIndex
CREATE INDEX "learning_evidence_session_id_idx" ON "learning_evidence"("session_id");

-- CreateIndex
CREATE INDEX "learning_evidence_activity_id_idx" ON "learning_evidence"("activity_id");

-- CreateIndex
CREATE INDEX "learning_evidence_topic_id_idx" ON "learning_evidence"("topic_id");

-- CreateIndex
CREATE INDEX "learning_evidence_created_at_idx" ON "learning_evidence"("created_at");

-- CreateIndex
CREATE INDEX "metric_snapshots_child_id_idx" ON "metric_snapshots"("child_id");

-- CreateIndex
CREATE INDEX "metric_snapshots_child_id_category_idx" ON "metric_snapshots"("child_id", "category");

-- CreateIndex
CREATE INDEX "metric_snapshots_created_at_idx" ON "metric_snapshots"("created_at");

-- CreateIndex
CREATE INDEX "topic_states_child_id_idx" ON "topic_states"("child_id");

-- CreateIndex
CREATE INDEX "topic_states_child_id_state_idx" ON "topic_states"("child_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "topic_states_child_id_topic_id_key" ON "topic_states"("child_id", "topic_id");

-- CreateIndex
CREATE INDEX "knowledge_states_child_id_idx" ON "knowledge_states"("child_id");

-- CreateIndex
CREATE INDEX "knowledge_states_child_id_state_idx" ON "knowledge_states"("child_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_states_child_id_topic_id_key" ON "knowledge_states"("child_id", "topic_id");

-- CreateIndex
CREATE INDEX "learning_debts_child_id_idx" ON "learning_debts"("child_id");

-- CreateIndex
CREATE INDEX "learning_debts_child_id_topic_id_idx" ON "learning_debts"("child_id", "topic_id");

-- CreateIndex
CREATE INDEX "learning_debts_child_id_resolved_idx" ON "learning_debts"("child_id", "resolved");

-- CreateIndex
CREATE INDEX "topic_reinforcement_queues_child_id_idx" ON "topic_reinforcement_queues"("child_id");

-- CreateIndex
CREATE INDEX "topic_reinforcement_queues_child_id_status_idx" ON "topic_reinforcement_queues"("child_id", "status");

-- CreateIndex
CREATE INDEX "topic_reinforcement_queues_next_review_at_idx" ON "topic_reinforcement_queues"("next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "topic_reinforcement_queues_child_id_topic_id_modality_key" ON "topic_reinforcement_queues"("child_id", "topic_id", "modality");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_roadmaps_child_id_key" ON "dynamic_roadmaps"("child_id");

-- CreateIndex
CREATE INDEX "dynamic_roadmaps_child_id_idx" ON "dynamic_roadmaps"("child_id");

-- CreateIndex
CREATE INDEX "practices_child_id_idx" ON "practices"("child_id");

-- CreateIndex
CREATE INDEX "practices_child_id_type_idx" ON "practices"("child_id", "type");

-- CreateIndex
CREATE INDEX "practices_child_id_scheduled_for_idx" ON "practices"("child_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "practices_child_id_completed_idx" ON "practices"("child_id", "completed");

-- CreateIndex
CREATE INDEX "practices_debt_id_idx" ON "practices"("debt_id");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_modes_child_id_key" ON "recovery_modes"("child_id");

-- CreateIndex
CREATE INDEX "recovery_modes_child_id_idx" ON "recovery_modes"("child_id");

-- CreateIndex
CREATE INDEX "recovery_modes_child_id_status_idx" ON "recovery_modes"("child_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "learning_events_event_id_key" ON "learning_events"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_events_idempotency_key_key" ON "learning_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "learning_events_child_id_event_type_idx" ON "learning_events"("child_id", "event_type");

-- CreateIndex
CREATE INDEX "learning_events_session_id_idx" ON "learning_events"("session_id");

-- CreateIndex
CREATE INDEX "learning_events_activity_id_idx" ON "learning_events"("activity_id");

-- CreateIndex
CREATE INDEX "learning_events_topic_id_idx" ON "learning_events"("topic_id");

-- CreateIndex
CREATE INDEX "learning_events_timestamp_idx" ON "learning_events"("timestamp");

-- AddForeignKey
ALTER TABLE "learning_evidence" ADD CONSTRAINT "learning_evidence_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "learning_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_evidence" ADD CONSTRAINT "learning_evidence_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_states" ADD CONSTRAINT "topic_states_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_states" ADD CONSTRAINT "knowledge_states_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_debts" ADD CONSTRAINT "learning_debts_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_reinforcement_queues" ADD CONSTRAINT "topic_reinforcement_queues_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_roadmaps" ADD CONSTRAINT "dynamic_roadmaps_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practices" ADD CONSTRAINT "practices_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practices" ADD CONSTRAINT "practices_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "learning_debts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_modes" ADD CONSTRAINT "recovery_modes_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
