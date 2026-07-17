# 003 — Engineering Meta-Model

## Overview

The Engineering Meta-Model defines the first-class concepts of the platform.
Every concept is a permanent, technology-independent abstraction of some
aspect of engineering work. Concepts earn their place by being essential —
they cannot be reduced to combinations of other concepts.

---

## Concept Index

| Concept | Primary Responsibility |
|---------|----------------------|
| Platform | Define the engineering domain model |
| Engagement | Scope a unit of engineering work |
| Artifact | Represent any persistent engineering output |
| Capability | Define a unit of engineering function |
| Knowledge | Capture reusable engineering understanding |
| Evidence | Support reproducibility of conclusions |
| State | Track current position and progress |
| Decision | Record an architectural choice |
| Workflow | Sequence capabilities for a goal |
| Execution | Run a workflow instance |
| Result | Capture workflow output |
| Provider | Abstract an AI system |
| Model | Abstract an AI algorithm |
| Agent | Represent an AI actor |
| Context | Provide situational information |
| Session | Bound an AI interaction |
| Review | Evaluate artifact quality |
| Release | Publish an approved artifact |
| Methodology | Define engineering approach |
| Repository | Store and version artifacts |

---

## Concept Definitions

### Platform

**Purpose.** Define the permanent concepts, relationships, and principles of
AI-assisted software engineering.

**Responsibilities.** Maintain the domain model. Govern all platform-compliant
implementations. Evolve through versioned specification releases.

**Attributes.** Name, version, principles, concept definitions, ontology.

**Lifecycle.** Draft (specification in development) → Approved (current
release) → Superseded (replaced by newer version).

**Constraints.** The platform must never reference specific technologies,
vendors, or implementations. Changes require architectural review.

---

### Engagement

**Purpose.** Scope a unit of engineering work with defined purpose, goals,
and boundaries.

**Responsibilities.** Define what is being done and why. Establish success
criteria. Bound the work to prevent scope creep. Provide context for all
activities within the engagement.

**Attributes.** Identifier, name, purpose, scope, goals, stakeholders,
timeline, status, methodology, repository link.

**Lifecycle.** Initiated → Active → Completed → Archived.

**Relationships.** Governs one or more Workflows. References a Repository.
Belongs to a Platform version.

---

### Artifact

**Purpose.** Represent any persistent engineering output with identity,
lifecycle, and relationships.

**Responsibilities.** Provide a uniform container for all engineering
outputs. Enable lifecycle management, traceability, and automated
processing.

**Attributes.** Identifier, name, type, owner, version, status, lifecycle
state, relationships, metadata, evidence, history, content.

**Lifecycle.** Draft → Review → Approved → Released → Deprecated → Archived.

**Constraints.** Every artifact must have a unique identifier within its
repository. Status transitions may require evidence.

**See also.** [Artifact Model](007-Artifact-Model.md)

---

### Capability

**Purpose.** Define a unit of engineering function independent of how it is
performed.

**Responsibilities.** Specify what the capability does, what inputs it
requires, what outputs it produces, and what quality guarantees it provides.

**Attributes.** Name, purpose, inputs, outputs, quality requirements,
evidence produced, provider mappings.

**Lifecycle.** Proposed → Defined → Implemented → Deprecated → Retired.

**Constraints.** Capabilities must be defined in technology-independent
terms. Multiple providers can implement the same capability.

**See also.** [Capability Model](005-Capability-Model.md)

---

### Knowledge

**Purpose.** Capture reusable engineering understanding that transcends
individual artifacts or sessions.

**Responsibilities.** Organize engineering knowledge for search, retrieval,
and reuse. Maintain relationships between knowledge items and the artifacts
that produced them.

**Attributes.** Identifier, type, classification, content, source artifacts,
relationships, confidence, lifecycle state.

**Lifecycle.** Extracted → Validated → Published → Deprecated → Archived.

**Constraints.** Every knowledge item must trace to at least one source
artifact. Knowledge must be classified according to the platform ontology.

**See also.** [Knowledge Model](006-Knowledge-Model.md)

---

### Evidence

**Purpose.** Support the reproducibility of engineering conclusions.

**Responsibilities.** Record what was observed, how it was observed, and what
conclusions it supports. Provide enough detail for independent verification.

**Attributes.** Identifier, type, timestamp, source, method, conclusion,
supporting artifacts, confidence, chain of custody.

**Lifecycle.** Collected → Verified → Accepted → Superseded → Invalidated.

**Constraints.** Evidence must include the method of collection. Evidence
without a verifiable method is opinion, not evidence.

**See also.** [Evidence Model](008-Evidence-Model.md)

---

### State

**Purpose.** Answer three questions: Where are we? What changed? What is
next?

**Responsibilities.** Track current position within a workflow. Record what
has changed since the last known state. Indicate what should happen next.

**Attributes.** Current position, known changes, pending actions, last known
good state, state version.

**Lifecycle.** Active (current) → Checkpointed (saved) → Recovered (restored)
→ Obsolete (superseded).

**Constraints.** State must be derivable from artifacts. State should be
checkpointed before any irreversible operation.

**See also.** [State Model](009-State-Model.md)

---

### Decision

**Purpose.** Record an architectural or engineering choice with rationale,
alternatives, and consequences.

**Responsibilities.** Capture why a choice was made, what alternatives were
considered, and what the expected consequences are.

**Attributes.** Identifier, title, status, context, decision, rationale,
alternatives, consequences, related decisions, date, author.

**Lifecycle.** Proposed → Reviewed → Accepted → Superseded → Rejected.

**Constraints.** Every decision must reference the evidence that supports it.
Decisions can supersede or be superseded by other decisions.

**See also.** [Governance](011-Governance.md)

---

### Workflow

**Purpose.** Sequence capabilities to achieve an engineering goal.

**Responsibilities.** Define the ordered set of capabilities, their
dependencies, and their success criteria.

**Attributes.** Identifier, name, purpose, steps (capability references),
dependencies, success criteria, error handling.

**Lifecycle.** Defined → Planned → Executing → Completed → Failed.

**Constraints.** Workflows must be defined in terms of capabilities, not
providers or models. Workflows must define recovery paths.

---

### Execution

**Purpose.** Run a single instance of a workflow.

**Responsibilities.** Execute workflow steps, capture results, handle errors,
produce evidence.

**Attributes.** Identifier, workflow reference, timestamp, status, step
results, evidence produced, artifacts created, duration.

**Lifecycle.** Pending → Running → Completed → Failed → Recovered.

**Constraints.** Every execution must be recoverable from artifacts. Every
execution produces at least one evidence artifact.

---

### Result

**Purpose.** Capture the output of a workflow execution or capability
invocation.

**Responsibilities.** Record what was produced, whether it succeeded, and
what was learned.

**Attributes.** Identifier, source execution, status, outputs, errors,
duration, evidence links.

**Lifecycle.** Produced → Verified → Accepted → Superseded.

---

### Provider

**Purpose.** Abstract an external AI system behind platform interfaces.

**Responsibilities.** Provide access to AI capabilities. Translate between
platform capability interfaces and provider-specific APIs. Manage
authentication, rate limiting, and error handling.

**Attributes.** Name, type, capabilities offered, models available, status,
configuration.

**Lifecycle.** Registered → Active → Degraded → Removed.

**Constraints.** Providers must be swappable without changing capability
definitions. No upper layer may reference a provider directly.

---

### Model

**Purpose.** Represent a specific AI algorithm or version within a provider.

**Responsibilities.** Provide a specific implementation of one or more
capabilities with known quality characteristics.

**Attributes.** Name, provider, version, capabilities, quality metrics,
status.

**Lifecycle.** Available → Preview → Stable → Deprecated → Removed.

**Constraints.** Models are always accessed through their provider. Capability
definitions must work with any qualifying model.

---

### Agent

**Purpose.** Represent an AI actor that executes capabilities.

**Responsibilities.** Bind a model to a context and execute assigned
capabilities. Maintain session state within an execution.

**Attributes.** Identifier, model, provider, assigned capabilities, context,
session, status.

**Lifecycle.** Created → Initialized → Active → Idle → Terminated.

**Constraints.** Agents are created per execution or engagement. Agents never
persist across engagements.

---

### Context

**Purpose.** Provide situational information for an execution or decision.

**Responsibilities.** Aggregate relevant knowledge, artifacts, and state.
Make information available to capabilities and workflows.

**Attributes.** Engagement reference, knowledge references, artifact
references, state snapshot, session history.

**Lifecycle.** Assembled → Active → Stale → Refreshed.

**Constraints.** Context must be assembled from artifacts, not from
conversation. Context is bounded by engagement scope.

---

### Session

**Purpose.** Bound an AI interaction within a single continuous window.

**Responsibilities.** Track conversation state, manage token usage, maintain
interaction history within the session.

**Attributes.** Identifier, engagement, agent, start time, end time, token
count, interaction count.

**Lifecycle.** Opened → Active → Closing → Closed.

**Constraints.** Sessions are ephemeral. All decisions and evidence must be
persisted before session closure.

---

### Review

**Purpose.** Evaluate artifact quality against defined criteria.

**Responsibilities.** Examine an artifact, assess its quality, record
findings, and recommend disposition.

**Attributes.** Identifier, artifact, reviewer, criteria, findings, verdict,
timestamp.

**Lifecycle.** Requested → In Progress → Completed → Remediated.

**Constraints.** Reviews must reference the criteria used. Review findings
are evidence artifacts.

---

### Release

**Purpose.** Publish an approved artifact for consumption.

**Responsibilities.** Mark an artifact as approved and available. Record
release metadata.

**Attributes.** Identifier, artifact, version, release notes, date, authorizer.

**Lifecycle.** Prepared → Published → Superseded → Retracted.

---

### Methodology

**Purpose.** Define the engineering approach, practices, and conventions for
an engagement.

**Responsibilities.** Establish how work is done, what standards apply, and
what practices are followed.

**Attributes.** Name, version, practices, standards, conventions, artifact
templates.

**Lifecycle.** Selected → Adapted → Applied → Retired.

**Constraints.** Methodology selection is per-engagement. Methodologies may
reference but must not require specific tools.

---

### Repository

**Purpose.** Store and version artifacts with full history.

**Responsibilities.** Provide durable storage, version history, access
control, and relationship management for artifacts.

**Attributes.** Identifier, location, type, artifact index, access control.

**Lifecycle.** The repository outlives any engagement or platform version.

**Constraints.** The repository is the authoritative source of truth. No
artifact exists outside the repository.

---

## Concept Relationships Summary

- Engagement scopes Workflow.
- Workflow sequences Capability.
- Capability produces and consumes Artifact.
- Execution runs Workflow.
- Execution produces Result and Evidence.
- Evidence supports Decision.
- Decision governs Methodology.
- Knowledge supports Decision and Capability.
- Context aggregates Knowledge, Artifact, and State.
- Provider implements Capability through Model.
- Agent executes Capability within Session.
- Review evaluates Artifact.
- Release publishes Artifact.

**See also.** [Ontology](004-Engineering-Ontology.md) for a detailed
relationship model.
