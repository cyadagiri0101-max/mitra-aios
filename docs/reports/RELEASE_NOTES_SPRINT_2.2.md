# Sprint 2.2 — Release Notes

**Component:** MITRA Backend (NestJS) + MITRA Frontend (React/Vite)
**Theme:** Project Management Domain (ADR-009) — milestones, tasks, teams, risks, documents, timeline, workflow-driven lifecycle

## What shipped

### Project Management Domain (backend)

- **Migration `1700000000015-ProjectManagementDomain.ts`** — 10 new tables
  (`project_teams`, `project_team_members`, `project_milestones`,
  `project_tasks`, `project_task_dependencies`, `project_task_activity`,
  `project_risks`, `project_documents`, `project_document_versions`,
  `project_activity_log`) plus `projects` extensions (planned/target dates,
  health, budget, priority, risk level, business unit, manager). Seeds the
  `project_management` workflow (9 states / 8 transitions, fixed UUIDs), the
  DEFAULT_MOLD milestone template (10 items), and 8 departments.
- **`ProjectFactoryService`** — single transactional creation entry point:
  project number `PRJ-{year}-{NNNN}` with `23505` retry, DEFAULT_MOLD
  milestone instantiation (save-then-wire dependencies so
  `dependsOnMilestoneId` is always set), default folder structure, workflow
  instance creation, post-commit domain events. `QuotationAcceptanceService`
  now delegates to it.
- **`ProjectWorkflowService`** — DB-driven lifecycle
  `DRAFT → KICKOFF → DESIGN → PLANNING → EXECUTION → MONITORING → CLOSING →
  COMPLETED → ARCHIVED`; stage/status synced from the workflow row; guarded
  transitions; lazy instance init for legacy projects.
- **Services with permission-gated controllers:** Milestone (template
  instantiation, complete/approve flow, delay tracking, blocking), Task
  (status machine, cycle-safe dependencies, DONE blocked by open
  dependencies, comments/attachments), Team (members, capacity, availability
  `AVAILABLE/OVERLOADED`, departments), Risk (likelihood × impact →
  exposure 1–25, dashboard aggregation, close/reopen), Document (folders,
  immutable released versions with checksums, release/archive), Timeline
  (CPM via forward/backward pass, critical path), Activity feed, AI
  projections (`risk-prediction` / `delay-prediction` returning uniform
  `NOT_CONFIGURED | OK` envelopes).
- **`ProjectService.findAllAdvanced`** — pagination, ILIKE search
  (name/project number/customer/product), structured filters (status, type,
  risk level, priority, customer, business unit, stage), whitelisted sorts.
- **`seed.ts`** — PM permission set + role matrix (MANAGEMENT full,
  SALES/DESIGN/PLANNING/PRODUCTION/QUALITY working subsets, CUSTOMER
  read-only), `project_management` workflow, DEFAULT_MOLD template,
  departments. All upserts keyed by `(stateCode, workflowType)` / `code`.

### Frontend

- **`src/utils/projectApi.ts`** — typed API layer for the whole domain.
- **8 new pages** routed under `/projects/:id/*` (lazy-loaded):
  details hub with workflow transition selector and activity feed;
  milestones (progress, complete/approve/delete, delay flags); tasks
  (CRUD, status, dependency link/unlink); kanban board; timeline Gantt with
  critical-path highlight; teams + capacity/availability; risk register +
  dashboard cards + AI prediction envelopes; documents (folder filters,
  release → immutable version, archive, version history).
- Projects list page unchanged (`/projects`), detail navigation added.

## Verification

- **Unit/integration:** 601 tests across 48 suites — all green. New project
  module suites (13): factory (10), workflow (8), milestone, task, team,
  risk, document, timeline, activity + AI projection, domain event bus —
  112 project tests total.
- **TypeScript:** `tsc --noEmit` clean (backend and frontend).
- **Frontend build:** `vite build` clean; all new pages emitted as lazy
  chunks (details page ~12 kB gzip 2.9 kB).
- Real defect caught by tests and fixed: milestone `dependsOnMilestoneId`
  was undefined because dependency wiring ran before entity save — factory
  now saves first, wires dependencies by `sequenceNumber`, re-saves.

## Deployment notes

1. Run migration **1700000000015** (`npm run migration:run`) — creates PM
   tables and seeds workflow/template/departments. `seed.ts` is safe to run
   afterwards (idempotent on the same keys).
2. Rebuild frontend (`npm run build`) — new lazy chunks require a clean dist.
3. API is additive: no existing endpoints removed or renamed; generic project
   PATCH no longer accepts `stage`/`status` (workflow-only) — clients must use
   the workflow transition endpoint.
4. AI endpoints return `NOT_CONFIGURED` envelopes until a provider is wired
   into `AiProjectionService` — no configuration required for this release.

## Known limitations

- `npm run lint` remains broken at repo level (pre-existing): quoted glob
  fails in PowerShell and no ESLint config file exists.
- `npm run test:cov` cannot collect coverage repo-wide (pre-existing):
  `test-exclude` fails with `ERR_INVALID_ARG_TYPE` on
  `src/modules/cache/redis.service.ts`; global coverage threshold (50%) is
  configured but not verifiable via the collector.
