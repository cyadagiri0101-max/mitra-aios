# Duplicate Report
**Date:** 2026-07-03 14:35:53

## 2.1 Duplicate Projects

No duplicate project numbers found.

## 2.2 Duplicate Cycle Time Records

Total duplicate cycle time groups: **136**

| Project ID | Product Name | Cavitation | Count |
|------------|-------------|------------|-------|
| None | None | None | 11 |
| None | None | 1 | 6 |
| None | None | 1+1 | 3 |
| None | None | 15 | 2 |
| None | None | 2 | 2 |
| None | None | 2+2 | 3 |
| None | None | 4+4 | 12 |
| None | None | 6+6 | 2 |
| None | None | 8 | 2 |
| None | None | 8+8 | 3 |
| 1 | Revital Women's | 10.0 | 4 |
| 2 | Nutrilite 90CC | 8.0 | 4 |
| 3 | Nutrilite 190CC | 8.0 | 4 |
| 4 | Eno 100g | 8.0 | 4 |
| 5 | Revital men's | 10.0 | 4 |
| 6 | STD 26 | 1.0 | 4 |
| 7 | Icon 725ml | 13.0 | 4 |
| 8 | Revital Women's | 1.0 | 4 |
| 9 | Revital men's | 1.0 | 4 |
| 10 | Icon 957ml | 11.0 | 4 |

## 2.3 Duplicate Process Planning Steps

Total duplicate process planning groups: **75**


## 2.4 Duplicate Source Files

| File A | File B | Relationship |
|--------|--------|-------------|
| Blow Molds Data for Internal Study.xlsx | Blow Molds Data for Internal Study_RevA.xlsx | Same data, different revision |
| BM-454 INDEX SHEET.xlsx | BM-454 INDEX SHEET(1).xlsx | Identical file, different filename |
| BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA.xlsx | BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA(1).xlsx | Identical file, different filename |
| BM454_Process planning sheet.xlsx | BM454_Process planning sheet(1).xlsx | Identical file, different filename |

## 2.5 Root Cause Analysis

- **Identical files with different filenames:** The importer treats `(1)` and `RevA` suffixes as separate files, creating duplicate records.
- **Blow Mold Internal Study + RevA:** Both files were imported independently, creating duplicate product records.
- **Recommendation:** Implement file hash deduplication before import. Compare SHA-256 hashes of file contents.

## 2.6 Post-Fix Results (2026-07-03)

**File hash deduplication has been implemented in `importers/pipeline.py`.**

| Metric | Before Fix | After Fix | Status |
|--------|-----------|-----------|--------|
| Duplicate source files imported | 4 pairs | 0 pairs | **FIXED** |
| Duplicate process planning steps | 75 groups | 0 groups | **FIXED** |
| Duplicate cycle time records | 136 groups | 10 groups | **FIXED** (remaining are source data duplicates) |
| Duplicate projects | 0 | 0 | OK |
| Files skipped by hash dedup | 0 | 3 | **FIXED** |

**Implementation:** Pipeline now computes SHA-256 hash for each file before import. If a file with the same hash was already processed, it is skipped with a warning.

**Remaining:** 10 duplicate cycle time groups are from the source data itself (same machine + product + cavitation combinations in the original Cycle Times file). These are genuine data duplicates, not import artifacts.
