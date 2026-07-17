# 006 — Knowledge Model

## Overview

Knowledge is the platform's most valuable asset. It transcends individual
artifacts, sessions, and engagements. The Knowledge Model defines how
knowledge is classified, structured, related, and managed across its
lifecycle.

---

## Knowledge Classification

Knowledge is classified along two orthogonal dimensions: **domain** and
**form**.

### Domain Classification

| Domain | Description |
|--------|-------------|
| Architecture | System structure, patterns, decisions, trade-offs |
| Business | Domain rules, processes, stakeholders, value streams |
| Engineering | Implementation patterns, standards, conventions |
| Operations | Deployment, monitoring, incident response |
| Security | Threat models, vulnerabilities, compliance |
| Manufacturing | Build, test, release, deployment pipelines |
| Domain | The specific problem domain of the engagement |
| Technical | Language, framework, library, tool knowledge |

### Form Classification

| Form | Description |
|------|-------------|
| Fact | Verified, uncontested piece of knowledge |
| Concept | Abstract idea or category |
| Principle | Governing rule or law |
| Pattern | Reusable solution structure |
| Decision | Recorded choice with rationale |
| Reference | Pointers to authoritative sources |
| Glossary | Term definitions |
| Rule | Condition-action statement |
| Constraint | Limitation or boundary |
| Heuristic | Experience-based guideline |
| Relationship | Connection between knowledge items |
| Historical | Past state or evolution record |

---

## Knowledge Structure

Every knowledge item has:

```
Knowledge Item
├── Identity
│   ├── ID (unique, stable)
│   └── Version
├── Classification
│   ├── Domain (one primary, zero or more secondary)
│   └── Form (exactly one)
├── Content
│   ├── Title
│   ├── Body (structured or unstructured)
│   └── Keywords
├── Provenance
│   ├── Source Artifacts (IDs of originating artifacts)
│   ├── Extraction Method (how knowledge was obtained)
│   ├── Confidence (0.0–1.0)
│   └── Extracted By (capability or agent)
├── Relationships
│   ├── Parent Knowledge (broader concept)
│   ├── Related Knowledge (peer relationships)
│   ├── Refined By (more specific version)
│   └── Conflicts With (contradictory knowledge)
├── Lifecycle
│   ├── Status (Extracted → Validated → Published → Deprecated → Archived)
│   ├── Created
│   ├── Last Validated
│   └── Archived (if applicable)
└── Metadata
    ├── Engagement
    ├── Tags
    └── Quality Score
```

---

## Knowledge Relationships

### Hierarchical

- **Generalizes/Specializes.** A knowledge item can be a broader or narrower
  version of another. *Example: "Design Pattern" generalizes "Observer
  Pattern".*
- **Is Part Of / Contains.** Composition relationship. *Example: "Repository
  Pattern" is part of "Layered Architecture".*

### Associative

- **Related To.** Unspecified peer relationship.
- **Depends On.** Knowledge that must be understood first.
- **Influences.** One concept affects another.
- **Conflicts With.** Contradiction or incompatibility.

### Provenance

- **Derived From.** Artifact or evidence that produced this knowledge.
- **Validated By.** Evidence or review that confirmed this knowledge.
- **Supersedes.** Knowledge that replaces older knowledge.
- **Superseded By.** Newer knowledge that replaces this item.

---

## Knowledge Lifecycle

```
Extracted → Validated → Published → Deprecated → Archived
                ↑            │
                └────────────┘
              (re-validated)
```

| State | Description |
|-------|-------------|
| Extracted | Raw knowledge obtained from an artifact or execution. Not yet verified. |
| Validated | Knowledge has been confirmed against source artifacts or by review. |
| Published | Knowledge is available for search and reuse across engagements. |
| Deprecated | Knowledge is still available but known to be outdated or superseded. |
| Archived | Knowledge is retained but no longer actively surfaced. |

### Transition Rules

- **Extracted → Validated.** Requires evidence or review confirming accuracy.
- **Validated → Published.** Automatic after validation threshold is met.
- **Published → Deprecated.** Triggered by new knowledge that conflicts or
  supersedes, or by timeout.
- **Deprecated → Archived.** Automatic after a configurable retention period.
- **Deprecated → Validated.** Re-validation can restore deprecated knowledge.
- **Archived → Extracted.** Archived knowledge can be re-extracted from its
  source artifacts.

---

## Knowledge Quality

Knowledge quality is assessed on four dimensions:

| Dimension | Description | Measure |
|-----------|-------------|---------|
| Accuracy | Conforms to verifiable facts | Source agreement |
| Completeness | Covers the concept fully | Coverage score |
| Currency | Up to date with current state | Age since validation |
| Traceability | Links to source artifacts | Source count |

Each knowledge item carries an aggregate **confidence score** (0.0–1.0)
derived from these dimensions.

---

## Knowledge Operations

| Operation | Description |
|-----------|-------------|
| Extract | Derive knowledge from artifacts and evidence |
| Validate | Confirm knowledge against sources |
| Classify | Assign domain and form taxonomy |
| Link | Create relationships to other knowledge |
| Search | Find knowledge by query and filters |
| Retrieve | Get a specific knowledge item by ID |
| Deprecate | Mark as outdated |
| Archive | Retire from active use |
| Merge | Combine duplicate or overlapping items |
| Diff | Compare two versions of knowledge |

---

## Cross-References

- Knowledge as a concept is defined in [Meta-Model](003-Engineering-Meta-Model.md).
- Knowledge extraction is a [Capability](005-Capability-Model.md).
- Knowledge is stored as [Artifacts](007-Artifact-Model.md).
- Evidence supporting knowledge is detailed in [Evidence Model](008-Evidence-Model.md).
- Knowledge informs Decisions in [Governance](011-Governance.md).
