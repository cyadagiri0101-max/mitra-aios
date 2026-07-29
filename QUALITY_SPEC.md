# Quality Module Specification

## Business Objectives
- Ensure quality throughout the mold manufacturing lifecycle.
- Implement closed-loop quality management from inspection through CAPA closure.
- Provide traceability from every defect back to root cause and corrective action.

## Actors
| Actor | Role | Responsibilities |
|-------|------|------------------|
| QA Inspector | qa_inspector | Conduct inspections, create NCRs, verify fixes |
| QA Engineer | qa_engineer | Investigate NCRs, initiate CAPAs, verify effectiveness |
| Manager | manager | Review escalated issues, approve CAPA closure |
| Admin | admin | Configure inspection criteria and quality thresholds |

## Business Rules
- An inspection plan must be created for every project before production begins.
- Inspection results must cover all checkpoints defined in the plan.
- An NCR is automatically created when an inspection result fails.
- NCR severity is classified as `minor`, `major`, or `critical` based on deviation thresholds.
- CAPA is mandatory for all `critical` and `major` NCRs.
- CAPA effectiveness must be verified before closure — cannot be verified by the same person who implemented it.
- An NCR cannot be closed until its linked CAPA (if any) is verified.
- Recurring NCRs of the same type on the same project trigger escalation.

## State Machine

### NCR
```
open ──► under_investigation ──► actioned ──► closed
  │                                │
  └──► rejected                    └──► escalated
```

### CAPA
```
initiated ──► in_progress ──► verification ──► closed
                    │
                    └──► on_hold
```

## Entities
- **InspectionPlan** — id, project_id, name, checkpoints[], status
- **InspectionResult** — id, inspection_plan_id, work_order_id, measurements[], overall_result, inspector_id
- **NCR** — id, project_id, ncr_number, inspection_result_id, defect_type, severity, description, disposition, status
- **CAPA** — id, project_id, capa_number, ncr_id, root_cause, status, effectiveness_verified
- **CAPAAction** — id, capa_id, description, assigned_to, due_date, status

## APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/quality/inspection-plans | List inspection plans |
| POST | /api/v1/quality/inspection-plans | Create inspection plan |
| GET | /api/v1/quality/inspection-plans/{id} | Get plan with checkpoints |
| POST | /api/v1/quality/inspection-results | Record inspection result |
| GET | /api/v1/quality/inspection-results/{id} | Get inspection result |
| GET | /api/v1/quality/ncrs | List NCRs (filterable by severity, status, project) |
| POST | /api/v1/quality/ncrs | Create NCR |
| GET | /api/v1/quality/ncrs/{id} | Get NCR with linked CAPA |
| POST | /api/v1/quality/ncrs/{id}/investigate | Start investigation |
| POST | /api/v1/quality/ncrs/{id}/action | Record action taken |
| POST | /api/v1/quality/ncrs/{id}/close | Close NCR |
| POST | /api/v1/quality/ncrs/{id}/escalate | Escalate NCR |
| GET | /api/v1/quality/capas | List CAPAs |
| POST | /api/v1/quality/capas | Initiate CAPA |
| POST | /api/v1/quality/capas/{id}/start | Start CAPA execution |
| POST | /api/v1/quality/capas/{id}/actions | Add CAPA action |
| PUT | /api/v1/quality/capa-actions/{id} | Update action status |
| POST | /api/v1/quality/capas/{id}/verify | Verify effectiveness |
| POST | /api/v1/quality/capas/{id}/close | Close CAPA |

## Events
| Event | When | Payload |
|-------|------|---------|
| InspectionCompleted | Inspection recorded | inspectionId, projectId, workOrderId, passed |
| NCRCreated | Non-conformance detected | ncrId, projectId, defectType, severity |
| NCRActioned | NCR disposition applied | ncrId, projectId, disposition, actionTaken |
| NCRClosed | NCR verified and closed | ncrId, projectId, closedBy |
| CAPAInitiated | CAPA started from NCR | capaId, projectId, ncrId, rootCause |
| CAPAActionCompleted | Individual action done | actionId, capaId, completedAt |
| CAPAClosed | CAPA verified effective | capaId, projectId, closedBy |

## Permissions
See PERMISSION_MODEL.md — Quality domain matrix.

## Reports
- NCR Summary — NCRs by severity, status, defect type, project
- NCR Aging — open NCRs with days since creation
- CAPA Effectiveness — % of CAPAs verified effective on first attempt
- Defect Trend — defect types over time, by machine, by operator
- Supplier Quality — NCRs attributed to supplied materials/parts

## Dashboards
- **Quality Overview** — NCR count by severity, CAPA status, recent inspections
- **Defect Analysis** — Pareto chart of defect types, trend lines
- **CAPA Tracker** — open CAPAs with aging, overdue actions

## AI Capabilities
- **Defect Pattern Recognition** — Identify recurring defect patterns across projects.
- **NCR Auto-Classification** — Suggest severity and defect type from description.
- **Root Cause Prediction** (future) — Analyze NCR data to suggest probable root causes.
- **CAPA Recommendation** (future) — Recommend corrective actions based on similar past issues.

## Integration Points
- **Manufacturing** — Consumes ProductionRunCompleted to trigger inspection.
- **Engineering** — Consumes DesignApproved to create inspection plans.
- **Project** — Quality events update project quality metrics.
- **Knowledge** — NCR/CAPA data stored as lessons learned.

## Future Enhancements
- CMM (Coordinate Measuring Machine) data import.
- Statistical Process Control (SPC) charting.
- Supplier quality scorecard automation.
- Quality alert thresholds and automated notifications.
