# MITRA M4 — IMPLEMENTATION PLAN
**Shop Floor Execution & Quality Closed Loop**

- **Target Release**: MITRA `v4.4.0` / Milestone M4
- **Baseline Release**: MITRA `v4.3.0` (`eb6260a9d8be0a76aa3b89ab8b27bd3f9232913c`)
- **Branch**: `v3.3`
- **Scope**: Sprint 1 (Manufacturing Execution & Quality Gates) + Sprint 2 (CAPA Closed Loop & Trial Governance)

---

## 1. Objectives & Architectural Principles

1. **Deterministic Quality Gates**: Enforce hard validation in `WorkOrderEngineService` preventing work order completion when open `CRITICAL` or `MAJOR` NCRs exist.
2. **Closed-Loop NCR $\to$ CAPA Flow**: Enable atomic escalation of non-conformance records into CAPA investigations with root-cause analysis and preventive plans.
3. **Tooling Trial & Retrial Governance**: Formalize the mold trial decision lifecycle (`PASS` / `FAIL` / `CONDITIONAL`), retrial scheduling (`T0` $\to$ `T1`), and automatic change request triggering for tooling modifications.
4. **Finite Machine Scheduling & Operation Sequencing**: Enforce machine booking integrity and operation sequence validation across job cards.
5. **Multi-Tenant Security & Traceability**: Maintain strict fail-closed tenant isolation, RBAC permissions, and `project_id` digital thread indexing.
6. **Zero Silent AI / Zero Mock Data**: Real database queries and explicit human-in-the-loop approvals.

---

## 2. Proposed Changes & Technical Architecture

### 2.1 Backend Services & Controllers (`mitra-backend`)

#### [MODIFY] `src/modules/manufacturing/services/work-order-engine.service.ts`
- In `transition(workOrderId, 'COMPLETE')`:
  - Query `ncr_records` for `workOrderId`.
  - If any active NCR has `status IN ('OPEN', 'INVESTIGATION', 'ACTION')` and `severity IN ('CRITICAL', 'MAJOR')`, throw `BadRequestException('Cannot complete work order: unresolved critical/major NCRs exist')`.
  - Verify all child job cards are in terminal statuses (`COMPLETED`, `CANCELLED`, `SCRAPPED`).

#### [MODIFY] `src/modules/quality/services/ncr.service.ts` & `src/modules/quality/controllers/ncr.controller.ts`
- Add `escalateToCapa(ncrId, dto, user)`:
  - Validates NCR exists in caller's tenant.
  - Creates `CapaVerification` record with `ncrId`, `projectId`, `drawingId`, `bomId`, `workOrderId`, problem description, and assigned owner.
  - Updates NCR status to `ACTION` and links `capaId`.
  - Emits `CAPA_INITIATED` outbox domain event.

#### [MODIFY] `src/modules/quality/services/capa.service.ts` & `src/modules/quality/controllers/capa.controller.ts`
- Add `transition(capaId, toStatus, user, dto)`:
  - Manages CAPA lifecycle (`OPEN` $\to$ `IN_PROGRESS` $\to$ `IMPLEMENTED` $\to$ `VERIFIED` $\to$ `CLOSED`).
  - On `VERIFIED`/`CLOSED`, verifies evidence and closes the parent NCR record.

#### [MODIFY] `src/modules/quality/services/trialobservation.service.ts` & `src/modules/quality/controllers/trialobservation.controller.ts`
- Add `requestRetrial(trialId, dto, user)`:
  - Creates `Retrial` record linked to `originalTrialId` with incremented sequence.
  - Updates original trial status and emits `RETRIAL_REQUESTED` event.
- Add `approveRetrial(retrialId, user)`:
  - Approves retrial for toolroom and scheduling board.
- Add `createEcrFromTrial(trialId, dto, user)`:
  - Automatically creates an `EngineeringChangeRequest` linked to the trial with pre-populated defect telemetry.

---

### 2.2 Frontend Enhancements (`mitra-frontend`)

#### [MODIFY] `src/pages/ManufacturingPage.tsx`
- Display active NCR blocker badges on Work Orders.
- Add direct navigation to linked NCRs and Job Card inspection records.

#### [MODIFY] `src/pages/QualityPage.tsx` & `src/pages/CapaPage.tsx`
- Add interactive NCR-to-CAPA escalation modal.
- Add root-cause methodology selection (5-Why, 8D, Fishbone) and action verification status tracking.

#### [MODIFY] `src/pages/TrialsPage.tsx`
- Upgrade to rich Trial Execution and Observation view:
  - Process parameters (temperature, pressure, cycle time).
  - Defect tagger and observations log.
  - Retrial request and approval workflow buttons.
  - ECR generation button for tooling rework.

---

## 3. Verification & Test Plan

### 3.1 Automated E2E Test Suites
1. **`test/m4-shop-floor-execution.e2e-spec.ts` (Golden Scenario G7)**:
   - Work order generation from released routing $\to$ Job card creation $\to$ Machine booking $\to$ Production logging $\to$ Operation sequence enforcement $\to$ Work order completion.
2. **`test/m4-quality-closed-loop.e2e-spec.ts` (Golden Scenario G8)**:
   - In-process checkpoint failure $\to$ Auto NCR creation $\to$ Work order completion blocked $\to$ Escalate to CAPA $\to$ Implement & verify CAPA $\to$ Close NCR $\to$ Work order completion allowed.
3. **`test/m4-trial-governance.e2e-spec.ts` (Golden Scenario G9)**:
   - Tooling trial recording $\to$ Failed trial result $\to$ Retrial request & approval $\to$ ECR creation with defect linkage $\to$ Tenant isolation.

### 3.2 Regression Gate
- Run all 117 unit test suites (`npm test` $\to$ 1,157+ passed).
- Run all M1, M2, M3, and M4 E2E suites sequentially (`npm run test:e2e` $\to$ 100% passed).
- Validate database schema (`npm run schema:validate` $\to$ 0 drift).
- Run frontend typecheck (`npx tsc --noEmit`) and production build (`npm run build`).
