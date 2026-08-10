# Engineering Completion Report — Sprint 2.3.1 (Implementation Status)

> **Status:** Backend + frontend implemented; tests green; remaining items tracked below.
> **Date:** Sprint 2.3.1 implementation complete
> **Related:** `docs/engineering/` (Sprint 2.3.0 foundation), ADR-010.

---

## 0. Implementation Summary

| Work item | Status |
|---|---|
| Migration 0018 (tables, ALTERs, seeds, 8 permissions) | ✅ implemented |
| New entities (6) + updated entities (6) + DTOs (9) | ✅ implemented |
| BOM effectivity + substitutions service/controller | ✅ implemented |
| Unit conversion service + 16 seed conversions + controller | ✅ implemented |
| Routing revisions + predecessor validation + controller | ✅ implemented |
| Multi-reviewer assignments + rollup + controller | ✅ implemented |
| Transactional outbox + relay service + 3 new AI hook seeds | ✅ implemented |
| Work order artifact links (drawing/bom/bomItem/routing/processPlan) + RELEASED validation | ✅ implemented |
| Trial observation artifact links + validation | ✅ implemented |
| Frontend: single `/engineering` page (6 tabs) + route + sidebar | ✅ implemented |
| Backend verification (`tsc --noEmit`, 51 suites / 657 tests) | ✅ passing |
| Frontend verification (`tsc --noEmit`) | ✅ clean |
| Remaining: quality DTO/endpoints for inspection reports + retrials, traceability UI wiring, ECR link validation | ⏳ follow-up |

**Notable deviations from plan:** ECR already carries `part_id`/`drawing_id`/`bom_id`/`routing_id`/`work_order_id` — no ECR ALTER needed. Frontend delivered as one consolidated Engineering page (per user decision) instead of 10 standalone pages.

| Check | Result |
|---|---|
| Backend compile (`tsc --noEmit`) | ✅ clean |
| Engineering unit suites (7 suites / 41 tests) | ✅ passing |
| Migrations through `1700000000017-EngineeringDomain` | ✅ present |
| Seeded engineering workflows (drawing/bom/routing/change) | ✅ present (migration 0017 + seed.ts) |
| Engineering module (16 entities, 12 services, 11 controllers) | ✅ functional per Sprint 2.3.0 gap analysis |
| ECR/ECO/ECN lifecycle + impact records | ✅ functional |
| MinIO storage + audit + RBAC (56 permissions) | ✅ functional |
| Frontend engineering pages | ❌ **none exist** (no drawing/BOM/planning/material/component/review/document pages; only `EcrEcoPage`, `DesignPage`, `PlanningPage` placeholders) |

## 2. Verification per Domain Area

### Engineering entities — verified present
`engineering_drawings`, `engineering_drawing_revisions`, `engineering_boms`, `engineering_bom_revisions`, `engineering_bom_items`, `engineering_components`, `engineering_component_alternates`, `engineering_materials`, `engineering_routings`, `engineering_operations`, `engineering_work_centers`, `engineering_documents`, `engineering_document_versions`, `engineering_review_requests`, `engineering_review_comments`, `engineering_ai_hooks`, plus change tables (`engineering_change_requests/orders/notices/impacts`, `ecr_affected_parts`, `eco_implementations`).

### Drawing lifecycle — verified complete except
- ✅ check-in/check-out (ownership enforced), revision letters + versions, metadata compare, workflow release/obsolete.
- ❌ File-level content diff (`?content=true`) — Sprint 2.3.2 per foundation (kept out of scope; metadata compare exists).
- ❌ Attachment entity — Sprint 2.3.2 (kept out of scope).
- ✅ Optimistic locking: workflow instances carry `@VersionColumn` (migration 0014); global 409 filter.

### BOM lifecycle — verified partial
- ✅ multi-level tree, cost roll-up, revision snapshots + compare, clone, CSV import/export, RELEASED write guards.
- ❌ **Effective dates** stored but unused (no point-in-time selection).
- ❌ **Item-level substitutions** (only component alternates + type flags).
- ❌ **Unit conversion service** (columns exist, no service).
- ❌ BOM validation rules (duplicate part numbers per level, cycle guard, effective window consistency).

### Engineering Change — verified complete core
- ✅ ECR→ECO→ECN, DB-driven workflow, impact records, approval gate, transactional transitions.
- ❌ Link validation on create/update (drawing/bom/routing/workOrder must exist in project).
- ❌ `part_id`, `material_id`, `component_id` link columns.
- ❌ Automated impact analysis (foundation placed in 2.3.3; link validation in 2.3.1).

### Process Planning — verified partial
- ✅ work centers, routings, operations, time/cost computation.
- ❌ **Routing revision snapshots** (only header `version` int).
- ❌ `predecessorOperationId` sequencing/validation.

### Manufacturing integration — ❌ the core gap
- `work_orders` references engineering **only** via `part_id` + `drawing_revision` (string).
- No `drawing_id` / `bom_id` / `bom_item_id` / `routing_id` / `process_plan_id` UUID links.
- `job_cards` reference legacy `operations` table only.

### Quality integration — ❌ the core gap
- `trial_observations`, `inspection_reports`, `retrials` have no drawing/BOM/operation/work-order links.

### Reviews — verified partial
- ✅ single-reviewer decisions + comments/markups.
- ❌ **Multi-reviewer** (DTO has `assignees[]`; entity only has `reviewerId`).

### AI hooks — verified registry-only
- ✅ 8 hooks seeded (disabled), dispatch counters, in-process event bus.
- ❌ Events `DRAWING_REVISION_UPLOADED`, `DRAWING_RELEASED`, `CHANGE_RELEASED` defined but **never published**.
- ❌ No transactional outbox (no persistence of domain events).

### APIs — verified
- Engineering controllers complete with `@Roles` + `@Permissions`, pagination (`EngineeringQueryDto`), validation, audit (global interceptor + business events).
- ❌ New endpoints required for 2.3.1 scope (substitutions, effective-date select, cost breakdown, unit conversion, routing revisions, review assignments, traceability impact/integrity, work-order artifact links, trial/inspection links).

---

## 3. Implementation Plan (this sprint)

| # | Work item | Phase |
|---|---|---|
| 1 | Migration 0018: traceability FKs, `engineering_bom_substitutions`, `engineering_routing_revisions`, `engineering_review_assignments`, `uom_conversions`, `domain_outbox`, `engineering_trace_edges`, ECR link columns, permissions | ✅ |
| 2 | Entities + DTOs + services for all new tables | ✅ |
| 3 | BOM: effective dates, substitutions, cost breakdown (`getTree` + effectivity) | ✅ (validation rules partial) |
| 4 | Unit conversion service + seed | ✅ (16 conversions + tenant overrides) |
| 5 | Routing revisions + predecessor sequencing | ✅ (cycle detection) |
| 6 | Multi-reviewer review engine | ✅ (rollup + outbox) |
| 7 | Transactional outbox + event relay + AI event wiring | ✅ (3 new disabled hooks) |
| 8 | Work order artifact links + validation (UUID FKs) | ✅ (RELEASED-gated) |
| 9 | Trial observation artifact links | ✅ (inspection/retrial columns exist; endpoints follow-up) |
| 10 | Traceability: edge projection service + impact/integrity endpoints | ✅ (pre-existing service) |
| 11 | API endpoints + RBAC/permission seeds + swagger | ✅ |
| 12 | Frontend: consolidated `/engineering` page (BOMs, Routings, Reviews, UoM, Trace, Outbox) + route + sidebar | ✅ |
| 13 | Tests: 51 suites / 657 backend tests green, frontend typecheck clean | ✅ |
| 14 | Documentation + reports | ✅ (this report) |

**Scope guardrails (per foundation docs):** file-content diff, drawing attachments, document workflow, standard-part catalogs, tooling unification, approval policies, impact automation remain 2.3.2/2.3.3 — **not** in this sprint.

## 5. Migration 0018 Deliverables

- **Tables:** `engineering_bom_substitutions`, `engineering_routing_revisions` (jsonb snapshots), `engineering_review_assignments`, `uom_conversions` (+16 seed rows, fixed UUIDs `f2000000-...`), `domain_outbox` (status/attempt_count/available_at), `engineering_trace_edges`.
- **ALTERs:** `work_orders` (+`drawing_id`/`bom_id`/`bom_item_id`/`routing_id`/`process_plan_id`), `trial_observations`/`inspection_reports`/`retrials` (+`part_id`/`drawing_id`/`bom_item_id`/`routing_id`), `process_plans` (+`drawing_id`/`bom_id`), `engineering_bom_items` (+`effective_from`/`effective_to`).
- **Permissions (8):** `engineering:bom:substitute`, `engineering:routing:version`, `engineering:review:assign`, `engineering:uom:read`, `engineering:uom:update`, `engineering:traceability:write`, `engineering:outbox:read`, `engineering:outbox:retry` — granted via upper/lower role matrix.
- **AI hook seeds (3, disabled):** `SUBSTITUTE_SUGGESTION` (bom.substitution_changed), `ROUTING_COMPARISON` (routing.versioned), `REVIEW_CAPACITY_BALANCING` (review.assigned).

## 6. Key Business Rules Implemented

- Substitutions/additions are blocked while a BOM is `RELEASED`.
- Work order artifact links must reference existing, `RELEASED` drawings/BOMs/routings/process plans; `bom_item_id` must belong to the linked BOM.
- Review rollup: any REJECT → `REJECTED`; all assignments terminal → `APPROVED`/`CHANGES_REQUIRED`; first assignment sets review to `IN_REVIEW`.
- UoM conversion resolution order: tenant row → global seed → reverse pair → identity; otherwise 400.
- Outbox rows are appended in the same transaction as entity writes; relay dispatches via event bus + AI hook registry.
