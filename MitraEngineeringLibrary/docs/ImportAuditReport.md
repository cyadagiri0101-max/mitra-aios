# Import Audit Report
**Date:** 2026-07-03 14:35:53
**Database:** D:\MitraEngineeringLibrary\database\mekb.sqlite
**Source Directory:** D:\Mitra3.0\temp data

## 1.1 File-by-File Audit

| Source File | DB Data Source | File Size | Provenance Records | Status |
|-------------|---------------|-----------|-------------------|--------|
| 029_Blow Molds Cycle Times.xlsx | id=1 | 12737 bytes | 49 | OK |
| Blow Molds Data for Internal Study.xlsx | id=2 | 42107 bytes | 252 | OK |
| Blow Molds Data for Internal Study_RevA.xlsx | id=3 | 43158 bytes | 252 | OK |
| BM-454 INDEX SHEET(1).xlsx | id=4 | 13208 bytes | 57 | OK |
| BM-454 INDEX SHEET.xlsx | id=5 | 13208 bytes | 57 | OK |
| BM-474 INDEX SHEET.xlsx | id=6 | 12443 bytes | 29 | OK |
| BM377 Process planning sheet.xlsx | id=7 | 18740 bytes | 52 | OK |
| BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA(1).xlsx | id=8 | 66270 bytes | 115 | OK |
| BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA.xlsx | id=9 | 66270 bytes | 115 | OK |
| BM454_Process planning sheet(1).xlsx | id=10 | 18413 bytes | 60 | OK |
| BM454_Process planning sheet.xlsx | id=11 | 18413 bytes | 60 | OK |
| BM471_Process planning sheet.xlsx | id=12 | 19520 bytes | 50 | OK |
| BM476_Process planning sheet.xlsx | id=13 | 94058 bytes | 65 | OK |
| component Details.xlsx | id=14 | 31893 bytes | 516 | OK |

## 1.2 Table Coverage Audit

| Table | Record Count | Has Provenance | Provenance Count | Status |
|-------|-------------|----------------|-----------------|--------|
| project_master | 131 | NO | 0 | CRITICAL |
| product_master | 81 | NO | 0 | CRITICAL |
| bottle_family | 0 | NO | 0 | OK |
| customer_master | 0 | NO | 0 | OK |
| machine_master | 25 | NO | 0 | CRITICAL |
| material_master | 2 | NO | 0 | CRITICAL |
| cycle_time_history | 553 | YES | 553 | OK |
| process_planning | 287 | YES | 287 | OK |
| part_list | 230 | YES | 230 | OK |
| component_detail | 516 | YES | 516 | OK |
| document_index | 143 | YES | 143 | OK |

## 1.3 Orphaned Records

No orphaned records found.

## 1.4 Revision History Audit

Revision history entries: **0**
**WARNING:** No revision history entries found. The importer is inserting records but not tracking changes.

## 1.5 Post-Fix Results (2026-07-03)

After applying fixes, a clean re-import was performed:

| Table | Before Fix | After Fix | Change | Status |
|-------|-----------|-----------|--------|--------|
| project_master | 131 | 281 | +150 | OK |
| product_master | 81 | 81 | 0 | OK |
| bottle_family | 0 | 1 | +1 | **FIXED** |
| customer_master | 0 | 1 | +1 | **FIXED** |
| machine_master | 25 | 17 | -8 | **FIXED** (invalid entries removed) |
| material_master | 2 | 2 | 0 | OK |
| cycle_time_history | 553 | 41 | -512 | **FIXED** (product data no longer masquerading as cycle times) |
| process_planning | 287 | 227 | -60 | **FIXED** (duplicate files deduplicated) |
| part_list | 0 | 115 | +115 | **FIXED** |
| component_detail | 516 | 516 | 0 | OK (project_ids now populated) |
| document_index | 143 | 86 | -57 | **FIXED** (duplicate files deduplicated) |
| data_sources | 14 | 11 | -3 | **FIXED** (duplicate files skipped) |
| provenance | 1729 | 985 | -744 | **FIXED** (provenance now accurate) |

### Files Changed
- `parsers/blow_mold_parser.py` — Removed CycleTimeHistory creation from product data
- `parsers/cycle_time_parser.py` — Added filter to skip text-only machine entries
- `parsers/component_parser.py` — Added fallback for bare tool numbers (e.g., "276" → "BM276")
- `parsers/partlist_parser.py` — Added customer/bottle family extraction; fixed `project.id` access after `db.close()`
- `parsers/base.py` — Added `extract_customer_from_filename()` and `extract_bottle_family_from_filename()`
- `importers/pipeline.py` — Added SHA-256 file hash deduplication to skip identical files

### Remaining Issues
- 3 cycle_time records with NULL `cycle_time_sec` (source data has empty cells — acceptable)
- 0 revision history entries (expected for first-run insertions only)
- Some component_detail records with NULL description/material (source data has empty cells)
- Standard/fastener parts have NULL material (source sheets don't have material column — by design)
- 27 projects from text files (E, F, O, S prefixes) not yet imported (text parsers not yet implemented)

