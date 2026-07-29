# MITRA Sprint 1 Final Audit

## Executive Summary

The reported issue was traced to the validation probe script and not to production application code. The SQL statement in the script referenced a column that is not present in the live projects table schema, while the live business workflow completed successfully.

## Findings

### 1. Issue Classification
- The missing column reference is in the validation tooling script at [scripts/workflow_certification_probe.py](scripts/workflow_certification_probe.py).
- The referenced column is `quotation_id`.
- The target table is `projects`.

### 2. Exact SQL Reference
- File: [scripts/workflow_certification_probe.py](scripts/workflow_certification_probe.py)
- Line: 163
- SQL fragment: `SELECT id, project_number, name, customer_id, quotation_id, stage, health_status, project_value FROM projects WHERE id = '%s'`

### 3. Expected Schema vs Actual Schema
- Expected by the script: column `projects.quotation_id`
- Actual live schema in PostgreSQL: `projects` does not contain `quotation_id`
- Actual live schema columns observed include:
  - `id`
  - `project_number`
  - `name`
  - `customer_id`
  - `customer_name`
  - `product_name`
  - `stage`
  - `health_status`
  - `project_value`

### 4. Production Code Check
- The production entity definition at [mitra-backend/src/modules/project/entities/project.entity.ts](mitra-backend/src/modules/project/entities/project.entity.ts) does not declare a `quotation_id` column for projects.
- The live runtime workflow completed successfully, and the project entity was created and retrieved correctly.

## Answers

1. Is the missing column referenced anywhere in production code?
   - No. The live production entity model does not reference `projects.quotation_id`.

2. Is it referenced only by the validation script?
   - Yes. The issue is isolated to [scripts/workflow_certification_probe.py](scripts/workflow_certification_probe.py).

3. Is the database schema correct?
   - Yes. The observed schema matches the production entity model and the live application behavior.

4. Is the validation script outdated?
   - Yes. The script was querying a column that no longer exists in the current projects schema.

5. Should the script be updated or should the database schema be changed?
   - The script should be updated. The evidence shows the application and live schema are consistent; the tooling query was stale.

## Evidence

- The probe script originally referenced `quotation_id` at line 163.
- The live PostgreSQL schema for `projects` was inspected and did not include `quotation_id`.
- The application entity model at [mitra-backend/src/modules/project/entities/project.entity.ts](mitra-backend/src/modules/project/entities/project.entity.ts) defines `customerId`, `customerName`, `productName`, and related fields, but not `quotationId`.
- The workflow replay completed successfully after the script patch.

## Remaining Defects

- None affecting production application behavior.
- One internal validation-tooling defect remained: the certification probe referenced a stale column name.

## Severity

- Low

## Production Impact

- None. The production application and live workflow completed successfully.

## Recommendation

- Update the validation script to use the current projects schema.
- Keep the workflow certification check in place as an internal validation tool.
- No production schema change is required for this issue.

## Final Release Status

APPROVED WITH CONDITIONS

Conditions:
- The internal validation script has been updated to match the current schema.
- The release may proceed because the observed production workflow behavior is correct.
