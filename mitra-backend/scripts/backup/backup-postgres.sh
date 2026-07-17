#!/usr/bin/env bash
set -euo pipefail

# MITRA v3.2 — PostgreSQL Daily Backup Script
# Produces a timestamped, gzip-compressed pg_dump and uploads to MinIO.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Load environment
ENV_FILE="${BACKEND_ROOT}/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a; source "$ENV_FILE"; set +a
fi

# Defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mitra_v2}"
DB_USERNAME="${DB_USERNAME:-mitra_admin}"
DB_PASSWORD="${DB_PASSWORD:-}"
BACKUP_DIR="${BACKUP_DIR:-${BACKEND_ROOT}/backups/db}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-}"
MINIO_BACKUP_BUCKET="${MINIO_BACKUP_BUCKET:-mitra-backups}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="mitra_${DB_NAME}_${TIMESTAMP}.sql"
GZ_FILE="${DUMP_FILE}.gz"
LOCAL_PATH="${BACKUP_DIR}/${GZ_FILE}"

mkdir -p "$BACKUP_DIR"

echo "[backup-postgres] Starting PostgreSQL backup at ${TIMESTAMP}..."

# Run pg_dump and compress
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" \
  --no-owner --no-privileges --clean --if-exists \
  | gzip > "$LOCAL_PATH"

FILE_SIZE=$(du -h "$LOCAL_PATH" | cut -f1)
echo "[backup-postgres] Dump completed: ${LOCAL_PATH} (${FILE_SIZE})"

# Upload to MinIO if credentials are available
if [[ -n "$MINIO_ACCESS_KEY" && -n "$MINIO_SECRET_KEY" ]]; then
  echo "[backup-postgres] Uploading to MinIO bucket ${MINIO_BACKUP_BUCKET}..."

  # Ensure mc alias exists
  mc alias set mitra-backup "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || true

  # Ensure bucket exists
  mc mb "mitra-backup/${MINIO_BACKUP_BUCKET}" --ignore-existing >/dev/null 2>&1 || true

  # Upload
  mc cp "$LOCAL_PATH" "mitra-backup/${MINIO_BACKUP_BUCKET}/db/${GZ_FILE}"
  echo "[backup-postgres] Uploaded to MinIO: db/${GZ_FILE}"
fi

# Retention cleanup (keep last 30 days)
find "$BACKUP_DIR" -name 'mitra_*.sql.gz' -type f -mtime +30 -delete

echo "[backup-postgres] Backup finished successfully."
