# M7 — MITRA Knowledge Architecture Gap Matrix
## Comparative Analysis: Engineering Vault Requirements vs MITRA Baseline
**Baseline:** `v4.6.0` (M6 Certified)  
**Target:** Milestone M7 — Intelligent Search & RAG Integration

---

## 1. Comprehensive Knowledge Gap Matrix

| Capability Area | Engineering Library Requirement | MITRA v4.6.0 Existing State | Gap Classification | Priority | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **File Discovery & Scanning** | Recursive scan of shared network folder paths (`FolderList.txt`) | Basic single file upload & project folders | **MISSING** (Needs batch scanner service) | P1 | Low |
| **Excel Tabular Parsing** | Multi-sheet BOM, cycle times, component dimensional matrix | Basic CSV import / generic file storage | **MISSING** (Needs MEKB openpyxl parsers) | P0 | Medium |
| **CAD / STEP Extraction** | Metadata, bounding box dimensions, volume, revision text | None (Raw file upload only) | **DEFERRED** (Phase 2 CAD extractor) | P2 | Low |
| **Taxonomy Enrichment** | Link raw rows to Machines, Resins, Cavitations, Customers | Manual data entry in relational tables | **PARTIAL** (Schemas exist; auto-tagging missing) | P1 | Low |
| **Structured Chunking** | Tabular chunks preserving column headers & dimensional units | Standard text chunking | **PARTIAL** (Needs markdown-table chunker) | P1 | Medium |
| **Vector & Hybrid Search** | Hybrid dense vector (Ollama) + sparse BM25 text search | `vector-search.service.ts` + `knowledge-search.service.ts` | **EXISTING** (Needs library entity wiring) | P0 | Low |
| **Tenant Isolation** | Strict tenant partitioning for proprietary customer drawings | `TenantAwareService` + `requireTenant()` enforced | **EXISTING & CERTIFIED** | P0 | Critical |
| **Context Assembly** | Token-budgeted context with structured `[REF-x]` citation tags | `knowledge-context-builder.service.ts` | **EXISTING** (Needs tabular reference expansion) | P1 | Low |
| **Local Model Generation** | Air-gapped Phi-3 inference via local Ollama runner | `ollama-model.provider.ts` + `model-router.service.ts` | **EXISTING / VERIFICATION_GAP** (Needs live test) | P0 | Medium |
| **Citation Traceability** | Trace answers to File $\to$ Sheet $\to$ Row $\to$ Batch ID | Base `sourceLinks` in UnifiedSearchResult | **PARTIAL** (Needs row-level provenance link) | P0 | Medium |
| **Hallucination Control** | Reject queries when library lacks sufficient evidence | Advisory confidence score calculation | **PARTIAL** (Needs strict confidence cutoff gate) | P1 | Medium |
| **Knowledge Article Workflow** | State machine for draft $\to$ review $\to$ publish $\to$ supersede | Basic CRUD (`KnowledgeArticleService`) | **MISSING** (Assigned to Milestone M8) | P2 | Low |
