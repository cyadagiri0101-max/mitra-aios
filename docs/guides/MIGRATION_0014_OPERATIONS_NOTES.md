# Migration 0014 — Operations Notes

`1700000000014-DataIntegrityRemediation.ts` — data integrity remediation for
the Sprint 2.1.1 audit remediation.

## What it does (up)

| Step | Object | Detail |
|---|---|---|
| Column | `workflow_instances.version` | `ADD COLUMN IF NOT EXISTS`, integer, default 1 — optimistic locking base (ADR-002) |
| Partial unique (replaces full UNIQUE) | `customers (code)` | `uq_customers_code_active` — `WHERE deleted_at IS NULL AND code IS NOT NULL` |
| Partial unique (replaces full UNIQUE) | `leads (lead_number)` | `uq_leads_lead_number_active` |
| Partial unique (replaces full UNIQUE) | `rfqs (rfq_number)` | `uq_rfqs_rfq_number_active` |
| Partial unique (replaces full UNIQUE) | `customer_types (code)` | `uq_customer_types_code_active` |
| Partial unique (replaces full UNIQUE) | `customer_categories (code)` | `uq_customer_categories_code_active` |
| FK SET NULL | `leads.contact_id` | `fk_leads_contact` |
| FK SET NULL | `leads.owner_id` | `fk_leads_owner` |
| FK SET NULL | `leads.converted_customer_id` | `fk_leads_converted_customer` |
| FK SET NULL | `rfqs.enquiry_id` | `fk_rfqs_enquiry` |
| FK SET NULL | `rfqs.contact_id` | `fk_rfqs_contact` |
| Index | `rfqs (enquiry_id)` | `IDX_rfqs_enquiry` |
| Index | `customer_activities (reference_type, reference_id)` | `IDX_customer_activities_reference` |

## Rollback (down)

Drops the two indexes, removes the five FK constraints, drops the five partial
unique indexes (recreating the original full UNIQUE constraints), and removes
the `version` column. Verify with the structural test before/after any run:

```
npx jest src/test/migration-0014.spec.ts
```

## Pre-run checks

1. **Deduplicate master data first.** The partial unique indexes fail on
   existing duplicates of `customers.code`, `leads.lead_number`,
   `rfqs.rfq_number`, `customer_types.code`, `customer_categories.code`.
   Query for duplicates:

   ```sql
   SELECT code FROM customers WHERE deleted_at IS NULL
   GROUP BY code HAVING COUNT(*) > 1;
   ```
   (repeat for the other four tables; leads → `lead_number`, rfqs →
   `rfq_number`)
2. **Orphan check** before applying SET NULL FKs is not required — rows with
   NULL references remain valid; the FKs only affect future deletes.
3. Back up the affected tables (`customers`, `leads`, `rfqs`, `workflow_instances`,
   `customer_types`, `customer_categories`, `customer_activities`).

## Post-run verification

- Confirm the partial unique index blocks a duplicate insert on each table.
- Confirm deleting a contact sets `leads.contact_id` to NULL instead of failing.
- Confirm `workflow_instances.version` exists and increments on update
  (optimistic lock conflicts surface as 409 via the global filter).
