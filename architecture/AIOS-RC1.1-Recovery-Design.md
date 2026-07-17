---
id: AIOS-RC1.1-007
title: AIOS RC1.1 Recovery Engine Design
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 Recovery Engine Design

## Problem

Session recovery currently requires:
1. Reading 10+ state files manually
2. Reading indexes, knowledge, reports
3. Reconstructing project status from scattered sources
4. No automated checkpoint/resume

A new AI session must load ~15,000 tokens of context just to understand where the project stands. Recovery depends on conversation history that doesn't survive session boundaries.

---

## Design Goal

`aios resume` must restore complete session state with **zero conversation history** and **minimal token cost**.

---

## Design

### RecoveryEngine API

```python
class RecoveryEngine:
    def __init__(self, config: AIOSConfig): ...

    def checkpoint(self, session_state: Dict[str, Any]) -> str:
        """Save current session state. Returns checkpoint ID."""

    def resume(self, checkpoint_id: Optional[str] = None) -> Dict[str, Any]:
        """Restore session from checkpoint or latest. Returns recovery payload."""

    def list_checkpoints(self) -> List[Dict[str, Any]]:
        """List available checkpoints."""

    def prune(self, keep: int = 10) -> int:
        """Remove old checkpoints, keep N most recent."""
```

### Checkpoint Structure

```
.ai/recovery/
├── latest.json              ← Symlink/copy to most recent checkpoint
├── checkpoints/
│   ├── 2026-07-08T17-27-11.json
│   ├── 2026-07-08T19-14-14.json
│   └── 2026-07-09T00-00-00.json
└── recovery-log.json        ← History of all recovery operations
```

### Checkpoint Content

```json
{
  "checkpointId": "2026-07-09T00-00-00",
  "timestamp": "2026-07-09T00:00:00Z",
  "aiosVersion": "0.1.0",
  "svfVersion": "1.1.0",

  "session": {
    "id": "SESSION-20260709-RECOVERY",
    "mode": "state-recovery",
    "startedAt": "2026-07-09T00:00:00Z"
  },

  "projectStatus": {
    "phase": "Verification and Framework Implementation",
    "completionPercentage": 38,
    "activeWorkItems": ["Architecture reconciliation"],
    "blockers": ["Architecture conflicts"]
  },

  "taskStatus": {
    "currentTask": {
      "id": "TASK-0010",
      "title": "Implement Architecture Reconciliation",
      "priority": "HIGHEST"
    },
    "completedTasks": ["TASK-0000", "TASK-0001", "...TASK-0009"],
    "pendingTasks": ["TASK-0011", "TASK-0012", "TASK-0013"]
  },

  "engagementStatus": {
    "id": "ENG-MITRA3-001",
    "overallScore": "55% Grade C",
    "releaseReadiness": "NOT READY",
    "reportsGenerated": 39,
    "reportsApproved": 5
  },

  "repositorySnapshot": {
    "totalFiles": 1464,
    "totalDirectories": 437,
    "lastScan": "2026-07-09T00:00:00Z"
  },

  "contextSnapshot": {
    "mode": "state-recovery",
    "tokenBudget": 16000,
    "loadedFiles": ["project.yaml", "framework.yaml", "..."]
  },

  "eventLog": [
    {"type": "SESSION_STARTED", "timestamp": "..."},
    {"type": "REPOSITORY_SCANNED", "timestamp": "..."},
    {"type": "STATE_UPDATED", "timestamp": "..."}
  ],

  "recoveryInstructions": {
    "loadFiles": [
      ".ai/state/project.yaml",
      ".ai/state/next_task.yaml",
      ".ai/state/current-engagement.yaml"
    ],
    "skipFiles": [
      ".ai/state/repository.md",
      ".ai/state/session.md"
    ],
    "estimatedTokens": 3500
  }
}
```

### Resume Flow

```
aios resume
│
├── RecoveryEngine.resume()
│   ├── Load latest checkpoint
│   ├── Validate checkpoint against current repository
│   │   ├── Check if state files changed since checkpoint
│   │   ├── Check if new reports exist since checkpoint
│   │   └── Check if framework docs changed since checkpoint
│   │
│   ├── If drift detected:
│   │   ├── StateEngine.sync() — update state from evidence
│   │   └── Update checkpoint with new state
│   │
│   ├── Build recovery payload:
│   │   ├── projectStatus (from checkpoint or fresh state)
│   │   ├── currentTask (from next_task.yaml)
│   │   ├── engagementStatus (from current-engagement.yaml)
│   │   ├── blockers (from state)
│   │   └── recommendedNextAction (from task priority)
│   │
│   └── Return minimal recovery payload (~3,500 tokens)
│
└── Output:
    "Repository Status: 38% complete
     Current Task: TASK-0010 Architecture Reconciliation
     Blockers: 20 architecture conflicts
     Next Action: Reconcile architecture documents"
```

### Token Budget for Recovery

| Component | Tokens | Source |
|-----------|--------|--------|
| Project status summary | ~500 | `project.yaml` key fields |
| Current task | ~300 | `next_task.yaml` |
| Engagement status | ~400 | `current-engagement.yaml` |
| Blockers + risks | ~200 | `engagement.yaml` risks |
| Repository stats | ~200 | `repository.yaml` key fields |
| Recent events | ~300 | Last 5 events from log |
| Recovery instructions | ~200 | Which files to load |
| **Total** | **~2,100** | |

This is a **86% reduction** from the current ~15,000 token recovery context.

### Automatic Checkpointing

Checkpoints are created automatically:

| Trigger | Checkpoint Type |
|---------|----------------|
| `aios sync` completes | `sync` |
| `aios scan` completes | `scan` |
| `aios validate` completes | `validate` |
| `aios resume` completes | `resume` |
| Any plugin execution completes | `plugin` |
| Session ends (Ctrl+C, timeout) | `interrupted` |

### Recovery Without Conversation History

The key insight: **the repository IS the conversation history**. Every decision, report, and state change is persisted as a file. The RecoveryEngine reads these files and reconstructs context without needing any chat history.

```
Traditional AI Session:
  Chat History (lost) → Manual Context Loading → Work

AIOS Recovery:
  aios resume → Checkpoint + State + Events → Work
  (no chat history needed)
```

---

## File Layout

```
aios/engines/
├── recovery_engine.py    ← RecoveryEngine class
├── checkpoint.py         ← Checkpoint serialization
└── recovery_schema.py    ← Checkpoint schema definitions
```

---

**End of Recovery Engine Design**
