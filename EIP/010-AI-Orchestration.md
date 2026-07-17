# 010 — AI Orchestration

## Overview

AI Orchestration defines how AI capabilities are provided, routed, executed,
and managed independently of any specific AI vendor, model, or API. The
model separates five concerns that are commonly conflated in AI integrations.

---

## Separation of Concerns

```
┌─────────────────────────────────────────────┐
│           Capability Definition             │
│  (What needs to be done)                    │
├─────────────────────────────────────────────┤
│           Provider Abstraction              │
│  (Who can do it)                            │
├─────────────────────────────────────────────┤
│           Model Selection                   │
│  (Which version to use)                     │
├─────────────────────────────────────────────┤
│           Execution Routing                 │
│  (How to choose and fall back)              │
├─────────────────────────────────────────────┤
│           Context Assembly                  │
│  (What the capability needs to know)        │
└─────────────────────────────────────────────┘
```

---

## Capability — Provider Decoupling

Capabilities and providers are independent concepts connected by a routing
layer. This decoupling is the architectural mechanism that enables provider
replaceability.

### Capability Side

- Defined by inputs, outputs, and quality requirements.
- Contains no provider-specific information.
- Versioned independently of providers.
- Composed into workflows without reference to providers.

### Provider Side

- Declares which capability versions it implements.
- Provides authentication, rate limiting, error handling.
- Manages model availability and versioning.
- Isolates the rest of the platform from vendor API changes.

### Routing Layer

- Maps capability invocations to providers.
- Supports multiple providers per capability.
- Implements fallback logic (primary → secondary → fallback).
- Records routing decisions as evidence.

---

## Provider Abstraction

A provider is an abstraction over an external AI system. Every provider
exposes a uniform interface:

| Operation | Description |
|-----------|-------------|
| ListCapabilities | Return supported capability versions |
| Execute | Invoke a capability with context |
| GetStatus | Return provider health and availability |
| GetMetrics | Return performance and usage data |

Providers are responsible for:

- Translating capability inputs to provider-specific API calls
- Managing authentication credentials
- Handling rate limits and retries
- Translating provider outputs to capability outputs
- Collecting usage metrics
- Reporting errors and failures

---

## Model Management

Models are specific AI algorithms within a provider. The platform does not
manage models directly — it manages model selection policies.

### Model Selection Criteria

| Criterion | Description |
|-----------|-------------|
| Capability Fit | Does the model support the required capability? |
| Quality | Does the model meet minimum quality thresholds? |
| Cost | Is the model within budget for this engagement? |
| Latency | Does the model meet performance requirements? |
| Availability | Is the model currently accessible? |

### Model Lifecycle (from platform perspective)

```
Available → Preferred → Standard → Deprecated → Removed
```

Providers communicate model lifecycle changes to the routing layer, which
updates selection policies accordingly.

---

## Execution Routing

Routing determines which provider and model executes a capability
invocation. Routing is policy-based, not hard-coded.

### Routing Policies

| Policy | Behavior |
|--------|----------|
| Fixed | Always use a specific provider and model |
| Quality-First | Prefer the highest-quality available model |
| Cost-First | Prefer the lowest-cost acceptable model |
| Fallback | Try primary, then secondary, then fallback |
| Weighted | Distribute across providers by weight |
| Latency-First | Prefer the fastest model |

Policies are configured per engagement or per workflow and can reference:

- Provider availability
- Model capability support
- Cost constraints
- Quality requirements
- Historical performance

### Routing Decision

Each capability invocation produces a routing decision record:

```
RoutingDecision
├── Capability (invoked capability)
├── Provider (selected provider)
├── Model (selected model)
├── Policy (policy used)
├── Alternatives (providers/models considered)
├── Rationale (why this selection was made)
└── Evidence (performance data, quality scores)
```

---

## Context Assembly

Context is the information a capability needs to produce correct results.
Context is assembled from artifacts, not from conversation history.

### Context Sources

| Source | Description |
|--------|-------------|
| Engagement Context | Scope, goals, methodology, constraints |
| Repository Artifacts | Source code, documentation, configuration |
| Knowledge Items | Relevant engineering knowledge |
| Evidence Records | Previous findings and measurements |
| State | Current position and recent changes |
| Session History | Recent interaction within current session (ephemeral) |

### Context Assembly Rules

1. Context is assembled by the Orchestration Layer, not by individual
   capabilities.
2. Context is bounded by engagement scope.
3. Context includes the evidence chain for any referenced conclusions.
4. Context is an artifact and is recorded for reproducibility.
5. Session history is included only within the current session and is not
   persisted.

---

## Recovery

When an execution fails, the Orchestration Layer must recover using only
persisted artifacts.

### Recovery Process

1. **Detect failure.** Execution monitor detects error or timeout.
2. **Assess damage.** Determine what was completed before failure.
3. **Load checkpoint.** Restore last saved state.
4. **Reconstruct context.** Assemble context from artifacts.
5. **Re-route.** Determine if a different provider or model should be used.
6. **Resume.** Continue from the last successful step.
7. **Verify.** Confirm that recovery produced correct state.

### Recovery Requirements

- Every execution must be recoverable.
- Recovery must not require session history.
- Recovery must produce evidence of the recovery action.
- Recovery may use a different provider than the original execution.

---

## Provider Independence Invariants

1. **No capability definition references a provider.**
2. **No workflow definition references a provider.**
3. **No engagement configuration references a model.**
4. **No artifact references a provider or model in its content.**
5. **Routing decisions are recorded as evidence, not embedded in logic.**
6. **Provider credentials are engagement configuration, not platform
   configuration.**

---

## Cross-References

- Capabilities are defined in [Capability Model](005-Capability-Model.md).
- Providers and Models are defined in [Meta-Model](003-Engineering-Meta-Model.md).
- Orchestration is handled by the [Reference Architecture](002-Reference-Architecture.md) Orchestration Layer.
- Execution produces [Evidence](008-Evidence-Model.md), including routing decisions.
- Provider configuration is an [Artifact](007-Artifact-Model.md).
