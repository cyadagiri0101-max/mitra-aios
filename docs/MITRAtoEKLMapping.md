# MITRA to EKL Mapping

**Date:** 2026-07-04

This document describes the current MITRA integration expectations for EKL and the available EKL implementation.

## 1. MITRA integration points

### Backend service mapping

MITRA maps its internal engineering-library API to EKL via `EngineeringLibraryService`.

Mitra service calls:

- `search(query)` → `GET /search?q={query}`
- `listProjects()` → `GET /projects`
- `getProject(id)` → `GET /projects/{id}`
- `listDocuments()` → `GET /documents`
- `getDocument(id)` → `GET /documents/{id}`
- `getDashboardWidgets()` → `GET /dashboard/widgets`
- `synchronize()` → (calls `listProjects()` and `listDocuments()` internally)
- `getSyncStatus()` → local MITRA cached status

### Frontend proxy paths

The MITRA frontend calls the backend proxy endpoints defined in `mitra-backend/src/modules/engineering-library/controllers/engineering-library.controller.ts`:

- `GET /ekl/search`
- `GET /ekl/projects`
- `GET /ekl/projects/{id}`
- `GET /ekl/documents`
- `GET /ekl/documents/{id}`
- `GET /ekl/dashboard/widgets`
- `POST /ekl/sync`
- `GET /ekl/sync/status`

## 2. EKL actual endpoints

EKL currently provides these endpoints in `D:\MitraEngineeringLibrary\api\main.py`:

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

## 3. Direct mapping recommendations

### Search

- MITRA should map search to EKL project search:
  - `GET /ekl/search?q={query}` → `GET /api/v1/projects?search={query}`
- If MITRA needs cross-resource search, EKL does not provide a single endpoint. Candidate alternatives are:
  - `GET /api/v1/products?search={query}`
  - `GET /api/v1/components?tool_no={query}`
  - `GET /api/v1/projects?search={query}`

### Projects

- `GET /ekl/projects` → `GET /api/v1/projects`
- `GET /ekl/projects/{id}` → `GET /api/v1/projects/{project_number}`

### Documents

- `GET /ekl/documents` → not available in EKL
- `GET /ekl/documents/{id}` → not available in EKL
- Supported alternative:
  - `GET /api/v1/projects/{project_number}/documents` (project-scoped document list)

### Dashboard widgets

- `GET /ekl/dashboard/widgets` → not available in EKL
- Supported alternative:
  - derive widget data from existing endpoints such as `/api/v1/projects`, `/api/v1/products`, `/api/v1/sync/all`

### Sync

- `POST /ekl/sync` → not available in EKL
- Supported EKL sync endpoints:
  - `GET /api/v1/sync/all`
  - `GET /api/v1/sync/projects?since={datetime}`
- In the current contract, `synchronize()` is a MITRA-local operation and should not rely on unavailable EKL write triggers.

## 4. Practical implications

- `EngineeringLibraryPage` depends on global document listing and will fail to render meaningful document information from EKL.
- `SearchPage` depends on `/ekl/search` and will get 404 errors from the current EKL deployment.
- `DashboardPage` depends on `/ekl/dashboard/widgets` and `POST /ekl/sync`; these calls are not backed by EKL.
- `sync/status` is internal to MITRA and remains valid only if MITRA can successfully compute a local sync state.

## 5. Recommended next step

- Update MITRA's EKL integration layer to reflect EKL's actual API contract rather than inventing unsupported endpoints.
- Optionally update the EKL API to expose a `/search`, `/documents`, and `/dashboard/widgets` contract if the intended integration requires those exact paths.
