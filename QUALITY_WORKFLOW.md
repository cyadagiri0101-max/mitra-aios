# Quality Workflow - MITRA v3.6

## Lifecycle

Engineering -> Released Drawing -> Released BOM -> Released Routing -> Manufacturing Execution -> Inspection -> NCR -> CAPA -> Customer Release -> Knowledge Base

## Database Workflow

Sprint 2.5 seeds `quality_qms` workflow states:

- DRAFT
- REVIEW
- RELEASED
- CLOSED

Transitions are permission-backed and use the existing workflow engine tables.

## Events

QMS writes to the existing domain outbox. Event names include:

- `quality.inspection_plan.created`
- `quality.supplier_inspection.created`
- `quality.control_plan.created`
- `quality.fmea.created`
- `quality.ppap_apqp.created`
- `quality.gauge.created`
- `quality.msa_study.created`
- `quality.customer_complaint.opened`
- Existing MES NCR events remain available for production NCR flow.
