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

# Ensure Windows-native node.exe and TypeORM CLI receive the exact same DB env.
export DB_NAME
export DB_USER
export DB_USERNAME="${DB_USER}"
export DB_PASSWORD
export DB_HOST
export DB_PORT
export NODE_ENV="test"
export PGPASSWORD="${DB_PASSWORD}"

if [[ -n "${WSLENV:-}" ]]; then
  export WSLENV="${WSLENV}:DB_HOST:DB_PORT:DB_USERNAME:DB_USER:DB_PASSWORD:DB_NAME:PGPASSWORD:NODE_ENV"
else
  export WSLENV="DB_HOST:DB_PORT:DB_USERNAME:DB_USER:DB_PASSWORD:DB_NAME:PGPASSWORD:NODE_ENV"
fi

run_psql() {
  local db_target="$1"
  shift
  PGPASSWORD="${PGPASSWORD}" psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${db_target}" "$@"
}

NODE_CMD=""
if command -v node >/dev/null 2>&1; then
  NODE_CMD="node"
elif command -v node.exe >/dev/null 2>&1; then
  NODE_CMD="node.exe"
elif [[ -x "/mnt/c/Program Files/nodejs/node.exe" ]]; then
  NODE_CMD="/mnt/c/Program Files/nodejs/node.exe"
elif [[ -x "/c/Program Files/nodejs/node.exe" ]]; then
  NODE_CMD="/c/Program Files/nodejs/node.exe"
fi

if command -v psql >/dev/null 2>&1; then
  USE_PSQL=true
elif [[ -n "${NODE_CMD}" ]]; then
  USE_PSQL=false
  echo "[e2e setup] WARNING: psql is not installed. Falling back to Node.js pg client for DB provisioning."
else
  echo "[e2e setup] ERROR: neither psql nor node is available. Install PostgreSQL client or Node.js before running e2e setup." >&2
  exit 1
fi

TS_NODE_BIN="./node_modules/.bin/ts-node"
if [[ ! -x "${TS_NODE_BIN}" ]]; then
  TS_NODE_BIN="$(pwd)/node_modules/.bin/ts-node"
fi

TS_NODE_JS_UNIX="$(pwd)/node_modules/ts-node/dist/bin.js"
TS_NODE_JS="${TS_NODE_JS_UNIX}"
if [[ "${NODE_CMD}" == "node.exe" || "${NODE_CMD}" == "/mnt/c/Program Files/nodejs/node.exe" || "${NODE_CMD}" == "/c/Program Files/nodejs/node.exe" ]]; then
  if command -v wslpath >/dev/null 2>&1; then
    TS_NODE_JS="$(wslpath -m "${TS_NODE_JS_UNIX}")"
  else
    TS_NODE_JS="${TS_NODE_JS_UNIX}"
  fi
fi

run_sql() {
  local db_target="$1"
  shift
  local query="$*"

  if [[ "${USE_PSQL}" == "true" ]]; then
    run_psql "${db_target}" -c "${query}"
    return
  fi

  "${NODE_CMD}" - "${db_target}" "${query}" <<'NODE'
const { Client } = require('pg');
const args = process.argv.slice(2);
const dbTarget = args[0];
const sql = args.slice(1).join(' ');
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || process.env.DB_USER || 'mitra_admin',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  database: dbTarget,
});
(async () => {
  try {
    await client.connect();
    await client.query(sql);
    await client.end();
  } catch (err) {
    console.error('[e2e setup] node-sql error:', err);
    process.exit(1);
  }
})();
NODE
}

if [[ ! -x "${TS_NODE_BIN}" ]]; then
  echo "[e2e setup] ERROR: ts-node binary not found in ./node_modules. Run npm install first." >&2
  exit 1
fi

echo "[e2e setup] (Re)creating database '${DB_NAME}'..."
run_sql postgres "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
run_sql postgres "DROP DATABASE IF EXISTS \"${DB_NAME}\";" >/dev/null 2>&1 || true
run_sql postgres "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";"
run_sql "${DB_NAME}" "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# pgvector is optional. If the server does not have the extension installed,
# continue the E2E setup and rely on the application's pgvector fallback.
run_sql_allow_vector() {
  local db_target="$1"
  if [[ "${USE_PSQL}" == "true" ]]; then
    set +e
    run_psql "${db_target}" -c "CREATE EXTENSION IF NOT EXISTS vector;"
    local rc=$?
    set -e
    if [[ ${rc} -ne 0 ]]; then
      echo "[e2e setup] WARNING: pgvector extension unavailable; proceeding with text fallback."
    fi
    return
  fi

  "${NODE_CMD}" - "${db_target}" "CREATE EXTENSION IF NOT EXISTS vector;" <<'NODE'
const { Client } = require('pg');
const args = process.argv.slice(2);
const dbTarget = args[0];
const sql = args.slice(1).join(' ');
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || process.env.DB_USER || 'mitra_admin',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  database: dbTarget,
});
(async () => {
  try {
    await client.connect();
    await client.query(sql);
    await client.end();
  } catch (err) {
    if (err && err.code === '0A000') {
      console.error('[e2e setup] WARNING: pgvector extension unavailable; proceeding with text fallback.');
      process.exit(0);
    }
    console.error('[e2e setup] node-sql error:', err);
    process.exit(1);
  }
})();
NODE
}

run_sql_allow_vector "${DB_NAME}"
run_sql "${DB_NAME}" "GRANT ALL PRIVILEGES ON SCHEMA public TO \"${DB_USER}\";"

if [[ -z "${TS_NODE_JS:-}" ]]; then
  TS_NODE_JS="$(pwd)/node_modules/ts-node/dist/bin.js"
  if [[ "${NODE_CMD}" == "node.exe" || "${NODE_CMD}" == "/mnt/c/Program Files/nodejs/node.exe" || "${NODE_CMD}" == "/c/Program Files/nodejs/node.exe" ]]; then
    if command -v wslpath >/dev/null 2>&1; then
      TS_NODE_JS="$(wslpath -w "${TS_NODE_JS}")"
    fi
  fi
fi

if [[ "${NODE_CMD}" == "node.exe" || "${NODE_CMD}" == "/mnt/c/Program Files/nodejs/node.exe" || "${NODE_CMD}" == "/c/Program Files/nodejs/node.exe" ]]; then
  if [[ ! -f "${TS_NODE_JS_UNIX}" && ! -f "${TS_NODE_JS}" ]]; then
    echo "[e2e setup] ERROR: ts-node JS entrypoint not found at ${TS_NODE_JS_UNIX} or ${TS_NODE_JS}. Run npm install first." >&2
    exit 1
  fi
else
  if [[ ! -f "${TS_NODE_JS}" ]]; then
    echo "[e2e setup] ERROR: ts-node JS entrypoint not found at ${TS_NODE_JS}. Run npm install first." >&2
    exit 1
  fi
fi

echo "[e2e setup] Running migrations against '${DB_NAME}'..."
DB_NAME="${DB_NAME}" DB_HOST="${DB_HOST}" DB_PORT="${DB_PORT}" DB_USERNAME="${DB_USER}" DB_PASSWORD="${DB_PASSWORD}" \
  "${NODE_CMD}" "${TS_NODE_JS}" -r tsconfig-paths/register ./node_modules/typeorm/cli migration:run -d src/database/data-source.ts

echo "[e2e setup] Validating schema (entity <-> DB drift)..."
DB_NAME="${DB_NAME}" DB_HOST="${DB_HOST}" DB_PORT="${DB_PORT}" DB_USERNAME="${DB_USER}" DB_PASSWORD="${DB_PASSWORD}" \
  "${NODE_CMD}" "${TS_NODE_JS}" -r tsconfig-paths/register src/database/scripts/validate-schema.ts || {
  echo "[e2e setup] WARNING: schema drift detected (non-critical warnings may be expected, see report above)";
}

echo "[e2e setup] Seeding reference data (roles, permissions, default tenant, workflow states)..."
DB_NAME="${DB_NAME}" DB_HOST="${DB_HOST}" DB_PORT="${DB_PORT}" DB_USERNAME="${DB_USER}" DB_PASSWORD="${DB_PASSWORD}" \
  SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-E2eAdminPass!2026}" \
  "${NODE_CMD}" "${TS_NODE_JS}" -r tsconfig-paths/register src/database/seed.ts

echo "[e2e setup] Done. Database '${DB_NAME}' is ready for e2e tests."
