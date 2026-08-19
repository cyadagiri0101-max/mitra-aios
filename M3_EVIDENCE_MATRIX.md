# MITRA M3 — EVIDENCE MATRIX
**Engineering Kernel & Change Intelligence Verification**

- **Project**: MITRA Manufacturing Operating System / Engineering Intelligence
- **Release Baseline**: v4.2.0 (`71780dc0`)
- **Branch**: `v3.3`
- **Audit Timestamp**: 2026-08-19T10:15:00+05:30
- **Database**: PostgreSQL 16 (`mitra_v2`, `mitra_v2_test`)

---

## 1. Automated Verification Summary

| Suite / Verification | Command | Test Count | Result | Evidence / Log Ref |
|---|---|---|---|---|
| **Backend Build** | `npm run build` | — | **PASS** (exit 0) | `task-2091` |
| **Backend Unit Tests** | `npm test` | 117 suites / 1,157 tests | **PASS** (100%) | `task-1862` |
| **Schema Validation** | `npm run schema:validate` | 189 entities / 0 missing | **PASS** (0 drift) | `task-2102` |
| **Frontend TypeScript** | `npx tsc --noEmit` | 0 errors | **PASS** (100%) | `task-2075` |
| **Frontend Production Build** | `npm run build` (tsc + vite) | 3,620 modules | **PASS** (exit 0) | `task-2080` |
| **G4 E2E (Release Governance)** | `test/m3-engineering-kernel.e2e-spec.ts` | 7 tests | **PASS** (100%) | `task-2024` |
| **G6 E2E (BOM Diff & Rollup)** | `test/m3-bom-revision-diff.e2e-spec.ts` | 5 tests | **PASS** (100%) | `task-2024` |
| **G5 Regression (ECR $\to$ Decision $\to$ ECO $\to$ ECN)** | `test/m3-change-decision.e2e-spec.ts` | 4 tests | **PASS** (100%) | `task-2024` |
| **G3 Leveling Extension** | `test/m3-capacity-leveling.e2e-spec.ts` | 2 tests | **PASS** (100%) | `task-2024` |
| **M1 / M2 E2E Suites** | `test/m1-*.e2e-spec.ts`, `test/m2-*.e2e-spec.ts` | 35 tests | **PASS** (100%) | `task-2024` |
| **Total Automated E2E** | All 8 suites combined | 53 tests / 53 passed | **PASS** (100%) | `task-2024` |

---

## 2. Golden Scenario G4 — Step-by-Step Evidence (Release Governance & Manufacturing Handoff Gate)

| Step # | Flow Phase | API / Operation | Result | Verification Evidence |
|---|---|---|---|---|
| 1 | Drawing Check-in | `POST /api/engineering/drawings` | 201 Created | Created in `DRAFT` status with CAD attributes (Siemens NX 2306, dimensions, drawingNumber) |
| 2 | Revision Update | `POST /api/engineering/drawings/:id/revisions` | 201 Created | Check-in with SHA-256 checksum and revision change summary |
| 3 | Design Freeze Gate | `POST /api/engineering/releases/drawing/:id/freeze` | 201 Created | Status transitioned to `FROZEN`, `isFrozen: true`, `manufacturingReady: false` |
| 4 | Manufacturing Gate Block | `POST /api/manufacturing/work-orders` (against FROZEN) | **400 Bad Request** | Gate blocked WO creation: *"Drawing must be RELEASED before use in a work order"* |
| 5 | Formal Release | `POST /api/engineering/releases/drawing/:id/release` | 201 Created | Status transitioned to `RELEASED`, releasedBy & releasedAt recorded, `manufacturingReady: true` |
| 6 | Manufacturing Gate Allow | `POST /api/manufacturing/work-orders` (against RELEASED) | **201 Created** | WO created with verified drawing linkage and CNC_MILLING operation |
| 7 | Tenant Isolation | `POST /api/engineering/releases/drawing/:id/release` (Tenant B) | **403/404 Forbidden/Not Found** | Cross-tenant modification strictly denied |

---

## 3. Golden Scenario G6 — Step-by-Step Evidence (BOM Revision Diff & Rollup)

| Step # | Flow Phase | Operation | Result | Verification Evidence |
|---|---|---|---|---|
| 1 | Multi-level BOM | `POST /api/engineering/boms` + items | 201 Created | Hierarchical mold assembly created with child items |
| 2 | Hierarchical Rollup (Rev A) | `GET /api/engineering/boms/:id/cost` | 200 OK | Assembly rollup calculated = $4,500.00 (Base + Pins) |
| 3 | Revision A Snapshot | `POST /api/engineering/boms/:id/revisions` | 201 Created | Revision A snapshot stored in `engineering_bom_revisions` |
| 4 | BOM Evolution (Rev B) | `POST /api/engineering/boms/:id/items` | 201 Created | Added 4x DLC coated ejector sleeves ($1,000.00) |
| 5 | Hierarchical Rollup (Rev B) | `GET /api/engineering/boms/:id/cost` | 200 OK | Assembly rollup updated = $5,500.00 |
| 6 | Revision B Snapshot | `POST /api/engineering/boms/:id/revisions` | 201 Created | Revision B snapshot stored with recorded cost = $5,500.00 |
| 7 | Deterministic Diff Engine | `GET /api/engineering/boms/:id/compare/A/B` | 200 OK | `previousTotalCost: 4500`, `newTotalCost: 5500`, `costDelta: 1000`, `addedCount: 1`, `unchangedCount: 3` |

---

## 4. Change Intelligence & Leveling Evidence (G5 / G3)

- **Change Decision Linkage (G5)**: 
  - `POST /api/engineering-decisions`: Created structured decision with options, context, and rationale.
  - `POST /api/engineering-decisions/:id/submit` and `POST /api/engineering-decisions/:id/approve`: Lifecycle progression to APPROVED.
  - `POST /api/engineering-changes/ecr`: Created ECR with technical change description.
  - `POST /api/engineering-changes/ecr/:id/link-decision`: Explicitly linked decision to ECR with immutable audit log.
  - `POST /api/engineering-changes/eco`: Created implementation plan and linked to ECR.
  - `POST /api/engineering-changes/eco/:id/ecn`: Issued formal notification to toolroom and manufacturing.
- **Capacity Leveling Governance (G3)**:
  - `GET /api/planning/leveling/analyze`: Read-only constraint and bottleneck detection without mutating production schedule.
  - `POST /api/planning/leveling/simulate`: Pure what-if simulation (0 DB mutation).
  - `POST /api/planning/leveling/apply`: Human-approved stage and engineer reassignment with audit log emission (`capacity.leveling.applied`).

---

## 5. Security & Multi-Tenant Isolation Evidence

- **Tenant A vs Tenant B Isolation**:
  - Drawing Access across Tenants: **403 Forbidden / 404 Not Found** (PASS)
  - BOM Compare across Tenants: **403 Forbidden / 404 Not Found** (PASS)
  - Decision Log across Tenants: **403 Forbidden / 404 Not Found** (PASS)
  - Unauthenticated API Requests: **401 Unauthorized** (PASS)
  - Audit Trail Integrity: Scoped with `tenant_id` and `project_id`.

---

## 6. Vision-100 Status Classification

- **G4 (Release Governance)**: FORMALLY CERTIFIED
- **G6 (BOM Revision Diff)**: FORMALLY CERTIFIED
- **G5 (Change Decision Linkage)**: FORMALLY CERTIFIED
- **G3 (Capacity Leveling)**: FORMALLY CERTIFIED
