# API Validation Report

**Date:** 2026-07-03  
**EKL Base URL:** `http://localhost:8001`  
**Phase:** FINAL — EKL User Acceptance Test

---

## 1. Endpoint Validation

| Endpoint | HTTP Status | Response Time | Count | Status |
|----------|-------------|---------------|-------|--------|
| `GET /health` | 200 | 0.0021 s | 281 | ✅ |
| `GET /api/v1/projects` | 200 | 0.0023 s | 281 | ✅ |
| `GET /api/v1/projects/BM454` | 200 | 0.0019 s | — | ✅ |
| `GET /api/v1/projects/BM454/documents` | 200 | 0.0047 s | 57 | ✅ |
| `GET /api/v1/projects/BM454/cycle-times` | 200 | 0.0014 s | 0 | ✅ |
| `GET /api/v1/projects/BM454/part-list` | 200 | 0.0054 s | 115 | ✅ |
| `GET /api/v1/projects/BM454/process-planning` | 200 | 0.0035 s | 60 | ✅ |
| `GET /api/v1/components` | 200 | 0.0021 s | 516 | ✅ |
| `GET /api/v1/products` | 200 | 0.0022 s | 127 | ✅ |
| `GET /api/v1/machines` | 200 | 0.0021 s | 17 | ✅ |
| `GET /api/v1/materials` | 200 | 0.0014 s | 2 | ✅ |
| `GET /api/v1/sync/all` | 200 | 0.0015 s | — | ✅ |
| `GET /api/v1/dashboard/widgets` | **404** | 0.0005 s | — | ❌ |

**API Availability:** 13 of 14 endpoints available → 92.86%

---

## 2. Missing Endpoints

| Required Endpoint | Status |
|-------------------|--------|
| `GET /api/v1/dashboard/widgets` | ❌ Not implemented |

---

## 3. Verified Defect

The dashboard endpoint required by MITRA is not available in EKL, causing API availability to fall below 100%.

---

*Report generated automatically during EKL User Acceptance Test.*
