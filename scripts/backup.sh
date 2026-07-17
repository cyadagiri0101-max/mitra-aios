#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  MITRA Automated Backup Script — PostgreSQL + MinIO
#
#  Run manually or via cron:
#    ./scripts/backup.sh full          # Full backup (DB + MinIO)
#    ./scripts/backup.sh db            # PostgreSQL only
#    ./scripts/backup.sh minio         # MinIO documents only
#    ./scripts/backup.sh verify        # Verify last backup integrity
#
#  Environment (from .env):
#    BACKUP_DIR       — local backup directory (default: ./backups)
#    BACKUP_RETENTION_DAYS — how many days to keep (default: 30)
#    S3_BACKUP_BUCKET — optional: S3/MinIO bucket for offsite copies
#    MINIO_BACKUP_BUCKET — optional: MinIO bucket for cross-region backup
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

# Load .env if present
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

# ── Defaults ──────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_PREFIX=$(date +%Y%m%d)
TODAY=$(date +%Y-%m-%d)

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-mitra_admin}"
DB_NAME="${DB_NAME:-mitra_v2}"
DB_PASS="${DB_PASSWORD:-}"

MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-}"
MINIO_BUCKET="${MINIO_BUCKET:-mitra-documents}"
MINIO_USE_SSL="${MINIO_USE_SSL:-false}"

mkdir -p "${BACKUP_DIR}/db"
mkdir -p "${BACKUP_DIR}/minio"
mkdir -p "${BACKUP_DIR}/logs"

LOG_FILE="${BACKUP_DIR}/logs/backup_${TIMESTAMP}.log"
exec > >(tee -a "${LOG_FILE}")
exec 2>&1

echo "═══════════════════════════════════════════════════════════════════════"
echo "  MITRA Backup — ${TODAY} ${TIMESTAMP}"
echo "  Mode: ${1:-full}"
echo "═══════════════════════════════════════════════════════════════════════"

# ── Helpers ───────────────────────────────────────────────────────────────────

fail() {
  echo "❌ ERROR: $1"
  echo "{\"status\":\"failed\",\"error\":\"$1\",\"timestamp\":\"$(date -Iseconds)\"}" > "${BACKUP_DIR}/last_status.json"
  exit 1
}

success() {
  echo "✅ $1"
}

db_backup() {
  echo ""
  echo "── PostgreSQL Backup ──────────────────────────────────────────────────"
  local dump_file="${BACKUP_DIR}/db/mitra_v2_${TIMESTAMP}.sql.gz"

  if command -v docker &> /dev/null && docker compose ps | grep -q postgres; then
    echo "Using docker compose exec..."
    docker compose exec -T postgres \
      pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-acl \
      | gzip > "${dump_file}" || fail "PostgreSQL dump failed"
  elif command -v pg_dump &> /dev/null; then
    echo "Using local pg_dump..."
    PGPASSWORD="${DB_PASS}" pg_dump \
      -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
      --no-owner --no-acl \
      | gzip > "${dump_file}" || fail "PostgreSQL dump failed"
  else
    fail "Neither docker nor pg_dump available. Cannot backup database."
  fi

  local size=$(du -h "${dump_file}" | cut -f1)
  success "Database backup: ${dump_file} (${size})"
  echo "DB_BACKUP=${dump_file}" >> "${BACKUP_DIR}/last_backup.env"
}

db_verify() {
  echo ""
  echo "── Verify Database Backup ───────────────────────────────────────────"
  local latest=$(ls -t ${BACKUP_DIR}/db/mitra_v2_*.sql.gz 2>/dev/null | head -1)
  if [[ -z "${latest}" ]]; then
    fail "No database backup found to verify"
  fi

  echo "Checking: ${latest}"
  if zcat "${latest}" | head -50 | grep -q "PostgreSQL database dump"; then
    success "Database backup integrity verified"
  else
    fail "Database backup appears corrupted or incomplete"
  fi
}

minio_backup() {
  echo ""
  echo "── MinIO Backup ───────────────────────────────────────────────────────"
  local minio_dir="${BACKUP_DIR}/minio/${DATE_PREFIX}"
  mkdir -p "${minio_dir}"

  if command -v docker &> /dev/null && docker compose ps | grep -q minio; then
    echo "Using docker compose exec mc..."
    docker compose exec minio \
      mc mirror local/${MINIO_BUCKET} /tmp/minio-backup || fail "MinIO mirror failed"
    docker cp "$(docker compose ps -q minio):/tmp/minio-backup" "${minio_dir}/" || fail "MinIO copy failed"
  elif command -v mc &> /dev/null; then
    echo "Using local mc mirror..."
    mc mirror "${MINIO_ENDPOINT}/${MINIO_BUCKET}" "${minio_dir}/" || fail "MinIO mirror failed"
  else
    echo "⚠️  mc (MinIO client) not available. Skipping MinIO backup."
    echo "     Install: https://min.io/docs/minio/linux/reference/minio-mc.html"
    return 0
  fi

  local size=$(du -sh "${minio_dir}" | cut -f1)
  success "MinIO backup: ${minio_dir} (${size})"
  echo "MINIO_BACKUP=${minio_dir}" >> "${BACKUP_DIR}/last_backup.env"
}

retention_cleanup() {
  echo ""
  echo "── Retention Cleanup (${RETENTION_DAYS} days) ───────────────────────────────"
  local deleted=0

  # Delete old DB backups
  while IFS= read -r file; do
    rm -f "${file}"
    ((deleted++)) || true
  done < <(find "${BACKUP_DIR}/db" -name "mitra_v2_*.sql.gz" -mtime +${RETENTION_DAYS} 2>/dev/null)

  # Delete old MinIO backups
  while IFS= read -r dir; do
    rm -rf "${dir}"
    ((deleted++)) || true
  done < <(find "${BACKUP_DIR}/minio" -mindepth 1 -maxdepth 1 -type d -mtime +${RETENTION_DAYS} 2>/dev/null)

  # Delete old logs
  while IFS= read -r file; do
    rm -f "${file}"
  done < <(find "${BACKUP_DIR}/logs" -name "backup_*.log" -mtime +${RETENTION_DAYS} 2>/dev/null)

  success "Cleaned up ${deleted} old backup files/directories"
}

offsite_copy() {
  if [[ -n "${S3_BACKUP_BUCKET:-}" ]]; then
    echo ""
    echo "── Offsite Copy to S3 ───────────────────────────────────────────────"
    local latest_db=$(ls -t ${BACKUP_DIR}/db/mitra_v2_*.sql.gz 2>/dev/null | head -1)
    if [[ -n "${latest_db}" ]]; then
      aws s3 cp "${latest_db}" "s3://${S3_BACKUP_BUCKET}/mitra/db/" 2>/dev/null || \
        echo "⚠️  S3 copy failed (aws CLI not configured or no bucket)"
    fi
  fi
}

write_status() {
  local status="${1:-success}"
  local db_file=$(ls -t ${BACKUP_DIR}/db/mitra_v2_*.sql.gz 2>/dev/null | head -1)
  local db_size=""
  [[ -n "${db_file}" ]] && db_size=$(du -h "${db_file}" | cut -f1)

  cat > "${BACKUP_DIR}/last_status.json" <<EOF
{
  "status": "${status}",
  "timestamp": "$(date -Iseconds)",
  "backup_dir": "${BACKUP_DIR}",
  "db_backup": "${db_file}",
  "db_size": "${db_size}",
  "retention_days": ${RETENTION_DAYS}
}
EOF
}

# ── Main ─────────────────────────────────────────────────────────────────────

MODE="${1:-full}"

case "${MODE}" in
  full)
    db_backup
    db_verify
    minio_backup
    retention_cleanup
    offsite_copy
    write_status "success"
    success "Full backup complete. Log: ${LOG_FILE}"
    ;;
  db)
    db_backup
    db_verify
    retention_cleanup
    write_status "success"
    success "Database backup complete. Log: ${LOG_FILE}"
    ;;
  minio)
    minio_backup
    retention_cleanup
    write_status "success"
    success "MinIO backup complete. Log: ${LOG_FILE}"
    ;;
  verify)
    db_verify
    success "Verification complete"
    ;;
  *)
    echo "Usage: $0 {full|db|minio|verify}"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Backup Summary: ${BACKUP_DIR}"
echo "  Latest status: ${BACKUP_DIR}/last_status.json"
echo "═══════════════════════════════════════════════════════════════════════"
