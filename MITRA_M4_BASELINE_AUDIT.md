# MITRA M4 — BASELINE AUDIT
**Shop Floor Execution & Quality Closed Loop**

- **Audit Date**: August 19, 2026
- **Release Baseline**: MITRA `v4.3.0` (`eb6260a9d8be0a76aa3b89ab8b27bd3f9232913c`)
- **Branch**: `v3.3`
- **Database**: PostgreSQL 16 (`mitra_v2`, `mitra_v2_test`)
- **Status**: BASELINE AUDIT COMPLETE (Zero Implementation Phase)

---

## 1. Git Baseline & Release Integrity

| Parameter | Certified Requirement | Current Working Tree | Verdict |
|---|---|---|:---:|
| **Git Branch** | `v3.3` | `v3.3` | **PASS** |
| **Commit SHA** | `eb6260a9d8be0a76aa3b89ab8b27bd3f9232913c` | `eb6260a9d8be0a76aa3b89ab8b27bd3f9232913c` | **PASS** |
| **Release Tag** | `v4.3.0` (annotated) | `v4.3.0` points to `eb6260a...` | **PASS** |
| **Working Tree** | Certified Baseline | Clean / Untracked documentation only | **PASS** |
| **Prior Milestones** | M1, M2, M3 certified | M1 (People/Decisions), M2 (Design Load/Baselines/Capacity), M3 (Kernel/BOM/Governance) fully certified | **PASS** |

---

## 2. Module-by-Module Current State Audit

### 2.1 Manufacturing Module (`mitra-backend/src/modules/manufacturing/`)
- **Entities Present**:
  - `WorkOrder` (`work_orders`): Tracks `woNumber`, `projectId`, `partId`, `drawingId`, `bomId`, `routingId`, `status` (`DRAFT`, `RELEASED`, `IN_PROGRESS`, `PAUSED`, `ON_HOLD`, `COMPLETED`, `CANCELLED`, `REWORK`, `SCRAPPED`), `costBaseline`, `actualHours`, `completedQty`, immutable execution `snapshot` (JSONB).
  - `JobCard` (`job_cards`): Tracks `jobCardNumber`, `workOrderId`, `operationId`, `operatorId`, `machineId`, `status`, `plannedHours`, `actualHours`, `producedQty`, `rejectedQty`, `scrapQty`.
  - `OperationLog` (`operation_logs`): Captures time tracking, shift, runtime, downtime, setup time, quantity produced/rejected.
  - `MaterialReservation` (`material_reservations`): Tracks BOM component reservations and allocations.
  - `InspectionCheckpoint` (`inspection_checkpoints`): In-process quality checkpoints generated from routing operations.
  - `ProductionBatch` (`production_batches`) & `MaterialIssue` (`material_issues`).
- **Services Present**:
  - `WorkOrderEngineService`: Handles generation from released routings, release package snapshotting, workflow state transitions, and trace edge emission.
  - `ShopFloorService`: Handles `startJob`, `logProduction`, `completeJob`, pause/resume/hold, and work order rollup.
  - `SchedulingService`: Handles machine load overview (`/manufacturing/scheduling/overview`), job-to-machine assignment, and machine bookings.
  - `InspectionService`: Handles in-process checkpoint result recording (`PASS`, `FAIL`, `SKIP`, `NA`). Automatically raises an NCR on `FAIL`.

### 2.2 Machine Module (`mitra-backend/src/modules/machine/`)
- **Entities Present**:
  - `MachineMaster` (`machine_master`): Machine catalog, machine type, status (`AVAILABLE`, `IN_USE`, `UNDER_MAINTENANCE`, `OFFLINE`), hourly rate, location.
  - `MachineBooking` (`machine_bookings`): Booking intervals, job card linkage, booked hours, status (`REQUESTED`, `CONFIRMED`, `IN_USE`, `COMPLETED`, `CANCELLED`).
  - `MachineType` (`machine_types`) & `MachineCalendar` (`machine_calendars`).
- **Services & Controllers Present**:
  - `MachineMasterService`, `MachineBookingService`, `MachineController`.

### 2.3 Quality Module (`mitra-backend/src/modules/quality/`)
- **Entities Present**:
  - `NcrRecord` (`ncr_records`): Non-conformance records with `ncrNumber`, `projectId`, `workOrderId`, `jobCardId`, `operationId`, `severity` (`MINOR`, `MAJOR`, `CRITICAL`), `status` (`OPEN`, `INVESTIGATION`, `ACTION`, `VERIFIED`, `CLOSED`), `disposition` (`USE_AS_IS`, `REWORK`, `SCRAP`, `RETURN`, `REJECT`, `OTHER`).
  - `CapaVerification` (`capa_verifications`): Corrective & Preventive Action with `capaNumber`, `projectId`, `ncrId`, `trialId`, `status` (`OPEN`, `IN_PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `CLOSED`, `REJECTED`), `rootCauseMethod`, `correctiveAction`, `preventiveAction`.
  - `TrialObservation` (`trial_observations`): Tooling / mold trials with `trialNumber`, `projectId`, `partId`, `drawingId`, `bomItemId`, `routingId`, `trialSequence`, `trialType` (`INTERNAL`, `CUSTOMER`, `RETRIAL`), process parameters (`moldTemperatureC`, `injectionPressureBar`, `cycleTimeSeconds`), `shotsTaken`, `goodParts`, `rejectedParts`, `result` (`PASS`, `FAIL`, `CONDITIONAL`, `PENDING`), `defectsObserved`.
  - `Retrial` (`retrials`): Retrial authorization entity linking `originalTrialId`, `retrialSequence`, `retrialReason`, `changesMade`, `status`.
  - `InspectionPlan` (`inspection_plans`), `ControlPlan` (`control_plans`), `Fmea` (`fmeas`), `PpapApqp` (`ppap_apqp`), `SupplierInspection` (`supplier_inspections`), `CustomerComplaint` (`customer_complaints`).
- **Services & Controllers Present**:
  - `NcrService` & `NcrController` (`/quality/ncr`).
  - `CapaService` & `CapaController` (`/capa`).
  - `TrialObservationService` & `TrialObservationController` (`/quality/trials`).
  - `InspectionPlanService`, `QualityBaseService`, `SupplierInspectionService`.

---

## 3. Audit of Golden Scenarios G7, G8, G9

### 3.1 Golden Scenario G7 — Work Order Execution with Machine Scheduling
- **Current State**:
  - Generation of work order from released engineering artifacts (`Routing`, `Drawing`, `BOM`) is implemented and verified.
  - Job cards are generated per routing operation on work order release.
  - Finite scheduling overview calculates machine bookings and open jobs.
  - Job card assignment to machine creates `MachineBooking`.
  - Operator logging logs production quantities and actual hours.
- **Identified Baseline Gaps for G7**:
  1. **Strict Machine Conflict Checking**: Currently soft booking only; no deterministic check preventing assigning two concurrent active jobs to the same non-concurrent machine without explicit supervisor override.
  2. **Job Card Sequence Dependency**: Operations can currently be started out-of-order without checking whether predecessor operations are completed or authorized for parallel release.
  3. **Work Order Auto-Completion Validation**: Work order completion does not verify that all mandatory child job cards have reached terminal status (`COMPLETED`, `CANCELLED`, `SCRAPPED`).

### 3.2 Golden Scenario G8 — In-Process Inspection $\to$ NCR $\to$ CAPA Closure
- **Current State**:
  - In-process checkpoints are generated from routing quality checkpoints on work order release.
  - Failing a checkpoint auto-creates an `OPEN` `NcrRecord` and emits `INSPECTION_FAILED` outbox event.
  - NCR lifecycle transitions (`OPEN` $\to$ `INVESTIGATION` $\to$ `ACTION` $\to$ `VERIFIED` $\to$ `CLOSED`) are implemented with RBAC.
  - `CapaVerification` entity exists in database schema.
- **Identified Baseline Gaps for G8**:
  1. **Hard Quality Gate on Work Order Completion**: Work order completion transition (`transition(woId, 'COMPLETE')`) currently DOES NOT check for unresolved critical/major NCRs. A work order can currently be marked `COMPLETED` even with open critical defect NCRs.
  2. **NCR-to-CAPA Linking & Escalation**: Creating a CAPA from an NCR is not exposed as a dedicated atomic workflow endpoint (`/quality/ncr/:id/escalate-capa` or `/capa/from-ncr`).
  3. **CAPA Verification & Closure Feedback Loop**: CAPA verification does not verify that root cause and corrective actions have been verified before closing linked NCRs.

### 3.3 Golden Scenario G9 — Tooling Trial Run $\to$ Results $\to$ Retrial Decision
- **Current State**:
  - `TrialObservation` entity and service allow recording trial process parameters (temperatures, pressures, cycle time, shots, defect list).
  - Validation ensures `drawingId`, `bomItemId`, `routingId` exist in tenant database.
  - `Retrial` entity exists in DB schema.
- **Identified Baseline Gaps for G9**:
  1. **Retrial Workflow Governance**: If a trial result is `FAIL` or `CONDITIONAL`, there is no structured workflow endpoint to initiate and approve a formal `Retrial` (`/quality/trials/:id/request-retrial` and `/quality/retrials/:id/approve`).
  2. **Trial Engineering Change Trigger**: Failing a trial often requires an engineering change request (ECR). Seamless linking from failed trial to `EngineeringChangeRequest` (`trial_id` on ECR) is not formalized.
  3. **Frontend Trials Experience**: `TrialsPage.tsx` is currently a minimal mockup calling a generic endpoint with static modal stubs instead of rich process parameter entry, defect logging, and retrial progression.

---

## 4. Digital Thread & `project_id` Traceability Audit

| Entity | `project_id` column | Indexed | Tenant Scoped | Verified in Seed/E2E |
|---|:---:|:---:|:---:|:---:|
| `WorkOrder` | Yes (`project_id`) | Yes | Yes (`tenant_id`) | Yes |
| `JobCard` | Inherits from WO | Via WO | Yes (`tenant_id`) | Yes |
| `OperationLog` | Inherits from WO | Via WO | Yes (`tenant_id`) | Yes |
| `InspectionCheckpoint` | Inherits from WO | Via WO | Yes (`tenant_id`) | Yes |
| `NcrRecord` | Yes (`project_id`) | Yes | Yes (`tenant_id`) | Yes |
| `CapaVerification` | Yes (`project_id`) | Yes | Yes (`tenant_id`) | Yes |
| `TrialObservation` | Yes (`project_id`) | Yes | Yes (`tenant_id`) | Yes |
| `Retrial` | Yes (`project_id`) | Yes | Yes (`tenant_id`) | Yes |

---

## 5. Summary of What Exists vs What is Missing

### What Already Exists:
1. Complete PostgreSQL 16 schema tables for `work_orders`, `job_cards`, `operation_logs`, `machine_bookings`, `machine_master`, `inspection_checkpoints`, `ncr_records`, `capa_verifications`, `trial_observations`, `retrials`.
2. Core backend CRUD services for Work Orders, Job Cards, Scheduling, NCRs, and Trials.
3. Outbox event publishing for domain events (`WORK_ORDER_RELEASED`, `WORK_ORDER_COMPLETED`, `JOB_STARTED`, `JOB_COMPLETED`, `INSPECTION_FAILED`, `NCR_RAISED`).
4. Fail-closed multi-tenant security across all manufacturing and quality entities.
5. Rich baseline frontend components in `ManufacturingPage.tsx` and `QualityPage.tsx`.

### What Is Missing (M4 Target Scope):
1. **Quality Gate Barrier**: Prevent Work Order completion when unresolved `CRITICAL` or `MAJOR` NCRs exist (`HTTP 400 Bad Request` with explainable reason).
2. **NCR $\to$ CAPA Closed-Loop Flow**: Dedicated service and endpoint to escalate an NCR into a formal CAPA, track corrective/preventive verification, and update NCR disposition.
3. **Trial $\to$ Retrial Decision Workflow**: Dedicated trial decisioning endpoint (`PASS` $\to$ approve for production, `FAIL` $\to$ trigger Retrial / ECR with root cause reason).
4. **Operation Sequencing Enforcement**: Optional sequential check on job cards ensuring predecessor routing steps are verified.
5. **Frontend Experience Alignment**: Upgrade `ManufacturingPage.tsx`, `QualityPage.tsx`, `CapaPage.tsx`, and `TrialsPage.tsx` to utilize full M4 closed-loop workflows with zero mock fallbacks.
6. **Deterministic Integration Tests**: Write `test/m4-shop-floor-execution.e2e-spec.ts`, `test/m4-quality-closed-loop.e2e-spec.ts`, and `test/m4-trial-governance.e2e-spec.ts` covering Golden Scenarios G7, G8, G9.
