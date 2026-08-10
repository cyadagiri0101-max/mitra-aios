# Release Notes v3.6 - Sprint 2.5 Enterprise QMS

## Added

- Enterprise Quality Management System foundation integrated with Engineering and MES traceability.
- QMS APIs for inspection plans, supplier inspections, NCR, control plans, FMEA, PPAP/APQP, gauges, MSA, and customer complaints.
- Quality-specific outbox event catalog.
- QMS workflow seed for draft, review, release, and close states.
- Quality dashboard/workspace in the frontend.

## Changed

- `QualityModule` now registers all QMS controllers, services, and TypeORM entities.
- QMS services now generate record numbers when clients do not supply one.
- QMS records now expose common genealogy anchors without duplicating source domain data.

## Verification

- `npm run build` passed for backend and frontend.
- Focused QMS service tests passed with `--runInBand`.
