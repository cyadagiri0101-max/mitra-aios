# MITRA M12.7 S5 DATA FLOW SPECIFICATION

**ARCHITECTURE WORKSTREAM:** Multi-Hop Grounded Data Flow
**DATE:** 2026-08-25

---

## 1. Grounded Copilot Data Flow

$$\begin{aligned}
\text{User Question} &\xrightarrow{\text{Stage 1}} \text{Security Sanitizer \& Prompt Injection Guard} \\
&\xrightarrow{\text{Stage 2}} \text{Intent \& Entity Resolution (Project, Mold, Machine, Material)} \\
&\xrightarrow{\text{Stage 3}} \text{Parallel Hybrid Retrieval (pgvector + Postgres tsvector)} \\
&\xrightarrow{\text{Stage 4}} \text{EKOS Lineage Traversal (1-Hop / 2-Hop Connected Nodes)} \\
&\xrightarrow{\text{Stage 5}} \text{Graph-Augmented RRF Fusion \& Feature Reranking} \\
&\xrightarrow{\text{Stage 6}} \text{MMR Diversity Filter \& Context Block Assembler [REF-x]} \\
&\xrightarrow{\text{Stage 7}} \text{Local Phi-3 / Deterministic Synthesis Fallback} \\
&\xrightarrow{\text{Stage 8}} \text{Citation Verifier (Strip Hallucinations / Refusal Guard)} \\
&\xrightarrow{\text{Stage 9}} \text{Human Review \& Sign-Off (isAutonomousDecision = false)}
\end{aligned}$$

---

## 2. Invariant Rules

- **Zero Outside Knowledge:** Claims must directly cite `[REF-x]`.
- **Refusal Guard:** Triggers `REFUSAL` confidence if no matching chunks exist.
- **Tenant Scoping:** All queries, graph walks, and chunks carry immutable `tenantId`.
