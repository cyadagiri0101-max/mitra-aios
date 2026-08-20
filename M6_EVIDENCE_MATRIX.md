# M6 — G11 Real-Time BI Dashboard & Analytics Governance — Evidence Matrix

> **Milestone:** MITRA v4.6.0 / M6
> **Work 1 (Sprint 3) deliverable:** deterministic real-data G11 acceptance suite
> **Status legend:** `PASS` / `PARTIAL` / `BLOCKED` — certification verdicts are issued only in Work 3 (independent certification report).
> **Method:** every KPI assertion in `mitra-backend/test/m6-bi-dashboard.e2e-spec.ts` is cross-checked against the real test database (`mitra_v2_test`) via the shared `DataSource` — no mocks, no fixtures as data source.

---

## 1. Acceptance Evidence (per G11 surface)

| # | Requirement | Primary Evidence | Supporting Evidence | Result |
|---|-------------|------------------|---------------------|--------|
| G11-1 | Commercial / Quotation Value — sum of non-draft, non-rejected quotations `total_amount`, labelled *Quotation Value* (never Revenue) | e2e `1. Real-data KPI chain` → `companyOverview`/`quotationValue` cross-checked vs `quotations` table (`status IN SENT/APPROVED/ACCEPTED/PROJECT_CREATED/WON`) | e2e `2. Semantic safety` (no `revenue` fragment); `analytics-kpi.service.ts` `quotation-value` definition | **PASS** |
| G11-2 | Project pipeline — total / active / dispatched / in-service counts from authoritative `projects.stage`, plus `byStage` / `byHealth` distributions | e2e `1.` (companyOverview + activeProjects) + `projects stats reconcile` vs `projects` table | e2e `3. Tenant security` (tenant-scoped totals) | **PASS** |
| G11-3 | Engineering coverage — released/current drawing count from `engineering_drawings` | e2e `1.` `enterpriseHealth.engineeringCoverage` vs DB count | `engineering-dashboard.service.ts` `getStats().totals.drawings` | **PASS** |
| G11-4 | Planning capacity — aggregate design demand vs skill-constrained capacity; exposed as *Indicative demand vs capacity* (never a forecast) | e2e `1.` capacity summary (`capacityGapHours`, `remainingCapacityHours`, `allocatedHours`, `totalEngineerAvailableHours`, `averageEngineerUtilizationPct`) | e2e `2.` (no `overloadedEngineersCount`, no `forecast`); `capacity-intelligence.service.ts` summary (field removed in Sprint 1) | **PASS** |
| G11-5 | Schedule health — milestone completion % and delayed-project count from `project_milestones` | e2e `1.` (completionPct / delayedProjects) + `project/dashboard/stats` reconciliation | `analytics-dashboard.service.ts` `computeProjectCompletionPct` / `computeDelayedProjects` | **PASS** |
| G11-6 | Manufacturing — work-order status counts, planned/completed/rejected/rework/scrap quantities, estimated/actual hours, job-card status (open / in progress / late) | e2e `1.` production dashboard cross-checked vs `work_orders` + `job_cards` aggregates; `jobs.late` vs planned-end-date rule | e2e `2.` (no `onTime`, no machine live-state) | **PASS** |
| G11-7 | Quality — open NCR ratio, NCR-by-severity, CAPA status distribution, inspection pass rate (accepted/inspected) | e2e `1.` cross-checked vs `ncr_records`, `capa_verifications`, `inspection_reports` | e2e `2.` (no `defectRate`, no `oee`); KPI `open-ncr-ratio` | **PASS** |
| G11-8 | Service — closure rate = resolved/total service requests (labelled *Closure Rate*, never SLA compliance) | e2e `1.` `serviceStatus.closureRatePct` vs `service_requests` | e2e `2.` (no `slaCompliance`, no `mttr`) | **PASS** |
| G11-9 | Monthly trends — deterministic counts from real `created_at` dates (project, NCR, CAPA per calendar month); explicit `meta.label = "Indicative — not a forecast"` | e2e `1.` trends per-bucket DB cross-check; `analytics-dashboard.service.ts` `getTrends` (bucket bound `${buckets[0]}-01` fix, Sprint 1) | e2e `2.` (no `forecast`/`prediction`) | **PASS** |
| G11-10 | Capacity timeline — time-distributed demand vs capacity buckets (Daily/Weekly/Monthly) with status OPTIMAL / NEAR_CAPACITY / OVERLOADED; *Indicative* label | e2e `1.` capacity timeline structure + status values; `capacity-intelligence.service.ts` `getCapacityTimeline` | `M6_SPRINT2_FRONTEND_REWIRE_REPORT.md` (CapacityPlanningPage labeling) | **PASS** |
| G11-11 | Semantic safety — no fabricated or forbidden metrics on any G11 payload (OEE, throughput, MTTR, SLA, defect rate, revenue, onTime, machine live-state, overloaded engineers, ML/AI forecast) | e2e `2.` forbidden-fragment scan across 7 serialized G11 payloads; production payload scan | `analytics-kpi.service.spec.ts`; Sprint 2 report | **PASS** |
| G11-12 | Tenant security — 401 unauthenticated, 403 unauthorized role, 404 wrong-tenant resource, no cross-tenant leakage of aggregates | e2e `3.` (6 representative endpoints 401; CUSTOMER role 403; tenant B 404 on tenant A project; B/A aggregate isolation with live create) | `tenant-isolation.e2e-spec.ts` (baseline M5 coverage) | **PASS** |
| G11-13 | Empty / failure states — a fresh tenant receives truthful zeros, never fabricated values; invalid inputs rejected/clamped | e2e `3.` (tenant B zeros) + `4.` (trends clamp, unknown report format 400) | `mapTrends`/`summarizeDashboard` empty-state tests (frontend) | **PASS** |
| G11-14 | Drill-down — every KPI surface maps to a real, registered SPA route (Active Projects→`/projects`, In Dispatch→`/dispatch`, Open CAPAs→`/capa`, Quotation Value→`/quotations`, Quality→`/quality`) | Frontend `routeManifest.ts` single source of truth shared by `App.tsx` and `DashboardPage.tsx`; `dashboardMapping.test.ts` asserts every target is a registered route | e2e `5.` surface-contract check | **PASS** |
| G11-15 | Performance — representative G11 endpoints answer within the 5 s acceptance bound | e2e `6.` measured latencies: dashboard 28 ms, KPIs 25 ms, trends 13 ms, project stats 4 ms, capacity summary 18 ms, production 11 ms (empty tenant 24 ms) | — | **PASS** |

---

## 2. Verification Run Summary (Work 1)

| Suite | Command | Result |
|-------|---------|--------|
| M6 G11 acceptance | `npx jest --config ./test/jest-e2e.json m6-bi-dashboard.e2e-spec` | **20/20 PASS** (suite time ~22 s) |
| Analytics regression | `npx jest --config ./test/jest-e2e.json analytics.e2e-spec` | **10/10 PASS** |
| Backend unit | `npm test` | **1,221/1,221 PASS** (122 suites) |
| Backend build | `npm run build` | **PASS** |
| Frontend unit | `npx vitest run` | **39/39 PASS** (serviceStatus 22 + dashboardMapping 14 + drill-down 3) |
| Frontend build | `npm run build` | **PASS** |
| Full E2E regression | `npx jest --config ./test/jest-e2e.json` | **292 passed / 9 known baseline failures** (6 `tenant-isolation` fixture, 3 `p0-production-proof` environmental AI/Ollama) — unchanged, separately classified, never fixed for green |
| Schema | `git status` | **No migrations / schema changes in M6** |

---

## 3. Work 1 Deliverables

- `mitra-backend/test/m6-bi-dashboard.e2e-spec.ts` — deterministic real-data G11 acceptance suite (20 tests).
- `mitra-frontend/src/utils/routeManifest.ts` — shared route manifest (single source of truth for drill-down verification).
- `mitra-frontend/src/utils/dashboardMapping.ts` / `dashboardMapping.test.ts` — mapping layer + drill-down tests (Sprint 2, extended in Sprint 3).
- `M6_SPRINT2_FRONTEND_REWIRE_REPORT.md`, `M6_SPRINT2_FRONTEND_REPORT.md` — Sprint 2 evidence.

---

## 4. Gate Result for Work 2

**WORK 1 GATE: PASS** — All 15 G11 acceptance criteria are evidenced as **PASS** against real seeded data with tenant-isolation, semantic-safety, empty-state, drill-down, and performance coverage. No scope expansion beyond G11 was required. G12/G13 remain `PARTIAL/UNBLOCKED` and G14/G15 remain `PARTIAL/DEFERRED` per the approved M6 scope; these are reconciled in Work 2. Independent certification is deferred to Work 3.