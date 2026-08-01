# ADR-009: Project Management Domain (Sprint 2.2)

## Status
Accepted

## Context
The project module previously only carried a coarse `stage` field mutated by
generic updates, with no execution structure: no milestones, tasks, teams,
risks, documents, or project-level activity. Project creation was duplicated
between the project controller and `QuotationAcceptanceService`, and there was
no DB-driven workflow backing project lifecycle.

## Decision
Introduce a complete Project Management domain in `mitra-backend`, governed by
the following architecture decisions:

1. **DB-driven workflow lifecycle.** A `project_management` workflow (states
   `DRAFT → KICKOFF → DESIGN → PLANNING → EXECUTION → MONITORING → CLOSING →
   COMPLETED → ARCHIVED`) is seeded and driven entirely by the existing
   workflow engine (ADR-001/006): `ProjectWorkflowService` creates the
   instance at project creation, executes guarded transitions, syncs the
   project `stage`/`status` columns, records history, and audits each change.
   The workflow row is the single source of truth; generic PATCH routes no
   longer mutate `stage`.
2. **Factory-based creation.** `ProjectFactoryService.createFromQuotation` is
   the only entry point that builds a project: one `DataSource.transaction`
   creates the project (number `PRJ-{year}-{NNNN}` with `23505` retry), the
   DEFAULT_MOLD milestone template (10 items), the default folder structure,
   and the workflow instance; domain events are published post-commit.
   `QuotationAcceptanceService` now delegates to the factory instead of
   duplicating project creation.
3. **Single-schema domain with explicit entities.** Migration
   `1700000000015-ProjectManagementDomain.ts` adds `projects_teams`,
   `project_team_members`, `project_milestones`, `project_tasks`,
   `project_task_dependencies`, `project_task_activity`,
   `project_risks`, `project_documents`, `project_document_versions`,
   `project_activity_log` and extends `projects` (target dates, health, budget,
   priority, risk level, business unit). All tables use VARCHAR for enum-like
   fields (no native enums) and inherit `IndustrialBaseEntity` tenant
   isolation (cross-tenant reads → 404).
4. **Leaf services + facades.** `ProjectService` orchestrates; leaf services
   (`MilestoneService`, `TaskService`, `TeamService`, `RiskService`,
   `ProjectDocumentService`, `TimelineService`, `ProjectActivityService`,
   `AiProjectionService`) own single responsibilities. `ProjectModule` imports
   `WorkflowModule` and `AuditModule` (both verified to export their services +
   `TypeOrmModule`) — no circular `forwardRef`.
5. **Permission-gated routes.** New permissions
   `project:milestone:*`, `project:task:*`, `project:team:*`,
   `project:risk:*`, `project:document:*`, `project:activity:read`,
   `project:timeline:read` are seeded with a per-role matrix (MANAGEMENT full;
   SALES/DESIGN/PLANNING/PRODUCTION/QUALITY working subsets; CUSTOMER
   read-only). Controllers enforce `@Roles` + `@Permissions` on every route.
6. **Dependency-safe task completion.** `TaskService` computes the critical
   path (forward/backward pass) for the timeline, blocks moving a task to
   `DONE` while open dependencies exist, and provides cycle-safe
   add/remove-dependency endpoints (`POST/DELETE .../tasks/:id/dependencies`).
7. **AI hooks as structured envelopes.** `AiProjectionService` exposes
   `risk-prediction` / `delay-prediction` endpoints that return a uniform
   envelope (`status: NOT_CONFIGURED | OK`, `message`, `data`) so the frontend
   degrades gracefully when no provider is configured. Configured providers
   are delegated by type; partial capability falls back to available hooks.

## Consequences
- Project lifecycle transitions are tamper-proof (same enforcement as
  C-1/C-2 remediation): only workflow transitions move `stage`/`status`.
- Milestone/task/team/risk/document data is tenant-scoped and audited
  (`project_activity_log` for every business event).
- The `seed.ts` runtime seed and migration 0015 both provision the
  `project_management` workflow and DEFAULT_MOLD template; seed upserts by
  `(stateCode, workflowType)` / template `code`, so the migration's fixed-UUID
  rows always win.
- 112 new unit tests across 13 project suites; full repo suite 601 passing
  (48 suites), `tsc --noEmit` clean.
- Frontend consumes the domain via `mitra-frontend/src/utils/projectApi.ts`
  and 8 new pages routed under `/projects/:id/*`.
