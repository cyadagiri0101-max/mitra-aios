# Manufacturing Gap Analysis — Sprint 2.4 (MES)

> **Date:** 2026-08-03
> **Scope:** Manufacturing Execution System over the existing Engineering domain (Sprint 2.3.x).
> **Principle:** Manufacturing consumes released Engineering artifacts only. No duplicate engineering data, no parallel infrastructure.

---

## 1. Verified Repository State (Phase 1)

| Capability | Today | Where |
|---|---|---|
| Work orders (CRUD + RELEASED-artifact validation) | ✅ Live | `manufacturing` module (`/manufacturing/work-orders`) |
| Process plans (CRUD) | ✅ Live | `planning` module (`/planning/process-plans`) |
| Work centers + routings + operations + revisions | ✅ Live | `engineering` module (`/engineering/work-centers`, `/engineering/routings`) |
| Machine types (CRUD) | ✅ Live | `machine` module (`/machine/types`) |
| Real-time machine telemetry + dashboard | ✅ Live | `machine-status` module |
| Job cards, operation logs, production batches, material issues | ⚠️ Schema-only (tables exist, **no API/service**) | `manufacturing` entities |
| Machine master, calendars, bookings | ⚠️ Schema-only (tables exist, **no API/service**) | `machine` entities |
| Process routings/steps, resource allocations | ⚠️ Schema-only (legacy, inert) | `planning` entities |
| Inventory | ❌ Does not exist | — |
| NCR | ❌ No entity (permissions `quality:ncr:*` already seeded) | — |
| Scheduling engine / queue | ❌ None | — |
| Shop-floor job dispatch | ❌ None (`dispatch` module = customer shipment logistics) | — |
| Outbox / event bus | ✅ Live (routing-version uses durable outbox; others in-process) | `platform` + `engineering` |

**Backend baseline:** `tsc --noEmit` clean; 51 suites / 657 tests passing.

---

## 2. Gap Assessment per Sprint Requirement

### Phase 2 — Work Order Engine
- **Gap:** No generation from released artifacts; no revision snapshots on the WO (drawing revision, BOM revision, routing revision, process plan); no material reservation; no cost baseline; WOs are mutable after release (plain CRUD `PATCH`).
- **Extend:** Work order `snapshot` (jsonb) + `cost_baseline`; `release()` transition that snapshots the four artifacts and freezes the WO.

### Phase 3 — Shop Floor Execution
- **Gap:** `work_orders` status enum supports DRAFT/RELEASED/IN_PROGRESS/ON_HOLD/COMPLETED/CANCELLED only — no PAUSED/REWORK/SCRAPPED. `job_cards` and `operation_logs` exist but have no service. No DB-driven transition engine for manufacturing.
- **Extend:** Seed `manufacturing_work_order` and `manufacturing_job` workflows in the **existing** `workflow_states`/`workflow_transitions` engine; transitions execute via the existing `WorkflowService.executeTransition` (role/permission/approval guarded, history recorded).

### Phase 4 — Machine & Work Center Management
- **Gap:** `machine_masters`/`machine_calendars`/`machine_bookings` schema-only. No availability, maintenance state, queue, or alternate-machine selection.
- **Extend:** Reuse `engineering_work_centers` (do not duplicate) — machines reference work centers via their `machineIds` jsonb + `machine_masters.machine_type_id`.

### Phase 5 — Production Tracking
- **Gap:** No roll-up of produced/accepted/rejected/scrap/rework/remaining quantities; no production history endpoint.
- **Extend:** Compute from `operation_logs` + `job_cards` (extend both with qty/downtime/setup fields); dedicated history/timeline endpoints. No new tracking table — derive from the existing capture tables.

### Phase 6 — Material Consumption
- **Gap:** `material_issues` + `production_batches` schema-only; no reservation concept; no shortage/variance logic.
- **Extend:** New `material_reservations` table linked to released BOM items; consumption via `material_issues`; variance = issued vs reserved vs planned; substitutions sourced from `engineering_bom_substitutions` (no duplicate data).

### Phase 7 — Scheduling
- **Gap:** No scheduling engine.
- **Extend:** Finite scheduling on top of `machine_bookings` + `machine_calendars`; priority rules (URGENT→LOW, due-date tie-break); capacity from work-center `capacity_hours_per_day`; alternate machine = same work center / same machine type.

### Phase 8 — Traceability
- **Gap:** `engineering_trace_edges` table has **no writer**; `byProject`/`byEntity` don't cover job cards, reservations, checkpoints, NCRs.
- **Extend:** Write trace edges on WO release (WORK_ORDER → MANUFACTURES → BOM/DRAWING/ROUTING); extend the traceability service reads.

### Phase 9 — Quality Integration
- **Gap:** `inspection_reports` entity-only; no auto checkpoint generation from routing `quality_checkpoints`; **no NCR** despite seeded permissions.
- **Extend:** New `inspection_checkpoints` table auto-generated at WO release from routing operations; new `ncr_records` table + service (permissions already seeded); link everything to WO/operation/drawing/BOM item/machine/operator.

### Phase 10 — Events
- **Gap:** Only `engineering.*` event types exist; manufacturing has no events; outbox relay dispatches engineering events only.
- **Extend:** New `manufacturing.*` event types + a manufacturing outbox relay reusing `OutboxService` + `EngineeringEventBus` (single event mechanism — no second bus).

### Phase 11–14 — Frontend / APIs / Tests / Docs
- Frontend has a placeholder `ManufacturingPage`; no MES views.
- APIs: extend the manufacturing controllers (reuse `@Roles`+`@Permissions`, pagination DTOs, Swagger).
- Tests: zero specs in manufacturing/planning/machine today.
- Docs: no `MANUFACTURING_ARCHITECTURE.md` / `MES_WORKFLOW.md`.

---

## 3. Non-Gaps (do NOT rebuild)

| Item | Why it exists | Action |
|---|---|---|
| `engineering_work_centers` | Work center master with capacity + machine ids | Reference; add management surface in manufacturing if needed |
| `engineering_routings`/`operations`/`routing_revisions` | Released routing + immutable snapshots | Consume; WO snapshots reference these |
| `engineering_bom_revisions` | jsonb BOM snapshots | Consume at WO release |
| `engineering_drawing_revisions` | Columnar drawing revisions | Consume at WO release |
| `engineering_bom_substitutions` | Approved alternates | Consume for material substitution |
| `domain_outbox` + `OutboxService` | Transactional outbox | Reuse for all manufacturing events |
| `machine_telemetry`/`machine_status` | Real-time monitoring | Consume in machine monitor views |
| `workflow_instances`/`workflow_transitions` | DB-driven state machine | Seed `manufacturing_work_order` + `manufacturing_job` workflows |
| `dispatch_plans` | Customer shipment logistics | Untouched (not shop-floor dispatch) |

---

## 4. New Database Objects (Migration 0019)

- **ALTER** `work_orders`: status CHECK extended (`PAUSED`,`REWORK`,`SCRAPPED`); add `snapshot jsonb`, `cost_baseline numeric(18,2)`, `rework_qty`, `scrap_qty`, `released_by`, `released_at`.
- **ALTER** `job_cards`: status CHECK extended (`PAUSED`,`ON_HOLD`,`REWORK`,`SCRAPPED`); add `produced_qty`, `rejected_qty`, `rework_qty`, `scrap_qty`, `setup_time_minutes`, `downtime_minutes`, `started_at`, `completed_at`, `hold_reason`.
- **ALTER** `operation_logs`: add `job_card_id`, `operation_id`, `rework_qty`, `scrap_qty`, `setup_time_minutes`.
- **NEW** `inspection_checkpoints` — auto-generated per WO operation from routing `quality_checkpoints`.
- **NEW** `material_reservations` — planned/reserved/issued quantities per released BOM item.
- **NEW** `ncr_records` — non-conformance from production (permissions already seeded as `quality:ncr:*`).
- **SEED** workflow types `manufacturing_work_order` (9 states / 13 transitions) and `manufacturing_job` (8 states / 11 transitions).
- **SEED** ~30 permissions `manufacturing:*` + role grants (upper/lower matrix).

## 5. New Services / Controllers

| Service | Responsibility |
|---|---|
| `WorkOrderEngineService` | Generate from released artifacts; release (snapshots + job cards + reservations + checkpoints + trace edges + outbox); workflow transitions |
| `ShopFloorService` | Job card lifecycle + operation log capture + WO status rollup + outbox |
| `MachineManagementService` | Machine master CRUD, calendars, maintenance, queue, alternate selection |
| `SchedulingService` | Finite scheduling, machine bookings, priority rules, capacity/utilization |
| `MaterialManagementService` | Reservations, issues/consumption, shortage, variance, substitutions |
| `InspectionService` | Checkpoint results, NCR lifecycle, link to inspection reports |
| `ProductionTrackingService` | History/timeline, quantity/cost rollups |
| `ManufacturingEventRelayService` | Outbox → event bus + AI hooks (single mechanism) |

Controllers: `work-orders` (extended), `job-cards`, `machines`, `scheduling`, `materials`, `inspection` (+`ncr`), `production`, `manufacturing-outbox`.
