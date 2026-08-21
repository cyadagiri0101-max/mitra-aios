# M7 — Engineering Knowledge Library Implementation Plan
## Phased Execution Strategy for Milestone M7 & G13 Certification
**Baseline:** `v4.6.0` (M6 Certified)  
**Target:** Milestone M7 — Engineering Knowledge Library + G13 Intelligent Search & RAG  
**Prerequisites:** Ollama running locally with `phi3:mini` and embedding model pulled.

---

## 1. Phased Execution Roadmap

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Phase M7.0: Library Governance & Read-Only Ingestion Bridge               │
 │ • Register MitraEngineeringLibrary path without copying to Git           │
 │ • Establish SHA-256 fingerprinting & manifest generator                  │
 └────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Phase M7.1: MEKB Relational & Document Ingestion Worker                  │
 │ • Ingest 24 tables from mekb.sqlite into MITRA knowledge catalog         │
 │ • Parse 33 engineering documentation specs in `docs/`                    │
 └────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Phase M7.2: Tabular Chunking & Multi-Tenant Vector Indexing              │
 │ • Convert BOM & process planning rows into markdown table chunks         │
 │ • Generate embeddings in batches via Ollama into `knowledge_embeddings`  │
 └────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Phase M7.3: Hybrid Search & Row-Level Citation Traceability              │
 │ • Connect `knowledge-search.service.ts` to MEKB vector index             │
 │ • Build row-level provenance link resolver ([REF-x] badge renderer)      │
 └────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Phase M7.4: Live Phi-3 Grounding & 50-Question Golden Benchmark          │
 │ • Execute 50-question evaluation suite against local Phi-3 model         │
 │ • Verify zero hallucinations and 100% citation precision                 │
 └────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Phase M7.5: G13 Certification Gate & Release Packaging                  │
 │ • Run automated `g13-rag-certification.e2e-spec.ts`                      │
 │ • Deliver final M7 verification evidence and tag `v4.7.0`                │
 └──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase Details & Exit Gates

### Phase M7.0 — Library Governance & Manifest Generator
- **Scope:** Build read-only filesystem scanner in NestJS (`EngineeringLibraryService`) to scan `D:\Mitra3.0\MitraEngineeringLibrary` without moving or modifying files.
- **Exit Gate:** Complete JSON manifest generated with SHA-256 hashes for all 146 core domain files.

### Phase M7.1 — MEKB Relational & Document Ingestion
- **Scope:** Import 281 projects, 516 component details, 227 process planning steps, 115 BOM rows, and 33 engineering docs into `knowledge_catalog_entries` and `engineering_documents`.
- **Exit Gate:** 100% of MEKB records synced with `tenant_id` and provenance tracking.

### Phase M7.2 — Tabular Chunking & Embeddings
- **Scope:** Implement `TabularChunkerService` producing table chunks with header preservation. Batch generate embeddings using local Ollama (`all-minilm` / `nomic-embed-text`).
- **Exit Gate:** ~2,500 vector chunks populated in `knowledge_embeddings` with zero memory leaks.

### Phase M7.3 — Hybrid Search & Citation Linking
- **Scope:** Connect hybrid vector + full-text search in `KnowledgeSearchService`. Inject structured citation payloads.
- **Exit Gate:** Search query `"BM454 body insert material"` returns `HOKOTOL/ALUMOLD` chunk with rank 1.

### Phase M7.4 — Live Phi-3 Model Benchmark
- **Scope:** Execute the 50-question golden evaluation set with live Ollama `phi3:mini`. Verify answers and provenance citations.
- **Exit Gate:** 50/50 evaluation questions answered correctly with exact citations or truthful insufficiency advisories.

### Phase M7.5 — Formal G13 Certification
- **Scope:** Commit `test/m7-g13-rag.e2e-spec.ts` (100% pass) and publish M7 Completion Report.
- **Exit Gate:** G13 certified in `MITRA_GOLDEN_SCENARIOS.md`.
