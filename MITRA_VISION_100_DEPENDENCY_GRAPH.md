# MITRA Vision-100 — Dependency Graph & Sequencing Model

> Phase 0 baseline audit artifact. Defines the capability dependency model, the critical path to
> Vision-100 (July 2027), shared platform substrate, and sequencing rules. Evidence basis: code
> inventory at frozen baseline `71780dc0` (v4.2.0) — 37 backend modules, 34 migrations, 43 pages.

## 1. Node Model

- **FOUNDATION (F)** — exists, complete: tenant isolation, auth/RBAC/permissions, audit, workflow
  engine, outbox, storage (MinIO pending enablement), search (pgvector/pg_trgm).
- **MASTER DATA (M)** — exists except employee/skill master.
- **CAPABILITY (C)** — domain capability modules (Phases 1–11).
- **INTELLIGENCE (I)** — AI copilot + predictive layer, strictly read-only until approval workflow
  exists (constitution mandate).

Edge rule: `A → B` means "B cannot be certified Vision-100 complete until A is complete".

## 2. Phase-Level Dependency Graph

```
F (platform: tenant/auth/audit/workflow/outbox)
 │
 ├── M1 customer/supplier/product/machine/tool/UOM ──► C1 Commercial (RFQ→Quotation→Project)
 │                                                         │
 │    M2 EMPLOYEE/SKILL MASTER (MISSING) ────────────────► C2 Planning & Capacity  ← critical path
 │                                                         │
 ├── C3 Engineering & Change (drawing/BOM/process/release/ECR-ECO/decision-log)
 │         │                                              │
 │         ├──► C4 Manufacturing (WO/schedule/trials) ────┤
 │         │                                              │
 │         └──► C5 Quality (plans/inspection/NCR/CAPA) ───┤
 │                                                         │
 ├── C6 Service (dispatch/install/warranty) ──────────────► C7 BI & Analytics (needs baselines)
 │                                                         │
 ├── C8 Engineering Knowledge (articles/graph/citations) ──► I1 Copilot L1 (retrieval)
 │                                                              │
 │    C3 decision-log ──► C8 lessons-learned ──► I2 Copilot L2 (reasoning)
 │
 ├── I3 Predictive (delay/quality/trial — exists; capacity/cost/warranty — MISSING, feeds C7)
 │
 ├── C9 Digital Thread (cross-chain trace service) ── depends on C2/C6/C7/C8
 │
 └── C10 Security & Governance (horizontal: permissions audit, AI approval workflow, secrets)
```

### Legend of edges (why)

| Edge | Reason |
|---|---|
| M2 → C2 | Capacity/load/utilization all require engineer identity + skills. **M2 is the single biggest blocker in the graph.** |
| C2 → C7 | Schedule/capacity KPIs require baselines + demand data from C2. |
| C3 → C4 → C5 | Release-gate → WO → inspection chain is the manufacturing thread. |
| C3 → C8 | Decision log is the "why" that knowledge/copilot must surface. |
| C8 → I1 → I2 | L2 reasoning requires citation-grade retrieval (L1) + decision corpus. |
| C4/C5/C6 → C7 | BI aggregates require production/quality/service event data. |
| C6/C2 → C9 | Digital thread certification needs the two currently-broken chain segments (project→capacity, dispatch→service). |
| C10 ⊥ all | Security/permission audit is a parallel hardening track, not a blocker for features (except AI-write approval workflow, which blocks I2 writes). |

## 3. Critical Path to Vision-100 (July 2027)

```
M2 employee/skill master
  → C2 design-load estimation + capacity engine (demand vs availability, what-if)
  → C7 baselines + variance + real-time BI
  → C8 decision log + knowledge lifecycle (revision/approval)
  → I1 copilot L1 certified → I2 copilot L2 (with approval workflow)
  → C9 digital-thread navigation
  → Golden-scenario certification (all 15) → Vision-100 certificate
```

**Critical-path length driver (Phase 0 assessment — HISTORICAL):** C2 (Capacity) was ~0%
implemented at the v4.2.0 baseline and blocked 4 downstream capabilities (C7, C9, I3-cost/capacity,
C2 itself). Start M2 + C2 immediately after Phase 0. **Superseded:** C2 was completed and certified
(G3, M2); the current critical path is G12 (article lifecycle) → G13 (live-model certification) →
G14 (validated predictors) → G15 (unified thread navigation).

## 4. Platform Substrate (shared, must not fork)

| Substrate | Consumers | Status |
|---|---|---|
| Workflow engine (config-driven, optimistic lock) | Commercial approvals, ECR/ECO, WO, NCR, CAPA, releases | COMPLETE — extend, don't rebuild |
| Audit service + `audit_logs` | All business events + AI | COMPLETE — fix `project_id` capture |
| `domain_outbox` | Analytics, integrations, AI context | COMPLETE |
| Tenant-aware services | All modules | COMPLETE (single tenant active) |
| Search (pgvector + pg_trgm fallback) | Knowledge, library, AI retrieval | COMPLETE |
| Storage adapter (MinIO) | Documents, drawings, library | PARTIAL — MinIO disabled in env (enable + wire) |
| Permissions registry (328 rows / 1627 mappings) | All controllers via global PermissionsGuard | PARTIAL — metadata coverage audit needed |

## 5. Sequencing Rules (apply to all backlog items)

1. **Data before intelligence** — no AI/predictive feature is scheduled before its source data
   (master data, baselines, decision log) exists; otherwise it produces mock behavior.
2. **Read-only AI default** — any Copilot L2 write feature is blocked until the AI-approval
   workflow (governance) is implemented and certified (constitution mandate).
3. **Real data before dashboards** — no BI dashboard ships with mock/static arrays; replace A1/A2
   mock UIs (Dashboard, BomAnalysis, DrawingAnalysis) with real endpoints first.
4. **Traceability as acceptance** — every feature's DoD includes its traceability entry
   (project_id on audit rows, decision-log rows where mandated, revision records).
5. **RBAC alongside features** — every new controller endpoint ships with `@Permissions`
   metadata + seeded mapping + guard test; the coverage audit (A4) is a release gate.
6. **Parallelize by substrate** — tracks may proceed in parallel only when they touch different
   substrates; both Capacity (C2) and Service (C6) touch master data → sequence M2 before both.

## 6. Recommended Parallel Tracks (workstreams)

| Track | Scope | Substrate | Depends on |
|---|---|---|---|
| T1 Capacity & Planning | M2, C2, I3-capacity | planning, project, analytics | F only |
| T2 BI & Baselines | C7, baselines, variance | analytics, timeline | T1 baselines feed (partial) |
| T3 Knowledge & Copilot | C8 lifecycle, I1 certify, I2 (read-only first) | knowledge, ai | C3 decision-log |
| T4 Security & Hardening | A4 permission audit, A5 audit project_id, A6 ai-usage, secrets cleanup, MinIO enablement, doc contradiction fix | platform-wide | none |
| T5 Digital Thread & Service | C6 UI completion, C9 trace navigation | service, traceability | T1, T2 |
| T6 Verification & e2e | Playwright golden-scenario suite, API contract tests, perf/soak evidence | repo-wide | none (starts now) |

T4 and T6 start immediately and never block others; T1 is the critical path; T3 unlocks after the
decision log (small, early); T5 finishes last.

## 7. Milestone Mapping (edges → milestones)

| Milestone | Unlocks | Critical edges satisfied |
|---|---|---|
| M1 (Sep–Oct 2026) | T4/T6 hardening, M2, decision log, mock-UI replacement | M2→C2, C3→C8 |
| M2 v5.0 (Nov 2026–Jan 2027) | Capacity engine, baselines, real BI dashboards | C2→C7 |
| M3 v5.5 (Feb–Mar 2027) | Copilot L1 certified, knowledge lifecycle, predictive capacity/cost | C8→I1 |
| M4 v6.0 (Apr–May 2027) | Copilot L2 (read-only + approval workflow), digital thread nav | C6→C9, I1→I2 |
| M5 (Jun–Jul 2027) | Golden-scenario certification → Vision-100 | all |

> NOTE (HISTORICAL): this M1–M5 milestone mapping is the Phase 0 proposal (v5.0/v5.5/v6.0 target
> dates). The actual program delivered M1–M5 as releases v4.1.2 → v4.5.0, all formally certified —
> see MITRA_VISION_100_CURRENT_STATE.md §2.

## 8. Graph Hygiene Rules

- The graph is a living artifact: update it whenever a phase's dominant status changes
  (re-baseline each release).
- Do not add edges that merely reflect UI gaps (UI wiring belongs to INTEGRATION_GAP, not
  capability dependency).
- Certification follows edges: a downstream phase cannot certify on an upstream COMPLETE that is
  only PARTIAL in reality (no "chain of partials").