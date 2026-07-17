# Engineering Relationship Report

**Date:** 2026-07-03  
**Database:** `D:\MitraEngineeringLibrary\database\mekb.sqlite`  
**Phase:** FINAL — EKL User Acceptance Test

---

## 1. Expected Relationship Chain

```
Project
→ Bottle Family
→ Product Variant
→ Customer
→ Machine
→ Material
→ Capacity
→ Neck Type
→ Cavitation
→ Cycle Time
→ Process Planning
→ Part List
→ Component Details
→ Engineering Documents
```

---

## 2. Relationship Coverage

| Link | Projects Covered | Total Projects | Coverage |
|------|------------------|----------------|----------|
| Project → Product | 127 | 281 | 45.2% |
| Project → Bottle Family | 1 | 281 | 0.4% |
| Project → Customer | 1 | 281 | 0.4% |
| Project → Machine | 0 | 281 | 0.0% |
| Project → Material | 117 | 281 | 41.6% |
| Project → Capacity | 117 | 281 | 41.6% |
| Project → Neck Type | 0 | 281 | 0.0% |
| Project → Cavitation | 0 | 281 | 0.0% |
| Project → Cycle Time | 0 | 281 | 0.0% |
| Project → Process Planning | 4 | 281 | 1.4% |
| Project → Part List | 1 | 281 | 0.4% |
| Project → Component Detail | 276 | 281 | 98.2% |
| Project → Engineering Document | 2 | 281 | 0.7% |

**Overall Relationship Coverage:** 0 of 13 links cover all projects.

---

## 3. Entity Counts

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
| Engineering Notes | 0 |

---

## 4. Detailed Project Example: BM454

| Relationship | BM454 Status |
|--------------|--------------|
| Project | ✅ BM454 |
| Product | ❌ Not linked |
| Bottle Family | ❌ Not linked |
| Customer | ✅ Veedol |
| Machine | ❌ Not linked |
| Material | ❌ Not linked |
| Capacity | ❌ Not linked |
| Neck Type | ❌ Not linked |
| Cavitation | ❌ Not linked |
| Cycle Time | ❌ Not linked |
| Process Planning | ✅ 60 steps |
| Part List | ✅ 115 items |
| Component Details | ❌ 0 |
| Documents | ✅ 57 |

---

## 5. Verified Defects

- Only **127 of 281 projects** have a linked product.
- Only **1 of 281 projects** has a linked bottle family.
- Only **1 of 281 projects** has a linked customer.
- **0 of 281 projects** have linked machines, neck types, cavitation, or cycle times.
- Only **4 projects** have process planning.
- Only **1 project** has a part list.
- Only **2 projects** have engineering documents.

---

*Report generated automatically during EKL User Acceptance Test.*
