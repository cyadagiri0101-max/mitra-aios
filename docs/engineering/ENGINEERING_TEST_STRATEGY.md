# Engineering Test Strategy — MITRA v3.4 (Sprint 2.3.0)

> **Status:** Approved baseline.
> **Related:** `package.json` (jest config, `test`, `test:e2e`, `test:cov`), `test/` (e2e suites incl. `engineering.e2e-spec.ts`), `docs/engineering/ENGINEERING_API_SPECIFICATION.md` (contracts under test), ADR-006 (transaction architecture).

---

## 1. Objectives & Targets

| Metric | Current baseline | Target (Sprint 2.3.1) | Target (final) |
|---|---|---|---|
| Backend unit/component coverage (all modules) | 50% global threshold (jest) | ≥ 95% on `modules/engineering/**` + `ecr-eco/**` | ≥ 95% global |
| Integration (e2e) coverage of engineering workflows | partial (`engineering.e2e-spec.ts`) | ≥ 90% of engineering endpoints exercised | ≥ 90% |
| Workflow transition coverage | seeded graphs — unit-tested per adapter | 100% of seeded engineering transitions tested | 100% |
| `tsc --noEmit` | clean (sprint requirement) | clean | clean |
| Lint (`npm run lint`) | clean | clean | clean |

Coverage enforcement: raise the jest `coverageThreshold` for the engineering scope via per-path thresholds in the jest config; CI fails below target (branch, function, line, statement).

---

## 2. Test Pyramid

```
        ┌──────────────┐
        │  e2e (5%)    │  API-level, workflow + RBAC + transactions end-to-end
        ├──────────────┤
        │  Integration │  30%  — service + DB (Testcontainers/real Postgres),
        │  (30%)       │        transactions, outbox, MinIO-less storage seams
        ├──────────────┤
        │  Unit (65%)  │  pure logic: numbering, cost rollup, diff, conversion,
        │              │        effective-date, substitution, policy evaluation
        └──────────────┘
```

---

## 3. Unit Tests

Target: pure/isolated logic — no DB, mocked repos/buses.

| Suite | Scope | Key cases |
|---|---|---|
| `EngineeringBomService.spec` (exists) | create/numbering, projectId guard, child items, rollup, CSV, NotFound | + (2.3.1) substitutions, effective-date windows, cost breakdown, cycle-guard on moves |
| `EngineeringDrawingService.spec` (exists) | create, numbering, checkout/checkin, ownership conflict | + revision letter gate, supersede-on-release, obsolete gate |
| `EngineeringChangeService.spec` (exists) | ECR create, impacts, ECO→ECN, closed-ECR rejection | + link validation, effect rules (BOM windowing, revision cycle), implementation gating |
| `EngineeringNumberingService.spec` (new) | formats, retry on 23505, year rollover | |
| `BomEffectiveDateService.spec` (new) | window matching, tie-break, asOf edges, invalid asOf | |
| `BomSubstitutionService.spec` (new) | overlap rejection, window ⊆ BOM window, apply idempotency | |
| `UnitConversionService.spec` (new) | exact/family/unknown UOM, factor validation, asOf versions | |
| `EngineeringProcessPlanningService.spec` (extend) | operation numbering, cost recompute, predecessor cycle safety | |
| `EngineeringReviewService.spec` (extend) | multi-reviewer aggregation policies (ALL/ANY), terminal states | |
| `DrawingDiffService.spec` (new, 2.3.2) | checksum identical path, text diff, binary fallback | |
| `ImpactAnalysisService.spec` (new, 2.3.3) | walk result, severity mapping, suggestion lifecycle | |
| `ApprovalPolicyService.spec` (new, 2.3.3) | matrix evaluation, min approvals, role matching | |
| `EngineeringTraceabilityService.spec` (extend) | lineage walks, direction/depth, integrity check findings | |
| `EngineeringWorkflowService.spec` (extend) | transition mirroring, stamps, post-commit publish (no double) | |

---

## 4. Integration Tests

Run against a real PostgreSQL (Testcontainers-style or the existing `test/setup-test-db.sh` flow; CI uses the env-driven Postgres per the 2.1.1 CI hardening).

Scope: each service with a transaction manager — verify atomicity and side effects:

| Suite | Verifies |
|---|---|
| BOM release → cost rollup → snapshot → event order | transactional consistency; RELEASED guard enforcement under `em` |
| Drawing check-in + workflow transition | status mirror + `releasedBy/At` + audit row in the same tx |
| ECR → ECO → ECN end-to-end with impacts | full chain, effective-date windowing on BOM (2.3.1) |
| Outbox (2.3.1) | event written in-tx, relay publishes once, no dup after retry, dead-letter on subscriber failure |
| Traceability edge projection (2.3.1) | events → `engineering_trace_edges`; backfill job idempotent |
| Repository queries | point-in-time BOM select, latest revision, reviewer queues, reverse impact index |
| Unit conversion | seeded conversions against service results |

Integration suites must clean state between tests (truncate + reseed workflow graphs; the seeded workflow UUIDs are fixed — tests must NOT mutate them).

---

## 5. Workflow Tests

- **Graph integrity:** every seeded transition of `engineering_drawing`, `engineering_bom`, `engineering_routing`, `engineering_change` (migration 0017 + seed.ts) has an executable test — valid actor path succeeds; invalid path 409/403.
- **Guard matrix:** per-transition role gate, permission gate, `requiresApproval` gate (approver vs non-approver), terminal-state lock, optimistic-lock 409 on concurrent transition.
- **Mirroring:** entity `status` equals workflow `currentState.stateCode` after every transition; `releasedBy/At` stamps correct.
- **State visibility:** `getWorkflow` returns transitions filtered by actor roles/permissions.
- **Data-driven policy (2.3.3):** approval-policy rows change behavior without code changes — parameterized test over policy matrix.

---

## 6. RBAC Tests

| Case | Expectation |
|---|---|
| Every engineering route has `@Permissions` + `@Roles` | static assertion suite scanning controllers |
| Read roles can GET, write roles can POST/PATCH, delete restricted to ADMIN/MANAGEMENT | per-controller parametrized e2e |
| CUSTOMER role read-only on all engineering resources | e2e |
| Cross-tenant access to an entity → 404 (not 403/200) | e2e per resource |
| Permission absence → 403 with message | e2e |
| `PermissionsGuard` AND semantics vs workflow OR semantics | unit + e2e documentation tests |
| New permissions (`engineering:bom:substitute`, `engineering:uom:*`, `engineering:change:impact`, …) seeded for both role systems | migration test |

---

## 7. Transaction Tests

Leverages ADR-001/006. Each multi-step business operation must be tested for:

1. **Atomicity** — force failure at step N (injected repo error); assert NO partial writes (all entities unchanged, workflow state unchanged).
2. **Audit-in-tx** — audit row commits only with the business change.
3. **Event post-commit** — no event published on rollback; exactly one event published on commit (outbox from 2.3.1).
4. **Optimistic locking** — two concurrent transitions on the same workflow instance → one 409.
5. **Concurrency** — parallel BOM item adds maintain line numbering and tree integrity; parallel check-out → one succeeds.
6. **Idempotency** — retried imports/clones/outbox relays produce no duplicates.

---

## 8. Repository Tests

- Tenant scoping (null/absent tenant → no rows; cross-tenant → empty).
- Soft-delete behavior (deletedAt filter, cascades: drawing→revisions, BOM→items+revisions, component→alternates, ECR→impacts/ECO/ECN).
- Partial unique indexes (`WHERE deleted_at IS NULL`) — recreate-after-delete allowed, duplicate-active rejected.
- `@VersionColumn` bump on workflow instances.
- Query correctness for: point-in-time BOM select, latest revision, reviewer queue, impact reverse index, traceability integrity SQL.

---

## 9. Performance Tests

| Test | Target |
|---|---|
| BOM tree fetch (500 items, depth 20) | < 250 ms p95 |
| Cost roll-up on 1,000-item BOM | < 1 s |
| BOM revision compare (large snapshots) | < 500 ms |
| Traceability project graph (1 project, full data) | < 1 s |
| `selectBomFor` point-in-time under 100k BOM revisions | < 100 ms (indexed) |
| Concurrent check-out on same drawing (50 clients) | exactly 1 winner, no lock corruption |
| Outbox relay throughput | ≥ 500 events/min sustained |

Benchmarks run in CI on the integration DB with seeded fixtures; results recorded to `benchmark_results_*.json` (existing pattern). Performance gates are advisory in CI, hard in release checklist.

---

## 10. Test Data Strategy

| Concern | Approach |
|---|---|
| Master data | Shared fixtures: materials, components, work centers (idempotent seeds) |
| Workflow graphs | Never created in tests — reused from migrations (fixed UUIDs); tests assert against them |
| Projects | Factory-created per test with unique `PRJ-YYYY-####` (existing `ProjectFactoryService`), cleaned after |
| Tenants | DEFAULT tenant for most tests + dedicated second tenant for RBAC/IDOR cases |
| Time | Effective-date tests use an injectable clock (date provider service) |
| Files | No real MinIO in unit/integration — storage interface mocked; 1 e2e smoke test with MinIO when available (`MINIO_ENABLED`) |

---

## 11. Tooling & CI

| Tool | Use |
|---|---|
| Jest + ts-jest | unit/component (`*.spec.ts` beside sources) |
| Supertest + `test/utils/test-app.ts` | e2e (`test/*.e2e-spec.ts`), jest-e2e config |
| PostgreSQL (env-driven) | integration/e2e (existing `setup-test-db.sh`) |
| Istanbul (jest coverage) | thresholds; coverage report artifact |
| GitHub Actions | lint → `tsc --noEmit` → unit+coverage → e2e → migration validate (`schema:validate`) |
| `schema:validate` | boot-time column check after each migration (existing) |

CI pipeline (2.3.1): `lint` → `tsc --noEmit` → `test:cov` (thresholds enforced) → `test:e2e` → `migration:run` on fresh DB + `schema:validate` → performance smoke.

---

## 12. Coverage Enforcement Plan

1. Add per-path thresholds in `package.json` jest config for `modules/engineering/**`, `modules/ecr-eco/**`, `common/**` (e.g., lines/functions/branches/statements ≥ 95).
2. Keep global thresholds at 95 by Sprint 2.3.2 (ramp from current 50).
3. `test:cov` writes `coverage/` — CI uploads artifact and fails on threshold breach.
4. Exclude generated/decorator-heavy files (entities, DTOs) from *line* coverage but require them for statement coverage (they carry seed logic).

---

## 13. Definition of Done (testing)

Sprint 2.3.0 delivers this strategy as the contract. Sprint 2.3.1 is testing-complete when:

- [ ] Engineering + ecr-eco unit coverage ≥ 95% (branch/function/line/statement).
- [ ] ≥ 90% of ENGINEERING_API_SPECIFICATION.md endpoints exercised in e2e.
- [ ] 100% of seeded engineering workflow transitions tested (valid + invalid).
- [ ] RBAC matrix suite green (all roles × all engineering resources).
- [ ] Transaction tests green (atomicity, audit-in-tx, post-commit events, optimistic lock).
- [ ] Repository tests green (tenant, soft-delete, partial-unique, version).
- [ ] Performance benchmarks recorded; release thresholds met.
- [ ] `tsc --noEmit`, lint, `schema:validate` clean; CI green.
