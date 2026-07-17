# 004 — Engineering Ontology

## Overview

The Engineering Ontology defines the relationships between the first-class
concepts of the platform. Where the Meta-Model identifies *what* exists, the
Ontology defines *how they connect*.

---

## Ontological Categories

| Category | Concepts |
|----------|----------|
| Entities | Platform, Engagement, Repository, Artifact, Knowledge, Evidence, Decision |
| Actors | Provider, Agent, Model |
| Processes | Workflow, Execution, Review, Release |
| Descriptors | Capability, Methodology, Context, State, Result, Session |
| Relationships | Governs, Produces, Consumes, Supports, Validates, Implements |

---

## Core Relationships

```
Platform ──governs──> Engagement
Platform ──defines──> Capability
Platform ──specifies──> Methodology

Engagement ──scopes──> Workflow
Engagement ──selects──> Methodology
Engagement ──references──> Repository
Engagement ──produces──> Knowledge

Repository ──stores──> Artifact
Repository ──versions──> Knowledge
Repository ──indexes──> Evidence

Artifact ──has_type──> ArtifactType
Artifact ──has_lifecycle──> LifecycleState
Artifact ──references──> Artifact
Artifact ──produced_by──> Execution
Artifact ──verified_by──> Evidence
Artifact ──described_by──> Knowledge

Knowledge ──classified_as──> KnowledgeType
Knowledge ──derived_from──> Artifact
Knowledge ──supports──> Decision
Knowledge ──informs──> Capability
Knowledge ──refines──> Knowledge

Evidence ──collected_by──> Execution
Evidence ──supports──> Decision
Evidence ──validates──> Artifact
Evidence ──traces_to──> Artifact
Evidence ──produced_by──> Capability

Decision ──governs──> Methodology
Decision ──based_on──> Evidence
Decision ──relates_to──> Decision
Decision ──constrains──> Capability
Decision ──records──> Rationale

Capability ──implemented_by──> Provider
Capability ──executed_by──> Agent
Capability ──requires──> Knowledge
Capability ──produces──> Evidence
Capability ──consumes──> Artifact

Workflow ──composed_of──> Capability
Workflow ──depends_on──> Capability
Workflow ──governed_by──> Methodology
Workflow ──targets──> Goal

Execution ──instantiates──> Workflow
Execution ──produces──> Result
Execution ──produces──> Evidence
Execution ──uses──> Agent
Execution ──captures──> State

Provider ──provides──> Model
Provider ──implements──> Capability
Provider ──requires──> Configuration

Agent ──assigned──> Capability
Agent ──uses──> Model
Agent ──operates_in──> Session
Agent ──bounded_by──> Context

State ──records──> Position
State ──records──> Changes
State ──indicates──> NextAction
State ──checkpointed_at──> Execution
```

---

## Relationship Semantics

### Governance

Denotes authority or constraint. The governing concept defines rules or
boundaries for the governed concept.

*Example: Platform governs Engagement — all engagements must conform to the
platform's concept definitions.*

### Production

Denotes creation. The producer brings the produced concept into existence.

*Example: Execution produces Evidence — evidence does not exist before the
execution that collects it.*

### Consumption

Denotes usage without ownership. The consumer uses the consumed concept but
does not own or modify it.

*Example: Capability consumes Artifact — the capability reads the artifact
as input but does not change it.*

### Support

Denotes justification or strengthening. The supporter provides reasons for
or confirms the supported concept.

*Example: Evidence supports Decision — the decision is justified by the
evidence.*

### Validation

Denotes quality verification. The validator confirms that the validated
concept meets required criteria.

*Example: Evidence validates Artifact — the artifact is shown to meet its
specification through the evidence.*

### Implementation

Denotes realization. The implementer provides a concrete realization of
the abstract concept.

*Example: Provider implements Capability — the provider makes the
capability operational.*

---

## Ontological Invariants

1. **Every Decision is supported by at least one Evidence.**
   A decision with no supporting evidence is arbitrary.

2. **Every Knowledge item is derived from at least one Artifact.**
   Knowledge without a source is speculation.

3. **Every Execution produces at least one Evidence.** An execution that
   produces no evidence is invisible.

4. **Every Capability is implemented by at least one Provider.**
   A capability not implemented by any provider cannot be executed.

5. **Every Artifact has exactly one current Lifecycle State.**
   An artifact must always be in some known state.

6. **Every Engagement references exactly one Repository.**
   An engagement without a repository has no memory.

7. **Every Session is bounded by exactly one Engagement.**
   Sessions cannot span engagements.

8. **Every State checkpoint corresponds to exactly one Execution.**
   State is always the state of an execution.

---

## Ontology Diagram (Textual)

```
                    ┌──────────┐
                    │ Platform │
                    └────┬─────┘
                         │ governs
                    ┌────▼─────┐
                    │Engagement│
                    └────┬─────┘
                         │ scopes
                    ┌────▼────┐
             ┌──────│ Workflow│──────┐
             │      └────┬────┘      │
             │           │           │
             │    ┌──────▼───────┐   │
             │    │  Capability  │   │
             │    └──────┬───────┘   │
             │           │           │
    ┌────────▼───┐  ┌───▼──────┐  ┌─▼────────┐
    │  Provider  │  │  Agent   │  │Methodology│
    └────────────┘  └───┬──────┘  └──────────┘
                        │
              ┌─────────▼──────────┐
              │     Execution      │
              └──┬──────────┬──────┘
                 │          │
          ┌──────▼──┐  ┌───▼──────┐
          │  State  │  │  Result  │
          └─────────┘  └───┬──────┘
                           │ produces
                    ┌──────▼───────┐
                    │   Evidence   │
                    └──────┬───────┘
                           │ supports
                    ┌──────▼───────┐
                    │   Decision   │
                    └──────┬───────┘
                           │ governs
                    ┌──────▼───────┐
                    │ Methodology  │
                    └──────────────┘
```

---

## Cross-References

- Concepts are defined in [Meta-Model](003-Engineering-Meta-Model.md).
- Evidence relationships are detailed in [Evidence Model](008-Evidence-Model.md).
- Knowledge relationships are detailed in [Knowledge Model](006-Knowledge-Model.md).
- Artifact relationships are detailed in [Artifact Model](007-Artifact-Model.md).
