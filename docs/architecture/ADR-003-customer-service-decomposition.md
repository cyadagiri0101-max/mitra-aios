# ADR-003: Customer Service Decomposition (Facade + Leaf Services)

## Status
Accepted

## Context
`customer.service.ts` had grown into a monolithic service mixing contact,
address, note, activity, import, and customer-CRUD logic. This made the class
hard to test in isolation, obscured ownership, and concentrated unrelated
responsibilities in one file.

## Decision
Decompose the customer domain into small leaf services, keeping
`customer.service.ts` as a thin orchestration facade so no controller or
external API contract changes:

- `CustomerContactService` — contact CRUD, primary-contact management,
  `CustomerActivityType.CONTACT_ADDED` / `CONTACT_UPDATED` logging
- `CustomerAddressService` — address CRUD
- `CustomerNoteService` — note CRUD
- `CustomerActivityService` — activity logging/query (`logActivity`,
  `addActivity`, `findActivities`)
- `CustomerImportService` — CSV parse/import/export; CSV tests moved here
- `customer.service.ts` retains backward-compatible facade methods
  (`generateCustomerCode`, `createWithDetails`, `findAllWithFilters`,
  `findAllWithContacts`, `findOneWithDetails`, `findOneWithContacts`,
  `updateCustomer`, deactivate/activate/archive/restore, attachments) and
  delegates the rest.

Behavioral invariants preserved by the facade:
- The M-1 detach fix (`entity.contacts = []` etc. before re-save) remains on
  the `updateCustomer` path.
- Activity logging flows through `CustomerActivityService` with the same event
  types as before.

## Consequences
- Leaf services are unit-testable in isolation; spec providers list exactly the
  services under test.
- Facade APIs unchanged — no frontend or e2e payload changes required.
- `customer-import.service.spec.ts` (4 tests) now owns the CSV behavior; the
  customer spec mocks `activityRepo` for the update path.
