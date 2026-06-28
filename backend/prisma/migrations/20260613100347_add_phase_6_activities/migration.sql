-- AlterTable
ALTER TABLE "LessonProgress" ADD COLUMN     "listen_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "speak_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "video_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "write_completed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "audios" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listen_progress" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listen_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speak_progress" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "best_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "speak_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "write_progress" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "write_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audios_activity_id_key" ON "audios"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "listen_progress_child_id_activity_id_key" ON "listen_progress"("child_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "speak_progress_child_id_activity_id_key" ON "speak_progress"("child_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "write_progress_child_id_activity_id_key" ON "write_progress"("child_id", "activity_id");

-- AddForeignKey
ALTER TABLE "audios" ADD CONSTRAINT "audios_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listen_progress" ADD CONSTRAINT "listen_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listen_progress" ADD CONSTRAINT "listen_progress_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speak_progress" ADD CONSTRAINT "speak_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speak_progress" ADD CONSTRAINT "speak_progress_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "write_progress" ADD CONSTRAINT "write_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "write_progress" ADD CONSTRAINT "write_progress_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
