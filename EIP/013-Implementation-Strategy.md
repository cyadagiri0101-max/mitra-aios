# 013 — Implementation Strategy

## Overview

This document recommends the order in which the EIP platform should be
implemented. It does not specify how to implement any component. It only
establishes the dependency-driven sequence that minimizes rework and
maximizes architectural integrity.

---

## Implementation Principles

1. **Foundation first.** Core concepts and principles are implemented before
   any capability or provider.
2. **Layer by layer.** Implementation follows the Reference Architecture
   layers, bottom to top.
3. **Evidence before orchestration.** Evidence capture and artifact
   management are implemented before workflow orchestration.
4. **One capability at a time.** Capabilities are implemented one at a time,
   each fully verified before the next begins.
5. **Provider last.** Provider abstraction is implemented only after at least
   one capability is fully defined and its evidence model is proven.
6. **Engagement shell first.** The engagement structure is implemented early
   to provide scope for all other components, but engagement-specific
   configuration is added last.

---

## Recommended Phase Order

### Phase 0: Foundation

**Duration estimate.** Conceptual, no implementation time.

**Activities.**

- Finalize the platform vision, principles, and reference architecture.
- Stabilize the meta-model and ontology.
- Establish the governance model and ADR strategy.
- Define the evolution model.

**Artifacts produced.** EIP documents (this architecture).

**Dependencies.** None. This is the starting point.

**Acceptance criteria.** Architecture is reviewed and approved by
stakeholders. All concept definitions are consistent and complete.

---

### Phase 1: Artifact Layer

**Rationale.** Everything depends on artifacts. The artifact layer provides
the universal container for all engineering outputs. Without it, no other
layer can persist anything.

**Activities.**

- Implement the artifact model: identity, versioning, lifecycle.
- Implement artifact storage: persistence, retrieval, indexing.
- Implement artifact relationships: graph traversal, impact analysis.
- Implement the artifact type taxonomy.

**Dependencies.** Phase 0 (concept definitions).

**Acceptance criteria.** Artifacts can be created, stored, versioned,
retrieved, related, and lifecycle-transitioned.

---

### Phase 2: Evidence Layer

**Rationale.** Evidence is the foundation of engineering rigor. Before any
capability is implemented, the evidence model must be operational so that
capabilities can produce verifiable outputs from day one.

**Activities.**

- Implement the evidence model: types, structure, lifecycle.
- Implement evidence collection and verification.
- Implement evidence chains and provenance.
- Implement reproducibility support (method capture, environment recording).

**Dependencies.** Phase 1 (evidence records are artifacts).

**Acceptance criteria.** Evidence can be collected, verified, chained, and
reproduced.

---

### Phase 3: Knowledge Layer

**Rationale.** Knowledge is the platform's most valuable asset. The
knowledge layer must be operational before capabilities produce knowledge,
so that knowledge capture is integrated from the start.

**Activities.**

- Implement the knowledge classification system.
- Implement knowledge extraction, storage, and retrieval.
- Implement knowledge relationships (hierarchical, associative,
  provenance).
- Implement knowledge lifecycle management.
- Implement knowledge search and quality scoring.

**Dependencies.** Phase 1 (knowledge items are artifacts). Phase 2
(knowledge is supported by evidence).

**Acceptance criteria.** Knowledge can be extracted, classified, stored,
searched, and lifecycle-managed.

---

### Phase 4: Capability Layer (First Capability)

**Rationale.** With the foundation layers in place, the first capability
can be implemented as a complete end-to-end example that validates the
entire stack.

**Recommended first capability.** Repository Analysis.

**Rationale for choice.**

- Produces clearly defined evidence types (ScanReport, DependencyMap).
- Consumes only artifacts (repository contents).
- Has well-defined quality requirements (complete coverage, accurate
  detection).
- Is foundational to most engineering workflows.

**Activities.**

- Implement the capability model: definition, versioning, registry.
- Implement the first capability: Repository Analysis.
- Implement capability composition (sequential, parallel, conditional).
- Verify that the capability produces evidence according to the Evidence
  Model.

**Dependencies.** Phase 1 (artifacts), Phase 2 (evidence), Phase 3
(knowledge).

**Acceptance criteria.** Repository Analysis capability produces verifiable
evidence and extractable knowledge from any repository.

---

### Phase 5: State Layer

**Rationale.** State is minimal and derived. It is implemented after the
artifact and evidence layers are operational because state is reconstructed
from them.

**Activities.**

- Implement the minimal state model (position, changes, next action).
- Implement state checkpointing.
- Implement state recovery from artifact graph.
- Implement state diffing.

**Dependencies.** Phase 1 (artifacts), Phase 4 (execution produces state
transitions).

**Acceptance criteria.** State can be checkpointed, recovered, and diffed
from the artifact graph.

---

### Phase 6: Orchestration Layer

**Rationale.** Orchestration requires capabilities, evidence, knowledge,
and state to be operational. It integrates them into workflows.

**Activities.**

- Implement workflow definition and composition.
- Implement execution engine (plan, dispatch, monitor, recover).
- Implement context assembly from artifacts and knowledge.
- Implement routing decisions for capability execution.
- Implement workflow recovery from state checkpoints.

**Dependencies.** Phase 4 (capabilities), Phase 5 (state), Phase 2
(evidence), Phase 3 (knowledge).

**Acceptance criteria.** Workflows can be defined, executed, monitored, and
recovered. Routing decisions are recorded as evidence.

---

### Phase 7: Provider Layer

**Rationale.** Provider abstraction is implemented last because it requires
stable capability definitions, evidence models, and routing policies. Early
implementation would risk coupling to provider-specific concepts.

**Activities.**

- Implement the provider abstraction interface.
- Implement provider registration and capability declaration.
- Implement model selection policies.
- Implement routing policies (fixed, quality-first, cost-first, fallback).
- Implement the first provider adapter for one AI vendor.

**Dependencies.** Phase 4 (capabilities need providers), Phase 6
(orchestration routes to providers).

**Acceptance criteria.** A provider can be registered, its capabilities
verified, and it can be selected by routing policies for execution.

---

### Phase 8: Engagement Layer

**Rationale.** Engagement structure is implemented after all other layers
are operational, so engagement configuration can reference established
concepts.

**Activities.**

- Implement engagement initiation and lifecycle.
- Implement engagement configuration (scope, goals, methodology, routing
  policies).
- Implement engagement-specific context assembly.
- Implement engagement archival and knowledge preservation.

**Dependencies.** All prior phases.

**Acceptance criteria.** An engagement can be created, configured, executed,
and archived with full knowledge preservation.

---

### Phase 9: Additional Capabilities

**Rationale.** Once the platform is operational with the first capability,
additional capabilities are added in priority order determined by
organizational needs.

**Recommended order for next capabilities.**

1. Architecture Review
2. Planning
3. Code Generation
4. Verification
5. Documentation
6. Testing
7. Security Analysis
8. Migration
9. Reporting
10. Dependency Analysis
11. Knowledge Extraction
12. Risk Assessment

Each capability follows the same pattern: define, implement, verify
evidence production, integrate into workflow composition.

---

### Phase 10: Additional Providers

**Rationale.** Once the provider layer is operational with one provider,
adding additional providers validates the abstraction and demonstrates
provider independence.

**Activities for each new provider.**

- Implement provider adapter.
- Verify each claimed capability.
- Update routing policies.
- Monitor and record quality metrics.

---

## Strategic Notes

### Parallelism

Phases 2 (Evidence) and 3 (Knowledge) can proceed in parallel after Phase 1
(Artifact) is complete, since they depend only on artifacts, not on each
other.

### Iteration

Within each phase, implementation is iterative. The first iteration
implements the core model. Subsequent iterations add edge cases,
optimizations, and additional types.

### Validation Gates

Each phase has an acceptance gate before the next phase begins. The gate
requires:

- All acceptance criteria for the phase are met.
- All artifacts produced by the phase are verified.
- The phase does not break any previous phase's acceptance criteria.

### Risk Mitigation

- **Phase 4 (first capability)** is the highest-risk phase because it is
  the first integration of all foundation layers. It should be scoped
  narrowly and verified thoroughly.
- **Phase 7 (first provider)** is the second-highest-risk phase because it
  connects the platform to an external system for the first time. The first
  provider should be well-known and well-documented.
- **Provider independence** is validated in Phase 10 when the second
  provider is added without modifying any capability or workflow.

---

## Cross-References

- Reference architecture layers: [002-Reference-Architecture.md](002-Reference-Architecture.md)
- Capability model: [005-Capability-Model.md](005-Capability-Model.md)
- Evidence model: [008-Evidence-Model.md](008-Evidence-Model.md)
- Knowledge model: [006-Knowledge-Model.md](006-Knowledge-Model.md)
- AI Orchestration: [010-AI-Orchestration.md](010-AI-Orchestration.md)
- Platform evolution: [012-Evolution-Model.md](012-Evolution-Model.md)
