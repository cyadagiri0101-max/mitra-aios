# M2 Sprint 2 — Implementation Plan: Project Planning, Baselines & Capacity Intelligence

**Baseline:** `71780dc0` (v4.2.0 baseline + verified M1 + verified M2 Sprint 1)  
**Goal:** Deliver full Schedule Baselines lifecycle & deterministic Variance Engine (unblocking Golden Scenario G2), Multi-Project Demand vs Capacity Intelligence Engine across Daily/Weekly/Monthly horizons, Skill-Constrained Capacity, Live Engineer Utilization, What-If Simulation, Deterministic Recommendations, and Capacity Risk Detection (extending Golden Scenario G3 and unblocking G11 aggregate APIs).

---

## 1. Architecture Overview & Component Reuse

### 1.1 Existing Reused Foundations
- **Project & Schedule Domain (`ProjectModule`):** `Project`, `ProjectMilestone`, `ProjectTask`, `TaskDependency` entities and timeline calculation.
- **Design Load Engine (`DesignLoadModule` — M2 Sprint 1):** `DesignLoadStandard`, `DesignLoadStandardStage`, `ProjectDesignLoad`, `ProjectDesignLoadStage`, `DesignSystem` (10 CAD workstations), `DesignShift` (3 continuous shifts, 240h/day theoretical studio capacity).
- **People Master Data (`PeopleModule` — M1):** `Employee`, `Skill`, `EmployeeSkill` (with proficiency levels `BEGINNER` to `EXPERT`), `ResourceAvailability` (`AVAILABLE`, `PLANNED`, `UNAVAILABLE`).
- **Governance & Audit (`AuditModule`, `PlatformModule`):** `AuditService` with `project_id` scoping, `OutboxService` for domain events, `@Permissions` RBAC, and `TenantAwareService` fail-closed tenant isolation.

### 1.2 New Architecture in M2 Sprint 2
1. **Schedule Baseline Domain:**
   - `ScheduleBaseline` entity (`schedule_baselines` table) — versioned planning snapshot with status `DRAFT`, `ACTIVE`, `SUPERSEDED`, `CANCELLED`.
   - `ScheduleBaselineItem` entity (`schedule_baseline_items` table) — frozen snapshot items for milestones, tasks, and design stages.
   - `ScheduleBaselineService` — snapshot engine, activation & supersession lifecycle, and deterministic variance engine ($\text{Current Plan} - \text{Baseline}$ and $\text{Actual} - \text{Baseline}$).
2. **Capacity Intelligence & Workload Engine:**
   - `CapacityIntelligenceService` — multi-project time-distributed demand aggregation (daily, weekly, monthly), 8-dimensional capacity accounting, skill-constrained eligible capacity lookup, engineer live utilization calculation, what-if scenario simulator, rule-based recommendation generator, and capacity risk detector.
3. **Database Migration:**
   - `1700000000039-M2Sprint2BaselinesCapacity.ts` adding tables, indexes, and RBAC permissions.
4. **Controllers & Endpoints:**
   - `ScheduleBaselineController` (`/api/projects/:projectId/baselines`, `/api/baselines`)
   - `CapacityIntelligenceController` (`/api/planning/capacity`)
5. **Frontend Pages & Visuals:**
   - `ScheduleBaselinesPage.tsx` / Baseline & Variance Manager
   - `CapacityPlanningPage.tsx` / Multi-Project Capacity, Utilization & What-If Dashboard
6. **Verification & Golden Scenarios:**
   - Unit tests: `schedule-baseline.service.spec.ts`, `capacity-intelligence.service.spec.ts`
   - E2E Test Suite: `test/m2-sprint2-planning-baselines.e2e-spec.ts` validating **Golden Scenario G2** (Project Planning with Baselines) and **Extended Golden Scenario G3** (Multi-Project Demand vs Capacity Intelligence).

---

## 2. Implementation Steps

1. **Entities & DTOs:**
   - Create `ScheduleBaseline` & `ScheduleBaselineItem` in `mitra-backend/src/modules/project/entities/`.
   - Create baseline DTOs and capacity simulation DTOs.
2. **Migration & Permissions:**
   - Create Migration `0039` for `schedule_baselines`, `schedule_baseline_items`, and permissions (`baseline:read`, `baseline:create`, `baseline:activate`, `baseline:compare`, `capacity:read`, `capacity:simulate`).
   - Register permissions and seed in `seed.ts`.
3. **Services Implementation:**
   - Implement `ScheduleBaselineService` with snapshot capture, freeze, lifecycle management, and variance analysis.
   - Implement `CapacityIntelligenceService` with multi-project distribution, skill constraints, utilization, what-if, recommendations, and risks.
4. **Controllers & Module Registration:**
   - Register controllers in `ProjectModule` and `AppModule`.
5. **Frontend Implementation:**
   - Create `ScheduleBaselinesPage.tsx` and `CapacityPlanningPage.tsx`.
   - Wire into `App.tsx` and `Sidebar.tsx` with `'M2'` badge.
6. **Testing & Certification:**
   - Run backend unit tests, frontend build, and comprehensive E2E test suite covering G2 and G3.
   - Update `MITRA_VISION_100_GAP_MATRIX.md` and `MITRA_GOLDEN_SCENARIOS.md`.
