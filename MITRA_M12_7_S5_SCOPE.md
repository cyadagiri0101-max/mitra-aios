# MITRA M12.7 S5 SCOPE SPECIFICATION

**MILESTONE:** MITRA M12.7 / Sprint 5 — Enterprise Knowledge Fabric Deepening & Real-Time Intelligence
**DATE:** 2026-08-25

---

## 1. Approved In-Scope Deliverables

1. **S5.1 — Knowledge Fabric Deepening:**
   - Multi-entity relational lineage expansion in EKOS Graph (Linking Projects $\leftrightarrow$ Tools $\leftrightarrow$ Machines $\leftrightarrow$ Materials $\leftrightarrow$ Defects $\leftrightarrow$ Process Plans).
   - Traceable entity identifiers and complete provenance metadata stored in `KnowledgeChunk`.
2. **S5.2 — Real-Time Data Library Intelligence:**
   - In-process file integrity & staging scanner with deterministic SHA-256 hash tracking.
   - Non-destructive change detection without modifying source vault assets.
3. **S5.3 — Advanced GraphRAG:**
   - Multi-hop traversal weighting fused into Reciprocal Rank Fusion (`EngineeringHybridFusionService`).
   - Tenant-isolated and project-bounded graph expansion.
4. **S5.4 — Engineering Semantic Intelligence:**
   - Multi-standard terminology mapping (ISO, DIN, JIS alias normalizations in `EngineeringSynonymService`).
   - Expanded tolerance parser support for limit dimensions and basic profiles.
5. **S5.5 — Cross-Project Engineering Intelligence:**
   - Cross-project BOM, WBS, and cavity variance comparison tool in `ToolRegistryService`.
   - Reusable engineering design pattern discovery.
6. **S5.6 — Empirical AI Grounding & Evaluation Platform:**
   - Expanded benchmark evaluation suite measuring Retrieval Precision, Context Recall, Groundedness, and Refusal Accuracy.
7. **S5.7 — Production Grounded Copilot Hardening:**
   - Strict refusal guards, fallback synthesis, and mandatory `isAutonomousDecision = false`.

---

## 2. Explicit Non-Scope & Negative Boundaries

- **NO Model Pre-Training / Fine-Tuning:** Unmodified base weights (Microsoft Phi-3 Mini 3.8B).
- **NO Data Library Mutation:** `MitraEngineeringLibrary/` and `PL.xlsx` remain strictly read-only.
- **NO Cloud-Only Dependencies:** 100% on-premise air-gapped execution.
- **NO Autonomous Decision Execution:** AI remains advisory with human approval required.
