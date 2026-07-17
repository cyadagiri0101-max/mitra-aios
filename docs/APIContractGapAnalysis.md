# API Contract Gap Analysis

**Date:** 2026-07-04

**Scope:** Read-only contract analysis for MITRA-to-EKL integration. This report compares MITRA expected EKL endpoints and behavior against the actual EKL REST API available in `D:\MitraEngineeringLibrary\api\main.py`.

## 1. Summary

- EKL is operational and exposes a healthy set of REST resources under `/api/v1`.
- MITRA's current integration layer expects several EKL endpoints that do not exist in the deployed EKL API.
- The primary contract gaps are:
  - Search endpoint mismatch
  - Global document listing mismatch
  - Dashboard widget endpoint missing
  - Sync implementation depends on missing document endpoints
- Mitra-to-EKL project-level access is partially compatible for:
  - `GET /projects`
  - `GET /projects/{id}`
  - `GET /projects/{id}/cycle-times`
  - `GET /projects/{id}/process-planning`
  - `GET /projects/{id}/part-list`
  - `GET /projects/{id}/documents`

## 2. MITRA Expected EKL Contract

MITRA's backend integration layer is defined in `mitra-backend/src/modules/engineering-library/services/engineering-library.service.ts` and the corresponding controller in `mitra-backend/src/modules/engineering-library/controllers/engineering-library.controller.ts`.

The following EKL paths are expected by MITRA:

- `GET {EKL_BASE_URL}/search?q={query}`
- `GET {EKL_BASE_URL}/projects`
- `GET {EKL_BASE_URL}/projects/{id}`
- `GET {EKL_BASE_URL}/documents`
- `GET {EKL_BASE_URL}/documents/{id}`
- `GET {EKL_BASE_URL}/dashboard/widgets`
- `POST {EKL_BASE_URL}/sync`
- `GET {EKL_BASE_URL}/sync/status` (local MITRA status, not forwarded to EKL)

The frontend also calls these endpoints through the MITRA API proxy:

- `GET /ekl/search`
- `GET /ekl/projects`
- `GET /ekl/projects/{id}`
- `GET /ekl/documents`
- `GET /ekl/documents/{id}`
- `GET /ekl/dashboard/widgets`
- `POST /ekl/sync`
- `GET /ekl/sync/status`

## 3. Actual EKL API Surface

EKL exposes the following endpoints from `D:\MitraEngineeringLibrary\api\main.py`:

- `GET /health`
- `GET /api/v1/projects`
- `GET /api/v1/projects/{project_number}`
- `GET /api/v1/projects/{project_number}/cycle-times`
- `GET /api/v1/projects/{project_number}/process-planning`
- `GET /api/v1/projects/{project_number}/part-list`
- `GET /api/v1/projects/{project_number}/documents`
- `GET /api/v1/products`
- `GET /api/v1/machines`
- `GET /api/v1/materials`
- `GET /api/v1/cycle-times`
- `GET /api/v1/components`
- `GET /api/v1/import-logs`
- `GET /api/v1/sync/projects`
- `GET /api/v1/sync/all`

## 4. Gap Classification

### 4.1 Functional gaps

- `search` is implemented by MITRA as `/search?q=...` but EKL supports search only via resource-level query parameters, e.g. `/api/v1/projects?search=...`.
- `documents` is implemented by MITRA as a global document list `/documents`; EKL provides only project-scoped document lists under `/api/v1/projects/{project_number}/documents`.
- `dashboard/widgets` is expected by MITRA but is absent in EKL.
- `POST /sync` is expected by MITRA, but EKL only exposes read-only sync-related endpoints (`/api/v1/sync/projects`, `/api/v1/sync/all`).

### 4.2 Compatibility consequences

- Search in the frontend and backend integration is non-functional because the path is missing.
- The EKL Engineering Library page in MITRA cannot load documents because `/ekl/documents` is unsupported.
- Dashboard widget rendering falls back to local counts only if the service catches the missing endpoint, but the user-facing dashboard still depends on missing data.
- Sync behavior is broken in practice because `synchronize()` depends on `listDocuments()` and that endpoint is unavailable.

## 5. Evidence

- Direct EKL health probe: `GET /health` returns 200.
- Direct EKL contract test: `GET /api/v1/projects`, `GET /api/v1/products`, `GET /api/v1/machines`, `GET /api/v1/materials`, `GET /api/v1/sync/all` return valid responses.
- Mitra proxy contract failure: calling the expected paths against EKL returns HTTP 404.

## 6. Recommendations

- Align MITRA search integration to EKL's resource search query model, starting with `/api/v1/projects?search=`.
- Replace the global `/documents` expectation with project-scoped document fetching: `/api/v1/projects/{project_number}/documents`.
- Remove or replace `/dashboard/widgets` in MITRA until EKL exposes a matching endpoint.
- Use EKL's existing sync audit endpoints (`/api/v1/sync/all` and `/api/v1/sync/projects?since=`) as the basis for MITRA sync compatibility.

## 7. Conclusion

The current MITRA-to-EKL contract is partially compatible for project retrieval and some resource queries, but it is broken for search, documents, dashboard widgets, and sync.

All work in this analysis phase was read-only and based on the current code and deployed EKL API surface.
