# MITRA POST-M12.5 COMPLETE KNOWLEDGE PIPELINE MAP

**WORKSTREAM:** Post-M12.5 Architecture & Intelligence Discovery  
**TARGET PIPELINE:** Engineering Data Library $\longrightarrow$ AI Grounded Reasoning  

---

## 1. End-to-End Pipeline Stage Mapping

$$\begin{aligned}
\text{Physical Data Library} &\longrightarrow \text{Ingestion \& Scanner} \longrightarrow \text{Normalization} \longrightarrow \text{Chunking} \\
&\longrightarrow \text{Embeddings (Nomic/Ollama)} \longrightarrow \text{PostgreSQL/pgvector Storage} \\
&\longrightarrow \text{Hybrid Retrieval (Lexical + Vector RRF)} \longrightarrow \text{Reranking \& Context Assembly} \\
&\longrightarrow \text{Local Phi-3 / Fallback Inference} \longrightarrow \text{Citation Validation} \longrightarrow \text{Human Sign-Off}
\end{aligned}$$

---

## 2. Component & Code Traceability

```
1. Ingestion Layer:
   ├── MekbIngestionService (SQLite Relational Vault reader)
   ├── DocumentIngestionService (PDF, DXF, XLSX, DOCX scanner)
   └── EngineeringLibraryScannerService (Vault hash & integrity checker)

2. Normalization & Chunking Layer:
   ├── EngineeringNormalizerService (Units, tolerances, project numbers, prefixes)
   └── EngineeringChunkerService (Engineering-aware header, table, and BOM chunking)

3. Vector Embedding & Storage Layer:
   ├── EngineeringEmbeddingService (Ollama 'nomic-embed-text' 768-dim embeddings)
   └── knowledge_chunks Table (PostgreSQL pgvector / metadata indices)

4. Hybrid Retrieval Layer:
   ├── EngineeringLexicalSearchService (Postgres full-text search with tsvector)
   ├── EngineeringVectorSearchService (pgvector cosine similarity with metadata filters)
   ├── EngineeringHybridFusionService (Reciprocal Rank Fusion with adaptive query weights)
   └── EngineeringRerankerService & DiversityService (Domain relevance & MMR deduplication)

5. Grounding & Provenance Layer:
   ├── EngineeringContextBuilderService (Structured Markdown context with [REF-x] anchors)
   ├── ModelRouterService / OllamaProvider (Local Phi-3 execution or deterministic fallback)
   ├── EngineeringCitationValidatorService (Validates citation veracity against source registry)
   └── AiSecurityService / AiAuditService (Prompt injection defense & immutable audit trail)

6. Human Approval & Autonomy Boundary:
   └── Platform Governance (isAutonomousDecision = false enforced across all decision models)
```
