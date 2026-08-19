# M1 Sprint 1 — Implementation Plan (Employee/Skill/Resource Master + Engineering Decision Log)

**Baseline:** `71780dc0` (branch `v3.3`, tag `v4.2.0`)
**Goal:** Foundational data + governance layer for MITRA Vision-100: employee/skill/resource master,
availability foundation, engineering decision log, with tenant isolation, RBAC, audit traceability,
tests, and real frontend integration. No capacity engine, no design-load engine, no predictive AI.

---

## 1. Existing architecture discovered

- **Backend:** NestJS modular monolith. One module per bounded context under `mitra-backend/src/modules/`
  (37 modules). Entities extend `IndustrialBaseEntity` (`id`, `created_at`, `updated_at`, `deleted_at`,
  `created_by`, `updated_by`, `tenant_id`). Global guards: `ThrottlerGuard`, `JwtAuthGuard`,
  `RolesGuard`, `PermissionsGuard`; global `AuditInterceptor`; `RequestContextInterceptor`.
- **Tenant isolation:** `TenantAwareService` (fail-closed `requireTenant`, cross-tenant read = 404,
  missing tenant = 403). Used by `ToolMasterService`, `EngineeringChangeRequestService`, etc.
- **RBAC:** `@Permissions('resource:action')` decorator + global `PermissionsGuard`. Permissions
  seeded as `(resource, action)` rows; role→permission mappings in `role_permissions`. Two role
  systems: legacy lowercase (migration 0010) and live uppercase `ADMIN/MANAGEMENT/SALES/DESIGN/
  PLANNING/PRODUCTION/QUALITY/SERVICE/CUSTOMER` (runtime `seed.ts`). `seed.ts` reconciles ADMIN
  against every permission in DB.
- **Audit:** `AuditService.log()` / `logBusinessEvent()` writes to `audit_logs`. **Finding A5:**
  `audit_logs` has **no `project_id` column** (Phase-0 finding; TRACEABILITY_MODEL mandates it).
- **Workflow:** DB-driven `WorkflowService` (states/transitions) used by project/ECR/RFQ. Simpler
  lifecycle modules (sales order, invoice, credit note) enforce transitions in-service with
  permission-gated endpoints — the decision log follows that lighter convention.
- **Outbox:** `OutboxService` (transactional outbox, `domain_outbox`) exported by `PlatformModule`.
- **Migrations:** `src/database/migrations/`, TypeORM class migrations, latest `1700000000034`.
  Next numbers: **0035, 0036, 0037**. DB `mitra_v2` @ localhost (32 migrations applied).
- **Frontend:** React + Vite + React Query v5 + Zustand + Tailwind + shadcn-style components.
  Pages call the real API via `utils/api.ts` axios instance; routes in `App.tsx` (lazy),
  navigation in `components/Sidebar.tsx`.
- **Tests:** Jest unit specs (mocked repos) in module dirs; e2e via `test/*.e2e-spec.ts` +
  `createTestApp()` against `mitra_v2_test` DB (`test/jest.e2e.setup.ts`).

## 2. Relevant modules

| Module | Role for this sprint |
|---|---|
| `platform` | `OutboxService` (domain events), permissions entities |
| `audit` | `AuditService` — extend with `projectId` |
| `project` | `projects` lookup for decision project-scoping; `ProjectResource`/`ProjectTeamMember` remain project-team data (not employee master) |
| `tool-master` | Reference pattern for a master-data module (TenantAwareService, controller conventions) |
| `ecr-eco` | Reference for governance lifecycle + audit + number generation (`generateNumber`, 23505 retry) |
| `supplier` / `product` | Status-enum + seed conventions |

## 3. Entities to reuse

- `IndustrialBaseEntity` (base), `AuditLog` (extend with `project_id`), `DomainOutboxMessage`
  (via `OutboxService`), `Permission`/`RolePermission` (seeding), `WorkflowService` (not used for
  decisions — lighter in-service lifecycle, consistent with salesOrder/invoice/creditNote).

## 4. Entities to add

All extend `IndustrialBaseEntity`. Status columns use `enum` TypeORM columns with DB CHECK
constraints (existing convention, see migration 0034).

| Entity | Table | Key fields | Constraints / indexes |
|---|---|---|---|
| `Employee` | `employees` | `employeeCode`, `firstName`, `lastName`, `email`, `phone`, `department`, `designation`, `status` (ACTIVE/INACTIVE), `userId` (nullable link to platform user) | UNIQUE (`employee_code`,`tenant_id`) WHERE deleted_at IS NULL; idx (`tenant_id`,`deleted_at`), (`status`) |
| `Skill` | `skills` | `code`, `name`, `description`, `category`, `status` (ACTIVE/INACTIVE) | UNIQUE (`code`,`tenant_id`) WHERE deleted_at IS NULL; idx (`tenant_id`,`deleted_at`) |
| `EmployeeSkill` | `employee_skills` | `employeeId`, `skillId`, `proficiencyLevel` (BEGINNER/INTERMEDIATE/ADVANCED/EXPERT), `certification`, `effectiveDate`, `expiresAt`, `status` (ACTIVE/INACTIVE), `notes` | UNIQUE (`employee_id`,`skill_id`,`tenant_id`) WHERE deleted_at IS NULL; idx (`skill_id`,`tenant_id`) (reverse lookup "who has skill X") |
| `ResourceAvailability` | `resource_availability` | `employeeId`, `workDate`, `availabilityType` (AVAILABLE/PLANNED/UNAVAILABLE), `availableHours` (numeric 5,2), `notes` | UNIQUE (`employee_id`,`work_date`,`tenant_id`) WHERE deleted_at IS NULL; idx (`employee_id`,`work_date`) |
| `EngineeringDecision` | `engineering_decisions` | `decisionNumber` (DEC-{yyyy}-{NNNN}), `projectId` (nullable column; required by DTO when project scope applies), `title`, `decisionType` enum, `description`, `context`, `optionsConsidered`, `selectedOption`, `rationale`, `decision`, `status` (DRAFT/SUBMITTED/APPROVED/REJECTED/SUPERSEDED/CANCELLED), `decisionDate`, `decisionOwnerId`, `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`, `relatedEntityType`, `relatedEntityId`, `supersedesDecisionId`, `supersededByDecisionId` | UNIQUE (`decision_number`,`tenant_id`); idx (`project_id`,`status`), (`status`,`decision_date`), (`tenant_id`,`deleted_at`) |
| `AuditLog` (extend) | `audit_logs` | `projectId` (new nullable column, A5 fix) | idx (`project_id`,`created_at`) |

## 5. Migrations required

| # | Name | Contents |
|---|---|---|
| `1700000000035` | `M1PeopleMaster` | employees, skills, employee_skills, resource_availability tables + indexes + CHECK constraints + seed employee/skill/employee_skill/availability permissions (both role systems) |
| `1700000000036` | `M1EngineeringDecisions` | engineering_decisions table + indexes + CHECK + seed engineering_decision permissions |
| `1700000000037` | `AuditProjectId` | `ALTER TABLE audit_logs ADD COLUMN project_id UUID` + index (A5 fix; additive) |

All additive. `down()` drops only the new objects. No modification of existing migrations.

## 6. APIs required (all with `@Permissions`, all tenant-scoped)

| Method | Route | Permission | Notes |
|---|---|---|---|
| GET | `/employees` | `employee:read` | pagination, search, `?skill=` filter |
| GET | `/employees/:id` | `employee:read` | |
| POST | `/employees` | `employee:create` | |
| PATCH | `/employees/:id` | `employee:update` | deactivate via status→INACTIVE (audit `employee.deactivated`) |
| DELETE | `/employees/:id` | `employee:delete` | soft delete (204) |
| GET | `/employees/:id/skills` | `employee_skill:read` | employee skill matrix |
| POST | `/employees/:id/skills` | `employee_skill:assign` | |
| PATCH | `/employees/:id/skills/:skillId` | `employee_skill:update` | |
| DELETE | `/employees/:id/skills/:skillId` | `employee_skill:remove` | soft delete (204) |
| GET | `/employees/:id/availability` | `availability:read` | `?from=&to=` range |
| POST | `/employees/:id/availability` | `availability:create` | |
| PATCH | `/availability/:id` | `availability:update` | |
| DELETE | `/availability/:id` | `availability:delete` | soft delete (204) |
| GET | `/skills` | `skill:read` | pagination, search, `?category=` |
| GET | `/skills/:id` | `skill:read` | |
| POST | `/skills` | `skill:create` | |
| PATCH | `/skills/:id` | `skill:update` | |
| DELETE | `/skills/:id` | `skill:delete` | soft delete (204) |
| GET | `/skills/:id/employees` | `employee_skill:read` | "who has this skill" |
| GET | `/projects/:projectId/decisions` | `engineering_decision:read` | filters: status, type, page/limit |
| POST | `/projects/:projectId/decisions` | `engineering_decision:create` | |
| GET | `/engineering-decisions/:id` | `engineering_decision:read` | |
| PATCH | `/engineering-decisions/:id` | `engineering_decision:update` | DRAFT/SUBMITTED only |
| POST | `/engineering-decisions/:id/submit` | `engineering_decision:submit` | DRAFT→SUBMITTED |
| POST | `/engineering-decisions/:id/approve` | `engineering_decision:approve` | SUBMITTED→APPROVED |
| POST | `/engineering-decisions/:id/reject` | `engineering_decision:reject` | SUBMITTED→REJECTED |
| POST | `/engineering-decisions/:id/supersede` | `engineering_decision:supersede` | APPROVED→SUPERSEDED; creates successor in one transaction |
| POST | `/engineering-decisions/:id/cancel` | `engineering_decision:cancel` | DRAFT/SUBMITTED→CANCELLED |

DTOs: class-validator, whitelist `ValidationPipe` already global (forbidNonWhitelisted=true).

## 7. Permissions required (resource, action) — seeded in migrations + seed.ts matrix

- `employee`: read, create, update, delete
- `skill`: read, create, update, delete
- `employee_skill`: read, assign, update, remove
- `availability`: read, create, update, delete
- `engineering_decision`: read, create, update, submit, approve, reject, supersede, cancel

Role grants: ADMIN (all — seed reconciliation), MANAGEMENT (all), PLANNING (all employee/skill/
availability + decision create/submit), DESIGN (read + decision create/update/submit), PRODUCTION
(read + availability read), QUALITY (read), SALES (read of employee/skill + decision read), legacy
lowercase roles via migration (admin=all, manager=all, engineer=read+decision submit, viewer=read).

## 8. Audit events required (all via existing `AuditService`, with `projectId` where scoped)

`employee.created|updated|deactivated` · `skill.created|updated|deleted` ·
`employee_skill.assigned|updated|removed` · `availability.created|updated|deleted` ·
`engineering_decision.created|updated|submitted|approved|rejected|superseded|cancelled`

## 9. Frontend surfaces required

| Page | Route | Capability |
|---|---|---|
| `EmployeesPage` | `/employees` | Employee CRUD + per-employee skills matrix + availability records (real API only) |
| `SkillsPage` | `/skills` | Skill CRUD |
| `EngineeringDecisionsPage` | `/engineering-decisions` | Project-scoped decision log: list (project filter), create, detail (WHAT/WHY/WHO/WHEN/PROJECT/OPTIONS/STATUS), lifecycle actions |

Routes + Sidebar entries added to existing files. No new UI library. No mock arrays; loading/
empty/error states per React Query conventions already present.

## 10. Tests required

- **Unit (spec files per service, mocked repos):** employee create/update/deactivate; skill
  create/update; employee-skill assign/remove; availability create/update; decision create,
  status transitions, approval/rejection, supersession (transactional), invalid transition
  rejection; tenant isolation (cross-tenant 404, missing tenant 403) for all five services.
- **Traceability:** decision lifecycle emits audit events incl. projectId; employee/skill events.
- **Security:** `@Permissions` metadata presence on every new controller route (reflection test);
  PermissionsGuard deny/allow behavior.
- **E2E (test/mitigation spec, real API + test DB):** people CRUD contracts, 400 validation,
  404 behavior, 403 denial, tenant A/B isolation for employees/skills/decisions, decision
  lifecycle audit rows with project_id.

## 11. Risks

| Risk | Mitigation |
|---|---|
| e2e requires `mitra_v2_test` DB + bash setup script | Provision test DB manually with psql + migration:run; report honestly if blocked |
| `npm install` needed (no node_modules) | Run installs before builds; note duration |
| Permission gaps → 403 in UI | Seed permissions in migration AND seed.ts; ADMIN reconciliation covers admin |
| Supersede double-write consistency | Single transaction (DataSource) for successor + original update + audit + outbox |

## 12. Implementation sequence

1. Backend entities + audit `project_id` support (entity/service/migration) → 2. Migration 0035–0037 →
3. Services (tenant/audit/outbox/transitions) → 4. Controllers + DTOs + Swagger → 5. seed.ts
permissions + master seed → 6. Unit tests → 7. e2e specs → 8. Install/build/lint/test/migrate/verify →
9. Frontend pages + routes → 10. Frontend build → 11. Gap-matrix re-baseline → 12. Final report.

**Out of scope (deliberately):** capacity engine, design-load engine, predictive analytics,
Copilot L2, full BI layer, HR/payroll/attendance/recruitment.

This plan file is a working artifact of M1 Sprint 1 and is not committed.
