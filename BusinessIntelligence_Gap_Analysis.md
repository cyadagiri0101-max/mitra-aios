# Business Intelligence Gap Analysis

## Scope
Sprint 2.7 extends the existing MITRA platform with a shared Business Intelligence layer that consumes existing domain data instead of duplicating transactional tables or workflows.

## Repository Inspection Outcome
The repository already contains domain-owned analytics surfaces and KPI-like endpoints, including:

- Project dashboard statistics via [mitra-backend/src/modules/project/controllers/project.controller.ts](mitra-backend/src/modules/project/controllers/project.controller.ts)
- Engineering dashboard KPIs via [mitra-backend/src/modules/engineering/controllers/engineering-dashboard.controller.ts](mitra-backend/src/modules/engineering/controllers/engineering-dashboard.controller.ts)
- Manufacturing dashboard aggregation via [mitra-backend/src/modules/manufacturing/controllers/production-tracking.controller.ts](mitra-backend/src/modules/manufacturing/controllers/production-tracking.controller.ts)
- Commercial pipeline summary via [mitra-backend/src/modules/commercial/services/lead.service.ts](mitra-backend/src/modules/commercial/services/lead.service.ts)
- Analytics UI shell via [mitra-frontend/src/pages/AnalyticsPage.tsx](mitra-frontend/src/pages/AnalyticsPage.tsx)

## Observed Gap
The repo had domain dashboard capabilities scattered across modules, but it did not expose a central enterprise BI contract, a reusable KPI engine, or a single reporting/analytics endpoint surface for executive decision support.

## Reuse-First Extension Strategy
The implementation reuses existing services and repositories rather than creating duplicate data stores:

- Commercial: lead pipeline and quotation margin summaries
- Project: project stage and health rollups
- Engineering: engineering dashboard stats
- Manufacturing: production dashboard rollups
- Quality: NCR repository-backed quality health
- Service: service request repository-backed service health
- Platform: transactional outbox read-only snapshot for event health visibility

## Implemented Missing Capabilities
1. Shared analytics module with an executive dashboard API.
2. Central KPI service contract for configurable KPI payload generation.
3. Reporting service contract with saved report metadata and export references.
4. App registration of the analytics module in the main backend bootstrap.
5. BI regression coverage for the executive dashboard contract.

## Architectural Principles Preserved
- No duplicate transactional analytics data stores
- No parallel reporting database or duplicate event stream
- Domain-owned statistics remain the source of truth
- BI reads from existing domain services and repository aggregates
- RBAC and audit alignment are preserved through the existing auth and controller structure

## Verified Status
The new analytics layer compiles and the targeted regression test passes.
