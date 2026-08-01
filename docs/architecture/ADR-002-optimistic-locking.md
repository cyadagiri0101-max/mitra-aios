# ADR-002: Optimistic Locking via Version Column

## Status
Accepted

## Context
Concurrent workflow transitions and customer updates could silently overwrite
each other (lost-update problem). The audit found no mechanism to detect
conflicting writes on mutable domain records (e.g. `workflow_instances`).

## Decision
1. Add a `version` column to `workflow_instances` (migration 0014) using
   TypeORM's `@VersionColumn`.
2. Writers increment `version`; on write, TypeORM compares the version in the
   UPDATE `WHERE` clause and throws `OptimisticLockVersionMismatchError` when a
   stale entity is written.
3. A global exception filter (`OptimisticLockVersionMismatchErrorFilter`,
   registered via `APP_FILTER` in `app.module.ts`) maps the error to
   `409 Conflict` with a stable error shape.

## Consequences
- Lost updates on workflow instances are now detected and surfaced as 409s
  instead of silently corrupting state.
- Concurrency regression test added to `customer.service.spec.ts`: a second
  save with a stale version rejects with `OptimisticLockVersionMismatchError`
  and propagates through the 409 filter.
