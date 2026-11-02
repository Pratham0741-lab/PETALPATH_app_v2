-- A perfect lesson is now every star the lesson offers (3 per activity), not a fixed 8.
UPDATE "badges" SET "description" = 'Every star in a lesson' WHERE "name" = 'Perfect Lesson';
