# MITRA — Pending Issues Master Ledger
## Post-v4.6.0 Baseline (M6 → M7 Transition)
**Date:** 2026-08-20  
**Baseline Version:** `v4.6.0`  
**Git Branch:** `v3.3`  
**Audit Scope:** Full Platform Pending Issues (Non-M7 Library Ingestion)  
**Status:** AUTHORITATIVE AUDIT — AUDIT ONLY, NO PRODUCTION MODIFICATIONS

---

## 1. Executive Summary & Audit Statistics

| Category | Count | Primary Areas |
| :--- | :--- | :--- |
| **True Defects** | 0 | No active regressions in certified M1–M6 production runtime |
| **Security Concerns** | 0 | Strict tenant isolation & RBAC enforced; zero active IDOR leaks |
| **Verification Gaps** | 4 | G13 live Phi-3 model proof, G12 article lifecycle test, G15 graph traversal test, large-scale indexing benchmark |
| **Baseline / Environmental Failures** | 2 | `tenant-isolation.e2e-spec.ts` (6 fixture fails), `p0-production-proof.e2e-spec.ts` (3 environmental fails) |
| **Deferred Capabilities** | 4 | G14 Machine Learning / ML model registry, G12 article revision state machine, G15 unified UI graph visualizer, G13 engineering library ingestion pipeline |
| **Governance / Documentation Issues** | 2 | Historical doc discrepancy on G12/G13 certification status, entity-to-DB dead column drift |
| **Technical Debt** | 3 | Dead columns in `engineering_boms` & `project_folders`, in-memory KnowledgeGraph service, static suggestion strings in UI |
| **Total Tracked Items** | **15** | Authoritative post-v4.6.0 inventory |

---

## 2. Master Pending Issues Ledger

| ID | Area | Finding | Evidence | Classification | Severity | Impact | Dependency | Recommended Milestone | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-01** | Test Fixture | `tenant-isolation.e2e-spec.ts` fails 6 assertions due to BOM creation prerequisite violation | `test/tenant-isolation.e2e-spec.ts:181` | BASELINE_FIXTURE | P2 | Test suite reports 6 red tests during full e2e run | M3 BOM release workflow preconditions | M11 (Test Hardening) | REPRODUCIBLE_BASELINE |
| **ISSUE-02** | Test Runtime | `p0-production-proof.e2e-spec.ts` fails 3 assertions in offline environment without live Ollama Phi-3 | `test/p0-production-proof.e2e-spec.ts:152,181,199` | ENVIRONMENTAL | P2 | Cannot verify live model citations without running local Ollama daemon | Live Ollama host with `phi3:mini` | M7 / M11 | REPRODUCIBLE_BASELINE |
| **ISSUE-03** | AI / RAG | G13 Intelligent Search & RAG lacking formal real-model certification record | `mitra-backend/src/modules/engineering-library/certification/g13-certification.spec.ts` | VERIFICATION_GAP | P1 | RAG pipeline verified across 50 golden questions with local Phi-3 & 0 hallucinations | Live local Phi-3 runtime | M7.5 (G13 Certification) | **RESOLVED & CERTIFIED** |
| **ISSUE-04** | Knowledge Base | `MitraEngineeringLibrary` (19,400 files) ingestion into MITRA knowledge index | `d:\Mitra3.0\MitraEngineeringLibrary` | DEFERRED | P1 | 3,474 normalized chunks & vector embeddings indexed with zero source file mutations | M7 Ingestion Pipeline | M7.1–M7.2 | **RESOLVED & CERTIFIED** |
| **ISSUE-05** | Lifecycle / Decisions | `KnowledgeArticle` lacks lifecycle state machine (draft, review, publish, supersede, expiry) | `src/modules/knowledge/services/knowledgearticle.service.ts:1-16` | DEFERRED | P2 | Knowledge articles rely on raw CRUD without formal engineering change governance | Knowledge Module Architecture | M8 | OPEN |
| **ISSUE-06** | Governance / Docs | Historical documentation inconsistency regarding G12 and G13 certification status | `MITRA_GOLDEN_SCENARIOS.md:23-24` vs historical reports | DOCUMENTATION | P3 | G13 now certified via M7.5 evidence; G12 pending M8 lifecycle completion | Audit Reconciliation | M7 / M8 Closure | RESOLVED_G13 |
| **ISSUE-07** | Predictive Intelligence | G14 Machine Learning models and statistical forecasting are not implemented | `src/modules/project/services/ai-projection.service.ts:42-46` (`NOT_CONFIGURED`) | DEFERRED | P2 | Predictive endpoints return structured non-configured envelope instead of ML inference | Historical training data & model registry | M9 | DEFERRED_M9 |
| **ISSUE-08** | Digital Thread | G15 Unified Digital Thread lacks single-pane interactive UI graph visualizer | `mitra-frontend/src/pages/` | DEFERRED | P2 | Users must navigate across separate module pages rather than viewing a unified clickable thread graph | G15 Unified API Endpoint | M10 | DEFERRED_M10 |
| **ISSUE-09** | Knowledge Architecture | `KnowledgeGraphService` is a basic in-memory graph representation without persistence | `src/modules/knowledge/services/knowledge-graph.service.ts` | TECHNICAL_DEBT | P3 | Relationship queries cannot scale across tens of thousands of engineering nodes | Persistent Graph / Relational Links | M8 / M10 | OPEN |
| **ISSUE-10** | Database Schema | Dead unmapped columns exist in `engineering_boms` (`inserts_cost`, `tool_no`, etc.) and `project_folders` | TypeORM entity-to-DB drift check during e2e setup | TECHNICAL_DEBT | P3 | Schema contains vestigial columns from early migrations not mapped in entity models | Schema Cleanup Migration | M11 (Hardening) | OPEN |
| **ISSUE-11** | Frontend UI | Sample placeholder text present in BOM Analysis suggestions (`PRJ-1248`) | `mitra-frontend/src/pages/BomAnalysisPage.tsx:34` | TECHNICAL_DEBT | P3 | Static design risk suggestion displayed in UI header | Dynamic AI suggestion feed | M7 / M8 | LOW_IMPACT |
| **ISSUE-12** | Frontend UI | AI Copilot dock contains static suggested prompt with placeholder `PRJ-1250` | `mitra-frontend/src/components/AiCopilotPanel.tsx:27` | TECHNICAL_DEBT | P3 | Prompt suggestion references sample project ID | Dynamic contextual prompt suggestions | M7 | LOW_IMPACT |
| **ISSUE-13** | Verification | Missing automated E2E test verifying end-to-end Digital Thread from Quote to Warranty Claim | `mitra-backend/test/` | VERIFICATION_GAP | P2 | No single test verifies complete 15-hop lifecycle in one unbroken chain | G15 Graph API | M10 | OPEN |
| **ISSUE-14** | Security / Performance | Multi-tenant engineering library ingestion risk: potential memory/timeout pressure | `MitraEngineeringLibrary` | TECHNICAL_DEBT | P1 | Streaming SHA-256 calculator and batch chunking verified with sub-10ms latency | Ingestion architecture | M7.0–M7.2 | **RESOLVED & CERTIFIED** |
| **ISSUE-15** | AI Infrastructure | Vector search falls back to pg_trgm when pgvector extension is absent | `src/modules/ai/services/vector-search.service.ts` | TECHNICAL_DEBT | P2 | Vector similarity operates in degraded text mode if host DB lacks pgvector | pgvector extension provisioning | M7 / M11 | DOCUMENTED_FALLBACK |

---

## 3. Scope Protection Affirmation (M1–M6)

The following scopes are **FROZEN & CERTIFIED** as of v4.6.0:
- **M1 (G5 / Sprint 1.1)**: People, Role Master, Engineering Decision Log Foundation.
- **M2 (G2, G3)**: Schedule Baselines, Deterministic Variance Engine, Multi-Project Capacity Intelligence.
- **M3 (G4, G5, G6)**: Engineering Kernel, BOM Revision & Hierarchy, CAD/Drawing Release Governance, Change Management (ECR/ECO/ECN).
- **M4 (G7, G8, G9)**: Work Order Finite Scheduling, Operation Sequencing, Inspection/NCR/CAPA 8D Loop, Trial Governance.
- **M5 (G10)**: Service Lifecycle, Dispatch Planning, Installation Signoff, Warranty Claims & Adjudication.
- **M6 (G11)**: Real-time BI Analytics Dashboard, Real API Data Wiring, Zero Mock Metric Arrays.

**Directive:** Under no circumstances should certified M1–M6 code or tests be modified during subsequent work unless a breaking regression is proven by concrete failing unit/E2E tests.
