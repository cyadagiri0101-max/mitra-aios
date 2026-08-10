# Commercial E2E Fixes — MITRA v3.9.1

## Summary

Commercial E2E suite repaired to **17/17 PASS (100%)** from a prior baseline of
10/17 PASS. Four distinct defects were found and fixed, all downstream of the
verified *decimal suppression* root cause that originally blocked the
quotation serialization contract.

---

## 1. Root Cause (verified)

**Quotation decimal columns were serialized as strings instead of JavaScript
`Number` values.**

PostgreSQL `numeric`/`decimal` columns are returned by the `pg` driver as
strings (`"2183000.00"`). TypeORM only casts them to `Number` when a column
`transformer` is registered and has a `from` matcher that calls `Number(value)`.
Without the transformer, every decimal reachable through the API — quotation
amounts, project `project_value`, etc. — was exposed as a string, breaking
strict `toBe(number)` assertions and any client arithmetic.

Three further defects surfaced while driving the suite to green:

1. `project_folders.folder_type` is `NOT NULL` in the schema but was not mapped
   on the entity and not set during default-folder creation → `23502` insert
   failure on the quotation-accept path (`500`).
2. `@Query() filters: CustomerFilterDto` binds the **entire** query object, so
   `page`/`limit` were rejected by the global `ValidationPipe` with
   `forbidNonWhitelisted: true` → `400` on paginated customer listing.
3. `projects.project_value` carries the same decimal-as-string defect as the
   quotation amounts → `projectValue` returned as `"2183000.00"`.

---

## 2. Root Cause 2 (verified)

| Failing test | Observed | Verified server failure |
|---|---|---|
| 8. Accepts quotation & creates project | `500` | `QueryFailedError: null value in column "folder_type" of relation "project_folders" violates not-null constraint` (code 23502) |
| 11. Quotation project link | `ACCEPTED` not `PROJECT_CREATED` | cascade of test 8 (accept never linked) |
| 12. Project value | `400` then `"2183000.00"` | cascade of test 8; then decimal string (Defect 3) |
| 17. Paginated customer listing | `400` | validation body: `["property page should not exist","property limit should not exist"]` |

---

## 3. Files Modified

| File | Change |
|---|---|
| `src/modules/commercial/entities/quotation.entity.ts` | Added the established TypeORM decimal `transformer` to all 10 decimal columns (`subtotal`, `estimatedCost`, `sellingPrice`, `marginAmount`, `marginPct`, `discountPct`, `discountAmount`, `taxPct`, `taxAmount`, `totalAmount`). |
| `src/modules/project/entities/projectfolder.entity.ts` | Mapped the existing `folder_type` column (entity previously omitted it). |
| `src/modules/project/services/project-factory.service.ts` | `createDefaultFolders` now sets `folderType: 'DEFAULT'` on each generated folder. |
| `src/modules/project/services/project-document.service.ts` | `createFolder` now sets `folderType: 'CUSTOM'` (same latent NOT-NULL defect on the same table). |
| `src/modules/project/entities/project.entity.ts` | Added the same decimal `transformer` to `project_value` (`projects.project_value`). |
| `src/modules/commercial/dto/customer.dto.ts` | `CustomerFilterDto` now also accepts the `PaginationDto` keys (`page`, `limit`, `search`) so `@Query() filters` does not 400 on pagination params under `forbidNonWhitelisted`. |

No unrelated fields, entities, or behaviour were touched. The transformer is the
exact pattern already established in `src/modules/project/entities/projecttask.entity.ts`
(and replicated across the project module) — nothing new was invented.

---

## 4. Why a TypeORM decimal transformer was required

TypeORM delegates `decimal`/`numeric` values to the PostgreSQL driver verbatim.
The driver serializes them as strings to preserve precision; without a column
`transformer` the entity property (and therefore the JSON response) keeps the
string form. The transformer:

```ts
{
  to: (value) => value,                                   // persist as-is
  from: (value) => (value == null ? value : Number(value)), // read → real Number
}
```

- `Numbers` survive save/round-trip unchanged.
- `NULL` is preserved as `NULL` (`== null` guard) so nullable decimals stay null.
- Strings are safely coerced to `Number`, restoring the numeric JSON contract.

This is the project-wide standard used to resolve the same class of defect in
the Project module and is required for any decimal that reaches the API.

---

## 5. Verification Results

### Commercial E2E (only suite run per workflow)

Command: `npx jest --config ./test/jest-e2e.json commercial.e2e-spec.ts --runInBand`

| Run | Passed | Failed | Result |
|---|---|---|---|
| Baseline (recorded) | 10 | 7 | 17 total |
| After decimal transformer (quotation.entity) | 13 | 4 | tests 8/11/12/17 failing |
| After folder_type + CustomerFilterDto fixes | 16 | 1 | test 12 (`projectValue` string) |
| **After `project.project_value` transformer** | **17** | **0** | **100% PASS** |

```
✓ 1. Creates a customer with a primary contact
✓ 2. Creates an enquiry (RFQ request)
✓ 3. Converts the enquiry into an RFQ
✓ 4. Submits the enquiry (DRAFT → SUBMITTED)
✓ 5. Reviews the enquiry (SUBMITTED → UNDER_REVIEW)
✓ 6. Creates a quotation from the RFQ with priced items   (subtotal 1850000, taxAmount 333000, totalAmount 2183000 as Numbers)
✓ 7. Sends the quotation (DRAFT → SENT)
✓ 8. Accepts the quotation and creates a project
✓ 9. Fetches the customer with contacts
✓ 10. Fetches the enquiry (CONVERTED)
✓ 11. Fetches the quotation (PROJECT_CREATED + projectId)
✓ 12. Fetches the project (projectValue 2183000 as Number)
✓ 13. Duplicate customer name allowed
✓ 14. Cannot accept an already-accepted quotation
✓ 15. Direct project creation does not bypass the quotation workflow
✓ 16. Unauthenticated requests rejected (401)
✓ 17. Paginated customer listing (200, data array, numeric total, page=1)
```

### Regression check (files touched outside commercial)

`project-factory.service.spec.ts` and `project-document.service.spec.ts`:
**24/24 PASS**, no regressions.

---

## 6. Remaining Commercial Failures

**None.** Commercial E2E — `test/commercial.e2e-spec.ts` — is green:
`Test Suites: 1 passed, Tests: 17 passed (100%)`.