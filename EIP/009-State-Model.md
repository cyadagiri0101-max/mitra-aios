# 009 — State Model

## Overview

State is the platform's most constrained concept. Per Principle 3, state
answers exactly three questions:

1. **Where are we?** Current position in a workflow or plan.
2. **What changed?** Differences since the last known state.
3. **What is next?** Pending actions or decisions.

All other information traditionally called "state" is derived state and
should be computed from artifacts, not stored.

---

## Minimal State Structure

```
State
├── Position
│   ├── Current Step (workflow step or plan item)
│   ├── Completed Steps (list of finished items)
│   ├── Failed Steps (list of failed items)
│   └── Checkpoint Reference (last saved state artifact)
├── Changes
│   ├── Artifacts Created (since last state)
│   ├── Artifacts Modified (since last state)
│   ├── Knowledge Added (since last state)
│   └── Decisions Made (since last state)
├── Next
│   ├── Immediate Next Action (what to do now)
│   ├── Blocked Actions (waiting on prerequisite)
│   └── Pending Decisions (decisions needed)
└── Metadata
    ├── Engagement Reference
    ├── Execution Reference
    ├── Last Updated
    ├── Version
    └── Recovery Point (state ID to restore from)
```

---

## State Design Principles

### 1. State is derived, not primary.

The primary record of what happened is the artifact graph. State is a
convenient summary of the artifact graph for answering the three questions
quickly. If the artifact graph exists, state can always be reconstructed.

### 2. State is checkpointed, not continuously updated.

State is snapshotted at defined points: before irreversible operations,
after significant milestones, on request. Between checkpoints, state is
reconstructed from the artifact log.

### 3. State is bounded by execution scope.

State exists within the scope of a single execution or plan item. There is
no "global" platform state. Cross-execution state is reconstructed from
the shared artifact graph.

### 4. State is recoverable.

Given the artifact graph and the last checkpoint, any prior state can be
reconstructed. Recovery does not require saved state at every point.

### 5. State does not duplicate artifacts.

Information stored in artifacts (decisions, evidence, knowledge) is not
duplicated in state. State references artifacts rather than embedding them.

---

## State Checkpoints

A state checkpoint is an artifact of type StateSnapshot that captures:

- The position at checkpoint time
- Changes accumulated since the previous checkpoint
- The next action as of checkpoint time

Checkpoints are created:

- At the start of any execution
- Before any irreversible operation
- After any significant milestone
- On explicit request

### Checkpoint Lifecycle

```
Created → Current → Superseded → Archived
             │
             └── Recovered (if restoration needed)
```

---

## State Recovery

Recovery reconstructs state from the artifact graph and the most recent
checkpoint:

1. Load the most recent checkpoint.
2. Collect all artifacts created or modified since the checkpoint timestamp.
3. Reconstruct the artifact log since checkpoint.
4. Compute current position from the artifact log.
5. Compute changes from the artifact log.
6. Determine next action based on the execution plan and current position.

This process requires no additional stored state beyond what already exists
in the artifact graph.

---

## What State Is Not

| Common Misconception | EIP Position |
|---------------------|--------------|
| Global application state | Does not exist. State is per-execution. |
| User session state | Sessions are ephemeral. State is persisted. |
| Configuration | Configuration is an artifact, not state. |
| Cache | Cache is a performance optimization, not state. |
| Progress indicators | Progress is derived from plan vs. artifact graph. |
| Environment variables | Environment is an execution parameter. |

---

## Cross-References

- State as a concept is defined in [Meta-Model](003-Engineering-Meta-Model.md).
- The minimal state principle is established in [Principles](001-Platform-Principles.md).
- State checkpoints are [Artifacts](007-Artifact-Model.md) of type StateSnapshot.
- State recovery is handled by the [Orchestration Layer](002-Reference-Architecture.md).
- State transitions relate to [Execution](003-Engineering-Meta-Model.md) lifecycle.
