# M8 — G12 Gap Analysis & Capability Matrix
## Evaluation of Existing Implementation vs Vision-100 G12 Requirements
**Milestone:** `M8`  
**Standard:** ISO/IEC 12207 Software Lifecycle Processes & Engineering Governance Standards  
**Status:** **GAP ANALYSIS COMPLETE**

---

## 1. G12 Capability Gap Matrix

| Capability | Existing Implementation | Evidence File / Symbol | Existing Tests | Classification | Gap Description | Severity | M8 Scope |
|:---|:---|:---|:---|:---:|:---|:---:|:---:|
| **KnowledgeArticle Entity** | Basic entity with title, slug, content, author, reviewedBy, publishedAt | `knowledgearticle.entity.ts` | Entity mapped | **PARTIAL** | Lacks `version`, `isLatest`, `parentArticleId`, `supersededById`, `expiresAt`, `projectId`, `decisionId` | P1 | **M8.1** |
| **DRAFT State & Editing** | Basic CRUD allows creating and editing records in DRAFT state | `knowledgearticle.service.ts` | None | **PARTIAL** | Unrestricted field editing without locking on submission | P2 | **M8.2** |
| **UNDER_REVIEW Transition** | Enum value `UNDER_REVIEW` exists | `knowledgearticle.entity.ts:4` | None | **MISSING** | Missing `/submit` endpoint, review assignment, validation that content is non-empty | P1 | **M8.2** |
| **PUBLISH / Approval** | Enum value `PUBLISHED` exists; `publishedAt` column exists | `knowledgearticle.entity.ts:4` | None | **MISSING** | Missing role-gated `/approve` / `/publish` workflow, reviewer stamp, publication audit row | P1 | **M8.2** |
| **Article Supersession** | None in `knowledge` module (exists in `engineering-decisions`) | `engineering-decision.service.ts:187` | Decisions only | **MISSING** | Missing atomic supersession creating successor revision and marking predecessor `SUPERSEDED` | P1 | **M8.3** |
| **Revision Tracking** | None for articles (single mutable row currently) | `knowledgearticle.entity.ts` | None | **MISSING** | Missing immutable snapshotting, `version` incrementation (v1, v2), and lineage navigation | P1 | **M8.3** |
| **Expiry Marking** | Column `review_due_date` exists; no active expiry logic | `knowledgearticle.entity.ts:59` | None | **MISSING** | Missing `expiresAt` evaluation, automated expiry status marking, and search exclusion | P2 | **M8.3** |
| **Decision Corpus** | `EngineeringDecision` entity and service with full state machine | `engineering-decision.service.ts` | 5 unit tests | **IMPLEMENTED** | Robust decision log exists; lacks automated article generation on approval | P2 | **M8.4** |
| **Decision Provenance & G13 Linkage** | Decision references generic `relatedEntityType` / `relatedEntityId` | `engineering-decision.entity.ts:110` | 5 unit tests | **PARTIAL** | Lacks direct linkage to G13 retrieved chunks (`[REF-x]`, `chunkId`, `sourceFile`) | P2 | **M8.5** |
| **Audit Trail & Events** | `AuditService.logBusinessEvent` used in decisions; missing in articles | `engineering-decision.service.ts:93` | Decisions pass | **PARTIAL** | Knowledge article transitions currently bypass structured audit logging | P1 | **M8.2 / M8.3** |
| **Tenant Isolation** | `TenantAwareService` base class applied in both modules | `TenantAwareService` | Unit tests | **IMPLEMENTED** | Multi-tenancy enforced in SQL queries; needs E2E verification across article lifecycle | P1 | **M8.6** |
| **G12 Golden Scenario** | Defined in `MITRA_GOLDEN_SCENARIOS.md:106` | `MITRA_GOLDEN_SCENARIOS.md` | No E2E suite | **VERIFICATION GAP** | Missing dedicated `m8-knowledge-lifecycle.e2e-spec.ts` testing the complete 10-step chain | P1 | **M8.6 / M8.7** |

---

## 2. Gap Severity Summary

- **Total Capabilities Evaluated:** 12
- **Fully Implemented:** 2 (`Decision Corpus`, `Tenant Isolation base`)
- **Partially Implemented:** 4 (`KnowledgeArticle Entity`, `DRAFT Editing`, `Decision Provenance`, `Audit Trail`)
- **Missing Capabilities:** 5 (`UNDER_REVIEW`, `PUBLISH`, `Supersession`, `Revision Tracking`, `Expiry`)
- **Verification Gaps:** 1 (`G12 Golden Scenario E2E Suite`)

---

## 3. Implementation Prioritization

1. **M8.1 Domain Model:** Extend `KnowledgeArticle` schema with revision, supersession, expiry, decision, and project columns.
2. **M8.2 Lifecycle Engine:** Implement `KnowledgeArticleService` state machine (`DRAFT` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `PUBLISHED` / `REJECTED` $\rightarrow$ `ARCHIVED`).
3. **M8.3 Revision & Supersession:** Implement atomic supersession and immutable revision branching.
4. **M8.4 Decision Corpus Integration:** Bidirectional linking between Engineering Decisions and Knowledge Articles.
5. **M8.5 G13 Evidence Linkage:** Connect G13 retrieved engineering chunk citations into decisions and articles.
6. **M8.6 G12 Golden Scenario E2E:** Build `m8-knowledge-lifecycle.e2e-spec.ts`.
7. **M8.7 Certification:** Formal G12 certification report.
