# M8 — Test Strategy & Verification Plan
## Quality Gates, Automated Unit/Integration Suites & Golden Scenario G12 Certification
**Milestone:** `M8`  
**Test Suite Standard:** Jest Unit Specs + NestJS E2E Test Harness  
**Target Coverage:** $\ge 90\%$ Line Coverage across `knowledge` & `engineering-decisions`  
**Status:** **TEST STRATEGY FINALIZED**

---

## 1. Test Architecture & Suite Mapping

```
mitra-backend/
├── src/modules/knowledge/
│   ├── services/
│   │   ├── knowledgearticle.service.spec.ts         <-- [NEW] Comprehensive lifecycle unit tests (20 tests)
│   │   ├── knowledge-search.service.spec.ts         <-- [MODIFY] Search with revision filtering
│   │   └── knowledge-decision-bridge.service.spec.ts<-- [NEW] Auto-generation & linkage tests
│   └── controllers/
│       └── knowledgearticle.controller.spec.ts      <-- [NEW] REST routing & guard assertions
└── test/
    └── g12-knowledge-lifecycle.e2e-spec.ts          <-- [NEW] Authoritative G12 Golden Scenario E2E Suite
```

---

## 2. 18-Category Test Verification Matrix

| # | Test Category | Target Component | Description & Acceptance Invariants | Test Method |
|:---:|:---|:---|:---|:---:|
| **1** | Article Creation | `KnowledgeArticleService` | Creates article with `status = DRAFT`, `version = 1`, `isLatest = true`. | Unit (`spec.ts`) |
| **2** | Draft Editing | `KnowledgeArticleService` | Updates title/content/tags while in `DRAFT`; updates `updatedAt`. | Unit (`spec.ts`) |
| **3** | Review Submission | `KnowledgeArticleService` | `submitForReview`: transitions `DRAFT` $\rightarrow$ `UNDER_REVIEW`. Fails if empty. | Unit (`spec.ts`) |
| **4** | Review Rejection | `KnowledgeArticleService` | `rejectReview`: transitions `UNDER_REVIEW` $\rightarrow$ `DRAFT` with required reason. | Unit (`spec.ts`) |
| **5** | Approval & Publication | `KnowledgeArticleService` | `publish`: transitions `UNDER_REVIEW` $\rightarrow$ `PUBLISHED`; sets `publishedAt`. | Unit (`spec.ts`) |
| **6** | Invalid Transitions | `KnowledgeArticleService` | Rejects forbidden state transitions (e.g. `DRAFT` $\rightarrow$ `PUBLISHED` direct). | Unit (`spec.ts`) |
| **7** | Revision Creation | `KnowledgeArticleService` | `createRevision`: clones v1 into v2 `DRAFT`; increments `version = 2`. | Unit (`spec.ts`) |
| **8** | Atomic Supersession | `KnowledgeArticleService` | Publishing v2 marks v1 `SUPERSEDED` and sets `supersededById` in 1 txn. | Unit (`spec.ts`) |
| **9** | Expiry Marking | `KnowledgeArticleService` | Detects `reviewDueDate < now()`; marks status `EXPIRED`. | Unit (`spec.ts`) |
| **10**| Multi-Tenant Isolation| `KnowledgeArticleService` | Tenant B cannot read, edit, or publish Tenant A articles (IDOR check). | E2E (`e2e-spec.ts`)|
| **11**| Role Authorization | `KnowledgeArticleController`| Only `QUALITY`/`ADMIN`/`MANAGEMENT` can approve & publish. | E2E (`e2e-spec.ts`)|
| **12**| Audit Trail Logging | `AuditService` | Emits `article.created`, `article.submitted`, `article.published`, `article.superseded`. | Unit (`spec.ts`) |
| **13**| Provenance Linkage | `KnowledgeArticleService` | Verifies `projectId`, `decisionId`, `sourceChunkId` mapped correctly. | Unit (`spec.ts`) |
| **14**| Decision Creation | `EngineeringDecisionService`| Creates project decision log in `DRAFT` with options and rationale. | Unit (`spec.ts`) |
| **15**| Decision Revision | `EngineeringDecisionService`| Submits and approves decision log; updates status. | Unit (`spec.ts`) |
| **16**| Decision Supersession| `EngineeringDecisionService`| Atomically supersedes predecessor decision when ECO creates successor. | Unit (`spec.ts`) |
| **17**| G13 Evidence Linkage | Bridge Service | Attaches verified `[REF-1]` chunk citations into decision/article context. | Unit (`spec.ts`) |
| **18**| G12 Golden Scenario | Full E2E Chain | Executes complete 10-step G12 scenario from Question $\rightarrow$ Decision $\rightarrow$ Article $\rightarrow$ Revision. | E2E (`e2e-spec.ts`)|

---

## 3. Exit & Certification Criteria

1. **Zero Regressions:** 106/106 engineering library tests and 1,203 backend tests continue passing.
2. **100% G12 Suite Pass:** `g12-knowledge-lifecycle.e2e-spec.ts` executes all 18 categories cleanly.
3. **Database Migration Verification:** Clean TypeORM entity schema validation with zero drift against PostgreSQL 16.
