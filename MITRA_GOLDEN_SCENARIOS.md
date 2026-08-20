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
| G7 | Work-order execution with machine scheduling | P4 | CERTIFIED (Released routing → WO → sequential Job Cards → machine booking conflict check → operation sequencing → production rollup → terminal completion certified in M4) |
| G8 | Inspection → NCR → CAPA closure | P4 + P5 | CERTIFIED (Inspection fail → NCR OPEN → WO completion barrier gate → CAPA escalation → 8D workflow → CAPA closure → NCR auto-closure → WO completion allowed certified in M4) |
| G9 | Trial run with results & retrial decision | P4 + P10 | CERTIFIED (Tooling trial T0 failure → retrial recommendation → human approval → T1 failure → trial-to-ECR creation with full artifact linkage & audit trail certified in M4) |
| G10 | Dispatch → installation → warranty claim | P6 + P11 | CERTIFIED (Dispatch governance state machine, installation sign-off, warranty claims & adjudication, service digital-thread lineage certified in M5) |
| G11 | Real-time BI dashboard (schedule/cost/machine) | P7 | PARTIAL (Real aggregate BI APIs delivered in M2; unblocked for Phase 7 UI wiring) |
| G12 | Knowledge article lifecycle & decision corpus | P8 | PARTIAL (Decision corpus, semantic vector search & article indexing exist; article revision/approval workflow missing — see scenario body) |
| G13 | Copilot L1: cited retrieval Q&A on project docs | P9 + P8 | PARTIAL (L1 citation pipeline, knowledge search & multi-tenant isolation implemented; no real-model certification run recorded — see scenario body) |
| G14 | Predictive: delay forecast vs actual + capacity forecast | P10 + P2 | PARTIAL (Clean deterministic baseline variance & capacity historical data prepared) |
| G15 | Digital thread navigation (quote → service) | P11 | PARTIAL / UNBLOCKED (Planning/capacity + service lifecycle segments connected; unified one-UI graph navigation pending) |

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

### G4 — Engineering design → release (P3) — RUNNABLE / CERTIFIED (M3)
1. Create drawing + BOM + process plan; check-in/out revisions; review approval; release.
2. Verify revision history, traceability service rows, release workflow transitions.
3. UI: Drawing/BOM/Planning pages reflect state (real API data).

### G5 — Change lifecycle with decision log (P3 → P8) — RUNNABLE / CERTIFIED (M3)
1. Raise ECR from released drawing; impact analysis; ECO; ECN issue.
2. Each transition records a **decision-log entry** with rationale + approver (`engineering-decisions` module).
3. Copilot "why did this change happen?" answers from decision corpus.
**Ready for certification:** decision log foundation complete & verified in M1 Sprint 1.

### G6 — BOM cost rollup & revision compare (P3) — RUNNABLE / CERTIFIED (M3)
1. Seeded BOM with 2 revisions + substitutes; compare API; cost rollup to product.
2. CSV import/export round-trip.

### G7 — Work-order execution with machine scheduling (P4) — CERTIFIED (M4)
1. Generate WO from released routing (`POST /api/manufacturing/work-orders/:id/release`) auto-instantiating sequential Job Cards and workflow instances.
2. Finite machine scheduling (`POST /api/manufacturing/scheduling/assign`) with conflict checking preventing overlapping allocations unless supervisor overrides.
3. Predecessor operation sequencing enforced in `startJob`.
4. Production logging and job card completions roll up to parent work order quantities and status.
5. Multi-tenant isolation verified with cross-tenant 404.

### G8 — Inspection → NCR → CAPA closure (P4 → P5) — CERTIFIED (M4)
1. In-process inspection checkpoint fail creates NCR with status `OPEN`.
2. Quality barrier gate prevents WO completion while open `CRITICAL`/`MAJOR` NCR exists.
3. NCR escalates to CAPA (`POST /api/quality/ncr/:id/escalate-capa`).
4. Controlled 8D CAPA workflow executed (Root Cause → Corrective Action → Verification).
5. CAPA closure (`PATCH /api/capa/:id/transition`) automatically transitions linked NCR to `CLOSED`, unblocking WO completion.

### G9 — Trial run with results & retrial decision (P4 → P10) — CERTIFIED (M4)
1. Tooling Trial T0 recorded with real injection molding parameters; defect triggers FAIL.
2. Automatic retrial recommendation triggers Retrial request (`POST /api/quality/trials/:id/request-retrial`).
3. Quality supervisor approves retrial (`POST /api/quality/trials/retrials/:id/approve`).
4. Subsequent Trial T1 fails; formal ECR created directly from trial record (`POST /api/quality/trials/:id/create-ecr`) with full bidirectional artifact linkage (`tool_id`, `trial_id`).
5. Audit trail and multi-tenant isolation verified.

### G10 — Dispatch → installation → warranty (P6 → P11) — PARTIAL
1. Dispatch plan → shipment → installation record → service request → warranty claim approval.
2. Navigation shows full service chain from project.
**Partial:** UI gaps (dispatch/installation forms), service trace navigation missing.

### G11 — Real-time BI dashboard (P7) — PARTIAL / UNBLOCKED (M6 implementation complete; certification pending)
1. Dashboard KPIs (schedule variance, workload delta, machine utilization, design load, capacity gap)
   come from real aggregate endpoints (`/api/planning/capacity/summary`, `/api/planning/capacity/timeline`, `/api/project/:id/baselines/variance`) — **no static arrays**.
2. Filter by project/tenant; drill into variance.
**Status:** Unblocked by M2 Sprint 2 baseline and capacity aggregate APIs. M6 Work 1 rewired the
Dashboard/Analytics UI to real endpoints (zero mock arrays, verified) and delivered
`m6-bi-dashboard.e2e-spec.ts` (20/20 PASS). Formal G11 certification is the M6 Work 3 gate.

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

### Current Post-M5 State (Verified & Certified — v4.5.0)
- **CERTIFIED (9/15):** **G2** (Schedule Baselines & Variance), **G3** (Multi-Project Capacity Intelligence), **G4** (Design Release), **G5** (Change Decision Log), **G6** (BOM Rollup & Diff), **G7** (Work Order Execution), **G8** (Inspection/NCR/CAPA), **G9** (Trial Governance), **G10** (Service Lifecycle Dispatch → Installation → Warranty).
- **RUNNABLE (1/15):** G1 (Quote-to-Project).
- **PARTIAL / UNBLOCKED (5/15):** G11 (BI Dashboard — implementation complete in M6 Work 1; certification pending), G12 (Knowledge Article Lifecycle), G13 (Copilot L1 — real-model run pending), G14 (Predictive Delay/Capacity — data ready), G15 (Digital Thread — segments connected, unified navigation pending).
- **BLOCKED (0/15):** All former foundational Phase 2 capacity/baseline blockers resolved.