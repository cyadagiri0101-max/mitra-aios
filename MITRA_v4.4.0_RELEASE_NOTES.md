# MITRA v4.4.0 — Release Notes
## Milestone M4: Shop Floor Execution & Quality Closed Loop
**Release Tag**: `v4.4.0`  
**Baseline Commit**: `eb6260a9d8be0a76aa3b89ab8b27bd3f9232913c` (v4.3.0)  
**Release Date**: August 19, 2026  
**Status**: FORMALLY CERTIFIED  

---

### Highlights & Major Capabilities

MITRA v4.4.0 delivers the full end-to-end operational feedback loop connecting **Engineering Design & Routing**, **Shop Floor Execution & Finite Scheduling**, **In-Process Quality & NCR/CAPA Governance**, and **Tooling Trial & Engineering Change Generation**.

1. **Finite Machine Scheduling & Conflict Prevention (Golden Scenario G7)**:
   - Atomic database transactions in `SchedulingService.assignToMachine`.
   - Real-time overlapping booking detection against `CONFIRMED`/`IN_USE` machine bookings.
   - Supervisor override governance with full audit tracking.

2. **Sequential Shop Floor Execution & Production Rollup (Golden Scenario G7)**:
   - Predecessor operation validation in `ShopFloorService.startJob` preventing out-of-sequence execution on the shop floor.
   - Real-time aggregation of logged quantities and actual labor/machine hours to parent Work Orders.
   - Terminal job card validation requiring all job cards to be `COMPLETED`, `CANCELLED`, or `SCRAPPED` before work order closure.

3. **Closed-Loop Quality Barrier Gate (Golden Scenario G8)**:
   - In-process checkpoint inspection failures immediately create NCR records in `OPEN` status.
   - Hard Quality Barrier Gate in `WorkOrderEngineService` rejecting Work Order completion while unresolved `CRITICAL` or `MAJOR` NCRs exist.
   - Controlled 8D CAPA escalation (`POST /api/quality/ncr/:id/escalate-capa`) establishing linked `CapaVerification`.
   - CAPA closure (`PATCH /api/capa/:id/transition`) automatically synchronizes and closes parent NCRs, allowing clean Work Order completion.

4. **Tooling Trial Governance & Closed-Loop ECR Feedback (Golden Scenario G9)**:
   - Trial execution with real parameter tracking and defect logging.
   - Automated Retrial recommendation on failure with Human-in-the-Loop review and approval workflow (`requestRetrial` $\to$ `approveRetrial`).
   - Direct Engineering Change Request (ECR) drafting (`POST /api/quality/trials/:id/create-ecr`) with full bidirectional artifact linkage to tools, drawings, and trial runs.

5. **Frontend User Experience**:
   - `TrialsPage.tsx`: Complete real-time trials dashboard, parameter logging, retrial review & approval modal, and ECR creation interface.
   - `CapaPage.tsx`: Aligned with `/capa/:id/transition` lifecycle and bidirectional status feedback.

---

### Verification & Quality Summary

- **Backend Unit Tests**: 117/117 suites PASS (1,157/1,157 tests PASS, 100%)
- **M4 Golden Scenarios (G7, G8, G9)**: 3/3 suites PASS (100% deterministic)
- **Combined Milestone E2E (M1–M4)**: 11/11 suites PASS (56/56 tests PASS)
- **Database Schema**: 189 entities / 0 missing columns / 0 schema drift
- **Frontend TypeScript**: 0 errors (`tsc --noEmit` clean)
- **Frontend Production Bundle**: Clean build in 7.55s
- **Security & Multi-Tenant Isolation**: Verified across all modules (HTTP 401 unauthenticated, HTTP 404 cross-tenant)
