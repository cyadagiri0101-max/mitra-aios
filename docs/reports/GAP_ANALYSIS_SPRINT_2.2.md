# Sprint 2.2 — Gap Analysis Report

**Component:** MITRA v3.3 Project Management Domain
**Scope:** Phase 1 of the Sprint 2.2 completion program — full inspection of the existing implementation (no code changed by this analysis).
**Method:** Four parallel deep audits of every project-module file (controllers, services, DTOs, entities, events, migration 0015, seed, module wiring, platform integration points) plus cross-cutting verification (Swagger, global pipes, guards, filters, storage layer, notification/audit service APIs, e2e suite).

---

## Summary

The Sprint 2.2 domain is functionally rich (601 tests green, tsc clean) but not yet production-grade. The analysis found **6 critical, 17 high, 14 medium, and 9 low findings**. Critical findings are integrity/security defects that must be fixed before release; none require regenerating working code — every finding is a targeted extension or correction of the existing implementation.

Severity legend: **CRIT** = data-integrity or security defect; **HIGH** = missing production feature or clear contract violation; **MED** = hardening/consistency; **LOW** = polish.

---

## 1. Cross-cutting findings

| ID | Sev | Finding | Location |
|---|---|---|---|
| C-1 | CRIT | `POST /project/:id/transition` mis-binds arguments: `transitionStage(id, toStage, user.id, dto.remarks)` — remarks lands in the `tenantId` slot. With remarks set → spurious 404; without → **tenant-unscoped project lookup (cross-tenant IDOR)**; remarks never persisted. | project.controller.ts:94 vs project.service.ts:160 |
| C-2 | CRIT | **Workflow transition is not transactional**: workflow-instance save, project save, activity-log save, and audit write are 4 independent commits. Partial failure leaves inconsistent state. Both `AuditService.logBusinessEvent` and `NotificationService.enqueue` already accept an `EntityManager` — unused by the project module. | project-workflow.service.ts:109–150 |
| C-3 | CRIT | **Two conflicting `project_management` workflow graphs** are seeded: migration 0015 states (PLANNING/ENGINEERING/MANUFACTURING/TRIAL/QUALITY/DISPATCH/COMPLETED/ARCHIVED) vs `seed.ts` states (KICKOFF/DESIGN/PLANNING/EXECUTION/MONITORING/CLOSING/COMPLETED/ARCHIVED) with different UUIDs and `ON CONFLICT DO NOTHING`. Both coexist; `createInstance` resolution is ambiguous. | migration 0015:422–444 vs seed.ts:583–621 |
| C-4 | CRIT | **DONE gate bypass**: `PATCH /tasks/:id` with `status: 'DONE'` skips the open-dependency check enforced only by `POST /tasks/:id/status`. | task.service.ts:103–138 vs 140–162 |
| C-5 | HIGH | All project-module **GET routes carry no RBAC** (project, milestone, task, team, risk, document, timeline, activity, health, workflow, dashboard). Any authenticated user — including CUSTOMER — can read all project data, health, and activity. `project:*:read` permissions exist in seed but are never enforced. | all 8 controllers |
| C-6 | HIGH | `POST /project/admin/refresh-health` requires the semantically wrong `project:delete` permission. | project.controller.ts:141 |

## 2. Project module (service/controller/DTO)

| ID | Sev | Finding |
|---|---|---|
| P-1 | HIGH | `ProjectQueryDto` missing `stage` filter — service supports it (project.service.ts:65) but `forbidNonWhitelisted` rejects `?stage=` with 400. |
| P-2 | HIGH | **Priority type mismatch**: entity column `priority INT` vs DTO enums LOW/MEDIUM/HIGH/URGENT → create writes `'LOW'` into an int column; `findAllAdvanced` filters `p.priority = 'LOW'` → always empty. |
| P-3 | HIGH | `GET /:id/health` — inner `computeHealth` is tenant-unscoped (project.service.ts:188); only the outer pre-check is scoped. |
| P-4 | HIGH | `create`/`update`/`remove`/`transitionStage` write no activity-log entry and no `AuditService` record (HTTP-layer audit only); `PROJECT_UPDATED` event is never published. |
| P-5 | HIGH | `remove()` soft-deletes only the project row — children (milestones, tasks, risks, documents, teams, folders, versions) remain live and orphaned. |
| P-6 | MED | `create()` swallows workflow-instance failure (project.service.ts:123) and is non-transactional. |
| P-7 | MED | Legacy `transitionStage` (stage-based) has no activity log, no audit, no event, and is inconsistent with the workflow path. |
| P-8 | MED | `findByProjectNumber` dead code (no route, no callers). |
| P-9 | MED | `CreateProjectDto`: no `@Min(0)` on `projectValue`; entity fields (partWeightGrams, shotWeightGrams, enquiryDate, rfqNumber, poNumber, designLeadId) not settable via API; `currency`/`tags` loosely validated. |
| P-10 | LOW | Missing `@ApiOperation`/`@ApiResponse` on 8 of 12 routes; entities carry no `@ApiProperty` (response schemas undocumented in Swagger). |

## 3. Workflow integration

| ID | Sev | Finding |
|---|---|---|
| W-1 | CRIT | Same as C-2: transition not in one transaction; `ensureInstance` also non-transactional (createInstance + project save). |
| W-2 | HIGH | **No notification on workflow transition** — `NotificationService` (PlatformModule) not imported by ProjectModule; no subscriber consumes `project.*` domain events (bus is publish-only; `AiProjectionService` never registered). |
| W-3 | HIGH | `project.stage` is NOT synced by the workflow engine — only `status`. Stage and workflow state diverge. |
| W-4 | MED | `PROJECT_UPDATED` never published; `project.created`/`project.status_changed` have zero subscribers. |
| W-5 | MED | Legacy `transitionStage` route coexists with workflow path — same actor can drive two state models. |

## 4. Milestones

| ID | Sev | Finding |
|---|---|---|
| M-1 | HIGH | **No create endpoint** (manual milestone) and **no generate-from-template endpoint** — template instantiation exists only inside the factory at project creation. |
| M-2 | HIGH | **No protection on delete**: milestone with tasks or with dependent milestones deletes silently, orphaning tasks and unblocking downstream gates. |
| M-3 | HIGH | `refreshDelays` (service) has **no route**, sets `updatedBy = null`, uses inconsistent rounding (`Math.floor` vs `Math.round`), no activity log. |
| M-4 | MED | Approval: no approver-≠-completer check; approval-pending milestones sit at IN_PROGRESS/100% indefinitely; `ApproveMilestoneDto` (remarks) is dead code. |
| M-5 | MED | `UpdateMilestoneDto` not `PartialType`; `sequenceNumber`/`requiresApproval`/`dependsOnMilestoneId` immutable after creation; no cross-field validation. |
| M-6 | MED | Milestone `complete()`/`remove()`/`update()` are multi-write without transactions. |
| M-7 | MED | No aggregate project progress % recomputed from milestones/tasks anywhere. |
| M-8 | LOW | Dead imports (`Query`, `ApproveMilestoneDto`) in milestone controller; template DTOs missing `@Type(() => Boolean)`. |

## 5. Tasks

| ID | Sev | Finding |
|---|---|---|
| T-1 | CRIT | Same as C-4 (DONE bypass via PATCH). |
| T-2 | HIGH | `?parentTaskId=` query param rejected (not in `TaskQueryDto`, `forbidNonWhitelisted` → 400) although service supports it. |
| T-3 | HIGH | **Time tracking placeholder**: `actualHours` column exists, no DTO field, no endpoint, no service logic. |
| T-4 | HIGH | `update()` accepts `parentTaskId` change with no cycle detection (can parent a task under its own descendant); no self-parent check. |
| T-5 | HIGH | `remove()` with subtasks orphans them (no cascade, no block). |
| T-6 | HIGH | `addDependency` never verifies the target task exists / same project (dangling edges); `dependencyType` from DTO ignored. |
| T-7 | MED | `changeStatus` `note` parameter silently dropped (validated by DTO, unused by service). |
| T-8 | MED | Task dependency replacement inside `update()` is non-atomic (soft-delete all + re-insert). |
| T-9 | MED | No attachment upload/delete endpoints (service methods exist, no routes); no comment delete/update; no task-activity route. |
| T-10 | MED | `assigneeId` unvalidated free UUID; no check user exists/tenant/team membership. |
| T-11 | MED | `findByProject` limit 2000 hard-coded; `search` lacks `@MinLength(1)`; dependency add/remove/comment ops unlogged to activity (only events). |

## 6. Teams

| ID | Sev | Finding |
|---|---|---|
| TM-1 | HIGH | **No skills management**: `skills` is a free JSONB string array; no validation, no search/filter, no skill field on availability. |
| TM-2 | HIGH | **No team-lead enforcement**: multiple `isLead` members allowed; `team.leadUserId` never auto-synced from `isLead`. |
| TM-3 | MED | Availability formula uses a **flat 20-point penalty** when any open hours exist (not proportional); `startDate`/`endDate` unused; hours not scaled. |
| TM-4 | MED | Member `department` never validated against `Department` table (no FK, no check); `updateDepartment` doesn't re-check code uniqueness. |
| TM-5 | MED | `updateMember`/`removeMember`/department ops have no activity-log entries; `AddTeamMemberDto.userId` optional (duplicate-name members possible). |
| TM-6 | MED | No `endDate >= startDate` check on member; member `role` free string (no enum). |

## 7. Risks

| ID | Sev | Finding |
|---|---|---|
| R-1 | HIGH | **Status transitions unguarded**: generic `PATCH` can set CLOSED without `closedAt`, or reopen OPEN without clearing it; `CreateRiskDto.status` allows creating CLOSED risks. |
| R-2 | HIGH | **No reopen endpoint**; close() is idempotent but doesn't enforce OPEN/MITIGATING precondition; no resolution required on close. |
| R-3 | MED | Review reminders: overdue computed only inline in dashboard; no per-risk overdue list; no upcoming-review list; no `nextReviewDate`. |
| R-4 | MED | `CreateRiskDto` doesn't require mitigation plan or owner; `reviewDate` not required future; no sort param on `RiskQueryDto`. |

## 8. Documents

| ID | Sev | Finding |
|---|---|---|
| D-1 | CRIT | **Checksum hashes the file *path string*, not file content** (crypto over `file.filePath`); never recomputed/compared — no integrity validation at all. |
| D-2 | HIGH | **No real upload or download** — module is metadata-only; "upload" synthesizes a `filePath` from JSON. MinioService exists and is unused for this module. |
| D-3 | HIGH | Release doesn't bump/mark versions: no SUPERSEDED marking, no precondition (can release ARCHIVED), `isLatest` never updated; upload after release silently changes "RELEASED" file metadata. |
| D-4 | HIGH | Folder `parentFolderId` accepted but **ignored** (path always root); no name-uniqueness check, no path sanitization, no rename. |
| D-5 | MED | PATCH with `fileName` **implicitly creates a new version** (surprising side effect); `UpdateProjectDocumentDto` via `PartialType` allows it. |
| D-6 | MED | `update`/`createFolder`/`removeFolder` have no activity-log entries; versions never soft-deleted when document removed. |
| D-7 | LOW | `DocumentQueryDto` no sort; no search on description/content; `fileSize` no `@Max`; folder `sequence` allows negatives. |

## 9. Timeline / Activity / AI

| ID | Sev | Finding |
|---|---|---|
| L-1 | HIGH | Timeline dependency query loads **every task dependency in the DB** (take 5000, no projectId filter) — cross-project leak surface and unbounded memory. |
| L-2 | MED | Activity feed has no filters (action/entity/actor/date); controller `search` param silently dropped. |
| L-3 | MED | Milestone-only mode (`includeTasks=false`) also drops links/critical-path (service skips dependency load). |
| L-4 | LOW | AI projection is deliberately a stub (documented) — no runtime provider registered; acceptable as a Sprint-2.2 integration point, but should be recorded as a known limitation. |

## 10. Cross-cutting / platform

| ID | Sev | Finding |
|---|---|---|
| X-1 | HIGH | **No e2e spec for the project module** (only commercial covers project creation via quotation). |
| X-2 | MED | `npm run test:cov` broken repo-wide: istanbul `test-exclude` fails with `ERR_INVALID_ARG_TYPE` on `redis.service.ts` — coverage target (95%) cannot be measured or enforced. Jest 29.7 supports `coverageProvider: 'v8'` which bypasses istanbul. |
| X-3 | MED | No generic exception filter (only optimistic-lock 409); error shape consistency not guaranteed. |
| X-4 | LOW | Swagger: `@ApiOperation` on 4 of 12 project routes; none on the other 7 controllers; entity response schemas undocumented. |
| X-5 | LOW | `mitra-backend` package version still `3.2.0` (release notes claim v3.3). |

## 11. Frontend findings (from earlier implementation)

| ID | Sev | Finding |
|---|---|---|
| F-1 | MED | Activity feed in ProjectDetailsPage shows latest 50 with no filters or pagination. |
| F-2 | MED | Kanban move buttons and timeline rows lack `aria-label` (keyboard accessibility gap). |
| F-3 | LOW | No dedicated Activity timeline page; document upload/download UI absent (backend had no endpoints). |
| F-4 | LOW | Risk/team/timeline cards degrade silently on 403 for CUSTOMER role (no explicit message). |

---

## Priority remediation plan

**CRITICAL (must fix):** C-1, C-2, C-3, C-4, D-1/D-2 (together), P-2
**HIGH:** C-5, C-6, P-1, P-3, P-4, P-5, W-2, W-3, M-1, M-2, M-3, T-2, T-3, T-4, T-5, T-6, TM-1, TM-2, R-1, R-2, D-3, D-4, L-1, X-1
**MED/LOW:** remaining — batch with tests and docs.

This report is the baseline for the implementation phases that follow.
