# System Architecture

## Purpose

This document defines the system architecture of MITRA — the bounded contexts, their relationships, layers, and deployment model.

---

## Architecture Philosophy

MITRA is organized around a **project-centric, domain-oriented architecture**. Rather than a collection of business modules, the system is composed of bounded contexts that each encapsulate their own domain logic, data, and workflows.

The **Project domain is the backbone** of the architecture. Every other domain references the project lifecycle rather than communicating directly with one another. This ensures complete traceability from customer inquiry to field service.

---

## Bounded Contexts

```
┌──────────────────────────────────────────────────────────┐
│                     Knowledge Domain                      │
│  (Documents · Engineering Knowledge · Knowledge Graph )   │
└──────────────────────────────────────────────────────────┘
                            ▲
┌──────────┐  ┌──────────┐ ─ ─ ─ ┌──────────┐ ┌──────────┐
│Commercial│──│Project   │        │Service   ││ Quality  │
│ CRM      │  │ Domain   │        │ Dispatch ││Inspection│
│ RFQ      │  │──────────│        │Install   ││ NCR      │
│Quotation │  │Milestones│        │Maint     ││ CAPA     │
└──────────┘  │ Tasks    │        │Support   │└──────────┘
              │ Teams    │        └──────────┘
┌──────────┐  │ Timeline │        ┌──────────┐
│Engineer. │  └──────────┘        │Manufact. │
│ Design   │       │              │ ProdPlan │
│ CAD Meta │       │              │ MES      │
│ BOM      │       │              │MachAlloc │
│ProcPlan  │       │              │ Trials   │
│ EngChange│       │              │ ProdTrack│
└──────────┘       │              └──────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│                   Analytics & Intelligence                │
│  (Dashboards · KPIs · Predictive · Knowledge Graph )     │
└──────────────────────────────────────────────────────────┘
```

---

## Core Layers

### Presentation Layer
- React + Vite frontend
- Role-aware UI adapted to each domain's workflows
- Component library shared across domains

### Application Layer
- NestJS domain services — one service per bounded context
- Workflow orchestration across domain boundaries
- Event-driven communication via project lifecycle events

### Data Layer
- PostgreSQL — relational data per bounded context (schema-per-domain)
- MinIO — object storage for CAD files, drawings, documents
- Redis — caching, session management, job queues

### Intelligence Layer
- Vector store for engineering knowledge retrieval
- Local AI runtime (Ollama/LLM) for copilot capabilities
- Knowledge graph connecting entities across domains

---

## Domain Interaction Model

Domains do **not** call each other's APIs directly. Instead:

1. **Project events** (e.g., `ProjectCreated`, `MilestoneReached`, `TaskCompleted`) are published to a message bus.
2. **Interested domains** subscribe to relevant project lifecycle events.
3. **Each domain** maintains its own references to project entities (by ID), never sharing internal state directly.
4. **Traceability** is achieved by traversing the project event history and entity-project associations.

This decoupling ensures that domains can be developed, tested, and deployed independently.

---

## Deployment Model

- Containerized deployment (Docker Compose / Podman)
- Local-first — runs entirely on-premises without cloud dependencies
- Optional cloud connectivity for backups and analytics
- AI runtime runs locally alongside the application stack
- Secure-by-default: TLS, encrypted storage, RBAC enforcement

---

## Design Principles

| Principle | Description |
|-----------|-------------|
| Bounded Contexts | Each domain owns its data and logic; no cross-domain foreign keys |
| Project-Centric | The project is the central aggregate that all domains reference |
| Event-Driven | Domains communicate through project lifecycle events |
| Traceability First | Every entity carries its project and engineering decision lineage |
| Local AI | AI runs locally; no engineering IP leaves the premises |
| Human-in-the-Loop | AI recommends; humans approve before any engineering data changes |
