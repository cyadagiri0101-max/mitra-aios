# M8 — Baseline Audit & Discovery Report
## Milestone M8: G12 Lifecycle & Decision Intelligence Baseline State
**Audit Date:** `2026-08-21T09:33:00+05:30`  
**Certified Predecessor Baseline:** MITRA `v4.6.0` (M6 Certified) + M7.5 (G13 Certified)  
**Target Capability:** **G12 — Knowledge Article Lifecycle & Decision Corpus**  
**Git Branch:** `v3.3`  
**Status:** **DISCOVERY COMPLETE — BASELINE FROZEN & AUDITED**

---

## 1. Executive Summary

Milestone **M8** addresses **G12 (Lifecycle & Decision Intelligence)**.
Prior milestones delivered:
- **M1 (G5):** `EngineeringDecision` entity and service with transactional supersession, audit events, and project linkage.
- **M7 (G13):** Engineering Knowledge Library ingestion (19,400 files), hybrid vector retrieval, local Phi-3 grounded Q&A, and citation validation.

This audit inspects the current repository implementation of knowledge articles, decisions, knowledge graph relationships, and semantic search to establish the precise architectural starting point for M8.

---

## 2. Inventory of Existing Knowledge & Decision Components

| Component | File Location | Existing Capability | Completeness | M8 Gap |
|:---|:---|:---|:---:|:---|
| `KnowledgeArticle` Entity | `src/modules/knowledge/entities/knowledgearticle.entity.ts` | Base columns (`title`, `slug`, `content`, `status`, `authorId`, `reviewedBy`, `publishedAt`) | Partial (50%) | Missing `version`, `isLatest`, `parentArticleId`, `supersededById`, `expiresAt`, `projectId`, `decisionId` |
| `KnowledgeArticleService` | `src/modules/knowledge/services/knowledgearticle.service.ts` | Extends generic `TenantAwareService` raw CRUD | Minimal (15%) | Missing state machine transitions, approval workflow, revision branching, supersession transactions, outbox events |
| `KnowledgeArticleController` | `src/modules/knowledge/controllers/knowledgearticle.controller.ts` | Basic REST CRUD endpoints (`GET`, `POST`, `PATCH`, `DELETE`) with `RolesGuard` | Minimal (25%) | Missing transition endpoints (`/submit`, `/approve`, `/reject`, `/supersede`, `/revisions`) |
| `EngineeringDecision` Entity | `src/modules/engineering-decisions/entities/engineering-decision.entity.ts` | Full decision log entity with project scope, decision type, rationale, alternatives, and supersession links | High (90%) | Missing direct link to generated `KnowledgeArticle` and G13 chunk provenance |
| `EngineeringDecisionService` | `src/modules/engineering-decisions/services/engineering-decision.service.ts` | State machine (`DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `APPROVED`/`REJECTED` $\rightarrow$ `SUPERSEDED`), atomic supersession, audit events | High (90%) | Lacks automated knowledge article generation on approval and G13 evidence linking |
| `KnowledgeSearchService` | `src/modules/knowledge/services/knowledge-search.service.ts` | Unified semantic + keyword search across articles, catalog entries, and engineering docs | Good (75%) | Needs filtering for article revision status (exclude superseded/expired from default search) |
| `KnowledgeGraphEdge` Entity | `src/modules/knowledge/entities/knowledge-graph-edge.entity.ts` | Relational edge storage (`sourceType`, `sourceId`, `targetType`, `targetId`, `relationshipType`) | Good (80%) | Ready for linking decisions $\leftrightarrow$ articles $\leftrightarrow$ project artifacts |

---

## 3. Existing G12 Golden Scenario State

- **Current Definition in `MITRA_GOLDEN_SCENARIOS.md`:**
  1. Article create $\rightarrow$ draft $\rightarrow$ review $\rightarrow$ publish (revisionable); expiry marking.
  2. Decision-log entries auto-indexed; search returns decision evidence with provenance.
- **Current Classification:** `PARTIAL / VERIFICATION GAP`
  - Reason: `EngineeringDecision` backend is solid, but `KnowledgeArticle` lacks lifecycle state transitions, revision immutability, and unified decision-to-article lineage.

---

## 4. Audit Conclusion & M8 Entry Readiness

The repository provides solid foundations in `engineering-decisions` and `knowledge-search`. M8 will complete the `KnowledgeArticle` lifecycle state machine, connect decisions directly to knowledge articles, establish revision tracking and supersession, and certify **G12**.
