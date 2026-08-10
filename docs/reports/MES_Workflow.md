# MES Workflow — Sprint 2.4

> Work-order and job-card lifecycles are executed by the platform `WorkflowEngineService` against seeded workflow instances (migration 0019). This document describes states, transitions and business rules. Related: `Manufacturing_Architecture.md`, `Traceability_Model.md`.

## 1. Work Order lifecycle (`work_order_lifecycle`)

```
            ┌─────────────┐
            │   DRAFT     │  (created from released artifacts, or manually)
            └─────┬───────┘
                  │ release      ← guarded: artifact links + RELEASED status + snapshot write
            ┌─────▼───────┐
            │  RELEASED   │
            └─────┬───────┘
                  │ start
            ┌─────▼───────┐
            │ IN_PROGRESS │◄──────────────┐
            └──┬───┬───┬──┘               │
      pause /  │   │   \ hold           resume
      ┌────────┘   │    └────────┐
   ┌──▼─────┐   ┌──▼─────┐  ┌────▼────┐
   │ PAUSED │   │ ON_HOLD│  │ REWORK  │
   └────────┘   └────────┘  └─────────┘
      │ complete / cancel / scrap (any non-terminal state)
      ▼
 COMPLETED · CANCELLED · SCRAPPED   (terminal)
```

- **release** — only from DRAFT; requires released drawing/BOM/routing/process-plan; writes the immutable `snapshot` jsonb; emits `WORK_ORDER_RELEASED`.
- **start** — from RELEASED; emits `WORK_ORDER_STARTED`.
- **transition** — `POST /manufacturing/work-orders/:id/transition` with key ∈ {START, PAUSE, RESUME, HOLD, REWORK, COMPLETE, CANCEL, SCRAP}; rejects illegal source states via workflow transition table; records history; emits matching `WORK_ORDER_*` event.
- **completion roll-up** — `ShopFloorService` marks the WO COMPLETED automatically when **all** job cards are terminal and at least one completed; if all terminal job cards are SCRAPPED/CANCELLED the WO is SCRAPPED. On COMPLETED, material reservations are released (status RELEASED).
- **scrap quantities** — `scrap_qty` on the WO is the sum of job-card scrap; consumed by `ProductionTrackingService.dashboard`.

## 2. Job Card lifecycle (`job_card_lifecycle`)

```
    ┌──────┐   start   ┌────────────┐
    │ OPEN ├──────────►│ IN_PROGRESS│◄──────────────┐
    └──────┘           └──┬───┬─────┘               │
                    pause/ │   \ hold            resume
                    ┌──────┘    └────────┐
                 ┌──▼─────┐          ┌────▼────┐
                 │ PAUSED │          │ ON_HOLD │   rework ─► REWORK
                 └────────┘          └─────────┘
                    │ complete / cancel / scrap
                    ▼
         COMPLETED · CANCELLED · SCRAPPED   (terminal)
```

- **start** (`POST /manufacturing/job-cards/:id/start`) — OPEN → IN_PROGRESS; stamps `started_at`; emits `JOB_STARTED`.
- **production log** (`POST /manufacturing/job-cards/:id/production`) — not a state transition: records an `operation_log` row (qty produced/rejected, duration, downtime, setup, shift, remarks), rolls up `produced_qty/rejected_qty/rework_qty/scrap_qty/actual_hours` on the job card; emits `JOB_PRODUCTION`-scoped events per log.
- **transition** — keys ∈ {PAUSE, RESUME, HOLD, REWORK, COMPLETE, CANCEL, SCRAP}; `holdReason` required for HOLD; stamps `completed_at` on COMPLETE.
- **roll-up trigger** — every job-card terminal transition re-evaluates the parent WO (see §1 roll-up).

## 3. Material workflow

```
reservation (engine release) ──► RESERVED ──► issue (partial) ──► RESERVED + MATERIAL_SHORTAGE
                                          └─► issue (full)    ──► ISSUED + MATERIAL_RESERVED
                                          └─► release-unused  ──► RELEASED + MATERIAL_VARIANCE
                          WO COMPLETED     ──► remaining reservations auto-released
```

## 4. Inspection + NCR workflow

```
checkpoint (from process-plan quality_checkpoints) PENDING
        recordResult PASS ──► PASS (+ INSPECTION_PASSED)
        recordResult FAIL ──► FAIL (+ INSPECTION_FAILED) ──► NcrRecord OPEN
        (is_critical → CRITICAL severity, else MAJOR)

NCR lifecycle: OPEN → INVESTIGATION → ACTION → VERIFIED → CLOSED
               (OPEN→CLOSED, INVESTIGATION→CLOSED, ACTION→CLOSED shortcut allowed)
CLOSED stamps ncr_closed_at; emits NCR_CLOSED.
```

## 5. Scheduling flow

1. `GET manufacturing/scheduling/overview` — machines with load + open jobs.
2. `POST manufacturing/scheduling/batch/:workOrderId` — auto-assigns each open job card of the WO to the least-loaded machine (raw SQL across `machine_masters` + `engineering_operations` machine-type match).
3. `POST manufacturing/scheduling/assign` — explicit assignment: sets `job_cards.machine_id`, creates a `machine_bookings` row, emits `SCHEDULE_ASSIGNED`.
4. `GET manufacturing/machines/:id/queue` — queued jobs + bookings; `GET :id/utilization` — booked vs available hours; `GET :id/next-available` — earliest free slot.

## 6. Terminal-state semantics

| State | Meaning |
|---|---|
| COMPLETED | all job cards terminal with at least one COMPLETED; reservations released |
| SCRAPPED | all terminal job cards scrapped/cancelled |
| CANCELLED | cancelled by planner before/without completion |
| CLOSED (NCR) | disposition decided + actions verified; `closed_at` stamped |
