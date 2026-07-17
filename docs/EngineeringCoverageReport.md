# Engineering Coverage Report

**Date:** 2026-07-03  
**Database:** `D:\MitraEngineeringLibrary\database\mekb.sqlite`  
**Phase:** FINAL — EKL User Acceptance Test

---

## 1. Coverage Summary

| Required Data | Projects Covered | Total Projects | Coverage % |
|---------------|------------------|----------------|------------|
| Product | 127 | 281 | 45.2% |
| Bottle Family | 1 | 281 | 0.4% |
| Customer | 1 | 281 | 0.4% |
| Machine | 0 | 281 | 0.0% |
| Material | 117 | 281 | 41.6% |
| Capacity | 117 | 281 | 41.6% |
| Neck Type | 0 | 281 | 0.0% |
| Cavitation | 0 | 281 | 0.0% |
| Cycle Time | 0 | 281 | 0.0% |
| Process Planning | 4 | 281 | 1.4% |
| Part List | 1 | 281 | 0.4% |
| Component Details | 276 | 281 | 98.2% |
| Engineering Documents | 2 | 281 | 0.7% |

**Overall Engineering Coverage:** Far below the required 99%.

---

## 2. Entity Counts

| Entity | Count |
|--------|-------|
| Projects | 281 |
| Products | 127 |
| Bottle Families | 1 |
| Customers | 1 |
| Machines | 17 |
| Materials | 2 |
| Neck Types | 0 |
| Technical Specifications | 0 |
| Cycle Time Records | 41 |
| Process Planning Steps | 227 |
| Part List Items | 115 |
| Component Details | 516 |
| Engineering Documents | 86 |

---

## 3. Coverage by Project Sample

### Projects with Process Planning

| Project | Steps |
|---------|-------|
| BM454 | 60 |
| BM377 | 52 |
| BM471 | 50 |
| BM476 | 65 |

### Projects with Part List

| Project | Items |
|---------|-------|
| BM454 | 115 |

### Projects with Documents

| Project | Documents |
|---------|-----------|
| BM454 | 57 |
| BM474 | 29 |

### Projects Missing Component Details

| Project |
|---------|
| BM377 |
| BM454 |
| BM471 |
| BM474 |
| BM476 |

---

## 4. Record Ownership

| Entity | With Project ID | Without Project ID |
|--------|-----------------|--------------------|
| Documents | 86 | 0 |
| Cycle Times | 0 | 41 |
| Components | 516 | 0 |
| Parts | 115 | 0 |
| Products | 127 | 0 |

---

## 5. Conclusion

Coverage is critically low. Only component details approach complete coverage. Most engineering relationships are missing for the majority of projects.

---

*Report generated automatically during EKL User Acceptance Test.*
