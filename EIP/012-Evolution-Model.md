# 012 — Evolution Model

## Overview

The EIP is designed for long-term evolution. The Evolution Model defines how
the platform grows, how new capabilities are added, how new AI providers are
integrated, how new engagements are created, and how obsolete concepts are
retired — all without destabilizing the core architecture.

---

## Evolution Principles

1. **Add before remove.** New concepts, capabilities, and relationships are
   added before old ones are deprecated. This ensures continuous availability.
2. **Versioned specifications.** The platform specification is versioned.
   Breaking changes require a new major version.
3. **Migration paths.** Every deprecation includes a migration path to the
   replacement.
4. **Backward compatibility windows.** Deprecated features remain available
   for at least one major version cycle.
5. **Architectural review gates.** All changes to the core conceptual model
   require architectural board review.

---

## How New Capabilities Are Added

### Process

1. **Proposal.** A new capability is proposed with inputs, outputs, and
   quality requirements.
2. **Review.** The capability is reviewed against the ontology: does it
   produce new evidence types? Does it require new knowledge forms? Does it
   relate to existing capabilities?
3. **Definition.** The capability is added to the Capability Model.
4. **Provider implementation.** Providers implement the new capability and
   declare support.
5. **Registry update.** The capability is added to the capability registry.
6. **Workflow composition.** Workflows can now include the new capability.

### Rules

- New capabilities must not change the input/output contracts of existing
  capabilities.
- New capabilities may depend on existing capabilities.
- New capabilities must produce at least one evidence type.
- New capabilities must define quality requirements.

---

## How New AI Providers Are Introduced

### Process

1. **Provider registration.** Provider declares which capability versions it
   implements.
2. **Capability verification.** Each claimed capability is verified against
   the capability's quality requirements.
3. **Model cataloging.** Models are listed with capability support, quality
   metrics, and cost.
4. **Routing policy update.** Routing policies are updated to include the
   new provider as an option.
5. **Monitoring.** Provider performance is monitored and recorded as
   evidence.

### Rules

- New providers must implement at least one capability to be registered.
- Providers may implement any subset of capabilities.
- Provider registration does not guarantee routing. Routing is policy-based.
- Provider quality is continuously measured, not assumed.

---

## How New Engagements Are Created

### Process

1. **Initiation.** Engagement is defined with purpose, scope, goals,
   stakeholders, and methodology.
2. **Repository assignment.** A repository is assigned or created for the
   engagement.
3. **Context assembly.** Initial context is assembled from the repository
   and any existing knowledge.
4. **Workflow selection.** Workflows are selected or composed from available
   capabilities.
5. **Configuration.** Provider routing policies, model selection criteria,
   and quality thresholds are configured.
6. **Execution.** The engagement begins executing workflows.

### Rules

- Every engagement has exactly one repository.
- Every engagement selects a methodology.
- Every engagement configures its own routing policies.
- Engagements share knowledge through the Knowledge Layer but are otherwise
  isolated.

---

## How Obsolete Concepts Are Retired

### Process

1. **Deprecation notice.** The concept is marked as deprecated in the
   platform specification.
2. **Migration path.** A replacement concept or migration strategy is
   published alongside the deprecation.
3. **Transition period.** The concept remains available for the standard
   deprecation window (one major version).
4. **Removal.** The concept is removed in the next major version.
5. **Archive.** The concept specification is archived for historical
   reference.

### Retirement Rules

- Concepts are retired only if they are proven redundant or harmful.
- Concept retirement requires architectural board approval.
- Retirement of a concept requires retirement of all concepts that depend
  exclusively on it.
- Retired concepts remain in the specification archive indefinitely.

---

## Platform Versioning

### Version Scheme

Major.Minor.Patch (Semantic Versioning)

| Bump | Meaning |
|------|---------|
| Major | Breaking change to the conceptual model |
| Minor | New concepts, capabilities, or relationships (backward compatible) |
| Patch | Clarification, correction, or refinement (no semantic change) |

### What Constitutes a Major Version

- Removal of a concept
- Change to a concept's essential attributes
- Change to a core relationship
- Change to a principle
- Change to the ontology structure

### What Constitutes a Minor Version

- Addition of a new capability
- Addition of a new evidence type
- Addition of a new knowledge form
- Extension of an existing concept's attributes
- New relationship types

### What Constitutes a Patch Version

- Clarification of concept definitions
- Correction of errors
- Additional examples
- Cross-reference updates

---

## Capability Versioning

Capabilities are versioned independently of the platform. A capability
version defines:

- The exact input and output contract
- The quality requirements
- The evidence types produced

A single capability may have multiple active versions. Providers declare
which versions they implement. Workflows may specify which capability
version they require.

### Capability Version Bump Rules

| Change | Version Bump |
|--------|--------------|
| New input or output | Major |
| Changed quality requirements | Major |
| New evidence type | Minor |
| Clarification of contract | Patch |
| New provider implementation | None (provider version) |

---

## Provider Versioning

Providers version their own implementations independently. The platform
records which provider versions are available and their quality metrics.

### Provider Version Lifecycle

```
Available → Candidate → Stable → Deprecated → Removed
```

- **Available.** Provider version is registered and usable.
- **Candidate.** Provider version under evaluation for quality.
- **Stable.** Provider version has passed quality evaluation.
- **Deprecated.** Provider version is scheduled for removal.
- **Removed.** Provider version is no longer accessible.

---

## Cross-References

- Capability addition relates to [Capability Model](005-Capability-Model.md).
- Provider introduction relates to [AI Orchestration](010-AI-Orchestration.md).
- Engagement creation relates to [Meta-Model](003-Engineering-Meta-Model.md).
- Concept retirement affects [Meta-Model](003-Engineering-Meta-Model.md).
- Versioning of the platform specification is governed by [Governance](011-Governance.md).
