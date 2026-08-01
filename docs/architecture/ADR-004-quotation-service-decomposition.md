# ADR-004: Quotation Service Decomposition (Facade + Leaf Services)

## Status
Accepted

## Context
`quotation.service.ts` combined pricing, item management, margin analysis,
approval workflow, revision handling, and quotation CRUD. It also forced a
`forwardRef` dependency cycle at the controller level (quotation controller ↔
project service) for the accept-and-create-project flow.

## Decision
Decompose the quotation domain into leaf services, keeping
`quotation.service.ts` as the public facade (number generation is now private):

- `QuotationPricingService` — discount computation, item pricing, repricing
  (`computeDiscountAmount`, `priceItems`, `reprice`)
- `QuotationItemService` — item replacement/listing (`replaceItems`,
  `findItems`)
- `QuotationMarginService` — margin summary (`getMarginSummary`)
- `QuotationApprovalService` — `approveQuotation` / `acceptQuotation` /
  `rejectQuotation`; `acceptQuotation` returns `{ quotation, projectData }`
- `QuotationRevisionService` — `reviseQuotation` (revision creation with items
  attached to the response)
- `QuotationAcceptanceService` — orchestrates accept → `ProjectService.create`
  → `quotationService.linkProject`, breaking the controller-level
  `forwardRef` cycle
- `quotation.service.ts` remains the facade (`createQuotation` flips the linked
  enquiry to `CONVERTED`, `sendQuotation`, `linkProject`, `getMarginSummary`,
  `findAllFiltered`, `findOneWithItems`)

## Consequences
- `forwardRef` eliminated from the codebase (zero occurrences in `src/`).
- `commercial.module.ts` provides/exports all leaves; `ProjectModule` is
  imported directly.
- Duplicate accept is rejected (400) by the approval state machine.
- All public API shapes preserved.
