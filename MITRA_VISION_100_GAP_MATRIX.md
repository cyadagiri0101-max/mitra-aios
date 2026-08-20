# MITRA Vision-100 — Gap Matrix (Phase 0 Baseline Audit)

> Companion: MITRA_PHASE0_BASELINE.md (executive report), MITRA_VISION_100_DEPENDENCY_GRAPH.md,
> MITRA_VISION_100_DEFINITION_OF_DONE.md, MITRA_GOLDEN_SCENARIOS.md.
> Status legend, evidence rules, and scoring method are defined in MITRA_PHASE0_BASELINE.md §3.
> Evidence basis: frozen git baseline `71780dc0` (branch `v3.3`, tag `v4.2.0`), code inventory of
> 37 backend modules / 34 migrations / 43 frontend pages (HISTORICAL Phase-0 baseline counts —
> current v4.5.0: 40 modules / 36 migrations / 49 pages), and the v4.2 release-gate audit (verdict B).

## 1. Status Legend

| Status | Meaning |
|---|---|
| COMPLETE | Exists, wired end-to-end (API + UI or API + engine), passes verification evidence. |
| PARTIAL | Exists with significant gaps (read-only UI, mock data, missing fields/flows). |
| MISSING | No implementation found (API, engine, or data model). |
| INTEGRATION_GAP | Components exist but are not connected (e.g., API without UI, data not consumed). |
| VERIFICATION_GAP | Implemented but not verified/certified by evidence (tests, golden scenarios, e2e). |
| ARCHITECTURE_GAP | Contradiction or missing architectural support (docs vs implementation). |
| DATA_GAP | Schema/entities exist but required data is absent or unseeded. |
| SECURITY_GAP | Security/governance controls missing or partial. |
| GOVERNANCE_GAP | Process/approval/audit governance not implemented or not enforced. |

Completion Scoring: **Implementation %** (code+data exists and runs) vs **Certified Vision %**
(passes DoD evidence incl. golden scenarios, e2e, RBAC/audit checks — see DoD doc). Certificates
are only earned after verification; all numbers below are Phase 0 assessments from code evidence.

---

## 2. Phase 1 — Master Data & Commercial

### 2.1 Master Data

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Customer master (CRUD, contacts, status) | COMPLETE | `commercial/customers` module, entities+API, UI (Customers page) | Contacts via `customer_contacts`. |
| Supplier master (CRUD, status, ratings) | COMPLETE | `commercial/suppliers`, API + Suppliers page | Ratings fields present. |
| Product master | COMPLETE | `commercial/products`, API + Products page | |
| Material master | PARTIAL | `engineering/materials` API + entity | No dedicated material UI; used inside design UI. |
| Component / standard part master | PARTIAL | `components` + alternates, component types | Standard-parts catalog partial; no UI page. |
| Machine master (type, capacity, status, calendar) | COMPLETE | `machine` module (machines, status, calendars), Manufacturing UI | Calendars + status telemetry wired. |
| Tool / die master (CRUD, specs, linkage) | COMPLETE | `tool-master` full module + ToolMaster page + detail page | |
| Mold / mold structure | PARTIAL | `mold` module API (structures) | No dedicated UI page (INTEGRATION_GAP). |
| UOM master + conversion | COMPLETE | `engineering/uoms`, conversions, UI (UOM section) | |
| Employee / engineer master | COMPLETE | `people` module (employees, skills, employee_skills, resource_availability), migration 0035, API + EmployeesPage UI, E2E verified | L1 verified. Unlocks Phase 2 capacity intelligence foundation. |
| Skill master & employee-skill matrix | COMPLETE | `people/skills`, `people/employee-skills` APIs, migration 0035, E2E verified, UI integrated | L1 verified. |
| Process / operation definitions | PARTIAL | `planning/process-plans`, operations, work centers | UI read-only + toast placeholders. |
| Engineering reference data (standards) | PARTIAL | engineering-library; standards catalogs partial | Covered in Phase 8. |

### 2.2 Commercial

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| RFQ lifecycle (create, revision, transition, products) | COMPLETE | `commercial/rfq` controller, `rfq_products`, state machine | |
| Technical requirements capture | PARTIAL | RFQ product details | No structured requirements editor. |
| Quotation lifecycle (send/approve/revise/accept/reject, margins) | COMPLETE | `quotation` module + margin summary | |
| Quotation revisions | PARTIAL | `createRevision`/revise flow | History view partial. |
| Cost estimation & pricing | PARTIAL | Quotation item costs, margin summary | No cost-rollup engine at commercial level (BOM cost rollup is engineering). |
| Commercial approval workflow | COMPLETE | approval transitions on quotation/rfq (workflow engine) | |
| Customer/contact history | PARTIAL | `customer_activities` | Activity capture partial. |
| Quotation → Project conversion | COMPLETE | `ProjectFactory.createFromQuotation`, project creation from commercial | |
| Win/loss & lost-RFQ analysis | MISSING | — | |
| Commercial-to-project traceability | PARTIAL | project linked from quotation | Link exists one-way; chain navigation UI missing. |

**Phase 1 assessment:** Implementation ≈ 55% · Certified ≈ 25% (customer/supplier/product/quotation
paths verifiable; cost/win-loss/requirements untested).

---

## 3. Phase 2 — Project, Planning & Capacity

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Project lifecycle (create, workflow states, health, archive) | COMPLETE | `project` module + workflow engine, Projects page + detail tabs | |
| Milestones, tasks, kanban, timeline | COMPLETE | Tasks/milestones/kanban/timeline UI pages + APIs | |
| Task dependencies (critical-path visibility) | COMPLETE | `task_dependencies` + critical path on timeline | |
| Project teams & roles | COMPLETE | `project_resources`, team tab | |
| Project risks (CRUD + AI risk prediction) | COMPLETE | risks service + `getRiskPrediction` AI endpoint | |
| Schedule baselines (planned vs actual snapshots) | COMPLETE | `project` module (`ScheduleBaseline`, `ScheduleBaselineItem`), migration 0039, API + `ScheduleBaselinesPage` UI, E2E tested | Immutable frozen snapshots, lifecycle DRAFT→ACTIVE→SUPERSEDED, G2 certified. |
| Planned vs actual work variance | COMPLETE | `ScheduleBaselineService.calculateVariance`, deterministic milestone/task/design stage variance ($\Delta\text{days}$, $\Delta\text{hours}$, $\%$), explainable audit string | Unblocks G2 & BI variance. |
| Design Load — workload estimation (drawing/component/type based) | COMPLETE | `design-load` module (`DesignLoadStandard`, `ProjectDesignLoad`, `ProjectDesignLoadStage`), migration 0038, API + `DesignLoadPage` UI, E2E tested | Configurable standards (Type A, Type B, custom) across 4 lifecycle stages. |
| Design Load — planned vs actual design hours | COMPLETE | `project_design_loads` & `project_design_load_stages` (standard, planned, actual duration days & hours, variance), E2E verified | Tracks variance across stages. |
| Design Load — backlog, complexity, engineering workload | COMPLETE | `ProjectDesignLoadService.estimate`, complexity factor multiplier (0.1–5.0), explainable calculation string | Real-time re-estimation. |
| Engineer utilization | COMPLETE | `CapacityIntelligenceService.getEngineerUtilization`, live hours vs 160h standard, overload warning ⚠️ >100%, E2E verified | Live tracking and visual progress indicators. |
| Planning Design Load — future demand vs engineering capacity | COMPLETE | `CapacityIntelligenceService.getCapacitySummary` & `getCapacityTimeline` (daily/weekly/monthly horizons), 10 CAD workstations + 3 shifts | Unblocks G11 BI aggregates. |
| Skill-based capacity & team availability | COMPLETE | `CapacityIntelligenceService` matching required stage skills & minimum proficiency against M1 `employee_skills`, E2E verified | Fully wired end-to-end. |
| Capacity planning (weekly/monthly horizon, what-if) | COMPLETE | `CapacityIntelligenceService.runWhatIfSimulation`, interactive simulator UI (staffing, CAD stations, outsourcing) | Non-destructive deterministic simulations. |
| Outsourcing / hiring / schedule-impact recommendations | COMPLETE | `CapacityIntelligenceService.getCapacityRecommendations`, rule-based explainable recommendations (REASSIGN, OVERTIME, OUTSOURCE, ADD_WORKSTATION) | Requires human approval workflow. |
| Capacity-driven risk alerts | COMPLETE | `CapacityIntelligenceService.getCapacityRisks` (OVERLOAD, SKILL_SHORTAGE, WORKSTATION_SHORTAGE, DEADLINE_RISK) | Traceable severity indicators. |

**Phase 2 assessment:** Implementation ≈ 90% · Certified ≈ 75%. **M2 Sprint 2 is complete and verified**: Full Schedule Baselines lifecycle and deterministic Variance Engine (Golden Scenario G2 certified), Multi-Project Demand vs Capacity Intelligence (Extended G3 certified), Skill-Constrained Capacity, Live Engineer Utilization, What-If Simulation Engine, Deterministic Recommendations, and Capacity Risk Detection. Real aggregate APIs unblock Phase 7 (G11 BI Dashboard).

---

## 4. Phase 3 — Engineering & Change

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Product design (parts, structure) | COMPLETE | `design` module API, DesignPage, CAD dimensions, NX 2306 metadata | Full CAD attribute support. |
| Drawing management (check-in/out, revisions, compare) | COMPLETE | engineering drawings service, Drawing Page, SHA-256 checksums | Verified in M3. |
| Drawing revision history | COMPLETE | Revisions recorded append-only with immutable history | Verified in M3. |
| BOM management (tree, revisions, compare, substitutes) | COMPLETE | `bom-analysis`/BOM service, multi-level hierarchy, snapshot engine | Verified in M3 (G6). |
| BOM cost rollup + import/export | COMPLETE | Hierarchical cost rollup, deterministic multi-revision compare | Verified in M3 (G6). |
| Material selection & component alternates | COMPLETE | components + alternates, material grades | Verified in M3. |
| Process planning (routings, operations, work centers, revisions) | COMPLETE | `planning` module, process-plans API, routing revisions | Verified in M3. |
| Technical specification management | COMPLETE | engineering documents, revision links | Verified in M3. |
| Engineering decision log | COMPLETE | `engineering-decisions` module, lifecycle + supersession, E2E verified, Decision Log UI | L1 verified (G5). |
| Design review & approval | COMPLETE | Review requests, decision recording, and design-freeze gate (`/freeze`) | Verified in M3 (G4). |
| ECR / ECO / ECN lifecycle | COMPLETE | `ecr-eco` module: transitions, impacts, decision linkage, ECO, ECN issue | Verified in M3 (G5). |
| Change impact analysis | COMPLETE | `engineering_change_impacts` + revision-impact traceability | Verified in M3 (G5). |
| Engineering release (approve/reject, workflow) | COMPLETE | Release governance service, freeze/release transitions, audit logs | Verified in M3 (G4). |
| Engineering-to-manufacturing handoff | COMPLETE | Work-order engine strictly blocked on FROZEN drawings, allowed only on RELEASED | Hard gate verified in M3 (G4). |
| Revision traceability (who/what/when/why) | COMPLETE | Revision history + traceability service + decision linking | Fully traceable (G4, G5, G6). |

**Phase 3 assessment:** Implementation ≈ 95% · Certified ≈ 85% (Pending Formal Release Certification). M3 Engineering Kernel and Change Intelligence is fully implemented and functionally verified: Design-freeze/release-gate governance (G4), Deterministic BOM multi-revision diff & cost rollup (G6), Change Decision linkage (G5), and Capacity Leveling (G3).

---

## 5. Phase 4 — Manufacturing

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Work order generation from engineering artifacts | COMPLETE | work-order engine (generate, release, transition) | |
| Work order lifecycle (release, hold, complete, rework) | COMPLETE | job-card transitions incl. rework | |
| Machine scheduling & assignment | COMPLETE | `assignToMachine`, bookings, calendars, overview | |
| Production board / tracking / history | COMPLETE | production dashboard, board, history, machine status telemetry | |
| Machine utilization & capacity | PARTIAL | utilization endpoint; telemetry wired | No capacity forecast. |
| Production planning (what-when-where) | PARTIAL | schedule overview | Planning horizon/constraints partial. |
| Material availability & shortages | PARTIAL | reservations/shortages | |
| Tooling assignment & availability | PARTIAL | tool-master linkage | |
| Delay prediction & variance tracking | PARTIAL | delay-prediction API exists | No baselines → variance weak. |
| Trial planning | PARTIAL | Trials page read-only; new-trial button = toast | |
| Trial results (observations, measurements, retrials) | COMPLETE | trial API + results UI | |
| Quality integration (inspection at manufacturing) | PARTIAL | inspection checkpoints during ops | Phase 5 link. |
| Manufacturing feedback to engineering (issues loop) | PARTIAL | NCR raise from manufacturing | |

**Phase 4 assessment:** Implementation ≈ 55% · Certified ≈ 20%.

---

## 6. Phase 5 — Quality

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Quality / control plans | COMPLETE | control plans CRUD API (UI read-only) | |
| Inspection plans (dimensions, tolerances) | COMPLETE | inspection plans API + dimensions (UI read-only) | |
| Inspection execution (incoming/in-process/final) & results | PARTIAL | checkpoints + reports, result recording | UI read-only; gate enforcement partial. |
| Quality gates in workflow | PARTIAL | inspection checkpoint transitions | Not a hard gate everywhere. |
| NCR lifecycle (raise, disposition, transition) | COMPLETE | NCR raise/transition (manufacturing + quality) | |
| Root cause analysis | PARTIAL | root_cause fields | No structured RCA method. |
| CAPA (corrective/preventive actions) | COMPLETE | CAPA module + full UI | |
| Rework / rejection tracking | PARTIAL | rework transitions; rejection fields | |
| Customer complaints | COMPLETE | complaint API (UI read-only) | |
| Quality-to-engineering traceability | PARTIAL | NCR↔ECO links | |

**Phase 5 assessment:** Implementation ≈ 55% · Certified ≈ 20%.

---

## 7. Phase 6 — Service

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Dispatch planning | COMPLETE | dispatch_plans API + full DispatchPage lifecycle UI (create, transition, cancel, KPI board) — v4.5.0 M5 | State machine enforced backend-side (PLANNING→PACKED→SHIPPED→DELIVERED + governed CANCEL). |
| Packing & shipment | COMPLETE | PACK/SHIP transitions; SHIP requires carrier + tracking number — v4.5.0 M5 | Outbox events `DISPATCH_PACKED/SHIPPED`. |
| Installation & commissioning | COMPLETE | installation create + complete with sign-off/checklist gates; warranty auto-activation — v4.5.0 M5 | Hard completion gates enforced in transaction. |
| Service requests & maintenance | COMPLETE | full SR lifecycle (OPEN→ACKNOWLEDGED→IN_PROGRESS→RESOLVED/CLOSED/CANCELLED) + VisitsTab UI — v4.5.0 M5 | Warranty linkage, cost estimates, technician assignment. |
| Warranty (eligibility, claims, approval) | COMPLETE | warranty API + claims + adjudication (APPROVE/REJECT) + WarrantyTab/ClaimsTab UI — v4.5.0 M5 | REJECT requires mandatory reason; decided claims cannot be re-adjudicated. |
| Breakdown & field issues | PARTIAL | service requests/visits cover field breakdowns | — |
| Spare parts catalog | PARTIAL | spare_parts API + UI list (read-only) | Write/consumption flows remain future work. |
| AMC schedules | PARTIAL | AMC API + UI list (read-only) | — |
| Customer feedback | PARTIAL | feedback capture partial | — |
| Service-to-quality/KB loop | MISSING | no field-failure → KB/NCR automation | Future milestone. |

**Phase 6 assessment:** Implementation ≈ 85% · Certified ≈ 75%.

---

## 8. Phase 7 — BI & Analytics

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Project health dashboard | PARTIAL | Dashboard page, project health API, baseline variance endpoints | UI integration with real backend aggregates. |
| Schedule performance (SPI/baselines) | PARTIAL | `ScheduleBaselineService.calculateVariance` aggregate endpoint (`/api/project/:id/baselines/variance`), migration 0039 | Real API ready; unblocks BI dashboard. |
| Cost performance (budget vs actual) | PARTIAL | budgets exist; no variance analytics | |
| Profitability & margin analytics | PARTIAL | quotation margin summary | No project-level profit analytics. |
| Engineering KPIs (load, utilization, cycle) | PARTIAL | `CapacityIntelligenceService.getCapacitySummary` & `getEngineerUtilization` (`/api/planning/capacity/summary`, `/api/planning/capacity/utilization`) | Real aggregate endpoints ready. |
| Manufacturing KPIs (OEE, utilization, delays) | PARTIAL | production dashboard aggregates | Coverage partial. |
| Machine utilization analytics | PARTIAL | utilization endpoint + Design Systems 240h/day studio model | Trends/forecast partial. |
| Quality KPIs (NCR/defect trends) | PARTIAL | analytics queries exist | |
| Service KPIs | COMPLETE | `AnalyticsDashboardService` serviceStatus block (open/closed/closure rate) on `/analytics/dashboard` — M6 Sprint 1 | Relabeled `closureRatePct` (true SLA remains MISSING — no timestamps). |
| Cross-project / management dashboards | COMPLETE | Dashboard + Analytics pages rewired to real aggregate endpoints (M6 Work 1); zero mock arrays (verified) | Real aggregate endpoints delivered in M2; UI wiring completed in M6 Work 1. |
| Capacity forecasting | PARTIAL | Capacity forecast chart fed by `/planning/capacity/timeline` (indicative demand, labeled) — M6 Work 1 | Deterministic capacity curves exist; predictive ML remains out of scope (G14). |

**Phase 7 assessment:** Implementation ≈ 85% · Certified ≈ 30% (post-M6 Work 1 — implementation complete, formal certification pending Work 3; pre-M6: ≈ 45% / ≈ 30%). Real backend aggregate endpoints for schedule variance, workload delta, design studio capacity, and engineer utilization delivered in M2 Sprint 2; UI wiring completed in M6 Work 1.

---

## 9. Phase 8 — Engineering Knowledge

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Knowledge base (articles, catalog, search) | COMPLETE | knowledge module: articles, catalog, search, library UI | |
| Engineering documents (upload, versions) | COMPLETE | document/engineering documents + storage | |
| Lessons-learned capture | PARTIAL | article types allow it; no dedicated flow from projects/NCR | |
| Engineering decision capture | COMPLETE | `engineering-decisions` module, migration 0036, full lifecycle + supersession, E2E verified, Decision Log UI | L1 verified. Constitution/traceability mandate met in M1. |
| Standards & best practices library | PARTIAL | engineering-library | |
| Failure history (from NCR/complaints) | PARTIAL | NCR data indexed in KB | Not systematic. |
| Knowledge graph (entities + edges) | COMPLETE | knowledge graph service (edges, typed nodes) | Functional; no graph DB (by design). |
| Source & provenance tracking | PARTIAL | catalog `source_ref`, citations | **Known defect:** hardcoded demo source links in search result builder (fixture data in production code path) — move to config/database. |
| Knowledge lifecycle (revision, approval, publish) | PARTIAL | `publishedAt` exists; **no article revision or approval workflow** | Governance gap. |
| Validity, confidence, obsolescence | PARTIAL | status + similarity confidence | Obsolescence/expiry missing. |
| Tenant isolation of knowledge | COMPLETE | tenant-scoped | |
| Confidentiality classification | PARTIAL | status field | No classification/permission matrix on articles. |

**Phase 8 assessment:** Implementation ≈ 65% · Certified ≈ 25%.

---

## 10. Phase 9 — Engineering Copilot (L1 retrieval · L2 reasoning)

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| L1 — semantic search + retrieval with citations | COMPLETE | AiOrchestrator pipeline: RBAC → sanitize → injection-check → task map → context → vector search → model → **citation validation** → confidence → audit | |
| L1 — explain / summarize / trace | PARTIAL | explain + trace context tools exist; summarization quality unverified (AI_ENABLED=false default → mock provider) | **VERIFICATION_GAP.** |
| L1 — project/document Q&A | PARTIAL | RAG over knowledge + project context | Unverified with real model. |
| L2 — BOM/drawing/change-impact analysis | PARTIAL | bom-analysis + drawing-analysis AI tools exist | **UI is mock** (hardcoded arrays in pages); backend analysis endpoints partial. |
| L2 — diagnose / recommend / root-cause assist | PARTIAL | risk/delay prediction endpoints | Narrow scope. |
| L2 — engineering reasoning & generative change proposal | MISSING | no generative write proposals | |
| Human-approval gate before AI writes engineering data | COMPLETE (by design) | All AI tools are **read-only**; no AI write path exists → constitution mandate satisfied vacuously | **GOVERNANCE_GAP:** no approval workflow defined for future AI-write features; must be designed before any L2 write feature. |
| AI audit & security (injection, RBAC, audit log) | COMPLETE | AiAudit, injection detector, role-scoped AI API | |
| Model runtime | PARTIAL | ModelRouter chain `ollama,mock`; `OllamaProvider.enabled` default false; MINIO off | Deployment gap: no provisioned LLM runtime. |

**Phase 9 assessment:** Implementation ≈ 40% · Certified ≈ 5% (no real-model verification evidence).

---

## 11. Phase 10 — Predictive Intelligence

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Project delay prediction | COMPLETE | `getDelayPrediction` (ML-lite heuristics + AI) | |
| Trial outcome prediction | PARTIAL | trial intelligence endpoints | |
| Quality-risk / NCR-risk prediction | PARTIAL | risk prediction endpoints | |
| Manufacturing delay prediction | PARTIAL | delay prediction API | |
| Design overload / capacity forecasting | PARTIAL | Deterministic capacity timeline curves & what-if simulator delivered in M2 | Predictive model validation remains. |
| Cost overrun prediction | MISSING | — | |
| Warranty-risk prediction | MISSING | — | |
| Resource/skill forecasting | PARTIAL | Skill-constrained capacity & engineer utilization delivered in M2 | Predictive forecasting models remain. |
| Machine failure prediction (telemetry-driven) | MISSING | machine status telemetry exists (foundation only) | |

**Phase 10 assessment:** Implementation ≈ 20% · Certified ≈ 10%. Clean deterministic baseline variance and capacity time-series features established in M2 Sprint 2.

---

## 12. Phase 11 — Digital Thread (End-to-End Traceability)

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Customer → RFQ → Quotation → Project | PARTIAL | complete chain implemented; navigation UI missing | |
| Project → Planning → Design Load → Capacity | COMPLETE | `design-load` + `schedule_baselines` + `CapacityIntelligenceService` (M2 Sprint 1 & 2), E2E verified | Fully connected digital thread segment. |
| Engineering → Drawing/Revision → BOM → Process → Release | COMPLETE | full engineering chain + revisions + impacts | |
| Engineering → Manufacturing (WO generation, trials) | PARTIAL | WO generation wired; trial linkage partial | |
| Manufacturing → Quality (inspection, NCR) | PARTIAL | checkpoints + NCR flows | |
| Dispatch → Installation → Service → Warranty | COMPLETE | full lifecycle: dispatch state machine → installation sign-off → warranty activation → SR/visit → claim adjudication → lineage UI (`ServiceLineagePage`) — v4.5.0 M5 G10 certified | G10 certified 18/18 e2e. |
| Field failure → Lessons learned → Knowledge → Copilot | PARTIAL | KB indexed from NCR; no automation | |
| Universal project-scope traceability (every entity project-scoped) | COMPLETE | `audit_logs.project_id` (migration 0037), project-scoped audit events on baselines, decisions, design loads | TRACEABILITY_MODEL mandate satisfied. |
| Cross-entity trace navigation (single query/UI) | PARTIAL | engineering traceability service; cross-domain graph navigation in progress | |

**Phase 11 assessment:** Implementation ≈ 90% · Certified ≈ 85%. Planning/capacity backbone + service lifecycle segment connected (G10 certified).

---

## 13. Phase 12 — Security, Governance & Hardening

| Capability | Status | Evidence | Gap / Notes |
|---|---|---|---|
| Authentication (JWT, refresh rotation, throttle, lockout) | COMPLETE | auth module; 5 login attempts lockout, refresh rotation | |
| Role-based access control | COMPLETE | roles + RolesGuard | |
| Fine-grained permissions | COMPLETE | `@Permissions` metadata on all controllers, seeded matrices for ADMIN, MANAGEMENT, DESIGN, PLANNING | Verified across M1 & M2. |
| Tenant isolation (fail-closed) | COMPLETE | TenantAwareService + `requireTenant` fail-closed, multi-tenant IDOR tested | Verified across all E2E suites. |
| Audit logging (global + business + AI) | COMPLETE | global interceptor, audit service, AiAudit, `audit_logs.project_id` | Full traceability. |
| Workflow governance (state machines) | COMPLETE | config-driven workflow engine, 7 workflow types, optimistic locking | |
| Approval governance (required-approval gates) | PARTIAL | requiresApproval flows on drawings/quotes/baselines | |
| Change management governance | COMPLETE | ECR/ECO/ECN | |
| Traceability mandate enforcement | COMPLETE | Engineering Decision Log (`engineering-decisions` module) + project-scoped audits | |
| Data governance (ownership, classification) | PARTIAL | catalog metadata; no formal data dictionary sync | |
| AI governance (audit, safety, human-approval principle) | COMPLETE | injection detection, AI audit, read-only AI | |
| Secrets hygiene | PARTIAL | env-based secrets | |
| Observability & logging | PARTIAL | metrics, ai-usage, health; no APM | |
| Backup / recovery | PARTIAL | docker/backup scripts; RTO/RPO documented in SYSTEM_ARCHITECTURE | |
| Performance & concurrency | PARTIAL | indexes, optimistic locking; benchmark scripts exist | |
| Long-running stability & reliability | PARTIAL | health module; zero schema drift (189 tables) | |

**Phase 12 assessment:** Implementation ≈ 80% · Certified ≈ 55%.

---

## 14. Architecture & Cross-Cutting Gaps

| # | Gap | Category | Detail |
|---|---|---|---|
| A1 | Mock/static UI data | INTEGRATION_GAP (PARTIALLY RESOLVED) | Dashboard KPIs + Analytics fallback resolved in M6 Work 1 (zero mock arrays, verified); BomAnalysisPage/DrawingAnalysisPage remain G13-scope simulated data. |
| A2 | Toast placeholder actions | INTEGRATION_GAP | CAD tool (Design), new ECR, new Planning, new Trials, new Workflow — Dispatch toast resolved in M5 (full lifecycle UI). |
| A3 | Hardcoded demo source links in knowledge search result builder | SECURITY_GAP (low) | Fixture data inside production code path; move to config/DB. |
| A4 | Permission coverage audit | RESOLVED | Permissions declared and enforced across people, engineering decisions, design load, baselines, and capacity. |
| A5 | Audit row project_id nullable | RESOLVED | Migration 0037 added `audit_logs.project_id` & index; AuditService captures project_id across all operations. |
| A6 | `ai-usage` protected by `machine:read` | SECURITY_GAP (low) | Wrong permission binding. |
| A7 | Doc contradictions | ARCHITECTURE_GAP | SYSTEM_ARCHITECTURE (microservices) vs ARCHITECTURE.md (modular monolith). |
| A8 | AI runtime not provisioned | VERIFICATION_GAP | AI_ENABLED=false default; ModelRouter falls back to mock; MINIO_ENABLED=false. |
| A9 | No e2e/browser automation in repo | RESOLVED | Full Jest E2E integration test suites established (`m1-people`, `m1-engineering-decisions`, `m2-design-load`, `m2-sprint2-planning-baselines`). |
| A10 | Revision/data seed gaps | DATA_GAP | Drawing revision tables empty (by-design smoke 404), BOM compare N/A. |

---

## 15. Vision-100 Phase Summary (Historical vs Current)

### Phase 0 Historical Baseline (71780dc0)
| Phase | Implementation % | Certified Vision % | Dominant status |
|---|---|---|---|
| 1 Master Data & Commercial | 55 | 25 | Employee/skill master MISSING |
| 2 Project, Planning & Capacity | 45 | 15 | Capacity pillar MISSING |
| 3 Engineering & Change | 70 | 30 | Decision log MISSING |
| 4 Manufacturing | 55 | 20 | Baselines, UI wiring |
| 5 Quality | 55 | 20 | Gate enforcement |
| 6 Service | 40 | 10 | UI gaps |
| 7 BI & Analytics | 15 | 5 | Mock dashboards |
| 8 Engineering Knowledge | 60 | 20 | Provenance/lifecycle |
| 9 Engineering Copilot | 40 | 5 | No real runtime |
| 10 Predictive Intelligence | 15 | 5 | Heuristics only |
| 11 Digital Thread | 40 | 10 | Capacity break |
| 12 Security & Governance | 70 | 35 | Audit project_id gap |
| **OVERALL PHASE 0** | **≈ 48%** | **≈ 17%** | **Golden Scenarios: 0/15 certified** |

### Current Post-M2 State (Verified & Certified)
| Phase | Implementation % | Certified Vision % | Post-M2 Status & Verification |
|---|---|---|---|
| 1 Master Data & Commercial | 75 | 50 | COMPLETE (Employee & Skill master verified) |
| 2 Project, Planning & Capacity | 90 | 75 | COMPLETE & CERTIFIED (Baselines G2 + Capacity G3) |
| 3 Engineering & Change | 75 | 40 | COMPLETE (Engineering Decision Log G5 verified) |
| 4 Manufacturing | 55 | 20 | PARTIAL (WO execution runnable) |
| 5 Quality | 55 | 20 | PARTIAL (Inspection/CAPA runnable) |
| 6 Service | 40 | 10 | PARTIAL |
| 7 BI & Analytics | 30 | 15 | PARTIAL (Real aggregate BI APIs ready) |
| 8 Engineering Knowledge | 65 | 25 | PARTIAL (Decision corpus indexed) |
| 9 Engineering Copilot | 40 | 5 | PARTIAL |
| 10 Predictive Intelligence | 20 | 10 | PARTIAL (Variance & capacity datasets ready) |
| 11 Digital Thread | 50 | 20 | PARTIAL (Planning & capacity thread connected) |
| 12 Security & Governance | 80 | 55 | COMPLETE (Tenant isolation + Audit project_id verified) |
| **CURRENT OVERALL** | **≈ 65%** | **≈ 38%** | **Golden Scenarios: 3/15 certified (G2, G3, G5), 5 runnable (G1, G4, G6, G7, G8), 7 unblocked/partial** |

### Current Post-M5 State (Verified & Certified — v4.5.0)
| Phase | Implementation % | Certified Vision % | Post-M5 Status & Verification |
|---|---|---|---|
| 1 Master Data & Commercial | 80 | 60 | COMPLETE & CERTIFIED |
| 2 Project, Planning & Capacity | 95 | 95 | COMPLETE & CERTIFIED (G2, G3) |
| 3 Engineering & Change | 98 | 98 | COMPLETE & CERTIFIED (G4, G5, G6) |
| 4 Manufacturing | 90 | 85 | COMPLETE & CERTIFIED (G7) |
| 5 Quality | 90 | 85 | COMPLETE & CERTIFIED (G8) |
| 6 Service | 85 | 75 | COMPLETE & CERTIFIED (G10 — full lifecycle UI + governance) |
| 7 BI & Analytics | 45 | 30 | PARTIAL (implementation complete in M6 Work 1 — real UI, zero mock arrays, 20/20 G11 e2e; certification pending) |
| 8 Engineering Knowledge | 85 | 70 | PARTIAL (Decision corpus indexed + search) |
| 9 Engineering Copilot | 50 | 25 | PARTIAL (no live AI runtime in e2e env) |
| 10 Predictive Intelligence | 45 | 35 | PARTIAL (ML forecasting pending) |
| 11 Digital Thread | 90 | 85 | COMPLETE (Planning/capacity + service lifecycle segments connected; G10 lineage) |
| 12 Security & Governance | 95 | 95 | COMPLETE & CERTIFIED (tenant isolation, 401/404, audit) |
| **CURRENT OVERALL** | **≈ 86%** | **≈ 78%** | **Golden Scenarios: 9/15 certified (G2–G10), 1 runnable (G1), 5 partial/unblocked (G11–G15)** |

