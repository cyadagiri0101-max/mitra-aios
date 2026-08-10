# MITRA v3.7 Sprint 2.6 — Service_Gap_Analysis

## Scope
This gap analysis reviews the existing MITRA repository for reuse and identifies what is already implemented versus what remains missing for the Enterprise Service Management after-sales lifecycle.

## Existing Reuse Candidates

### Reusable modules already present
- Platform Foundation and RBAC: already production-ready and reused across all domains.
- Workflow Engine: can be used for dispatch, installation approval, commissioning signoff, and warranty claim approval.
- Event Bus / Transactional Outbox: already implemented via the platform outbox and relay patterns.
- Dispatch: existing `dispatch_plans` entity, DTO, controller, and service are present and should be treated as the logistics dispatch capability.
- Service domain skeletal entities: `service_requests`, `service_schedules`, `service_reports`, and `spare_parts` already exist in the DB schema and entity layer.
- Manufacturing and Quality: work orders, trial results, inspection reports, and quality outcomes are the authoritative upstream sources for service traceability.
- Project and Commercial domains: customer and project references already exist and should be reused rather than duplicated.
- Document and knowledge modules: support future knowledge indexing and service history capture.

## Verified Gap Summary

### Phase 1: Repository inspection result
The repository already contains:
- A thin Service module with service requests, schedules, reports, and spare parts.
- A Dispatch module for customer-facing logistics planning.
- Strong Manufacturing and Quality traceability structures.
- An existing Platform Outbox service for domain event publication.

The following lifecycle elements are still missing from the backend implementation:
- Service installation lifecycle with scheduling, site readiness, inspection checklist, installation report, site photos, and customer signoff.
- Warranty registration and claim models.
- AMC contracts and scheduled visits.
- Service-side traceability extensions linking customer, project, delivered product, manufacturing work order, inspection report, and warranty data.
- Full lifecycle event publication through the existing outbox rather than a parallel event system.
- End-to-end API surface for the missing service lifecycle records.

## Reuse Strategy

### Do not duplicate
- Customer master data: reuse commercial/customer domains.
- Project data: reuse project domain IDs and references.
- Engineering revisions / BOM: reuse engineering and design artifacts.
- Manufacturing work orders and inspection data: reuse manufacturing and quality domains.
- Workflow engine: reuse database-driven workflow transitions; do not build a second workflow system.
- Event bus / outbox: reuse `OutboxService` for all new service events.

### Implement only missing lifecycle capability
The Sprint 2.6 objective is not a greenfield service platform. It is a lifecycle extension that consumes existing project, manufacturing, and quality records.

## Current Implementation Status by Phase

### Phase 2 — Dispatch
Status: partially present.
- Existing dispatch logistics records are available through `dispatch_plans`.
- Missing: stronger linkage to completed manufacturing work orders and service dispatch documents.

### Phase 3 — Installation
Status: missing backend lifecycle tables and endpoints.
- Need installation requests, scheduling, site readiness, checklist, report, photos, and signoff.

### Phase 4 — Commissioning
Status: partially implied by quality/trials, but not modeled as a dedicated service lifecycle record.
- Should reuse existing trial/inspection results and quality signoff records.

### Phase 5 — Warranty
Status: missing service warranty lifecycle.
- Need warranty registration, eligibility validation, claim records, approval flow, history, and extensions.

### Phase 6 — Preventive Maintenance
Status: partially supported by service schedules, but not modeled as a full recurring maintenance and calendar capability.

### Phase 7 — Breakdown Service
Status: partially supported by `service_requests` and `service_reports`.
- Needs extension for ticket management, SLA tracking, root cause, and feedback.

### Phase 8 — Spare Parts
Status: present as catalog entity.
- Missing integration with service consumption and recommended spares history.

### Phase 9 — AMC
Status: missing contract and visit lifecycle.

### Phase 10 — Retrofit / Upgrade
Status: not yet modeled in the service module.

### Phase 11 — Service Knowledge Base
Status: partial via knowledge module, but not yet systematically captured from service records.

### Phase 12 — Traceability
Status: incomplete at service entity level.
- Service records need explicit references to customer, project, delivered product, drawing revision, BOM revision, work order, inspection report, trial report, warranty, and service engineer.

### Phase 13 — Event Bus Integration
Status: partial.
- The platform outbox exists.
- Service events need to be published through that mechanism.

### Phase 14–17: Frontend, APIs, testing, documentation
Status: partially present in the UI and service skeleton, but needs completion to match full lifecycle coverage.

## Recommended Implementation Path
1. Reuse current `dispatch_plans` as dispatch logistics anchor.
2. Extend the existing `service` module with lifecycle entities for installation, warranty, AMC, and visits.
3. Add API endpoints in the same controller style used across MITRA modules.
4. Publish service events through the existing outbox service.
5. Keep all service records UUID-linked to existing project and manufacturing tables.
6. Update frontend views to consume those lifecycle endpoints without introducing duplicate pages.

## Conclusion
The repository already contains the foundational platform and adjacent domain capability required for Sprint 2.6. The gap is not a missing platform, but a missing service lifecycle extension that must be layered onto the existing enterprise model with strict reuse and traceability.
