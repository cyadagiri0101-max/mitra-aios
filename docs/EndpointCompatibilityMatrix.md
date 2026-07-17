# Endpoint Compatibility Matrix

**Date:** 2026-07-04

This matrix compares MITRA's expected EKL integration endpoints with the actual EKL API surface.

| MITRA Expected Path | MITRA Feature | Actual EKL Path | Compatibility | Notes |
|---------------------|---------------|-----------------|---------------|-------|
| `GET /ekl/search?q={query}` | EKL search | `GET /api/v1/projects?search={query}` | Partial | Project search exists, but global `/search` does not. Search semantics are resource-scoped, not global. |
| `GET /ekl/projects` | List EKL projects | `GET /api/v1/projects` | Compatible | Returns project list with pagination support. |
| `GET /ekl/projects/{id}` | Get project details | `GET /api/v1/projects/{project_number}` | Compatible | Path and payload are aligned. |
| `GET /ekl/documents` | List EKL documents | None | Incompatible | EKL does not expose a global documents list. |
| `GET /ekl/documents/{id}` | Get document details | None | Incompatible | EKL exposes only `/api/v1/projects/{project_number}/documents`; no document-by-id endpoint exists. |
| `GET /ekl/dashboard/widgets` | KPI widget summary | None | Incompatible | EKL has no dashboard widget endpoint. |
| `POST /ekl/sync` | Trigger EKL sync | None | Incompatible | EKL offers read-only sync status/count endpoints only. |
| `GET /ekl/sync/status` | Local sync status | Local MITRA cache | Compatible | This path is not forwarded to EKL; it reads MITRA's cached sync status. |

## Notes on EKL actual endpoints

- `GET /api/v1/projects` supports `prefix`, `search`, `skip`, `limit`.
- `GET /api/v1/projects/{project_number}/documents` returns document rows for a single project.
- `GET /api/v1/sync/all` returns table counts for sync auditing, not a synchronization trigger.
- `GET /api/v1/sync/projects?since={datetime}` returns modified projects since a timestamp.

## Unsupported behavior

- Global document search or enumeration is not supported in EKL.
- Dashboard widget aggregation is not supported in EKL.
- POST-based sync operations are not supported by EKL; MITRA must either call an existing EKL sync endpoint or implement a local sync orchestration mechanism.
