# MITRA v4.3.0 — Release Notes
**Milestone M3: Engineering Kernel & Change Intelligence**

- **Version**: `v4.3.0`
- **Baseline Release**: `v4.2.0` (`71780dc0`) on branch `v3.3`
- **Date**: August 19, 2026
- **Status**: **FORMALLY CERTIFIED RELEASE**

---

## 1. Release Overview

MITRA v4.3.0 introduces the **Enterprise Engineering Kernel & Change Intelligence** milestone (M3), elevating MITRA from commercial, project planning, and baseline tracking into a full-scale manufacturing governance and engineering intelligence operating system.

This release candidate delivers rigorous engineering release governance, multi-level BOM revision snapshotting and deterministic comparison, closed-loop change decision linkage, and human-in-the-loop capacity leveling, backed by complete multi-tenant security and auditable digital thread integrity.

---

## 2. Key Capabilities & Deliverables

### 2.1 Engineering Release Governance & Manufacturing Handoff Gate (Golden Scenario G4)
- **Drawing Lifecycle & Revisions**: Check-in/check-out workflow with SHA-256 checksum verification, CAD metadata extraction (Siemens NX, dimensions, volume), and append-only version history.
- **Design Freeze Governance Gate**: Explicit `/api/engineering/releases/drawing/:id/freeze` transition locks engineering artifacts (`isFrozen: true`, `manufacturingReady: false`) during cross-functional reviews.
- **Hard Manufacturing Handoff Gate**: Work Order engine (`WorkOrderEngineService`) enforces strict validation preventing Work Order creation against `FROZEN` drawings (`HTTP 400 Bad Request`).
- **Formal Release Execution**: `/api/engineering/releases/drawing/:id/release` transitions drawing to `RELEASED` (`manufacturingReady: true`), immediately enabling downstream manufacturing execution.

### 2.2 BOM Multi-Revision Snapshotting & Deterministic Diff Engine (Golden Scenario G6)
- **Hierarchical Multi-Level BOM**: Top-level tooling assemblies and sub-components with parent-child relationships, make/buy source classification, and unit costs.
- **Hierarchical Cost Rollup**: Real-time rollup engine calculating total assembly costs across multi-tier child items.
- **Immutable Revision Snapshots**: Stored in `engineering_bom_revisions` capturing total costs and frozen item hierarchies.
- **Deterministic Diff Engine**: `/api/engineering/boms/:id/compare/:revA/:revB` computes mathematical diffs classifying each item as `ADDED`, `REMOVED`, `MODIFIED`, or `UNCHANGED`, along with previous total cost, new total cost, and exact cost delta.

### 2.3 Engineering Change Decision Linkage (Golden Scenario G5)
- **Closed-Loop Change Thread**: Seamless lineage linking `EngineeringDecision` (`DEC-{yyyy}-{NNNN}`) $\rightarrow$ `EngineeringChangeRequest` (ECR) $\rightarrow$ `EngineeringChangeOrder` (ECO) $\rightarrow$ `EngineeringChangeNotice` (ECN).
- **Decision Traceability**: Explicit `/api/engineering-changes/ecr/:id/link-decision` endpoint associating structured options, rationale, and approvals with engineering modifications.
- **Shop Floor Dispatch**: Automated ECN issuance to notify tooling departments and CNC machinists of approved changes.

### 2.4 Capacity Leveling with Human-in-the-Loop Approval (Golden Scenario G3 Extension)
- **Read-Only Constraint Analysis**: `/api/planning/leveling/analyze` detects studio bottlenecks and overloads without mutating production schedules.
- **What-If Simulation Engine**: `/api/planning/leveling/simulate` models multi-shift adjustments and outsourcing with zero DB writes.
- **Human-Approved Leveling Execution**: `/api/planning/leveling/apply` requires explicit human approval before executing stage shifts or engineer reassignments, logging structured audit events (`capacity.leveling.applied`).

---

## 3. Verification & Quality Matrix

| Quality Gate | Requirement | Actual Result | Status |
|---|---|---|---|
| **Backend Nest Build** | Clean build (`npm run build`) | Exit code 0, 0 compilation errors | **PASS** |
| **Backend Unit Tests** | 100% pass rate (`npm test`) | **117 suites / 1,157 tests passed** | **PASS** |
| **Schema Validation** | 0 entity-to-DB column drift | 189 entities checked, 0 missing columns | **PASS** |
| **Frontend TypeScript** | Clean typecheck (`npx tsc --noEmit`) | 0 TypeScript errors | **PASS** |
| **Frontend Production Build** | Clean bundle (`npm run build`) | 3,620 modules transformed, 0 errors | **PASS** |
| **Golden Scenario G4 (E2E)** | Release governance & handoff gate | 7 / 7 tests passed | **PASS** |
| **Golden Scenario G6 (E2E)** | BOM revision diff & rollup | 5 / 5 tests passed | **PASS** |
| **Golden Scenario G5 (E2E)** | Change decision linkage | 4 / 4 tests passed | **PASS** |
| **Golden Scenario G3 (E2E)** | Capacity leveling extension | 2 / 2 tests passed | **PASS** |
| **M1 / M2 E2E Suites** | Regression suites | 35 / 35 tests passed | **PASS** |
| **Total Automated E2E** | All 8 suites (`npm run test:e2e`) | **53 / 53 tests passed (100%)** | **PASS** |
| **Cross-Tenant Security** | Tenant A vs Tenant B isolation | 100% forbidden/not-found on cross-tenant calls | **PASS** |

---

## 4. Migration & Schema Impact

- **Database Migrations Executed**:
  - `M3EngineeringKernel1700000000040` (Drawings, BOM Revisions, Change Linkage, Leveling permissions).
- **Breaking Changes**: None. Backwards compatibility with v4.1.2 and v4.2.0 baselines is strictly preserved.
- **Data Integrity**: Zero schema drift across all 189 active TypeORM entities.

---

## 5. Certification Status & Handover

- **Current Status**: **FORMALLY CERTIFIED**
- **Release Tag**: `v4.3.0`
- **Milestone Scope**: M3 Engineering Kernel, Release Governance, BOM Revision Diff Engine, Change Decision Linkage & Capacity Leveling.
