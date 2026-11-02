-- Stars for the drag-and-drop (match) game, and the lesson's maximum stars
-- (3 per activity offered) recorded when the lesson is completed.
ALTER TABLE "LessonProgress" ADD COLUMN "drag_drop_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "drag_drop_stars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "max_stars" INTEGER NOT NULL DEFAULT 0;

