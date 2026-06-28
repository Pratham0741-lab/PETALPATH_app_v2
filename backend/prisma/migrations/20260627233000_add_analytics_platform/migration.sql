-- Drop old tables if they exist
DROP TABLE IF EXISTS "analytics_snapshots";
DROP TABLE IF EXISTS "analytics_histories";
DROP TABLE IF EXISTS "trend_events";
DROP TABLE IF EXISTS "subject_analytics";

-- Create types if they do not exist
DO $$ BEGIN
  CREATE TYPE "AnalyticsMetricType" AS ENUM ('ACCURACY', 'CONFIDENCE', 'RETENTION', 'ENGAGEMENT', 'LEARNING_VELOCITY', 'SESSION_COMPLETION', 'REINFORCEMENT_SUCCESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TrendEventType" AS ENUM ('CONFIDENCE_IMPROVING', 'CONFIDENCE_DECLINING', 'RETENTION_IMPROVING', 'RETENTION_DECLINING', 'ENGAGEMENT_IMPROVING', 'ENGAGEMENT_DECLINING', 'LEARNING_ACCELERATING', 'LEARNING_SLOWING', 'SESSION_ABANDONMENT', 'REGRESSION_DETECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create AnalyticsSnapshot table
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "retention" DOUBLE PRECISION NOT NULL,
    "engagement" DOUBLE PRECISION NOT NULL,
    "learning_velocity" DOUBLE PRECISION NOT NULL,
    "session_completion_rate" DOUBLE PRECISION NOT NULL,
    "reinforcement_success_rate" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- Create AnalyticsHistory table with daily unique time-bucket constraint
CREATE TABLE "analytics_histories" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "metric_type" "AnalyticsMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_histories_pkey" PRIMARY KEY ("id")
);

-- Create TrendEvent table
CREATE TABLE "trend_events" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "event_type" "TrendEventType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_events_pkey" PRIMARY KEY ("id")
);

-- Create SubjectAnalytics table
CREATE TABLE "subject_analytics" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "retention" DOUBLE PRECISION NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL,
    "learning_velocity" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_analytics_pkey" PRIMARY KEY ("id")
);

-- Create Unique Constraints
CREATE UNIQUE INDEX "analytics_snapshots_child_id_key" ON "analytics_snapshots"("child_id");
CREATE UNIQUE INDEX "analytics_histories_child_id_metric_type_timestamp_key" ON "analytics_histories"("child_id", "metric_type", "timestamp");
CREATE UNIQUE INDEX "subject_analytics_child_id_subject_id_key" ON "subject_analytics"("child_id", "subject_id");

-- Create Indexes
CREATE INDEX "analytics_snapshots_child_id_idx" ON "analytics_snapshots"("child_id");

CREATE INDEX "analytics_histories_child_id_idx" ON "analytics_histories"("child_id");
CREATE INDEX "analytics_histories_metric_type_idx" ON "analytics_histories"("metric_type");
CREATE INDEX "analytics_histories_timestamp_idx" ON "analytics_histories"("timestamp");

CREATE INDEX "trend_events_child_id_idx" ON "trend_events"("child_id");
CREATE INDEX "trend_events_event_type_idx" ON "trend_events"("event_type");

CREATE INDEX "subject_analytics_child_id_idx" ON "subject_analytics"("child_id");
CREATE INDEX "subject_analytics_subject_id_idx" ON "subject_analytics"("subject_id");

-- Add Foreign Key Constraints
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analytics_histories" ADD CONSTRAINT "analytics_histories_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trend_events" ADD CONSTRAINT "trend_events_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_analytics" ADD CONSTRAINT "subject_analytics_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subject_analytics" ADD CONSTRAINT "subject_analytics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
