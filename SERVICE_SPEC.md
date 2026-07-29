# Service Module Specification

## Business Objectives
- Support molds throughout their operational lifecycle after delivery.
- Manage dispatch, installation, maintenance, and customer service requests.
- Track warranty terms, spare parts, and service history.

## Actors
| Actor | Role | Responsibilities |
|-------|------|------------------|
| Service Tech | service_tech | Dispatch, install, maintain molds; resolve service requests |
| Service Manager | manager | Oversee service operations, manage warranty claims |
| Admin | admin | Configure service templates and spare parts catalog |

## Business Rules
- Dispatch can only be created after quality sign-off on the project.
- Installation requires a dispatch record to exist.
- A service request can be linked to an existing maintenance log or created standalone.
- Warranty terms are defined per project at dispatch time.
- Warranty claims must be filed within the warranty period.
- Spare parts usage is tracked against the original BOM item reference.
- SLA response time is measured from service request creation to first action.

## State Machine

### Service Request
```
open ──► in_progress ──► resolved ──► closed
  │                         │
  └──► on_hold              └──► reopened
```

### Warranty Claim
```
submitted ──► under_review ──► approved ──► compensated
                    │
                    └──► rejected
```

## Entities
- **DispatchRecord** — id, project_id, dispatch_date, carrier, tracking_number, status
- **Installation** — id, project_id, dispatch_id, installation_date, checklist, customer_acceptance
- **MaintenanceLog** — id, project_id, maintenance_date, type, description, spare_parts_used
- **ServiceRequest** — id, project_id, request_number, issue, priority, status, resolution
- **Warranty** — id, project_id, terms, start_date, end_date
- **WarrantyClaim** — id, warranty_id, project_id, description, status, decision
- **SparePart** — id, bom_item_id, quantity_on_hand, min_stock_level (inventory tracking)

## APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/service/dispatch | List dispatch records |
| POST | /api/v1/service/dispatch | Create dispatch record |
| PUT | /api/v1/service/dispatch/{id} | Update dispatch status |
| GET | /api/v1/service/installations | List installations |
| POST | /api/v1/service/installations | Record installation |
| PUT | /api/v1/service/installations/{id}/accept | Customer acceptance |
| GET | /api/v1/service/maintenance | List maintenance logs |
| POST | /api/v1/service/maintenance | Record maintenance |
| GET | /api/v1/service/service-requests | List service requests |
| POST | /api/v1/service/service-requests | Create service request |
| PUT | /api/v1/service/service-requests/{id} | Update request status |
| POST | /api/v1/service/service-requests/{id}/resolve | Resolve request |
| GET | /api/v1/service/warranties | List warranties |
| POST | /api/v1/service/warranty-claims | Submit warranty claim |
| PUT | /api/v1/service/warranty-claims/{id}/approve | Approve claim |
| PUT | /api/v1/service/warranty-claims/{id}/reject | Reject claim |
| GET | /api/v1/service/spare-parts | List spare parts inventory |
| POST | /api/v1/service/spare-parts/adjust | Adjust stock level |

## Events
| Event | When | Payload |
|-------|------|---------|
| DispatchCreated | Mold shipped | dispatchId, projectId, dispatchDate, carrier |
| InstallationCompleted | Mold installed and accepted | installationId, projectId, customerAcceptance |
| ServiceRequestCreated | Customer issue reported | requestId, projectId, issue, priority |
| ServiceRequestResolved | Issue resolved | requestId, projectId, resolution, resolvedAt |
| MaintenanceLogged | Maintenance performed | logId, projectId, type, sparePartsUsed |

## Permissions
See PERMISSION_MODEL.md — Service domain matrix.

## Reports
- Service History — complete service record per mold/project
- Warranty Status — active warranties, expiring soon, claims filed
- Response Time — average time to first response, time to resolution
- Spare Parts Usage — parts consumed, low stock alerts
- Customer Satisfaction — installation acceptance rate, repeat requests

## Dashboards
- **Service Overview** — open service requests, upcoming maintenance, recent dispatches
- **Service Performance** — response time trends, resolution rate, SLA compliance
- **Warranty Tracker** — claims by status, aging, cost impact

## AI Capabilities
- **Predictive Maintenance** (future) — Predict maintenance needs based on usage patterns and project history.
- **Service Request Triage** (future) — Auto-classify and prioritize incoming service requests.
- **Spare Parts Forecasting** (future) — Predict spare parts demand from maintenance trends.

## Integration Points
- **Project Domain** — ServiceCreated during dispatch; project status updated to service.
- **Engineering** — Consumes BOM for spare parts reference.
- **Quality** — Service issues may trigger quality feedback loop.
- **Knowledge** — Service history indexed for reliability analysis.

## Future Enhancements
- Customer self-service portal for request submission and tracking.
- Mobile app for field service technicians.
- IoT integration for remote mold monitoring.
- Automated SLA breach escalation.
