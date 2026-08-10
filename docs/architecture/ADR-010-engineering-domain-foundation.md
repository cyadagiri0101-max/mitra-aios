# ADR-010: Engineering Domain Foundation (Sprint 2.3.0)

## Status
Accepted

## Context
The engineering module already contained substantial working functionality
(drawings with check-in/out and revisions, multi-level BOMs with cost roll-up
and revision snapshots, routings, ECR/ECO/ECN change management, DB-driven
workflows, 56 seeded permissions, an AI hook registry), but the domain had no
formalized architecture, and downstream domains (manufacturing, quality)
referenced engineering artifacts only through `projectId` + string fields
(`drawing_revision`), breaking the Constitution's traceability-by-design
requirement below the Project node.

## Decision
Formalize the Engineering bounded context and set the architectural baseline
per `docs/engineering/` (9 documents), with these decisions:

1. **One bounded context, logical sub-domains.** Engineering remains a single
   context (`src/modules/engineering/**`, change management consolidated from
   `ecr-eco`); drawings, BOMs, process planning, materials, components,
   reviews, documents, changes, tooling are sub-domains — never parallel
   "engineering" modules.
2. **Project-centric reuse, not duplication.** `EngineeringProject` is NOT a
   new aggregate; engineering references the existing Project domain via
   `projectId` (Constitution principle 1).
3. **Traceability gaps closed with FK-style artifact links.** Sprint 2.3.1
   (migration 0018) adds `drawing_id`, `bom_id`, `bom_item_id`, `routing_id`,
   `process_plan_id` to `work_orders`, `trial_observations`,
   `inspection_reports`, `retrials`; a derived read model
   (`engineering_trace_edges`) is maintained from domain events (projection,
   never source of truth).
4. **Workflow-driven state remains canonical.** All status changes flow
   through the existing DB-driven workflow engine (ADR-001/006); no
   hardcoded state machines. Drawing/BOM/Change architecture documents treat
   the seeded graphs as canonical; graph changes are data migrations.
5. **AI stays optional and event-driven.** No inference in this sprint; the
   outbox (`domain_outbox`, 2.3.1) persists domain events transactionally and
   is the integration seam for all AI capabilities, which must require
   explicit human approval before touching engineering data.
6. **Duplicate consolidation, not rebuild.** Legacy/duplicate surfaces
   (design module, generic `ecr` CRUD, mold entity shells, folder-intelligence
   scan jobs, PMM external SQLite part lists) are frozen and consolidated on
   the roadmap (Gap register D1–D11), never re-implemented.
7. **API contracts codified before implementation.**
   `ENGINEERING_API_SPECIFICATION.md` (OpenAPI 3.0.3) is the contract baseline
   for Sprint 2.3.1+ endpoints.
8. **Testing strategy with raised bars.** Engineering + ecr-eco coverage
   ≥ 95%, e2e ≥ 90%, 100% of seeded workflow transitions tested
   (ENGINEERING_TEST_STRATEGY.md).

## Consequences
- The implementation roadmap for Sprint 2.3.1 is approved
  (ENGINEERING_ARCHITECTURE.md §9): migration 0018 traceability links, BOM
  effective dates, item-level substitutions, routing revisions,
  multi-reviewer engine, outbox relay, unit conversion, API + test delivery.
- Future mold families (Thin Wall, IBM, Mold Base, Fixtures) and standard/
  purchased components are data taxonomies, not architectural changes.
- Manufacturing, Quality, Service, Knowledge, and AI domains have explicit
  integration contracts (§5 ENGINEERING_ARCHITECTURE.md) to build upon.
- Two repo-level conventions were verified and preserved: permissions use
  OR (`some`) in workflow transition guards and AND (`every`) in
  `PermissionsGuard`; event delivery is post-commit and best-effort.
