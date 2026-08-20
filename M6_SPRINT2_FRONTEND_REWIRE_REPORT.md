# M6 SPRINT 2 — FRONTEND BI REWIRE REPORT

Status: **SPRINT 2 COMPLETE — AWAITING SPRINT 3 AUTHORIZATION**

Milestone M6 · Golden Scenario G11 · Target MITRA v4.6.0
Baseline: MITRA v4.5.0 (HEAD ca4f97d, branch v3.3) — certified history untouched.

---

## 1. Baseline used

- Phase 0/1/2 documents: `M6_IMPLEMENTATION_PLAN.md`, `M6_BASELINE_AUDIT.md`, `M6_KPI_DATA_CONTRACT.md` (61 KPIs: 30 READY / 21 PARTIAL / 8 MISSING / 2 UNSAFE), `M6_MOCK_DATA_AUDIT.md`.
- Backend contract implemented and verified in Sprint 1: `GET /analytics/dashboard`, `GET /analytics/trends`, `GET /project/dashboard/stats` (byStage/byHealth), all JWT + `requireTenant` fail-closed + `@Permissions('analytics:read')`.
- Frontend state re-confirmed by reading current source before editing (no assumptions from earlier sessions).

## 2. Files changed (frontend)

| File | Change |
|---|---|
| `src/utils/dashboardMapping.ts` | NEW — pure mapping layer: `buildWorkflowStages`, `summarizeDashboard`, `mapTrends`, `mapOutboxEvents`, `humanizeEventType`, `formatINR`, `DASHBOARD_REFRESH_MS/LABEL` |
| `src/utils/dashboardMapping.test.ts` | NEW — 14 tests (stage mapping, KPI extraction, no-fabrication guard, trends contract, outbox mapping) |
| `src/pages/DashboardPage.tsx` | Rewired: real KPIs, stage counts from API, outbox activity feed, removed machines/AI panels, truthful refresh label, drill-down links |
| `src/components/Dashboard/HeroSection.tsx` | Rewired: fabricated uptime/orders/throughput/"System Healthy" removed; real KPIs (active projects, quotation value, open NCRs, dispatch, CAPAs) |
| `src/pages/AnalyticsPage.tsx` | Rewired: no fallback data, `/analytics/trends` + `/analytics/dashboard` wired, real error state with retry, empty states, summary cards, Metabase placeholder removed |
| `src/pages/CapacityPlanningPage.tsx` | Labeled "Indicative" demand curves; removed `overloadedEngineersCount` from unused interface; badge "M2 Sprint 2" → "Indicative demand curves" |
| `src/pages/DesignLoadPage.tsx` | "Max Design Throughput" → "Max Design Capacity" (deterministic `workstations × 24 h/day`; removed banned "throughput" wording) |
| `src/pages/dashboardMockData.ts` | DELETED (no consumers remained) |

## 3. Mocks removed

- `src/pages/dashboardMockData.ts` — **deleted** (`KPI_MOCK`, `AI_INSIGHTS`, `RECENT_ACTIVITIES` had zero remaining consumers).
- `WORKFLOW_STAGES` hardcoded counts — removed; counts now come from `/project/dashboard/stats` → `byStage`.
- `FACTORY_MACHINES` (fabricated live machine panel) — removed entirely.
- `AI_RECOMMENDATIONS` — removed.
- HeroSection fabricated statics — removed (98% uptime, 42 live orders, 14 quality checks, Throughput 92%, Quality hold 1 active, "System Healthy" badge).
- `fallbackProjectData`, `fallbackQualityData`, silent `?? fallback` in AnalyticsPage — removed.

## 4. Static values removed

Machines running KPI (no source → removed), overdue CAPAs (no due-date contract → replaced by authoritative **Open CAPAs**), "Updated every 30 seconds" (false cadence → "Refreshes every 5 minutes", matching React Query `refetchInterval: 300000`), "Live analytics updates" badge, fabricated chart captions ("tracking above historical baseline", "CAPAs trending flat"), Metabase placeholder.

## 5. Fallback behavior removed

AnalyticsPage now shows: skeleton → real error banner (with Retry button) or empty state ("No data for the selected period") — never fabricated series. DashboardPage: when the analytics payload is absent, KPI cards render "—" plus a visible "data source could not be reached" banner; stage flow shows an explicit empty state.

## 6. APIs wired

| UI surface | API |
|---|---|
| KPI cards + hero snapshot + quality overview + domain activity | `GET /analytics/dashboard` |
| Workflow stage counts | `GET /project/dashboard/stats` → `byStage` |
| Trend charts | `GET /analytics/trends?months=6` |
| Knowledge widgets | `GET /knowledge/search` (unchanged, authoritative) |

No polling below 5 min; React Query caching shared across routes via query keys (`analytics-dashboard` reused on Dashboard + Analytics); no N+1 (single dashboard fetch per page).

## 7. KPI → API → source mapping

| Label | API field | Backend calc | DB source |
|---|---|---|---|
| Active Projects | `activeProjects.active` | total − dispatched − inService | projects.stage |
| In Dispatch | `activeProjects.dispatched` | count stage = DISPATCH | projects.stage |
| Open CAPAs | `qualityPerformance.capaOpenCount` | status ∉ {CLOSED, REJECTED} | capa_verifications.status |
| Quotation Value | `quotationValue.value` | sum non-draft/non-rejected totals | quotation_margins.total_value |
| Open NCRs | `qualityPerformance.openNcrs` | status ≠ CLOSED | ncr_records.status |
| Inspection Pass Rate | `qualityPerformance.inspectionPassRate.passRatePct` | accepted/inspected qty | inspection_reports |
| Service Closure Rate | `serviceStatus.closureRatePct` | resolved/total | service_requests.status |
| Stage counts | `byStage[code]` | GROUP BY stage | projects.stage |

## 8. Drill-down routes (existing routes only)

Active Projects → `/projects` · In Dispatch → `/dispatch` · Open CAPAs → `/capa` · Quotation Value → `/quotations` · Quality overview → `/quality`.

## 9. Tests executed

- Frontend: `npx vitest run` → **2 files, 36/36 PASS** (22 pre-existing + 14 new mapping tests). New tests cover: real KPI extraction, stage counts from API, trends contract, no-fallback empty states, unsupported machine KPI absence (no `machines/uptime/throughput/oee` in output), authoritative CAPA value, error→empty behavior.
- Frontend type check + production build: `npm run build` (tsc + vite) → **PASS** (9.5 s).

## 10. Build result

`npm run build` PASS — zero TS errors, all chunks emitted.

## 11. Backend regression

- Targeted: `npx jest src/modules/analytics` → 2 suites, 19/19 PASS.
- Full: `npm test` → **1,221/1,221 PASS (122 suites)** — identical to Sprint 1 end state; zero regressions from Sprint 2 (no backend files changed).
- NEW failures: **0** · KNOWN baseline failures: **9 unchanged** (6 tenant-isolation fixture, 3 p0-production-proof environmental requiring AI_ENABLED=true/live Ollama) — separate categories, untouched.

## 12. Security verification

All new frontend calls go through `src/utils/api` (JWT bearer). Backend guards unchanged: `requireTenant` fail-closed, `@Permissions('analytics:read')`, tenant-scoped queries. No guards weakened for frontend convenience; frontend never receives cross-tenant data (single-tenant scope enforced server-side).

## 13. Remaining blockers

- None blocking Sprint 2. Manual browser console check (runtime errors/hydration) is recommended as part of Sprint 3 certification with the full app running.

## 14. G13/G14 deferred items

- `BomAnalysisPage` `SIMULATED_BOM_ITEMS` / `SIMULATED_RISK_AREAS` — G13 AI/BOM intelligence, explicitly out of M6 scope; **deferred**, not removed, not expanded.
- `DrawingAnalysisPage` `SIMULATED_RISK_AREAS` — same G13 family; deferred.
- All Sprint 1 rejected aggregates (OEE, machine utilization/availability, throughput, MTTR, true SLA, invoiced revenue, margin variance, ML forecast, AI insights, fabricated machine states/activity/narratives) remain excluded from M6 surfaces.
- AIDock/AiAssistantPage remain (G13), untouched by M6.

## 15. Sprint 2 verdict

**SPRINT 2 COMPLETE — AWAITING SPRINT 3 AUTHORIZATION.**

G11 dashboard is now truthful: every displayed KPI resolves to an authoritative DB source via a labeled chain; unsupported metrics are absent (not faked); API failures produce explicit error/empty states; refresh cadence claims match React Query. Nothing tagged, no certification claim made.