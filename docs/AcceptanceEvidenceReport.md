# Acceptance Evidence Report

**Date:** 2026-07-03T11:08:10.314826+00:00
**Total Checks:** 77
**Passed:** 50
**Failed:** 27

## Summary Metrics

| Category | Pass | Fail | Total |
|----------|------|------|-------|
| Database Integrity | 7 | 0 | 7 |
| Database Integrity / Orphans | 14 | 0 | 14 |
| Engineering Relationships | 0 | 13 | 13 |
| Duplicate Validation | 5 | 4 | 9 |
| Orphan Validation | 6 | 1 | 7 |
| Search Validation | 4 | 5 | 9 |
| API Validation | 13 | 1 | 14 |
| MITRA Integration | 1 | 3 | 4 |

---

## Detailed Evidence

### Database Integrity

**Check:** Projects with valid project number

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT id, project_number FROM project_master WHERE project_number IS NULL OR project_number = ''
```

**Expected:** 0 invalid records

**Actual:** 0 invalid records

**Record Count:** 0

**Root Cause:** Project numbers are populated for all projects.

---

**Check:** Products linked to project

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT id, product_name FROM product_master WHERE project_id IS NULL
```

**Expected:** 0 products without project

**Actual:** 0 products without project

**Record Count:** 0

**Root Cause:** All products are linked to projects.

---

**Check:** Customers exist

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT COUNT(*) AS c FROM customer_master
```

**Expected:** >0 customers

**Actual:** 1 customers

**Record Count:** 1

**Root Cause:** Customer master table has records.

---

**Check:** Machines exist

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT COUNT(*) AS c FROM machine_master
```

**Expected:** >0 machines

**Actual:** 17 machines

**Record Count:** 17

**Root Cause:** Machine master table has records.

---

**Check:** Materials exist

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT COUNT(*) AS c FROM material_master
```

**Expected:** >0 materials

**Actual:** 2 materials

**Record Count:** 2

**Root Cause:** Material master table has records.

---

**Check:** Bottle families exist

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT COUNT(*) AS c FROM bottle_family
```

**Expected:** >0 bottle families

**Actual:** 1 bottle families

**Record Count:** 1

**Root Cause:** Bottle family table has records.

---

**Check:** Technical specifications have valid bottle family

**Status:** ✅ PASS

**Query / Endpoint:**
```

        SELECT ts.id, ts.spec_name FROM technical_specification ts
        LEFT JOIN bottle_family bf ON ts.bottle_family_id = bf.id
        WHERE bf.id IS NULL
    
```

**Expected:** 0 invalid records

**Actual:** 0 invalid records

**Record Count:** 0

**Root Cause:** All technical specs are linked to valid bottle families.

---

### Database Integrity / Orphans

**Check:** Project products - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM product_master c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Product bottle families - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM product_master c
            LEFT JOIN bottle_family p ON c.bottle_family_id = p.id
            WHERE c.bottle_family_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Product neck types - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM product_master c
            LEFT JOIN neck_type_master p ON c.neck_type_id = p.id
            WHERE c.neck_type_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Cycle time projects - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM cycle_time_history c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Cycle time machines - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM cycle_time_history c
            LEFT JOIN machine_master p ON c.machine_id = p.id
            WHERE c.machine_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Process planning projects - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM process_planning c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Part list projects - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM part_list c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Component projects - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM component_detail c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Document projects - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM document_index c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Engineering note projects - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM engineering_notes c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Project-product links - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM project_product_link c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Project-product product links - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM project_product_link c
            LEFT JOIN product_master p ON c.product_id = p.id
            WHERE c.product_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Project-customer project links - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM project_customer_link c
            LEFT JOIN project_master p ON c.project_id = p.id
            WHERE c.project_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

**Check:** Project-customer customer links - broken FK

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT c.id FROM project_customer_link c
            LEFT JOIN customer_master p ON c.customer_id = p.id
            WHERE c.customer_id IS NOT NULL AND p.id IS NULL
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No broken foreign keys.

---

### Engineering Relationships

**Check:** Project → Product

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM product_master WHERE project_id IS NOT NULL
```

**Expected:** 281 projects

**Actual:** 127 projects

**Record Count:** 127

**Root Cause:** Project → Product relationship is missing for 154 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Bottle Family

**Status:** ❌ FAIL

**Query / Endpoint:**
```

            SELECT COUNT(DISTINCT p.project_id) FROM product_master p
            JOIN bottle_family bf ON p.bottle_family_id = bf.id
            WHERE p.project_id IS NOT NULL
        
```

**Expected:** 281 projects

**Actual:** 1 projects

**Record Count:** 1

**Root Cause:** Project → Bottle Family relationship is missing for 280 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Customer

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM project_customer_link
```

**Expected:** 281 projects

**Actual:** 1 projects

**Record Count:** 1

**Root Cause:** Project → Customer relationship is missing for 280 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Machine

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL
```

**Expected:** 281 projects

**Actual:** 0 projects

**Record Count:** 0

**Root Cause:** Project → Machine relationship is missing for 281 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Material

**Status:** ❌ FAIL

**Query / Endpoint:**
```

            SELECT COUNT(DISTINCT p.project_id) FROM product_master p
            WHERE p.project_id IS NOT NULL AND p.material IS NOT NULL
        
```

**Expected:** 281 projects

**Actual:** 117 projects

**Record Count:** 117

**Root Cause:** Project → Material relationship is missing for 164 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Capacity

**Status:** ❌ FAIL

**Query / Endpoint:**
```

            SELECT COUNT(DISTINCT p.project_id) FROM product_master p
            WHERE p.project_id IS NOT NULL AND p.volume_ml IS NOT NULL
        
```

**Expected:** 281 projects

**Actual:** 117 projects

**Record Count:** 117

**Root Cause:** Project → Capacity relationship is missing for 164 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Neck Type

**Status:** ❌ FAIL

**Query / Endpoint:**
```

            SELECT COUNT(DISTINCT p.project_id) FROM product_master p
            WHERE p.project_id IS NOT NULL AND p.neck_type_id IS NOT NULL
        
```

**Expected:** 281 projects

**Actual:** 0 projects

**Record Count:** 0

**Root Cause:** Project → Neck Type relationship is missing for 281 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Cavitation

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL AND cavitation IS NOT NULL
```

**Expected:** 281 projects

**Actual:** 0 projects

**Record Count:** 0

**Root Cause:** Project → Cavitation relationship is missing for 281 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Cycle Time

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM cycle_time_history WHERE project_id IS NOT NULL
```

**Expected:** 281 projects

**Actual:** 0 projects

**Record Count:** 0

**Root Cause:** Project → Cycle Time relationship is missing for 281 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Process Planning

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM process_planning WHERE project_id IS NOT NULL
```

**Expected:** 281 projects

**Actual:** 4 projects

**Record Count:** 4

**Root Cause:** Project → Process Planning relationship is missing for 277 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Part List

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM part_list WHERE project_id IS NOT NULL
```

**Expected:** 281 projects

**Actual:** 1 projects

**Record Count:** 1

**Root Cause:** Project → Part List relationship is missing for 280 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Component Detail

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM component_detail WHERE project_id IS NOT NULL
```

**Expected:** 281 projects

**Actual:** 276 projects

**Record Count:** 276

**Root Cause:** Project → Component Detail relationship is missing for 5 projects.

**Issue Type:** Importer defect

---

**Check:** Project → Document

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT COUNT(DISTINCT project_id) FROM document_index WHERE project_id IS NOT NULL
```

**Expected:** 281 projects

**Actual:** 2 projects

**Record Count:** 2

**Root Cause:** Project → Document relationship is missing for 279 projects.

**Issue Type:** Importer defect

---

### Duplicate Validation

**Check:** Project number

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT project_number FROM project_master GROUP BY project_number HAVING COUNT(*) > 1
```

**Expected:** 0 duplicates

**Actual:** 0 duplicate groups

**Record Count:** 0

**Root Cause:** No duplicates found.

---

**Check:** Product name + variant

**Status:** ❌ FAIL

**Query / Endpoint:**
```

            SELECT product_name || '|' || COALESCE(product_variant,'') AS key
            FROM product_master GROUP BY key HAVING COUNT(*) > 1
        
```

**Expected:** 0 duplicates

**Actual:** 35 duplicate groups

**Record Count:** 35

**Sample Records:**
```json
[
  {
    "key": "Bournvita 1000gm|Less compressed base flash (Lost Head Standard)"
  },
  {
    "key": "Bournvita 200gm|Less compressed base flash (Lost Head Standard)"
  },
  {
    "key": "Bournvita 500gm|Less compressed base flash (Lost Head Standard)"
  },
  {
    "key": "Champagne 380ml|Less compressed flash (Product over 300ml)"
  },
  {
    "key": "Charmis Jar 100ml|Less compressed base flash (Lost Head Standard)"
  },
  {
    "key": "Charmis Jar 175ml|Less compressed base flash (Lost Head Standard)"
  },
  {
    "key": "Charmis Jar 30ml|Less compressed base flash (Lost Head Standard)"
  },
  {
    "key": "Charmis Jar 58ml|Less compressed base flash (Lost Head Standard)"
  },
  {
    "key": "DLS 900ml|Less compressed flash (Product over 300ml)"
  },
  {
    "key": "Dhanuka 1000ml|"
  }
]
```

**Root Cause:** Duplicate Product name + variant groups detected.

**Issue Type:** Importer defect

---

**Check:** Customer code

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT customer_code FROM customer_master GROUP BY customer_code HAVING COUNT(*) > 1
```

**Expected:** 0 duplicates

**Actual:** 0 duplicate groups

**Record Count:** 0

**Root Cause:** No duplicates found.

---

**Check:** Machine code

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT machine_code FROM machine_master GROUP BY machine_code HAVING COUNT(*) > 1
```

**Expected:** 0 duplicates

**Actual:** 0 duplicate groups

**Record Count:** 0

**Root Cause:** No duplicates found.

---

**Check:** Material code

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT material_code FROM material_master GROUP BY material_code HAVING COUNT(*) > 1
```

**Expected:** 0 duplicates

**Actual:** 0 duplicate groups

**Record Count:** 0

**Root Cause:** No duplicates found.

---

**Check:** Cycle time

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT project_id, machine_id, product_name, cavitation, cycle_time_sec
            FROM cycle_time_history
            WHERE project_id IS NOT NULL
            GROUP BY project_id, machine_id, product_name, cavitation, cycle_time_sec
            HAVING COUNT(*) > 1
        
```

**Expected:** 0 duplicates

**Actual:** 0 duplicate groups

**Record Count:** 0

**Root Cause:** No duplicates found.

---

**Check:** Document index (project + serial)

**Status:** ❌ FAIL

**Query / Endpoint:**
```

            SELECT project_id, serial_no FROM document_index
            GROUP BY project_id, serial_no HAVING COUNT(*) > 1
        
```

**Expected:** 0 duplicates

**Actual:** 6 duplicate groups

**Record Count:** 6

**Sample Records:**
```json
[
  {
    "project_id": 127,
    "serial_no": 8
  },
  {
    "project_id": 127,
    "serial_no": 9
  },
  {
    "project_id": 127,
    "serial_no": 15
  },
  {
    "project_id": 127,
    "serial_no": 32
  },
  {
    "project_id": 127,
    "serial_no": 33
  },
  {
    "project_id": 127,
    "serial_no": 34
  }
]
```

**Root Cause:** Duplicate Document index (project + serial) groups detected.

**Issue Type:** Importer defect

---

**Check:** Component detail

**Status:** ❌ FAIL

**Query / Endpoint:**
```

            SELECT project_id, tool_no, description, material FROM component_detail
            GROUP BY project_id, tool_no, description, material HAVING COUNT(*) > 1
        
```

**Expected:** 0 duplicates

**Actual:** 239 duplicate groups

**Record Count:** 239

**Sample Records:**
```json
[
  {
    "project_id": 2,
    "tool_no": "247",
    "description": "Nutrilite 90cc HDPE",
    "material": "HDPE"
  },
  {
    "project_id": 3,
    "tool_no": "246",
    "description": "Nutrilite 190cc HDPE",
    "material": "HDPE"
  },
  {
    "project_id": 4,
    "tool_no": "245",
    "description": "Eno100g HDPE IN Plug Seal",
    "material": "HDPE"
  },
  {
    "project_id": 5,
    "tool_no": "244",
    "description": "Revital 100g HDPE (Men's)",
    "material": "HDPE"
  },
  {
    "project_id": 6,
    "tool_no": "243",
    "description": "STD 26 250ml HDPE",
    "material": "HDPE"
  },
  {
    "project_id": 8,
    "tool_no": "241",
    "description": "Revital 100g HDPE (Women's)",
    "material": "HDPE"
  },
  {
    "project_id": 10,
    "tool_no": "239",
    "description": "Icon 957ml PP",
    "material": "PP"
  },
  {
    "project_id": 11,
    "tool_no": "238",
    "description": "IBMO 1000ml HDPE",
    "material": "HDPE"
  },
  {
    "project_id": 12,
    "tool_no": "237",
    "description": "IBMO 1000ml HDPE",
    "material": "HDPE"
  },
  {
    "project_id": 14,
    "tool_no": "235",
    "description": "Nutrilite 190cc HDPE",
    "material": "HDPE"
  }
]
```

**Root Cause:** Duplicate Component detail groups detected.

**Issue Type:** Importer defect

---

**Check:** Part list

**Status:** ❌ FAIL

**Query / Endpoint:**
```

            SELECT project_id, description, material FROM part_list
            GROUP BY project_id, description, material HAVING COUNT(*) > 1
        
```

**Expected:** 0 duplicates

**Actual:** 10 duplicate groups

**Record Count:** 10

**Sample Records:**
```json
[
  {
    "project_id": 127,
    "description": "Dowel Pins High precision Type/5Dia",
    "material": null
  },
  {
    "project_id": 127,
    "description": "LOWER MASK BUSH SIDE",
    "material": "ALUMINIUM"
  },
  {
    "project_id": 127,
    "description": "O-RING-4 B&P",
    "material": null
  },
  {
    "project_id": 127,
    "description": "PINCH PLATE MC FIX-1,2&3",
    "material": "STEEL"
  },
  {
    "project_id": 127,
    "description": "PINCH_PLATES_BODY- BL,BR, PL & PR",
    "material": "BERILIUM"
  },
  {
    "project_id": 127,
    "description": "SHC SCREW*",
    "material": null
  },
  {
    "project_id": 127,
    "description": "SHCS SCREW",
    "material": null
  },
  {
    "project_id": 127,
    "description": "SHCS SCREW*",
    "material": null
  },
  {
    "project_id": 127,
    "description": "SHCS Screw",
    "material": null
  },
  {
    "project_id": 127,
    "description": "Socket Head Cap Screws/Black Oxide",
    "material": null
  }
]
```

**Root Cause:** Duplicate Part list groups detected.

**Issue Type:** Importer defect

---

### Orphan Validation

**Check:** Documents without project

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT id, serial_no FROM document_index WHERE project_id IS NULL
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No orphan records.

---

**Check:** Cycle times without project

**Status:** ❌ FAIL

**Query / Endpoint:**
```
SELECT id, product_name FROM cycle_time_history WHERE project_id IS NULL
```

**Expected:** 0 orphan records

**Actual:** 41 orphan records

**Record Count:** 41

**Sample Records:**
```json
[
  {
    "id": 1,
    "product_name": null
  },
  {
    "id": 2,
    "product_name": null
  },
  {
    "id": 3,
    "product_name": null
  },
  {
    "id": 4,
    "product_name": null
  },
  {
    "id": 5,
    "product_name": null
  },
  {
    "id": 6,
    "product_name": null
  },
  {
    "id": 7,
    "product_name": null
  },
  {
    "id": 8,
    "product_name": null
  },
  {
    "id": 9,
    "product_name": null
  },
  {
    "id": 10,
    "product_name": null
  }
]
```

**Root Cause:** Cycle times without project found.

**Issue Type:** Importer defect

---

**Check:** Part lists without project

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT id, description FROM part_list WHERE project_id IS NULL
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No orphan records.

---

**Check:** Components without project

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT id, tool_no FROM component_detail WHERE project_id IS NULL
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No orphan records.

---

**Check:** Products without project

**Status:** ✅ PASS

**Query / Endpoint:**
```
SELECT id, product_name FROM product_master WHERE project_id IS NULL
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No orphan records.

---

**Check:** Customers without projects

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT cm.id, cm.customer_code FROM customer_master cm
            WHERE NOT EXISTS (SELECT 1 FROM project_customer_link pcl WHERE pcl.customer_id = cm.id)
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No orphan records.

---

**Check:** Bottle families without products

**Status:** ✅ PASS

**Query / Endpoint:**
```

            SELECT bf.id, bf.family_name FROM bottle_family bf
            WHERE NOT EXISTS (SELECT 1 FROM product_master p WHERE p.bottle_family_id = bf.id)
        
```

**Expected:** 0 orphan records

**Actual:** 0 orphan records

**Record Count:** 0

**Root Cause:** No orphan records.

---

### Search Validation

**Check:** Search by Project Number: 'BM454'

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=BM454
```

**Expected:** >=1 relevant match

**Actual:** HTTP 200, 1 project matches

**Record Count:** 1

**Root Cause:** Search returned 1 project match(es).

---

**Check:** Search by Bottle Family: 'Veedol'

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=Veedol
```

**Expected:** API supports this dimension

**Actual:** HTTP 200, 0 project matches

**Record Count:** 0

**Root Cause:** Search returned no project matches; dimension not supported by /projects?search=.

**Issue Type:** API defect

---

**Check:** Search by Customer: 'Veedol'

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=Veedol
```

**Expected:** API supports this dimension

**Actual:** HTTP 200, 0 project matches

**Record Count:** 0

**Root Cause:** Search returned no project matches; dimension not supported by /projects?search=.

**Issue Type:** API defect

---

**Check:** Search by Machine: 'SEB101'

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=SEB101
```

**Expected:** API supports this dimension

**Actual:** HTTP 200, 0 project matches

**Record Count:** 0

**Root Cause:** Search returned no project matches; dimension not supported by /projects?search=.

**Issue Type:** API defect

---

**Check:** Search by Material: 'HDPE'

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=HDPE
```

**Expected:** API supports this dimension

**Actual:** HTTP 200, 0 project matches

**Record Count:** 0

**Root Cause:** Search returned no project matches; dimension not supported by /projects?search=.

**Issue Type:** API defect

---

**Check:** Search by Capacity: '380ml'

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=380ml
```

**Expected:** API supports this dimension

**Actual:** HTTP 200, 2 project matches

**Record Count:** 2

**Root Cause:** Search returned 2 project match(es).

---

**Check:** Search by Neck Type: '26mm'

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=26mm
```

**Expected:** API supports this dimension

**Actual:** HTTP 200, 0 project matches

**Record Count:** 0

**Root Cause:** Search returned no project matches; dimension not supported by /projects?search=.

---

**Check:** Search by Cavitation: '8'

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=8
```

**Expected:** API supports this dimension

**Actual:** HTTP 200, 54 project matches

**Record Count:** 54

**Root Cause:** Search returned 54 project match(es).

---

**Check:** Search by Product Name: 'Champagne 380ml'

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?search=Champagne 380ml
```

**Expected:** >=1 relevant match

**Actual:** HTTP 200, 2 project matches

**Record Count:** 2

**Root Cause:** Search returned 2 project match(es).

---

### API Validation

**Check:** Health

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/health
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 281

**Root Cause:** Endpoint responded as expected.

---

**Check:** Projects

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects?limit=5
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 281

**Root Cause:** Endpoint responded as expected.

---

**Check:** Project Details

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects/BM454
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 0

**Root Cause:** Endpoint responded as expected.

---

**Check:** Project Documents

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects/BM454/documents
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 57

**Root Cause:** Endpoint responded as expected.

---

**Check:** Project Cycle Times

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects/BM454/cycle-times
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 0

**Root Cause:** Endpoint responded as expected.

---

**Check:** Project Part List

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects/BM454/part-list
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 115

**Root Cause:** Endpoint responded as expected.

---

**Check:** Project Process Planning

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects/BM454/process-planning
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 60

**Root Cause:** Endpoint responded as expected.

---

**Check:** Components

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/components?limit=5
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 516

**Root Cause:** Endpoint responded as expected.

---

**Check:** Products

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/products?limit=5
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 127

**Root Cause:** Endpoint responded as expected.

---

**Check:** Customers

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/sync/all
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 0

**Root Cause:** Endpoint responded as expected.

---

**Check:** Machines

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/machines
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 17

**Root Cause:** Endpoint responded as expected.

---

**Check:** Materials

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/materials
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 2

**Root Cause:** Endpoint responded as expected.

---

**Check:** Sync

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/sync/all
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 0

**Root Cause:** Endpoint responded as expected.

---

**Check:** Dashboard

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/dashboard/widgets
```

**Expected:** HTTP 200

**Actual:** HTTP 404

**Record Count:** 0

**Root Cause:** Endpoint did not respond as expected (expected 200, got 404).

**Issue Type:** API defect

---

### MITRA Integration

**Check:** MITRA Search

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/search?q=BM454
```

**Expected:** HTTP 200

**Actual:** HTTP 404

**Record Count:** 0

**Root Cause:** MITRA calls endpoint that does not exist in EKL (expected 200, got 404).

**Issue Type:** Integration defect

---

**Check:** MITRA Documents

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/documents
```

**Expected:** HTTP 200

**Actual:** HTTP 404

**Record Count:** 0

**Root Cause:** MITRA calls endpoint that does not exist in EKL (expected 200, got 404).

**Issue Type:** Integration defect

---

**Check:** MITRA Dashboard

**Status:** ❌ FAIL

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/dashboard/widgets
```

**Expected:** HTTP 200

**Actual:** HTTP 404

**Record Count:** 0

**Root Cause:** MITRA calls endpoint that does not exist in EKL (expected 200, got 404).

**Issue Type:** Integration defect

---

**Check:** MITRA Project Viewer

**Status:** ✅ PASS

**Query / Endpoint:**
```
GET http://localhost:8001/api/v1/projects/BM454
```

**Expected:** HTTP 200

**Actual:** HTTP 200

**Record Count:** 0

**Root Cause:** MITRA endpoint mapped correctly.

---
