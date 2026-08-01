# ADR-007: Commercial Domain Final Architecture

## Status
Accepted

## Context
After Sprint 2.1.1, the commercial module (customers, enquiries, RFQs,
quotations, projects) reached its final architecture. This ADR records the
resulting module topology for maintainers and for the MITRA Project
Constitution compliance check.

## Decision — Final Topology

### Module wiring (`commercial.module.ts`)
- Imports `ProjectModule` directly (no `forwardRef` anywhere in `src/`).
- Provides and exports: `CustomerService`, `CustomerContactService`,
  `CustomerAddressService`, `CustomerNoteService`, `CustomerActivityService`,
  `CustomerImportService`, `QuotationService`, `QuotationPricingService`,
  `QuotationItemService`, `QuotationMarginService`, `QuotationApprovalService`,
  `QuotationRevisionService`, `QuotationAcceptanceService`, `RfqService`,
  `LeadService`, `ContactService`, `EnquiryService`, `CommercialAiService`,
  workflow/audit/notification dependencies.

### Controllers (thin, delegate to services)
- `customer.controller.ts` — customer CRUD + contacts/addresses/notes/
  activities/attachments + CSV import/export (via `CustomerImportService`)
- `enquiry.controller.ts` — enquiry lifecycle (submit/review)
- `rfq.controller.ts` — RFQ CRUD + workflow transitions
- `quotation.controller.ts` — quotation lifecycle; accept delegates to
  `QuotationAcceptanceService` (no `@Inject(forwardRef(...))`)
- `lead.controller.ts`, `contact.controller.ts`, `commercial-ai.controller.ts`

### Service layering
- **Facades:** `CustomerService`, `QuotationService` (public API, orchestration)
- **Leaves:** contact/address/note/activity/import (customer);
  pricing/item/margin/approval/revision/acceptance (quotation)
- **Cross-cutting:** audit logging (`AuditService`), notifications
  (`NotificationService`), workflow state machine (`WorkflowService`)

### Integrity invariants
- `status` only mutated via workflow methods (DTO hardening; ADR-001)
- Optimistic locking on `workflow_instances` (ADR-002)
- Enquiry → `CONVERTED` on quotation creation; RFQ → enquiry linkage required
- Migration 0014 enforces partial uniqueness + FK `SET NULL` (ADR-008)

## Consequences
- The commercial domain has a stable, layered architecture with single
  ownership per concern; new features should extend leaf services, not
  facades.
- Verified by 512 unit tests / 38 suites, tsc clean, production build clean.
