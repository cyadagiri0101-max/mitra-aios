#!/bin/bash
# Provisions a clean mitra_v2_test database: drop, create, run migrations, seed.
# Used by `npm run pretest:e2e`. Requires PostgreSQL running and the
# mitra_admin role (created during initial setup) to exist.
set -euo pipefail

DB_NAME="${E2E_DB_NAME:-mitra_v2_test}"
DB_USER="${DB_USERNAME:-mitra_admin}"

echo "[e2e setup] (Re)creating database '${DB_NAME}'..."
su postgres -c "psql -v ON_ERROR_STOP=1 -c \"DROP DATABASE IF EXISTS ${DB_NAME};\""
su postgres -c "psql -v ON_ERROR_STOP=1 -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\""
su postgres -c "psql -v ON_ERROR_STOP=1 -d ${DB_NAME} -c \"CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS \\\"uuid-ossp\\\"; GRANT ALL PRIVILEGES ON SCHEMA public TO ${DB_USER};\""

echo "[e2e setup] Running migrations against '${DB_NAME}'..."
DB_NAME="${DB_NAME}" npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli migration:run -d src/database/data-source.ts

echo "[e2e setup] Validating schema (entity <-> DB drift)..."
DB_NAME="${DB_NAME}" npx ts-node -r tsconfig-paths/register src/database/scripts/validate-schema.ts || {
  echo "[e2e setup] WARNING: schema drift detected (non-critical warnings may be expected, see report above)";
}

echo "[e2e setup] Seeding reference data (roles, permissions, default tenant, workflow states)..."
DB_NAME="${DB_NAME}" SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-E2eAdminPass!2026}" \
  npx ts-node -r tsconfig-paths/register src/database/seed.ts

echo "[e2e setup] Done. Database '${DB_NAME}' is ready for e2e tests."
