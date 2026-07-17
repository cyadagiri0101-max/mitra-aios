# Implementation Decision Matrix

**Date:** 2026-07-04

**Current Phase:** API Contract Gap Analysis / Implementation Approval Gate

## Decision Rules

- If missing functionality belongs to engineering knowledge → implement in EKL.
- If missing functionality belongs to business workflow → implement in MITRA.
- If both systems are correct but contracts differ → implement Adapter Layer.
- Never duplicate engineering logic inside MITRA.
- Never duplicate engineering data inside MITRA.
- MITRA remains a consumer.
- EKL remains the engineering source of truth.

## Feature Decision Matrix

| Feature | MITRA Expectation | EKL Actual | Decision | Implementation Target | Rationale |
|---|---|---|---|---|---|
| Project list | `GET /ekl/projects` | `GET /api/v1/projects` | No change needed | None | Fully compatible; direct mapping exists. |
| Project detail | `GET /ekl/projects/{id}` | `GET /api/v1/projects/{project_number}` | No change needed | None | Direct compatible contract. |
| Search | `GET /ekl/search?q={query}` | `GET /api/v1/projects?search={query}` | Adapter Layer | MITRA adapter | Contracts differ; EKL provides project search, so MITRA should consume via an adapter without duplicating engineering search logic. |
| Global documents list | `GET /ekl/documents` | Not available; EKL provides only project-scoped documents | Adapter Layer / EKL evaluation | Adapter layer preferred; EKL if global document enumeration is required | The document data belongs to EKL. If MITRA requires a global document view, the adapter should translate the request into EKL-supported document retrieval patterns. If the feature is truly an engineering domain capability, EKL should expose it. |
| Document detail by ID | `GET /ekl/documents/{id}` | Not available | Adapter Layer / EKL evaluation | Adapter layer preferred; EKL if an engineering document identity API is needed | MITRA should not invent engineering document identity semantics. Map to EKL-supported document retrieval if possible, or add the endpoint in EKL if the domain requires it. |
| Dashboard widgets | `GET /ekl/dashboard/widgets` | Not available | Adapter Layer | Adapter layer | Widget aggregation is a contract mismatch. Use existing EKL counts and project/document resources in an adapter rather than embedding engineering metrics inside MITRA. |
| Sync trigger | `POST /ekl/sync` | Not available | EKL if trigger semantics are required; Adapter Layer if only status is required | EKL for trigger; adapter for status | EKL is the source of truth for sync state. If MITRA needs a trigger, that belongs to EKL. If MITRA only needs read-only sync state, adapter can map to `/api/v1/sync/all` and `/api/v1/sync/projects`. |
| Sync status | `GET /ekl/sync/status` | MITRA-local cached status | No change needed | None | This is a consumer-side status view; it is already implemented in MITRA without needing new EKL API. |

## Summary Recommendations

- Implement an adapter layer for search, document access, and dashboard widget compatibility.
- Preserve EKL as the engineering source of truth; do not duplicate engineering data or logic in MITRA.
- Use EKL's existing project and sync read endpoints for contract alignment.
- Evaluate whether global document listing and document-by-id semantics are sufficiently engineering-domain to justify adding them to EKL rather than adapting to existing EKL routes.

## Approval Gate

This matrix is the final decision document before implementation. It affirms that:

- No MITRA backend, frontend, EKL backend, controller, service, DTO, database, schema, validator, report, or code modification is included in this document.
- The preferred path is an adapter layer for contract mismatch scenarios.
- EKL remains the authoritative source for engineering knowledge and data.
