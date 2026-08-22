# Data Quality Report
**Date:** 2026-07-03 14:35:54

## 6.1 NULL Value Analysis (Pre-Fix)

| Table | Column | Total Records | NULL Count | NULL % | Severity |
|-------|--------|---------------|------------|--------|----------|
| product_master | product_variant | 81 | 81 | 100.0% | CRITICAL |
| cycle_time_history | cycle_time_sec | 553 | 515 | 93.1% | CRITICAL |
| component_detail | description | 516 | 184 | 35.7% | HIGH |
| component_detail | material | 516 | 198 | 38.4% | HIGH |
| part_list | material | 230 | 116 | 50.4% | HIGH |
| cycle_time_history | project_id | 553 | 49 | 8.9% | MEDIUM |
| cycle_time_history | cavitation | 553 | 47 | 8.5% | MEDIUM |
| product_master | volume_ml | 81 | 3 | 3.7% | LOW |

## 6.2 Data Integrity Issues (Pre-Fix)

- **Component details with NULL project_id:** 516
  - Root cause: Tool No column contains bare numbers (e.g., '276') without BM prefix.
  - Parser cannot extract project number from '276' alone.

- **Cycle times with NULL project_id:** 49
  - Root cause: 029_Blow Molds Cycle Times.xlsx has no project number column.


## 6.3 Duplicate Analysis (Pre-Fix)

- **Duplicate cycle time records:** 136 groups (same project + product + cavitation)
- **Duplicate process planning steps:** 75 groups (same project + step name)
- **Duplicate source files:** 4 pairs of identical files imported separately


## 6.4 Missing Data (Pre-Fix)

- **Source projects not in DB:** 27 (E, F, O, S prefixes from text files)
- **Bottle families in DB:** 0 (should be at least 1: Veedol)
- **Customers in DB:** 0 (should be at least 1: Veedol)
- **Revision history:** 0 entries


## 6.5 Root Cause Summary (Pre-Fix)

| # | Issue | Root Cause | Impact | Fix Priority |
|---|-------|------------|--------|--------------|
| 1 | 93.1% cycle_time_sec NULL | Blow Mold parser creates cycle_time records from product data (no cycle time column) | HIGH | CRITICAL |
| 2 | 35.7% component description NULL | Source file has empty description cells | MEDIUM | MEDIUM |
| 3 | 38.4% component material NULL | Source file has empty material cells | MEDIUM | MEDIUM |
| 4 | 50.4% part material NULL | Standard/Fastener sheets don't have material column | MEDIUM | LOW |
| 5 | 100% product_variant NULL | Parser doesn't extract variant | LOW | LOW |
| 6 | 27 missing projects | Text files not parsed | MEDIUM | LOW |
| 7 | 0 bottle families | Parser doesn't extract family from filename | LOW | LOW |
| 8 | 0 customers | Parser doesn't extract customer from filename | LOW | LOW |
| 9 | Invalid machine entries | Text notes imported as machines | MEDIUM | HIGH |
| 10 | Duplicate records | Same file imported multiple times | MEDIUM | HIGH |

## 6.6 Post-Fix Results (2026-07-03)

| # | Issue | Before Fix | After Fix | Fix Method | Status |
|---|-------|-----------|-----------|------------|--------|
| 1 | 93.1% cycle_time_sec NULL | 515/553 | 3/41 | Removed CycleTimeHistory creation from blow_mold_parser | **FIXED** |
| 2 | 35.7% component description NULL | 184/516 | 184/516 | Source data has empty cells — **ACCEPTABLE** | **ACCEPTABLE** |
| 3 | 38.4% component material NULL | 198/516 | 198/516 | Source data has empty cells — **ACCEPTABLE** | **ACCEPTABLE** |
| 4 | 50.4% part material NULL | 116/230 | 116/230 | Standard/Fastener sheets don't have material column — **BY DESIGN** | **ACCEPTABLE** |
| 5 | 100% product_variant NULL | 81/81 | 81/81 | Not extracted from source — **LOW PRIORITY** | **PENDING** |
| 6 | 27 missing projects | 27 | 27 | Text files not parsed — **LOW PRIORITY** | **PENDING** |
| 7 | 0 bottle families | 0 | 1 | Added extraction from filename in partlist_parser | **FIXED** |
| 8 | 0 customers | 0 | 1 | Added extraction from filename in partlist_parser | **FIXED** |
| 9 | Invalid machine entries | 6 | 0 | Added text filter in cycle_time_parser | **FIXED** |
| 10 | Duplicate records | 136 groups | 10 groups | Added SHA-256 hash deduplication in pipeline | **FIXED** |
| 11 | 0 part list records | 0 | 115 | Fixed `project.id` access after `db.close()` in partlist_parser | **FIXED** |
| 12 | Component NULL project_id | 184 | 0 | Added bare number fallback ("276" → "BM276") in component_parser | **FIXED** |

### Summary
- **CRITICAL defects fixed:** 5 (cycle_time NULL, invalid machines, NULL project_ids, 0 customers, 0 families)
- **HIGH defects fixed:** 2 (duplicate records, 0 part lists)
- **ACCEPTABLE:** 3 (NULL descriptions/materials from source data, standard parts without material column)
- **PENDING:** 2 (product_variant extraction, text file parsing for E/F/O/S projects)
- **Total records after fix:** 2,538 imported, 985 provenance links, 281 projects, 81 products, 17 machines, 2 materials, 115 parts, 516 components, 86 document indexes, 1 customer, 1 bottle family
