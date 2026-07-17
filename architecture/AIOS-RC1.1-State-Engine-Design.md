---
id: AIOS-RC1.1-005
title: AIOS RC1.1 State Engine Design
version: 1.1.0
status: APPROVED
created: 2026-07-09
---

# AIOS RC1.1 State Engine Design

## Problem

State files were stale (5% vs 38% actual). Two systems generate state:
- `StatePlugin` — writes 1 file (`runtime-state.json`) with 5 hardcoded fields
- `generate-state.py` — writes 5 files with static boilerplate, no repository analysis

Neither derives state from actual repository evidence. State files require manual maintenance.

---

## Design

### Single API

```python
class StateEngine:
    def __init__(self, config: AIOSConfig): ...

    def generate(self) -> Dict[str, Any]:
        """Derive all state from repository evidence."""

    def sync(self) -> Dict[str, Any]:
        """Compare current state vs repository, update stale values."""

    def validate(self) -> Dict[str, Any]:
        """Check state files against repository reality."""

    def diff(self, baseline: Optional[str] = None) -> Dict[str, Any]:
        """Show changes since last sync or since baseline."""

    def history(self) -> List[Dict[str, Any]]:
        """Return state change timeline."""
```

### State Derivation

State is NEVER hardcoded. Every value is derived from evidence:

| State File | Derivation Source |
|-----------|------------------|
| `project.yaml` | Reports count, architecture docs, framework docs, index stats |
| `framework.yaml` | `framework/` directory listing, META.md, component counts |
| `repository.yaml` | `repository-index.json`, git info, file type counts |
| `session.yaml` | Runtime metrics, loaded context, task history |
| `engagement.yaml` | `reports/` deliverables, verification scores |
| `next_task.yaml` | ValidationSummary recommendations, pending items |
| `current-engagement.yaml` | ALL-MODULES scores, release readiness |
| `runtime-state.json` | Runtime version, mode, token budget, sync metadata |

### Generate Flow

```
StateEngine.generate()
│
├── Read repository-index.json → file counts, directory counts, sizes
├── Read consolidated-index.json → document counts, framework counts
├── Read framework-registry.json → framework component status
├── Scan reports/ → report count, approved count, domain scores
├── Scan architecture/ → document count, status distribution
├── Scan framework/ → component counts per category
├── Read .ai/knowledge/ → knowledge base status
├── Read git log → last commit, branch
│
├── Derive project state
│   ├── completionPercentage = weighted formula
│   ├── phase = derived from completed milestones
│   ├── activeWorkItems = from pending validation items
│   └── blockers = from identified risks
│
├── Derive framework state
│   ├── component counts from directory listing
│   ├── status from file existence
│   └── knownIssues from META.md comparison
│
├── Derive repository state
│   ├── file counts from index
│   ├── critical issues from index summary
│   └── release versions from package metadata
│
├── Derive engagement state
│   ├── deliverables from reports/ listing
│   ├── scores from ALL-MODULES dashboards
│   └── risks from risk assessment reports
│
└── Write all state files (YAML canonical, JSON derived)
```

### Validate Flow

```
StateEngine.validate()
│
├── Check: report count in state vs actual reports/ count
├── Check: framework doc count in state vs actual framework/ count
├── Check: file count in state vs repository-index.json
├── Check: version in state vs actual package version
├── Check: completion percentage vs derivation formula
├── Check: state file timestamps vs last modification of source files
│
└── Return:
    ├── drift_detected: bool
    ├── stale_fields: List[str]
    ├── severity: "none" | "minor" | "major" | "critical"
    └── recommended_action: "sync" | "generate" | "manual_review"
```

### State Integrity

Each state file includes an integrity section:

```yaml
integrity:
  generatedAt: "2026-07-09T00:00:00Z"
  generatedBy: "StateEngine v1.1.0"
  evidenceSources:
    - "reports/ (39 files)"
    - "framework/ (34 files)"
    - ".ai/index/repository-index.json"
  checksum: "sha256:abc123..."
  driftScore: 0
```

`driftScore` is the number of fields that disagree with current repository evidence. A score of 0 means state is fully synchronized.

### History

State changes are logged to `.ai/state/history.json`:

```json
{
  "entries": [
    {
      "timestamp": "2026-07-09T00:00:00Z",
      "action": "generate",
      "trigger": "state-recovery",
      "changes": {
        "project.completionPercentage": {"old": 5, "new": 38},
        "framework.version": {"old": "0.1.0", "new": "1.1.0"},
        "repository.totalFiles": {"old": 0, "new": 1464}
      }
    }
  ]
}
```

### Completion Percentage Formula

```python
def calculate_completion(evidence: Dict) -> float:
    aios_runtime = evidence["aios_findings_resolved"] / evidence["aios_total_findings"] * 100
    svf_framework = evidence["svf_docs_populated"] / evidence["svf_docs_planned"] * 100
    mitra_verification = evidence["reports_generated"] / evidence["reports_needed"] * 100
    documentation = evidence["architecture_docs_complete"] / evidence["architecture_docs_total"] * 100

    raw = (
        aios_runtime * 0.20 +
        svf_framework * 0.30 +
        mitra_verification * 0.30 +
        documentation * 0.20
    )

    penalties = evidence["unresolved_blockers"] * 2
    return max(0, min(100, raw - penalties))
```

---

## File Layout

```
aios/engines/
├── __init__.py
├── state_engine.py      ← StateEngine class
├── state_derivation.py  ← Evidence collection and derivation logic
└── state_schema.py      ← State file schema definitions
```

---

## Integration Points

| Trigger | Action |
|---------|--------|
| `aios sync` | `StateEngine.sync()` |
| `aios state validate` | `StateEngine.validate()` |
| `aios state diff` | `StateEngine.diff()` |
| `aios state history` | `StateEngine.history()` |
| After `ScannerPlugin.execute()` | `EventEngine` emits `REPOSITORY_SCANNED` → `StateEngine.sync()` |
| After report generated | `EventEngine` emits `REPORT_GENERATED` → `StateEngine.sync()` |
| On `aios resume` | `StateEngine.validate()` → auto-sync if drift detected |

---

**End of State Engine Design**
