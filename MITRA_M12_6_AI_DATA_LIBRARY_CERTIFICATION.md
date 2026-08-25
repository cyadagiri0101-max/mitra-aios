# MITRA M12.6 AI & DATA LIBRARY CERTIFICATION

**WORKSTREAM:** Post-M12.5 / S4 AI Grounding Truth & Provenance Certification  
**AUDIT ROLE:** AI & Engineering Intelligence Architect  
**DATE:** 2026-08-25  

---

## 1. Architectural Ground Truth: Training vs. Grounding

### Definitive Statement:
$$\boxed{\mathbf{THE\ BASE\ AI\ MODEL\ IS\ NOT\ FINE-TUNED\ ON\ THE\ DATA\ LIBRARY.}}$$
$$\boxed{\mathbf{MITRA\ AI\ OPERATES\ VIA\ IN-CONTEXT\ DETERMINISTIC\ GROUNDING\ \&\ KNOWLEDGE\ GRAPHS.}}$$

---

## 2. Technical Grounding Stack

| Layer | Implementation in MITRA | Technical Role |
|---|---|---|
| **Foundation Model** | Microsoft Phi-3 Mini 3.8B (via local Ollama daemon) | General natural language reasoning & instruction following (standard unmodified weights). |
| **Embeddings** | `nomic-embed-text` (768 dimensions) | Generates semantic vector representations for structured chunks. |
| **Vector Storage** | PostgreSQL `pgvector` (`knowledge_chunks` table) | HNSW cosine similarity search. |
| **Lexical Search** | PostgreSQL `tsvector` + BM25 ranking | Keyword, project prefix, part number, and material grade matching. |
| **Knowledge Graph** | EKOS Graph (Nodes & Edges) | Relational lineage linking tools, machines, materials, processes, and NCR/defects. |
| **Evidence Fusion** | `EngineeringHybridFusionService` (RRF) | Reciprocal Rank Fusion blending lexical, vector, and graph candidate relevance. |
| **Citation Verifier** | `EngineeringCitationValidatorService` | Extracts `[REF-x]` tags, validates against source registry, and strips hallucinated citations. |
| **Provenance Engine** | Chunk & Citation Metadata | Preserves file, sheet, row, page, and SHA-256 hash coordinates for all returned facts. |
| **Refusal Guard** | `EngineeringPhi3GroundingService` | Refuses queries on empty or low-evidence search results without guessing. |
