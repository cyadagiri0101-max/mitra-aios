# MITRA M4 — GAP MATRIX & REMEDIATION PLAN
**Shop Floor Execution & Quality Closed Loop**

- **Audit Date**: August 19, 2026
- **Release Target**: MITRA `v4.4.0` / Milestone M4
- **Milestone Baseline**: MITRA `v4.3.0` (`eb6260a9d8be0a76aa3b89ab8b27bd3f9232913c`)
- **Primary Scenarios**: G7 (Work Order Execution), G8 (Inspection $\to$ NCR $\to$ CAPA), G9 (Trial $\to$ Retrial)

---

## 1. M4 Gap Matrix by Scenario & Component

| ID | Domain Area | Scenario | Current State | Identified Gap | Severity | Required M4 Remediation |
|---|---|---|---|---|:---:|---|
| **GAP-M4-01** | Manufacturing | **G7** | Work orders transition to `COMPLETED` based solely on job card sum. | Missing validation gate: Work Order completion does not check if open critical NCRs exist on the work order. | **BLOCKER** | In `WorkOrderEngineService.transition(..., 'COMPLETE')`, query `ncr_records` for the WO. If any NCR with severity `CRITICAL` or `MAJOR` is in `OPEN`, `INVESTIGATION`, or `ACTION` status, reject with `HTTP 400 Bad Request: "Cannot complete work order with unresolved NCRs"`. |
| **GAP-M4-02** | Manufacturing | **G7** | Job cards can be started independently without checking predecessor completion. | Out-of-order execution allows downstream machining/assembly before upstream milling/turning is completed. | **MEDIUM** | In `ShopFloorService.startJob`, check routing operation sequence numbers. If a lower operation number exists on the same WO and is not `COMPLETED`, require explicit supervisor override or enforce sequential order. |
| **GAP-M4-03** | Quality / CAPA | **G8** | `CapaService` is a basic generic `TenantAwareService` without atomic NCR escalation logic. | No direct endpoint to escalate a failed inspection / NCR into a formal CAPA record with root cause & preventive plan. | **HIGH** | Implement `NcrService.escalateToCapa(ncrId, dto, user)` / `CapaService.createFromNcr(ncrId, dto, user)` ensuring bidirectional linkage (`ncr.capaId`, `capa.ncrId`), copy artifact context (`projectId`, `drawingId`, `bomId`, `workOrderId`), and emit `CAPA_INITIATED` outbox event. |
| **GAP-M4-04** | Quality / CAPA | **G8** | CAPA verification and closure does not update linked NCR disposition/verification status. | Fragmented quality loop: closing a CAPA leaves the linked NCR in a disjoint state. | **HIGH** | When CAPA reaches `VERIFIED` and `CLOSED`, automatically verify and advance linked NCR to `VERIFIED` / `CLOSED` with recorded closure timestamp and user ID. |
| **GAP-M4-05** | Quality / Trials | **G9** | `TrialObservationService` records trial observations, but lacks structured retrial initiation and approval. | Trial failure (`result = FAIL`) does not automatically provide a governed retrial creation and approval pipeline. | **HIGH** | Implement `TrialObservationService.requestRetrial(trialId, dto, user)` creating a `Retrial` record with `originalTrialId`, sequence increment (`T0` $\to$ `T1` $\to$ `T2`), reason, and tooling changes; and `approveRetrial` endpoint. |
| **GAP-M4-06** | Quality / Trials | **G9** | Failed trial cannot directly initiate an Engineering Change Request (ECR). | Disconnected digital thread: engineering tool modification requires manual re-entry of trial defects. | **MEDIUM** | Provide seamless trial-to-ECR creation endpoint `/quality/trials/:id/create-ecr` linking `ecr.trialId` and pre-filling defect observations into the ECR description. |
| **GAP-M4-07** | Frontend | **G7, G8, G9** | `TrialsPage.tsx` and `CapaPage.tsx` have stub buttons and minimal UI interactions. | Incomplete frontend user workflows for trial parameter entry and CAPA lifecycle tracking. | **MEDIUM** | Upgrade `TrialsPage.tsx`, `CapaPage.tsx`, `QualityPage.tsx`, and `ManufacturingPage.tsx` with dedicated interactive dialogs, real API integrations, status filters, and digital thread links. |
| **GAP-M4-08** | Verification | **G7, G8, G9** | Milestone integration E2E tests for M4 do not yet exist. | Automated proof for G7, G8, G9 closed loop is required for release gating. | **BLOCKER** | Create `test/m4-shop-floor-execution.e2e-spec.ts` (G7), `test/m4-quality-closed-loop.e2e-spec.ts` (G8), and `test/m4-trial-governance.e2e-spec.ts` (G9). |

---

## 2. Quality Gate Rules (Enforced in M4)

```
[RELEASED Engineering]
        │
        ▼
[Work Order Execution (G7)]
        │
        ├──► Machine Booking & Job Card Start
        │
        ├──► In-Process Inspection Checkpoint
        │          │
        │          ├──► [PASS] ──► Job Card Complete
        │          │
        │          └──► [FAIL] ──► Open NCR Created (G8)
        │                               │
        │                               ▼
        │                     [Quality Barrier Gate]
        │                     Work Order COMPLETE BLOCKED!
        │                               │
        │                               ▼
        │                     Escalate to CAPA
        │                               │
        │                     Root Cause Analysis (5-Why / 8D)
        │                               │
        │                     Implement Corrective Action
        │                               │
        │                     Verify & Close CAPA
        │                               │
        │                     NCR Closed & Verified
        │                               │
        ▼                               ▼
[Work Order COMPLETE] ◄─────────────────┘
        │
        ▼
[Tooling Trial Execution (G9)]
        │
        ├──► [PASS] ────────► Approved for Production Run
        │
        └──► [FAIL] ────────► Governed Retrial (T0 → T1)
                   │
                   └──► ECR Generated (Tool Rework / Cavity Modification)
```

---

## 3. Database & Entity Validation

No breaking database schema migrations are required. The PostgreSQL 16 schema in `mitra_v2` already contains:
- `work_orders`
- `job_cards`
- `operation_logs`
- `machine_master`
- `machine_bookings`
- `inspection_checkpoints`
- `ncr_records`
- `capa_verifications`
- `trial_observations`
- `retrials`

All foreign keys, UUID indices, and `tenant_id` columns exist.
