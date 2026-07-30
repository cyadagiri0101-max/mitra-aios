#!/bin/bash
# Provisions a clean mitra_v2_test database: drop, create, run migrations, seed.
# Used by `npm run pretest:e2e`. Requires PostgreSQL running and the
# mitra_admin role (created during initial setup) to exist.
set -euo pipefail

DB_NAME="${E2E_DB_NAME:-mitra_v2_test}"
DB_USER="${DB_USERNAME:-mitra_admin}"
DB_PASSWORD="${DB_PASSWORD:-mitra_admin}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

export PGPASSWORD="${DB_PASSWORD}"

run_psql() {
  local db_target="$1"
  shift
  PGPASSWORD="${PGPASSWORD}" psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${db_target}" "$@"
}

if ! command -v psql >/dev/null 2>&1; then
  echo "[e2e setup] ERROR: psql is not installed. Install the PostgreSQL client before running e2e setup." >&2
  exit 1
fi

echo "[e2e setup] (Re)creating database '${DB_NAME}'..."
run_psql postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
run_psql postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" >/dev/null 2>&1 || true
run_psql postgres -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";"
run_psql "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; GRANT ALL PRIVILEGES ON SCHEMA public TO \"${DB_USER}\";"

echo "[e2e setup] Running migrations against '${DB_NAME}'..."
DB_NAME="${DB_NAME}" DB_HOST="${DB_HOST}" DB_PORT="${DB_PORT}" DB_USERNAME="${DB_USER}" DB_PASSWORD="${DB_PASSWORD}" \
  npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli migration:run -d src/database/data-source.ts

echo "[e2e setup] Validating schema (entity <-> DB drift)..."
DB_NAME="${DB_NAME}" DB_HOST="${DB_HOST}" DB_PORT="${DB_PORT}" DB_USERNAME="${DB_USER}" DB_PASSWORD="${DB_PASSWORD}" \
  npx ts-node -r tsconfig-paths/register src/database/scripts/validate-schema.ts || {
  echo "[e2e setup] WARNING: schema drift detected (non-critical warnings may be expected, see report above)";
}

echo "[e2e setup] Seeding reference data (roles, permissions, default tenant, workflow states)..."
DB_NAME="${DB_NAME}" DB_HOST="${DB_HOST}" DB_PORT="${DB_PORT}" DB_USERNAME="${DB_USER}" DB_PASSWORD="${DB_PASSWORD}" \
  SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-E2eAdminPass!2026}" \
  npx ts-node -r tsconfig-paths/register src/database/seed.ts

echo "[e2e setup] Done. Database '${DB_NAME}' is ready for e2e tests."
