# M7 — Proposed Engineering RAG Architecture
## End-to-End Local-First RAG Pipeline Design for MITRA M7
**Architecture Model:** Non-destructive, decoupled Ingestion Worker & Hybrid Vector Search  
**Execution Environment:** Air-gapped / Local-First (Node.js + PostgreSQL + Ollama Phi-3)

---

## 1. End-to-End Pipeline Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MitraEngineeringLibrary                         │
│       (Raw Master Vault: 19.4k files / mekb.sqlite / Excel BOMs)       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (Read-Only Scan)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. MEKB Ingestion Worker (`importers/pipeline.py` & NestJS Sync)       │
│    • Fingerprint (SHA-256) & Change Detection                          │
│    • Modular Parsers (PartList, CycleTimes, ProcessPlanning, Index)    │
│    • Natural Key Resolution & Deduplication                            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Engineering Taxonomy & Normalization                                │
│    • Master entity mapping: Machine, Material, Cavitation, Customer    │
│    • Provenance stamping: SourceFile, Sheet, Row, BatchId              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Semantic Tabular Chunking Engine                                    │
│    • Converts rows into markdown tables with preserved headers & units │
│    • Splits large BOMs into cohesive component sub-assemblies          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Hybrid Embedding & Indexing Pipeline                                │
│    • Dense Embeddings via Ollama (e.g. `nomic-embed-text` / `all-minilm`)│
│    • Full-text GIN index in PostgreSQL (`knowledge_embeddings`)        │
│    • Multi-tenant partition tag (`tenant_id`)                          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. Tenant-Aware Hybrid Knowledge Retrieval                             │
│    • Reciprocal Rank Fusion (Dense Vector + Sparse BM25 Text)          │
│    • Hard tenant security filter & Authority rank multiplier           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 6. MITRA AI Context Builder (`knowledge-context-builder.service.ts`)   │
│    • Token budgeting & citation marker injection (`[REF-1]`, `[REF-2]`)│
│    • Strict negative constraint ("If answer not in context, state it") │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 7. Local Model Inference (`phi3:mini` via `ollama-model.provider.ts`)  │
│    • Grounded generation with strict engineering citations             │
│    • Zero data leakage outside local machine                           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 8. Response Synthesis & AI Audit Log                                   │
│    • Emits structured DTO with answer, references, and confidence      │
│    • Logs prompt, token count, model ID, and latency to `ai_audit_logs`│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Technical Specifications

1. **Parser Service (`engineering-library.module.ts`):**
   - Integrates MEKB Python extraction scripts or TypeScript OpenPyXL parsers into NestJS background queue.
   - Idempotent: Never mutates raw source documents.
2. **Tabular Chunking Strategy:**
   - Instead of naive character splitting, creates structured Markdown table chunks with context headers:
     ```markdown
     ### Project: BM454 | Sheet: Mold and Mask Parts | Component Category: INSERTS
     | S.No | Description | Material | Grade | Finished Size | Hardness | Qty |
     | 1 | BODY INSERT- B & P | ALUMINIUM | HOKOTOL/ALUMOLD1-500 | 1230x135x40 | 150 HB | 2 |
     ```
3. **Strict Citation Contract:**
   - Every citation must resolve to an exact metadata object:
     `{ source: "BM454_Partlist_RevA.xlsx", sheet: "Mold and Mask Parts", row: 2, entityType: "BOM_PART" }`.
4. **Hallucination Protection Gate:**
   - If maximum vector cosine similarity $< 0.65$ or retrieved context contains no relevant material/machine tokens, model emits standard advisory: *"Insufficient authoritative engineering data found in library for this query."*
