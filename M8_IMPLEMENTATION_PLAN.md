# Implementation Plan — Milestone M8: G12 Lifecycle & Decision Intelligence

This plan outlines the architecture, sub-milestone execution sequence, test gates, and governance controls to implement and certify **MITRA G12 (Knowledge Article Lifecycle & Decision Corpus)**.

---

## 1. Executive Summary & Objective

The primary objective of Milestone M8 is to advance **G12** from *PARTIAL / VERIFICATION GAP* to **`CERTIFIED`**.

M8 elevates knowledge articles from raw unstructured text entries into formally governed, auditable engineering artifacts with state transitions (`DRAFT` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `PUBLISHED` $\rightarrow$ `SUPERSEDED` / `EXPIRED`), immutable revision snapshots (v1, v2), role-based approval gates, bidirectional decision corpus integration, and seamless linkage with G13 grounded retrieval evidence.

---

## 2. Sub-Milestone Breakdown

```
M8.0 ──> Baseline & Discovery (Complete)
  │
  ▼
M8.1 ──> Knowledge Article Domain Model & Migration
  │
  ▼
M8.2 ──> Lifecycle State Machine (DRAFT → UNDER_REVIEW → PUBLISHED)
  │
  ▼
M8.3 ──> Revision Tracking, Atomic Supersession & Expiry Marking
  │
  ▼
M8.4 ──> Decision Corpus Integration & Automated Drafting
  │
  ▼
M8.5 ──> G13 Grounded Evidence Linking & Search Filtering
  │
  ▼
M8.6 ──> G12 Golden Scenario E2E Test Suite (g12-knowledge-lifecycle.e2e-spec.ts)
  │
  ▼
M8.7 ──> G12 Final Certification & Production Readiness Verdict
```

---

## 3. Sub-Milestone Execution Details

### M8.1 — Knowledge Article Domain Model & Schema Migration
- **Target Files:**
  - `src/modules/knowledge/entities/knowledgearticle.entity.ts`
  - `src/database/migrations/1700000000044-M8KnowledgeLifecycle.ts`
- **Additions:**
  - `version` (`int`, default 1)
  - `is_latest` (`boolean`, default true)
  - `parent_article_id` (`uuid`, nullable)
  - `superseded_by_id` (`uuid`, nullable)
  - `project_id` (`uuid`, nullable)
  - `decision_id` (`uuid`, nullable)
  - `rejection_reason` (`text`, nullable)
  - `expires_at` (`date`, nullable)
  - Update `ArticleStatus` enum with `SUPERSEDED` and `EXPIRED`.

### M8.2 — Lifecycle State Machine & Service Implementation
- **Target Files:**
  - `src/modules/knowledge/services/knowledgearticle.service.ts`
  - `src/modules/knowledge/controllers/knowledgearticle.controller.ts`
  - `src/modules/knowledge/dto/knowledge.dto.ts`
- **Methods Implemented:**
  - `create(dto, userId, tenantId)`: Initializes article in `DRAFT`, `version = 1`.
  - `submitForReview(id, userId, tenantId)`: Validates completeness; transitions to `UNDER_REVIEW`.
  - `rejectReview(id, reason, userId, tenantId)`: Transitions back to `DRAFT` with recorded feedback.
  - `publish(id, userId, tenantId)`: Requires Lead/Quality role; sets `publishedAt`, `reviewedBy`, status `PUBLISHED`.
  - Structured audit events emitted at each transition (`article.submitted`, `article.published`, etc.).

### M8.3 — Revision Tracking, Atomic Supersession & Expiry
- **Target Files:**
  - `src/modules/knowledge/services/knowledgearticle.service.ts`
- **Methods Implemented:**
  - `createRevision(id, userId, tenantId)`: Clones published v1 into new v2 in `DRAFT`, pointing `parentArticleId` to v1.
  - `supersede(id, successorId, manager)`: Transactionally updates v1 to `SUPERSEDED` and v2 to `PUBLISHED` via `EntityManager`.
  - `evaluateExpiries(tenantId)`: Evaluates articles past `reviewDueDate` / `expiresAt` and flags status as `EXPIRED`.

### M8.4 — Decision Corpus Integration & Automated Article Drafting
- **Target Files:**
  - `src/modules/engineering-decisions/services/engineering-decision.service.ts`
  - `src/modules/knowledge/services/knowledge-decision-bridge.service.ts` [NEW]
- **Capabilities:**
  - On decision approval, automatically draft a `KnowledgeArticle` structured from the decision statement, rationale, and alternatives.
  - Establish `KnowledgeGraphEdge` linking decision $\leftrightarrow$ article.

### M8.5 — G13 Grounded Evidence Linking & Knowledge Search Filtering
- **Target Files:**
  - `src/modules/knowledge/services/knowledge-search.service.ts`
- **Capabilities:**
  - Attach G13 retrieved citations (`[REF-x]`, `chunkId`, `sourceFile`) into article metadata.
  - Update `KnowledgeSearchService` query builder to filter out `SUPERSEDED` and `EXPIRED` articles by default unless `includeSuperseded: true`.

### M8.6 — G12 Golden Scenario E2E Suite
- **Target Files:**
  - `test/g12-knowledge-lifecycle.e2e-spec.ts` [NEW]
- **Coverage:** Complete 10-step Golden Scenario G12 lifecycle verification across fresh seeded tenants.

### M8.7 — G12 Final Certification & Release Handover
- **Deliverables:**
  - `M8_G12_FINAL_CERTIFICATION.md`
  - `M8_RELEASE_CLOSURE.md`

---

## 4. Architectural Risk & Mitigation Controls

| Risk Dimension | Potential Risk | Mitigation Control |
|:---|:---|:---|
| **Data Integrity** | Concurrency race during supersession | Execute supersession within TypeORM `EntityManager.transaction` with row-level locks. |
| **Multi-Tenancy** | IDOR vulnerability on revision creation | Base service strictly filters by `tenant_id` on all CRUD and transition operations. |
| **Search Pollution** | Outdated knowledge appearing in search | `KnowledgeSearchService` explicitly filters `status = 'PUBLISHED'` and `is_latest = true` by default. |
| **G13 Vault Mutation** | Unintended writes to `MitraEngineeringLibrary` | Source vault remains strictly READ-ONLY. M8 operates entirely on PostgreSQL tables. |

---

## 5. Entry & Exit Gate Checklist

- [x] **Phase 0:** Release boundary verified on branch `v3.3`.
- [x] **Phase 1:** M7.5 certification integrity re-verified (106/106 tests, build passing).
- [x] **Phase 2:** `M7.5_RELEASE_BOUNDARY.md` created.
- [x] **Phase 3:** `M8_BASELINE_AUDIT.md` created.
- [x] **Phase 4:** Existing implementation discovered in repository.
- [x] **Phase 5:** `M8_G12_GAP_ANALYSIS.md` created.
- [x] **Phase 6:** `M8_G13_INTEGRATION_BOUNDARY.md` created.
- [x] **Phase 7:** `M8_KNOWLEDGE_ARTICLE_LIFECYCLE_SPEC.md` created.
- [x] **Phase 8:** `M8_DECISION_CORPUS_SPEC.md` created.
- [x] **Phase 9:** `M8_G12_TRACEABILITY_MODEL.md` created.
- [x] **Phase 10:** `M8_TEST_STRATEGY.md` created.
- [x] **Phase 11:** Pending issues ledger reconciled.
- [x] **Phase 12:** `M8_IMPLEMENTATION_PLAN.md` created.

---

*(Antigravity is stopped at the planning boundary awaiting explicit user authorization `M8.1 IMPLEMENT` before creating or modifying code).*
