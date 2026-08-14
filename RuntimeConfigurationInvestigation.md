# MITRA Runtime Configuration Investigation

## 1. Startup Sequence

- `src/main.ts` is the bootstrap entrypoint.
- `NestFactory.create(AppModule, { logger })` initializes the Nest application.
- `src/app.module.ts` imports:
  - `ConfigModule.forRoot({ isGlobal: true })`
  - `TypeOrmModule.forRootAsync(...)`
- `SchemaIntegrityService` is registered as a top-level provider in `AppModule.providers`.
- As part of Nest module initialization, `SchemaIntegrityService.onModuleInit()` runs after the TypeORM DataSource is created and before the app listens.
- There is no separate `AppBootstrapService`; startup is handled directly in `main.ts`.

## 2. Runtime Configuration

### Active runtime config loaded in probe

- `NODE_ENV=test`
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USERNAME=mitra_admin`
- `DB_NAME=mitra_v2_test`
- `DB_PASSWORD=mitra_admin`
- `DB_SYNC=false`
- `DB_LOGGING=false`
- `DB_SSL=false`

### Config path

- Runtime uses `ConfigModule.forRoot()`.
- In Jest E2E mode, `test/jest.e2e.setup.ts` sets `process.env.NODE_ENV='test'` and overrides `DB_NAME` to `mitra_v2_test`.
- `DB_PASSWORD` is intentionally not set in `jest.e2e.setup.ts`; it is expected to come from `.env` or from the environment.

### Schema validator config path

- `src/database/scripts/validate-schema.ts` uses `AppDataSource`.
- `src/database/data-source.ts` loads `.env` via `dotenv.config({ path: join(__dirname, '../../.env') })`.
- When `DB_NAME` is not explicitly set, `AppDataSource` defaults to `mitra_v2`.

## 3. Database Connection

### Runtime application probe

A temporary runtime probe was executed with:
- `DB_NAME=mitra_v2_test`
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USERNAME=mitra_admin`
- `DB_PASSWORD=mitra_admin`

Result:
- `current_database() = mitra_v2_test`
- `PostgreSQL 18.4` on Windows
- `information_schema.tables` count = `0`
- `audit_logs` table exists = `false`
- `typeorm_migrations` table exists = `false`
- Databases visible: `mitra_v2`, `mitra_v2_test`

## 4. Migration History

- The runtime probe confirmed that `mitra_v2_test` contains no application tables and no `typeorm_migrations` table.
- Therefore the runtime application is connecting to an empty/uninitialized database.

## 5. Schema Validator Execution Path

- The schema validator is a separate script from the runtime app.
- It uses `AppDataSource` from `src/database/data-source.ts` and loads `.env` explicitly.
- In the default case, it targets `DB_NAME=mitra_v2`.
- The runtime path uses `DB_NAME=mitra_v2_test` under test environment overrides.

## 6. Comparison with `schema:validate`

### `schema:validate` on default environment

- When run without overriding `DB_NAME`, the validator successfully passed against `mitra_v2`.
- This explains the earlier positive result.

### `schema:validate` against `mitra_v2_test`

- When run with `DB_NAME=mitra_v2_test`, the validator fails catastrophically.
- The report shows `Tables in DB: 0` and every entity table missing.
- This matches the runtime startup failure on `mitra_v2_test`.

## 7. Proven Root Cause

- The runtime application and the earlier `schema:validate` result were not using the same database.
- `schema:validate` passed against the development DB (`mitra_v2`), while the runtime app under test uses `mitra_v2_test`.
- `mitra_v2_test` is currently empty/uninitialized, so `SchemaIntegrityService` fails because required application tables do not exist.
- This is a runtime configuration / database initialization issue, not a schema drift issue.

## 8. Recommended Fix

- Ensure the application startup environment is pointing at a fully-migrated `mitra_v2_test` database.
- Confirm the E2E setup script actually populates `mitra_v2_test` on the same Postgres instance that the runtime process uses.
- Verify that `DB_PASSWORD` is set for `mitra_admin` in the runtime environment when `NODE_ENV=test`.
- If `pretest:e2e` is intended to prepare `mitra_v2_test`, inspect why the database created in `bash` is not visible or persisted to the runtime process.

## Evidence Files

- `RuntimeConfigurationInvestigation.md` (this file)
- `mitra-backend/probe-db.js` (probe script used to inspect Windows runtime DB)
