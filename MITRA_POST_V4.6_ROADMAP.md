# MITRA — Post-v4.6.0 Milestone Roadmap
## Authoritative Architecture & Execution Plan
**Baseline:** `v4.6.0` (M6 Certified)  
**Target Horizon:** Vision-100 Full Realization (M7 → M11)  
**Governing Principle:** Milestone Dependency Order — No implementation out of sequence.

---

## Roadmap Overview

```
 ┌──────────────────────────────────────────────────────────────────┐
 │ [COMPLETED] M1–M6 Baseline (v4.6.0)                              │
 │ People, Baselines, Kernel, Shop Floor, Service, BI Analytics     │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │ [COMPLETED & CERTIFIED] M7: Engineering Knowledge Library & G13 │
 │ (19.4k File Ingestion, Hybrid Index, Local Phi-3 Grounded Q&A)   │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │ M8: G12 Lifecycle & Decision Intelligence                        │
 │ (Knowledge Article Workflow, Decision Corpus, Supersession)      │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │ M9: G14 Predictive Intelligence & Model Governance               │
 │ (ML Delay Forecast, Capacity Projections, Model Registry)        │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │ M10: G15 Unified Digital Thread & Graph Exploration              │
 │ (End-to-End Lineage API, Interactive Graph UI, Audit Trace)      │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │ M11: Enterprise Hardening & Vision-100 Final Certification       │
 │ (Test Fixture Repair, Multi-tenant Stress, Air-gapped Packaging) │
 └──────────────────────────────────────────────────────────────────┘
```

---

## Detailed Milestone Specifications

### Milestone M7: Engineering Knowledge Library + G13 Intelligent Search & RAG
- **Objective:** Connect the 19,402 engineering files in `MitraEngineeringLibrary` to the MITRA AI pipeline and certify G13 Copilot L1 cited retrieval with a live local Phi-3 model.
- **Prerequisites:** M6 baseline (`v4.6.0`), local Ollama runtime with `phi3:mini` model pulled.
- **Scope:**
  - Ingestion pipeline for `MitraEngineeringLibrary` (Drawings, STEP/CAD metadata, Excel BOMs, Process Plans, Index Sheets).
  - Domain entity taxonomy linking (Machine, Material, Tool, Customer, Prefix BM/IM/PD).
  - Tabular chunking preserving table structure & engineering units.
  - Multi-tenant vector + BM25 hybrid indexing in `knowledge_embeddings`.
  - Live Phi-3 model integration via `ollama-model.provider.ts` with strict citation verification (`[REF-x]`).
  - G13 real-model end-to-end E2E test suite.
- **Non-Scope:** Modifying raw library source files, ML training (deferred to M9), graph visualization (deferred to M10).
- **Golden Scenario:** **G13** — User asks technical question → Vector/keyword retrieval finds authoritative engineering sheet → Context constructed with citations → Phi-3 responds with exact drawing/sheet/row citation → AI audit logged.
- **Certification Gate:** 100% pass on real-model RAG test with zero hallucinated references and complete source provenance.
- **Exit Criteria:** Engineering library indexed, G13 Golden Scenario certified.

---

### Milestone M8: G12 Lifecycle & Decision Intelligence
- **Objective:** Implement full lifecycle governance for Knowledge Articles and unify with the Engineering Decision Corpus.
- **Prerequisites:** M7 completion.
- **Scope:**
  - `KnowledgeArticle` lifecycle state machine (`DRAFT` → `UNDER_REVIEW` → `PUBLISHED` → `SUPERSEDED` / `ARCHIVED`).
  - Approval workflow and role-based publishing rights (`RolesGuard`, `@Permissions`).
  - Knowledge expiry & revision versioning with immutable snapshots.
  - Bidirectional linking between Engineering Decisions, ECR/ECO, and Knowledge Articles.
  - Unified search returning both structured decision logs and published articles.
- **Non-Scope:** External CRM/ERP document sync.
- **Golden Scenario:** **G12** — Engineer creates troubleshooting article → Quality Lead approves and publishes → Superseded on design change → Decision search returns revision lineage with audit trail.
- **Certification Gate:** `m8-knowledge-lifecycle.e2e-spec.ts` passing all lifecycle state transitions.
- **Exit Criteria:** G12 Golden Scenario certified.

---

### Milestone M9: G14 Predictive Intelligence & Model Governance
- **Objective:** Transition from deterministic variance to trained statistical and machine learning predictive models for schedule delay and capacity bottlenecks.
- **Prerequisites:** M8 completion, accumulated historical variance and shop floor telemetry.
- **Scope:**
  - Machine learning delay prediction engine replacing `NOT_CONFIGURED` in `ai-projection.service.ts`.
  - Statistical capacity deficit forecasting with confidence intervals.
  - Model registry, versioning, and explainability payloads (reasons, confidence score $\in [0, 1]$).
  - Human-in-the-loop validation for AI-recommended timeline adjustments.
- **Non-Scope:** Autonomous unapproved schedule reordering.
- **Golden Scenario:** **G14** — Delay prediction generated for active mold project → Compared against baseline milestones → Risk level and explainable rationale outputted → Leveling recommendation presented for human approval.
- **Certification Gate:** Predictive accuracy evaluation against historical project completions with documented confidence bounds.
- **Exit Criteria:** G14 Golden Scenario certified.

---

### Milestone M10: G15 Unified Digital Thread & Graph Exploration
- **Objective:** Unify all 15 lifecycle hops into an interactive, clickable Digital Thread Graph in the UI backed by a high-performance thread traversal API.
- **Prerequisites:** M9 completion.
- **Scope:**
  - End-to-end lineage API (`GET /api/digital-thread/:projectId` or `:entityId`) traversing Inquiry → RFQ → Quote → Project → Design → BOM → Routing → WO → Job Card → Inspection → NCR → CAPA → Trial → ECR/ECO → Dispatch → Installation → Warranty → Claim.
  - Interactive SPA Canvas / Graph Visualizer component in frontend.
  - Audit trail reconstruction showing complete timeline and actor identity across every hop.
  - Bidirectional navigation allowing click-through from warranty claim back to initial CAD drawing and tool trial.
- **Non-Scope:** Third-party PLM cloud sync.
- **Golden Scenario:** **G15** — Quality engineer clicks warranty claim in UI → Explores unbroken digital thread back through field visit, dispatch, T0 trial, CAPA, WO job card, BOM revision, and original quotation.
- **Certification Gate:** `m10-digital-thread.e2e-spec.ts` testing 15-hop continuity without broken foreign keys or missing trace IDs.
- **Exit Criteria:** G15 Golden Scenario certified.

---

### Milestone M11: Enterprise Hardening & Vision-100 Final Release Certification
- **Objective:** Resolve all baseline test fixture issues, clean dead schema columns, execute full multi-tenant stress tests, and certify 100% Vision-100 readiness.
- **Prerequisites:** M10 completion.
- **Scope:**
  - Fix `tenant-isolation.e2e-spec.ts` test fixture (BOM creation preconditions).
  - Clean dead columns in `engineering_boms` and `project_folders` via clean TypeORM migration.
  - Multi-tenant stress testing (concurrency, cross-tenant isolation under load).
  - Air-gapped packaging & production deployment verification runbook.
  - Full Vision-100 sign-off and formal audit closure.
- **Certification Gate:** 100% green test suite across all unit, integration, and E2E suites with zero skipped or fixture-compromised tests.
- **Exit Criteria:** Vision-100 fully certified release tag (`v5.0.0`).
