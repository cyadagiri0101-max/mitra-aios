# MITRA Vision-100 — M3 Implementation Plan
## Engineering Kernel & Change Intelligence

**Target Release:** MITRA v4.3.0  
**Baseline:** `71780dc0` (v4.2.0 baseline + verified M1 + verified M2)  
**Branch:** `v3.3`  
**Milestone:** M3 (Engineering Kernel & Change Intelligence)  
**Golden Scenarios Targeted:** G4 (Engineering Design $\rightarrow$ Release), G6 (BOM Cost Rollup & Revision Compare), G3 (Leveling Extension), G5 (Change Decision Linkage)  

---

## 1. Objectives & Architectural Guardrails

### 1.1 Core Goals
1. Establish a production-grade **Engineering Release Governance Engine** integrating Design Reviews, Design Freeze Gates, and Engineering Release Gates blocking unapproved manufacturing handoff.
2. Deliver **Revision & BOM Intelligence** with deterministic differential comparison (`ADDED`, `REMOVED`, `MODIFIED`, `UNCHANGED`) across components, materials, quantities, substitutes, and costs, resolving DATA_GAP A10 and enabling Golden Scenario **G6**.
3. Strengthen **Change Intelligence** by automatically linking ECR $\rightarrow$ ECO $\rightarrow$ ECN workflows with the M1 Engineering Decision Log, preserving explainable technical rationale, approvers, and revision impacts.
4. Implement **Controlled Multi-Project Planning & Leveling Heuristics** built upon the M2 10 CAD Workstation $\times$ 3 Shift capacity foundation with human-in-the-loop approval.

### 1.2 Non-Negotiable Guardrails
- **DO NOT** restart the project or rewrite existing working modules (`engineering`, `ecr-eco`, `bom-analysis`, `manufacturing`, `design-load`, `project`).
- **DO NOT** use mock or hardcoded frontend data.
- **DO NOT** execute silent AI or heuristic writes to production BOMs or schedules — all operations must be non-destructive by default and require human approval.
- **DO NOT** weaken fail-closed multi-tenancy (`TenantAwareService`), `@Permissions` RBAC, or `project_id` audit scoping.

---

## 2. Workstream Breakdown

```
+-----------------------------------------------------------------------------------+
| M3 ENGINEERING KERNEL & CHANGE INTELLIGENCE                                       |
+-----------------------------------------------------------------------------------+
| W1: Engineering Release Governance                                               |
|     - Design Review Workflow (Request -> Assignment -> Comments -> Decision)     |
|     - Design Freeze Gate (Milestone / Drawing / BOM Freeze)                      |
|     - Engineering Release Gate (Approval / Rejection / Release Evidence)         |
|     - Manufacturing Handoff Gate (Block WO generation on unreleased artifacts)   |
+-----------------------------------------------------------------------------------+
| W2: Revision & BOM Intelligence (DATA_GAP A10 Resolution & G6)                    |
|     - Drawing Revision Management & Historical Reconstruction                     |
|     - BOM Revision Snapshot & Deterministic Diff Engine (ADDED/REMOVED/MOD/UNCHG)|
|     - Cost Rollup & Substitute Component Tracking                                 |
|     - Realistic Production Data Seeds & G6 E2E Certification Test                 |
+-----------------------------------------------------------------------------------+
| W3: Change Intelligence & Decision Linking                                       |
|     - ECR -> Impact Analysis -> ECO -> ECN Workflow State Machine                |
|     - Automatic Linking to M1 Engineering Decision Log (`DEC-{yyyy}-{NNNN}`)     |
|     - Technical Rationale, Options Considered, Approver Traceability             |
|     - Downstream Manufacturing & Quality Impact Propagation                      |
+-----------------------------------------------------------------------------------+
| W4: Controlled Multi-Project Planning & Leveling                                  |
|     - Priority, Deadline & Skill Constraint Detection                             |
|     - 10 CAD Workstations x 3 Shifts Allocation & Overload Leveling Heuristics   |
|     - Explainable Recommendations: REASSIGN, OVERTIME, OUTSOURCE, RESCHEDULE     |
|     - Non-Destructive What-If Leveling Application with Human Approval Gate       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Detailed Technical Architecture & Scope

### 3.1 Workstream 1 — Engineering Release Governance
- **Entities & Schema (`engineering_reviews`, `engineering_review_comments`, `engineering_releases`)**:
  - State Machine: `DRAFT` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `REVIEWED` $\rightarrow$ `FROZEN` $\rightarrow$ `APPROVED` $\rightarrow$ `RELEASED` $\rightarrow$ `OBSOLETE`.
  - Integration with Drawings, BOMs, and Process Plans.
  - **Manufacturing Handoff Gate**: Enforce check in `WorkorderService` prohibiting work order creation if the referenced drawing/BOM has not achieved `RELEASED` status.
- **Permissions**: `engineering:review:create`, `engineering:review:decide`, `engineering:release:approve`, `engineering:release:freeze`.

### 3.2 Workstream 2 — Revision & BOM Intelligence (G6 & A10)
- **BOM & Drawing Revision Diff Engine**:
  - `BomRevisionService.compareRevisions(bomId, fromRev, toRev)` returning:
    - `added`: components present in `toRev` but absent in `fromRev`.
    - `removed`: components present in `fromRev` but absent in `toRev`.
    - `modified`: components with quantity, material, or cost delta.
    - `unchanged`: identical components.
    - `costDelta`: $\Delta\text{cost}$ rollup.
  - `DrawingRevisionService.compareRevisions(drawingId, fromRev, toRev)` returning metadata, title block, and revision delta.
- **Seed Data**: Realistic injection molds with revisions `A`, `B`, `C` with multi-level parts, substitute components, and cost parameters.

### 3.3 Workstream 3 — Change Intelligence & Engineering Decision Linking
- **ECR/ECO/ECN Auto-Linking**:
  - When an ECR or ECO is submitted/approved, an engineering decision record is automatically created or linked via `decisionId` in `engineering_decisions`.
  - Options evaluated, chosen design path, and approver recorded.
  - Reconstructed impact tree: ECR $\rightarrow$ Decision $\rightarrow$ ECO $\rightarrow$ Drawing Rev $\rightarrow$ BOM Rev $\rightarrow$ Work Order Notice.

### 3.4 Workstream 4 — Controlled Multi-Project Leveling Heuristics
- **Leveling Engine**:
  - `CapacityLevelingService.analyzeAndLevel(tenantId, options)`
  - Solves constraint conflicts across active project design loads, 10 CAD stations, and 3 shifts.
  - Generates atomic, non-destructive recommendations (`REASSIGN_ENGINEER`, `EXTEND_SHIFT_OVERTIME`, `OUTSOURCE_STAGE`, `RESCHEDULE_TASK`).
  - Provides a dry-run preview and require-approval execution endpoint.

---

## 4. Test & Verification Matrix (Definition of Done)

| Track | Test File | Target Scenario / Verification |
|---|---|---|
| **Unit** | `engineering-review.service.spec.ts` | Review lifecycle, freeze gates, reviewer permissions |
| **Unit** | `bom-revision-diff.service.spec.ts` | Deterministic diff calculation (Added, Removed, Modified, Cost) |
| **Unit** | `ecr-decision-linking.service.spec.ts` | Decision log linking, options preservation, impact trace |
| **Unit** | `capacity-leveling.service.spec.ts` | Constraint detection, 10x3 shift leveling, non-destructive application |
| **E2E** | `test/m3-engineering-kernel.e2e-spec.ts` | **Golden Scenario G4**: Drawing/BOM $\rightarrow$ Review $\rightarrow$ Freeze $\rightarrow$ Release $\rightarrow$ Work Order Gate |
| **E2E** | `test/m3-bom-revision-diff.e2e-spec.ts` | **Golden Scenario G6**: Revision creation $\rightarrow$ diff calculation $\rightarrow$ substitute cost rollup |
| **E2E** | `test/m3-change-decision.e2e-spec.ts` | **Golden Scenario G5**: ECR $\rightarrow$ Decision Log $\rightarrow$ ECO $\rightarrow$ Revision trace |
| **Frontend** | `tsc && vite build` | Zero compilation or lint errors |
| **Schema** | `npm run schema:validate` | Zero schema drift against PostgreSQL |
| **Tenant** | Multi-Tenant IDOR suite | All new M3 endpoints return 404 on cross-tenant access |

---

## 5. Implementation Execution Sequence

1. **Step 1 (Schema & Migrations)**: Create TypeORM migration for Engineering Reviews, Release Gates, Revision Comparison tables, and RBAC permissions.
2. **Step 2 (W1 - Release Governance)**: Implement `EngineeringReviewService`, `EngineeringReleaseService`, and gate check in `WorkorderService`.
3. **Step 3 (W2 - Revision & BOM Intelligence)**: Implement deterministic BOM/Drawing revision comparison engine and seed realistic data.
4. **Step 4 (W3 - Change Intelligence)**: Implement automated ECR/ECO decision log linking and downstream impact propagation.
5. **Step 5 (W4 - Multi-Project Leveling)**: Implement `CapacityLevelingService` and recommendations engine.
6. **Step 6 (Frontend UI Integration)**: Build Design Review / Release Gate UI, BOM Diff Viewer, Change Decision Trace UI, and Leveling Assistant.
7. **Step 7 (Verification & E2E Tests)**: Execute full unit suite, E2E suites for G4 & G6, schema validation, and produce M3 Evidence Matrix.
