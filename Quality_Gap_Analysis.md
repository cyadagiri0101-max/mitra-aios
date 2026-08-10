# Quality Gap Analysis - Sprint 2.5 QMS

## Repository Inspection

Existing capabilities reused:
- Quality: trials, inspection reports, CAPA verification, NCR records.
- Engineering: released drawing/BOM/routing/process plan artifact ownership and event definitions.
- Manufacturing: work orders, job cards, operation logs, inspection checkpoints, NCR creation from failed checkpoints.
- Platform: RBAC guards, audit interceptor, tenant-aware base patterns, transactional domain outbox.
- Workflow: database-backed workflow states/transitions.
- Documents: document version/download entities remain the source for generated certificates and PPAP files.

## Gaps Closed

- Added QMS tables for inspection plans, IQC supplier inspections, control plans, FMEA, PPAP/APQP, gauges, MSA studies, and customer complaints.
- Registered all QMS controllers/services/entities in `QualityModule`.
- Replaced placeholder manufacturing inspection-failed events with quality-specific outbox event names.
- Added nullable UUID genealogy anchors across QMS entities without copying Engineering or MES data.
- Expanded the frontend Quality workspace from a single list into a multi-module QMS cockpit.

## Remaining Implementation Notes

- Deep artifact-derived inspection-plan generation should call Engineering release services once final released-artifact APIs stabilize.
- Certificate rendering can reuse the document module and should be implemented as a separate document template flow.
- Full E2E coverage and migration execution against a live database are recommended before production promotion.
