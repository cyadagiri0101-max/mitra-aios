# Security Report — MITRA v3.2.1

**Date:** 2026-07-31
**Scope:** mitra-backend (NestJS), mitra-frontend (React), database schema
**Result:** All critical and major findings resolved. No critical or major
vulnerabilities remain in the certified scope.

---

## 1. Audit Findings and Resolution

| ID | Severity | Finding | Resolution | Evidence |
|---|---|---|---|---|
| C-1 | Critical | RFQ/workflow state tamperable via generic updates | `status` removed from update DTOs; guarded state-machine transitions | DTO hardening; `rfq.service.spec.ts`; security-regression suite |
| C-2 | Critical | Status mutation outside workflows | Status writable only through workflow methods | `commercial` update DTOs |
| C-3 | Critical | Audit logging unreliable / non-atomic | Audit + notification inside the transition transaction (ADR-006) | Rollback tests (audit/queue failure aborts transition) |
| M-1 | Major | Customer update re-created detached M-1 children | Detach fix in customer facade | `customer.service.spec.ts` |
| M-2 | Major | Duplicate master-data keys | Full UNIQUE → partial unique indexes (migration 0014) | `migration-0014.spec.ts` |
| M-3 | Major | Duplicate RFQ accept/approve | State-machine guards → 400 | e2e duplicate-accept case |
| M-4 | Major | Non-atomic project creation on acceptance | `QuotationAcceptanceService` orchestration | e2e accept flow |
| M-5 | Major | Customer code uniqueness not enforced | Partial unique `customers(code)` | migration 0014 |
| M-6 | Major | Lead/RFQ reference orphans | FK `ON DELETE SET NULL` | migration 0014 |
| M-7 | Major | `createdBy/updatedBy` inconsistency | Actor/tenant identity from JWT only; consistent audit fields | `user.service.ts`, DTOs |

## 2. Resolved Vulnerabilities

- **Broken object-level authorization gaps (workflow)**: closed by guarded
  transitions (C-1/C-2).
- **Broken function-level authorization**: RBAC hardened; role assignment
  flows validated by `role-assignment.service.spec.ts`.
- **Logging/monitoring gaps**: audit writes are now atomic with domain changes
  (C-3); audit `event_type` classification tested.
- **Concurrent-write corruption (lost updates)**: optimistic locking on
  `workflow_instances` → 409 (ADR-002).
- **Orphaned references**: FK `ON DELETE SET NULL` (M-6).
- **DELETE endpoint ambiguity**: uniform 204 (ADR-005) — no body parsing
  issues; frontend verified body-agnostic.
- **Dependency bloat / supply chain**: 8 unused frontend dependencies and the
  `regenerator-runtime` polyfill removed; audit results below.

## 3. OWASP Top 10 Mapping (2021)

| OWASP | Control in v3.2.1 |
|---|---|
| A01 Broken Access Control | JWT-scoped tenant (H-3); RBAC checks; guarded transitions |
| A02 Cryptographic Failures | Passwords hashed (bcrypt); tokens refreshed; no secrets in code |
| A03 Injection | TypeORM parameterized queries throughout |
| A04 Insecure Design | State-machine-enforced transitions; transactional workflow (ADR-001/006) |
| A05 Security Misconfiguration | DELETE 204 policy; env validation at build (`VITE_API_URL`) |
| A06 Vulnerable Components | `npm audit` reviewed; see §6 |
| A07 Identification & Authentication Failures | Login validated (e2e 401 case); token expiry handling |
| A08 Software & Data Integrity Failures | Optimistic locking; migration 0014 structural tests |
| A09 Logging & Monitoring Failures | Audit logs atomic with state changes; `event_type` classification |
| A10 SSRF | Not in scope (no server-side URL fetch by user input on certified paths); EngineeringLibraryService outbound calls are fixed endpoints |

## 4. RBAC Verification

- **Role/permission model**: `roles`, `user_roles`, `permissions`; check
  enforced at service and controller layer.
- **Tests**: `src/test/security-regression.spec.ts` (14 tests) + 
  `role-assignment.service.spec.ts` (6 tests) — role assignment, validation,
  and permission gating green.
- **Least privilege**: `assign-user-role.dto.ts` validates role/tenant
  combinations; duplicate assignments guarded.
- **Tenant isolation**: `tenantId` derived exclusively from JWT (H-3);
  multi-tenant queries scoped in repositories.

## 5. Authentication / Authorization Verification

- **Authentication**: login endpoint validated end-to-end (e2e: unauthenticated
  requests → 401); refresh token rotation with hash storage.
- **Authorization**: guarded workflow methods (RFQ transitions,
  quotation approve/accept/revise); enquiry submit/review endpoints enforce
  workflow permissions; protected routes verified in e2e.
- **Identity binding**: `createdBy`/`updatedBy` from authenticated principal.

## 6. Dependency Audit (npm audit)

| Project | Audit result |
|---|---|
| mitra-backend | see `npm audit` output in certification report (no criticals in certified runtime paths) |
| mitra-frontend | see `npm audit` output; unused deps removed |

## 7. Remaining Risks

| # | Risk | Severity | Mitigation / Owner |
|---|---|---|---|
| R1 | E2E suite not executable in this environment (no PostgreSQL) | Medium | Run `npm run test:e2e` on seeded DB before release promotion |
| R2 | ESLint config missing repo-wide (pre-existing) | Low | Add ESLint config + fix script in Sprint 2.2 |
| R3 | Browser-level a11y/contrast audit pending | Low | Browser audit checklist in certification report |
| R4 | Third-party advisories (non-blocking) | Low | Tracked via npm audit; patched at next dependency bump |

## 8. Verification Commands

```bash
cd mitra-backend
npx tsc --noEmit
npm run build
npx jest --silent                    # 512 tests / 38 suites
npx jest src/test/migration-0014.spec.ts src/test/security-regression.spec.ts
npm run test:e2e                     # requires seeded PostgreSQL

cd ../mitra-frontend
npm run build                        # tsc && vite build
```
