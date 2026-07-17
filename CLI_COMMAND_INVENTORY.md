# CLI Command Inventory — Legacy-to-EOS Migration (Complete)

All 21 CLI commands have been migrated to EOS as of v1.2.0-rc2.
Legacy modules (`orchestrator`, `events`, `executor`, `intelligence`, `state`,
`recovery`, `reporting`, `context`, `doctor`, `healing`, `memory.engine`) have
been replaced with `ImportError` stubs.

## Commands (21/21 — All Migrated)

| Command | File | EOS Component | Status |
|---|---|---|---|
| `aios scan` | `commands/scan.py` | ScannerPlugin | ✅ |
| `aios index` | `commands/index.py` | IndexerPlugin | ✅ |
| `aios state` | `commands/state.py` | PersistenceStore | ✅ |
| `aios context` | `commands/context.py` | EOSContextBuilder | ✅ |
| `aios checkpoint` | `commands/checkpoint.py` | PersistenceStore | ✅ |
| `aios run` | `commands/run.py` | RuntimeEngine | ✅ |
| `aios execute` | `commands/execute.py` | RuntimeEngine | ✅ |
| `aios report` | `commands/report.py` | ObservabilityConsumer | ✅ |
| `aios metrics` | `commands/metrics.py` | ObservabilityConsumer | ✅ |
| `aios decision` | `commands/decision.py` | EOSDecisionEngine | ✅ |
| `aios validate` | `commands/validate.py` | EOS validation chain | ✅ |
| `aios health` | `commands/health.py` | ObservabilityConsumer | ✅ |
| `aios doctor` | `commands/doctor.py` | EOS health chain | ✅ |
| `aios memory` | `commands/memory.py` | MemoryManager | ✅ |
| `aios recover` | `commands/recover.py` | MemoryManager | ✅ |
| `aios chat` | `commands/chat.py` | No legacy dep | ✅ |
| `aios workflow` | `commands/workflow.py` | No legacy dep | ✅ |
| `aios tools` | `commands/tools.py` | No legacy dep | ✅ |
| `aios plugins` | `commands/plugins.py` | No legacy dep | ✅ |
| `aios agent` | `commands/agent.py` | No legacy dep | ✅ |
| `aios config` | `commands/config.py` | No legacy dep | ✅ |

## Test Status

3034 tests pass, 0 failures (50 deselected TestRealRepo — no `.ai/` index files).

## Sprint Plan (Historical)

| Sprint | Work | Effort |
|---|---|---|
| Sprint 1 | Circular dep resolution, LegacyEventAdapter, CLI inventory | 3d |
| Sprint 2 | `api/stack.py` formalized, MemoryManager gap methods, 3 CLI migrated | 5d |
| Sprint 3 | `aios run`, `execute`, `doctor` → EOS | 4d |
| Sprint 4 | Remaining CLI + test assertion updates | 3d |
| Sprint 5 | Legacy module removal (40 files → ImportError stubs) | 2d |
| Sprint 6 | CI gates, benchmarks, docs finalization, tag v1.2.0-rc2 | 2d |
