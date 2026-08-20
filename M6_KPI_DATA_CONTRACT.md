# MITRA M6 — KPI Data Contract & Authoritative Source Audit (Phase 1)

**Milestone:** M6 — Real-Time BI Dashboard & Analytics Governance (G11)
**Audit date:** 2026-08-20 · **Mode:** READ-ONLY (no production code modified)
**Method:** direct source tracing — every KPI verified service → repository → entity.

---

## 0. Status Legend

| Status | Meaning |
|---|---|
| READY | Authoritative data exists and can safely be exposed today |
| PARTIAL | Some data exists; additional work required |
| MISSING | Required authoritative data does not exist |
| UNSAFE | Metric misleading — calculation/semantics not defensible as named |

---

## 1. Executive / Commercial KPI Matrix

| KPI | Business Definition | Source | Fields | Calculation | Service | Endpoint | Tenant | Perm | Project | Time | Consumer | Drill-down | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Quotation value (labeled "Revenue") | Sum of non-draft, non-rejected quotation totals | `quotations` | totalAmount, status, quotationDate | SUM(totalAmount) WHERE status IN (SENT,APPROVED,ACCEPTED,PROJECT_CREATED,WON); optional from/to | QuotationMarginService | `/analytics/dashboard` → revenue.currentRevenue | YES | JWT+Roles | NO | point-in-time / from/to | AnalyticsPage, KpiService | margin summary | READY | quotation-margin.service.ts:16-41 |
| Invoiced / collected revenue | Cash-basis revenue | — | — | — | — | — | — | — | — | — | — | — | MISSING | no invoice/payment entity exists |
| Quotation pipeline | Live quote count & status mix | `quotations` | status | COUNT by status | QuotationMarginService | `/analytics/dashboard` → revenue.quoteCount | YES | JWT+Roles | NO | point-in-time | — | list w/ status filter | READY | quotation-margin.service.ts:34; quotation.controller.ts:47 |
| Quotation margin | Estimated margin of active quotes | `quotations` | marginPct, totalAmount, estimatedCost | AVG(marginPct); value − cost | QuotationMarginService | `/analytics/dashboard` → revenue.marginValue/marginPct, profitability | YES | JWT+Roles | NO | point-in-time / from/to | — | list | READY | quotation-margin.service.ts:27-40 |
| Active projects | Projects not yet dispatched/in service | `projects` | stage | total − dispatched − inService | ProjectService.getDashboardStats | `/project/dashboard/stats`, `/analytics/dashboard` → activeProjects | YES | JWT+Roles | NO | point-in-time | DashboardPage (query exists, unused) | project list | READY | project.service.ts:455-473 |
| Project count | All non-deleted projects | `projects` | — | COUNT | ProjectService.getDashboardStats | same | YES | JWT+Roles | NO | point-in-time | — | list | READY | project.service.ts:472 |
| Project status distribution | Count by stage & health | `projects` | stage, healthStatus | GROUP BY stage, healthStatus | ProjectService.getDashboardStats | same | YES | JWT+Roles | NO | point-in-time | — | per-stage list | READY | project.service.ts:455-473 |

## 2. Project / Schedule KPI Matrix

| KPI | Business Definition | Source | Fields | Calculation | Service | Endpoint | Tenant | Perm | Project | Time | Consumer | Drill-down | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Schedule variance | Actual vs expected per project baseline | `project_schedule_baselines` | variance fields, delayDays | varianceHours = actual − expected; delayDays; varianceType; health; explainable string | ScheduleBaselineService.calculateVariance | `/project/:id/baselines/variance` | YES | JWT+Roles | YES (path) | point-in-time vs baseline | — | baseline detail | READY | schedule-baseline.service.ts |
| Schedule health | GREEN/YELLOW/RED per project | `projects`, milestones, budgets | healthStatus | computeHealth: overdue milestones + budget variance >10% + stage overdue | ProjectService.computeHealth | `/project/:id/health`; byHealth in stats | YES | JWT+Roles | YES | point-in-time | — | project detail | READY | project.service.ts:346-389 |
| Delayed projects (aggregate) | Count w/ overdue milestones / RED health | `projects`+`project_milestones` | plannedDate, status | projects w/ ≥1 overdue non-completed/cancelled milestone (same rule as computeHealth check 1) | AnalyticsDashboardService.computeDelayedProjects | `/analytics/dashboard` → activeProjects.delayedProjects | YES | JWT+Roles | NO | point-in-time | — | per-project health | READY | implemented M6 Sprint 1 (analytics-dashboard.service.ts) |
| Workload delta | Demand vs available headroom | design loads | capacityGapHours, remainingCapacityHours | demand − skill-constrained eligible | CapacityIntelligenceService | `/planning/capacity/summary` | YES | JWT+Roles | filter | horizon | CapacityPlanningPage | summary detail | READY | capacity-intelligence.service.ts:200-201 |
| Project completion % | Milestones completed / total per project (overall) | `project_milestones` | status | COUNT(COMPLETED) / COUNT(not CANCELLED) | AnalyticsDashboardService.computeProjectCompletionPct | `/analytics/dashboard` → activeProjects.completionPct | YES | JWT+Roles | NO | point-in-time | — | milestone list | READY | implemented M6 Sprint 1 |
| Milestone completion | Milestone status distribution | `project_milestones` | status | GROUP BY status | MilestoneService | none (list only) | — | — | — | — | — | — | PARTIAL | per-status distribution still not aggregated |

## 3. Engineering / Design KPI Matrix

All from `capacity-intelligence.service.ts` (design-load) unless noted. **Denominator caveat:** engineer selection = department-name heuristic; capacity math assumes 8 h/day × 5/7 working days.

| KPI | Business Definition | Source | Fields | Calculation | Service | Endpoint | Tenant | Perm | Project | Time | Consumer | Drill-down | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Design load (demand) | Total planned design hours | `project_design_loads` | plannedHours, standardHours | SUM(plannedHours ∥ standardHours) | CapacityIntelligenceService | `/planning/capacity/summary` | YES | JWT+Roles | filter | horizon | CapacityPlanningPage | — | READY | :172 |
| Engineering utilization | Demand / engineer capacity | loads + employees | — | demand / (engineers×8×workingDays) | same | same | YES | JWT+Roles | filter | horizon | CapacityPlanningPage | per-engineer | PARTIAL | :190,203-205 — dept-name heuristic |
| Engineer allocation | Hours on stages with owner | `project_design_load_stages` | assignedEmployeeId, plannedHours | SUM where assigned | same | same | YES | JWT+Roles | filter | horizon | — | per-engineer report | READY | :173-176; getEngineerUtilization :347-355 |
| Capacity gap | Demand exceeding eligible capacity | loads + skills | — | max(0, demand − eligible) | same | same | YES | JWT+Roles | filter | horizon | CapacityPlanningPage | — | READY | :200 |
| Skill shortage | Capacity constrained by skills | `employee_skills`, stages.requiredSkillId | — | qualified count × hours | same | same | YES | JWT+Roles | filter | horizon | — | — | PARTIAL | :193-198 — falls back to ALL employees when no skill mapping |
| Design workload | Design load per project | loads | projectId | SUM per project | same | same | YES | JWT+Roles | YES | horizon | — | project filter | READY | :226 |
| Design-stage progress | Stage status/effort mix | `project_design_load_stages` | status | GROUP BY status | — | none | — | — | — | — | — | — | PARTIAL | stages relation exists; no aggregate endpoint |

**Timeline caveats (I):** `getCapacityTimeline` distributes demand **uniformly** (`stgHrs / numBuckets`, :281) — NOT date-aware. Workstation capacity hardcodes 3 shifts (:287); engineer count falls back to `employees.length` (:252); workstations to `|| 10` (:254); eligible capacity = engineerCapacity × 0.85 (:288); status thresholds 105%/85% (:296-297). Deterministic — safe to visualize **as indicative demand**, must be labeled.

## 4. Manufacturing KPI Matrix

All from `ProductionTrackingService.dashboard` → `GET /manufacturing/production/dashboard` (READ_ROLES incl. CUSTOMER; projectId/from/to filters on WO created_at).

| KPI | Business Definition | Source | Fields | Calculation | Service | Endpoint | Tenant | Perm | Project | Time | Consumer | Drill-down | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Work order count | WO volume | `work_orders` | status | COUNT + statusCounts | ProductionTrackingService | `/manufacturing/production/dashboard` | YES | JWT+Roles | filter | created_at | — | board | READY | production-tracking.service.ts:42-45 |
| Production output | Planned/completed/rejected/rework/scrap qty | `work_orders` | plannedQty, completedQty, rejectedQty, reworkQty, scrapQty | SUM each | same | same | YES | JWT+Roles | filter | created_at | — | WO list | READY | :79-85 |
| Planned vs actual hours | Hour burn | `work_orders` | estimatedHours, actualHours | SUM each | same | same | YES | JWT+Roles | filter | created_at | — | — | READY | :86-89 |
| Machine utilization | — | — | — | — | — | — | — | — | — | — | — | — | MISSING | only runningMachines = COUNT(DISTINCT machine_id) of IN_PROGRESS job cards (:59-62) — no denominator, no machine master capacity |
| Machine availability | — | — | — | — | — | — | — | — | — | — | — | — | MISSING | no machine master / downtime data |
| Job completion | Open/in-progress/late jobs | `job_cards`, `work_orders` | status, machine_id, planned_end_date | counts; late = in-flight WO with planned_end_date < today | same | same | YES | JWT+Roles | filter | today | — | job card board | READY | :47-74 |
| Rework | Rework workload | `work_orders` + `job_cards` | reworkQty; job status REWORK | SUM / count | same | same | YES | JWT+Roles | filter | created_at | — | — | READY | :83,58 |
| Throughput | Units/time rate | — | — | — | — | — | — | — | — | — | — | — | MISSING | no rate endpoint |

**Dead field:** `jobStats.onTime` initialized 0, never incremented (production-tracking.service.ts:48) — always 0. Must not be displayed. (`late` IS computed.)

## 5. Quality KPI Matrix

| KPI | Business Definition | Source | Fields | Calculation | Service | Endpoint | Tenant | Perm | Project | Time | Consumer | Drill-down | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NCR count | Total NCRs | `ncr_records` | — | COUNT | AnalyticsDashboardService | `/analytics/dashboard` → qualityPerformance | YES | JWT+Roles | no | point-in-time | AnalyticsPage | NCR list (severity/status filter) | READY | analytics-dashboard.service.ts:48; ncr.controller.ts:23 |
| Open NCR | Not CLOSED | `ncr_records` | status | COUNT(status != CLOSED) | same | same | YES | JWT+Roles | no | point-in-time | — | list | READY | :49 |
| Critical/major NCR | By severity | `ncr_records` | severity (MINOR/MAJOR/CRITICAL) | COUNT per severity | AnalyticsDashboardService | `/analytics/dashboard` → qualityPerformance.ncrBySeverity | YES | JWT+Roles | no | point-in-time | — | NCR list filter exists | READY | implemented M6 Sprint 1; ncr-record.entity.ts:78-79 |
| CAPA status | CAPA status distribution / open count | `capa_verifications` | status, closed_at | GROUP BY status; open = not CLOSED/REJECTED | AnalyticsDashboardService | `/analytics/dashboard` → qualityPerformance.capaByStatus / capaOpenCount | YES | JWT+Roles | no | point-in-time | — | CAPA list | READY | implemented M6 Sprint 1; capaverification.entity.ts:106-109 |
| Defect rate | **open ratio mislabeled** | `ncr_records` | status | openNcrs/totalNcrs named "defectRatePct" (REMOVED) | AnalyticsDashboardService | `/analytics/dashboard` → qualityPerformance.openRatioPct; `/analytics/kpis` open-ncr-ratio | YES | JWT+Roles | no | point-in-time | AnalyticsPage | — | READY (relabeled) | Sprint 1 removed defectRatePct |
| Inspection pass rate | Accepted vs inspected qty | `inspection_reports` | sampleSize, acceptedQty, rejectedQty | accepted/sampleSize summed across reports | AnalyticsDashboardService | `/analytics/dashboard` → qualityPerformance.inspectionPassRate | YES | JWT+Roles | no | point-in-time | — | report list | READY | implemented M6 Sprint 1; inspectionreport.entity.ts:48-58 |
| Quality trend | NCR/CAPA monthly time series | `ncr_records`, `capa_verifications` | createdAt | calendar-month bucket counts (deterministic, not forecast) | AnalyticsDashboardService.getTrends | `/analytics/trends?months=N` → qualityTrends | YES | JWT+Roles | no | last N months | AnalyticsPage | — | READY | implemented M6 Sprint 1 |

## 6. Service KPI Matrix

| KPI | Business Definition | Source | Fields | Calculation | Service | Endpoint | Tenant | Perm | Project | Time | Consumer | Drill-down | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Open service requests | Not RESOLVED/CLOSED/CANCELLED | `service_requests` | status | COUNT | AnalyticsDashboardService | `/analytics/dashboard` → serviceStatus | YES | JWT+Roles | no | point-in-time | — | SR list | READY | analytics-dashboard.service.ts:52 |
| Closed service requests | RESOLVED or CLOSED | `service_requests` | status | COUNT | same | same | YES | JWT+Roles | no | point-in-time | — | list | READY | :53 |
| Warranty claims | Claim volume | `service_warranty_claims` | status | COUNT | WarrantyClaimService (no aggregate) | none | — | — | — | — | — | list | PARTIAL | servicewarrantyclaim.entity.ts:57 |
| Claim amounts | Sum of claim amounts | `service_warranty_claims` | claimAmount | SUM | — | none | — | — | — | — | — | — | PARTIAL | servicewarrantyclaim.entity.ts:41 |
| Installation status | Installation progress | `service_installations` | status | GROUP BY status | — | none | — | — | — | — | — | list | PARTIAL | serviceinstallation.entity.ts:61 |
| Service workload | Visit volume / technician load | `service_visits`, `service_schedules` | visit_date, technician_id, scheduled_start_time | COUNT | — | none | — | — | — | — | — | visit list | PARTIAL | servicevisit.entity.ts:29-35 |
| SLA compliance | **closure ratio mislabeled** | `service_requests` | status | resolved/total named "slaCompliancePct" | AnalyticsDashboardService | `/analytics/dashboard`; `/analytics/kpis` | YES | JWT+Roles | no | point-in-time | — | — | UNSAFE | analytics-dashboard.service.ts:54-56 — NO resolution/response timestamps on ServiceRequest; true SLA is MISSING |
| MTTR | Mean time to repair | `service_visits` | — | — | — | — | — | — | — | — | — | — | MISSING | no started/completed clock timestamps — only visit_date + manual travel_hours/service_hours (servicevisit.entity.ts:45-49) |

## 7. Financial KPI Matrix

| KPI | Business Definition | Source | Fields | Calculation | Service | Endpoint | Tenant | Perm | Project | Time | Consumer | Drill-down | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Revenue | see §1 — quotation value; invoiced revenue MISSING | | | | | | | | | | | | | see §1 |
| Estimated cost | Sum of quotation estimated cost | `quotations` | estimatedCost | SUM | QuotationMarginService | `/analytics/dashboard` → profitability.totalCost | YES | JWT+Roles | no | point-in-time | — | — | READY | quotation-margin.service.ts:31,37 |
| Actual cost | Project actual cost (5 categories, aggregate) | `project_budgets` | totalActual + category actuals | SUM across budgets | AnalyticsDashboardService.computeBudgetSummary | `/analytics/dashboard` → costPerformance.totalActual | YES | JWT+Roles | no | point-in-time | — | — | READY | implemented M6 Sprint 1; projectbudget.entity.ts:28-44 |
| Cost variance | Actual vs budget (aggregate) | `project_budgets` | totalActual, totalBudgeted | (Σactual − Σbudget)/Σbudget | AnalyticsDashboardService.computeBudgetSummary | `/analytics/dashboard` → costPerformance.variancePct | YES | JWT+Roles | no | point-in-time | — | per-project health check | READY | implemented M6 Sprint 1; no financial period — point-in-time snapshot semantics |
| Margin (est.) | Quotation estimated margin | `quotations` | marginPct, totalAmount, estimatedCost | AVG marginPct; value − cost | QuotationMarginService | `/analytics/dashboard` → profitability | YES | JWT+Roles | no | point-in-time | — | — | READY | quotation-margin.service.ts:34-39 |
| Margin variance | Actual vs estimated margin | — | — | — | — | — | — | — | — | — | — | — | MISSING | no defensible cross-scope calc exposed |

## 8. Capacity KPI Matrix (summary)

All via `GET /planning/capacity/summary` (horizon/projectId/endDate), tenant fail-closed, permission-guarded.

| KPI | Calculation | Status | Evidence |
|---|---|---|---|
| Theoretical workstation capacity | systems × shifts × 8 × (days×5/7) | READY (deterministic, documented assumption) | :181 |
| Available workstation capacity | ACTIVE systems only | READY | :182 |
| Engineer capacity | designEngineers × workingDays × 8 | PARTIAL (dept-name heuristic) | :185-190 |
| Skill-constrained capacity | qualified(employeeSkills) × days × 8 | PARTIAL (all-employee fallback) | :193-198 |
| Allocated capacity | SUM(stage hours with assignedEmployeeId) | READY | :173-176 |
| Used capacity | SUM(loads.actualHours) | READY | :177 |
| Remaining headroom | max(0, eligible − demand) | READY | :201 |
| Capacity deficit | max(0, demand − eligible) | READY | :200 |
| Utilization | demand / available (engineers & workstations) | PARTIAL (heuristic denominators) | :203-209 |

**Unsafe heuristic:** `overloadedEngineersCount` = `ceil(engineers × 0.3)` when utilization >100% (:229-230) — fabricated multiplier. Must NOT be displayed.

## 9. Capacity Timeline / Forecast Matrix (G11 viz, NOT G14 ML)

| KPI | Source | Endpoint | Semantics | Status |
|---|---|---|---|---|
| Demand timeline | stages.plannedHours | `/planning/capacity/timeline` (DAILY 14/WEEKLY 8/MONTHLY 6 buckets) | uniform spread stgHrs/numBuckets — not date-aware | PARTIAL (visualize as indicative demand, labeled) |
| Capacity timeline | engineers×8h, workstations×3 shifts×8h per bucket | same | 85% eligibility factor; fallbacks | PARTIAL |
| Capacity gap (per bucket) | demand − eligible | same | status thresholds 105%/85% | PARTIAL |
| Workload trend (historical) | — | none | — | MISSING |
| ML forecast | — | — | — | DEFER G14 |

## 10. API Contract Inventory (existing, verified)

| Method | URL | Params | Response | Auth | Tenant | Status |
|---|---|---|---|---|---|---|
| GET | `/analytics/dashboard` | none | companyOverview, activeProjects, revenue, openRfqs, conversionRate, productionStatus, qualityPerformance, serviceStatus, profitability, enterpriseHealth, widgets | JWT+Roles | requireTenant fail-closed | EXISTS |
| GET | `/analytics/kpis?period=30d` | period | definitions[] (5 KPIs w/ currentValue, target, threshold) | JWT+Roles | fail-closed | EXISTS |
| GET | `/analytics/reports` · `/analytics/reports/:id/export` | — | report registry | JWT+Roles | tenant | EXISTS |
| GET | `/planning/capacity/summary` | horizon, projectId, endDate | 9-dim capacity summary | JWT+Roles | fail-closed | EXISTS |
| GET | `/planning/capacity/timeline` | horizon | demand/capacity buckets | JWT+Roles | fail-closed | EXISTS |
| GET | `/planning/capacity/utilization` | — | per-engineer report | JWT+Roles | fail-closed | EXISTS |
| GET | `/planning/capacity/recommendations` · `/risks` · `/what-if` | — | deterministic recommendations/risks | JWT+Roles | fail-closed | EXISTS |
| GET | `/project/dashboard/stats` | — | total/active/dispatched/inService/byStage/byHealth | JWT+Roles | tenant | EXISTS |
| GET | `/project/:id/baselines/variance` | — | variance/delay/health/explain | JWT+Roles | tenant+project | EXISTS |
| GET | `/manufacturing/production/dashboard` | projectId, from, to | WO counts, quantities, hours, jobStats | JWT+Roles (READ_ROLES) | tenant | EXISTS |
| GET | `/engineering/traceability/{project/:id,entity,revision-impact}` | — | trace chains | JWT+Roles | tenant | EXISTS |
| GET | `/leads/pipeline` | — | total/open/byStatus/pipelineValue/converted | JWT+Roles | tenant | EXISTS |
| GET | `/quotation/margin?from&to` | from, to | margin summary | JWT+Roles | tenant | EXISTS |
| GET | `/knowledge/search` | limit, domain | indexed knowledge | JWT+Roles | tenant | EXISTS |
| GET | `/analytics/trends?months=N` | months (1-24, default 6) | projectTrends + qualityTrends monthly buckets | JWT+Roles + @Permissions('analytics:read') | fail-closed | EXISTS (M6 Sprint 1) |

**Extended in M6 Sprint 1 (same endpoint, additive blocks):** `/analytics/dashboard` now carries `quotationValue` (replaces `revenue`), `activeProjects.delayedProjects` + `.completionPct`, `qualityPerformance.{openRatioPct, ncrBySeverity, capaByStatus, capaOpenCount, inspectionPassRate}`, `serviceStatus.closureRatePct` (replaces `slaCompliancePct`), `costPerformance.{budgetedCount,totalBudgeted,totalActual,variancePct}`.

**No aggregate endpoints exist for:** warranty claims/amounts, installation status, service workload, milestone status distribution, machine utilization, throughput, OEE, MTTR, true SLA, invoiced revenue, margin variance.

## 11. Frontend-to-Backend Mapping (audited pages)

### DashboardPage.tsx
| Displayed KPI | Class | Backend support | Verdict |
|---|---|---|---|
| 4 KPI cards (machinesRunning, openProjects, pendingDispatches, overdueCAPAs) from `KPI_MOCK` | **MOCK** (rendered unconditionally; query results unused) | machinesRunning → none; openProjects → projectStats.active (READY); pendingDispatches → byStage[DISPATCH] (READY); overdueCAPAs → none | 2 supported-but-unwired, 1 unsupported, 1 dead |
| WORKFLOW_STAGES counts (142/98/…) | **STATIC hardcoded** | byStage distribution (READY) | supported, not wired |
| FACTORY_MACHINES live states | **STATIC hardcoded** | none | unsupported |
| AI_INSIGHTS / AI_RECOMMENDATIONS / RECENT_ACTIVITIES | **STATIC/MOCK** (dashboardMockData) | none | unsupported |
| Knowledge repo widgets (Indexed Records, Documents & Articles, Search Engine) | **REAL** | /knowledge/search total | correct |
| "Updated every 30 seconds" badge | **FALSE CLAIM** (refetchInterval 5 min; activity feed = 30 s timer re-render) | — | cosmetic |
| /project/dashboard/stats query | REAL but unused for KPIs | — | orphaned |

### AnalyticsPage.tsx
| Displayed KPI | Class | Backend support | Verdict |
|---|---|---|---|
| Project Trends chart | **STATIC ALWAYS** — /analytics/dashboard has no `projectTrends` key → fallback array used even on success | none | unsupported |
| Quality Metrics chart (NCRs/CAPAs) | **STATIC ALWAYS** — no `qualityMetrics` key | none | unsupported |
| "tracking above historical baseline" / "CAPAs trending flat" captions | **FABRICATED narrative** | none | remove |
| Metabase placeholder card | **PLACEHOLDER** | none | remove |
| Live analytics badge | cosmetic | — | — |

### CapacityPlanningPage.tsx
| Displayed KPI | Class | Backend support | Verdict |
|---|---|---|---|
| summary/timeline/utilization/recommendations/risks/what-if | **REAL** (/planning/capacity/*) | fully supported | correct — precedent for M6 |

## 12. Unsupported KPI Inventory (shown by UI, no backend)
- Machines running (no machine master / live state feed)
- Factory machine live states
- ~~Overdue CAPAs~~ → now READY (`capaByStatus`/`capaOpenCount`, M6 Sprint 1)
- ~~Project Trends time series~~ → now READY (`/analytics/trends` projectTrends, M6 Sprint 1)
- ~~Quality Metrics time series~~ → now READY (`/analytics/trends` qualityTrends, M6 Sprint 1)
- AI insights / recommendations / activity feed (hardcoded)
- Workflow "items" counts (hardcoded; byStage exists but unwired — Sprint 2)

## 13. Unsafe KPI Inventory (must not be certified as named) — RESOLUTION STATUS (M6 Sprint 1)
| KPI | Why unsafe | Correct action | Status |
|---|---|---|---|
| "Revenue" (dashboard + KPI def) | Actual calc = quotation value incl. SENT; KPI formula string claims "accepted quotations" — mismatch | relabel "Quotation Value (active quotes)"; fix formula string; invoiced revenue stays MISSING | ✅ DONE — `quotationValue` block + KPI id `quotation-value`; `revenue` keys removed |
| "Quality Defect Rate" | openNcrs/totalNcrs is an open-NCR ratio, not defect rate; target 0.05 vs ratio semantics | relabel "Open NCR ratio"; real pass rate from inspection_reports | ✅ DONE — `openRatioPct` + KPI `open-ncr-ratio`; `defectRatePct` removed; inspection pass rate added |
| "Service SLA Compliance" | closure ratio (resolved/total), no timestamps exist | relabel "Request closure rate"; SLA = MISSING | ✅ DONE — `closureRatePct` + KPI `service-request-closure-rate`; `slaCompliancePct` removed |
| production-output KPI | formula string "completedQty/plannedQty" but currentValue = completed count | expose ratio or fix definition | ✅ DONE — currentValue = completed/planned, 0-guard |
| jobStats.onTime | dead field, always 0 | never display | ✅ DONE — removed from payload |
| overloadedEngineersCount | fabricated 0.3× multiplier | never display | ✅ DONE — removed from summary + interface; authoritative per-engineer overload lives in `getEngineerUtilization` / capacity-leveling |
| Capacity timeline | uniform demand spread + 85% factor + fallbacks | label "indicative", document assumptions | ⏳ Sprint 2 — engine preserved, labeling on frontend |
| Analytics captions | fabricated trend statements | remove | ⏳ Sprint 2 |

## 14. Recommended G11 KPI Set (certifiable)
1. Quotation Value (active quotes) — READY ✅ (Sprint 1)
2. Quotation margin (est. value, %, count) — READY
3. Lead pipeline (open, value, conversion) — READY
4. Active projects / project count / by stage / by health / delayed count / completion % — READY ✅ (Sprint 1)
5. Schedule variance (per project) + health mix — READY
6. Capacity summary 9-dim (gap, headroom, allocation, used) — READY
7. Capacity timeline (indicative demand vs capacity, labeled) — PARTIAL (accept with labels)
8. Production output (planned/completed/rework/scrap qty), WO status mix, planned-vs-actual hours, late jobs — READY
9. NCR total/open + open ratio (relabeled) + severity mix + inspection pass rate — READY ✅ (Sprint 1)
10. Service requests open/closed + closure rate (relabeled) — READY ✅ (Sprint 1)
11. Engineering artifact coverage (drawings/BOMs/reviews/ECRs) — READY
12. CAPA open/status — READY ✅ (Sprint 1)
13. Budget/cost variance exposure — READY ✅ (Sprint 1)
14. Monthly NCR & project trend series — READY ✅ (Sprint 1, `/analytics/trends`)

**Excluded from G11:** OEE (MISSING — no availability/performance denominators), machine utilization/availability, throughput rate, MTTR, true SLA, invoiced revenue, margin variance, ML forecast (G14), AI insights feed (G13).

## 15. KPI Certification Criteria (G11 gate)
For every certified KPI: (1) UI KPI → frontend API call → backend endpoint → service aggregate → authoritative DB source chain demonstrable in evidence matrix; (2) tenant-scoped + fail-closed + permission-guarded; (3) no mock/static/fallback/placeholder/fabricated narrative; (4) exact label matches exact calculation (no relabel drift); (5) drill-down path to source records; (6) E2E assertion in `m6-bi-dashboard.e2e-spec.ts` with seeded tenant data; (7) response time budget met.

---

# PHASE 1 COMPLETE → SUPERSEDED BY PHASE 2 (Sprint 1) EXECUTION

**Phase 1 totals — 61 KPIs audited:** READY 30 · PARTIAL 21 · MISSING 8 · UNSAFE 2.

**Post-Sprint 1 status (Phase 2):** 8 gated aggregates implemented + 6 semantic corrections applied (see §13). Rejected/not implemented aggregates — warranty claims/amounts, installation status, service workload, milestone status distribution, machine utilization/availability, throughput, OEE, MTTR, true SLA, invoiced revenue, margin variance — recorded in M6_MOCK_DATA_AUDIT.md / M6_IMPLEMENTATION_PLAN.md as deferred (authority or milestone boundary).

**Remaining Sprint 2 work:** frontend mock removal + wiring (see §11 mapping), capacity timeline labeling, caption removal.

**1. Which KPIs can be certified immediately?**
Quotation value, quotation margin, lead pipeline, active projects/count/stage/health mix, schedule variance, capacity summary (9-dim), production output + WO status + hours + late jobs, NCR total/open/open-ratio, service open/closed/closure-rate, engineering artifact coverage — 30 READY (pending label corrections for 3: "Revenue"→Quotation Value, defect-rate→open ratio, SLA→closure rate).

**2. Which require new aggregate endpoints?**
CAPA status/open count, NCR by severity, inspection pass rate, project completion %, delayed-project count, budget/cost-variance exposure, monthly trend series (NCR + project). Each gated: only if authority + cost justified. No endpoint invention beyond these; all data exists.

**3. Which should NOT appear in G11?**
OEE, machine utilization/availability, throughput, MTTR, SLA (as SLA), invoiced revenue, margin variance, AI insights, machine live states, quality trend chart, project trend chart (until backend time series added — gate 2 above).

**4. Which already have drill-down?**
Capacity (per-engineer utilization report, project filter), production (board, job cards), NCR (list with severity/status filters), service requests (list), projects (stage/health → list), schedule variance (baseline detail). Missing: CAPA/severity/trend drill-down (comes with gated endpoints).

**5. Minimum backend work?**
(a) fix 3 relabels + production-output formula in analytics-kpi.service.ts + dashboard payload naming; (b) gated aggregates (CAPA, severity, pass rate, completion %, budget variance, delayed count, 2 trend series) — only those proven authoritative; (c) nothing else. No schema changes required.

**6. Frontend-only?**
All mock removal: 4 KPI cards → real endpoints (machinesRunning removed; overdueCAPAs waits for CAPA endpoint), WORKFLOW_STAGES → byStage, remove factory machines + AI panels + activity feed (or "not yet available"), remove fallback arrays + Metabase placeholder + fabricated captions + false "30s updates" badge; wire drill-down navigation; capacity forecast chart from existing /planning/capacity/timeline (labeled indicative).

**7. Deferred to G14?**
ML forecast/prediction, predictive utilization, anomaly detection, AI insight generation (also G13 gate).

---

Sprint 1 (Phase 2) executed — see M6 Sprint 1 report. Sprint 2 (frontend rewiring) pending authorization.