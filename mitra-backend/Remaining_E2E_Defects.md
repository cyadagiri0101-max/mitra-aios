# Remaining E2E Defects (Project Suite)

Summary of outstanding project E2E issues after milestone DTO/service fix.

- Tests/skipped or failing (observed when running full suite):
  - 5. Creates tasks and logs time against them (T-3) — failing or skipped in subset runs; needs investigation of task creation/time endpoints.
  - 6. Dependency rule: DONE is blocked until the dependency completes — business-rule validation failures possible.
  - 7. Creates a team with members carrying skills and filters by skill (TM-1) — team/member endpoints to verify.
  - 8. Transitions the project stage (legacy path) with audit trail — workflow transition rules may still block expected legacy path.
  - 9. Validation: rejects unknown fields (whitelist + forbidNonWhitelisted) — ensure global validation pipe rejects unexpected fields.
  - 10. RBAC: project endpoints require authentication — verify unauthenticated access is rejected.
  - 11. Soft-deletes the project (cascade) and it disappears from listings — verify cascade soft-delete behavior.

Notes:
- Milestone creation (test #4) now passes when the suite runs sequentially (project created first). Audit logs show POST /api/project/{projectId}/milestones succeeded.
- A DB connection termination was observed in one full-run attempt but is not yet considered root cause; hold DB investigation until milestone/other failures are isolated.

Recommended next focus: task creation/time logging and workflow transitions (tests 5 and 8).
--------------------------------------------------
Suite
First failing test
Exception
Stack trace
Root cause
Files involved
Status
--------------------------------------------------

Project
Project Module E2E · 1. Creates a project with sequential numbering
[MITRA] Schema integrity check FAILED — missing columns: audit_logs.event_type, workflow_instances.version, workflow_transitions.required_roles, workflow_transitions.required_permissions, workflow_transitions.requires_approval, rfqs.version, quotations.version, leads.version, customers.version.
See `src/common/services/schema-integrity.service.ts:58:19` and `test/project.e2e-spec.ts:23:20`
The app starts before migrations/schema state are guaranteed, causing schema integrity to fail in E2E runtime.
`src/common/services/schema-integrity.service.ts`
`test/project.e2e-spec.ts`
`test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Cross-domain
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/cross-domain.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

App
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/app.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Engineering
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/engineering.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Manufacturing
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/manufacturing.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Analytics
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/analytics.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Quality
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/quality.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Auth
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/auth.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Commercial
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/commercial.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Concurrency
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/concurrency.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

AI Usage
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/ai-usage.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------

Service
First failing test not yet isolated
Exception: same schema integrity failure as Project
Root cause: same verified schema integrity check failure during app bootstrap
Files involved: `src/common/services/schema-integrity.service.ts`, `test/service.e2e-spec.ts`, `test/utils/test-app.ts`
Status: OPEN
--------------------------------------------------
