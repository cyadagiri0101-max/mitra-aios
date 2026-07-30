# Verification Report — Sprint 1.1 Hardening

**Role:** Independent Release Verification Engineer
**Date:** 2026-07-29
**Commit:** `ee72c60`
**Scope:** Sprint 1.1 production hardening: repository cleanup, release automation, E2E tests, permission seeding, reproducibility

---

## Checklist

| # | Requirement | Status | Finding |
|---|-------------|--------|---------|
| 1 | Repository cleanup | **PASS** | .gitignore covers all required patterns. Generated artifacts deleted. Obsolete reports archived. Only 4 already-tracked `FINAL_*` files remain (see F3). |
| 2 | Release automation (CI/CD) | **PASS** | Workflow `release-check.yml` covers build, lint, migrate, seed, test, probe, frontend build. Service dependencies configured. Env var inheritance correct. |
| 3 | E2E tests | **PASS** | `commercial.e2e-spec.ts` contains 16 well-structured tests covering full Customer→Contact→Enquiry→Quotation→Project workflow. Module path mapping configured in jest-e2e.json. |
| 4 | Permission seeding | **FAIL** | Migration 0010 references `security.*` schema that does not exist. Tables are in `public` schema. Migration will fail at runtime. (See F1, F2) |
| 5 | Reproducibility (README) | **PASS (with caveats)** | README updated with setup instructions. 4 broken links need fixing. (See F4) |
| 6 | No regression | **PASS** | Existing seed.ts, migrations 0000-0009, and entities remain unmodified. New migration is additive. |
| 7 | Git hygiene | **PASS** | Working tree clean. No generated/orphan files in root. Single commit `ee72c60`. |

---

## Findings

### F1 — CRITICAL: Permission seed migration references non-existent `security` schema

**File:** `mitra-backend/src/database/migrations/1700000000010-PermissionSeed.ts`

**Description:**
The migration uses fully-qualified table references with `security.` schema prefix:
- `INSERT INTO security.roles (...)`
- `INSERT INTO security.permissions (...)`
- `INSERT INTO security.role_permissions (...)`

However, no migration creates the `security` schema. The InitialSchema migration (`1700000000000`) creates tables without schema prefix:
- `CREATE TABLE IF NOT EXISTS "roles"` → creates `public.roles`
- `CREATE TABLE IF NOT EXISTS "permissions"` → creates `public.permissions`
- `CREATE TABLE IF NOT EXISTS "role_permissions"` → creates `public.role_permissions`

TypeORM entities also define tables without schema prefix:
- `@Entity('roles')` → maps to `public.roles`
- `@Entity('permissions')` → maps to `public.permissions`
- `@Entity('role_permissions')` → maps to `public.role_permissions`

**Impact:** Running `npm run migration:run` will fail at migration 0010 with `ERROR: schema "security" does not exist`. The CI/CD pipeline will be blocked at the migration step.

**Recommendation:** Either:
1. Remove the `security.` prefix from all SQL in migration 0010, OR
2. Add `CREATE SCHEMA IF NOT EXISTS security;` at the top of the migration's `up()` method, and adjust entity decorators to `@Entity({ schema: 'security', name: 'roles' })`

### F2 — MEDIUM: Duplicate seeding logic

**File:** `mitra-backend/src/database/seed.ts` vs `mitra-backend/src/database/migrations/1700000000010-PermissionSeed.ts`

**Description:**
The existing `seed.ts` script already seeds roles, permissions, and role-permission mappings using TypeORM entity repositories. The new migration 0010 duplicates this logic using raw SQL. This creates two code paths for the same data, increasing maintenance burden and risking divergence.

**Impact:** Low runtime impact due to `ON CONFLICT DO NOTHING`. But the `down()` method will only undo migration 0010's inserts (in `security.*` schema), not `seed.ts` inserts (in `public.*` schema), making rollback inconsistent.

**Recommendation:** Consolidate to a single seed approach. Either:
1. Remove migration 0010 and rely solely on `seed.ts` (run after migrations), OR
2. Remove the seed from `seed.ts` and use migration 0010 as the canonical source

### F3 — MEDIUM: Already-tracked `FINAL_*` files

**Description:**
Files `FINAL_ACCEPTANCE_REPORT.md`, `FINAL_DELIVERY_REPORT.md`, `FINAL_PROJECT_STATUS.md`, `FINAL_SECURITY_REPORT.md` are listed in .gitignore but remain git-tracked because they were added before the .gitignore update.

**Impact:** These files will still appear in `git status` and be included in clones/checkouts despite being in .gitignore.

**Recommendation:** Run `git rm --cached` on these files in a follow-up commit.

### F4 — MINOR: Broken README links

**File:** `README.md`

**Description:**
4 documentation links reference files under `docs/` when the actual files are at the repository root.

| Broken link | Correct location |
|-------------|------------------|
| `docs/API_STANDARDS.md` | `API_STANDARDS.md` |
| `docs/DB_SCHEMAS.md` | `DB_SCHEMAS.md` |
| `docs/PERMISSION_MODEL.md` | `PERMISSION_MODEL.md` |
| `docs/SECURITY_ARCHITECTURE.md` | `SECURITY_ARCHITECTURE.md` |

**Impact:** Readers clicking these links will get 404 errors in their file system or on GitHub.

**Recommendation:** Update links to point to the root-level files.

### F5 — LOW: SQL string interpolation in probe script

**File:** `scripts/workflow_certification_probe.py` (lines 165-170)

**Description:**
The probe script uses Python `%` string formatting to build SQL queries instead of parameterized queries.

**Impact:** Low — this is a CI/test script executed in a controlled environment against CI-only data.

**Recommendation:** Use parameterized queries via `psycopg2` or `asyncpg` instead of shelling out to `psql` with formatted strings.

### F6 — INFO: Plaintext CI credentials

**File:** `.github/workflows/release-check.yml`

**Description:**
`JWT_SECRET` and `SEED_ADMIN_PASSWORD` are defined as plaintext strings in the workflow YAML. The JWT secret placeholder `ci-jwt-secret-do-not-use-in-prod` is explicitly labelled as CI-only, mitigating risk.

**Impact:** Minimal for CI-only workflow, but this pattern must not be replicated in deployment workflows.

**Recommendation:** Use `${{ secrets.JWT_SECRET }}` for any production-facing workflow.

---

## Summary

| Severity | Count | Action Required Before Release |
|----------|-------|-------------------------------|
| CRITICAL | 1 | Yes — F1 blocks migration/CI |
| MEDIUM | 2 | Recommended — F2, F3 |
| MINOR | 1 | Recommended — F4 |
| LOW | 1 | Optional — F5 |
| INFO | 1 | For awareness — F6 |
