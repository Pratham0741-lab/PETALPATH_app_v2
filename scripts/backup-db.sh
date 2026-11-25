#!/usr/bin/env bash
# ============================================================
# PetalPath — Production PostgreSQL Backup Script
# ============================================================
#
# Performs a compressed pg_dump backup, stores it in
# /home/ubuntu/backups/postgres, and prunes backups older
# than 30 days.
#
# Usage:
#   chmod +x scripts/backup-db.sh
#   ./scripts/backup-db.sh
#
# Cron (nightly at 2:00 AM):
#   0 2 * * * /home/ubuntu/PETALPATH_app_v2/scripts/backup-db.sh \
#       >> /home/ubuntu/backups/postgres/backup.log 2>&1
#
# Prerequisites:
#   sudo apt install -y postgresql-client
#
# ============================================================

set -Eeuo pipefail

# ── Configuration ──────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/backend/.env"
BACKUP_DIR="/home/ubuntu/backups/postgres"
RETENTION_DAYS=30
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
BACKUP_FILE="petalpath_${TIMESTAMP}.sql.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# ── Helpers ────────────────────────────────────────────────

log()   { echo "[BACKUP $(date --iso-8601=seconds)] $*"; }
die()   { log "ERROR: $*"; exit 1; }

# Clean up partial backup on failure
cleanup() {
  if [ -f "$BACKUP_PATH" ]; then
    rm -f "$BACKUP_PATH"
    log "Cleaned up partial backup file."
  fi
}
trap cleanup ERR

# ── Validate environment ───────────────────────────────────

[ -f "$ENV_FILE" ] || die ".env not found at $ENV_FILE"

# Extract DATABASE_URL (handles quoted and unquoted values)
DATABASE_URL="$(grep -E "^DATABASE_URL=" "$ENV_FILE" | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")"

[ -n "$DATABASE_URL" ] || die "DATABASE_URL is empty or missing in $ENV_FILE"

# Strip Prisma-specific query params (e.g. ?schema=public) that pg_dump doesn't understand
PGDUMP_URL="${DATABASE_URL%%\?*}"

# Verify pg_dump is installed
command -v pg_dump >/dev/null 2>&1 || die "pg_dump not found. Install with: sudo apt install postgresql-client"

# ── Create backup directory ────────────────────────────────

mkdir -p "$BACKUP_DIR"

# ── Run backup ─────────────────────────────────────────────

log "Starting backup..."
log "Destination: $BACKUP_PATH"

pg_dump "$PGDUMP_URL" --no-owner --no-privileges | gzip > "$BACKUP_PATH"

# ── Verify backup ─────────────────────────────────────────

# A valid compressed dump is always at least a few hundred bytes
MIN_SIZE=100
ACTUAL_SIZE="$(stat --format=%s "$BACKUP_PATH" 2>/dev/null || stat -f%z "$BACKUP_PATH" 2>/dev/null)"

if [ "$ACTUAL_SIZE" -lt "$MIN_SIZE" ]; then
  rm -f "$BACKUP_PATH"
  die "Backup file is only ${ACTUAL_SIZE} bytes — likely empty or corrupt. Removed."
fi

FILE_SIZE="$(du -h "$BACKUP_PATH" | cut -f1)"
log "SUCCESS: Backup completed ($FILE_SIZE)"

# ── Prune old backups ──────────────────────────────────────

# RETENTION_DAYS is the promise made to parents ("backups keep deleted data
# for up to 30 days"), so no backup may be older than that. Pruning runs only
# once a night, so it removes anything older than RETENTION_DAYS - 1 days: a
# backup is gone before it turns RETENTION_DAYS old. (The previous
# `-mtime +30` kept files until they were 31+ days old, ~32 by the next run.)
PRUNE_AFTER_MINUTES=$(( (RETENTION_DAYS - 1) * 24 * 60 ))
DELETED="$(find "$BACKUP_DIR" -name "petalpath_*.sql.gz" -mmin +$PRUNE_AFTER_MINUTES -delete -print | wc -l)"
log "Retention: Removed $DELETED backup(s); none is kept ${RETENTION_DAYS} days or longer"

# ── Summary ────────────────────────────────────────────────

TOTAL_BACKUPS="$(find "$BACKUP_DIR" -name "petalpath_*.sql.gz" | wc -l)"
TOTAL_SIZE="$(du -sh "$BACKUP_DIR" | cut -f1)"
log "Summary: $TOTAL_BACKUPS backup(s), $TOTAL_SIZE total disk usage"
log "Done."

exit 0
