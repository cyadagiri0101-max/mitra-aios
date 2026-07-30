# Verification Evidence — Sprint 1.1 Hardening

Audit timestamp: 2026-07-29
Commit under review: `ee72c60`
Branch: `main`

---

## 1. Repository Cleanup

### 1.1 .gitignore coverage
```
.env, .env.local, .env.*.local, *.env
node_modules/, npm-debug.log*
dist/, build/, .next/
*.tsbuildinfo, *.js.map, *.d.ts.map
coverage/, .nyc_output/
.vscode/, .idea/, *.swp, *.swo, .DS_Store, Thumbs.db
__pycache__/, *.pyc, .coverage, *.egg-info/, .mypy_cache/, .pytest_cache/, .ruff_cache/
postgres-data/, redis-data/, minio-data/, ollama-models/
npm-audit-report.json, npm-audit-prod-report.json
.ai/index/index.json, .ai/index/summary.json, .ai/index/, .ai/
FINAL_ENGINEERING_REPORT.md, FINAL_REGRESSION_REPORT.md, FINAL_BENCHMARK_REPORT.md, FINAL_RELEASE_REPORT.md
*.log, *.err
__e2e_check.ts, check-*.js, temp data/
RELEASE/
```
**Result:** PASS — all required patterns covered.

### 1.2 Git working tree
```
git status: clean (0 staged, 0 unstaged, 0 untracked)
```
**Result:** PASS — no orphan or generated files remain in the working tree.

### 1.3 Archive move
```
Files in docs/archive/: 23
Remaining SPRINT1_* in root: 0
Remaining 0*_CommercialDomain*.md in root: 0
```
**Result:** PASS — all obsolete reports moved to archive.

### 1.4 FINAL_* files still git-tracked
```
git ls-files | grep FINAL_
→ FINAL_ACCEPTANCE_REPORT.md
→ FINAL_DELIVERY_REPORT.md
→ FINAL_PROJECT_STATUS.md
→ FINAL_SECURITY_REPORT.md
```
**Result:** WARNING — these 4 files are in .gitignore but already tracked. .gitignore does not affect already-tracked files. Needs `git rm --cached`.

---

## 2. Release Automation (CI/CD)

### 2.1 Workflow triggers
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```
**Result:** PASS — correct trigger conditions.

### 2.2 Pipeline stages
| Stage | Command | working-directory | Status |
|-------|---------|-------------------|--------|
| Python lint | `ruff check src/` | root | ✅ |
| Python tests | `pytest tests/ --cov=aios --cov-fail-under=80` | root | ✅ |
| Backend build | `npm run build` | mitra-backend | ✅ |
| Backend unit tests | `npm test -- --passWithNoTests` | mitra-backend | ✅ |
| Migrations | `npm run migration:run` | mitra-backend | ✅ |
| Seed | `node dist/database/seed.js` | mitra-backend | ✅ |
| Server startup | `node dist/main.js &; sleep 5; curl health` | mitra-backend | ✅ |
| E2E tests | `npm run test:e2e` | mitra-backend | ✅ |
| Probe | `python scripts/workflow_certification_probe.py` | root | ✅ |
| Frontend build | `npm run build` | mitra-frontend | ✅ |

### 2.3 Service dependencies
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: [5432:5432]
```
**Result:** PASS — Postgres service configured with health check.

### 2.4 Env var inheritance
| Variable | Workflow-level | Override context | Inherited by |
|----------|---------------|------------------|--------------|
| DB_HOST | `localhost` | — | ✅ all steps |
| DB_PORT | `5432` | — | ✅ all steps |
| DB_NAME | `mitra_v2_test` | migration, seed, server, e2e, probe | ✅ |
| DB_USERNAME | `mitra_admin` | migration, seed, server, e2e, probe | ✅ |
| DB_PASSWORD | `mitra_admin` | migration, seed, server, e2e, probe | ✅ |
| JWT_SECRET | `ci-jwt-secret-do-not-use-in-prod` | — | ✅ all steps |
| SEED_ADMIN_PASSWORD | `E2eAdminPass!2026` | seed, e2e, probe | ✅ |

**Result:** PASS — all env vars properly inherited.

### 2.5 Security: secrets exposure
```
JWT_SECRET: ci-jwt-secret-do-not-use-in-prod  (plaintext in workflow)
No ${{ secrets.* }} tokens used
```
**WARNING:** JWT secret is a placeholder string, not a GitHub secret. Acceptable for CI-only workflow because it is explicitly labelled "do-not-use-in-prod". Must use `${{ secrets.JWT_SECRET }}` for deploy-time workflows.

---

## 3. E2E Tests

### 3.1 Test file
- **File:** `mitra-backend/test/commercial.e2e-spec.ts`
- **Test framework:** Jest + supertest
- **Test app helper:** `createTestApp()` from `./utils/test-app`
- **Test count:** 1 `describe` block, 16 `it` blocks
- **File size:** Read and verified full content

### 3.2 Test coverage — commercial workflow

| # | Test | Endpoint | Status Transition |
|---|------|----------|-------------------|
| 1 | Create customer with primary contact | POST /api/commercial/customers | creation |
| 2 | Create enquiry (RFQ) | POST /api/commercial/enquiries | → DRAFT |
| 3 | Submit enquiry | POST /api/commercial/enquiries/:id/submit | DRAFT → SUBMITTED |
| 4 | Review enquiry | POST /api/commercial/enquiries/:id/review | SUBMITTED → UNDER_REVIEW |
| 5 | Create quotation from RFQ | POST /api/commercial/quotations | → DRAFT |
| 6 | Send quotation | POST /api/commercial/quotations/:id/send | DRAFT → SENT |
| 7 | Accept quotation → create project | POST /api/commercial/quotations/:id/accept | SENT → ACCEPTED + project |
| 8 | Read customer | GET /api/commercial/customers/:id | — |
| 9 | Read enquiry (status = CONVERTED) | GET /api/commercial/enquiries/:id | — |
| 10 | Read quotation (status = PROJECT_CREATED) | GET /api/commercial/quotations/:id | — |
| 11 | Read project (value = 1850000) | GET /api/project/:id | — |
| 12 | Duplicate customer allowed | POST /api/commercial/customers | business rule |
| 13 | Reject duplicate quotation accept | POST /api/commercial/quotations/:id/accept | should fail 400 |
| 14 | Orphan project creation | POST /api/project | allowed |
| 15 | RBAC: unauthenticated → 401 | GET /api/commercial/customers | security |
| 16 | Paginated listing | GET /api/commercial/customers?page=1&limit=10 | pagination |

### 3.3 imports & utilities
```typescript
import { createTestApp } from './utils/test-app';
```
Requires `test/utils/test-app.ts` to exist. Verified: file exists.

### 3.4 jest-e2e.json configuration
```
rootDir: ..
testRegex: .e2e-spec.ts$
testTimeout: 60000
maxWorkers: 1
moduleNameMapper: src/, @common/, @modules/, @database/, @app all mapped
```
**Result:** PASS — correct configuration for module resolution.

### 3.5 pretest:e2e hook
```
"pretest:e2e": "bash test/setup-test-db.sh"
```
**WARNING:** Uses `bash` directly. CI runs on `ubuntu-latest` where bash is available, so this works. The `setup-test-db.sh` script exists. However, the CI workflow already starts a fresh Postgres service + runs `migration:run` + `seed` before E2E tests, so this pretest hook may be redundant or could interfere.

---

## 4. Permission Seeding

### 4.1 Migration file
- **File:** `mitra-backend/src/database/migrations/1700000000010-PermissionSeed.ts`
- **Type:** TypeORM MigrationInterface (up/down)
- **Migration order position:** 10th (last), after 0008-CommercialDomainSprint1 and 0009-CommercialDomainForeignKeys

### 4.2 Roles seeded (11 total)
```
admin, manager, sales_rep, project_lead, engineer, production_planner,
operator, qa_inspector, qa_engineer, service_tech, viewer
```
**Cross-check vs PERMISSION_MODEL.md:**
✅ Match — all 11 roles in migration match the 11 roles defined in PERMISSION_MODEL.md

### 4.3 Permissions seeded (133 total)
Resources covered: `customer`, `contact`, `enquiry`, `quotation`, `project`,
`task`, `work_order`, `product`, `purchase_order`, `supplier`, `inventory`,
`quality_check`, `dispatch`, `invoice`, `payment`, `user`, `role`, `permission`,
`audit_log`, `report`, `dashboard`, `setting`, `tenant`, `system`

Each resource has granular actions (e.g. `customer:create`, `customer:read`,
`customer:update`, `customer:delete`, `customer:list`).

**Cross-check vs PERMISSION_MODEL.md:**
✅ All listed resources and roles from PERMISSION_MODEL.md are represented.

### 4.4 Down migration
The `down()` method:
```typescript
DELETE FROM security.role_permissions WHERE role_id = (SELECT id FROM security.roles WHERE name = $1)
DELETE FROM security.permissions
DELETE FROM security.roles WHERE is_system = TRUE
```
Implementation deletes system roles and all permissions.

### 4.5 CRITICAL FINDING: Schema mismatch

**Migration references `security.*` schema:**
```typescript
INSERT INTO security.roles (name, description, is_system) VALUES ($1, $2, TRUE) ...
INSERT INTO security.permissions (resource, action) VALUES ($1, $2) ...
INSERT INTO security.role_permissions (role_id, permission_id) ...
```

**InitialSchema migration creates tables without schema prefix (defaults to `public`):**
```typescript
CREATE TABLE IF NOT EXISTS "roles" ( ... )
CREATE TABLE IF NOT EXISTS "permissions" ( ... )
CREATE TABLE IF NOT EXISTS "role_permissions" ( ... )
```

**Entities also use no schema prefix:**
```typescript
@Entity('roles')
@Entity('permissions')
@Entity('role_permissions')
```

**No `CREATE SCHEMA security` exists anywhere in the codebase.**

**Impact:** Running `npm run migration:run` will fail at migration 0010 with:
```
ERROR: schema "security" does not exist
```

### 4.6 Duplicate seeding
- `seed.ts` already seeds roles, permissions, and role-permission mappings using TypeORM entity repository pattern
- Migration 0010 duplicates this using raw SQL with `security.` schema prefix
- The `ON CONFLICT DO NOTHING` clause prevents runtime insert errors
- But the `down()` delete of `security.*` tables will not roll back seed.ts-inserted data (stored in `public.*`)

---

## 5. Workflow Certification Probe

### 5.1 Script verification
- **File:** `scripts/workflow_certification_probe.py`
- **Lines:** 187
- **API base:** `os.environ.get('PROBE_API_BASE', 'http://localhost:3001/api')`
- **Auth:** Uses `os.environ.get('SEED_ADMIN_PASSWORD', 'E2eAdminPass!2026')`
- **DB connection:** Uses `psql` subprocess with env vars `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- **Workflow:** login → create customer → create enquiry → submit → review → create quotation → send → accept → read entities → verify DB → business rules

### 5.2 Security concerns
- Default credentials in fallback values (test script only, acceptable)
- SQL query uses Python `%` string interpolation (lines 165-170) instead of parameterized queries — **SQL injection risk** (minor, as it's a test script)

---

## 6. Reproducibility (README)

### 6.1 README.md — link validation
| Link in README | Actual location | Status |
|----------------|----------------|--------|
| docs/DEVELOPER_QUICKSTART.md | docs/DEVELOPER_QUICKSTART.md | ✅ |
| docs/Architecture.md | docs/Architecture.md | ✅ |
| docs/API_STANDARDS.md | API_STANDARDS.md (root) | ❌ BROKEN |
| docs/DB_SCHEMAS.md | DB_SCHEMAS.md (root) | ❌ BROKEN |
| docs/PERMISSION_MODEL.md | PERMISSION_MODEL.md (root) | ❌ BROKEN |
| docs/SECURITY_ARCHITECTURE.md | SECURITY_ARCHITECTURE.md (root) | ❌ BROKEN |
| docs/CLI.md | docs/CLI.md | ✅ |
| docs/API.md | docs/API.md | ✅ |
| docs/DeveloperGuide.md | docs/DeveloperGuide.md | ✅ |
| docs/ConfigurationGuide.md | docs/ConfigurationGuide.md | ✅ |
| docs/ReleaseNotes.md | docs/ReleaseNotes.md | ✅ |
| docs/MIGRATIONS.md | docs/MIGRATIONS.md | ✅ |
| LICENSE | LICENSE | ✅ |

**4 broken links found.** Files exist at root level but README references them as `docs/*`.

---

## 7. Migration Order Integrity

| Timestamp | Name | Creates |
|-----------|------|---------|
| 0000 | InitialSchema | tenants, roles, permissions, users, domain tables |
| 0001 | RefreshTokenAndVectorSearch | refresh_tokens, vector search |
| 0002 | FullDomainSchema | Additional domain tables |
| 0003 | DispatchPlans | Dispatch planning tables |
| 0004 | SchemaFixes | Schema fixes/alterations |
| 0005 | SupplierProductMasters | Supplier/product master data |
| 0006 | ToolMaster | Tool master tables |
| 0007 | ToolMasterModule | Tool module tables |
| 0008 | CommercialDomainSprint1 | Customer, contact, enquiry, quotation tables |
| 0009 | CommercialDomainForeignKeys | FK constraints for commercial tables |
| 0010 | PermissionSeed | Seeds roles & permissions (via SQL) |

**Result:** ✅ Chronological order correct. 0008 (CREATE) → 0009 (FK) → 0010 (seed) dependency chain is valid.

---

## 8. npm Scripts Availability

| Script | Exists in package.json |
|--------|----------------------|
| `build` | ✅ `nest build` |
| `test` | ✅ `jest` |
| `migration:run` | ✅ `typeorm migration:run` |
| `test:e2e` | ✅ `jest --config ./test/jest-e2e.json` |

**Result:** PASS — all command-line entry points exist.

---

## Summary of Findings

| ID | Severity | Category | Description |
|----|----------|----------|-------------|
| F1 | CRITICAL | Permission Seed | Migration 0010 references `security.*` schema; no migration creates it. Tables are in `public` schema. Migration will fail. |
| F2 | MEDIUM | Duplicate Work | `seed.ts` already seeds roles/permissions; migration 0010 duplicates the logic in raw SQL. |
| F3 | MEDIUM | Git Tracking | 4 `FINAL_*` files are in .gitignore but still tracked; need `git rm --cached`. |
| F4 | MINOR | Documentation | 4 broken README links (files at root, not `docs/`). |
| F5 | LOW | Test Script | Probe script uses `%` string interpolation for SQL queries. |
| F6 | INFO | CI Security | JWT_SECRET is a plaintext placeholder, not a GitHub secret. |
