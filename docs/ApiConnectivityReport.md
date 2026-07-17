# EKL API Connectivity Report

**Date:** 2026-07-03  
**EKL Base URL:** `http://localhost:8001`  
**API Prefix:** `/api/v1`

---

## 1. Health

| Endpoint | Status | Response Time | Result |
|----------|--------|---------------|--------|
| `GET /health` | 200 OK | ~210 ms | `{"status":"healthy","database":"connected","projects":281}` |

The health endpoint confirms the EKL server and SQLite database are operational.

---

## 2. EKL Resource Endpoints

All tests performed directly against `http://localhost:8001/api/v1`.

| Endpoint | HTTP Status | Response Time | Notes |
|----------|-------------|---------------|-------|
| `GET /projects?limit=5` | 200 | ~208 ms | Returns 281 total projects. |
| `GET /projects/BM454` | 200 | ~205 ms | Project exists. |
| `GET /projects/BM454/documents` | 200 | ~212 ms | 57 document index entries. |
| `GET /projects/BM454/cycle-times` | 200 | ~220 ms | 0 cycle-time records. |
| `GET /projects/BM454/process-planning` | 200 | ~213 ms | 60 process-planning steps. |
| `GET /projects/BM454/part-list` | 200 | ~228 ms | 115 BOM parts. |
| `GET /products?limit=5` | 200 | ~220 ms | 81 total products. |
| `GET /machines` | 200 | ~215 ms | 17 machines. |
| `GET /materials` | 200 | ~211 ms | 2 materials (HDPE, PP). |
| `GET /cycle-times?limit=5` | 200 | ~209 ms | 41 cycle-time records. |
| `GET /components?limit=5` | 200 | ~232 ms | 516 component details. |
| `GET /import-logs` | 200 | ~218 ms | Last import: 2,538 records, 10 errors. |
| `GET /sync/all` | 200 | ~208 ms | Table-count summary returned. |

---

## 3. Mitra-Mapped Endpoints

These are the paths the Mitra `EngineeringLibraryService` actually calls. None of them exist in EKL.

| Endpoint (as called by Mitra) | HTTP Status | Response Time | Response Body |
|-------------------------------|-------------|---------------|---------------|
| `GET /api/v1/search?q=BM454` | 404 Not Found | ~217 ms | `{"detail":"Not Found"}` |
| `GET /api/v1/documents` | 404 Not Found | ~219 ms | `{"detail":"Not Found"}` |
| `GET /api/v1/dashboard/widgets` | 404 Not Found | ~213 ms | `{"detail":"Not Found"}` |

---

## 4. EKL Counts (from `/sync/all`)

| Table | Count |
|-------|-------|
| `project_master` | 281 |
| `product_master` | 81 |
| `machine_master` | 17 |
| `material_master` | 2 |
| `cycle_time_history` | 41 |
| `process_planning` | 227 |
| `part_list` | 115 |
| `component_detail` | 516 |
| `document_index` | 86 |
| `data_sources` | 11 |
| `provenance` | 985 |

---

## 5. Conclusion

EKL's own resource endpoints are healthy and responsive. The connectivity failures are caused by endpoint path mismatches in the Mitra integration layer, not by EKL being unavailable.

---

*Report generated automatically during EKL Integration Validation.*
