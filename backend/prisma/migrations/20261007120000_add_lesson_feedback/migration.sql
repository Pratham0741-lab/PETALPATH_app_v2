-- Lesson feedback from grown-ups on the lesson-complete screen.
--
-- Additive only: one new table, its indexes and its foreign keys. No existing
-- table, column, constraint or row is altered or dropped.

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comment" VARCHAR(1000),
    "app_version" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),
    -- Prisma cannot express this; the API validates it too, this is the backstop.
    CONSTRAINT "feedback_rating_range" CHECK ("rating" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE INDEX "feedback_lesson_id_idx" ON "feedback"("lesson_id");

-- CreateIndex
CREATE INDEX "feedback_parent_id_created_at_idx" ON "feedback"("parent_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");

-- AddForeignKey
-- RESTRICT: a lesson wipe (prisma/seed.ts) must fail rather than delete feedback.
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
