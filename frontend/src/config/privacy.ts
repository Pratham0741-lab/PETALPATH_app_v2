/**
 * Facts the app tells parents about their data. Keep these true: each one is
 * a promise.
 *
 * BACKUP_RETENTION_DAYS must match RETENTION_DAYS in scripts/backup-db.sh
 * (nightly database backups; the script removes every backup before it is
 * this many days old).
 */
export const BACKUP_RETENTION_DAYS = 30;
