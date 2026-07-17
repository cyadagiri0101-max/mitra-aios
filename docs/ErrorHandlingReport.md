# Error Handling Report

**Date:** 2026-07-03  
**Service Under Test:** `EngineeringLibraryService` (`mitra-backend/src/modules/engineering-library/services/engineering-library.service.ts`)

---

## 1. Scenarios Tested

### 1.1 EKL Offline / Connection Refused

| Input | Expected | Actual |
|-------|----------|--------|
| `EKL_BASE_URL=http://localhost:19999/api/v1` | `BadGatewayException` | ✅ Thrown |
| `listProjects()` | Message: "Engineering Knowledge Library is unavailable." | ✅ Correct message |

The service logs the Axios error and converts the connection failure into a 502 `BadGatewayException`.

### 1.2 Timeout

| Input | Expected | Actual |
|-------|----------|--------|
| `EKL_TIMEOUT_MS=1` against real EKL | `BadGatewayException` | ✅ Thrown |
| `listProjects()` | Status 502 | ✅ Status 502 |

Very short timeout causes an Axios timeout error, which is wrapped into the same `BadGatewayException` response.

### 1.3 404 from EKL

| Input | Expected | Actual |
|-------|----------|--------|
| `getProject('DOESNOTEXIST999')` | `BadGatewayException` | ✅ Thrown |
| EKL returns `{"detail":"Project not found"}` | Status reflected in error details | ✅ 404 captured in `status` field |

### 1.4 Invalid Endpoint (Mitra-Mapped Paths)

| Input | Expected | Actual |
|-------|----------|--------|
| `service.search('BM454')` → `GET /api/v1/search` | `BadGatewayException` | ✅ Thrown |
| `service.listDocuments()` → `GET /api/v1/documents` | `BadGatewayException` | ✅ Thrown |
| `service.getDashboardWidgets()` → `GET /api/v1/dashboard/widgets` | Fallback or exception | ⚠️ Falls back to counts, but `/documents` then fails |

### 1.5 Empty Responses

| Input | Expected | Actual |
|-------|----------|--------|
| `service.search('')` | `{ results: [] }` | ✅ Returned immediately, no network call |
| `/projects?search=BM475` | `{ total: 0, items: [] }` | ✅ Returned as valid empty array |

### 1.6 Invalid JSON / 500

| Scenario | Result |
|----------|--------|
| EKL always returns JSON or standard FastAPI 404/422. | No invalid JSON or 500 was triggered naturally. |

If EKL were to return malformed JSON, Axios's `transformResponse` would reject, and `handleAxiosError` would wrap it in `BadGatewayException`.

---

## 2. Error Response Shape

When EKL fails, Mitra returns:

```json
{
  "message": "Engineering Knowledge Library is unavailable.",
  "path": "/search",
  "status": 404,
  "details": "Request failed with status code 404"
}
```

The `status` field carries the upstream HTTP code, which is useful for debugging.

---

## 3. Conclusion

Error handling in the Mitra integration layer is robust. Connection failures, timeouts, 404s, and empty responses are all handled gracefully. The errors currently observed are caused by calling non-existent EKL endpoints, not by poor error handling.

---

*Report generated automatically during EKL Integration Validation.*
