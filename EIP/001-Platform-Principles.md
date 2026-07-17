# 001 — Platform Principles

## Overview

These principles are permanent. They are not implementation guidelines.
They are architectural invariants. Any implementation that violates a
principle is not compliant with the Engineering Intelligence Platform.

---

## Principle 1: Repository is Permanent Memory

**Statement.** The repository is the authoritative, persistent record of all
engineering activity. Conversations with AI systems are temporary and must
never be treated as a source of truth.

**Rationale.** AI sessions are ephemeral and non-reproducible. Only artifacts
committed to the repository survive across sessions, team members, and
organizational changes.

**Implications.**

- All decisions, evidence, and knowledge must be persisted as artifacts.
- AI must be able to reconstruct full context from repository artifacts alone.
- Session history is a cache, not a store.

**See also.** [Artifact Model](007-Artifact-Model.md), [State Model](009-State-Model.md)

---

## Principle 2: Knowledge is a First-Class Asset

**Statement.** Knowledge is more valuable than prompts, code, or
configuration. The platform optimizes for knowledge capture, organization,
and reuse above all other outputs.

**Rationale.** Code can be regenerated. Knowledge — about architecture,
decisions, domain constraints, and engineering patterns — compounds over
time and differentiates effective organizations.

**Implications.**

- Knowledge must have its own lifecycle, identity, and quality standards.
- Knowledge extraction is a core capability, not a side effect.
- Knowledge must be classified, linked, and searchable independently of the
  artifacts that produced it.

**See also.** [Knowledge Model](006-Knowledge-Model.md)

---

## Principle 3: State is Minimal

**Statement.** State answers only three questions: *Where are we? What
changed? What is next?* Any state beyond these three is likely derived state
and should be computed, not stored.

**Rationale.** Maximum state creates maximum coupling. Every stored variable
is a commitment. The platform minimizes commitments by deriving as much as
possible from the artifact graph.

**Implications.**

- Execution state can be reconstructed from the artifact log.
- Configuration is an artifact, not ambient state.
- Progress is relative to a plan artifact, not a stored variable.

**See also.** [State Model](009-State-Model.md)

---

## Principle 4: Evidence is Reproducible

**Statement.** Every conclusion, recommendation, or decision must be
traceable to reproducible evidence. If a conclusion cannot be independently
verified, it is not evidence — it is opinion.

**Rationale.** AI systems produce plausible-sounding but incorrect outputs.
Reproducibility is the only defense against hallucination and the foundation
of engineering rigor.

**Implications.**

- Every evidence artifact must record how it was produced.
- Evidence must reference its source artifacts.
- Execution traces must be captured, not just results.

**See also.** [Evidence Model](008-Evidence-Model.md)

---

## Principle 5: Capabilities are Stable; Providers are Replaceable

**Statement.** Engineering capabilities (analysis, review, generation,
verification) are permanent concepts. AI providers and models are
implementation details that implement those capabilities.

**Rationale.** Coupling engineering workflow to a specific AI vendor creates
unacceptable risk. The model must allow any provider to be swapped without
changing how capabilities are expressed or composed.

**Implications.**

- Capabilities are defined by inputs, outputs, and quality requirements —
  not by APIs.
- Provider selection is a routing decision, not an architectural one.
- Models are interchangeable within a provider.

**See also.** [AI Orchestration Model](010-AI-Orchestration.md),
[Capability Model](005-Capability-Model.md)

---

## Principle 6: Architecture Drives Implementation

**Statement.** The conceptual architecture is defined before any
implementation begins. Implementation is always a realization of the
architecture, never a driver of it.

**Rationale.** Architecture-by-implementation produces tightly coupled
systems that reflect the accidental complexity of the implementation
technology rather than the essential complexity of the domain.

**Implications.**

- Concept definitions precede code.
- Technology choices are constrained by architecture, not the reverse.
- Refactoring the architecture requires changing the concept definitions
  first, then the implementation.

**See also.** [Platform Vision](000-Platform-Vision.md)

---

## Principle 7: Everything is an Artifact

**Statement.** All outputs of engineering activity — documents, reports,
knowledge, evidence, decisions, templates, prompts, schemas, state,
repository structures, source code — are artifacts with identity, lifecycle,
and relationships.

**Rationale.** Treating everything as an artifact enables uniform lifecycle
management, traceability, and automated processing. It eliminates the
distinction between "code" and "metadata."

**Implications.**

- Every artifact has a unique ID, type, and status.
- Artifact relationships form a directed graph.
- Pipeline stages consume and produce artifacts.

**See also.** [Artifact Model](007-Artifact-Model.md)

---

## Principle 8: Every Artifact has a Lifecycle

**Statement.** Every artifact progresses through defined states: Draft,
Review, Approved, Released, Deprecated, Archived. Transitions between states
are governed by policy.

**Rationale.** Without lifecycle, artifacts accumulate indefinitely with no
signal about quality, currency, or authority. Lifecycle states enable
consumers to make informed decisions about artifact trustworthiness.

**Implications.**

- Lifecycle transitions may require evidence (e.g., review record for
  Draft → Approved).
- Deprecated and Archived artifacts are retained, not deleted.
- Different artifact types may have additional lifecycle states.

**See also.** [Artifact Model](007-Artifact-Model.md), [Governance](011-Governance.md)

---

## Principle Relationships

The principles are interdependent:

- **1** (Repository) and **7** (Artifact) together establish that all
  engineering outputs are persisted as typed artifacts.
- **4** (Evidence) and **7** (Artifact) together establish that evidence is a
  specific artifact type with reproducibility requirements.
- **5** (Capabilities) and **6** (Architecture) together protect the platform
  from technology coupling.
- **2** (Knowledge) and **8** (Lifecycle) together ensure that knowledge is
  actively managed rather than passively accumulated.
- **3** (State) constrains all other principles to minimize stored state.
