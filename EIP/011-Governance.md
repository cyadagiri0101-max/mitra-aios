# 011 — Governance

## Overview

Governance defines how architectural decisions are captured, reviewed, and
evolved. It establishes the decision framework that ensures engineering
choices are recorded, traceable, and accountable.

---

## Decision Architecture

Every architectural decision in the platform is recorded as an Architecture
Decision Record (ADR). ADRs are first-class artifacts with defined
structure, lifecycle, and relationships.

---

## Architecture Decision Record Structure

```
ADR
├── Identity
│   ├── ID (unique, sequential or date-based)
│   └── Title (concise statement of the decision)
├── Status
│   ├── Current (Proposed → Reviewed → Accepted → Superseded → Rejected)
│   └── History (all status transitions)
├── Context
│   ├── Problem Statement (what prompted this decision)
│   ├── Constraints (boundary conditions)
│   ├── Assumptions (things taken as true)
│   └── Related Decisions (linked ADR IDs)
├── Decision
│   ├── Statement (the chosen course of action)
│   ├── Rationale (why this was chosen)
│   └── Consequences (expected outcomes, positive and negative)
├── Alternatives
│   ├── Option A (with evaluation)
│   ├── Option B (with evaluation)
│   └── Option N (with evaluation)
├── Evidence
│   ├── Supporting Evidence (evidence IDs)
│   ├── Evaluation Results (analysis that informed the decision)
│   └── Risk Assessment
├── Metadata
│   ├── Author (person or agent)
│   ├── Date
│   ├── Engagement Reference
│   └── Tags
└── Supersession
    ├── Supersedes (ADR IDs this replaces)
    └── Superseded By (ADR IDs that replace this)
```

---

## Decision Lifecycle

```
Proposed → Reviewed → Accepted → Superseded → Rejected
               │           │
               └───────────┘
            (revisions requested)
```

| State | Description |
|-------|-------------|
| Proposed | Decision is drafted but not yet evaluated. |
| Reviewed | Decision has been examined by reviewers. |
| Accepted | Decision is adopted and in effect. |
| Superseded | Decision has been replaced by a newer decision. |
| Rejected | Decision was reviewed but not accepted. |

### Transition Requirements

| Transition | Requirement |
|------------|-------------|
| Proposed → Reviewed | Evidence package complete (alternatives evaluated) |
| Reviewed → Accepted | Review approval with rationale |
| Accepted → Superseded | New ADR that explicitly supersedes this one |
| Accepted → Rejected | Review rejection with rationale |
| Reviewed → Proposed | Revision requested with specific change requirements |

---

## ADR Strategy

### Numbering

ADRs are numbered sequentially per engagement using the format
`ADR-{engagement}-{NNNN}`. The sequential number ensures ordering, and the
engagement prefix enables cross-engagement reference.

### Storage

ADRs are stored as artifacts in the engagement repository. The artifact type
is `DecisionRecord`.

### Scope

ADRs cover:

- Architecture decisions (system structure, patterns, technologies)
- Platform decisions (concept changes, principle changes)
- Engagement decisions (methodology, scope, success criteria)
- Capability decisions (what capabilities to provide, in what order)

ADRs do not cover:

- Implementation details that do not affect architecture
- Operational procedures that are governed by methodology
- Configuration choices that are governed by policy

### Granularity

Each ADR captures exactly one decision. Multiple related decisions are
captured as multiple ADRs that reference each other.

---

## Decision Relationships

ADR relationships form a directed graph:

```
ADR-001 (Accepted: Use microservices)
  ├── Supersedes: ADR-000 (Rejected: Use monolith)
  ├── Related: ADR-003 (Accepted: Service boundary definition)
  └── Constrained by: ADR-005 (Accepted: Must use event-driven communication)

ADR-003 (Accepted: Service boundary definition)
  └── Refines: ADR-001

ADR-012 (Proposed: Migrate to modular monolith)
  └── Supersedes: ADR-001 (if accepted)
```

The decision graph enables:

- **Impact analysis.** What decisions are affected by a new proposal?
- **Evolution tracking.** How has the architecture changed over time?
- **Rationale recovery.** Why was a particular approach chosen?
- **Constraint discovery.** What previous decisions constrain current options?

---

## Review Process

Decisions are reviewed to ensure quality and consistency.

### Review Criteria

| Criterion | Question |
|-----------|----------|
| Clarity | Is the decision clearly stated and unambiguous? |
| Completeness | Are all alternatives evaluated? |
| Evidence | Is the decision supported by reproducible evidence? |
| Consistency | Does the decision align with existing accepted decisions? |
| Consequences | Are positive and negative consequences identified? |
| Traceability | Can the decision be traced back to requirements? |

### Review States

- **Pending.** Waiting for reviewers.
- **In Progress.** Review is active.
- **Approved.** Decision accepted.
- **Changes Requested.** Revisions needed before acceptance.
- **Rejected.** Decision not accepted.

---

## Governance and Methodology

Methodology defines the engineering approach for an engagement. Governance
decisions about methodology are captured as ADRs.

| Methodology Decision | Example ADR |
|---------------------|-------------|
| Development process | "Engagement will use trunk-based development" |
| Testing strategy | "All services must have >80% test coverage" |
| Documentation standard | "API documentation follows OpenAPI 3.1" |
| Review requirements | "All production changes require two approvals" |

---

## Cross-References

- Decision as a concept is defined in [Meta-Model](003-Engineering-Meta-Model.md).
- Decision relationships are defined in [Ontology](004-Engineering-Ontology.md).
- Decision Records are [Artifacts](007-Artifact-Model.md) of type DecisionRecord.
- Decisions are supported by [Evidence](008-Evidence-Model.md).
- Governance operates within the [Reference Architecture](002-Reference-Architecture.md).
