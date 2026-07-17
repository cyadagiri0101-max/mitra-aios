#!/usr/bin/env bash
set -euo pipefail

# MITRA v3.2 — Backup Verification Script
# Restores the latest backup to a temporary database and validates schema integrity.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Load environment
ENV_FILE="${BACKEND_ROOT}/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a; source "$ENV_FILE"; set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mitra_v2}"
DB_USERNAME="${DB_USERNAME:-mitra_admin}"
DB_PASSWORD="${DB_PASSWORD:-}"
BACKUP_DIR="${BACKUP_DIR:-${BACKEND_ROOT}/backups/db}"

TEMP_DB="mitra_verify_$(date +%s)"
REQUIRED_TABLES=(
  "users"
  "projects"
  "audit_logs"
  "machines"
  "design_parts"
  "bom_analysis"
  "drawing_analysis"
  "machine_telemetry"
  "ai_usage_records"
)

echo "[verify-backup] Starting backup verification..."

# Find latest backup
LATEST_BACKUP=$(find "$BACKUP_DIR" -name 'mitra_*.sql.gz' -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [[ -z "$LATEST_BACKUP" ]]; then
  echo "[verify-backup] ERROR: No backup files found in ${BACKUP_DIR}"
  exit 1
fi

echo "[verify-backup] Latest backup: ${LATEST_BACKUP}"

export PGPASSWORD="$DB_PASSWORD"

# Create temp database
echo "[verify-backup] Creating temporary database: ${TEMP_DB}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c "CREATE DATABASE \"${TEMP_DB}\";" >/dev/null

# Restore to temp database
restore_exit=0
gunzip -c "$LATEST_BACKUP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEMP_DB" --set ON_ERROR_STOP=on >/dev/null 2>&1 || restore_exit=$?

if [[ $restore_exit -ne 0 ]]; then
  echo "[verify-backup] ERROR: Restore to temp database failed (exit ${restore_exit})"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c "DROP DATABASE IF EXISTS \"${TEMP_DB}\";" >/dev/null
  exit 1
fi

# Verify tables exist
echo "[verify-backup] Checking required tables..."
MISSING=()
for table in "${REQUIRED_TABLES[@]}"; do
  EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEMP_DB" -tc "SELECT to_regclass('public.${table}');" | tr -d ' \n')
  if [[ -z "$EXISTS" || "$EXISTS" == "-" ]]; then
    MISSING+=("$table")
  fi
done

# Cleanup temp database
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c "DROP DATABASE \"${TEMP_DB}\";" >/dev/null

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "[verify-backup] FAILED: Missing tables: ${MISSING[*]}"
  exit 1
fi

echo "[verify-backup] SUCCESS: Backup integrity verified. All required tables present."
