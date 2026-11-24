-- Additive only. When a password is reset, password_changed_at is set and
-- access tokens issued before it are rejected, so the reset signs out every
-- session (refresh tokens are also deleted). Existing rows stay NULL, which
-- means "never reset" and changes nothing for them.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_changed_at" TIMESTAMP(3);
