-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('VIDEO', 'LISTENING', 'SPEAKING', 'GAME', 'WRITING', 'STORY', 'MOTOR', 'CREATIVE');

-- CreateEnum
CREATE TYPE "AdaptationEventType" AS ENUM ('MODALITY_CHANGE', 'SESSION_SHORTENED', 'SESSION_EXTENDED', 'WEAKNESS_DETECTED', 'STRENGTH_DETECTED', 'REINFORCEMENT_ADDED', 'REGRESSION_DETECTED', 'CONFIDENCE_DROP', 'CONFIDENCE_IMPROVEMENT', 'ENGAGEMENT_DROP', 'ENGAGEMENT_IMPROVEMENT');

-- AlterTable
ALTER TABLE "regression_logs" ADD COLUMN     "difference" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- CreateTable
CREATE TABLE "learning_profiles" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "average_accuracy" DOUBLE PRECISION NOT NULL,
    "average_engagement" DOUBLE PRECISION NOT NULL,
    "average_confidence" DOUBLE PRECISION NOT NULL,
    "optimal_session_duration" INTEGER NOT NULL,
    "preferred_modality" "ActivityType" NOT NULL,
    "learning_velocity" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modality_performances" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "attempts" INTEGER NOT NULL,
    "average_accuracy" DOUBLE PRECISION NOT NULL,
    "average_engagement" DOUBLE PRECISION NOT NULL,
    "average_confidence" DOUBLE PRECISION NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modality_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adaptation_events" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "event_type" "AdaptationEventType" NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adaptation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_events" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_profiles_child_id_key" ON "learning_profiles"("child_id");

-- CreateIndex
CREATE INDEX "modality_performances_child_id_idx" ON "modality_performances"("child_id");

-- CreateIndex
CREATE UNIQUE INDEX "modality_performances_child_id_activity_type_key" ON "modality_performances"("child_id", "activity_type");

-- CreateIndex
CREATE INDEX "adaptation_events_child_id_idx" ON "adaptation_events"("child_id");

-- CreateIndex
CREATE INDEX "adaptation_events_child_id_event_type_idx" ON "adaptation_events"("child_id", "event_type");

-- CreateIndex
CREATE INDEX "learning_events_child_id_idx" ON "learning_events"("child_id");

-- CreateIndex
CREATE INDEX "learning_events_child_id_event_type_idx" ON "learning_events"("child_id", "event_type");

-- AddForeignKey
ALTER TABLE "learning_profiles" ADD CONSTRAINT "learning_profiles_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modality_performances" ADD CONSTRAINT "modality_performances_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adaptation_events" ADD CONSTRAINT "adaptation_events_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
