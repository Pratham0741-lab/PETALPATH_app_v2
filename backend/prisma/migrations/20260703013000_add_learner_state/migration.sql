-- =============================================================================
-- Migration: add_learner_state
-- Adaptive Learning Engine — Phase 1 (Foundation)
-- See docs/adaptive-engine/design-spec.md §2.1, §3.4
-- =============================================================================

-- Create RecommendationKind enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "RecommendationKind" AS ENUM (
    'NEW_SKILL',
    'REVIEW',
    'PRACTICE',
    'CHALLENGE',
    'MIXED_PRACTICE',
    'REST'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create learner_state table
CREATE TABLE "learner_state" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,

    "overall_mastery_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mastered_skill_count" INTEGER NOT NULL DEFAULT 0,
    "strong_skill_count" INTEGER NOT NULL DEFAULT 0,
    "weak_skill_count" INTEGER NOT NULL DEFAULT 0,
    "total_skill_count" INTEGER NOT NULL DEFAULT 0,

    "top_weak_skill_ids" JSONB NOT NULL DEFAULT '[]',
    "top_strong_skill_ids" JSONB NOT NULL DEFAULT '[]',
    "reviews_due_count" INTEGER NOT NULL DEFAULT 0,
    "reviews_due_skill_ids" JSONB NOT NULL DEFAULT '[]',

    "active_session_plan_id" TEXT,
    "last_completed_session_at" TIMESTAMP(3),

    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "longest_streak_days" INTEGER NOT NULL DEFAULT 0,
    "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,

    "preferred_modality" "ActivityType",
    "optimal_session_duration_min" INTEGER NOT NULL DEFAULT 15,

    "last_recommendation_kind" "RecommendationKind",
    "last_recommendation_skill_id" TEXT,
    "last_recommendation_at" TIMESTAMP(3),
    "last_recommendation_ttl_sec" INTEGER NOT NULL DEFAULT 60,

    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "learner_state_pkey" PRIMARY KEY ("id")
);

-- Unique + supporting indexes
CREATE UNIQUE INDEX "learner_state_child_id_key" ON "learner_state"("child_id");
CREATE INDEX "learner_state_child_id_idx" ON "learner_state"("child_id");
CREATE INDEX "learner_state_updated_at_idx" ON "learner_state"("updated_at");

-- FK to children
ALTER TABLE "learner_state"
    ADD CONSTRAINT "learner_state_child_id_fkey"
    FOREIGN KEY ("child_id") REFERENCES "children"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
