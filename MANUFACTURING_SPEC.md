# Manufacturing Module Specification

## Business Objectives
- Digitize manufacturing execution from planning through production and trials.
- Provide real-time visibility into shop floor status.
- Optimize machine utilization and production scheduling.

## Actors
| Actor | Role | Responsibilities |
|-------|------|------------------|
| Production Planner | production_planner | Create production plans, allocate machines, release work orders |
| Operator | operator | Execute work orders, record production runs, report issues |
| Manager | manager | Oversee production performance, resolve bottlenecks |
| Admin | admin | Configure machines and production resources |

## Business Rules
- A production plan is created per project from released process plans and BOM.
- A work order references exactly one BOM item and one machine.
- Work orders cannot be released if the assigned machine is unavailable.
- A production run records actual output against a work order's planned quantity.
- Scrap quantity cannot exceed planned quantity.
- Trials can only be conducted after all work orders for the project are completed.
- Machine status is updated automatically based on work order lifecycle.

## State Machine

### Work Order
```
pending ──► released ──► in_progress ──► completed ──► closed
              │                              │
              └──► cancelled                  └──► on_hold ──► in_progress
```

### Machine
```
available ──► busy ──► maintenance ──► available
```

### Trial
```
scheduled ──► conducted ──► passed ──► manufacturing_complete
                              └──► failed ──► rework
```

## Entities
- **ProductionPlan** — id, project_id, status, scheduled_start, scheduled_end
- **Machine** — id, machine_code, name, type, specifications, status
- **WorkOrder** — id, project_id, production_plan_id, bom_item_id, machine_id, work_order_number, status, quantity_planned
- **ProductionRun** — id, work_order_id, start_time, end_time, quantity_produced, quantity_scrapped
- **Trial** — id, project_id, trial_number, trial_date, parameters, result

## APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/manufacturing/plans | List production plans |
| POST | /api/v1/manufacturing/plans | Create production plan |
| GET | /api/v1/manufacturing/plans/{id} | Get plan with work orders |
| GET | /api/v1/manufacturing/machines | List machines |
| POST | /api/v1/manufacturing/machines | Register machine |
| PUT | /api/v1/manufacturing/machines/{id} | Update machine |
| GET | /api/v1/manufacturing/work-orders | List work orders (filterable) |
| POST | /api/v1/manufacturing/work-orders | Create work order |
| POST | /api/v1/manufacturing/work-orders/{id}/release | Release work order |
| POST | /api/v1/manufacturing/work-orders/{id}/start | Start production |
| POST | /api/v1/manufacturing/work-orders/{id}/complete | Complete work order |
| POST | /api/v1/manufacturing/work-orders/{id}/report-issue | Report production issue |
| GET | /api/v1/manufacturing/work-orders/{id}/runs | List production runs |
| POST | /api/v1/manufacturing/work-orders/{id}/runs | Record production run |
| GET | /api/v1/manufacturing/trials | List trials |
| POST | /api/v1/manufacturing/trials | Schedule trial |
| POST | /api/v1/manufacturing/trials/{id}/record | Record trial results |

## Events
| Event | When | Payload |
|-------|------|---------|
| ProductionPlanCreated | Production plan created | planId, projectId, scheduledStart, scheduledEnd |
| WorkOrderReleased | Work order released to shop floor | workOrderId, projectId, machineId, operatorId |
| ProductionRunStarted | Production run begins | runId, workOrderId, projectId, startedAt |
| ProductionRunCompleted | Production run ends | runId, quantityProduced, quantityScrapped |
| TrialConducted | Trial completed | trialId, projectId, parameters[], result, passed |

## Permissions
See PERMISSION_MODEL.md — Manufacturing domain matrix.

## Reports
- Production Output — quantity produced vs planned per work order and project
- Machine Utilization — runtime vs idle vs maintenance per machine
- Scrap Analysis — scrap quantity and rate by work order, machine, operator
- Trial Results — pass/fail rate, parameter analysis
- OEE (Overall Equipment Effectiveness) — availability × performance × quality

## Dashboards
- **Shop Floor** — real-time work order status, machine status, active runs
- **Machine Dashboard** — per-machine utilization, upcoming maintenance
- **Production Overview** — output trends, scrap trends, on-time delivery

## AI Capabilities
- **Production Schedule Optimization** (future) — Optimize machine allocation and sequencing.
- **Anomaly Detection** (future) — Flag unusual production patterns (downtime, scrap spikes).
- **Maintenance Prediction** (future) — Predict machine maintenance needs from run data.

## Integration Points
- **Engineering** — Consumes ProcessPlanCreated to build production plans.
- **Quality** — ProductionRunCompleted triggers inspection; TrialConducted feeds quality data.
- **Project** — Work order and trial events update project status.
- **Knowledge** — Production data indexed for process improvement.

## Future Enhancements
- Real-time machine connectivity (IoT/OPC-UA integration).
- Barcode/RFID scanning for work order tracking.
- Digital work instructions displayed at machine stations.
- Mobile interface for operator data entry.
