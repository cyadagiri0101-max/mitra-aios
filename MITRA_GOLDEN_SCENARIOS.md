# MITRA Golden Scenarios — End-to-End Certification Scenarios (Vision-100)

> Phase 0 baseline audit artifact. 15 cross-phase golden scenarios that must pass at L2
> (Definition of Done) before a phase earns **Certified Vision %**. Each scenario runs against a
> fresh seeded tenant on a tagged release; evidence = trace IDs, audit rows, API 2xx/4xx
> contract, and UI captures. Where a scenario is currently BLOCKED, the blocker is named.

## Scenario Map (phase coverage in brackets)

| # | Scenario | Coverage | Baseline status |
|---|---|---|---|
| G1 | Quote-to-Project handoff | P1 commercial → P2 project | RUNNABLE (partial) |
| G2 | Project planning with baselines | P2 | RUNNABLE / CERTIFIED (Schedule baselines, immutable snapshots, DRAFT→ACTIVE→SUPERSEDED lifecycle & variance engine certified in M2 Sprint 2) |
| G3 | Capacity plan (demand vs availability) | P2 + P1 employee master | CERTIFIED (Capacity intelligence, skill-constrained utilization, explainable leveling recommendations & human approval workflow verified) |
| G4 | Engineering design → release | P3 | CERTIFIED (Drawing revisions, CAD dimensions, design freeze gate, hard manufacturing handoff gate & formal release governance certified) |
| G5 | Change lifecycle (ECR→ECO→ECN) with decision log | P3 + P8 | CERTIFIED (Decision log lifecycle, supersession, ECR linking, ECO generation, ECN dispatch & project-scoped audit trail certified) |
| G6 | BOM cost rollup & revision compare | P3 | CERTIFIED (Multi-level BOM hierarchy, hierarchical cost rollup, immutable revision snapshots & deterministic diff engine certified) |
| G7 | Work-order execution with machine scheduling | P4 | RUNNABLE (partial) |
| G8 | Inspection → NCR → CAPA closure | P4 + P5 | RUNNABLE (partial) |
| G9 | Trial run with results & retrial decision | P4 + P10 | PARTIAL |
| G10 | Dispatch → installation → warranty claim | P6 + P11 | PARTIAL (UI gaps) |
| G11 | Real-time BI dashboard (schedule/cost/machine) | P7 | PARTIAL (Real aggregate BI APIs delivered in M2; unblocked for Phase 7 UI wiring) |
| G12 | Knowledge article lifecycle & decision corpus | P8 | PARTIAL (no article revision) |
| G13 | Copilot L1: cited retrieval Q&A on project docs | P9 + P8 | PARTIAL (no real model run) |
| G14 | Predictive: delay forecast vs actual + capacity forecast | P10 + P2 | PARTIAL (Clean deterministic baseline variance & capacity historical data prepared) |
| G15 | Digital thread navigation (quote → service) | P11 | BLOCKED (segments missing) |

---

### G1 — Quote-to-Project handoff (P1 → P2) — RUNNABLE
1. Create customer → RFQ → RFQ products → quotation → approve.
2. Convert quotation to project via `ProjectFactory.createFromQuotation`.
3. Verify: project carries commercial lineage; customer activity recorded; audit rows include
   project_id; UI Projects page shows project.
**Pass:** chain links intact, 2xx everywhere, audit evidence captured.

### G2 — Project planning with baselines (P2) — RUNNABLE / CERTIFIED (M2 Sprint 2)
1. Create project with schedule (milestones and tasks with durations and estimated hours).
2. Create immutable baseline snapshot BL-0001 (`POST /api/project/:projectId/baselines`).
3. Activate baseline BL-0001 (`POST /api/project/:projectId/baselines/:id/activate`); verify locked status.
4. Modify live schedule (advance dates, change task estimated hours/durations).
5. Deterministic Variance Engine (`GET /api/project/:projectId/baselines/variance`) calculates milestone, task, and design stage variances ($\Delta\text{days}$, $\Delta\text{hours}$, $\%$), schedule health status, and explainable audit string.
6. Create BL-0002 snapshot on scope change; activate BL-0002.
7. Verify BL-0001 snapshot items remain completely immutable and status transitions to `SUPERSEDED`.
8. Audit events (`baseline.created`, `baseline.activated`, `baseline.superseded`) with `project_id` scoping verified.
9. Multi-tenant IDOR protection verified (Tenant B receives 404).

### G3 — Capacity plan: demand vs availability (P2) — RUNNABLE / CERTIFIED (M2 Sprint 2 Extended)
1. Employee/skill master and availability foundation active (M1 Sprint 1).
2. Configurable design standards (Type A, Type B, custom), stage duration breakdown, and complexity multipliers (M2 Sprint 1).
3. Multi-project design demand aggregation across Daily, Weekly, and Monthly time horizons (`GET /api/planning/capacity/timeline`).
4. 8-dimensional capacity accounting: theoretical workstation capacity (240.0 h/day), available workstation capacity, total engineer capacity, skill-constrained eligible capacity, allocated capacity, used capacity, remaining headroom, and net capacity deficit (`GET /api/planning/capacity/summary`).
5. Live engineer utilization report with allocated vs actual hours, overload detection (⚠️ $>100\%$), and verified skill proficiencies (`GET /api/planning/capacity/utilization`).
6. Deterministic What-If scenario simulation engine (`POST /api/planning/capacity/what-if`) modeling staffing additions, workstation expansions, and workload outsourcing without modifying production planning state.
7. Deterministic capacity leveling recommendations (REASSIGN, OVERTIME, OUTSOURCE, ADD_WORKSTATION) and risk alerts (OVERLOAD, SKILL_SHORTAGE, WORKSTATION_SHORTAGE, DEADLINE_RISK).

### G4 — Engineering design → release (P3) — RUNNABLE
1. Create drawing + BOM + process plan; check-in/out revisions; review approval; release.
2. Verify revision history, traceability service rows, release workflow transitions.
3. UI: Drawing/BOM/Planning pages reflect state (real API data).

### G5 — Change lifecycle with decision log (P3 → P8) — RUNNABLE (decision log complete)
1. Raise ECR from released drawing; impact analysis; ECO; ECN issue.
2. Each transition records a **decision-log entry** with rationale + approver (`engineering-decisions` module).
3. Copilot "why did this change happen?" answers from decision corpus.
**Ready for certification:** decision log foundation complete & verified in M1 Sprint 1.

### G6 — BOM cost rollup & revision compare (P3) — RUNNABLE
1. Seeded BOM with 2 revisions + substitutes; compare API; cost rollup to product.
2. CSV import/export round-trip.
**Note:** needs seeded revision data (DATA_GAP A10) — the v4.2 by-design 404 must be replaced by
real comparison output.

### G7 — Work-order execution with machine scheduling (P4) — RUNNABLE
1. Generate WO from released artifact; assign machine; transitions to completion incl. rework.
2. Production board + history show real data; machine status telemetry updates.

### G8 — Inspection → NCR → CAPA closure (P4 → P5) — RUNNABLE
1. Inspection plan with dimensions; fail checkpoints → NCR; RCA fields; CAPA; closure.
2. Quality gates block WO completion until checkpoints pass.

### G9 — Trial run with results & retrial decision (P4 → P10) — PARTIAL
1. Trial planned; observations + measurements recorded; retrial decision.
2. Trial-intelligence predictor output compared to actual outcome.
**Partial:** predictor accuracy unvalidated (VERIFICATION_GAP).

### G10 — Dispatch → installation → warranty (P6 → P11) — PARTIAL
1. Dispatch plan → shipment → installation record → service request → warranty claim approval.
2. Navigation shows full service chain from project.
**Partial:** UI gaps (dispatch/installation forms), service trace navigation missing.

### G11 — Real-time BI dashboard (P7) — PARTIAL / UNBLOCKED (Phase 2 delivered)
1. Dashboard KPIs (schedule variance, workload delta, machine utilization, design load, capacity gap)
   come from real aggregate endpoints (`/api/planning/capacity/summary`, `/api/planning/capacity/timeline`, `/api/project/:id/baselines/variance`) — **no static arrays**.
2. Filter by project/tenant; drill into variance.
**Status:** Unblocked by M2 Sprint 2 baseline and capacity aggregate APIs; Phase 7 BI dashboard UI wiring remains.

### G12 — Knowledge article lifecycle & decision corpus (P8) — PARTIAL
1. Article create → draft → review → publish (revisionable); expiry marking.
2. Decision-log entries auto-indexed; search returns decision evidence with provenance (`engineering-decisions` complete).
**Partial:** article revision/approval workflow missing.

### G13 — Copilot L1: cited retrieval Q&A (P9 → P8) — PARTIAL
1. With AI runtime provisioned (AI_ENABLED=true, Ollama/OpenAI), ask a question about a project.
2. Answer carries validated citations (source_ref from DB), confidence gate, AI audit row,
   role-scoped RBAC, injection attempt rejected.
**Partial:** no real-model run recorded (A8); recommend running against both providers.

### G14 — Predictive: delay & capacity forecasts (P10 → P2) — PARTIAL
1. Delay prediction for a project; compare to actual at completion (accuracy metric).
2. Capacity forecast chart fed by capacity engine.
**Status:** M2 Sprint 2 provides clean deterministic baseline variance and time-distributed capacity datasets; predictive model training & forecast accuracy validation remain in Phase 10.

### G15 — Digital thread navigation (P11) — PARTIAL / UNBLOCKED (Phase 2 segment)
1. Single navigation from a quotation through project → planning → design load → capacity → BOM → WO → inspection → NCR →
   CAPA → dispatch → installation → service.
2. Every hop shows trace IDs; audit trail reconstructs the full chain.
**Status:** Project → Planning → Design Load → Capacity digital thread segment completed and connected in M2; service UI (G10) and final unified graph navigation remain.

---

## Evidence Requirements (every scenario)
- Playwright / E2E run script per scenario in `test/` and `tooling/e2e/` (T6 track).
- Evidence bundle: API request/response log, audit_log rows (with project_id), screenshots for UI
  hops, and scenario pass/fail summary committed to the release audit report.
- A scenario is **certified** only on a tagged release with the independent verifier sign-off
  (see DoD §6).

## Certified vs Historical Baseline Summary

### Phase 0 Historical Baseline (71780dc0)
- Runnable (with seed work): G1, G4, G6, G7, G8.
- Partial (one or two blockers each): G5, G9, G10, G12, G13, G14.
- Blocked (foundational gaps): G2, G3, G11, G15.
- **Golden-scenario certified coverage at Phase 0 baseline: 0/15.**

### Current Post-M2 State (Verified & Certified)
- **CERTIFIED (3/15):** **G2** (Schedule Baselines & Variance), **G3** (Multi-Project Capacity Intelligence), **G5** (Engineering Decision Log & Change Traceability).
- **RUNNABLE (5/15):** G1 (Quote-to-Project), G4 (Design Release), G6 (BOM Rollup), G7 (Work Order Execution), G8 (Inspection/CAPA).
- **PARTIAL / UNBLOCKED (7/15):** G9 (Trials), G10 (Service), G11 (BI Dashboard — API ready), G12 (Knowledge Article), G13 (Copilot L1), G14 (Predictive Delay/Capacity — Data ready), G15 (Digital Thread — Planning segment ready).
- **BLOCKED (0/15):** All former foundational Phase 2 capacity/baseline blockers resolved.