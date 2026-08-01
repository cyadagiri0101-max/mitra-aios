# Sprint 2.1.1 — Release Notes

**Component:** MITRA Backend (NestJS) + MITRA Frontend (React/Vite)
**Theme:** Audit remediation — integrity, transactional consistency, verification

## What shipped

### Critical / Major audit findings remediated

| ID | Finding | Remediation |
|---|---|---|
| C-1 | RFQ/workflow state tamperable via generic updates | Guarded state-machine transitions; `status` removed from update DTOs; transitions are transactional |
| C-2 | Customer/lead/quote status mutated outside workflows | Status no longer accepted by generic update DTOs; only workflow methods change status |
| C-3 | Audit logging unreliable / non-atomic | Audit + workflow + notification inside a single DB transaction; AI sync best-effort post-commit |
| M-1 | Customer update re-created detached M-1 children (contacts/addresses) | Detach fix in customer facade (`entity.contacts = []` etc. before re-save) |
| M-2 | Duplicate customer names possible | Partial unique index on `customers(code)` (migration 0014) |
| M-3 | Duplicate RFQ accept/approve | State-machine guards; duplicate accept → 400 |
| M-4 | Non-atomic project creation on quotation acceptance | `QuotationAcceptanceService` orchestrates accept → project create → link |
| M-5 | Customer code uniqueness not enforced | Full UNIQUE replaced by partial unique `customers(code)` via migration 0014 |
| M-6 | Lead contact/owner/converted_customer orphan risk | FKs `ON DELETE SET NULL` |
| M-7 | `createdBy/updatedBy` inconsistency | Tenant/actor identity always taken from JWT (H-3); audit fields set in services |

### Structural improvements
- **Service decomposition (ADR-002):** 10 leaf services for customer and
  quotation domains; `customer.service.ts` / `quotation.service.ts` are now
  thin facades; `forwardRef` removed entirely.
- **Optimistic locking (ADR-004):** `workflow_instances.version` + global
  409 filter for version-mismatch conflicts.
- **DELETE → 204 (ADR-003):** all 35 DELETE endpoints now return 204 No
  Content, uniform with REST semantics.
- **Frontend performance:** route-level `React.lazy` code-splitting for all 34
  pages; AI dock/workspace (three.js robot, speech recognition) loaded on
  demand. Eager bundle reduced **1,216 kB → 216 kB** (gzip 341 kB → 70 kB);
  robot canvas becomes a separate 957 kB lazy chunk.

### Verification
- **Unit/integration:** 512 tests across 38 suites — all green (`npm test`),
  including new rollback tests (audit/queue failure aborts RFQ transition),
  optimistic-lock concurrency test, migration-0014 structural test, audit
  `event_type` classification tests, and the security regression suite
  (`src/test/security-regression.spec.ts`).
- **TypeScript:** `tsc --noEmit` clean; `npm run build` clean (backend).
- **Frontend:** `tsc && vite build` clean.
- **E2E:** `test/commercial.e2e-spec.ts` rewritten as a 17-test full lifecycle
  (customer → enquiry → RFQ → submit/review → quotation pricing
  `1,850,000 / 333,000 / 2,183,000` → send → accept → project → duplicate/
  concurrency/401/pagination checks). **Requires a seeded PostgreSQL
  environment** — run `npm run test:e2e` on a DB-enabled host.

## Deployment notes
1. Run migration **1700000000014** (`npm run migration:run`) — see
   `docs/guides/MIGRATION_0014_OPERATIONS_NOTES.md` (dedupe master data first).
2. Rebuild frontend (`npm run build`) — new lazy chunks require a clean dist.
3. No API-breaking changes: facades preserved; 204 deletes carry no body (all
   frontend DELETE call sites already ignore response bodies).

## Known limitations
- `npm run lint` remains broken at repo level (pre-existing): quoted glob fails
  in PowerShell and no ESLint config file exists — not a Sprint 2.1.1
  regression.
- E2E suite is environment-gated (needs PostgreSQL + seed admin
  `admin@mitra.local`).
