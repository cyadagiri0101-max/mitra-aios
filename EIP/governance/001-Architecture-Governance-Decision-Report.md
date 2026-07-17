# EIP Architecture Governance Decision Report

**Authority.** Engineering Intelligence Platform Architecture Governance Board
**Date.** 2026-07-09
**Review Under Governance.** EIP/reviews/001-Architecture-Consistency-Review.md
**Architecture Version.** Draft v0.9
**Decision Report Version.** 1.0

---

## 1. Executive Summary

The Architecture Governance Board has evaluated all findings from the
Independent Architecture Consistency Review (001-Architecture-Consistency-Review.md).
The review identified 38 distinct findings across 14 review tasks.

**Decision Summary:**

| Decision | Count | Findings |
|----------|-------|----------|
| ACCEPT | 23 | I1, I2, T1, T4, T5, M1, M2, M3, M4, M5, O1, O2, O3, O4, L1, C2, K1, K2, A1, A2, E1, E2, S1, S2, G1, G2, EV1, EV2, D1, D2 |
| REJECT | 0 | — |
| MODIFY | 9 | I3, T2, T3, L2, C1, O1, O2, G1, G2 |
| DEFER | 6 | C3, G3, G4, G5, G6, G7 |

**Critical Path.** Two findings remain CRITICAL after governance:
- T2 (Evidence/Artifact lifecycle): Modified decision requires polymorphic Artifact lifecycle
- T3 (Knowledge/Artifact lifecycle): Modified decision requires polymorphic Artifact lifecycle

These are resolved by the MODIFIED decision for I3 (unified concept model with polymorphic lifecycles).

**Freeze Recommendation.** **CONDITIONAL FREEZE APPROVED.** The architecture may proceed to
v1.0 freeze once the ACCEPTED and MODIFIED findings are implemented and verified.
DEFERRED items are explicitly excluded from v1.0 scope.

---

## 2. Decision Matrix

| Finding ID | Title | Severity | Decision |
|------------|-------|----------|----------|
| I1 | Result concept redundancy | Minor | ACCEPT |
| I2 | Session/Context overlap | Minor | ACCEPT |
| I3 | Unregistered concepts | Major | MODIFY |
| T1 | Provider lifecycle conflict | Critical | ACCEPT |
| T2 | Evidence/Artifact lifecycle conflict | Critical | MODIFY |
| T3 | Knowledge/Artifact lifecycle conflict | Major | MODIFY |
| T4 | Review dual meaning | Major | ACCEPT |
| T5 | Release dual meaning | Major | ACCEPT |
| M1 | Result redundancy (duplicate) | Minor | ACCEPT |
| M2 | Missing abstract base concepts | Moderate | ACCEPT |
| M3 | Domain as first-class | Major | ACCEPT |
| M4 | Requirement as first-class | Major | ACCEPT |
| M5 | Policy as first-class | Major | ACCEPT |
| O1 | Missing cardinality | Major | ACCEPT |
| O2 | Missing constraints | Moderate | ACCEPT |
| O3 | Missing depends_on relationship | Minor | ACCEPT |
| O4 | Provider-Model inverse | Minor | ACCEPT |
| L1 | Provider layer dependency risk | Moderate | ACCEPT |
| L2 | Evidence layer ordering | Minor | MODIFY |
| C1 | Testing/Verification overlap | Major | MODIFY |
| C2 | Missing Design capability | Moderate | ACCEPT |
| C3 | Missing Refactoring capability | Minor | DEFER |
| K1 | Knowledge classification overlap | Minor | ACCEPT |
| K2 | Quality weights undefined | Minor | ACCEPT |
| A1 | Artifact ID scheme ambiguity | Moderate | ACCEPT |
| A2 | Immutability contradiction | Moderate | ACCEPT |
| E1 | Source artifacts not mandatory | Minor | ACCEPT |
| E2 | Confidence score underdefined | Minor | ACCEPT |
| S1 | Workflow-level state missing | Minor | ACCEPT |
| S2 | Change tracking ambiguous | Minor | ACCEPT |
| O1 | Provider selection policy gap | Moderate | MODIFY |
| O2 | Provider health monitoring gap | Moderate | MODIFY |
| G1 | ADR numbering limit | Minor | MODIFY |
| G2 | No ADR template | Minor | MODIFY |
| EV1 | Deprecation window unspecified | Minor | ACCEPT |
| EV2 | Migration path underspecified | Minor | ACCEPT |
| D1 | Meta-Model single point of failure | Moderate | ACCEPT |
| D2 | 013 depends on all documents | Minor | ACCEPT |

---

## 3. Accepted Findings

### I1 — Result Concept Redundancy

**Decision:** ACCEPT
**Reasoning.** Result adds no unique behavior beyond Artifact. Every attribute of
Result (outputs, errors, duration, evidence links) is expressible as an
Artifact of type Report or Log. Retaining Result as a first-class concept
violates Principle 7 (Simplicity over unnecessary abstraction).

**Evidence.** 003 defines Result as "Capture the output of a workflow execution
or capability invocation." 007 defines Artifact as "Represent any persistent
engineering output." Result is a proper subset.

**Architectural Impact.** Reduces concept count from 24 to 23. Simplifies
ontology: all execution outputs are Artifacts.

**Complexity Impact.** Negative (reduces complexity). One fewer concept to
implement, version, and govern.

**Long-term Impact.** Prevents concept drift where Result and Artifact
diverge in lifecycle or metadata.

**Affected Concepts.** Result (removed), Artifact (unchanged).

**Affected Documents.** 003 (Meta-Model), 004 (Ontology — remove Result
relationships).

**Priority.** High — implement before v1.0 freeze.

---

### I2 — Session/Context Overlap

**Decision:** ACCEPT
**Reasoning.** Session is a temporal boundary with zero persistence
responsibility. Context is the persisted information assembly. The current
design has Context containing Session history, creating a circular dependency
and violating Principle 3 (State is minimal).

**Evidence.** 003 Context attributes include "Session history." 010 Rule 5
includes session history in Context.

**Architectural Impact.** Session becomes a lightweight boundary marker (ID,
start/end time, token count). Context references Session ID but does not
contain session history.

**Complexity Impact.** Reduces Context size and eliminates circular dependency.

**Long-term Impact.** Clearer separation: Sessions are ephemeral; Context is
recoverable from repository.

**Affected Concepts.** Session, Context.

**Affected Documents.** 003 (Meta-Model), 010 (AI Orchestration).

**Priority.** High — implement before v1.0 freeze.

---

### T1 — Provider Lifecycle Conflict

**Decision:** ACCEPT
**Reasoning.** The Evolution Model (012) lifecycle is more complete and
semantically correct for provider version management. The Meta-Model (003)
lifecycle is a subset missing Candidate and Stable states.

**Evidence.** 003: Registered → Active → Degraded → Removed. 012: Available
→ Candidate → Stable → Deprecated → Removed.

**Architectural Impact.** Single source of truth for provider lifecycle.
Implementers have unambiguous guidance.

**Complexity Impact.** Neutral — same number of states, better semantics.

**Long-term Impact.** Enables provider maturation tracking (Candidate →
Stable) which is essential for production routing policies.

**Affected Concepts.** Provider.

**Affected Documents.** 003 (Meta-Model — update to match 012), 012
(Evolution — canonical).

**Priority.** Critical — implement before v1.0 freeze.

---

### T4 — Review as Concept and Lifecycle State

**Decision:** ACCEPT
**Reasoning.** The lifecycle state "Review" and the concept "Review" are
semantically distinct. An artifact IN the "InReview" state may have multiple
Review evaluations performed on it. Renaming the state eliminates ambiguity.

**Evidence.** 003: "Review — Evaluate artifact quality." 007: "Review —
Submitted for evaluation."

**Architectural Impact.** Terminology clarification only. No structural change.

**Complexity Impact.** None.

**Long-term Impact.** Prevents implementation confusion where "review count"
becomes ambiguous.

**Affected Concepts.** Review (concept), InReview (lifecycle state).

**Affected Documents.** 003 (Meta-Model), 007 (Artifact Model).

**Priority.** High — implement before v1.0 freeze.

---

### T5 — Release as Concept and Lifecycle State

**Decision:** ACCEPT
**Reasoning.** The concept Release performs the publishing action; the state
Released is the result. These are causally related but semantically distinct.
The distinction must be explicitly documented.

**Evidence.** 003: "Release — Publish an approved artifact." 007: "Released —
Published for consumption."

**Architectural Impact.** Documentation clarification only.

**Complexity Impact.** None.

**Long-term Impact.** Clearer audit trail: Release action produces Released
state.

**Affected Concepts.** Release (concept), Released (lifecycle state).

**Affected Documents.** 003 (Meta-Model), 007 (Artifact Model).

**Priority.** High — implement before v1.0 freeze.

---

### M1 — Result Redundancy (Duplicate of I1)

**Decision:** ACCEPT
**Reasoning.** Same as I1. Result is removed as first-class concept.

**Priority.** High — already covered by I1.

---

### M2 — Missing Abstract Base Concepts

**Decision:** ACCEPT
**Reasoning.** The pattern is clear: Artifact, Evidence, Knowledge, Decision
Record share identity, versioning, lifecycle, relationships, metadata,
history. Provider, Agent, Person share identity, capabilities, status,
configuration. Defining abstract bases prevents redefinition drift.

**Evidence.** 003 lists 24 peer concepts with no abstraction. Structural
comparison in review shows 8+ shared attributes.

**Architectural Impact.** Two abstract concepts added to Meta-Model:
ArtifactBase, ActorBase. Concrete concepts inherit common structure.

**Complexity Impact.** Positive — eliminates duplicated attribute definitions
across 8+ concepts.

**Long-term Impact.** New concept types (e.g., Requirement, Policy) inherit
from ArtifactBase automatically, ensuring consistency.

**Affected Concepts.** ArtifactBase (abstract), ActorBase (abstract),
Artifact, Evidence, Knowledge, Decision, Provider, Agent, Person.

**Affected Documents.** 003 (Meta-Model), 004 (Ontology — add inheritance
relationships).

**Priority.** High — implement before v1.0 freeze.

---

### M3 — Domain as First-Class Concept

**Decision:** ACCEPT
**Reasoning.** Domain is the primary classification axis for Knowledge (006)
and the foundation of Domain-Driven Design. Omitting it as a concept creates
a gap between the knowledge model and the engagement model.

**Evidence.** 006: "Domain Classification — Architecture, Business,
Engineering, Operations, Security, Compliance, Manufacturing, Domain,
Technical." Domain appears as both a classifier and a domain value.

**Architectural Impact.** Domain becomes a bounded context within an
Engagement. It owns its ubiquitous language, knowledge items, and concepts.

**Complexity Impact.** Adds one concept with clear boundaries.

**Long-term Impact.** Enables multi-domain engagements with proper isolation.

**Affected Concepts.** Domain (new), Knowledge (references Domain).

**Affected Documents.** 003 (Meta-Model), 006 (Knowledge Model), 004
(Ontology).

**Priority.** High — implement before v1.0 freeze.

---

### M4 — Requirement as First-Class Concept

**Decision:** ACCEPT
**Reasoning.** Engineering traceability requires requirements. Capabilities
Verification and Testing both take "requirements" as input but the concept
does not exist. Without Requirement, traceability from capability execution
back to requirements is impossible.

**Evidence.** 005: Verification inputs include "specification or
requirements." Testing inputs include "test requirements."

**Architectural Impact.** Requirement concept with lifecycle (Proposed →
Approved → Implemented → Verified → Deprecated) and "validates" relationship
from Evidence.

**Complexity Impact.** Adds one concept but enables traceability that was
previously impossible.

**Long-term Impact.** Foundational for compliance, audit, and impact analysis.

**Affected Concepts.** Requirement (new), Evidence (adds validates
relationship).

**Affected Documents.** 003 (Meta-Model), 005 (Capability Model), 004
(Ontology), 008 (Evidence Model).

**Priority.** High — implement before v1.0 freeze.

---

### M5 — Policy as First-Class Concept

**Decision:** ACCEPT
**Reasoning.** Policies appear in routing (010), governance (011), lifecycle
transitions (007), and quality thresholds but have no unified model. Each
document defines policy differently. A platform cannot govern what it cannot
model.

**Evidence.** 010: six routing policy types. 011: review criteria,
transition requirements. 007: transition requirement tables.

**Architectural Impact.** Policy concept with: name, scope, rules, priority,
effective date, expiry, lifecycle (Proposed → Reviewed → Active → Superseded
→ Retired). All scattered policies become Policy instances.

**Complexity Impact.** Consolidates 6+ implicit policy definitions into one
explicit model.

**Long-term Impact.** Enables policy versioning, conflict detection, and
automated enforcement.

**Affected Concepts.** Policy (new), Capability (references Policy), Evidence
(validates Policy), Artifact (governed by Policy).

**Affected Documents.** 003 (Meta-Model), 004 (Ontology), 007 (Artifact
Model), 010 (AI Orchestration), 011 (Governance).

**Priority.** High — implement before v1.0 freeze.

---

### O1 — Missing Cardinality on All Relationships

**Decision:** ACCEPT
**Reasoning.** An ontology without cardinality is ambiguous. "Execution
produces Evidence" could be 1:1, 1:N, or M:N. Implementers cannot build
correct data models.

**Evidence.** 004 lists relationships with no cardinality notation.

**Architectural Impact.** Every relationship in 004 gets cardinality
annotation (1, 0..1, 0..*, 1..*, M:N).

**Complexity Impact.** One-time documentation effort. Enables correct
implementation.

**Long-term Impact.** Prevents data model mismatches between components.

**Affected Concepts.** All ontology relationships.

**Affected Documents.** 004 (Engineering Ontology).

**Priority.** High — implement before v1.0 freeze.

---

### O2 — Missing Constraints on Relationships

**Decision:** ACCEPT
**Reasoning.** Cardinality alone is insufficient. Constraints like "every
Decision must have at least one supporting Evidence" are business rules that
belong in the ontology.

**Evidence.** 004 lists invariants at the end but not embedded in
relationships.

**Architectural Impact.** Constraints become part of each relationship
definition in 004.

**Complexity Impact.** Documentation effort only.

**Long-term Impact.** Enables automated validation of ontology compliance.

**Affected Concepts.** All ontology relationships.

**Affected Documents.** 004 (Engineering Ontology).

**Priority.** High — implement before v1.0 freeze.

---

### O3 — Missing depends_on Relationship

**Decision:** ACCEPT
**Reasoning.** 007 defines "Depends On" as an artifact relationship but 004
omits it. This creates a gap between the artifact model and the ontology.

**Evidence.** 007 relationship table includes "Depends On — Prerequisite.
Artifact requires another. Cardinality: M:N."

**Architectural Impact.** Add `Artifact ──depends_on──> Artifact` to 004.

**Complexity Impact.** One relationship added.

**Long-term Impact.** Ontology fully covers artifact model relationships.

**Affected Concepts.** Artifact.

**Affected Documents.** 004 (Engineering Ontology).

**Priority.** Medium — implement before v1.0 freeze.

---

### O4 — Provider-Model Inverse Relationship

**Decision:** ACCEPT
**Reasoning.** Semantic direction (Provider provides Model) differs from
implementation direction (Model belongs to Provider). Both are needed.

**Evidence.** 004: "Provider ──provides──> Model." No inverse.

**Architectural Impact.** Add `Model ──belongs_to──> Provider` for
implementation clarity.

**Complexity Impact.** One inverse relationship added.

**Long-term Impact.** Clearer data model for provider registry
implementations.

**Affected Concepts.** Provider, Model.

**Affected Documents.** 004 (Engineering Ontology).

**Priority.** Medium — implement before v1.0 freeze.

---

### L1 — Provider Layer Dependency Risk

**Decision:** ACCEPT
**Reasoning.** The layer ordering is correct (Provider below Capability) but
the communication pattern must be explicit to prevent implementers from
creating direct dependencies.

**Evidence.** 002 places Provider Layer below Capability Layer. 004:
"Capability ──implemented_by──> Provider."

**Architectural Impact.** Add explicit note to 002: "Capability Layer
depends on Provider Layer through the abstraction/adapter pattern only. No
direct calls to provider implementations."

**Complexity Impact.** Documentation only.

**Long-term Impact.** Prevents circular dependency anti-pattern.

**Affected Concepts.** Capability, Provider.

**Affected Documents.** 002 (Reference Architecture).

**Priority.** High — implement before v1.0 freeze.

---

### C2 — Missing Design Capability

**Decision:** ACCEPT
**Reasoning.** The capability catalog has Architecture Review (evaluate
existing) and Code Generation (produce implementation) but no capability to
produce architecture/design from requirements. This is a gap in the
engineering lifecycle.

**Evidence.** 005 catalog has 13 capabilities, none for design production.

**Architectural Impact.** Add Design capability: purpose (produce
architecture/design artifacts from requirements and constraints), inputs
(requirements, constraints, reference architectures, context), outputs
(design artifacts, architecture documentation, design decisions).

**Complexity Impact.** One capability added to catalog.

**Long-term Impact.** Completes the engineering lifecycle: Requirements →
Design → Implementation → Verification.

**Affected Concepts.** Design (new capability).

**Affected Documents.** 005 (Capability Model), 004 (Ontology).

**Priority.** High — implement before v1.0 freeze.

---

### K1 — Knowledge Classification Domain Overlap

**Decision:** ACCEPT
**Reasoning.** The "Domain" domain value collides with the classification
concept "Domain." Rename to "ProblemDomain" eliminates ambiguity.

**Evidence.** 006: "Domain Classification — Architecture, Business,
Engineering, Operations, Security, Compliance, Manufacturing, Domain,
Technical."

**Architectural Impact.** Rename one enumeration value.

**Complexity Impact.** None.

**Long-term Impact.** Clearer classification, no concept/value confusion.

**Affected Concepts.** Knowledge (classification).

**Affected Documents.** 006 (Knowledge Model).

**Priority.** Medium — implement before v1.0 freeze.

---

### K2 — Knowledge Quality Weights Undefined

**Decision:** ACCEPT
**Reasoning.** The four quality dimensions (Accuracy, Completeness, Currency,
Traceability) combine into a confidence score, but the derivation is
unspecified. Weights must be engagement-configurable.

**Evidence.** 006: "aggregate confidence score is derived from them, but does
not specify the derivation formula or weights."

**Architectural Impact.** Document in 006: "Weights are implementation-defined
and configurable per engagement."

**Complexity Impact.** Documentation only.

**Long-term Impact.** Prevents hardcoded weights that don't fit all domains.

**Affected Concepts.** Knowledge.

**Affected Documents.** 006 (Knowledge Model).

**Priority.** Medium — implement before v1.0 freeze.

---

### A1 — Artifact Identity Scheme Ambiguity

**Decision:** ACCEPT
**Reasoning.** "Unique, stable, content-addressable" cannot be simultaneously
true. Content-addressable IDs change when content changes (not stable). Stable
IDs cannot be derived from content. The versioning model in 007 requires
stable IDs with explicit version links.

**Evidence.** 007: "ID (unique, stable, content-addressable within
repository)."

**Architectural Impact.** Choose stable UUID (option 1 in review).
Content-addressability is achieved via separate content hash field if needed.

**Complexity Impact.** Resolves implementation ambiguity.

**Long-term Impact.** Consistent identity model across all artifacts.

**Affected Concepts.** Artifact.

**Affected Documents.** 007 (Artifact Model).

**Priority.** Critical — implement before v1.0 freeze.

---

### A2 — Artifact Immutability Contradiction

**Decision:** ACCEPT
**Reasoning.** Draft state allows content changes. Released and Archived are
immutable. The text "Immutability — Released and Archived artifacts are
immutable" contradicts the general statement if read without state context.

**Evidence.** 007: "Immutability — Released and Archived artifacts are
immutable." Lifecycle: "Draft — Active development. Content can change."

**Architectural Impact.** Clarify: "Only Draft artifacts are mutable.
Released and Archived artifacts are immutable."

**Complexity Impact.** Documentation only.

**Long-term Impact.** Clear implementation guidance.

**Affected Concepts.** Artifact.

**Affected Documents.** 007 (Artifact Model).

**Priority.** High — implement before v1.0 freeze.

---

### E1 — Source Artifacts Not Mandatory

**Decision:** ACCEPT
**Reasoning.** Evidence without source artifacts is opinion, not evidence.
The Evidence Model requires traceability to source.

**Evidence.** 008 Evidence structure includes "Source Artifacts" but does not
mark as mandatory.

**Architectural Impact.** Make source artifacts mandatory for all evidence
types except direct Observation of environment.

**Complexity Impact.** Validation rule added.

**Long-term Impact.** Enforces evidence reproducibility (Principle 4).

**Affected Concepts.** Evidence.

**Affected Documents.** 008 (Evidence Model).

**Priority.** High — implement before v1.0 freeze.

---

### E2 — Confidence Score Underdefined

**Decision:** ACCEPT
**Reasoning.** Same as K2. The derivation is implementation-defined and
engagement-configurable.

**Evidence.** 008: "confidence score (0.0–1.0) is derived from these
dimensions" without formula.

**Architectural Impact.** Document: "Derivation is implementation-defined
with configurable weights per engagement."

**Complexity Impact.** Documentation only.

**Long-term Impact.** Prevents hardcoded scoring.

**Affected Concepts.** Evidence.

**Affected Documents.** 008 (Evidence Model).

**Priority.** Medium — implement before v1.0 freeze.

---

### S1 — Workflow-Level State Missing

**Decision:** ACCEPT
**Reasoning.** State is currently scoped to Execution. Workflow (the plan)
has its own state: which steps are complete, pending, failed. This is
distinct from execution state.

**Evidence.** 009: "State exists within the scope of a single execution or
plan item." 003 distinguishes Workflow from Execution.

**Architectural Impact.** Add workflow-level state concept: completed steps,
pending steps, failed steps, overall progress.

**Complexity Impact.** One additional state scope.

**Long-term Impact.** Enables planning and monitoring at workflow level,
separate from execution instances.

**Affected Concepts.** Workflow (adds state), State (now has execution and
workflow scope).

**Affected Documents.** 009 (State Model), 003 (Meta-Model).

**Priority.** Medium — implement before v1.0 freeze.

---

### S2 — Change Tracking Ambiguous

**Decision:** ACCEPT
**Reasoning.** "Since when?" must be explicit for state diffs to be
computable.

**Evidence.** 009 "Changes" section lists artifact/knowledge/decision changes
but not the baseline.

**Architectural Impact.** Clarify: changes are relative to the last
checkpoint.

**Complexity Impact.** Documentation only.

**Long-term Impact.** Unambiguous state recovery.

**Affected Concepts.** State.

**Affected Documents.** 009 (State Model).

**Priority.** Medium — implement before v1.0 freeze.

---

### EV1 — Deprecation Window Unspecified

**Decision:** ACCEPT
**Reasoning.** "At least one major version cycle" is ambiguous without
calendar definition.

**Evidence.** 012: "Deprecated features remain available for at least one
major version cycle."

**Architectural Impact.** Define: "Deprecated features remain available for
two minor versions or one calendar year, whichever is longer."

**Complexity Impact.** Policy definition only.

**Long-term Impact.** Predictable deprecation timeline.

**Affected Concepts.** Evolution.

**Affected Documents.** 012 (Evolution Model).

**Priority.** Medium — implement before v1.0 freeze.

---

### EV2 — Migration Path Underspecified

**Decision:** ACCEPT
**Reasoning.** "Every deprecation includes a migration path" needs minimum
requirements.

**Evidence.** 012: "Every deprecation includes a migration path to the
replacement."

**Architectural Impact.** Define minimum migration path: (a) automated
migration tool or script, (b) documented manual steps, (c) backward
compatibility period matching deprecation window.

**Complexity Impact.** Policy definition only.

**Long-term Impact.** Reduces breaking change risk.

**Affected Concepts.** Evolution.

**Affected Documents.** 012 (Evolution Model).

**Priority.** Medium — implement before v1.0 freeze.

---

### D1 — Meta-Model Single Point of Failure

**Decision:** ACCEPT
**Reasoning.** This is an architectural reality, not a defect. The Meta-Model
is the foundation; all documents depend on it. The mitigation is rigorous
review before freezing, not structural change.

**Evidence.** Dependency graph shows 003 as root for 004–013.

**Architectural Impact.** Acknowledge in governance. No structural change.

**Complexity Impact.** None.

**Long-term Impact.** Ensures Meta-Model changes go through full governance
after v1.0.

**Affected Concepts.** Platform (governance).

**Affected Documents.** 011 (Governance), 012 (Evolution).

**Priority.** Acknowledged — no implementation needed.

---

### D2 — 013 Depends on All Documents

**Decision:** ACCEPT
**Reasoning.** This is appropriate for an Implementation Strategy. It
sequences the build; it does not create circular dependencies.

**Evidence.** 013 references 002, 005, 006, 008, 010, 012.

**Architectural Impact.** None. This is correct dependency direction.

**Complexity Impact.** None.

**Long-term Impact.** None.

**Affected Concepts.** None.

**Affected Documents.** 013 (Implementation Strategy).

**Priority.** Acknowledged — no implementation needed.

---

## 4. Rejected Findings

**None.** All findings have merit and are addressed through ACCEPT, MODIFY,
or DEFER.

---

## 5. Modified Findings

### I3 — Unregistered Concepts (Policy, Contract, Quality, Metric, Template, Domain, Requirement)

**Decision:** MODIFY
**Reasoning.** Not all seven should become first-class concepts. The
platform must balance completeness with Principle 7 (Simplicity over
unnecessary abstraction).

**Modified Decision:**

| Concept | Decision | Rationale |
|---------|----------|-----------|
| Domain | **ACCEPT** as first-class | Required by M3, foundational to DDD |
| Requirement | **ACCEPT** as first-class | Required by M4, traceability foundation |
| Policy | **ACCEPT** as first-class | Required by M5, governance unification |
| Contract | **ACCEPT** as first-class | Capability I/O contracts need formal model |
| Quality | **MERGE** into Policy/Metric | Quality requirements are Policy rules; quality measurements are Metric instances. No separate concept needed. |
| Metric | **ACCEPT** as first-class | Measurements are distinct from Evidence; need independent identity, versioning, aggregation |
| Template | **RECLASSIFY** as ArtifactType | Templates are Artifacts (Principle 7). They need no separate concept. |

**Architectural Impact.** Four new first-class concepts (Domain, Requirement,
Policy, Contract, Metric). Quality absorbed. Template becomes ArtifactType
value.

**Complexity Impact.** +4 concepts (vs. +7 proposed). Quality merge reduces
concept count.

**Long-term Impact.** Core engineering concepts are modeled. Quality
emerges from Policy + Metric composition.

**Affected Concepts.** Domain, Requirement, Policy, Contract, Metric (new);
Quality (merged); Template (reclassified).

**Affected Documents.** 003 (Meta-Model), 004 (Ontology), 005 (Capability
Model), 006 (Knowledge Model), 007 (Artifact Model), 008 (Evidence Model),
010 (AI Orchestration), 011 (Governance).

**Priority.** Critical — implement before v1.0 freeze.

---

### T2 — Evidence/Artifact Lifecycle Conflict

**Decision:** MODIFY
**Reasoning.** Principle 7 states: "Everything is an artifact. Evidence... All
are artifacts." Making Evidence a separate concept violates this principle.
The solution is a **polymorphic Artifact lifecycle** that varies by
ArtifactType, not a separate concept hierarchy.

**Modified Decision.** Evidence remains an Artifact (subtype). The Artifact
lifecycle becomes polymorphic:

| ArtifactType | Lifecycle |
|--------------|-----------|
| Document, Report, Template, Schema, Code, Config | Draft → Review → Approved → Released → Deprecated → Archived |
| Evidence | Collected → Verified → Accepted → Superseded → Invalidated |
| Knowledge | Extracted → Validated → Published → Deprecated → Archived |
| DecisionRecord | Proposed → Reviewed → Accepted → Superseded → Rejected |

**Evidence.** Principle 7: "Everything is an artifact." 007 and 008 currently
conflict with this principle.

**Architectural Impact.** 007 defines the polymorphic lifecycle model.
008 and 006 reference it rather than defining separate lifecycles.

**Complexity Impact.** Single lifecycle model with type-specific state
machines. Simpler than three independent models.

**Long-term Impact.** New ArtifactTypes (e.g., Requirement, Policy) define
their own lifecycle without new concepts. Consistent with "Everything is an
artifact."

**Affected Concepts.** Artifact (polymorphic lifecycle), Evidence, Knowledge,
Decision, Requirement, Policy.

**Affected Documents.** 007 (Artifact Model — canonical), 006 (Knowledge
Model — remove separate lifecycle), 008 (Evidence Model — remove separate
lifecycle), 011 (Governance — ADR lifecycle as DecisionRecord type).

**Priority.** Critical — implement before v1.0 freeze.

---

### T3 — Knowledge/Artifact Lifecycle Conflict

**Decision:** MODIFY
**Reasoning.** Same as T2. Knowledge lifecycle becomes a polymorphic variant
of the Artifact lifecycle.

**Modified Decision.** Knowledge lifecycle integrated into Artifact
polymorphic lifecycle as shown in T2 decision table.

**Priority.** Critical — implement before v1.0 freeze.

---

### L2 — Evidence Layer Ordering Issue

**Decision:** MODIFY
**Reasoning.** Since T2/T3 MODIFIED decisions keep Evidence and Knowledge as
Artifact subtypes, the Evidence Layer and Knowledge Layer are sub-layers of
the Artifact Layer, not peers. The Reference Architecture layer model must
reflect this.

**Modified Decision.** In 002, restructure layers:

```
Foundation Layer
Evidence Sub-layer (of Artifact Layer)
Knowledge Sub-layer (of Artifact Layer)
Artifact Layer (base)
Capability Layer
...
```

Or more simply: Evidence and Knowledge are capabilities *within* the Artifact
Layer, not separate layers.

**Priority.** High — implement before v1.0 freeze.

---

### C1 — Testing/Verification Overlap

**Decision:** MODIFY
**Reasoning.** The review correctly identifies overlap. The resolution is not
to remove Testing but to define clear boundaries.

**Modified Decision.** Verification is the parent capability: "Confirm that
an artifact meets its specification or quality requirements through any
method." Testing is a sub-capability: "Verify through automated execution of
test cases." Verification encompasses Testing, Review, Analysis, Inspection.

**Architectural Impact.** 005: Verification capability includes Testing as
sub-capability. Testing retains its own definition but is composed within
Verification workflows.

**Complexity Impact.** Hierarchical capability model (one level of nesting).

**Long-term Impact.** Clear boundary: Testing = automated execution;
Verification = all confirmation methods.

**Affected Concepts.** Verification, Testing.

**Affected Documents.** 005 (Capability Model), 004 (Ontology).

**Priority.** High — implement before v1.0 freeze.

---

### O1 — Provider Selection Policy Gap

**Decision:** MODIFY
**Reasoning.** The finding identifies that routing policies are "configured
per engagement or per workflow" but the mechanism is unspecified. The Policy
concept (accepted via M5) resolves this: routing policies are Policy
instances with scope "routing."

**Modified Decision.** Routing policies are Policy artifacts. The routing
layer selects the applicable Policy by scope and priority. Policy Selection
is not a separate concept; it is Policy evaluation.

**Priority.** High — implement before v1.0 freeze (depends on Policy concept).

---

### O2 — Provider Health Monitoring Gap

**Decision:** MODIFY
**Reasoning.** The Provider abstraction (010) declares GetStatus but does not
define health states or monitoring. The Provider lifecycle (T1 ACCEPTED)
includes Degraded state, but no transition rules exist.

**Modified Decision.** Add health monitoring specification to 010:
- Health states: Healthy, Degraded, Unavailable
- Monitoring interval: configurable per engagement (default 30s)
- Degradation thresholds: latency p99, error rate, availability
- Automated transitions: Healthy → Degraded (threshold breach), Degraded →
  Unavailable (unreachable), Unavailable → Healthy (recovery confirmed)
- Health metrics recorded as Evidence artifacts

**Priority.** High — implement before v1.0 freeze (depends on Policy concept).

---

### G1 — ADR Numbering Limit

**Decision:** MODIFY
**Reasoning.** The review recommends 5+ digits. Better: remove padding
entirely. Use `ADR-{engagement}-{incrementing integer}` — no upper bound,
simpler parsing.

**Modified Decision.** Format: `ADR-{engagement}-{N}` where N is an
unpadded integer starting at 1.

**Priority.** Medium — implement before v1.0 freeze.

---

### G2 — No ADR Template Defined

**Decision:** MODIFY
**Reasoning.** The review recommends providing a template. The template
should be a canonical Artifact of type Template, versioned with the platform.

**Modified Decision.** Define ADR Template as a canonical Template artifact
in the platform specification. Engagements may extend but not remove required
sections.

**Priority.** Medium — implement before v1.0 freeze.

---

## 6. Deferred Findings

### C3 — Missing Refactoring Capability

**Decision:** DEFER
**Reasoning.** Code Generation (create), Migration (transform across
platforms), Verification (confirm quality) exist. Refactoring (improve
structure without behavior change) is valuable but not blocking for v1.0.
Engagements can achieve refactoring via Code Generation + Verification
composition.

**Revisit.** v1.1 planning.

---

### G3 — Template Not First-Class (from I3 MODIFY)

**Decision:** DEFER
**Reasoning.** I3 MODIFY decision reclassifies Template as ArtifactType. This
is implemented as part of I3, not deferred. The "deferred" marker here
indicates no separate concept work is needed.

---

### G4 — Metric Not First-Class (from I3 MODIFY)

**Decision:** DEFER
**Reasoning.** I3 MODIFY decision accepts Metric as first-class. Implemented
as part of I3.

---

### G5 — Quality Not First-Class (from I3 MODIFY)

**Decision:** DEFER
**Reasoning.** I3 MODIFY decision merges Quality into Policy + Metric. No
separate concept work needed.

---

### G6 — Contract Not First-Class (from I3 MODIFY)

**Decision:** DEFER
**Reasoning.** I3 MODIFY decision accepts Contract as first-class. Implemented
as part of I3.

---

### G7 — Domain Not First-Class (from I3 MODIFY)

**Decision:** DEFER
**Reasoning.** I3 MODIFY decision accepts Domain as first-class. Implemented
as part of I3.

---

## 7. Decision Packages

Each package groups related decisions for coordinated implementation.

### Package A: Concept Model Unification (Critical Path)

**Decisions.** I1, M1, M2, I3 (MODIFY), T2 (MODIFY), T3 (MODIFY)

**Scope.** Meta-Model (003), Artifact Model (007), Knowledge Model (006),
Evidence Model (008), Ontology (004), Governance (011).

**Deliverables.**
1. ArtifactBase and ActorBase abstract concepts in 003
2. Polymorphic Artifact lifecycle in 007 (canonical)
3. Evidence and Knowledge lifecycle references updated in 006, 008
4. Four new first-class concepts: Domain, Requirement, Policy, Contract, Metric
5. Quality merged into Policy + Metric
6. Template reclassified as ArtifactType value
7. Result removed; all outputs are Artifacts

**Dependencies.** None — this is the foundation.

**Estimated Effort.** 3–4 specification days.

---

### Package B: Lifecycle & Identity (Critical Path)

**Decisions.** A1, A2, T1, T4, T5, G1, G2

**Scope.** Artifact Model (007), Meta-Model (003), Evolution (012),
Governance (011).

**Deliverables.**
1. Stable UUID identity scheme in 007
2. Immutability clarification (Draft mutable, Released/Archived immutable)
3. Provider lifecycle unified to 012 model in 003
4. Lifecycle state "Review" → "InReview" in 003, 007
5. Release concept/state distinction documented in 003, 007
6. ADR numbering: `ADR-{engagement}-{N}`
7. ADR Template as canonical Template artifact

**Dependencies.** Package A (ArtifactBase).

**Estimated Effort.** 2 specification days.

---

### Package C: Ontology & Capability Completeness (High)

**Decisions.** O1, O2, O3, O4, C1 (MODIFY), C2, K1, L1

**Scope.** Ontology (004), Capability Model (005), Knowledge Model (006),
Reference Architecture (002).

**Deliverables.**
1. Cardinality on all 004 relationships
2. Constraints embedded in 004 relationships
3. depends_on relationship added to 004
4. Provider-Model inverse relationship added to 004
5. Verification/Testing hierarchy defined in 005
6. Design capability added to 005
7. Knowledge classification: "Domain" → "ProblemDomain"
8. Layer communication note added to 002

**Dependencies.** Package A.

**Estimated Effort.** 2 specification days.

---

### Package D: Operational Specifications (High)

**Decisions.** O1 (MODIFY), O2 (MODIFY), EV1, EV2, E1, E2, S1, S2, K2

**Scope.** AI Orchestration (010), Evidence Model (008), Knowledge Model
(006), State Model (009), Evolution (012).

**Deliverables.**
1. Routing policies as Policy artifacts (depends on Package A Policy concept)
2. Provider health monitoring spec in 010
3. Deprecation window: "two minor versions or one year"
4. Migration path minimum requirements in 012
5. Evidence source artifacts mandatory in 008
6. Confidence score derivation: implementation-defined, configurable
7. Workflow-level state in 009
8. State change baseline: last checkpoint
9. Knowledge quality weights: implementation-defined, configurable

**Dependencies.** Package A (Policy concept), Package C.

**Estimated Effort.** 2 specification days.

---

### Package E: Governance & Acknowledgment (Medium)

**Decisions.** D1, D2, L2 (MODIFY)

**Scope.** Governance (011), Evolution (012), Reference Architecture (002).

**Deliverables.**
1. Meta-Model SPOF acknowledged in 011, 012
2. 013 dependency noted as correct
3. Evidence/Knowledge as Artifact sub-layers in 002

**Dependencies.** Package A.

**Estimated Effort.** 1 specification day.

---

## 8. Complexity Assessment

### Concept Count Delta

| Before | After | Delta |
|--------|-------|-------|
| 24 first-class concepts | 27 first-class concepts | +3 |
| (including Result) | (Result removed, +4 new, Template→ArtifactType) | |

**Net +3 concepts** (Domain, Requirement, Policy, Contract, Metric = +5;
Result removed = -1; Template reclassified = -1).

### Abstraction Hierarchy Added

- ArtifactBase (abstract)
- ActorBase (abstract)

### Polymorphic Lifecycle

- One lifecycle model with 4+ type-specific state machines
- Replaces 3 independent lifecycle models

### Relationship Cardinality

- 25+ relationships in 004 now have cardinality and constraints

### Capability Hierarchy

- Verification → Testing (one level of nesting)

### Policy Unification

- 6+ implicit policy definitions → 1 Policy concept with instances

### Overall Assessment

**Complexity Change:** Slightly increased concept count (+3), significantly
reduced structural duplication (lifecycles, policies, base concepts). The
architecture is more complex in specification but simpler in implementation
because common patterns are factored into bases and polymorphism.

**Risk.** The polymorphic lifecycle and abstract bases are the highest-risk
changes. They require careful specification to avoid over-engineering.

---

## 9. Freeze Recommendation

**RECOMMENDATION: CONDITIONAL FREEZE APPROVED FOR v1.0**

**Conditions:**
1. Package A (Concept Model Unification) fully implemented and reviewed
2. Package B (Lifecycle & Identity) fully implemented and reviewed
3. Package C (Ontology & Capability) fully implemented and reviewed
4. Package D (Operational Specifications) fully implemented and reviewed
5. All CRITICAL and HIGH priority findings resolved
6. Second architecture review passes with score ≥ 85/100

**Explicitly NOT Required for v1.0:**
- Refactoring capability (C3, DEFERRED)
- Any v1.1+ evolution items

**Timeline Estimate.** 10–12 specification days for Packages A–E. Second
review: 2 days. Total: ~2 weeks to freeze readiness.

**Post-Freeze Governance.** After v1.0, all changes to the Meta-Model (003),
Artifact Model (007), or Ontology (004) require Architecture Governance
Board approval via ADR. Minor clarifications to other documents may proceed
via lightweight review.

---

## 10. Next Recommended Phase

**Phase 1: Specification Finalization (2 weeks)**
- Implement Packages A–E
- Internal consistency check across all 14 documents
- Generate updated architecture artifacts

**Phase 2: Second Architecture Review (1 week)**
- Independent review of updated v1.0 candidate
- Target score: ≥ 85/100
- Focus: verify all governance decisions implemented correctly

**Phase 3: v1.0 Freeze & Publication (1 week)**
- Governance Board sign-off
- Version tag: EIP v1.0
- Archive v0.9 draft
- Begin implementation planning (Phase 0E)

**Phase 4: Implementation Strategy Execution (per 013)**
- Phase 0: Foundation (Artifact Layer)
- Phase 1: Evidence Layer
- Phase 2: Knowledge Layer
- Phase 3: First Capability (Repository Analysis)
- ...

---

**Governance Board Sign-off.**

This decision report represents the official position of the EIP Architecture
Governance Board. All ACCEPTED and MODIFIED findings are binding for v1.0.
DEFERRED findings are explicitly excluded from v1.0 scope.

**Next Review Gate:** Post-Package implementation, pre-v1.0 freeze.