# Traceability Model — Sprint 2.4 MES

> End-to-end traceability: customer part → engineering artifacts → work order → job cards → material reservations/issues → operation logs → inspection checkpoints → NCR → outbox events. Related: `Manufacturing_Architecture.md`, `MES_Workflow.md`.

## 1. Entity graph

```
engineering_drawings.drawing_id ─────────────┐
engineering_boms.bom_id ────────────────────┤
engineering_bom_items.bom_item_id ──────────┤ (work_orders UUID link columns)
engineering_routings.routing_id ────────────┤
engineering_process_plans.process_plan_id ──┤
                                            ▼
                                     work_orders (wo_number, snapshot jsonb)
                                            │
              ┌─────────────────────────────┼──────────────────────────────┐
              ▼                             ▼                              ▼
        job_cards (job_card_number,   material_reservations        inspection_checkpoints
          op number/code, machine,    (reservation_number,          (checkpoint_number,
          operator, qty/status)        part, planned/reserved/       name, limits, status,
              │                        issued qty, batch, store)     measured value)
              │                             │
              ▼                             ▼
        operation_logs (log_date,     material_issues (issue_number,
          shift, start/end, duration,   material_code, qty, unit,
          qty produced/rejected,        batch, store)
          downtime, rework, scrap)
              │
              ▼
        ncr_records (ncr_number, work_order_id, operation_id,
          inspection_report_id, severity, disposition, status)
```

## 2. Link invariants

| Link | Rules |
|---|---|
| WO → artifacts | `drawing_id`, `bom_id`, `bom_item_id`, `routing_id`, `process_plan_id`; all must reference RELEASED artifacts to allow `release`; frozen in `snapshot` at release |
| WO → job cards | one card per routing/process-plan operation (operation_number/operation_code); created by `generateFromArtifacts` or engine release |
| WO → reservations | one row per BOM item consumed by the WO; `bom_item_id` + `part_number` retained |
| Job card → machine | `machine_id` set by scheduling assign; raw-SQL queue joins job_cards/work_orders |
| Checkpoint → WO/op | `work_order_id` + `operation_id`/`operation_number`; limits copied from `engineering_operations.quality_checkpoints` jsonb |
| NCR → WO/op/report | `work_order_id`, `operation_id`, `inspection_report_id` (nullable) |
| Logs → workflow | every state change appends a workflow history entry; shop-floor production adds `operation_logs` |

## 3. Audit trail

- **Transition audit:** platform `workflow_instances.history` jsonb — actor, from/to state, timestamp, remarks. Engine/shop-floor pass `actorId` from the authenticated user.
- **Operation audit:** `operation_logs` per production entry (operator, machine, shift, timestamps, quantities, downtime reason, remarks).
- **Event audit:** transactional outbox rows `(event_type, aggregate_type, aggregate_id, payload, tenant_id, actor_id)` — emitted in the same transaction as the state change, relayable to EKL/event hubs.
- **Immutable release baseline:** `work_orders.snapshot` (artifact revisions + cost baseline) — never mutated after release; the `version` column provides optimistic locking.

## 4. Read paths

| Query | Source |
|---|---|
| WO dashboard / board / history | `ProductionTrackingService` (raw SQL over work_orders/job_cards + workflow history) |
| Machine queue / utilization | `MachineMasterService` raw SQL across job_cards, work_orders, machine_bookings, machine_calendars |
| Consumption summary / shortages | `MaterialManagementService` (reservations vs issues) |
| Inspection summary | `InspectionService` (checkpoint counts per WO) |

## 5. Traceability questions answered

- Which WO produced part X? → `work_orders` by part + job cards by WO.
- Which machine ran job J, when, how many? → `operation_logs` + job card machine_id.
- Was material issued for this WO? → `material_reservations` → `material_issues` chain.
- Why was a checkpoint failed? → `inspection_checkpoints` FAIL → linked NCR (severity, disposition, closed_at).
- What changed after release? → immutable `snapshot` vs live columns; workflow history.
