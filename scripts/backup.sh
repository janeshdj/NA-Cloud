#!/bin/bash
set -euo pipefail

DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/tmp/neithal-backup"
FILENAME="neithal-hrms-$DATE.sql.gz.enc"
ENCRYPTION_KEY="/home/ubuntu/.backup_key"

mkdir -p "$BACKUP_DIR"
echo "[$(date)] Starting encrypted database backup: $FILENAME"

docker exec neithal-hrms-postgres-prod pg_dump -U ${DB_USER:-neithal} ${DB_NAME:-neithal_hrms} | \
  gzip | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -pass file:"$ENCRYPTION_KEY" \
  > "$BACKUP_DIR/$FILENAME"

rclone copy "$BACKUP_DIR/$FILENAME" "gdrive:NeithalHRMS/Database/Daily/"
rm -f "$BACKUP_DIR/$FILENAME"

echo "[$(date)] Backup successfully completed and synced to Google Drive."
