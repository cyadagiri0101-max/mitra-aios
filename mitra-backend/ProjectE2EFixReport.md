# Project E2E Fix Report

Date: 2026-08-06

Summary
- Implemented minimal compatibility fix so the milestone create API accepts the E2E payload.

What I changed
- `src/modules/project/dto/milestone.dto.ts`: made `milestoneName` and `milestoneStage` optional and added an optional `title` field to accept the test payload.
- `src/modules/project/services/milestone.service.ts`: normalized incoming data to use `title` as an alias for `milestoneName` and defaulted missing `milestoneStage` to `KICKOFF` before persisting.

Verification
- Ran the Project E2E suite (project creation → retrieval → listing → milestone creation) sequentially.
- Result: tests 1–4 passed (milestone creation now succeeds). Audit logs show POST /api/project/{projectId}/milestones succeeded and the subsequent complete call succeeded.

Test results (summary)
- Ran: `test/project.e2e-spec.ts` (sequential subset: 1→4)
- Outcome: 4 tests passed, remaining tests skipped in subset run.
- When running the full file previously, additional failures and an intermittent DB connection termination were observed; these are secondary and require focused investigation after fixing the remaining functional test failures.

Next steps
1. Triage tests 5 and 8 (task creation/time logging and workflow transitions). These are the highest priority follow-ups.
2. After functional fixes, re-run full Project suite and confirm no connection terminations occur.
3. Only if DB connection termination persists after functional tests pass, investigate PostgreSQL logs, TypeORM connection lifecycle, and open handles.

Files changed
- `src/modules/project/dto/milestone.dto.ts`
- `src/modules/project/services/milestone.service.ts`

If you want, I can now start triaging test #5 (tasks + time logging). Proceed? (yes/no)
