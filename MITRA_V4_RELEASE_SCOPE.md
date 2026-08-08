# MITRA v4.0 Release Scope

## 1. Release name
MITRA v4.0 — Controlled Release Candidate

## 2. Branch
v3.3

## 3. Current HEAD
b82e31c7cf7827eb66190b2ebe8ed5140d02df05

## 4. Technical verification results
- Backend unit: 78/78 suites passed; 860/860 tests passed
- AI Platform E2E: 34/34 passed
- Full backend E2E: 13/13 suites passed; 173/173 tests passed
- Backend build: PASS
- Frontend build: PASS
- RBAC regression: 15/15 passed
- AI platform functionality: PASS
- P0 blockers: 0
- P1 blockers: 0

## 5. Production source files included
Included reasoning: these are the intentional tracked product changes in the verified release candidate.

- mitra-backend/package.json
- mitra-backend/src/app.module.ts
- mitra-backend/src/common/services/tenant-aware.service.spec.ts
- mitra-backend/src/database/migrations/1700000000014-DataIntegrityRemediation.ts
- mitra-backend/src/database/migrations/1700000000015-ProjectManagementDomain.ts
- mitra-backend/src/database/seed.ts
- mitra-backend/src/module_verification.md
- mitra-backend/src/modules/ai/ai.module.ts
- mitra-backend/src/modules/ai/controllers/ai.controller.ts
- mitra-backend/src/modules/ai/entities/ai-conversation.entity.ts
- mitra-backend/src/modules/ai/services/embedding.service.ts
- mitra-backend/src/modules/audit/services/audit.service.spec.ts
- mitra-backend/src/modules/audit/services/audit.service.ts
- mitra-backend/src/modules/commercial/dto/customer.dto.ts
- mitra-backend/src/modules/commercial/entities/quotation.entity.ts
- mitra-backend/src/modules/ecr-eco/ecr-eco.module.ts
- mitra-backend/src/modules/ecr-eco/entities/engineeringchangeorder.entity.ts
- mitra-backend/src/modules/ecr-eco/entities/engineeringchangerequest.entity.ts
- mitra-backend/src/modules/health/health.controller.ts
- mitra-backend/src/modules/knowledge/knowledge.module.ts
- mitra-backend/src/modules/machine/machine.module.ts
- mitra-backend/src/modules/manufacturing/controllers/workorder.controller.ts
- mitra-backend/src/modules/manufacturing/dto/workorder.dto.ts
- mitra-backend/src/modules/manufacturing/entities/index.ts
- mitra-backend/src/modules/manufacturing/entities/jobcard.entity.ts
- mitra-backend/src/modules/manufacturing/entities/operationlog.entity.ts
- mitra-backend/src/modules/manufacturing/entities/workorder.entity.ts
- mitra-backend/src/modules/manufacturing/manufacturing.module.ts
- mitra-backend/src/modules/manufacturing/services/workorder.service.ts
- mitra-backend/src/modules/planning/entities/processplan.entity.ts
- mitra-backend/src/modules/platform/platform.module.ts
- mitra-backend/src/modules/platform/services/role-assignment.service.spec.ts
- mitra-backend/src/modules/platform/services/role-assignment.service.ts

Additional tracked production files under the module tree are considered in-scope if they are part of the verified release candidate and remain within the module list derived from the current git diff.

## 6. Tests included
- AI Platform E2E: ai-e2e-p1fix.log
- Full backend E2E: ai-e2e-full-p1fix.log
- Backend unit: ai-unit-p1fix.log
- Platform RBAC verification: role service and assignment tests in the backend suite

## 7. Documentation included
- FINAL_RELEASE_CERTIFICATION.md
- docs/release/MITRA_V4_WORKTREE_AUDIT.md
- docs/release/MITRA_V4_RELEASE_TEST_MATRIX.md
- docs/release/MITRA_V4_DEPLOYMENT_READINESS.md
- Backend_Certification_Report.md
- Database_Certification_Report.md
- Testing_Certification_Report.md
- docs/AcceptanceEvidenceReport.md
- docs/ReleaseNotes.md
- Architecture, AI, roadmap, and reporting documents retained as release documentation

## 8. Evidence intentionally retained
- .release_status.txt
- .release_untracked_only.txt
- .release_diffstat.txt
- .release_changed_files.txt
- FINAL_RELEASE_CERTIFICATION.md
- .git_audit.txt
- .git_branch_final.txt
- .git_diff_final.txt
- .git_log_final.txt
- .git_status_final.txt
- ai-unit-p1fix.log
- ai-e2e-p1fix.log
- ai-e2e-full-p1fix.log
- AcceptanceEvidenceReport.md
- acceptance_evidence.json
- acceptance_summary.json

## 9. Temporary artifacts excluded
- debug-*.ts / debug-*.js
- probe-*.ts / probe-*.js
- tmp-* files
- out-* files
- *-output.txt
- *-run.txt
- jest-*.json
- *.pid
- e2e-output.txt
- generated investigation logs and terminal dumps

## 10. MinIO deployment status
MinIO is currently disabled and remains in the confirmed status:
- MINIO_ENABLED=false
- NEEDS DEPLOYMENT CONFIRMATION

Do not change MinIO configuration during this release-control gate.

## 11. P0/P1/P2/P3 status
- P0: 0
- P1: 0
- P2: follow-up only; not release blocking
- P3: follow-up only; not release blocking

## 12. Exact files proposed for staging
These are the explicit files chosen for the staged release candidate after classification and review:

- Backend_Certification_Report.md
- DATABASE_ARCHITECTURE.md
- Database_Certification_Report.md
- Testing_Certification_Report.md
- docs/AcceptanceEvidenceReport.md
- docs/ReleaseNotes.md
- FINAL_RELEASE_CERTIFICATION.md
- .release_status.txt
- .release_untracked_only.txt
- .release_diffstat.txt
- .release_changed_files.txt
- mitra-backend/package.json
- mitra-backend/src/app.module.ts
- mitra-backend/src/common/services/tenant-aware.service.spec.ts
- mitra-backend/src/database/migrations/1700000000014-DataIntegrityRemediation.ts
- mitra-backend/src/database/migrations/1700000000015-ProjectManagementDomain.ts
- mitra-backend/src/database/seed.ts
- mitra-backend/src/module_verification.md
- mitra-backend/src/modules/ai/ai.module.ts
- mitra-backend/src/modules/ai/controllers/ai.controller.ts
- mitra-backend/src/modules/ai/entities/ai-conversation.entity.ts
- mitra-backend/src/modules/ai/services/embedding.service.ts
- mitra-backend/src/modules/audit/services/audit.service.spec.ts
- mitra-backend/src/modules/audit/services/audit.service.ts
- mitra-backend/src/modules/commercial/dto/customer.dto.ts
- mitra-backend/src/modules/commercial/entities/quotation.entity.ts
- mitra-backend/src/modules/ecr-eco/ecr-eco.module.ts
- mitra-backend/src/modules/ecr-eco/entities/engineeringchangeorder.entity.ts
- mitra-backend/src/modules/ecr-eco/entities/engineeringchangerequest.entity.ts
- mitra-backend/src/modules/health/health.controller.ts
- mitra-backend/src/modules/knowledge/knowledge.module.ts
- mitra-backend/src/modules/machine/machine.module.ts
- mitra-backend/src/modules/manufacturing/controllers/workorder.controller.ts
- mitra-backend/src/modules/manufacturing/dto/workorder.dto.ts
- mitra-backend/src/modules/manufacturing/entities/index.ts
- mitra-backend/src/modules/manufacturing/entities/jobcard.entity.ts
- mitra-backend/src/modules/manufacturing/entities/operationlog.entity.ts
- mitra-backend/src/modules/manufacturing/entities/workorder.entity.ts
- mitra-backend/src/modules/manufacturing/manufacturing.module.ts
- mitra-backend/src/modules/manufacturing/services/workorder.service.ts
- mitra-backend/src/modules/planning/entities/processplan.entity.ts
- mitra-backend/src/modules/platform/platform.module.ts
- mitra-backend/src/modules/platform/services/role-assignment.service.spec.ts
- mitra-backend/src/modules/platform/services/role-assignment.service.ts

## 13. Files explicitly excluded from staging
- all debug-* files
- all probe-* files
- all tmp-* files
- all out-* files
- all *-output.txt and *-run.txt files
- all jest-*.json files
- all *.pid files
- all e2e-output.txt and related generated dumps
- any non-release scratch/investigation artifact

## 14. Final release recommendation
This is a controlled release-candidate scope, not a full development commit. The verified technical gates are green, and the release bundle can be staged explicitly without touching new feature work or weakening tests. MinIO remains a deployment-confirmation item, not a blocker for the release-control packaging step.

The worktree should remain uncommitted and unpushed until the staged diff is audited and explicitly approved.
