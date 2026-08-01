# Migration 0014 — Upgrade Guide (v3.2.1)

**Migration:** `1700000000014-DataIntegrityRemediation.ts`
**Class:** `DataIntegrityRemediation1700000000014`
**Applies to:** mitra-backend ≥ v3.2.1

## Overview

Migration 0014 hardens the schema for data integrity: unique master data,
safe FK deletion semantics, optimistic-locking support, and query indexes.

## Upgrade Procedure

1. **Back up** the affected tables:

   ```bash
   pg_dump -h <host> -U <user> -d <db> \
     -t customers -t leads -t rfqs -t workflow_instances \
     -t customer_types -t customer_categories -t customer_activities \
     > backup_0014_$(date +%F).sql
   ```

2. **Deduplicate master data** (partial unique indexes reject duplicates).
   Check every unique target:

   ```sql
   SELECT code FROM customers WHERE deleted_at IS NULL
   GROUP BY code HAVING COUNT(*) > 1;
   -- repeat: leads(lead_number), rfqs(rfq_number), customer_types(code), customer_categories(code)
   ```

   Resolve duplicates (merge or mark `deleted_at`) before migrating.

3. **Run the migration:**

   ```bash
   npm run migration:run
   ```

   (or `npm run typeorm migration:run` per deployment configuration).
   Migrations 0011 → 0014 apply in ascending order.

4. **Verify** — see Validation Steps below.

## What Changes

| Object | Change |
|---|---|
| `workflow_instances.version` | new integer column (optimistic locking) |
| `customers(code)` / `leads(lead_number)` / `rfqs(rfq_number)` / `customer_types(code)` / `customer_categories(code)` | full UNIQUE constraints replaced by **partial unique indexes** (`WHERE deleted_at IS NULL AND <column> IS NOT NULL`), names `uq_<table>_<column>_active` |
| `leads.contact_id` / `leads.owner_id` / `leads.converted_customer_id` | FK **`ON DELETE SET NULL`** |
| `rfqs.enquiry_id` / `rfqs.contact_id` | FK **`ON DELETE SET NULL`** |
| `rfqs(enquiry_id)` | index `IDX_rfqs_enquiry` |
| `customer_activities(reference_type, reference_id)` | index `IDX_customer_activities_reference` |

## Rollback Procedure

```bash
npm run typeorm migration:revert
```

`down()` reverses the migration: drops `IDX_customer_activities_reference`
and `IDX_rfqs_enquiry`, removes the five FKs, drops the five partial unique
indexes (recreating the original full UNIQUE constraints), and drops the
`version` column.

**Rollback caveat:** any data written with `version` semantics is unaffected
(the column is removed; the app must not be running an optimistic-lock build
against a rolled-back schema). Roll back the application deployment in lockstep.

## Compatibility

- **Backward compatible at the API level** — no endpoint contract changes.
- Optimistic locking: if the backend is running v3.2.1 without migration 0014,
  `workflow_instances.version` is missing and versioned writes fail — migrate
  before/with the app deployment.
- Old clients writing duplicate master data will now receive DB constraint
  errors (mapped to 409/400 by the API) — expected behavior.
- Soft-deleted rows are exempt from uniqueness (`WHERE deleted_at IS NULL`).

## Downtime Expectations

- **DDL-only migration.** No table rewrites (no `ALTER TYPE`, no CLUSTER).
- Expected downtime: **seconds** on typical databases; scale with table size
  for index builds.
- Sequence: stop writes → run migration → verify → resume. A rolling deploy
  with a brief maintenance window is sufficient.

## Validation Steps

```bash
# Structural verification (mocked QueryRunner; runs anywhere)
npx jest src/test/migration-0014.spec.ts
```

Post-migration SQL checks:

```sql
-- version column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'workflow_instances' AND column_name = 'version';

-- partial unique indexes
SELECT indexname FROM pg_indexes
WHERE indexname IN
 ('uq_customers_code_active','uq_leads_lead_number_active','uq_rfqs_rfq_number_active',
  'uq_customer_types_code_active','uq_customer_categories_code_active');

-- FK actions
SELECT conname, confdeltype FROM pg_constraint
WHERE conname IN ('fk_leads_contact','fk_leads_owner','fk_leads_converted_customer',
                  'fk_rfqs_enquiry','fk_rfqs_contact');

-- behavior: duplicate insert must fail
INSERT INTO customers (name, tenant_id) VALUES ('Duplicate Test', 't');
-- behavior: deleting a contact must NULL leads.contact_id
DELETE FROM contacts WHERE id = <id>;
```

Then run the full backend suite:

```bash
npm test
npm run build
```
