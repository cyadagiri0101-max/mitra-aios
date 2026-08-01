# Sprint 2.1.1 — Security Report

**Audit basis:** MITRA backend audit (critical/major findings C-1…C-3, M-1…M-7).
**Status:** All critical and major findings remediated and regression-covered.

## Remediation evidence

### C-1 — RFQ/workflow state tampering
- `status` removed from commercial update DTOs (DTO hardening).
- State transitions only via guarded state-machine methods.
- Regression: `src/test/security-regression.spec.ts`, rfq rollback tests.

### C-2 — Unauthorized status mutation via generic updates
- Update DTOs for customer/lead/quote no longer accept `status`.
- Only workflow methods mutate status; enquiry flips to `CONVERTED` inside the
  quotation flow.

### C-3 — Unreliable audit logging
- Audit write moved into the same transaction as the domain change
  (ADR-001); notification included in the transaction; AI sync best-effort.
- Regression: rollback tests prove audit/queue failure aborts the transition
  without emitting notifications.

### M-1…M-7 — Data integrity
- M-1 detach fix (customer M-1 children no longer re-created on update).
- M-2/M-5 uniqueness via partial unique indexes (migration 0014).
- M-3 duplicate-accept guard → 400.
- M-4 atomic accept → project creation (`QuotationAcceptanceService`).
- M-6 FK `ON DELETE SET NULL` for leads/rfqs references.
- M-7 actor/tenant identity from JWT only (H-3); consistent audit fields.

### Defense in depth
- Optimistic locking on `workflow_instances` (version column + 409 filter) —
  ADR-004.
- Migration 0014 verifiable up/down via structural tests.

## Verification summary
| Check | Result |
|---|---|
| `npm test` (unit/integration) | 512 passed / 38 suites |
| `tsc --noEmit` (backend) | clean |
| `npm run build` (backend) | clean |
| `tsc && vite build` (frontend) | clean |
| E2E (`npm run test:e2e`) | 17-test commercial lifecycle — **requires seeded DB; not executed in this environment** |
| Lint | **pre-existing breakage** (quoted glob + missing ESLint config) — not sprint-caused |

## Residual risks / notes
1. **E2E gate outstanding.** The rewritten `commercial.e2e-spec.ts` must be run
   against a seeded PostgreSQL (admin `admin@mitra.local`) before the sprint is
   fully certified; this environment has no PostgreSQL.
2. **ESLint configuration** is absent repo-wide; recommended follow-up before
   Sprint 2.2.
3. **Deploy-time dedupe required** — partial unique indexes fail on existing
   duplicate master data; see `docs/guides/MIGRATION_0014_OPERATIONS_NOTES.md`.
