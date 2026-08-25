# MITRA ENGINEERING KNOWLEDGE FABRIC ARCHITECTURE PROPOSAL

**VISION:** Unified Engineering Intelligence, Deterministic Grounding & On-Premise Provenance  
**CLASSIFICATION:** Post-M12.5 Architecture Proposal (Read-Only Blueprint)  

---

## 1. 15-Layer Fabric Architecture Blueprint

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. DATA INGESTION LAYER                         │
│  - SQLite MEKB Reader (24 Tables)  - OpenPyXL/PartList Ingestion (PL)  │
│  - CAD/DXF Parser                  - Document Ingestion (PDF, DOCX)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  2. ENGINEERING NORMALIZATION LAYER                    │
│  - Terminology & Synonyms          - Material Grade Mapping            │
│  - Dimension & Unit Conversion     - Project Prefix/Number Standard    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    3. KNOWLEDGE EXTRACTION LAYER                       │
│  - BOM Hierarchy & Part Lists      - Process Routing & Operations      │
│  - Cycle Time Empirical Metrics    - DFM Rule Violations & Defect Logs │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│               4. STRUCTURED KNOWLEDGE & ENTITY VAULT                   │
│  - PostgreSQL Canonical Tables     - SQLite Embedded Read-Only Vault   │
│  - KnowledgeCatalogEntry Entity    - Authority Status Registry         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  5. VECTOR & SEMANTIC EMBEDDING LAYER                  │
│  - Ollama nomic-embed-text         - pgvector 768-dim HNSW Index       │
│  - Engineering Chunker (Tables)    - Metadata Filter Annotations       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    6. KNOWLEDGE GRAPH & LINEAGE LAYER                  │
│  - EKOS Graph (Nodes & Edges)      - Project ↔ Tool ↔ Machine Lineage  │
│  - Material ↔ Defect Relations     - Cross-Project Knowledge Links     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    7. RETRIEVAL ORCHESTRATION LAYER                    │
│  - Query Normalization & Expansions- Lexical BM25 / Postgres tsvector  │
│  - Vector Semantic Search          - Reciprocal Rank Fusion (RRF)      │
│  - Engineering Feature Reranker    - Maximal Marginal Relevance (MMR)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                      8. GROUNDING & CONTEXT ENGINE                     │
│  - Deterministic Context Blocks    - Strict Evidence Refusal Guard     │
│  - Token Budget Optimizer          - Multi-Document Deduplication      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   9. PROVENANCE & TRACEABILITY ENGINE                  │
│  - Exact File/Sheet/Row/Col URI    - Immutable SHA-256 Content Hash    │
│  - Source Authority Validation     - Temporal & Revision Metadata      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       10. CITATION VERIFIER LAYER                      │
│  - [REF-x] Anchor Verification     - Hallucinated Citation Stripping   │
│  - Citation Veracity Ratio         - Direct Quote Text Alignment       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    11. LOCAL-FIRST AI REASONING LAYER                  │
│  - Local Phi-3 via Ollama Daemon   - Deterministic Grounded Fallback   │
│  - Prompt Injection Defense Guard  - Prompt Template Registry (61 Seed)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   12. HUMAN APPROVAL & AUTONOMY GUARD                  │
│  - isAutonomousDecision = false    - Advisory-Only Confidence Badge    │
│  - Human Sign-Off / Approval Modal - Engineer Override Audit Log       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 13. EVALUATION & BENCHMARKING FRAMEWORK                │
│  - RAG Triad (Context / Grounded / Answer Relevance) Evaluation        │
│  - Regression Test Harness (Golden Q&A Pairs)                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 14. SECURITY & TENANT ISOLATION LAYER                  │
│  - JWT Claims Tenant Derivation    - Row-Level & Chunk-Level Tenant ID │
│  - Role-Based Domain Authorization - Zero Foreign Tenant Emission      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    15. ON-PREMISE AIR-GAPPED DEPLOYMENT                │
│  - Zero Outbound Cloud API Calls   - Embedded SQLite / Local Postgres  │
│  - Local Vector Index Storage      - On-Premise GPU/CPU Quantization   │
└────────────────────────────────────────────────────────────────────────┘
```
