#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  MITRA Restore Script — PostgreSQL + MinIO
#
#  Usage:
#    ./scripts/restore.sh db <backup_file.sql.gz>          # Restore database
#    ./scripts/restore.sh minio <backup_dir>               # Restore MinIO documents
#    ./scripts/restore.sh full <db_backup> <minio_backup>  # Full restore
#
#  ⚠️  WARNING: Database restore DESTROYS existing data. Use with caution.
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-mitra_admin}"
DB_NAME="${DB_NAME:-mitra_v2}"
DB_PASS="${DB_PASSWORD:-}"

MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_BUCKET="${MINIO_BUCKET:-mitra-documents}"

BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"

fail() {
  echo "❌ ERROR: $1"
  exit 1
}

success() {
  echo "✅ $1"
}

db_restore() {
  local backup_file="$1"
  
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════"
  echo "  DATABASE RESTORE"
  echo "  Source: ${backup_file}"
  echo "  Target: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  echo "═══════════════════════════════════════════════════════════════════════"
  echo ""
  echo "⚠️  WARNING: This will DROP and RECREATE the database ${DB_NAME}."
  echo "    All current data will be lost."
  echo ""
  read -p "Type RESTORE to confirm: " confirm
  if [[ "${confirm}" != "RESTORE" ]]; then
    echo "Aborted."
    exit 0
  fi

  if [[ ! -f "${backup_file}" ]]; then
    fail "Backup file not found: ${backup_file}"
  fi

  echo ""
  echo "Step 1/4: Verifying backup file..."
  if zcat "${backup_file}" | head -50 | grep -q "PostgreSQL database dump"; then
    success "Backup file integrity verified"
  else
    fail "Backup file appears corrupted or is not a valid PostgreSQL dump"
  fi

  echo ""
  echo "Step 2/4: Dropping existing database..."
  if command -v docker &> /dev/null && docker compose ps | grep -q postgres; then
    docker compose exec -T postgres \
      psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
      || fail "Failed to drop database"
    docker compose exec -T postgres \
      psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};" \
      || fail "Failed to create database"
  else
    PGPASSWORD="${DB_PASS}" psql \
      -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
      -c "DROP DATABASE IF EXISTS ${DB_NAME};" || fail "Failed to drop database"
    PGPASSWORD="${DB_PASS}" psql \
      -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
      -c "CREATE DATABASE ${DB_NAME};" || fail "Failed to create database"
  fi
  success "Database ${DB_NAME} recreated"

  echo ""
  echo "Step 3/4: Restoring from backup..."
  if command -v docker &> /dev/null && docker compose ps | grep -q postgres; then
    zcat "${backup_file}" | docker compose exec -T postgres \
      psql -U "${DB_USER}" -d "${DB_NAME}" || fail "Restore failed"
  else
    zcat "${backup_file}" | PGPASSWORD="${DB_PASS}" psql \
      -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
      || fail "Restore failed"
  fi
  success "Database restore complete"

  echo ""
  echo "Step 4/4: Running migrations to ensure schema is current..."
  if command -v docker &> /dev/null && docker compose ps | grep -q backend; then
    docker compose exec backend npm run migration:run || fail "Migrations failed"
  fi
  success "Schema migrations applied"

  echo ""
  success "Database restore complete!"
  echo "  Backup source: ${backup_file}"
  echo "  Restored to: ${DB_NAME}"
}

minio_restore() {
  local backup_dir="$1"
  
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════"
  echo "  MINIO RESTORE"
  echo "  Source: ${backup_dir}"
  echo "  Target: ${MINIO_BUCKET}"
  echo "═══════════════════════════════════════════════════════════════════════"
  
  if [[ ! -d "${backup_dir}" ]]; then
    fail "Backup directory not found: ${backup_dir}"
  fi

  read -p "Type RESTORE to confirm MinIO restore: " confirm
  if [[ "${confirm}" != "RESTORE" ]]; then
    echo "Aborted."
    exit 0
  fi

  if command -v docker &> /dev/null && docker compose ps | grep -q minio; then
    docker cp "${backup_dir}/." "$(docker compose ps -q minio):/tmp/restore/" || fail "Copy to MinIO container failed"
    docker compose exec minio \
      mc mirror --overwrite /tmp/restore/ local/${MINIO_BUCKET} || fail "MinIO mirror failed"
  elif command -v mc &> /dev/null; then
    mc mirror --overwrite "${backup_dir}/" "${MINIO_ENDPOINT}/${MINIO_BUCKET}/" || fail "MinIO mirror failed"
  else
    fail "MinIO client (mc) not available. Cannot restore MinIO."
  fi

  success "MinIO restore complete"
}

list_backups() {
  echo ""
  echo "Available database backups:"
  ls -lh ${BACKUP_DIR}/db/mitra_v2_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  None found"
  
  echo ""
  echo "Available MinIO backups:"
  ls -d ${BACKUP_DIR}/minio/*/ 2>/dev/null | awk '{print "  " $1}' || echo "  None found"
}

# ── Main ─────────────────────────────────────────────────────────────────────

MODE="${1:-help}"

case "${MODE}" in
  db)
    [[ -z "${2:-}" ]] && { echo "Usage: $0 db <backup_file.sql.gz>"; exit 1; }
    db_restore "$2"
    ;;
  minio)
    [[ -z "${2:-}" ]] && { echo "Usage: $0 minio <backup_dir>"; exit 1; }
    minio_restore "$2"
    ;;
  full)
    [[ -z "${2:-}" || -z "${3:-}" ]] && { echo "Usage: $0 full <db_backup.sql.gz> <minio_backup_dir>"; exit 1; }
    db_restore "$2"
    minio_restore "$3"
    success "Full restore complete"
    ;;
  list)
    list_backups
    ;;
  *)
    echo "MITRA Restore Script"
    echo ""
    echo "Usage:"
    echo "  $0 db <backup_file.sql.gz>          # Restore database only"
    echo "  $0 minio <backup_dir>               # Restore MinIO documents only"
    echo "  $0 full <db_backup> <minio_backup>   # Full restore (DB + MinIO)"
    echo "  $0 list                             # List available backups"
    echo ""
    echo "⚠️  WARNING: Restore operations DESTROY existing data."
    echo "    Type 'RESTORE' when prompted to confirm."
    exit 1
    ;;
esac
