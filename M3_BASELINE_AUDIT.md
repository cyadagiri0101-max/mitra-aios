# MITRA Vision-100 — M3 Baseline Audit Report
## Engineering Kernel & Change Intelligence

**Audit Date:** 2026-08-18  
**Baseline Git Commit:** `71780dc0` (v4.2.0 baseline, branch `v3.3`)  
**Scope:** Pre-implementation architectural and code inspection across Engineering, Workflow, Revisions, Change Management, Decision Log, Traceability, and Manufacturing Handoff.

---

## 1. Git & Working Tree Baseline

- **Branch:** `v3.3`
- **Latest Release Tag:** `v4.2.0`
- **Head Commit:** `71780dc0` (`feat(mitra): complete v4.2 goal 3 knowledge intelligence`)
- **Working Tree State:** Clean baseline + verified M1/M2 Sprint 1/M2 Sprint 2 deliverables intact.
- **Test Baseline:** 114 unit test suites (1,149 tests) passing; 4 E2E suites (35 tests) passing; schema validation 189 entities 0 drift; frontend build 0 errors.

---

## 2. Inventory & Inspection of Existing Modules

### 2.1 Engineering Domain (`src/modules/engineering/`)
- **Entities Present:**
  - `EngineeringDrawing` & `EngineeringDrawingRevision`: Revision tracking (`A`, `B`, `C`), check-in/out locks, CAD metadata, basic metadata diff.
  - `EngineeringBom`, `EngineeringBomItem`, `EngineeringBomRevision`, `EngineeringBomSubstitution`: Multi-level tree, unit conversion, cost rollup.
  - `EngineeringReviewRequest`, `EngineeringReviewAssignment`, `EngineeringReviewComment`: Review workflows, reviewer assignments, comments, approve/reject decisions.
  - `EngineeringTraceEdge`: Generic trace graph edges.
  - `EngineeringRouting`, `EngineeringRoutingRevision`, `EngineeringOperation`, `EngineeringWorkCenter`: Process plans and operations.
- **Services Present:**
  - `EngineeringDrawingService`: Check-in, check-out, revisions list, metadata comparison.
  - `EngineeringBomService`: BOM CRUD, tree hierarchy, item management, cost rollup, substitution.
  - `EngineeringReviewService`: Review creation, assignment, multi-reviewer concurrence, decision recording.
  - `EngineeringWorkflowService`: DB-driven workflow state transitions for drawing, BOM, and routing entities.
  - `EngineeringTraceabilityService`: Project-level artifact aggregation (drawings, BOMs, routings, reviews, changes, work orders).

### 2.2 Workflow Engine (`src/modules/workflow/`)
- **State Machine:** `WorkflowState`, `WorkflowTransition`, `WorkflowInstance`, `WorkflowHistoryEntry`.
- **Enforced Mold Project Lifecycle Stages:** `ENQUIRY` $\rightarrow$ `QUOTATION` $\rightarrow$ `APPROVAL` $\rightarrow$ `PROJECT_CREATED` $\rightarrow$ `DESIGN_INITIATED` $\rightarrow$ `CPS_APPROVED` $\rightarrow$ `DESIGN_RELEASED` $\rightarrow$ `PROCESS_PLANNING` $\rightarrow$ `MACHINE_PLANNING` $\rightarrow$ `MANUFACTURING` $\rightarrow$ `INTERNAL_TRIAL` $\rightarrow$ `CUSTOMER_TRIAL` $\rightarrow$ `CAPA` $\rightarrow$ `RETRIAL` $\rightarrow$ `CUSTOMER_APPROVAL` $\rightarrow$ `DISPATCH` $\rightarrow$ `SERVICE`.

### 2.3 Manufacturing Handoff & Workorder Gate (`src/modules/manufacturing/`)
- **Gate Check in `WorkOrderService`:**
  - `assertReleased(table, id, label, tenantId)` explicitly queries `engineering_drawings`, `engineering_boms`, `engineering_routings`, and `process_plans`.
  - Prohibits work order creation if the referenced engineering artifact is not in `RELEASED` status (`String(row.status) !== 'RELEASED'`).

### 2.4 Change Management (`src/modules/ecr-eco/`)
- **Entities:** `EngineeringChangeRequest`, `EngineeringChangeOrder`, `EngineeringChangeNotice`, `EngineeringChangeImpact`, `EcoImplementation`.
- **Current State:** ECR transitions from `DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `IMPLEMENTED`.
- **Gap Identified:** ECR/ECO records are not yet automatically creating or linking to the M1 `EngineeringDecision` entity.

### 2.5 Engineering Decision Log (`src/modules/engineering-decisions/`)
- **Entity:** `EngineeringDecision` (`DEC-{yyyy}-{NNNN}`).
- **Capabilities:** Tracks options considered, selected option, technical rationale, approver, decision date, status (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `SUPERSEDED`), and generic `relatedEntityType` / `relatedEntityId`.
- **Integration Readiness:** Ready for direct bi-directional linking with ECR, ECO, and Design Review gates.

### 2.6 Capacity & Planning Intelligence (`src/modules/design-load/`)
- **Capabilities:** `CapacityIntelligenceService` aggregates multi-project demand across `DAILY`, `WEEKLY`, and `MONTHLY` horizons, 8-dimensional accounting, live engineer utilization, what-if simulator, recommendations, and risks.
- **Extension Opportunity:** Build `CapacityLevelingService` on top of `CapacityIntelligenceService` to provide non-destructive, constraint-solving leveling heuristics across 10 CAD stations and 3 shifts.

---

## 3. Key Findings & Gaps to Address in M3

1. **DATA_GAP A10 (BOM Revision Diff Engine):**
   - `engineering_bom_revisions` entity exists, but `EngineeringBomService` does not currently save revision snapshots upon release or compute differential comparisons between revisions.
   - **M3 Fix:** Implement snapshot capture on BOM release/revision bump and build deterministic `BomRevisionDiffService` computing `ADDED`, `REMOVED`, `MODIFIED`, and `UNCHANGED` items with component, quantity, material, substitute, and cost rollups.
2. **Design Freeze & Release Governance (Workstream W1 / G4):**
   - Drawing and BOM lifecycles need a unified, governed gate: `DRAFT` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `REVIEWED` $\rightarrow$ `FROZEN` $\rightarrow$ `APPROVED` $\rightarrow$ `RELEASED` $\rightarrow$ `OBSOLETE`.
   - Work order creation must continue strictly blocking unreleased drawings/BOMs.
3. **Change Decision Traceability (Workstream W3 / G5):**
   - Automatically generate and link an `EngineeringDecision` record whenever an ECR or ECO is submitted/approved, populating `relatedEntityType = 'EngineeringChangeRequest'` and preserving technical rationale.
4. **Controlled Multi-Project Leveling (Workstream W4 / G3):**
   - Implement `CapacityLevelingService` providing explainable leveling recommendations (`REASSIGN_ENGINEER`, `EXTEND_SHIFT_OVERTIME`, `OUTSOURCE_STAGE`, `RESCHEDULE_TASK`, `ADD_WORKSTATION`) with human approval before schedule application.
5. **Frontend Integration (Workstream W6):**
   - Provide real UI pages for Design Reviews, BOM Revision Comparison Diff Viewer, Change Decision Traceability, and Capacity Leveling Assistant without mock data.

---

## 4. Baseline Audit Verdict & Readiness

- **Baseline Audit Status:** **COMPLETE**
- **Existing Architecture Viability:** **EXCELLENT** — Core entities and services exist and can be extended cleanly without breaking backward compatibility or duplicating code.
- **Readiness to Begin M3 Implementation:** **READY**
