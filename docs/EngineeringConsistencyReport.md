# Engineering Consistency Report

**Date:** 2026-07-03  
**Database:** `D:\MitraEngineeringLibrary\database\mekb.sqlite`  
**Phase:** FINAL — EKL User Acceptance Test

---

## 1. Consistency Checks

### 1.1 Project Reachability via REST API

| Check | Result |
|-------|--------|
| Total projects | 281 |
| Reachable via API | 281 |
| Unreachable | 0 |

**Status:** ✅ All projects reachable.

### 1.2 Record Ownership

| Entity | Must Belong to Project | With Project ID | Without Project ID | Status |
|--------|------------------------|-----------------|--------------------|--------|
| Product | Yes | 127 | 0 | ✅ |
| Cycle Time | Yes | 0 | 41 | ❌ |
| Process Planning | Yes | 227 | 0 | ✅ |
| Part List | Yes | 115 | 0 | ✅ |
| Component Detail | Yes | 516 | 0 | ✅ |
| Document | Yes | 86 | 0 | ✅ |

### 1.3 Product Consistency

| Check | Result |
|-------|--------|
| Products with `project_id` | 127 / 127 |
| Products with `bottle_family_id` | 0 / 127 |
| Products with `neck_type_id` | 0 / 127 |
| Products with `material` | 117 / 127 |

### 1.4 Customer Consistency

| Check | Result |
|-------|--------|
| Customers in master | 1 |
| Projects linked to a customer | 1 (BM454) |

### 1.5 Machine Consistency

| Check | Result |
|-------|--------|
| Machines in master | 17 |
| Cycle-time records with machine | 41 |
| Cycle-time records with project | 0 |

### 1.6 Material Consistency

| Check | Result |
|-------|--------|
| Materials in master | 2 |
| Products with material text | 117 / 127 |
| Products linked to `material_master` FK | 0 (no FK exists) |

---

## 2. Verified Defects

1. **41 cycle-time records are not linked to any project.**
2. **No products are linked to bottle families or neck types.**
3. **Only 1 customer is linked to 1 project; 280 projects have no customer.**
4. **No cycle times are linked to projects, so machines are not traceable to projects.**
5. **Material is free text on products; no normalized material-project relationship exists.**

---

## 3. Conclusion

Data is internally consistent at the foreign-key level, but most engineering relationships required for traceability are incomplete or missing.

---

*Report generated automatically during EKL User Acceptance Test.*
