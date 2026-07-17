# Search Coverage Report

**Date:** 2026-07-03  
**Search Endpoint:** `GET /api/v1/projects?search={term}`  
**Phase:** FINAL — EKL User Acceptance Test

---

## 1. Search Results by Dimension

| Dimension | Test Term | Matches | Supported |
|-----------|-----------|---------|-----------|
| Project Number | BM454 | 1 | ✅ |
| Bottle Family | Veedol | 0 | ❌ |
| Customer | Veedol | 0 | ❌ |
| Machine | SEB101 | 0 | ❌ |
| Material | HDPE | 0 | ❌ |
| Capacity | 380ml | 2 | ⚠️ (matched project name, not capacity field) |
| Neck Type | (none exist) | 0 | ❌ |
| Cavitation | 8 | 54 | ⚠️ (matched digit in project numbers) |
| Product Name | Champagne 380ml | 2 | ⚠️ (matched project name) |

**Search Coverage Score:** 1 of 9 dimensions returned correct matches → 50% (with caveats).

---

## 2. API Limitation

EKL only supports searching project numbers and project names via `/projects?search=`. It does not support multi-field search by customer, machine, material, capacity, neck type, or cavitation.

---

## 3. Verified Defects

- Search by bottle family, customer, machine, material, and neck type is not supported.
- Capacity and product name matches are coincidental string matches against project names, not semantic field search.

---

*Report generated automatically during EKL User Acceptance Test.*
