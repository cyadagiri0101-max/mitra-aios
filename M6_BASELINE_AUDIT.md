# MITRA M6 Baseline Audit — Phase 0 Reconnaissance

**Milestone:** M6 — Real-Time BI Dashboard & Analytics Governance (G11)
**Audit date:** 2026-08-20
**Mode:** READ-ONLY — no production code modified

---

## 1. Git Baseline

| Check | Result |
|---|---|
| Branch | `v3.3` |
| HEAD | `ca4f97d` — `release: MITRA v4.5.0 - Milestone M5 Service & Customer Lifecycle Governance` |
| Tag v4.5.0 | Present (annotated, "FORMALLY CERTIFIED") |
| HEAD == v4.5.0 | **CONFIRMED** (`git show v4.5.0` → tag points at `ca4f97d`) |
| Working tree | Clean of M5 scope; only pre-existing untracked legacy docs + session artifacts + `M6_IMPLEMENTATION_PLAN.md` |
| Tags | v1.2.0-rc2…v4.5.0 chain intact |

**Verdict:** baseline matches expected v4.5.0 / M5 certified state. M6 execution may proceed on this baseline.

## 2. Existing M5 Certification Evidence (v4.5.0, from M5_EVIDENCE_MATRIX.md)

- Backend unit: **1,203 / 1,203 PASS** (121 suites) · Backend build PASS · Schema validation PASS.
- Frontend: tsc 0 errors · Vitest **22 / 22 PASS** · production build PASS.
- G10 E2E (`m5-service-lifecycle.e2e-spec.ts`): **18 / 18 PASS** — dispatch governance → installation sign-off → warranty auto-activation → SR/visit → claim adjudication → lineage → 401/404 isolation.
- Controlled batches: M1 13/13 · M2 22/22 · M3 18/18 · M4 3/3 · M5 18/18.
- Security: 401 unauthenticated, cross-tenant 404 fail-closed, 403 on every M5 mutation endpoint.
- One genuine Sprint 2 contract mismatch found & fixed during certification (`UpdateVisitDto.status`) with regression test — no business logic change.
- Full-suite regression: 279 total, **9 known baseline failures** (see §7) — reproduced identically at certified commit `283077f` (v4.4.0).

## 3. G11 Current Status

**PARTIAL / UNBLOCKED.** Backend real-data platform is essentially complete; the gap is frontend integration + removal of shipped mock/fallback KPI data.

- Implementation ≈ 86% · Certified ≈ 78% (Vision-100 overall).
- Phase 7 (BI & Analytics): Impl ≈ 45% · Cert ≈ 30%.

## 4. Current Dashboard & Analytics Architecture

### Backend (real, tenant-scoped, permission-guarded — verified)
- `AnalyticsDashboardService.getExecutiveDashboard` — `/analytics/dashboard` — 8 parallel real sources (projects, lead pipeline, quotation margins, engineering stats, production dashboard, NCR repo, SR repo, outbox snapshot); `requireTenant()` fail-closed.
- `AnalyticsKpiService.getKpis` — `/analytics/kpis` — 5 real-data KPI definitions.
- `CapacityIntelligenceService` — `/planning/capacity/{summary,timeline,utilization,recommendations,risks,what-if}` — DB-backed from `project_design_loads`/`project_design_load_stages`, employees/skills.
- `ScheduleBaselineService.calculateVariance` — `/project/:id/baselines/variance` — deterministic Δdays/Δhours/% + health + explainable string.
- `ProjectService.getDashboardStats` — `/project/dashboard/stats`.
- `ProductionTrackingService.dashboard` — WO status/quantities/hours/jobs/machines.
- Engineering traceability — `/engineering/traceability/{project/:id,entity,revision-impact}`.

### Frontend (integration gap — verified)
- `DashboardPage.tsx` — real query for `/project/dashboard/stats` (`:179`) but KPI cards render `KPI_MOCK` from `dashboardMockData.ts` (`:8,231-234`).
- `AnalyticsPage.tsx` — queries `/analytics/dashboard` (`:21`) but falls back to `fallbackProjectData`/`fallbackQualityData` static arrays (`:7,12,26-27`) and shows a Metabase placeholder (`:108-112`).
- `CapacityPlanningPage.tsx` — **fully real** (`:119-130`): summary/timeline/utilization/recommendations/risks/what-if — this is the existing real-data BI precedent to replicate.
- `ServiceLineagePage.tsx`, `ServicePage.tsx`, `DispatchPage.tsx` — real M5 APIs.

## 5. Authoritative KPI Source Map (initial)

| KPI | Backend source | Endpoint | Status |
|---|---|---|---|
| Schedule variance | Variance Engine | `/project/:id/baselines/variance` | READY |
| Workload delta | CapacityIntelligenceService | `/planning/capacity/timeline` | READY |
| Engineer utilization | CapacityIntelligenceService | `/planning/capacity/utilization` | READY |
| Capacity gap | CapacityIntelligenceService | `/planning/capacity/summary` | READY |
| Design load | design-load module | `/design-load` aggregates | READY |
| Production output | ProductionTrackingService | dashboard endpoint | READY |
| Quality defect/NCR | NCR repo (analytics service) | `/analytics/dashboard` | READY |
| Service SLA | Service request repo | `/analytics/dashboard` | READY |
| Revenue | QuotationMarginService | `/analytics/dashboard` | READY |
| Machine utilization | Machine bookings/production | audit needed (PARTIAL) | Sprint 1 |
| OEE trend | Production data | **NEEDS AUDIT — no endpoint** | Sprint 1 gate |
| Cost variance | Budgets + actuals | **NEEDS AUDIT — no endpoint** | Sprint 1 gate |
| Service trend / MTTR | Service records | **NEEDS AUDIT — no endpoint** | Sprint 1 gate |

## 6. Mock / Fallback Inventory (initial — full sweep in M6 Phase 2)

| File:line | Finding | Class |
|---|---|---|
| `mitra-frontend/src/pages/dashboardMockData.ts:23,108-111` | `KPI_MOCK`, `AI_INSIGHTS`, `RECENT_ACTIVITIES` (PRJ-1248/1250 strings) | E — production mock |
| `DashboardPage.tsx:8,231-234` | Renders `KPI_MOCK` cards | E — production mock |
| `AnalyticsPage.tsx:7,12,26-27,108-112` | Static fallback arrays + Metabase placeholder | E — production mock |
| `BomAnalysisPage.tsx:34-35,96` | Hardcoded risks; commented-out real API call | E — production mock (analysis page) |
| `AIWorkspaceContext.tsx:75` | Hardcoded dispatch-risk insight strings | E — production mock |
| `mitra-backend/src/modules/knowledge/services/knowledge-search.service.ts:182-192` | Hardcoded demo source links (A3) | E — backend fixture path (out of G11 scope; governance-track candidate) |

## 7. Known Baseline Test Failures (9, pre-existing — NOT M6 fixes)

| Suite | Count | Classification |
|---|---|---|
| `tenant-isolation.e2e-spec.ts` | 6 | BASELINE — fixture failure: BOM POST as relocated tenant user doesn't return 201; reproduced at v4.4.0 |
| `p0-production-proof.e2e-spec.ts` | 3 | ENVIRONMENTAL — requires live Ollama with `AI_ENABLED=true`; harness runs `AI_ENABLED=false` (Ollama 0.32.14 IS reachable locally; wiring is a future-track item, not M6) |

These must remain separately classified in M6 certification evidence. Never "fixed for green."

## 8. Proposed M6 Boundaries

**IN SCOPE:** KPI data contract & lock (Sprint 1, audit-first) · additive aggregate endpoints only where proven authoritative (OEE/cost/service-trend gates) · premium dashboard rewire with real data (Sprint 2) · KPI drill-down to traceability · capacity-forecast chart from Phase 2 engine (no ML) · real-data filters · `m6-bi-dashboard.e2e-spec.ts` · full certification + tag v4.6.0 (Sprint 3) · parallel governance doc reconciliation (GOLDEN_SCENARIOS/CURRENT_STATE/GAP_MATRIX/DEPENDENCY_GRAPH — G12/G13 = PARTIAL).

**OUT OF SCOPE:** G12 lifecycle & decision corpus · G13 real-model certification · G14 ML prediction · G15 unified digital-thread graph · AI writes · MinIO migration · M1–M5 redesign · fabricated historical datasets · fixing the 9 baseline failures.

## 9. Recommended Implementation Sequence

```
PHASE 1  KPI data-source audit            → M6_KPI_DATA_CONTRACT.md
PHASE 2  Mock/fallback elimination audit  → M6_MOCK_DATA_AUDIT.md
PHASE 3  Backend contract hardening       → additive endpoints only where proven
PHASE 4  Frontend BI rewire               → real KPI cards/charts/drill-down/filters
PHASE 5  E2E + full test sweep            → m6-bi-dashboard.e2e-spec.ts
PHASE 6  Security + performance verify
PHASE 7  Documentation + Vision-100 updates
PHASE 8  Independent verification + tag v4.6.0
```