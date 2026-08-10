# Manufacturing Architecture — Sprint 2.4 MES

> **Scope:** MES core (work-order engine, shop-floor execution, machines, scheduling, materials, inspection/NCR, production tracking).
> **Status:** implemented, verified (61 suites / 713 tests, tsc clean).
> **Related:** `docs/reports/Manufacturing_Gap_Analysis.md` (Phase 1), `docs/reports/MES_Workflow.md`, `docs/reports/Traceability_Model.md`.

## 1. Principles

1. **Single source of truth = Engineering.** MES never duplicates drawings, BOMs, routings, process plans or machine-type definitions. It references them via UUID columns + `@Index` (no TypeORM relations) and copies only *derived* operational data.
2. **Work order is an execution unit, not an engineering document.** A work order is created against released artifacts and locked into an immutable `snapshot` at release time (drawing/BOM/routing/process-plan revisions + cost baseline).
3. **Workflows are DB-driven.** The work-order and job-card workflows are seeded workflow instances (migration 0019, platform `workflow_instances`), executed by `WorkflowEngineService`. No hardcoded state machines in services.
4. **Everything is recorded.** Every action appends an outbox row inside the same transaction → `OperationLog` for shop-floor events, `WorkflowInstance` history for transitions, `MaterialReservation`/`MaterialIssue`/`InspectionCheckpoint`/`NcrRecord` for quality/material state.
5. **Cross-module reads via raw SQL.** No `relations:` joins across module boundaries; reads use `createQueryBuilder`/`query` with tenant filtering.

## 2. Module Layout

```
engineering/   (source of truth — imports nothing from manufacturing)
  ├─ EngineeringModule ──┐
manufacturing/           │ (imports EngineeringModule)
  ├─ ManufacturingModule ├── WorkflowModule (platform) ─┐
  │   ├─ WorkOrderEngineService          │              │
  │   ├─ ShopFloorService                │              │
  │   ├─ SchedulingService               │              │
  │   ├─ MaterialManagementService       │              │
  │   ├─ InspectionService               │              │
  │   └─ ProductionTrackingService       │              │
  │   ├─ controllers (workorder, jobcard, scheduling,   │
  │   │   material-management, inspection, production)  │
  │   └─ entities: workorder, jobcard, operationlog,    │
  │       operation, productionbatch, materialreservation,
  │       materialissue, inspectioncheckpoint            │
  ├─ machine/ (MachineModule → PlatformModule)
  │   ├─ MachineMasterService + MachineMasterController (mounted at manufacturing/machines)
  │   └─ entities: machinemaster, machinetype, machinecalendar, machinebooking
  └─ quality/ (QualityModule → PlatformModule, imports NcrRecord)
      └─ NcrService + NcrController (quality/ncr)
```

Dependency direction is strict: `manufacturing → engineering, quality, machine, platform`; no reverse imports. `engineering.module` imports `manufacturing.module` (existing 2.3.1 link) — therefore manufacturing must NOT import engineering at module level (cycle avoided); the engine reads engineering tables via raw SQL/query builder.

## 3. Data Model (delta, migration 0019)

| Table | Role | Key columns |
|---|---|---|
| `work_orders` (extended) | execution order | `snapshot` jsonb, `cost_baseline`, `released_by/at`, `rework_qty`, `scrap_qty`; CHECK extended for new statuses |
| `job_cards` (extended) | per-operation execution | qty/rework/scrap, setup/downtime, `started_at/completed_at`, `hold_reason`; CHECK extended for new statuses |
| `operation_logs` (extended) | machine-level production log | `rework_qty`, `scrap_qty`, `setup_time_minutes` |
| `material_reservations` | material demand per WO | `reservation_number` (RSV-), part, planned/reserved/issued qty, status enum, batch, store |
| `material_issues` (extended) | issue slips | `issue_number` (MI-), `unit` (not uom), material code/description, qty, batch, store |
| `inspection_checkpoints` | inspection plan per WO | checkpoint number/name, reference limits (4 varchar columns), `is_critical`, status enum, measured value, inspector, report link |
| `ncr_records` | non-conformance register | `ncr_number` (NCR-), type/severity/disposition/status enums, detected/rejected qty, root cause, `closed_at` |

All new tables extend `IndustrialBaseEntity` (id, tenant_id, timestamps, deleted_at, version) and carry `tenant_id` filtering in every service read.

## 4. Workflow seeds (migration 0019)

| Workflow | type_key | Nodes | Transitions |
|---|---|---|---|
| Work Order | `work_order_lifecycle` | draft, released, in_progress, paused, on_hold, rework, completed, cancelled, scrapped | 14 (`m2000000-…`, WO-*) |
| Job Card | `job_card_lifecycle` | open, in_progress, paused, on_hold, rework, completed, cancelled, scrapped | 10 (`m4000000-…`, JC-*) |

Transition keys map to UUIDs in `manufacturing.constants.ts` (`WORK_ORDER_TRANSITIONS`, `JOB_TRANSITIONS`); the platform `WorkflowEngineService.executeTransition` persists history + current state atomically. Return value is the saved `WorkflowInstance` — to-state = `transition.currentState.stateCode`, from-state = `transition.history[last].fromState`.

## 5. Services

| Service | Responsibility |
|---|---|
| `WorkOrderEngineService` | `generateFromArtifacts` (draft WO + job cards + reservations + checkpoints from released BOM/routing/process-plan + drawing), `release` (guards DRAFT + RELEASED artifacts, writes snapshot, outbox WORK_ORDER_RELEASED, trace edges), `transition`, reads (job cards, reservations, checkpoints) |
| `ShopFloorService` | job start / production log (`logProduction` → operation_log + qty rollups), job transitions, WO roll-up (auto COMPLETED/SCRAPPED when all job cards terminal, releases material reservations on completion) |
| `MachineMasterService` | machine CRUD, maintenance flag (MACHINE_MAINTENANCE / MACHINE_STOPPED), calendars, bookings (soft overlap advisory), queue (raw SQL over job_cards/work_orders), utilization, next-available |
| `SchedulingService` | overview (machines × load × open jobs), `assignToMachine` (SCHEDULE_ASSIGNED + booking), `batchSchedule` (least-loaded via raw SQL), alternates, bookings list |
| `MaterialManagementService` | reservations list, `issue` (partial → MATERIAL_SHORTAGE, full → MATERIAL_RESERVED), `releaseUnused` (MATERIAL_VARIANCE), issueAll, consumption summary, shortages |
| `InspectionService` | checkpoints per WO, `recordResult` (FAIL → NcrRecord CRITICAL if `is_critical` else MAJOR + INSPECTION_FAILED), summary |
| `NcrService` | NCR create/update/transition (allowed map: OPEN→INVESTIGATION/CLOSED, INVESTIGATION→ACTION/CLOSED, ACTION→VERIFIED/CLOSED, VERIFIED→CLOSED; stamps `closed_at`), NCR_RAISED/NCR_CLOSED |
| `ProductionTrackingService` | dashboard (status counts, quantities, hours), board (grouped by WO status), history (execution timeline from workflow history + operation logs) |

## 6. Outbox events (manufacturing.*)

`WORK_ORDER_RELEASED`, `WORK_ORDER_STARTED`, `WORK_ORDER_COMPLETED`, `WORK_ORDER_CANCELLED`, `WORK_ORDER_SCRAPPED`, `JOB_STARTED`, `JOB_PAUSED`, `JOB_RESUMED`, `JOB_ON_HOLD`, `JOB_REWORK`, `JOB_COMPLETED`, `JOB_CANCELLED`, `JOB_SCRAPPED`, `MATERIAL_RESERVED`, `MATERIAL_ISSUED`, `MATERIAL_SHORTAGE`, `MATERIAL_VARIANCE`, `MACHINE_MAINTENANCE`, `MACHINE_STOPPED`, `INSPECTION_PASSED`, `INSPECTION_FAILED`, `NCR_RAISED`, `NCR_CLOSED`, `SCHEDULE_ASSIGNED`.

All appended via `OutboxService.append(…)` inside the same `dataSource.transaction` as the state change.

## 7. API surface (new)

| Base | Endpoints |
|---|---|
| `manufacturing/work-orders` | CRUD + `POST generate-from-artifacts`, `POST :id/release`, `POST :id/transition`, `GET :id/job-cards`, `GET :id/reservations`, `GET :id/checkpoints` |
| `manufacturing/job-cards` | list/get + `POST :id/start`, `POST :id/production`, `POST :id/transition` |
| `manufacturing/machines` | CRUD + `PATCH :id/maintenance`, `GET/POST :id/calendars`, `GET/POST :id/bookings`, `GET :id/queue`, `GET :id/utilization` |
| `manufacturing/scheduling` | `GET overview`, `POST assign`, `POST batch/:workOrderId`, `GET alternates/:jobId`, `GET bookings` |
| `manufacturing/materials` | `GET reservations`, `POST reservations/:id/issue`, `POST reservations/:id/release-unused`, `POST issue-all/:workOrderId`, `GET consumption/:workOrderId`, `GET shortages` |
| `manufacturing/inspection` | `GET checkpoints/:workOrderId`, `POST checkpoints/:id/result`, `GET summary/:workOrderId` |
| `manufacturing/production` | `GET dashboard`, `GET board`, `GET history/:workOrderId` |
| `quality/ncr` | CRUD + `PATCH :id/transition` |

All guarded by JwtAuthGuard + RolesGuard with the migration-seeded `manufacturing:*` / `quality:ncr:*` permissions.

## 8. Frontend

`mitra-frontend/src/pages/ManufacturingPage.tsx` — MES console with 6 tabs: Dashboard (KPI + machines), Work Orders (list, release, transitions, detail snapshot), Shop Floor (job start/log/transition), Machines (status, maintenance toggle, queue, bookings, utilization), Materials (reservations, issue/release, shortage banner), Inspection & NCR (checkpoint recording, NCR lifecycle). Route `/manufacturing` + sidebar entry exist since 2.3.1.
