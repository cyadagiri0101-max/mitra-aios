# Engineering Orphan Report

**Date:** 2026-07-03  
**Database:** `D:\MitraEngineeringLibrary\database\mekb.sqlite`  
**Phase:** FINAL — EKL User Acceptance Test

---

## 1. Orphan Definition

A record is considered orphan if it should belong to a project but has no project link, or if its parent relationship is missing.

---

## 2. Orphan Counts

| Entity | Orphan / Unlinked Count |
|--------|-------------------------|
| Documents without Project | 0 |
| Cycle Times without Project | **41** |
| Part Lists without Project | 0 |
| Components without Project | 0 |
| Products without Project | 0 |
| Customers without Projects | 0 |
| Bottle Families without Products | 0 |

**Total Orphan / Unlinked Records:** 41

---

## 3. Verified Defect

**41 cycle-time records have `project_id = NULL`.** These cycle times are linked to machines but cannot be traced back to any project.

---

## 4. Conclusion

Orphan records exist and violate the acceptance criterion "Orphan Records = 0". The defect is isolated to the `cycle_time_history` table.

---

*Report generated automatically during EKL User Acceptance Test.*
