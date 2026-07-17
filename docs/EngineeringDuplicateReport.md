# Engineering Duplicate Report

**Date:** 2026-07-03  
**Database:** `D:\MitraEngineeringLibrary\database\mekb.sqlite`  
**Phase:** FINAL — EKL User Acceptance Test

---

## 1. Duplicate Summary

| Entity | Duplicate Groups Found |
|--------|------------------------|
| Project Number | 0 |
| Product (name + variant) | 35 |
| Customer Code | 0 |
| Machine Code | 0 |
| Material Code | 0 |
| Cycle Time | 0 |
| Document Index | 6 |
| Component Detail | 239 |
| Part List | 10 |

**Total Duplicate Groups:** 290

---

## 2. Verified Defects

### 2.1 Duplicate Products

35 product name/variant combinations appear more than once.

### 2.2 Duplicate Document Index Entries

Duplicate document serial numbers within project BM454:

| Project | Serial No | Occurrences |
|---------|-----------|-------------|
| BM454 | 8 | 2 |
| BM454 | 9 | 2 |
| BM454 | 15 | 2 |
| BM454 | 32 | 2 |
| BM454 | 33 | 2 |
| BM454 | 34 | 2 |

### 2.3 Duplicate Component Details

239 groups of component details are duplicated by project, tool number, description, and material.

### 2.4 Duplicate Part Lists

10 groups of part list items are duplicated by project, description, and material.

---

## 3. Conclusion

Duplicate errors exist and violate the acceptance criterion "Duplicate Errors = 0". Master data (projects, customers, machines, materials) is clean, but engineering detail tables contain duplicates.

---

*Report generated automatically during EKL User Acceptance Test.*
