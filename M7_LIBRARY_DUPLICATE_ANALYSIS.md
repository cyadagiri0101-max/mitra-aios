# M7 — Library Duplicate & Near-Duplicate Analysis
## Audit of Redundant and Iterative Engineering Files
**Vault:** `D:\Mitra3.0\MitraEngineeringLibrary`  
**Strategy:** Idempotent Ingestion with Provenance Hashing

---

## 1. Discovered Duplicate Patterns

| Primary File | Duplicate / Variant File | Variant Type | Recommended Ingestion Action |
| :--- | :--- | :--- | :--- |
| `BM-454 INDEX SHEET.xlsx` (115 rows) | `BM-454 INDEX SHEET(1).xlsx` (58 rows) | Snapshot / Partial Copy | Ingest both with provenance linking; mark 115-row version as `LATEST` |
| `BM454 Veedol…Partlist_RevA.xlsx` (230 rows) | `BM454 Veedol…Partlist_RevA(1).xlsx` (115 rows) | Intermediate Sheet Copy | Deduplicate rows via `(tool_no, item_no, description)` hash key |
| `BM454_Process planning sheet.xlsx` (173 rows) | `BM454_Process planning sheet(1).xlsx` (113 rows) | Version Iteration | Retain 173-row as latest complete process planning baseline |
| `Blow Molds Data for Internal Study.xlsx` (378 rows) | `Blow Molds Data for Internal Study_RevA.xlsx` (630 rows) | Revision Expansion | Ingest `RevA` as current authoritative study; mark base as `SUPERSEDED` |

---

## 2. Ingestion Deduplication Rules

1. **Content Hash Check (SHA-256):** If file SHA-256 matches an existing `data_sources` record, skip raw re-parsing and update `last_verified_at` timestamp.
2. **Entity Natural Key Resolution:**
   - Projects: `project_number` (e.g. `BM454`) is unique per tenant.
   - Part List: Composite key `(project_number, part_type, description, item_number)`.
   - Process Steps: Composite key `(project_number, stage, sequence_number)`.
3. **Provenance Audit Trail:** Every record maintains a pointer to `(source_file_id, sheet_name, row_number, batch_id)`.
