#!/usr/bin/env bash
set -euo pipefail

# MITRA v3.2 — PostgreSQL Restore Script
# Restores a database from a gzip-compressed pg_dump file.

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

usage() {
  echo "Usage: $0 <path-to-backup.sql.gz> [target-db-name]"
  echo "  target-db-name defaults to the original DB_NAME if not provided."
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-$DB_NAME}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[restore-postgres] ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Confirm destructive action
echo ""
echo "⚠️  WARNING: This will DROP and RECREATE database '${TARGET_DB}'"
echo "   Backup file: ${BACKUP_FILE}"
echo ""
read -r -p "Type RESTORE to confirm: " CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "[restore-postgres] Restore cancelled."
  exit 0
fi

echo "[restore-postgres] Restoring ${BACKUP_FILE} to ${TARGET_DB}..."

export PGPASSWORD="$DB_PASSWORD"

# Create target database if it doesn't exist
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB}'" | grep -q 1 || \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c "CREATE DATABASE \"${TARGET_DB}\";"

# Drop connections and restore
gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TARGET_DB" --set ON_ERROR_STOP=on

echo "[restore-postgres] Restore completed successfully."
