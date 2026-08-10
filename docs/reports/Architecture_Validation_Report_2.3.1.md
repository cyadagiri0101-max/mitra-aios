# Architecture Validation Report — Sprint 2.3.1 (Engineering Completion)

> **Date:** 2026-08-03
> **Scope:** Backend + frontend implementation of G-1 traceability, G-2 effectivity, G-3 substitutions, G-4 routing revisions, G-5 multi-reviewer, G-8 unit conversions, G-13 transactional outbox.

## 1. Layering & Dependencies

| Check | Result |
|---|---|
| Controllers → services → repositories only (no entity-to-entity relations for cross-boundary links) | ✅ |
| New tables registered in module `forFeature` (engineering: 6; platform: 1) | ✅ |
| Cross-module dependency (engineering → platform OutboxService) via module imports/exports | ✅ |
| No circular imports introduced | ✅ (`tsc --noEmit` clean) |

## 2. Consistency with Existing Patterns

| Pattern | Applied |
|---|---|
| Entities extend `IndustrialBaseEntity` (audit cols, soft delete) | ✅ all 6 new entities |
| Workflow/status values stored in entity `status`, transitions DB-driven | ✅ substitution/assignment statuses |
| UUID PKs, snake_case table/column mapping (TypeORM naming strategy) | ✅ |
| Permissions naming `domain:feature:verb` | ✅ 8 new permissions |
| RBAC guard pattern `@Roles(...) + @Permissions(...)` on all new endpoints | ✅ |
| DTO validation via class-validator + swagger decorators | ✅ 9 new DTOs |
| Audit inside transactions, domain events via outbox | ✅ |

## 3. Transactional & Concurrency Integrity

| Check | Result |
|---|---|
| Substitution create/update/remove: entity save + outbox append + audit inside `dataSource.transaction` | ✅ |
| Routing revision snapshot: routing + operations inside one transaction | ✅ |
| Review assign: idempotent per (review, assignee) unique constraint | ✅ |
| Outbox: `available_at` + `attempt_count` backoff, relay respects status filter | ✅ |
| Soft-deleted records excluded from validation reads (`deleted_at IS NULL`) | ✅ |
| Optimistic locking preserved (workflow `@VersionColumn`, 409 filter) | ✅ untouched |

## 4. Security & RBAC

| Check | Result |
|---|---|
| New endpoints all behind `JwtAuthGuard` + `RolesGuard` | ✅ |
| Tenant isolation preserved (TenantAwareService scoping on repo reads) | ✅ |
| Admin/management-only endpoints (outbox relay/retry, uom delete) | ✅ |
| No secrets introduced; no debug logging of payloads | ✅ |

## 5. Verification Evidence

| Command | Result |
|---|---|
| `npx tsc --noEmit` (backend) | ✅ clean |
| `npx jest --silent` (backend) | ✅ 51 suites / 657 tests |
| `npx tsc --noEmit` (frontend) | ✅ clean |
| Migration 0018 syntax/consistency review | ✅ (down() symmetric) |

## 6. Known Gaps / Follow-ups

- Inspection-report and retrial DTO/endpoints not yet exposed (columns + entities present; trial service only).
- ECR create/update link validation (drawing/bom/routing/workOrder existence) — DTO has fields, service validation pending.
- BOM validation rules (duplicate part numbers per level, cycle guard, effective-window consistency) — partially covered by existing tree logic; formal rule set pending.
- Traceability `engineering_trace_edges` write endpoints not yet exposed (read service pre-existing); outbox delivery currently manual (relay endpoint) — scheduled worker optional.
- Frontend: `/engineering` consolidated page shipped; deeper per-feature pages deferred.
