# MITRA v4.2 — GOAL 3 / INCREMENT 5
# ENGINEERING KNOWLEDGE INTELLIGENCE & SEMANTIC INDEXING DISCOVERY REPORT

**Date:** August 17, 2026  
**Status:** DISCOVERY COMPLETED — AWAITING IMPLEMENTATION AUTHORIZATION  
**Frozen Baseline:** MITRA `v4.1.2` (`9ea69ad9284e345a84d08408596cf673d7624dc3`) — **IMMUTABLE & UNTOUCHED**  

---

## Executive Summary

Goal 3 transforms MITRA's existing Knowledge and Engineering Library domains into an institutional engineering intelligence system. The repository and PostgreSQL database already contain a robust core knowledge schema (`knowledge_articles`, `knowledge_catalog`, `engineering_documents`, `knowledge_embeddings`, `pg_trgm`), but the frontend `EngineeringLibraryPage.tsx` was previously pointing to an external disconnected mock service (`/ekl/*` on port 9999) rather than MITRA's internal, tenant-isolated knowledge and engineering document architecture.

This discovery report outlines how to unify deterministic multi-attribute engineering search, structured domain filtering, source traceability across the digital thread, and optional vector semantic similarity without requiring any destructive schema migrations or external search daemons.

---

## Answers to Critical Discovery Questions (A through V)

### A. Where are engineering knowledge articles stored?
Engineering knowledge articles (SOPs, best practices, troubleshooting guides, standards, lessons learned) are stored in the PostgreSQL table `knowledge_articles` via the `KnowledgeArticle` entity (`src/modules/knowledge/entities/knowledgearticle.entity.ts`).

### B. Where are engineering documents stored?
Engineering technical documents (specifications, inspection criteria, design guidelines, manuals) are stored in the PostgreSQL table `engineering_documents` via the `EngineeringDocument` entity (`src/modules/engineering/entities/engineering-document.entity.ts`). Revisions are stored in `engineering_document_versions`.

### C. What text content is actually searchable today?
- **Knowledge Articles:** `title`, `slug`, `summary`, `content`, `tags`, `related_modules`, `seo_keywords`.
- **Knowledge Catalog:** `title`, `summary`, `search_text`, `tags`, `source_ref` JSON.
- **Knowledge Embeddings:** `content_text`, `metadata` JSON.
- **Engineering Documents:** `document_number`, `title`, `description`, `doc_type`, `tags`.

### D. Is PostgreSQL full-text search already implemented?
Yes. The `pg_trgm` (trigram) extension is installed (`extversion: 1.6`). `VectorSearchService.textSearch` utilizes `similarity(content_text, $1)` and trigram matching `%` natively. PostgreSQL `to_tsvector` / `to_tsquery` can also be queried without any additional extensions.

### E. Is pgvector installed and configured?
The `knowledge_embeddings` table contains an `embedding` column for vector storage. On environments where the native pgvector extension is not compiled, the system gracefully falls back to `pg_trgm` trigram text similarity, ensuring 100% search uptime.

### F. Is there already an embedding table/entity?
Yes. `knowledge_embeddings` table and `KnowledgeEmbedding` entity (`src/modules/ai/entities/knowledge-embedding.entity.ts`) with index on `(tenant_id, entity_type, entity_id)` and `content_hash`.

### G. Is there already an embedding generation service?
Yes. `EmbeddingService` (`src/modules/ai/services/embedding.service.ts`) handles embedding generation, content-hash deduplication, and periodic batch indexing (`indexTenantData`).

### H. Is Ollama already available as an optional local AI runtime?
Yes. `OllamaProvider` (`src/modules/ai/providers/ollama.provider.ts`) connects to `OLLAMA_URL` (default `http://localhost:11434`) using the `nomic-embed-text` embedding model when `AI_ENABLED=true`.

### I. Can semantic indexing operate while AI_ENABLED=false?
Yes. When `AI_ENABLED=false`, `EmbeddingService` and `KnowledgeIndexingService` continue to index content text, summaries, titles, and metadata into `knowledge_catalog` and `knowledge_embeddings` while setting vector values to null, enabling deterministic similarity and keyword searching.

### J. Can deterministic/full-text search work without AI?
Yes. Deterministic search operates completely inside PostgreSQL using SQL pattern matching, trigram similarity, and field-level filters without making any AI or external network calls.

### K. Are documents linked to projects?
Yes. `engineering_documents` contains `project_id` (UUID), linking documents directly to projects such as canonical project `PRJ-2026-0002` (`1ca60868-3292-4ecd-ae6c-a893548929b2`).

### L. Are documents linked to drawings?
Yes. `engineering_documents` contains `drawing_id` (UUID).

### M. Are documents linked to BOMs?
Yes. `engineering_documents` contains `bom_id` (UUID).

### N. Are documents linked to routings?
Yes. `engineering_documents` contains `routing_id` (UUID).

### O. Are documents linked to quality records?
Yes. Linked via `project_id` and the `EngineeringTraceEdge` graph connecting to `inspection_plans` and `trial_observations`.

### P. Are documents linked to manufacturing records?
Yes. Linked via `project_id` and `EngineeringTraceEdge` graph connecting to `work_orders` and `job_cards`.

### Q. Are document revisions preserved?
Yes. Document versions are snapshotted in `engineering_document_versions` with append-only semantics.

### R. Can historical/released knowledge be distinguished from drafts?
Yes. Both `knowledge_articles` and `engineering_documents` maintain a `status` column (`DRAFT`, `UNDER_REVIEW`, `PUBLISHED`, `RELEASED`, `ARCHIVED`).

### S. How is tenant isolation enforced?
Tenant isolation is enforced by mandatory `tenant_id` columns, `JwtAuthGuard` token extraction, `@CurrentUser() user: AuthUser`, and fail-closed SQL parameterization (`tenant_id = $1`).

### T. How are knowledge permissions enforced?
Enforced via RBAC with `@Permissions('knowledge:article:read', 'engineering:document:read')` and role checks (`ADMIN`, `DESIGN`, `PLANNING`, `PRODUCTION`, `QUALITY`, `MANAGEMENT`).

### U. Does the current Engineering Library contain canonical data?
Yes. 3 canonical published SOPs and guidelines already exist in `knowledge_articles`:
1. `pet-blow-mold-cooling-guidelines`: *"Blow Mold Cooling Channel Design Guidelines for PET Containers"*
2. `troubleshooting-parting-line-flash`: *"Troubleshooting Parting Line Flash in High-Volume Bottle Molds"*
3. `sop-mold-commissioning-t0-trial`: *"Standard Operating Procedure: Mold Commissioning & T0 Trial Execution"*

And 1 canonical technical specification exists in `engineering_documents`:
- `EDOC-2026-0001`: *"500 mL PET Bottle Blow Mold Technical Specification"* (linked to `PRJ-2026-0002`).

### V. What is the smallest architecture required to provide useful engineering search?
1. Route `EngineeringLibraryPage.tsx` away from the broken `/ekl/*` proxy to MITRA's internal `/api/knowledge/search`, `/api/knowledge/articles`, and `/api/engineering/documents`.
2. Enhance `KnowledgeSearchService` to support unified deterministic multi-domain search across both `knowledge_articles` and `engineering_documents` with domain, material, process, quality, and project filters.
3. Provide full source traceability linking search results back to Projects, Drawings, BOMs, Routings, Work Orders, and Inspection Plans.

---

## Architectural Inventory & Gaps

| Component | Current State | Target State (Goal 3) |
|---|---|---|
| **Knowledge Articles** | Stored in `knowledge_articles`, 3 published items | Searchable with rich tags, categories, and source navigation |
| **Engineering Documents** | Stored in `engineering_documents`, linked to `PRJ-2026-0002` | Unified in search results alongside SOPs and guidelines |
| **Search Engine** | `VectorSearchService` with `pg_trgm` fallback | Multi-attribute deterministic search + vector ranking fallback |
| **Engineering Library Page** | Points to external unreachable port 9999 (`/ekl/*`) | Native full-featured MITRA Engineering Knowledge UI |
| **AI Dependency** | Optional (`AI_ENABLED=false` by default) | Preserved: 100% deterministic search functionality with AI off |
| **Database Schema** | All tables, columns, and indexes already present | **ZERO schema migrations required** |

---

## Proposed API Contract for Unified Engineering Search

### `GET /api/knowledge/search`
**Query Parameters:**
- `q`: Search keyword or natural language query (e.g. `"PET blow mold cooling"`, `"H13 EDM"`, `"flash"`)
- `domain`: `ALL` | `ENGINEERING` | `MANUFACTURING` | `QUALITY` | `COMMERCIAL`
- `articleType`: `PROCEDURE` | `TROUBLESHOOTING` | `BEST_PRACTICE` | `STANDARD` | `LESSON_LEARNED` | `SPECIFICATION`
- `projectId`: Filter by specific project (e.g. `1ca60868-3292-4ecd-ae6c-a893548929b2`)
- `material`: Filter by material tag (e.g. `PET`, `H13`, `P20`, `Aluminium`)
- `process`: Filter by process tag (e.g. `Blow Molding`, `EDM`, `CNC Milling`, `CMM Inspection`)
- `page`: Pagination page (default `1`)
- `limit`: Page limit (default `10`)

**Response Format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Blow Mold Cooling Channel Design Guidelines for PET Containers",
      "slug": "pet-blow-mold-cooling-guidelines",
      "entityType": "KNOWLEDGE",
      "articleType": "BEST_PRACTICE",
      "summary": "Engineering guidelines for baffle and bubbler cooling circuit layout in high-cavitation PET stretch blow molds.",
      "content": "...",
      "tags": ["PET", "Cooling", "Blow Molding", "Thermal Management"],
      "status": "PUBLISHED",
      "sourceDomain": "engineering",
      "sourceLinks": {
        "projectId": "1ca60868-3292-4ecd-ae6c-a893548929b2",
        "projectNumber": "PRJ-2026-0002",
        "drawingNumber": "DRW-2026-0001",
        "bomNumber": "BOM-2026-0001"
      },
      "similarity": 0.94,
      "updatedAt": "2026-08-17T06:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

## Proposed Implementation Sequence (Post-Authorization)

1. **Backend Knowledge Search Enhancement:**
   - Extend `KnowledgeSearchService.search` to seamlessly merge matches from `knowledge_articles`, `engineering_documents`, and `knowledge_catalog`.
   - Implement multi-field filtering (`domain`, `articleType`, `projectId`, `material`, `process`, `status`).
   - Add rich source link resolution (project number, drawing number, BOM number).
2. **Frontend Engineering Library Transformation (`EngineeringPage.tsx` & `EngineeringLibraryPage.tsx`):**
   - Replace disconnected `/ekl/*` endpoints with native `/api/knowledge/search` and `/api/knowledge/articles`.
   - Build interactive search bar with dynamic search suggestions, filter pills (Domain, Material, Process, Document Type), result cards with tags and metadata, modal article viewer, and direct links to Project/Drawing/BOM/Routing/Work Order/Inspection Plan.
3. **Automated Unit & Integration Verification:**
   - Update and execute test suites in `src/modules/knowledge` and `src/modules/engineering-library`.
   - Validate backend build (`nest build`) and frontend build (`tsc && vite build`).
4. **End-to-End Browser Verification:**
   - Verify search queries ("PET cooling", "flash", "T0 trial", "EDOC"), category filters, modal viewer, and refresh persistence.

---

## Stop Condition

Discovery is complete. No source code, database tables, or release configurations have been altered. Awaiting user authorization to proceed with implementation.
