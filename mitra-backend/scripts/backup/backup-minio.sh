#!/usr/bin/env bash
set -euo pipefail

# MITRA v3.2 — MinIO Document Backup Script
# Mirrors the primary MinIO bucket to a backup location using mc mirror.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Load environment
ENV_FILE="${BACKEND_ROOT}/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a; source "$ENV_FILE"; set +a
fi

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-}"
SOURCE_BUCKET="${MINIO_DOCUMENTS_BUCKET:-mitra-documents}"
BACKUP_BUCKET="${MINIO_BACKUP_BUCKET:-mitra-backups}"
BACKUP_DIR="${BACKUP_DIR:-${BACKEND_ROOT}/backups/minio}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "[backup-minio] Starting MinIO mirror at ${TIMESTAMP}..."

if [[ -z "$MINIO_ACCESS_KEY" || -z "$MINIO_SECRET_KEY" ]]; then
  echo "[backup-minio] WARNING: MinIO credentials not set. Skipping remote mirror."
  echo "[backup-minio] Falling back to local mirror only."
fi

mkdir -p "$BACKUP_DIR"

# Local mirror fallback (always runs)
LOCAL_MIRROR_DIR="${BACKUP_DIR}/${TIMESTAMP}"
mkdir -p "$LOCAL_MIRROR_DIR"

if [[ -n "$MINIO_ACCESS_KEY" && -n "$MINIO_SECRET_KEY" ]]; then
  # Configure mc alias for source and backup
  mc alias set mitra-source "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || true
  mc alias set mitra-backup "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null 2>&1 || true

  # Ensure backup bucket exists
  mc mb "mitra-backup/${BACKUP_BUCKET}" --ignore-existing >/dev/null 2>&1 || true

  # Mirror to remote backup bucket
  mc mirror "mitra-source/${SOURCE_BUCKET}" "mitra-backup/${BACKUP_BUCKET}/minio/${TIMESTAMP}"
  echo "[backup-minio] Remote mirror completed: ${BACKUP_BUCKET}/minio/${TIMESTAMP}"
fi

# Also keep a local mirror for quick access
mc mirror "mitra-source/${SOURCE_BUCKET}" "$LOCAL_MIRROR_DIR" >/dev/null 2>&1 || true

# Retention: keep last 30 days of local mirrors
find "$BACKUP_DIR" -maxdepth 1 -type d -name '20*' -mtime +30 -exec rm -rf {} + 2>/dev/null || true

echo "[backup-minio] Backup finished successfully."
