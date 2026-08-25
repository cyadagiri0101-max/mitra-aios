# MITRA POST-M12.5 AI GROUNDING & KNOWLEDGE GAP MATRIX

**WORKSTREAM:** Post-M12.5 Intelligence Gap Analysis  
**PRIORITIZATION:** P0 (Blocks Trustworthy AI), P1 (Required for Production AI), P2 (Enhancement), P3 (Future)

---

## 1. Engineering Knowledge Domain Coverage Matrix

| Domain / Asset Type | Data Exists? | AI Accessible? | Normalized? | Indexed? | Vector Search? | Structured Query? | Provenance? | Citation? | Human Sign-Off? |
|---|---|---|---|---|---|---|---|---|---|
| **1. Projects / Tools** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **2. Customers** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **3. Products / Bottles** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **4. Mold Types** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **5. BOM Parts** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **6. 2D/3D CAD Drawings** | YES | PARTIAL | PARTIAL | YES | PARTIAL | YES | YES | YES | MANDATORY |
| **7. Design Revisions** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **8. Standards (ISO/DIN)** | YES | PARTIAL | PARTIAL | YES | YES | PARTIAL | YES | YES | MANDATORY |
| **9. Materials & Resins** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **10. Machine Specifications**| YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **11. Process Planning** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **12. Cycle Time History** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **13. DFM Rules** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **14. Quality / NCR / CAPA** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **15. Tool Proving / Trials** | YES | YES | YES | YES | YES | YES | YES | YES | MANDATORY |
| **16. Lessons Learned** | YES | PARTIAL | PARTIAL | YES | YES | PARTIAL | YES | YES | MANDATORY |

---

## 2. Top 10 Prioritized Technical Gaps

| ID | Capability | Current State | Evidence | Gap Description | Priority | Recommended Solution |
|---|---|---|---|---|---|---|
| **GAP-01** | **EKL Standalone Microservice Coupling** | EKL service defaults to `http://localhost:8001` if `EKL_BASE_URL` unset | `engineering-library.service.ts` | Backend falls back to internal counts when microservice is offline | **P1** | Direct native embedded SQLite access via `MekbIngestionService` as primary path |
| **GAP-02** | **CAD Metadata Deep Feature Extraction** | DXF/DWG layer extraction is basic | `DocumentIngestionService` | Geometric bounding box & feature topology not embedded into vector chunks | **P1** | Connect `GeometricFeatureService` topology directly to knowledge chunks |
| **GAP-03** | **Real-time Data Library File Watcher** | Manual batch sync via API / CLI | `KnowledgeReindexSchedulerService` | File updates in vault require scheduler tick (21600s) | **P2** | Add inotify / FS watcher for instant staging and re-indexing |
| **GAP-04** | **Cross-Lingual / Multilingual Normalization** | English only | `engineering-normalizer.service.ts` | Non-English drawing notes (German/Japanese standard DIN terms) need alias mapping | **P2** | Expand synonym registry with multi-standard ISO/DIN equivalents |
| **GAP-05** | **Graph RAG Traversal Fusion** | EKOS graph and Vector retrieval execute in parallel | `ai-orchestrator.service.ts` | Graph neighbor nodes are not fed directly into vector reranker weights | **P1** | Graph-augmented vector fusion in `EngineeringHybridFusionService` |
| **GAP-06** | **Streaming Citation Tokens to Frontend** | Citations returned as post-generation JSON payload | `ai-orchestrator.service.ts` | UI displays citations after stream completes | **P2** | Emit citation anchors directly in SSE stream chunks |
| **GAP-07** | **Confidence Calibration via Empirical Benchmarks** | Deterministic score formula (0.0 to 1.0) | `ai-security.service.ts` | Thresholds tuned statically, not against historical ground-truth testbed | **P2** | Implement automated RAG benchmark dataset with precision/recall metrics |
| **GAP-08** | **Formula & Tolerance Precision Parsing** | Text regex matching | `engineering-chunker.service.ts` | Complex tolerance bounds (e.g. $+0.02/-0.01\text{ mm}$) lose numeric interval queryability | **P1** | Add structured interval attributes to `structuredMetadata` JSONB |
| **GAP-09** | **Historical Project Delta Comparison** | Pairwise project diffs require two separate queries | `project.service.ts` | AI cannot perform one-shot cross-project WBS/BOM variance comparison | **P2** | Add specialized comparative RAG tool in `ToolRegistryService` |
| **GAP-10** | **Offline Model Quantization Profile** | Phi-3 default via Ollama | `model-router.service.ts` | Ollama model fallback assumes running daemon | **P1** | Add ONNX Runtime / GGUF direct in-process fallback worker |
