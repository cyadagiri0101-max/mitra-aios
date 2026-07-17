# 007 — Artifact Model

## Overview

The Artifact Model defines the universal structure, lifecycle, and
relationship patterns for all engineering outputs. Every persistent output
of the platform is an artifact — documents, reports, knowledge, evidence,
decisions, templates, prompts, schemas, state, source code, and the
repository structure itself.

---

## Artifact Structure

```
Artifact
├── Identity
│   ├── ID (unique, stable, content-addressable within repository)
│   ├── Name (human-readable)
│   └── Type (from artifact type taxonomy)
├── Versioning
│   ├── Version (semantic or sequential)
│   ├── Previous Version (link)
│   └── Changelog
├── Ownership
│   ├── Creator (agent or person)
│   ├── Owner (responsible entity)
│   └── Contributors
├── Lifecycle
│   ├── Status (see Lifecycle States)
│   └── Status History (timeline of transitions)
├── Content
│   ├── Body (format determined by type)
│   ├── Schema (format specification)
│   └── Encoding
├── Relationships
│   ├── Parent Artifact (composition)
│   ├── Child Artifacts (contained items)
│   ├── References (citations, dependencies)
│   ├── Referenced By (incoming citations)
│   ├── Derived From (source artifacts)
│   └── Supersedes / Superseded By (version chain)
├── Evidence
│   ├── Supporting Evidence (evidence IDs)
│   ├── Verification Records (review IDs)
│   └── Quality Metrics
├── Metadata
│   ├── Created
│   ├── Modified
│   ├── Size
│   ├── Tags
│   ├── Engagement Reference
│   └── Execution Reference
└── History
    ├── Audit Log (all state transitions)
    └── Change History (content diffs)
```

---

## Artifact Type Taxonomy

### Primary Types

| Type | Description | Examples |
|------|-------------|----------|
| Document | Structured narrative content | Specification, design doc, guide |
| Report | Structured summary of analysis | Scan report, review report |
| Knowledge Item | Classified engineering knowledge | Architecture pattern, decision record |
| Evidence Record | Verifiable observation | Test result, measurement, finding |
| Decision Record | Architecture decision record | ADR document |
| Template | Reusable artifact structure | Document template, prompt template |
| Schema | Formal type definition | JSON Schema, Protobuf definition |
| State Snapshot | Point-in-time state record | Execution state, checkpoint |
| Source Code | Executable source | Implementation, test, script |
| Configuration | System parameters | Config file, environment definition |
| Prompt | AI instruction | Capability prompt, workflow prompt |
| Plan | Structured execution plan | Workflow plan, sprint plan |

### Secondary Types

| Type | Description |
|------|-------------|
| Glossary | Term definitions for a domain or engagement |
| Ontology | Formal concept relationship model |
| Metric | Quantified measurement |
| Log | Sequential record of events |
| Diagram | Visual representation |
| Model | Trained or defined AI model artifact |

---

## Artifact Lifecycle

```
Draft → Review → Approved → Released → Deprecated → Archived
  │       │          │           │            │
  │       │          │           │            └── Retained for reference
  │       │          │           │
  │       │          │           └── Available for consumption
  │       │          │
  │       │          └── Frozen. Cannot be modified.
  │       │
  │       └── Under evaluation. Can be rejected → Draft.
  │
  └── Working state. Can be modified.
```

### State Definitions

| State | Meaning | Transitions |
|-------|---------|-------------|
| Draft | Active development. Content can change. | → Review, → Archived (withdrawn) |
| Review | Submitted for evaluation. Content frozen. | → Approved, → Draft (revisions requested) |
| Approved | Accepted as correct and complete. | → Released, → Draft (if errors found) |
| Released | Published for consumption. | → Deprecated, → Archived |
| Deprecated | Still available but not recommended. | → Archived, → Released (reinstated) |
| Archived | Retained but not surfaced. Read-only. | (terminal state) |

### Transition Requirements

| Transition | Requirement |
|------------|-------------|
| Draft → Review | Submission evidence (completeness check) |
| Review → Approved | Review artifact with positive verdict |
| Approved → Released | Release authorization |
| Released → Deprecated | Deprecation notice with replacement reference |
| Deprecated → Archived | Retention period elapsed |
| Any → Draft | Revision request with rationale |

---

## Artifact Relationship Types

| Relationship | Description | Cardinality |
|-------------|-------------|-------------|
| Contains | Composition. Child artifact is part of parent. | 1:N |
| References | Citation. One artifact references another. | M:N |
| Derived From | Origin. Artifact was created from source. | 1:N |
| Supersedes | Replacement. New artifact replaces old. | 1:1 |
| Depends On | Prerequisite. Artifact requires another. | M:N |
| Validated By | Verification. Artifact is confirmed by evidence. | 1:N |
| Described By | Knowledge. Artifact has associated knowledge. | 1:N |
| Implements | Realization. Artifact implements a specification. | 1:N |

---

## Artifact Graph

Artifacts form a directed acyclic graph (DAG) through their relationships.
This graph enables:

- **Traceability.** Follow the chain from any artifact back to its sources.
- **Impact Analysis.** Find all artifacts that depend on a given artifact.
- **Root Cause Analysis.** Trace from evidence back through the work chain.
- **Knowledge Discovery.** Navigate from knowledge to source artifacts.

The artifact graph is the platform's primary navigation structure.

---

## Storage Constraints

1. **Immutability.** Released and Archived artifacts are immutable. No
   content changes after release.
2. **Versioning.** Every content change creates a new artifact version.
   Previous versions are retained.
3. **Addressability.** Every artifact version is addressable by ID. The
   "latest" version is a computed pointer.
4. **Persistence.** No artifact is ever deleted. Archived artifacts are
   retained indefinitely.
5. **Indexing.** The artifact graph is indexed for traversal queries.

---

## Cross-References

- Artifact as a concept is defined in [Meta-Model](003-Engineering-Meta-Model.md).
- Artifact relationships are detailed in [Ontology](004-Engineering-Ontology.md).
- Evidence (a specialized artifact) is defined in [Evidence Model](008-Evidence-Model.md).
- State snapshots (specialized artifacts) are defined in [State Model](009-State-Model.md).
- Lifecycle governance is addressed in [Governance](011-Governance.md).
