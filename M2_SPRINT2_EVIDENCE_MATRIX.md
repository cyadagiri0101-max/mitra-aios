# MITRA M2 Sprint 2 — Evidence Matrix (Golden Scenarios G2 & G3)

**Sprint:** M2 Sprint 2 — Project Planning, Baselines & Capacity Intelligence  
**Release Baseline:** `71780dc0` (Tag: `v4.2.0`, Branch: `v3.3`)  
**Audit Date:** 2026-08-18  
**Verifier:** Primary Implementation Engineer / Automated CI Suite  

---

## 1. Golden Scenario G2 — Project Planning with Baselines & Variance

| Requirement | Test Specification | API Evidence | Audit Evidence | UI Evidence | RBAC Evidence | Tenant Isolation | E2E Suite | Status |
|---|---|---|---|---|---|---|---|---|
| **Immutable Baseline Snapshot** | Capture full snapshot of milestones, tasks, and design stages | `POST /api/project/:projectId/baselines` $\rightarrow$ 201 Created (`BL-0001`, `isLocked: false`) | `action: 'CREATE'`, `entityType: 'ScheduleBaseline'`, `project_id: projectId` | Snapshot card rendered with duration and hours summary | `@Permissions('baseline:create')` enforced | Tenant B query $\rightarrow$ 404 Not Found | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 3) | **CERTIFIED** |
| **Baseline Activation & Freeze** | Activate baseline, freeze snapshot, lock changes | `POST /api/project/:projectId/baselines/:id/activate` $\rightarrow$ 201/200 (`status: 'ACTIVE'`, `isLocked: true`) | `action: 'UPDATE'`, `eventType: 'baseline.activated'`, `project_id: projectId` | "ACTIVE" badge with green indicator | `@Permissions('baseline:activate')` enforced | Cross-tenant activation rejected (404) | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 4) | **CERTIFIED** |
| **Deterministic Variance Engine** | Compute $\Delta\text{days}$, $\Delta\text{hours}$, $\%$, schedule health, and explainable trace string | `GET /api/project/:projectId/baselines/variance` $\rightarrow$ 200 OK (`overallScheduleVarianceDays: 2`, `overallHoursVariance: 16`, `isBehindSchedule: true`) | `metadata: { url: '/api/project/.../variance', success: true }` | Schedule Variance KPI card (+2d), Workload Delta (+16h), calculation trace banner | `@Permissions('baseline:compare')` enforced | Tenant B denied access (404) | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 6) | **CERTIFIED** |
| **Baseline Versioning & Supersession** | Create and activate `BL-0002`; transition `BL-0001` to `SUPERSEDED` while keeping items immutable | `POST /api/project/:projectId/baselines/:id2/activate` $\rightarrow$ 200 OK (`BL-0001.status: 'SUPERSEDED'`, `BL-0002.status: 'ACTIVE'`) | `eventType: 'baseline.superseded'`, `project_id: projectId` | History timeline shows `BL-0001 (SUPERSEDED)` and `BL-0002 (ACTIVE)` | `@Permissions('baseline:activate')` enforced | Tenant isolation preserved | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Steps 7–8) | **CERTIFIED** |
| **Multi-Tenant Security & IDOR** | Verify complete isolation across tenants | Tenant B queries Tenant A baseline/variance $\rightarrow$ 404 Not Found | `success: false, error: "Project not found"` | Tenant B sees isolated workspace | `TenantAwareService` fail-closed | Verified across all endpoints | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 9) | **CERTIFIED** |

---

## 2. Extended Golden Scenario G3 — Capacity Plan & Demand Intelligence

| Requirement | Test Specification | API Evidence | Audit Evidence | UI Evidence | RBAC Evidence | Tenant Isolation | E2E Suite | Status |
|---|---|---|---|---|---|---|---|---|
| **Multi-Project Demand Timeline** | Distribute design workload across `DAILY`, `WEEKLY`, `MONTHLY` horizons | `GET /api/planning/capacity/timeline?horizon=WEEKLY` $\rightarrow$ 200 OK (8 weekly buckets with demand and capacity) | Global audit row with tenant context | Horizon selector (`DAILY`, `WEEKLY`, `MONTHLY`) and timeline table | `@Permissions('capacity:read')` enforced | Only tenant's active projects aggregated | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 11) | **CERTIFIED** |
| **8-Dimensional Capacity Accounting** | Aggregate theoretical studio (240h/day), available CAD stations, engineer hours, skill eligible hours, demand, gap, and utilization % | `GET /api/planning/capacity/summary?horizon=MONTHLY` $\rightarrow$ 200 OK (`theoreticalWorkstationCapacityHours: 7200`, `totalEngineerAvailableHours: 160`, `capacityGapHours: 0`) | Global audit row logged | Top KPI metric cards with status colors | `@Permissions('capacity:read')` enforced | Tenant isolation verified | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 10) | **CERTIFIED** |
| **Live Engineer Utilization** | Track allocated vs actual hours per engineer against 160h standard with overload detection | `GET /api/planning/capacity/utilization` $\rightarrow$ 200 OK (engineer list with allocated %, actual %, verified skills, `isOverloaded` flag) | Audit row with user and tenant ID | Live Engineer Workload table with skill tags and overload progress bars | `@Permissions('capacity:read')` enforced | Cross-tenant engineer leakage blocked | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 12) | **CERTIFIED** |
| **Deterministic What-If Simulator** | Simulate staffing (+engineers, weekly hrs), workstations, and outsourcing without mutating production state | `POST /api/planning/capacity/what-if` (`addEngineers: 2`, `outsourceHours: 50`) $\rightarrow$ 201 Created (`resolvedGapHours: 370`, explainable result) | `action: 'POST'`, `entityType: 'capacity-what-if'` | Interactive simulator panel with real-time gap resolution card | `@Permissions('capacity:simulate')` enforced | Read-only simulation tenant-isolated | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 13) | **CERTIFIED** |
| **Recommendations & Risk Alerts** | Deterministic rule-based recommendations (`REASSIGN`, `OVERTIME`, `OUTSOURCE`) and risk alerts (`OVERLOAD`, `SKILL_SHORTAGE`) | `GET /api/planning/capacity/recommendations` and `GET /api/planning/capacity/risks` $\rightarrow$ 200 OK | Audit rows captured | Recommendations feed & Risk Alerts panel | `@Permissions('capacity:read')` enforced | Tenant isolation verified | `test/m2-sprint2-planning-baselines.e2e-spec.ts` (Step 14) | **CERTIFIED** |

---

## 3. Test & Verification Run Summary

- **Backend Unit Tests:** `114/114` test suites passed, `1,149/1,149` tests passed.
- **Backend E2E Integration Suites:** `4/4` suites passed (`m1-people`, `m1-engineering-decisions`, `m2-design-load`, `m2-sprint2-planning-baselines`), `35/35` tests passed.
- **Frontend Build (`tsc && vite build`):** 0 errors.
- **PostgreSQL Schema Integrity (`schema:validate`):** 189 entity definitions checked against PostgreSQL database with 0 missing columns / 0 orphan DB tables.
