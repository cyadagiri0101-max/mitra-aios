# ADR-008: Migration 0014 — Data Integrity Remediation

## Status
Accepted

## Context
The audit (C-findings) identified schema-level gaps: missing uniqueness on
master data (customer code/name), nullable FK targets on leads and RFQs that
could orphan records, no versioning for optimistic locking, and no index
support for the customer-activities reference lookups.

## Decision
Ship a single data-integrity migration,
`1700000000014-DataIntegrityRemediation.ts` (implemented as
`DataIntegrityRemediation1700000000014`), that applies:

1. `workflow_instances.version` — `ADD COLUMN IF NOT EXISTS` for optimistic
   locking (ADR-002).
2. Full UNIQUE constraints on soft-deleted business keys replaced with
   partial unique indexes (`WHERE deleted_at IS NULL AND <column> IS NOT
   NULL`): `customers(code)`, `leads(lead_number)`, `rfqs(rfq_number)`,
   `customer_types(code)`, `customer_categories(code)` — uniqueness is kept
   for active rows while soft-deleted rows free their key for reuse.
3. Foreign keys with `ON DELETE SET NULL`:
   `leads.contact_id`, `leads.owner_id`, `leads.converted_customer_id`,
   `rfqs.enquiry_id`, `rfqs.contact_id`.
4. Plain indexes: `IDX_rfqs_enquiry`, `IDX_customer_activities_reference`
   (customer-activities lookup support).
5. A `down()` that reverses all of the above (drops indexes, restores
   constraints) for rollback.

## Consequences
- Duplicate active master-data keys (customer code, lead number, RFQ number,
  type/category codes) are rejected at the DB level (defense in depth behind
  service-level checks).
- Deleting a contact/owner/enquiry no longer orphans child rows.
- The migration is fully reversible; structural verification tests
  (`src/test/migration-0014.spec.ts`) assert the exact up/down SQL via a mocked
  `QueryRunner`.
- Operational note: on databases that already contain duplicates, deduplicate
  before applying (see `docs/guides/MIGRATION_0014_OPERATIONS_NOTES.md`).
