---
id: AIOS-RC1.1-006
title: AIOS RC1.1 Event Engine Design
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 Event Engine Design

## Problem

Operations are disconnected. Scanning the repository doesn't trigger index updates. Index updates don't trigger state updates. State updates don't trigger cache updates. Every operation must be manually sequenced.

---

## Design

### Event Bus

```python
class EventEngine:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = defaultdict(list)
        self._log: List[Event] = []

    def emit(self, event_type: str, payload: Dict[str, Any]) -> None:
        """Emit an event to all subscribers."""

    def subscribe(self, event_type: str, handler: Callable) -> None:
        """Register a handler for an event type."""

    def log(self) -> List[Dict[str, Any]]:
        """Return event history."""
```

### Event Types

| Event | Emitter | Subscribers |
|-------|---------|-------------|
| `REPOSITORY_SCANNED` | ScannerPlugin | IndexerPlugin, StateEngine, EventEngine |
| `INDEX_UPDATED` | IndexerPlugin | ContextPlugin, StateEngine |
| `STATE_UPDATED` | StateEngine | ContextPlugin, RecoveryEngine |
| `CACHE_UPDATED` | ContextPlugin | RecoveryEngine |
| `VALIDATION_COMPLETE` | ValidatorPlugin | StateEngine, ReportingPlugin |
| `REPORT_GENERATED` | ReportingPlugin | StateEngine |
| `HEALTH_SCORED` | HealthPlugin | StateEngine, ReportingPlugin |
| `CONFIG_CHANGED` | AIOSConfig | All plugins |
| `PLUGIN_FAILED` | AIOSRuntime | EventEngine (logging) |
| `SESSION_STARTED` | AIOSRuntime | RecoveryEngine |
| `SESSION_COMPLETED` | AIOSRuntime | RecoveryEngine, StateEngine |

### Event Flow — Full Sync

```
aios sync
│
├── ScannerPlugin.execute()
│   └── emit(REPOSITORY_SCANNED, {files: 1464, dirs: 437, ...})
│       ├── IndexerPlugin.on_repository_scanned()
│       │   ├── Generate document-registry.json
│       │   ├── Generate framework-registry.json
│       │   ├── Generate consolidated-index.json
│       │   └── emit(INDEX_UPDATED, {indexes: 4})
│       │       ├── ContextPlugin.on_index_updated()
│       │       │   ├── Reload context cache
│       │       │   └── emit(CACHE_UPDATED, {tokens: 8000})
│       │       │       └── RecoveryEngine.on_cache_updated()
│       │       │           └── Update checkpoint
│       │       └── StateEngine.on_index_updated()
│       │           ├── Derive repository state from index
│       │           └── emit(STATE_UPDATED, {fields_changed: 3})
│       │               └── ContextPlugin.on_state_updated()
│       │                   └── Reload state into context
│       │
│       └── StateEngine.on_repository_scanned()
│           ├── Derive file counts, directory counts
│           └── Update repository.yaml
│
├── ValidatorPlugin.execute()
│   └── emit(VALIDATION_COMPLETE, {passed: 12, failed: 2})
│       ├── StateEngine.on_validation_complete()
│       │   └── Update health status in state
│       └── ReportingPlugin.on_validation_complete()
│           └── Generate validation report
│               └── emit(REPORT_GENERATED, {report: "validation"})
│                   └── StateEngine.on_report_generated()
│                       └── Update engagement deliverables
│
└── HealthPlugin.execute()
    └── emit(HEALTH_SCORED, {score: 72, grade: "B-"})
        └── StateEngine.on_health_scored()
            └── Update repository health metrics
```

### Event Flow — Recovery

```
aios resume
│
├── RecoveryEngine.resume()
│   ├── Load last checkpoint
│   ├── Load event log
│   └── Determine last completed operation
│
├── StateEngine.validate()
│   ├── Check state vs repository
│   └── If drift: auto-sync
│
├── ContextPlugin.execute()
│   └── Load context for current mode
│
└── Return session state to caller
    ├── Current task
    ├── Completed tasks
    ├── Blockers
    └── Next steps
```

### Event Log

Events are persisted to `.ai/events/event-log.json`:

```json
{
  "version": "1.1.0",
  "events": [
    {
      "id": "EVT-001",
      "type": "REPOSITORY_SCANNED",
      "timestamp": "2026-07-09T00:00:00Z",
      "source": "ScannerPlugin",
      "payload": {"totalFiles": 1464, "totalDirectories": 437},
      "subscribers_notified": ["IndexerPlugin", "StateEngine"]
    }
  ]
}
```

### Subscription Registration

Plugins register subscriptions during initialization:

```python
class AIOSRuntime:
    def __init__(self, config):
        self.events = EventEngine()
        self.plugins = { ... }

        self.events.subscribe("REPOSITORY_SCANNED", self.plugins["indexer"].on_repository_scanned)
        self.events.subscribe("INDEX_UPDATED", self.plugins["context"].on_index_updated)
        self.events.subscribe("INDEX_UPDATED", self.state_engine.on_index_updated)
        self.events.subscribe("STATE_UPDATED", self.plugins["context"].on_state_updated)
        self.events.subscribe("VALIDATION_COMPLETE", self.state_engine.on_validation_complete)
        self.events.subscribe("REPORT_GENERATED", self.state_engine.on_report_generated)
```

---

## File Layout

```
aios/engines/
├── event_engine.py      ← EventEngine class
└── event_types.py       ← Event type constants and schemas
```

---

**End of Event Engine Design**
