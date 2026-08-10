# Quality Architecture - MITRA v3.6

The Enterprise QMS extends the existing NestJS module architecture. Quality stores business records and traceability UUIDs, while Engineering, Manufacturing, Supplier, Customer, and Document modules remain systems of record for their own data.

## Backend

- `QualityModule` registers QMS entities, services, and REST controllers.
- Persistence uses TypeORM repositories and idempotent migrations.
- Audit logging is handled by the global audit interceptor.
- Security uses the existing JWT, role, and permission guards.
- Events are persisted with the existing transactional outbox service.

## QMS Modules

- Inspection Planning
- Incoming Quality Control
- NCR and CAPA
- Control Plans
- FMEA
- PPAP/APQP
- Gauge Management
- MSA
- Customer Complaints

## Integration Rule

QMS records reference released drawings, BOMs, routings, work orders, job cards, machines, operators, material lots, suppliers, and inspection plans by UUID. They do not duplicate source artifact payloads.
