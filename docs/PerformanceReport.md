# Performance Report

**Date:** 2026-07-03  
**EKL Server:** `http://localhost:8001` (local SQLite-backed FastAPI)  
**Test Method:** Direct `curl` with `%{time_total}` timing and Mitra service invocation via `ts-node`

---

## 1. EKL Direct Endpoint Latency

All times are total request/response durations measured with `curl` on the same host.

| Endpoint | HTTP Status | Avg Response Time |
|----------|-------------|-------------------|
| `GET /health` | 200 | ~210 ms |
| `GET /projects?limit=5` | 200 | ~208 ms |
| `GET /projects/BM454` | 200 | ~205 ms |
| `GET /projects/BM454/documents` | 200 | ~212 ms |
| `GET /projects/BM454/process-planning` | 200 | ~213 ms |
| `GET /projects/BM454/part-list` | 200 | ~228 ms |
| `GET /products?limit=5` | 200 | ~220 ms |
| `GET /machines` | 200 | ~215 ms |
| `GET /materials` | 200 | ~211 ms |
| `GET /cycle-times?limit=5` | 200 | ~209 ms |
| `GET /components?limit=5` | 200 | ~232 ms |
| `GET /sync/all` | 200 | ~208 ms |

### 1.1 404 Endpoints (Mitra-Mapped)

| Endpoint | HTTP Status | Avg Response Time |
|----------|-------------|-------------------|
| `GET /api/v1/search?q=BM454` | 404 | ~217 ms |
| `GET /api/v1/documents` | 404 | ~219 ms |
| `GET /api/v1/dashboard/widgets` | 404 | ~213 ms |

---

## 2. Mitra Service Invocation Latency

Invoked through `EngineeringLibraryService` with `EKL_BASE_URL=http://localhost:8001/api/v1`.

| Operation | Result | Avg Response Time |
|-----------|--------|-------------------|
| `listProjects()` | ✅ Success | ~5 ms |
| `getProject('BM454')` | ✅ Success | ~4 ms |
| `search('BM454')` | ❌ 404 → BadGateway | ~9 ms |
| `listDocuments()` | ❌ 404 → BadGateway | ~4 ms |
| `getDashboardWidgets()` | ❌ 404 → BadGateway | ~7 ms |
| `synchronize()` | ❌ 404 → BadGateway | ~5 ms |

Service-layer times are lower because the Axios client reuses keep-alive connections.

---

## 3. Observations

- EKL responds consistently within **200–230 ms** on localhost.
- Response times include FastAPI + SQLite query overhead; no caching layer is in place.
- The `/components` endpoint is slightly slower (~232 ms) due to the larger table (516 rows).
- Failures (404) do not add significant latency; they return as quickly as successful requests.

---

## 4. Recommendations

- Once endpoint mapping is corrected, monitor production latency; SQLite is adequate for local validation but PostgreSQL is recommended for production EKL.
- Consider connection-pooling and caching for dashboard widgets if they are fetched frequently.

---

*Report generated automatically during EKL Integration Validation.*
