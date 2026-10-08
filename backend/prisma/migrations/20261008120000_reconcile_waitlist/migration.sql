-- Reconcile "waitlists" for the public marketing-site endpoint (POST /api/waitlist).
-- Additive only: no DROP, TRUNCATE or RENAME; the table keeps its name and rows.
--   * source_page: where the signup came from. Existing rows all came from the
--     app's JoinWaitlistForm, so they take the default 'app'.
--   * name: optional, max 100 (the site form does not require it).
--   * email: max 254. Fails (and rolls back) if any existing value is longer.
-- id stays TEXT: existing cuid ids are kept; Prisma generates UUIDs for new rows.
-- No IP address, IP hash or other tracking column.

-- AlterTable
ALTER TABLE "waitlists" ADD COLUMN     "source_page" VARCHAR(64) NOT NULL DEFAULT 'app',
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(254);
