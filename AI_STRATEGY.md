# AI Strategy

## Purpose

This document defines the AI architecture for MITRA, aligned with the principles established in PROJECT_CONSTITUTION.md.

---

## AI Principles (from Constitution)

1. **Local AI first.** No external sharing of engineering IP.
2. **Explainable AI.** Every recommendation must be explainable.
3. **Human approval.** AI recommends; humans approve before affecting engineering data.
4. **Knowledge grows from completed projects.** Every project increases the platform's intelligence.

---

## AI Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      User Interface                            │
│              Chat Interface · Inline Suggestions               │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│                    AI Copilot Service                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Query Understanding     │    Response Generation       │   │
│  │  Intent Classification   │    Recommendation Engine     │   │
│  │  Context Assembly        │    Explanation Builder       │   │
│  └──────────────────────────┴──────────────────────────────┘   │
└──────────────────────────┬─────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌─────────────────┐ ┌──────────┐ ┌──────────────┐
│  Vector Store   │ │ Knowledge│ │  LLM Runtime │
│  (Embeddings)   │ │ Graph    │ │  (Ollama)    │
│  FAISS / PG     │ │ Neo4j    │ │  Local Model │
└─────────────────┘ └──────────┘ └──────────────┘
```

---

## Components

### 1. LLM Runtime (Ollama)

- Runs entirely on-premises alongside the MITRA application stack.
- Supports open-weight models (Llama, Mistral, Qwen, etc.).
- No internet connection required for inference.
- Model selection based on hardware capability and task requirements.

### 2. Vector Store

- Stores embeddings of engineering documents, designs, BOMs, and knowledge entries.
- Enables semantic search over engineering knowledge.
- Populated by indexing project artifacts upon completion.
- Local FAISS or PostgreSQL pgvector for on-premises deployment.

### 3. Knowledge Graph

- Entities and their relationships across all domains.
- Enables graph traversal for impact analysis ("What entities are affected by changing Design X?").
- Built incrementally as projects progress.
- Exposes query API for the AI Copilot to retrieve context.

### 4. AI Copilot Service

The copilot is a reasoning layer, not a chatbot. It performs:

| Capability | Description |
|-----------|-------------|
| Query Understanding | Parse natural language into intent and parameters |
| Context Assembly | Retrieve relevant knowledge from vector store and graph |
| Recommendation | Suggest designs, materials, processes based on past projects |
| Explanation | Show reasoning chain with references to source knowledge |
| Approval Workflow | Route recommendations requiring human approval |

---

## Knowledge Growth Cycle

```
Project Execution
      │
      ▼
Artifact Collection ──► Indexing ──► Vector Store
(Designs, BOMs,          │              │
 NCRs, Process Plans)     │              │
      │                   ▼              ▼
      │            Knowledge Graph   Embeddings
      │                   │              │
      └───────────────────┴──────────────┘
                                  │
                                  ▼
                          Knowledge Base
                                  │
                                  ▼
                     AI Copilot Retrieval
                                  │
                                  ▼
                       Future Project Support
```

Every completed project enriches the knowledge base. The AI Copilot uses this accumulated knowledge to support future projects, creating a compounding intelligence effect.

---

## Recommendation Flow

```
User Query ──► AI Copilot
                   │
                   ▼
         Retrieve Context (Vector + Graph)
                   │
                   ▼
         Generate Recommendation
                   │
                   ▼
         Build Explanation
                   │
                   ├── Low Risk ──► Present to user with explanation
                   │
                   └── High Risk ──► Request human approval
                                      │
                                      ├── Approved ──► Apply change
                                      │
                                      └── Rejected ──► Log decision, no change
```

### Risk Classification

| Risk Level | Criteria | Approval Required |
|-----------|----------|-------------------|
| Informational | Data retrieval, summarization | No |
| Suggestive | Recommendations the user can evaluate | No |
| Affecting Data | Changes to design, BOM, process plan | Yes |
| Destructive | Deletion, archival, cancellation | Yes (escalated) |

---

## Constraints

- **No external API calls** for inference. All AI runs locally.
- **No training on customer data.** Models are used for inference only; no fine-tuning on tenant data.
- **Auditable.** Every AI interaction is logged with the context retrieved and the recommendation made.
- **Graceful degradation.** If the AI runtime is unavailable, the platform functions without AI features.
