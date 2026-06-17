-- CreateEnum
CREATE TYPE "MasteryState" AS ENUM ('NEW', 'LEARNING', 'WEAK', 'STRONG', 'MASTERED');

-- CreateEnum
CREATE TYPE "CurriculumState" AS ENUM ('LOCKED', 'AVAILABLE', 'ACTIVE', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_category_id_fkey";

-- AlterTable
ALTER TABLE "LessonProgress" ADD COLUMN     "listen_stars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "speak_stars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_stars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "video_stars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "write_stars" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "category_id",
ADD COLUMN     "module_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "speak_progress" ADD COLUMN     "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "best_stars" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "write_progress" ADD COLUMN     "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "best_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "best_stars" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stars" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "total_stars" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stickers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_path" TEXT NOT NULL,
    "required_stars" INTEGER NOT NULL,

    CONSTRAINT "stickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_stickers" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "sticker_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_stickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_path" TEXT NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_badges" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_progress" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "completed_lessons" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "module_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_progress" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "completed_modules" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "category_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "estimated_age" INTEGER,
    "is_root_skill" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_dependencies" (
    "id" TEXT NOT NULL,
    "parent_skill_id" TEXT NOT NULL,
    "child_skill_id" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_health" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "mastery_state" "MasteryState" NOT NULL,
    "knowledge_score" DOUBLE PRECISION NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "retention_score" DOUBLE PRECISION NOT NULL,
    "engagement_score" DOUBLE PRECISION NOT NULL,
    "consistency_score" DOUBLE PRECISION NOT NULL,
    "mastery_score" DOUBLE PRECISION NOT NULL,
    "last_practiced" TIMESTAMP(3) NOT NULL,
    "next_review_date" TIMESTAMP(3) NOT NULL,
    "review_count" INTEGER NOT NULL,
    "attempt_count" INTEGER NOT NULL,
    "retry_count" INTEGER NOT NULL,
    "decay_factor" DOUBLE PRECISION NOT NULL,
    "frequency_days" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_history" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "knowledge_score" DOUBLE PRECISION NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "retention_score" DOUBLE PRECISION NOT NULL,
    "engagement_score" DOUBLE PRECISION NOT NULL,
    "consistency_score" DOUBLE PRECISION NOT NULL,
    "mastery_score" DOUBLE PRECISION NOT NULL,
    "mastery_state" "MasteryState" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regression_logs" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "previous_score" DOUBLE PRECISION NOT NULL,
    "current_score" DOUBLE PRECISION NOT NULL,
    "previous_state" "MasteryState" NOT NULL,
    "current_state" "MasteryState" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regression_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reinforcement_queue" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reinforcement_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_skill_curriculum" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "state" "CurriculumState" NOT NULL,
    "unlock_ratio" DOUBLE PRECISION NOT NULL,
    "priority" DOUBLE PRECISION NOT NULL,
    "activated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_skill_curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stars_child_id_key" ON "stars"("child_id");

-- CreateIndex
CREATE UNIQUE INDEX "child_stickers_child_id_sticker_id_key" ON "child_stickers"("child_id", "sticker_id");

-- CreateIndex
CREATE UNIQUE INDEX "child_badges_child_id_badge_id_key" ON "child_badges"("child_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_progress_child_id_module_id_key" ON "module_progress"("child_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_progress_child_id_category_id_key" ON "category_progress"("child_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skill_dependencies_parent_skill_id_child_skill_id_key" ON "skill_dependencies"("parent_skill_id", "child_skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_health_child_id_skill_id_key" ON "skill_health"("child_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "reinforcement_queue_child_id_skill_id_key" ON "reinforcement_queue"("child_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "child_skill_curriculum_child_id_skill_id_key" ON "child_skill_curriculum"("child_id", "skill_id");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stars" ADD CONSTRAINT "stars_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_stickers" ADD CONSTRAINT "child_stickers_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_stickers" ADD CONSTRAINT "child_stickers_sticker_id_fkey" FOREIGN KEY ("sticker_id") REFERENCES "stickers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_badges" ADD CONSTRAINT "child_badges_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_badges" ADD CONSTRAINT "child_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_progress" ADD CONSTRAINT "category_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_progress" ADD CONSTRAINT "category_progress_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_dependencies" ADD CONSTRAINT "skill_dependencies_parent_skill_id_fkey" FOREIGN KEY ("parent_skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_dependencies" ADD CONSTRAINT "skill_dependencies_child_skill_id_fkey" FOREIGN KEY ("child_skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_health" ADD CONSTRAINT "skill_health_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_health" ADD CONSTRAINT "skill_health_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_history" ADD CONSTRAINT "skill_history_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_history" ADD CONSTRAINT "skill_history_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regression_logs" ADD CONSTRAINT "regression_logs_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regression_logs" ADD CONSTRAINT "regression_logs_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reinforcement_queue" ADD CONSTRAINT "reinforcement_queue_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reinforcement_queue" ADD CONSTRAINT "reinforcement_queue_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_skill_curriculum" ADD CONSTRAINT "child_skill_curriculum_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_skill_curriculum" ADD CONSTRAINT "child_skill_curriculum_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
