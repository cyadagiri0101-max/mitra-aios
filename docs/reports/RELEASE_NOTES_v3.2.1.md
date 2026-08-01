# MITRA v3.2.1 — Release Notes

**Date:** 2026-07-31
**Components:** mitra-backend (NestJS/TypeORM/PostgreSQL) · mitra-frontend (React/Vite)
**Sprint:** 2.1.1 — Final Production Certification

---

## Executive Summary

MITRA v3.2.1 is the audit-remediation and production-certification release of
the Engineering Intelligence Platform. All critical and major findings from
the backend security audit (C-1…C-3, M-1…M-7) are resolved, the commercial
domain is decomposed and hardened, workflow state changes are transactional,
optimistic locking protects against lost updates, and the frontend initial
payload was reduced by ~82% (gzip). Verification: 512 unit/integration tests
green across 38 suites, TypeScript clean, production builds clean.

## New Features

- **Optimistic locking** on workflow instances — concurrent writers receive
  `409 Conflict` instead of silently overwriting state.
- **CSV import/export** for customers moved into a dedicated
  `CustomerImportService` with its own test suite.
- **Guarded RFQ workflow transitions** — `status` is no longer writable via
  generic update endpoints; only state-machine methods change it.
- **`QuotationAcceptanceService`** — accept → project-create → link executed
  as one coordinated flow (removes controller `forwardRef` cycle).

## Security Improvements

| Finding | Remediation |
|---|---|
| C-1 workflow state tampering | Guarded transactional transitions (ADR-001) |
| C-2 status mutation via generic updates | `status` removed from update DTOs |
| C-3 audit gaps / non-atomic audit | Audit + notification inside the transition transaction (ADR-006) |
| M-1 detached M-1 child re-creation | Detach fix in customer facade |
| M-2/M-5 duplicate master data | Partial unique indexes (migration 0014) |
| M-3 duplicate RFQ accept/approve | State-machine guards → 400 |
| M-4 non-atomic project creation | Orchestrated acceptance flow |
| M-6 orphaned lead/RFQ references | FK `ON DELETE SET NULL` (migration 0014) |
| M-7 actor/tenant inconsistency | Identity always from JWT; consistent audit fields |

- **RBAC**: hardened role-assignment flow with `role-assignment.service.spec.ts`
  and `security-regression.spec.ts` (14 tests).
- **DELETE endpoints** uniformly return `204 No Content` (ADR-005).

## Database Changes

- **Migration 1700000000014** (Data Integrity Remediation):
  - `workflow_instances.version` column (optimistic locking)
  - Full UNIQUE constraints replaced by partial unique indexes:
    `customers(code)`, `leads(lead_number)`, `rfqs(rfq_number)`,
    `customer_types(code)`, `customer_categories(code)` — active rows stay
    unique, soft-deleted keys become reusable
  - FKs `ON DELETE SET NULL`: `leads.contact_id`, `leads.owner_id`,
    `leads.converted_customer_id`, `rfqs.enquiry_id`, `rfqs.contact_id`
  - Indexes: `IDX_rfqs_enquiry`, `IDX_customer_activities_reference`
  - Fully reversible `down()`; see `docs/guides/Migration_0014_Guide.md`
- Migrations 0011–0013 (commercial domain, audit schema, security
  remediation) are part of this release lineage and run in order.

## Workflow Improvements

- `executeTransition` wraps RFQ save + workflow update + audit + notification
  in a single transaction (ADR-006).
- AI sync moved to best-effort post-commit.
- Rollback tests prove audit/queue failure aborts the transition without
  emitting notifications.
- Duplicate accept rejected with 400; enquiry flips to `CONVERTED` on
  quotation creation.

## Performance Improvements

- **Route-level code splitting**: all 34 pages lazy-loaded
  (`React.lazy` + `Suspense`).
- **AI dock / AI workspace / search overlay** lazy-loaded on demand.
- **Vendor chunking**: react, react-query, charts (recharts), UI, motion
  (framer-motion) split into separate cacheable chunks.
- **Eager payload**: 1,216.6 kB (gzip 341.0) → **71.2 kB (gzip 23.1)** —
  ~94% raw / ~93% gzip reduction.
- **Removed 8 unused dependencies** (gsap, react-markdown, socket.io-client,
  date-fns, @headlessui/react, @heroicons/react, @react-three/xr,
  @xstate/react) and the regenerator-runtime polyfill (Vite targets esnext).
- **Context value memoization** in `AuthContext` and `AIWorkspaceContext`;
  `DataTable` and `Modal` memoized.
- React Query cache: `staleTime 5 min`, `retry 1`, no window-focus refetch.

## Test Improvements

- 512 unit/integration tests across 38 suites — all green.
- New: RFQ rollback tests, optimistic-lock concurrency test,
  `migration-0014.spec.ts` (structural up/down), audit `event_type`
  classification tests, `customer-import.service.spec.ts`.
- Regression specs relocated to `src/test/` so the default Jest config
  (`rootDir: src`) executes them.
- `commercial.e2e-spec.ts` rewritten as a 17-test full lifecycle
  (customer → enquiry → RFQ → submit/review → quotation pricing
  1,850,000/333,000/2,183,000 → send → accept → project → duplicate/
  concurrency/401/pagination).

## Known Limitations

- **E2E gate is environment-gated**: the rewritten e2e suite requires a seeded
  PostgreSQL instance (`npm run test:e2e`); not executable in a DB-less
  environment.
- **Lint is broken repo-wide (pre-existing)**: `npm run lint` uses a quoted
  glob (fails in PowerShell) and the repo has no ESLint config file. Not a
  v3.2.1 regression; tracked for Sprint 2.2.
- Visual/responsive/contrast verification requires a browser-based audit
  (not performed in this environment).
- Some third-party audit advisories remain (see `npm audit` output); none
  affect the certified runtime paths.

## Upgrade Notes

1. **Back up** `customers`, `leads`, `rfqs`, `workflow_instances`,
   `customer_types`, `customer_categories`, `customer_activities`.
2. **Deduplicate master data** before running migration 0014 (partial unique
   indexes on `code`/`lead_number`/`rfq_number` fail on existing duplicates).
3. Run `npm run migration:run` (or `npm run typeorm migration:run` per
   deployment script) — migrations 0011→0014 apply in order.
4. Rebuild and redeploy the frontend (`npm run build`); new chunk layout
   requires a clean `dist`.
5. No API-breaking changes: service facades preserved; DELETE now returns 204
   with no body (all frontend call sites ignore DELETE bodies — verified).
6. Rollback: `down()` on migration 0014 restores constraints/indexes and
   removes `version`; see Migration_0014_Guide.md for the full procedure.
