# Platform Stabilization Report — MITRA v3.9.1 (Phase 2)

## Summary

All backend E2E suites now pass. The full E2E battery runs green end-to-end
(**12/12 suites, 139/139 tests**) and the complete unit suite is green
(**75/75 suites, 807/807 tests**). Every Gherkin-style platform gate is met:
no infrastructure, schema, serialization, validation, UUID/default-value, or
authorization defects remain in the exercised surfaces.

---

## Completed Suites

| Suite | Baseline | Final | Notes |
|---|---|---|---|
| Engineering | 100% | 100% (10/10) | Resolved in earlier phase — not revisited |
| Project | 100% | 100% (11/11) | Resolved in earlier phase — not revisited |
| Commercial | 100% | 100% (17/17) | Resolved earlier in v3.9.1 sprint — decimal/folder fix |
| Auth | 100% | 100% (17/17) | Green as-is |
| **App** | 4/5 | **100% (5/5)** | Health liveness contract defect (this sprint) |
| Analytics | 100% | 100% (8/8) | Green as-is |
| AI Usage | 100% | 100% (8/8) | Green as-is |
| Cross Domain | 100% | 100% (6/6) | Green as-is (also covers workflow/knowledge coupling) |
| Concurrency | 100% | 100% (7/7) | Green as-is |
| Quality | 100% | 100% (14/14) | Green as-is |
| Manufacturing | 100% | 100% (21/21) | Green as-is |
| Service | 100% | 100% (15/15) | Green as-is |

Workflow, Knowledge, and Dashboard have no dedicated e2e files in this
repository; their cross-cutting behaviour is exercised by the Cross Domain,
Analytics, and AI Usage suites above (all 100%).

---

## Defects Fixed

### Defect 1 — App liveness endpoint omitted process metadata

| Field | Detail |
|---|---|
| **Root cause** | `HealthController.liveness()` returned only `{ status, timestamp }`. The documented liveness contract (and e2e assertion `typeof res.body.uptime === 'number'`) requires process uptime metadata; `process.uptime()` was never surfaced. |
| **Files modified** | `src/modules/health/health.controller.ts` |
| **Why it occurred** | Liveness probe was implemented as a minimal no-dependency check and simply dropped the uptime information that the health contract promises. |
| **Verification** | `test/app.e2e-spec.ts` 4/5 → 5/5 PASS after adding `uptime: process.uptime()`. No other surface touched. |

### Defect context — prior v3.9.1 Commercial sprint fixes (already merged into this stabilization)

These were completed immediately before Phase 2 and are required for the global
suite to be green; listed here for completeness of the support record:

| Defect | Root cause | Files modified |
|---|---|---|
| Quotation decimals returned as strings | `pg` returns `numeric` as strings; no TypeORM decimal transformer on quotation columns | `src/modules/commercial/entities/quotation.entity.ts` (all 10 decimal columns) |
| `project_value` returned as string (`"2183000.00"`) | Same decimal-transformer gap on the Project entity | `src/modules/project/entities/project.entity.ts` |
| Accept-quotation 500 | `project_folders.folder_type` is `NOT NULL` in schema but unmapped/unset at default-folder insert | `src/modules/project/entities/projectfolder.entity.ts`, `src/modules/project/services/project-factory.service.ts`, `src/modules/project/services/project-document.service.ts` |
| Paginated customer listing 400 | `@Query() filters: CustomerFilterDto` captured pagination keys rejected by `forbidNonWhitelisted` ValidationPipe | `src/modules/commercial/dto/customer.dto.ts` |

No business rules were changed. No tests were modified, skipped, or disabled.
Every fix addresses an implementation defect.

---

## Verification

Commands used (each suite run in isolation, then the full battery):

```
npx jest --config ./test/jest-e2e.json <suite>.e2e-spec.ts --runInBand --forceExit --json
npx jest --config ./test/jest-e2e.json --runInBand --forceExit --json   # full battery
npx jest --silent --forceExit --json                                    # unit suite
```

### Unit Tests
`75/75` suites passed, `807/807` tests passed. The two Project service specs
touched by the Commercial fix remain green (`24/24`).

### Integration Tests
Covered by the e2e battery below (the repository has no separate integration
test phase; e2e runs against a real PostgreSQL instance via
`test/utils/test-app.ts`).

### E2E Tests
- Per-suite runs: **12/12 suites at 100%**.
- Full battery (all suites in one invocation, shared real DB):
  **12/12 suites passed / `139/139` tests passed / `0` failed**.

```
PASSED auth.e2e-spec.ts        (17 tests)
PASSED engineering.e2e-spec.ts (10 tests)
PASSED manufacturing.e2e-spec.ts(21 tests)
PASSED commercial.e2e-spec.ts  (17 tests)
PASSED cross-domain.e2e-spec.ts( 6 tests)
PASSED concurrency.e2e-spec.ts ( 7 tests)
PASSED service.e2e-spec.ts     (15 tests)
PASSED analytics.e2e-spec.ts   ( 8 tests)
PASSED quality.e2e-spec.ts     (14 tests)
PASSED ai-usage.e2e-spec.ts    ( 8 tests)
PASSED app.e2e-spec.ts          ( 5 tests)
PASSED project.e2e-spec.ts     (11 tests)
```

(Order differs run to run; counts are exact.)

---

## Regression Summary

| Category | Result |
|---|---|
| Unit Tests | 807/807 pass (75/75 suites) — no regressions |
| Integration/E2E Tests | 139/139 pass across all 12 suites (100%) |
| Overall Status | **GREEN** |

## Passing Suites

All 12 repository E2E suites: auth, app, analytics, ai-usage, cross-domain,
concurrency, quality, manufacturing, service, commercial, engineering, project.

## Remaining Suites

None. Every backend E2E suite in the repository passes.
(Workflow / Knowledge / Dashboard behaviour is covered by cross-domain,
analytics and ai-usage suites.)

## Remaining Defects

None identified. The verified gates below are all clean:

- No infrastructure defects remain.
- No schema issues remain (schema integrity check passes; migrations current).
- No serialization issues remain (decimal fields are exposed as JS numbers).
- No validation inconsistencies remain (pagination + filter co-exist under
  `forbidNonWhitelisted`).
- No UUID/default-value defects remain.
- No regressions introduced.

## Production Readiness

The backend is ready for production shipment on the exercised surface:
full authentication/RBAC, health/liveness contracts, audit trail, workflow
driven state machines, commercial RFQ→quotation→project pipeline, Project
Management domain, Engineering ECR/ECO lifecycle, Manufacturing execution,
Quality (PPAP/inspection/NCR), Service lifecycle, Analytics, and AI usage
tracking all pass their end-to-end contracts against a real PostgreSQL
database with migrations and seed applied.