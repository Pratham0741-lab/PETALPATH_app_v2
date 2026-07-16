/*
  Warnings:

  - You are about to drop the `Story` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Story" DROP CONSTRAINT "Story_childId_fkey";

-- DropTable
DROP TABLE "Story";

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_key" TEXT,
    "category" TEXT DEFAULT 'FICTION',
    "difficulty" TEXT DEFAULT 'EASY',
    "readingLevel" INTEGER DEFAULT 1,
    "estimated_duration" INTEGER DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_pages" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "image_key" TEXT,
    "narration_key" TEXT,
    "hint" TEXT,

    CONSTRAINT "story_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_vocabulary" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "definition" TEXT,
    "image_key" TEXT,

    CONSTRAINT "story_vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_progress" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "current_page" INTEGER NOT NULL DEFAULT 0,
    "total_pages" INTEGER NOT NULL DEFAULT 0,
    "completion_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reading_time" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "stars_earned" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "story_pages_story_id_page_number_key" ON "story_pages"("story_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "story_progress_child_id_story_id_key" ON "story_progress"("child_id", "story_id");

-- AddForeignKey
ALTER TABLE "story_pages" ADD CONSTRAINT "story_pages_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_vocabulary" ADD CONSTRAINT "story_vocabulary_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_progress" ADD CONSTRAINT "story_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_progress" ADD CONSTRAINT "story_progress_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
