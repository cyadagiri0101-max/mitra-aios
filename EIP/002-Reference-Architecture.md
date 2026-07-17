# 002 — Reference Architecture

## Overview

The EIP Reference Architecture defines the structural layers of the platform.
Each layer has distinct responsibilities and communicates with adjacent
layers through defined interfaces. The architecture is independent of any
implementation technology.

---

## Layer Model

```
┌─────────────────────────────────────────────────────┐
│                 Engagement Layer                     │
│  Purpose, scope, goals, context, lifecycle          │
├─────────────────────────────────────────────────────┤
│                 Orchestration Layer                  │
│  Workflow, planning, execution, routing, recovery   │
├─────────────────────────────────────────────────────┤
│                 Capability Layer                     │
│  Analysis, generation, verification, reporting      │
├─────────────────────────────────────────────────────┤
│                 Knowledge Layer                      │
│  Knowledge graphs, ontology, classification, search │
├─────────────────────────────────────────────────────┤
│                 Artifact Layer                       │
│  Identity, lifecycle, storage, relationships        │
├─────────────────────────────────────────────────────┤
│                 Evidence Layer                       │
│  Collection, verification, provenance, traceability │
├─────────────────────────────────────────────────────┤
│                 Provider Layer                       │
│  AI providers, models, adapters, routing            │
├─────────────────────────────────────────────────────┤
│                 Foundation Layer                     │
│  Domain model, principles, ontology                 │
└─────────────────────────────────────────────────────┘
```

---

## Layer Descriptions

### Foundation Layer

**Responsibility.** Define the permanent concepts, relationships, and
principles that govern all other layers. This layer changes only when the
domain model itself evolves.

**Contents.** Meta-model, ontology, principles, concept definitions.

**Stability.** Immutable. Changes require architectural review and versioned
releases of the platform specification.

**Relationships.** All other layers reference and conform to the Foundation
Layer.

---

### Evidence Layer

**Responsibility.** Capture, verify, and trace evidence produced by
engineering activities. Ensure every conclusion is reproducible.

**Contents.** Evidence types, collection methods, verification protocols,
provenance tracking, chain-of-custody.

**Stability.** Stable. Evidence types may be extended but never removed.

**Relationships.** Consumed by the Artifact Layer (evidence is an artifact
type) and the Capability Layer (capabilities produce evidence).

---

### Artifact Layer

**Responsibility.** Manage the identity, lifecycle, storage, and
relationships of all engineering outputs.

**Contents.** Artifact model, lifecycle states, relationship types,
storage abstraction, versioning.

**Stability.** Stable. Artifact types may be added; core model remains fixed.

**Relationships.** Consumed by all upper layers. Provides persistence for
Knowledge, Evidence, and Capability outputs.

---

### Knowledge Layer

**Responsibility.** Organize, classify, and make searchable the knowledge
produced by engineering activities.

**Contents.** Knowledge classification, ontology representation, knowledge
graphs, search and retrieval, knowledge lifecycle.

**Stability.** Stable. Classification schemes may be extended.

**Relationships.** Consumes Artifact Layer for persistence. Consumed by
Capability Layer for context and by Orchestration Layer for planning.

---

### Capability Layer

**Responsibility.** Define and execute technology-independent engineering
capabilities.

**Contents.** Capability definitions, inputs/outputs, quality requirements,
composition rules, execution semantics.

**Stability.** Evolving. New capabilities are added as the platform grows;
existing capabilities are stable.

**Relationships.** Consumes Knowledge Layer for context, Artifact Layer for
inputs/outputs, Evidence Layer for quality verification. Consumed by
Orchestration Layer.

---

### Orchestration Layer

**Responsibility.** Plan, route, execute, and recover engineering workflows.

**Contents.** Workflow definitions, planning algorithms, execution engine,
recovery protocols, routing rules.

**Stability.** Evolving. Workflow patterns change with organizational
maturity.

**Relationships.** Consumes Capability Layer for available operations,
Knowledge Layer for context, Artifact Layer for state, Evidence Layer for
verification. Consumed by Engagement Layer.

---

### Engagement Layer

**Responsibility.** Define the purpose, scope, goals, and lifecycle of a
specific engineering engagement.

**Contents.** Engagement definition, stakeholder context, success criteria,
boundary conditions.

**Stability.** Per-engagement. The engagement structure is stable; each
instance has its own lifecycle.

**Relationships.** Consumes Orchestration Layer for execution. Produces
Knowledge and Artifacts that persist beyond the engagement.

---

### Provider Layer

**Responsibility.** Abstract AI providers and models behind capability
interfaces.

**Contents.** Provider adapters, model registry, capability-to-provider
mapping, routing rules, fallback policies.

**Stability.** Evolving. Providers and models change frequently. The layer
absorbs this volatility so upper layers remain stable.

**Relationships.** Implemented by the Capability Layer. Consumed by the
Orchestration Layer for routing decisions.

---

## Layer Communication Rules

1. Layers communicate only with adjacent layers through defined interfaces.
2. Upper layers depend on lower layers. Lower layers never depend on upper
   layers.
3. The Provider Layer is the only layer allowed to reference external
   systems.
4. The Foundation Layer has no dependencies except itself.
5. No layer may bypass the Evidence Layer when producing outputs that
   support decisions.

---

## Architectural Invariants

1. Every capability is implemented by at least one provider.
2. Every artifact has exactly one current lifecycle state.
3. Every decision is supported by at least one evidence artifact.
4. Every execution is recoverable from artifacts alone.
5. Every knowledge item traces to at least one source artifact.

---

## Cross-Cutting Concerns

**Traceability.** All layers participate in the evidence chain. Every
operation records its inputs, outputs, and context.

**Recovery.** The Orchestration Layer can reconstruct execution state from
Artifact Layer snapshots and Evidence Layer traces.

**Independence.** No layer except the Provider Layer references specific AI
vendors, models, or APIs.

---

## Relationships

- Foundation Layer concepts are defined in [Meta-Model](003-Engineering-Meta-Model.md).
- Layer responsibilities align with [Ontology](004-Engineering-Ontology.md) relationships.
- The [Implementation Strategy](013-Implementation-Strategy.md) recommends
  layer build order preserving dependency direction.
