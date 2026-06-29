#!/bin/bash
# ============================================================
# PetalPath — Nightly PostgreSQL Backup Script
# ============================================================
# Usage:
#   chmod +x scripts/backup-db.sh
#   ./scripts/backup-db.sh
#
# Cron (nightly at 2:00 AM):
#   0 2 * * * /home/ubuntu/PETALPATH_app_v2/scripts/backup-db.sh >> /home/ubuntu/PETALPATH_app_v2/logs/backup.log 2>&1
#
# Requirements:
#   - pg_dump installed (sudo apt install postgresql-client)
#   - .env file with DATABASE_URL
# ============================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="petalpath_${TIMESTAMP}.sql.gz"
LOG_PREFIX="[BACKUP $(date --iso-8601=seconds)]"

# ── Load DATABASE_URL from .env ────────────────────────────
ENV_FILE="$PROJECT_DIR/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "$LOG_PREFIX ERROR: .env file not found at $ENV_FILE"
  exit 1
fi

DATABASE_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
  echo "$LOG_PREFIX ERROR: DATABASE_URL not found in .env"
  exit 1
fi

# ── Create backup directory ────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Run backup ─────────────────────────────────────────────
echo "$LOG_PREFIX Starting backup..."
echo "$LOG_PREFIX Target: $BACKUP_DIR/$BACKUP_FILE"

if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$BACKUP_FILE"; then
  FILE_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
  echo "$LOG_PREFIX SUCCESS: Backup completed ($FILE_SIZE)"
else
  echo "$LOG_PREFIX ERROR: pg_dump failed"
  # Clean up partial file
  rm -f "$BACKUP_DIR/$BACKUP_FILE"
  exit 1
fi

# ── Verify backup is not empty ─────────────────────────────
MIN_SIZE=100  # bytes — a valid dump is always larger
ACTUAL_SIZE=$(stat --format=%s "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null)

if [ "$ACTUAL_SIZE" -lt "$MIN_SIZE" ]; then
  echo "$LOG_PREFIX ERROR: Backup file suspiciously small (${ACTUAL_SIZE} bytes). Possibly empty database or failed dump."
  exit 1
fi

# ── Prune old backups ──────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "petalpath_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "$LOG_PREFIX Retention: Removed $DELETED backup(s) older than ${RETENTION_DAYS} days"

# ── Summary ────────────────────────────────────────────────
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "petalpath_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "$LOG_PREFIX Summary: $TOTAL_BACKUPS backup(s), $TOTAL_SIZE total"
echo "$LOG_PREFIX Done."
