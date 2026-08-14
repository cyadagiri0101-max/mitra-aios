# MITRA v4.1 — Wave 2 P2-CRITICAL Remediation Report

**Date:** 2026-08-13
**Scope:** 10 P2-CRITICAL tenant-isolation findings (cross-tenant read / write / mutation vectors)
**Baseline:** 92 suites / 1006 tests PASS (Wave 1 P1 completed)

---

## 1. Remedy applied to all 10 services (unified fail-closed pattern)

- `requireTenant()` guard invoked **before any data access**: missing tenant context → `403 ForbiddenException('Tenant context required for tenant-scoped operation')`.
- All lookups and mutations are **unconditionally tenant-scoped** (no `if (tenantId)` filter remains on tenant-owned data).
- Writes always persist the resolved caller tenant — no `tenantId ?? undefined` / `tenantId ?? null` can produce global (tenantId IS NULL) rows.
- Cross-tenant access → `404 NotFound` (no existence leak), and **no mutation occurs**.
- Raw SQL cross-module reads now carry `tenant_id = $2` predicates.
- Swallowed workflow-authorization errors removed: only the documented "workflow states not seeded yet" seeding-gap catch is retained (matches the already-remediated `engineering-bom.service.ts` Wave 1 pattern).
- Reference pattern: `src/common/services/tenant-aware.service.ts`, `engineering-bom.service.ts`.

## 2. Findings and remediation detail

| # | Service | Root cause | Remediation |
|---|---------|-----------|-------------|
| 1 | `engineering-traceability.service.ts` | `byProject()` raw SQL on `work_orders` / `trial_observations` had **no tenant predicate** (`.catch(() => [])` fail-open reads); `byEntity()` used conditional `tenantWhere` | `requireTenant` before any query; raw SQL now `tenant_id = $2` with `[projectId, scopeTenant]`; all repo lookups scoped |
| 2 | `engineering-workflow.service.ts` | `findEntity()` conditional tenant filter → unscoped `repo.save(entity)` on transition (cross-tenant mutation vector) | `requireTenant` in `findEntity`; transitions/snapshots operate on tenant-verified entities only |
| 3 | `engineering-change.service.ts` (ECR/ECO/ECN/Impacts) | `createECR` wrote `tenantId: actor.tenantId ?? undefined` (global rows); swallowed workflow-403 catch; conditional tenant filters on `findECRs/findECR/findECOs/findECO/findECNs/findECN/listImpacts/updateImpact/removeImpact`; `createECO/issueECN` same NULL-write | `requireTenant` on every entry; writes use resolved `scopeTenant`; filters unconditional; workflow creation uses `scopeTenant` |
| 4 | `engineering-drawing.service.ts` | `create` wrote `tenantId ?? undefined`; swallowed workflow catch; conditional `findAllAdvanced/findOne/listRevisions` | `requireTenant`; writes + workflow instance use `scopeTenant`; filters unconditional |
| 5 | `project/task.service.ts` | `create` NULL-tenant write; conditional filters across findByProject/findOne/update/remove/dependencies/comments/attachments/activity; `repo.update` and dependency writes unscoped | `requireTenant` throughout (incl. `assertNoCycle`, `assertCompletable`, `assertParentChangeAllowed`, `attachSubtasks/Dependencies`, `logActivity` typed `string`); dependency edges + orphan detach scoped |
| 6 | `project/team.service.ts` | `updateMember()` conditional member filter + **unscoped team-lead demotion** `memberRepo.update({ teamId })` and **unscoped team lookup** `teamRepo.findOne({ id: member.teamId })` for lead sync | `requireTenant` in `updateMember` (+ `removeMember` same family); demotion + lead-sync lookups scoped to caller tenant |
| 7 | `quality/quality-base.service.ts` (base for control-plan, customer-complaint, fmea, gauge, msa, ppap) | `findAll` conditional qb filter; `findOne` `tenantId: tenantId ?? undefined`; `create` NULL write; `update` unscoped `repo.update(id, …)` | `requireTenant` (protected); unconditional filters; `repo.update({ id, tenantId: scopeTenant }, …)` |
| 8 | `quality/ncr.service.ts` | `create` `tenantId: user.tenantId ?? undefined`; `findOne/update/transition` conditional; unscoped `ncrRepo.update(id, …)` | `requireTenant`; tenant-conditioned `update({ id, tenantId }, …)`; outbox rows use resolved tenant |
| 9 | `commercial/customer-contact.service.ts` | `assertCustomerExists` conditional; **unscoped** `customerRepo.update({ id: customerId }, …)` on primary-contact writes (4 sites); conditional contact writes; unscoped `clearPrimaryContact` and fallback-primary selection | `requireTenant`; `clearPrimaryContact` now takes resolved tenant; all customer/contact mutations + fallback reads scoped |
| 10 | `commercial/commercial-ai.service.ts` | `syncEntityContext` conditional `...(tenantId ? {tenantId} : {})` write; conditional reads `getContext/listByEntityType`; **`setEmbeddingPlaceholder`/`addKnowledgeRef` had NO tenant parameter** (unscoped writes) | `requireTenant`; tenant param added to the two writer methods (zero external callers — safe API change); unconditional scoping |

## 3. Test coverage added/updated

- **5 existing specs updated** (isolations + tenant-scoping assertions): `engineering-change.service.spec.ts`, `engineering-drawing.service.spec.ts`, `task.service.spec.ts`, `team.service.spec.ts`, `ncr.service.spec.ts`.
- **5 new spec files**: `engineering-traceability.service.spec.ts`, `engineering-workflow.service.spec.ts`, `quality-base.service.spec.ts`, `customer-contact.service.spec.ts`, `commercial-ai.service.spec.ts`.
- Coverage pattern per service: tenantless → 403 (no repo access); Tenant A + Tenant B id → 404 + **B record never mutated**; Tenant A + Tenant A id → succeeds; writes persist caller tenant; mutations carry tenant criteria; raw SQL contains tenant predicate.
- No tests assert SQL strings only — all queries are behavioral.

## 4. Verification results

| Gate | Result |
|------|--------|
| `npx tsc --noEmit -p tsconfig.json` | **PASS** (clean) |
| Targeted jest (10 Wave 2 suites) | **118/118 PASS** |
| Full `npx jest --silent` | **97 suites / 1068 tests PASS** (baseline 92/1006 → +5 suites / +62 tests) |
| `npm run build` | **PASS** |
| `git diff --check` | **CLEAN** |

## 5. Out of scope (per plan)

- P2-HIGH (11) and P2-MEDIUM (6) findings — not touched in this wave.
- No commits made; certification document not modified; release readiness not declared.

---

**STATUS: WAVE 2 P2-CRITICAL REMEDIATION COMPLETE — AWAITING P2-HIGH REVIEW.**
