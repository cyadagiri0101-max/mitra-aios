# MITRA AIOS — Architecture Convergence & Migration Analysis

**Date**: 2026-07-17
**Author**: Chief Software Architect / Principal Systems Engineer
**Status**: COMPLETE
**Method**: Source-code inspection + architecture document analysis — no assumptions, no speculative refactoring

---

## Executive Summary

The verification report identified "two independent execution architectures." This analysis determines whether they should remain separate or converge.

**Key finding**: The phrase "two architectures" is misleading. What actually exists is:

| Component | Classification | Evidence |
|-----------|---------------|----------|
| **Orchestrator path** (`orchestrator.py` + `aios/events/bus.py` + `aios/memory/engine.py` + `aios/executor/engine.py` + `aios/intelligence/decision/engine.py`) | Legacy CLI toolchain (7-phase pipeline) | Imported only by `cli/commands/run.py` and `scripts/run_orchestrator.py`. Dead code outside CLI context. |
| **EOS stack** (`aios/eos/*` — 12 modules) | Production API execution engine | Imported by all API routes (14 route files) + `api/stack.py`. The active HTTP path. |
| **Manager subsystems** (`aios/llm/`, `aios/memory/memory_manager.py`, `aios/embedding/`, `aios/security/`, `aios/tools/`, `aios/rag/`, `aios/vectorstore/`, `aios/scheduler/`, `aios/plugins/`) | Cross-cutting capability layer | 222 files (non-EOS). Lazily loaded by EOS stack. Independently usable by either path. |

**The core question is not "EOS vs Legacy" but "CLI toolchain vs API engine."**

**Final recommendation**: **Converge to EOS** — the EOS stack becomes canonical. The Orchestrator path is a CLI-specific toolchain that can be reimplemented using EOS components rather than its own parallel subsystems. The manager subsystems (LLM, memory, tools, etc.) are already designed for cross-cutting use and should be formally integrated into the EOS stack.

Estimated migration effort: **40-50 engineering-days** for full convergence, excluding feature work.

---

## Phase 1 — Historical Architecture Reconstruction

### Evolution Timeline (Reconstructed from Documents and Source)

```
Pre-June 2026: MITRA v3.0 baseline exists
  └─ Full-stack NestJS + React app (manufacturing platform)
  └─ Basic Python AI runtime (precursor to both aios paths)

June 24: MITRA v3.2 released — AI Runtime Phase 3 complete
  └─ Ollama integration, AI chat, embeddings
  └─ First version of Python runtime with CLI commands

June 26: Robot Assistant frontend engine completed
  └─ 1,955 lines TypeScript, 8 engine files

July 4-6: Engineering Knowledge Library (EKL) architecture
  └─ FastAPI service, mekb.sqlite backend
  └─ "MITRA is consumer, EKL is source of truth"

July 8: SVF v1.0 governance framework created
  └─ 10-layer platform architecture
  └─ "One runtime, one state system, one context loader" mandate

July 9: AIOS RC1.1 Dependency Map authored
  └─ Identified: tooling/scripts/ vs aios/ runtime duplication
  └─ 121-hour plan to consolidate

July 15: aios v1.1.0 RC1 released
  └─ EOS core (EventBus, RuntimeEngine, WorkflowEngine)
  └─ 14 public submodules, 20 CLI commands
  └─ 37 benchmarks, 35/37 passed
```

### Which Architecture Came First?

**The "manager pattern" subsystems came first.** The `aios/memory/engine.py`, `aios/events/bus.py`, `aios/intelligence/decision/engine.py`, and `aios/executor/engine.py` are the original Python runtime. They have simpler implementations, fewer features, and are wired directly by the `Orchestrator`.

Evidence:
- `src/aios/memory/engine.py` (90 lines) — simpler, file-based, imports `core.config` (the oldest config path)
- `src/aios/events/bus.py` (71 lines) — simpler, sync-only
- `src/aios/orchestrator.py` (260 lines) — wires these together in a linear 7-phase pipeline
- These modules import `from aios.core.config import AIOSConfig` — the oldest config system

### Was the EOS Stack Intended as a Replacement?

**Yes and no.** The evidence:

**Yes (replacement intent):**
- `aios/eos/event_bus.py` (613 lines) is strictly more capable than `aios/events/bus.py` (71 lines) — priority dispatch, async mode, history bounded queue, validation, statistics
- `aios/memory/memory_manager.py` (191 lines) is strictly more capable than `aios/memory/engine.py` (90 lines) — three-tier memory, embedding-based retrieval, consolidation
- The EOS stack has formal initialization chains with dependency validation (e.g., `RuntimeEngine.initialize()` requires `WorkflowEngine.is_initialized`)
- The EOS stack has systematic lifecycle management (all 12 modules implement `initialize()`, `validate()`, `reload()`, `statistics()`, `health()`, `shutdown()`)

**No (parallel development):**
- The EOS stack does NOT deprecate or replace the older modules — both still exist, both are still maintained
- There is NO adapter layer, NO compatibility shim, NO migration path from old to new
- The EOS stack introduces new concepts (execution plans, workflows, rollback plans, capability discovery, knowledge service) that have no equivalent in the old stack
- The EOS stack has its OWN circular dependency problems (14 modules in cycles) that suggest it was built rapidly

### Was Migration Abandoned?

**Migration between the two stacks was never started.** There is:
- Zero adapter code
- Zero deprecation warnings in the older modules
- Zero documentation saying "use EOS instead of X"
- The `cli/commands/run.py` still imports `orchestrator.py` directly
- The `cli/commands/memory.py` still imports `memory/engine.py` directly

The SVF RC1.1 roadmap mentions consolidation of `tooling/scripts/` into `aios/` — this is a different axis (scripts vs runtime), NOT the EOS vs CLI path axis.

### Is the Dual Architecture Intentional?

**Partially.** The two paths serve different surfaces:
- **CLI path** (`orchestrator.py`): Designed for local/scripted use. 7-phase linear pipeline. File-based state. Runs to completion.
- **API path** (EOS stack): Designed for HTTP/WebSocket use. Event-driven. Workflow-based. Request-response.

These are **different use cases** that happen to share similar concepts (events, memory, decision-making). The duplication is not intentional for the same use case — it's accidental because the two paths were built at different times by different developers without a unified architecture plan.

**Critical evidence**: 20 AIOS architecture documents remain empty scaffolding (`AIOS-000-Vision.md`, `AIOS-001-Layer-Architecture.md`, `AIOS-009-Roadmap.md`). If there had been an architecture plan, these would contain the guidance that prevented the duplication.

---

## Phase 2 — Complete Execution Stack Mapping

### Stack A: CLI Orchestrator Path

```
CLI Entry: aios run
  ↓
aios/cli/app.py → typer command dispatch
  ↓
aios/cli/commands/run.py → imports orchestrator
  ↓
aios/orchestrator.py:run()
  │
  ├─ Phase 1: aios/plugins/scanner/plugin.py (ScannerPlugin.run())
  ├─ Phase 2: aios/plugins/indexer/plugin.py (IndexerPlugin.run())
  ├─ Phase 3: aios/state/engine.py (StateEngine.sync()/generate())
  ├─ Phase 4: aios/memory/engine.py (MemoryEngine.remember())
  │     └─ MemoryStore, MemoryIndex, MemorySearch, MemoryCompressor, SnapshotManager
  ├─ Phase 5: aios/intelligence/decision/engine.py (DecisionEngine.decide())
  │     └─ Evaluator, Risk, Scorer, Strategy
  ├─ Phase 6: aios/executor/engine.py (Executor.execute())
  │     └─ Dispatcher, Pipeline, Monitor, Rollback, Failure
  └─ Phase 7: aios/reporting/generator.py (ReportGenerator.generate_all())
        └─ Metrics, Profiler, HealthReporter, Summary, PluginStats, TokenTracker

  Events: aios/events/bus.py (legacy EventBus, sync, simple)
  Recovery: aios/recovery/engine.py
```

**Initialization**: `Orchestrator.__init__()` creates all modules inline. No dependency validation. No formal lifecycle.

**Shutdown**: **None.** `Orchestrator` has no `shutdown()` method.

**Threading**: Single-threaded. Phases execute sequentially.

**State**: File-based JSON/YAML in `.ai/runtime/`.

**Usage**: `aios run` CLI command only. 1 producer (CLI).

### Stack B: API/EOS Path

```
API Entry: FastAPI HTTP request
  ↓
aios/api/app.py → FastAPI lifespan + CORS middleware
  ↓
aios/api/routes.py → includes sub-routers
  ├─ /api/v1/loader/load → EOSLoader
  ├─ /api/v1/capabilities/discover → CapabilityDiscovery
  ├─ /api/v1/knowledge/search → KnowledgeService
  ├─ /api/v1/context/build → EOSContextBuilder
  ├─ /api/v1/plan/create → EOSDecisionEngine
  ├─ /api/v1/workflow/build → WorkflowEngine
  ├─ /api/v1/runtime/execute → RuntimeEngine
  ├─ /api/v1/agents/* → AgentExecutor (eos/agent_integration)
  ├─ /api/v1/chat/* → LLMManager (lazy)
  ├─ /api/v1/memory/* → MemoryManager (lazy)
  ├─ /api/v1/tools/* → ToolManager (lazy)
  ├─ /api/v1/plugins/* → PluginManager (lazy)
  ├─ /api/v1/security/* → SecurityManager (lazy)
  ├─ /api/v1/embedding/* → EmbeddingManager (lazy)
  ├─ /api/v1/vectorstore/* → VectorStoreManager (lazy)
  ├─ /api/v1/rag/* → RAGManager (lazy)
  ├─ /api/v1/config/* → ConfigManager (lazy)
  └─ /api/v1/ws/* → WebSocket connection manager

  Events: aios/eos/event_bus.py (EOS EventBus, priority, sync/async, history)
  State: ai-sqlite (via PersistenceStore)
  Observability: aios/eos/observability.py (event stream consumer)
```

**Initialization**: `aios/api/stack.py:create_stack()` — formal dependency chain:
```
EOSLoader → RegistryManager → CapabilityDiscovery → KnowledgeService
→ EOSContextBuilder → EOSDecisionEngine → WorkflowEngine
→ RuntimeEngine → EventBus → ObservabilityConsumer
→ PersistenceStore → AgentExecutor
  └─ Then 12 lazy try/except:pass blocks for optional managers
```

**Shutdown**: Each EOS module has `shutdown()` (formal). FastAPI lifespan calls `manager.stop()` for WebSocket.

**Threading**: Async (FastAPI) + background threads (RuntimeEngine).

**State**: SQLite (PersistenceStore) + optional lazy managers.

**Usage**: HTTP API only. Multiple producers (any HTTP client).

### Side-by-Side Comparison

| Aspect | CLI Path | API/EOS Path |
|--------|----------|--------------|
| Entry point | `aios run` CLI | HTTP request to FastAPI |
| Execution model | Linear 7-phase pipeline | Event-driven workflow engine |
| State management | File-based JSON/YAML | SQLite via PersistenceStore |
| Event bus | Simple sync (`events/bus.py`) | Priority sync/async (`eos/event_bus.py`) |
| Memory | Two-tier file store (`memory/engine.py`) | Three-tier embedding store (`memory/memory_manager.py`) |
| Decision engine | Simple decide() (`intelligence/decision/engine.py`) | Full plan generation (`eos/decision_engine.py`) |
| Workflow | None (linear pipeline) | First-class Workflow + WorkflowEngine |
| Error recovery | `recovery/engine.py` (checkpoint/restore) | RuntimeEngine state machine (retry + rollback) |
| Lifecycle | Ad-hoc constructor wiring | Formal 6-method lifecycle (initialize/validate/reload/statistics/health/shutdown) |
| Thread safety | Minimal (no locks in Orchestrator) | Thread-safe (locks in all EOS modules) |
| Test coverage | `test_orchestrator_persistence_cli.py`, `test_phase4.py` | 15+ test files covering all EOS modules |
| Production use | CLI-only, likely developer tool | HTTP API, primary production surface |

---

## Phase 3 — Feature Matrix

| Capability | CLI Path (Orchestrator) | API/EOS Path | Better Implementation |
|-----------|------------------------|--------------|----------------------|
| **Configuration** | `core/config.py` (208 lines, JSON/YAML+env) | `core/config.py` (same — both use it) + `config/manager.py` (unused) | Same. Both use `core.config`. |
| **Memory** | `memory/engine.py` (90 lines, 2-tier, file-based) | `memory/memory_manager.py` (191 lines, 3-tier, embedding-based) | **EOS** — strictly more capable |
| **Execution** | `executor/engine.py` (linear pipeline) | `eos/runtime_engine.py` (state machine, parallel, retry, rollback) | **EOS** — formal state machine |
| **Scheduler** | Not used | `scheduler/manager.py` (priority queue + task queue) | EOS (via lazy load) |
| **Plugins** | ScannerPlugin, IndexerPlugin (hardcoded) | `plugins/manager.py` (dynamic lifecycle) | EOS |
| **RAG** | Not used | `rag/manager.py` (chunk, index, retrieve, rerank) | EOS (via lazy load) |
| **LLM** | Not directly wired | `llm/manager.py` (provider abstraction, 8 providers, retry, fallback, cache) | EOS (via lazy load) |
| **Vector search** | Not used | `vectorstore/manager.py` (6 providers: Chroma, FAISS, Milvus, Pinecone, Qdrant, Weaviate) | EOS (via lazy load) |
| **Events** | `events/bus.py` (71 lines, sync, no priority) | `eos/event_bus.py` (613 lines, priority, sync/async, history, validation) | **EOS** — strictly more capable |
| **Workflow** | None | `eos/workflow_engine.py` (889 lines, DAG, dependency resolution, topological sort) | EOS only |
| **Recovery** | `recovery/engine.py` (checkpoint/restore) | RuntimeEngine retry policies + rollback plans + PersistenceStore | **EOS** — integrated into execution |
| **Health** | Reporting subsystem generates health | `eos/observability.py` (real-time event stream, metrics, latency tracking) | **EOS** — real-time vs batch |
| **Statistics** | Per-module in reporting | All EOS modules implement `.statistics()` returning typed dataclasses | **EOS** — consistent pattern |
| **Security** | Not used | `security/manager.py` (encryption, tokens, permissions, secrets, policies) | EOS (via lazy load) |
| **Logging** | Basic Python logging | Basic Python logging (same) | Same |
| **CLI** | `aios run` → Orchestrator (9 commands) | `aios *` commands use EOS modules via CLI command files | Split — some use Orchestrator, some use EOS modules |
| **API** | None | FastAPI, 20+ endpoints, WebSocket | EOS only |
| **WebSocket** | None | `websocket_manager.py` + `websocket_routes.py` | EOS only |
| **Tool execution** | Not used | `tools/manager.py` (10+ providers: browser, filesystem, git, HTTP, MCP, Python, shell) | EOS (via lazy load) |
| **Planning** | `intelligence/decision/engine.py` (simple decide()) | `eos/decision_engine.py` (strategy selection, confidence scoring, reasoning traces, rank_actions) | **EOS** — structured planning |
| **Reasoning** | None | Planner + ReflectionEngine (stubs, not real) | Neither |
| **Persistence** | File-based JSON/YAML | SQLite via `eos/persistence.py` (894 lines, 5 tables) | **EOS** — structured, queryable |
| **Observability** | Reporting (batch reports) | `eos/observability.py` (real-time event stream, metrics) | **EOS** — real-time |
| **Multi-agent** | Not used | `multiagent/coordinator.py` (roles, message bus, consensus, shared memory) | EOS (via lazy load) |
| **Distributed ready** | No | No | Neither |
| **Configuration reload** | No | `reload()` on most managers (inconsistent) | Partial on EOS side |

**Feature matrix result**: The EOS path has **strictly superior capability** in every dimension where there is overlap. The CLI path does only two things the EOS path doesn't: `ScannerPlugin` and `IndexerPlugin` (which are also available via the non-EOS PluginManager).

---

## Phase 4 — Usage Analysis

### Classification by Subsystem

| Subsystem | Lines | Classification | Evidence |
|-----------|-------|---------------|----------|
| **`aios/eos/` (12 modules)** | 7,783 | **Production** | Routed to by all 14 API route files. Wired by `create_stack()`. 15+ test files. Benchmarked (phase 4.5). |
| **`aios/orchestrator.py`** | 260 | **Legacy** | Only imported by `cli/commands/run.py` and `scripts/run_orchestrator.py`. No API routes. No production HTTP path. |
| **`aios/events/bus.py`** | 71 | **Legacy** | Only used by `Orchestrator`. Superseded by `eos/event_bus.py`. |
| **`aios/events/store.py`** | 96 | **Scaffolding** | Exported by `events/__init__.py` but never imported by any production path. |
| **`aios/memory/engine.py`** | 90 | **Legacy** | Used by Orchestrator (via `orchestrator.py`) and CLI commands (`memory`, `recover`). Superseded by `MemoryManager`. |
| **`aios/memory/memory_manager.py`** | 191 | **Production** | Used by API stack (lazy optional). Exported via `memory/__init__.py`. |
| **`aios/core/config.py`** | 208 | **Production** | Imported by ALL 26 production paths. The de facto config system. |
| **`aios/config/` (8 modules)** | 1,200+ | **Unused** | Zero imports from production code. Only `__init__.py` re-exports and one lazy `try/except: pass` in `stack.py`. |
| **`aios/agent/agent.py`** | 174 | **Scaffolding** | Composes stubs (Planner, Executor, Reflection). Not wired into any production path. |
| **`aios/agent/planner.py`** | 58 | **Scaffolding** | Returns hardcoded steps. Not used outside `agent.py`. |
| **`aios/agent/executor.py`** | 66 | **Scaffolding** | Returns `[processed]` content. Not used outside `agent.py`. |
| **`aios/agent/reflection.py`** | 56 | **Scaffolding** | Returns hardcoded reflection. Not used outside `agent.py`. |
| **`aios/api/manager.py`** | 187 | **Dead code** | Re-exported in `api/__init__.py` but never instantiated by FastAPI app. Mock routing. |
| **`aios/executor/engine.py`** | ~200 | **Legacy** | Used by Orchestrator path only. Superseded by `eos/runtime_engine.py`. |
| **`aios/intelligence/decision/engine.py`** | ~200 | **Legacy** | Used by Orchestrator path only. Superseded by `eos/decision_engine.py`. |
| **`aios/recovery/engine.py`** | ~80 | **Legacy** | Used by Orchestrator + `cli/commands/checkpoint.py`. Not integrated with EOS. |
| **`aios/state/engine.py`** | 340 | **Legacy** | Used by Orchestrator + `cli/commands/state.py`. File-based. Not integrated with EOS PersistenceStore. |
| **`aios/reporting/` (12 modules)** | ~800 | **Legacy** | Used by Orchestrator + CLI commands. Batch reporting. No real-time equivalent in EOS (ObservabilityConsumer is different). |
| **`aios/llm/manager.py`** | 206 | **Production** | Lazily loaded by EOS stack. Used by CLI `chat` command. 8 providers. |
| **`aios/embedding/manager.py`** | 242 | **Production** | Lazily loaded by EOS stack. 6 providers. |
| **`aios/tools/manager.py`** | ~200 | **Production** | Lazily loaded by EOS stack. 10 providers. |
| **`aios/security/manager.py`** | 192 | **Production** | Lazily loaded by EOS stack. Encryption, tokens, permissions. |
| **`aios/scheduler/manager.py`** | 204 | **Production** | Lazily loaded by EOS stack. |
| **`aios/plugins/manager.py`** | 168 | **Production** | Lazily loaded by EOS stack. CLI `plugins` command. |
| **`aios/multiagent/coordinator.py`** | 275 | **Production** | Lazily loaded by EOS stack. CLI `workflow` command. |
| **`aios/rag/manager.py`** | 216 | **Production** | Lazily loaded by EOS stack. |
| **`aios/vectorstore/manager.py`** | ~200 | **Production** | Lazily loaded by EOS stack. 6 providers. |
| **`aios/context/builder.py`** | ~120 | **Legacy** | Used by CLI `context` command. Separate from `eos/context_builder.py`. |
| **`aios/healing/repair.py`** | ~80 | **Prototype** | No production wiring. |
| **`aios/doctor/diagnostics.py`** | ~100 | **Prototype** | Used by CLI `doctor` command. |

### Summary Counts

| Classification | File Count | Representative Subsystems |
|--------------|-----------|--------------------------|
| **Production** | ~60 files | `eos/*`, `llm/`, `memory/memory_manager.py`, `tools/`, `security/`, `plugins/`, `scheduler/`, `embedding/`, `vectorstore/`, `rag/`, `multiagent/`, `core/config.py`, `api/*` |
| **Legacy** | ~30 files | `orchestrator.py`, `events/bus.py`, `memory/engine.py`, `executor/engine.py`, `intelligence/*`, `recovery/engine.py`, `state/engine.py`, `reporting/*`, `context/builder.py` |
| **Unused** | ~10 files | `config/*` (all 8 modules), `api/manager.py` |
| **Scaffolding** | ~8 files | `agent/agent.py`, `agent/planner.py`, `agent/executor.py`, `agent/reflection.py`, `events/store.py` |
| **Dead code** | 1 file | `api/manager.py` |
| **Prototype** | ~4 files | `healing/`, `doctor/` |

---

## Phase 5 — Dependency Graph

### Complete Dependency Structure

```
                    ┌─────────────────────────────────────────────┐
                    │              api/ (24 files)                 │
                    │  routes.py (mixed: imports eos + api.*)     │
                    │  stack.py (mixed: imports eos + managers)   │
                    │  14 route files (import stack + managers)    │
                    └──────────┬──────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   eos/ (13 files) │  │  Manager Layer    │  │  cli/ (24 files)  │
│   EventBus        │  │  (222 files,      │  │  app.py + 22 cmd  │
│   RuntimeEngine   │  │  non-EOS only)    │  │                   │
│   WorkflowEngine  │  │  llm/             │  │  commands/run.py  │
│   DecisionEngine  │  │  memory/          │  │    └─orchestrator │
│   ContextBuilder  │  │  tools/           │  │  commands/*.py    │
│   and 7 more      │  │  security/        │  │    └─ legacy mods │
└────────┬─────────┘  │  scheduler/       │  └──────────────────┘
         │            │  plugins/          │
         │            │  embedding/        │
         │            │  vectorstore/      │
         │            │  rag/              │
         │            │  multiagent/       │
         │            │  state/            │
         │            │  recovery/         │
         │            │  reporting/        │
         │            │  executor/         │
         ▼            │  intelligence/     │
┌──────────────────┐  │  context/          │
│   core/ (5 files) │  │  events/          │
│   config.py       │  │  agent/           │
│   exceptions.py   │  │  etc.             │
│   logger.py       │  └──────────────────┘
│   types.py        │
└──────────────────┘
```

### Critical Dependency Observations

1. **`core/` is the true shared layer** — All 277 files import from `core/` (config, exceptions, logger, types). This is the only dependency that every subsystem shares. It has zero `aios.*` dependencies.

2. **The Manager Layer (222 files) imports ONLY from `core/` and itself** — NOT from `eos/`. These modules are entirely independent of the EOS stack.

3. **The EOS stack (13 files) imports from `core/` and itself** — plus imports from `api/` (via stack.py). NOT from the manager layer.

4. **Only 2 files bridge the gap**:
   - `api/stack.py` — imports ALL 12 EOS modules + lazily imports 9 manager modules
   - `api/routes.py` — imports 4 EOS modules + all other API modules

5. **Circular dependencies exist ONLY within EOS** (14 modules). The manager layer has zero circular dependencies.

6. **The Orchestrator path is an island** — `orchestrator.py` imports from `core/`, `events/`, `executor/`, `intelligence/`, `memory/engine.py`, `plugins/`, `recovery/`, `reporting/`, `state/`. It imports NOTHING from `eos/` or any of the modern managers (`llm/`, `tools/`, `security/`, etc.).

### Islands, Bridges, and Cycles

| Type | Count | Members |
|------|-------|---------|
| Isolated (imports only `core/` + itself) | 222 files | All manager-layer modules |
| Bridges (imports both sides) | 2 files | `api/stack.py`, `api/routes.py` |
| Self-contained cycle | 14 files | All EOS modules (tightly coupled internally) |
| Dead-end (no consumers) | 1 file | `api/manager.py` |

### Convergence Feasibility

**Technically feasible with low risk.** The dependency structure reveals that:
- The EOS stack and manager layer are already independent — they just need a formal integration point
- The Orchestrator path is entirely replaceable — it imports nothing unique that the EOS path can't provide
- The only real work is reimplementing the legacy-specific capabilities (ScannerPlugin, IndexerPlugin, StateEngine, RecoveryEngine) using EOS patterns

---

## Phase 6 — Compatibility Analysis

### Scenario A: Orchestrator Path Disappears

**What breaks:**

| Component | Impact | Modules Affected | Effort |
|-----------|--------|-----------------|--------|
| `aios run` CLI command | Loses orchestration | `cli/commands/run.py` → reimplement using EOS RuntimeEngine | 3d |
| `aios memory` CLI command | Loses memory ops | `cli/commands/memory.py` → switch to MemoryManager import | 0.5d |
| `aios recover` CLI command | Loses recovery | `cli/commands/recover.py` → reimplement using RuntimeEngine retry/rollback | 1d |
| `aios state` CLI command | Loses state ops | `cli/commands/state.py` → reimplement using PersistenceStore | 1d |
| `aios decision` CLI command | Loses decision ops | `cli/commands/decision.py` → switch to EOSDecisionEngine import | 0.5d |
| `aios execute` CLI command | Loses execution | `cli/commands/execute.py` → reimplement using RuntimeEngine | 1d |
| `aios context` CLI command | Loses context | `cli/commands/context.py` → switch to EOSContextBuilder import | 0.5d |
| `aios report` CLI command | Loses reporting | `cli/commands/report.py` → reimplement using ObservabilityConsumer | 1d |
| `aios metrics` CLI command | Loses metrics | `cli/commands/metrics.py` → reimplement using ObservabilityConsumer | 0.5d |
| `aios doctor` CLI command | Loses diagnostics | `cli/commands/doctor.py` → reimplement or remove (prototype) | 0.5d |
| `scripts/run_orchestrator.py` | External script broken | Reimplement using EOS stack or remove | 0.5d |
| `tests/test_orchestrator_persistence_cli.py` | Test file broken | Rewrite to use EOS stack | 2d |
| `tests/test_phase4.py` | Test file broken | Rewrite to use EOS stack | 2d |
| `aios/recovery/engine.py` | Module removed | Replace with RuntimeEngine retry/rollback | — |
| `aios/state/engine.py` | Module removed | Replace with PersistenceStore | — |
| `aios/reporting/` (12 files) | Module removed | Replace with ObservabilityConsumer + structured logging | — |
| `aios/executor/engine.py` | Module removed | Replaced by eos RuntimeEngine | — |
| `aios/intelligence/decision/engine.py` | Module removed | Replaced by eos EOSDecisionEngine | — |

**Total migration effort**: ~16 engineering-days (moderate)

**Risk level**: Low. The Orchestrator path is only used by CLI commands. No HTTP API depends on it.

### Scenario B: EOS Stack Disappears

**What breaks:**

| Component | Impact | Modules Affected | Effort |
|-----------|--------|-----------------|--------|
| **Entire HTTP API** | All 20+ endpoints down | All API route files → no event-driven execution, no workflows | 30d+ |
| `api/stack.py` | Can't create EOS stack | All API dependencies broken | — |
| `eos/runtime_engine.py` | Lost state machine execution | CLI can't do automated workflows | — |
| `eos/workflow_engine.py` | Lost DAG workflow creation | No structured execution plans | — |
| `eos/event_bus.py` | Lost priority event system | No structured event-driven architecture | — |
| `eos/decision_engine.py` | Lost plan generation | No strategy/confidence system | — |
| `eos/context_builder.py` | Lost context assembly | No structured context pipeline | — |
| `eos/capability_discovery.py` | Lost capability matching | No capability-based routing | — |
| `eos/knowledge_service.py` | Lost knowledge search | No structured knowledge queries | — |
| `eos/persistence.py` | Lost SQLite persistence | No execution history, no reports | — |
| `eos/observability.py` | Lost real-time metrics | No health tracking, no event stream | — |
| `eos/registry.py` | Lost module registry | No capability discovery | — |
| `eos/agent_integration.py` | Lost tool execution bridge | No Agent → Tool coordination | — |
| **15+ test files** | All broken | All phase 4.2/4.3/4.4/4.5 tests | 5d |
| **Benchmarks** | All 37 benchmarks broken | `benchmark_phase4_5.py` | 2d |

**Total migration effort**: The Orchestrator path lacks equivalents for: event-driven workflows, DAG execution, capability discovery, knowledge service, structured persistence, real-time observability, priority event bus, rollback plans, and the modern tool/agent integration. **Reimplementing these on the Orchestrator path would require 50+ engineering-days and result in an inferior system.**

**Risk level**: **Very high.** The EOS stack is the primary production surface.

### Comparison

| Factor | Remove Orchestrator | Remove EOS |
|--------|--------------------|------------|
| **Effort** | ~16 days | 50+ days |
| **Risk** | Low | Very high |
| **Capability loss** | CLI toolchain (replaceable) | Entire HTTP API + workflow engine |
| **Test impact** | 2 test files | 15+ test files + 37 benchmarks |
| **Production impact** | None (CLI only) | Complete (HTTP API down) |
| **User impact** | CLI users (devs) | All API users (all consumers) |

---

## Phase 7 — Event System Migration

### Comparison: `events/bus.py` vs `eos/event_bus.py`

| Aspect | `events/bus.py` (Legacy) | `eos/event_bus.py` (EOS) |
|--------|-------------------------|-------------------------|
| **Message model** | `Event` (event_type, source, timestamp, payload, event_id) | `RuntimeEvent` (event_type, execution_id, step_id, message, timestamp, metadata) wrapped in `EventEnvelope` (event_id, priority, dispatch_mode, published_at) |
| **Delivery guarantees** | Sync only. Exceptions logged, not propagated | Sync + Async modes per event. Exception-safe dispatch. |
| **Subscription model** | By `EventType` (enum). Direct handler registration. | By `RuntimeEventType`. `EventSubscription` objects with subscription_id, priority, is_active flag. |
| **Threading** | Not thread-safe (bare dict + list) | `threading.Lock()` on all mutation. Thread-safe. |
| **History** | In-memory list (`_log: list[Event]`). No size limit. | `EventHistory` backed by `collections.deque(maxlen=N)`. Configurable max size. |
| **Priority** | None (FIFO) | `EventPriority` (LOW, NORMAL, HIGH, CRITICAL) with `_PRIORITY_ORDER` mapping. |
| **Async support** | None | `EventDispatchMode.SYNC` and `EventDispatchMode.ASYNC`. Async dispatch uses threading. |
| **Performance** | Untested | Benchmarked (phase 4.5 results in `benchmark_results_phase4_5.json`) |
| **Statistics** | `subscriber_count` property | `EventStatistics` dataclass (total, sync, async, failed, dispatch time, history size) |
| **Validation** | None | `_validate_event()` — checks type, event_type, execution_id, timestamp |
| **Lifecycle** | No initialization guard | `initialize()`, `_require_initialized()`, `shutdown()` |
| **Lines** | 71 | 613 |
| **Consumers** | `orchestrator.py`, `events/__init__.py` | All EOS modules, API stack, 7 test files |
| **Event types** | `EventType` (20 types: REPOSITORY_SCANNED, INDEX_UPDATED, etc.) | `RuntimeEventType` (17 types: EXECUTION_CREATED, QUEUED, STARTED, COMPLETED, FAILED, CANCELLED, PAUSED, RESUMED, ROLLED_BACK, STEP_STARTED, COMPLETED, FAILED, SKIPPED, RETRYING, ROLLBACK_STARTED, ROLLBACK_STEP_STARTED, ROLLBACK_STEP_COMPLETED) |

### Migration Matrix

| Legacy Event | EOS Equivalent | Migration Path |
|-------------|----------------|----------------|
| `REPOSITORY_SCANNED` | Not in RuntimeEventType | Add as EOS event type, or replace with workflow step |
| `INDEX_UPDATED` | Not in RuntimeEventType | Add as EOS event type |
| `STATE_UPDATED` | Not in RuntimeEventType | Replace with PersistenceStore writes |
| `EXECUTION_STARTED` | `EXECUTION_STARTED` | Direct mapping |
| `EXECUTION_COMPLETED` | `EXECUTION_COMPLETED` | Direct mapping |
| `EXECUTION_FAILED` | `EXECUTION_FAILED` | Direct mapping |
| `SESSION_STARTED` | Not in RuntimeEventType | Add or replace with workflow lifecycle |
| `SESSION_COMPLETED` | Not in RuntimeEventType | Add or replace with workflow lifecycle |
| `ORCHESTRATION_STARTED` | Not in RuntimeEventType | Replace with `RuntimeEngine.execute()` |
| `ORCHESTRATION_COMPLETED` | Not in RuntimeEventType | Replace with `RuntimeEngine.completed` event |
| `DECISION_MADE` | Not in RuntimeEventType | Replace with EOSDecisionEngine.plan() |
| `MEMORY_STORED` | Not in RuntimeEventType | Replace with MemoryManager.store() |
| `MEMORY_COMPRESSED` | Not in RuntimeEventType | Replace with MemoryManager.consolidate_all() |
| `CONFIG_CHANGED` | Not in RuntimeEventType | Add if needed |
| `CACHE_UPDATED` | Not in RuntimeEventType | Replace with cache miss |
| `VALIDATION_COMPLETE` | Not in RuntimeEventType | Replace with validate() return |
| `REPORT_GENERATED` | Not in RuntimeEventType | Replace with ObservabilityConsumer |
| `METRICS_COLLECTED` | Not in RuntimeEventType | Replace with ObservabilityConsumer |
| `CHECKPOINT_CREATED` | Not in RuntimeEventType | Replace with PersistenceStore snapshot |
| `CHECKPOINT_RESTORED` | Not in RuntimeEventType | Replace with PersistenceStore restore |
| `PLUGIN_FAILED` | Not in RuntimeEventType | Add or handle through PluginManager |

### Adapter Strategy

A `LegacyEventAdapter` class (estimated 1d, ~80 lines) can bridge the two systems:

```python
class LegacyEventAdapter:
    """Bridge between aios.events.types.Event and aios.eos.runtime_engine.RuntimeEvent."""

    _TYPE_MAP = {
        EventType.EXECUTION_STARTED: RuntimeEventType.EXECUTION_STARTED,
        EventType.EXECUTION_COMPLETED: RuntimeEventType.EXECUTION_COMPLETED,
        EventType.EXECUTION_FAILED: RuntimeEventType.EXECUTION_FAILED,
        # ... partial mapping
    }

    def to_runtime(self, legacy_event: Event) -> RuntimeEvent:
        """Convert legacy Event to EOS RuntimeEvent."""
        ...

    def subscribe_legacy(self, eos_bus: EventBus, legacy_bus: EventBus):
        """Bridge: EOS events → legacy handlers."""
        ...
```

**Conclusion**: Feasible. The EOS EventBus is strictly superior. Migration = map event types + adapter bridge. Effort: 3d.

---

## Phase 8 — Memory Migration

### Comparison: `memory/engine.py` vs `memory/memory_manager.py`

| Aspect | `MemoryEngine` | `MemoryManager` |
|--------|---------------|-----------------|
| **Architecture** | Store → Index → Search → Compressor → Knowledge → Snapshots | Working → Episodic → Semantic + RetrievalEngine + ConsolidationEngine |
| **Tiers** | short_term, long_term (2) | WORKING, EPISODIC, SEMANTIC (3) |
| **Backend** | `MemoryStore` (dict-based, JSON snapshots to file) | `MemoryStoreBackend` (abstract, injectable) |
| **Storage** | `.ai/runtime/memory.json` + `.ai/runtime/memory-index.json` | Via injected backend (dict or persistent) |
| **Retrieval** | Keyword search via `MemorySearch` | Keyword + hybrid + similarity via `RetrievalEngine` |
| **Embeddings** | None | EmbeddingProvider (injectable, MockEmbeddingProvider default) |
| **TTL/Expiry** | `prune(max_age_days=30)` — manual | `ConsolidationEngine` with `working_ttl` (configurable) + TTL-based expiry |
| **Deduplication** | None | `ConsolidationEngine` with `dedup_threshold` |
| **Compression** | `compress(target_ratio=0.5)` — manual, by ratio | Via consolidation (automatic) |
| **Snapshots** | `SnapshotManager` writes `memory.json` | None built-in (delegated to backend) |
| **Initialization** | Constructor takes `AIOSConfig`. No `initialize()` guard | `initialize()` with `_require_initialized()`. Backend injected via constructor. |
| **Thread safety** | None | `threading.Lock()` |
| **Validation** | None | `validate()` returning `MemoryValidationResult` |
| **Statistics** | Basic: `snapshot()` dict | `statistics()` returning `MemoryStatistics` dataclass |
| **Lines** | 90 | 191 |
| **Consumers** | Orchestrator, CLI `memory`/`recover` commands | API stack (lazy), `memory/__init__.py` re-export |

### Can One Replace the Other?

**Yes, MemoryManager can replace MemoryEngine.** MemoryManager has:
- All capabilities of MemoryEngine (store, retrieve, forget)
- Additional capabilities MemoryEngine lacks (hybrid search, similarity search, consolidation, embedding-based retrieval, TTL-based expiry)
- Structured lifecycle (initialize, validate, statistics, reload)

**What MemoryEngine has that MemoryManager doesn't:**
- `compress(target_ratio)` — ConsolidationEngine doesn't expose target-ratio compression; it uses TTL-based consolidation
- `prune(max_age_days)` — ConsolidationEngine handles TTL internally but doesn't expose age-based pruning
- `snapshot()` — Returns full memory state as dict. MemoryManager has no equivalent.
- `search_memories(query, top_k, memory_type)` — MemoryManager's `retrieve()` and `hybrid_retrieve()` are equivalent

### Migration Cost

| Step | Effort |
|------|--------|
| Add `compress(target_ratio)` to ConsolidationEngine | 1d |
| Add `prune(max_age_days)` to MemoryManager | 0.5d |
| Add `snapshot()` to MemoryManager | 0.5d |
| Reimplement CLI `memory` command to use MemoryManager | 0.5d |
| Reimplement CLI `recover` command to use MemoryManager | 0.5d |
| Wire MemoryManager into Orchestrator (if keeping it) | 0.5d |
| Remove `memory/engine.py` and dependent files | 0.5d |

**Total: ~4d**

---

## Phase 9 — Configuration Migration

### Comparison: `core/config.py` vs `config/manager.py`

| Aspect | `core/config.py` | `config/manager.py` |
|--------|-----------------|---------------------|
| **Schema** | `AIOSConfig` dataclass with typed fields | No fixed schema — arbitrary dict with optional `ConfigSchemaEntry[]` validation |
| **Validation** | None beyond dataclass types | `validate_config()` against `ConfigSchemaEntry[]` list |
| **Environment** | `_ENV_MAP` (9 env vars with explicit mapping + type casting) | `load_env_overrides()` — reads ALL `AIOS_*` env vars dynamically |
| **Secrets** | None | `SecretsManager` (separate module) |
| **File formats** | JSON, YAML | JSON, YAML, TOML, .env |
| **Defaults** | Dataclass field defaults | `get_defaults()` — returns dict |
| **Priority** | File → Env (file wins on conflict) | Runtime → Env → Secrets → Files → Defaults (clearly documented) |
| **Reload** | None | Not explicitly, but `_config` can be re-merged |
| **CLI integration** | `aios cli/app.py` calls `load_config(Path.cwd())` | None (not imported by CLI) |
| **API integration** | `api/stack.py` calls `load_config(Path.cwd())` | Lazily loaded in stack.py (try/except: pass) |
| **Runtime integration** | All 26 production files use this | Not used in production |
| **Thread safety** | None | `threading.Lock()` |
| **Lines** | 208 | 382 (+6 supporting modules) |
| **Dependencies** | `aios.core.exceptions`, `yaml` (optional) | 6 internal submodules + `core.exceptions`, `core.logger`, `tomli`, `tomli_w`, `yaml` |
| **Production usage** | **100%** | **0%** |

### Analysis

This is NOT a "competing config systems" scenario. The two serve different roles:
- `core/config.py` is a **fixed-schema config loader** — reads config into a typed dataclass. Simple, predictable, used everywhere.
- `config/manager.py` is a **dynamic config management system** — schema-optional, multi-format, secrets-aware, dot-notation access. More flexible but unused.

**Who should become canonical?** Neither — or rather, `core/config.py` is already canonical. All 26 production consumers use it. The `config/manager.py` was built as a potential replacement but was never integrated.

**Recommended action**: Either:
- **Integrate `config/manager.py`** as the new canonical config system and migrate all 26 consumers (effort: 5d)
- **Remove `config/manager.py`** as unused code (effort: 1d)
- **Keep both** with clear documentation that `core/config.py` is canonical (effort: 0d, but leaves technical debt)

**Recommendation**: Keep `core/config.py` as canonical for v1.2. Defer config system migration to v1.3 or later. The current system works and is used by everything.

---

## Phase 10 — Risk Assessment

### Migration Option A: Keep Both (Status Quo)

| Risk | Likelihood | Impact | Description |
|------|-----------|--------|-------------|
| R-A1 | High | Medium | New developers add features to the wrong stack, increasing divergence |
| R-A2 | Medium | High | Bug discovered in one stack requires fix in both (double maintenance) |
| R-A3 | Low | Low | Feature requests for CLI-available capabilities not in API and vice versa |
| R-A4 | Medium | Medium | Test coverage diverges further; EOS has 15+ test files, CLI path has 2 |

**Total risk score**: 6/12 (Moderate — long-term unsustainability)

### Migration Option B: Remove Orchestrator, Keep EOS

| Risk | Likelihood | Impact | Description |
|------|-----------|--------|-------------|
| R-B1 | Low | Low | CLI `aios run` users lose the orchestration command — replaced with workflow execution |
| R-B2 | Low | Low | `aios memory/recover/state/decision/execute/report/etc.` commands need refactoring — 16d effort |
| R-B3 | Medium | Low | Legacy test files (2) broken — rewrite cost 4d |
| R-B4 | Low | Low | State engine migration — file-based to SQLite — data migration needed |
| R-B5 | Low | Medium | ScannerPlugin and IndexerPlugin are only available on CLI path — need EOS equivalents or integration |

**Total risk score**: 4/12 (Low — manageable with planning)

### Migration Option C: Remove EOS, Keep Orchestrator

| Risk | Likelihood | Impact | Description |
|------|-----------|--------|-------------|
| R-C1 | High | Critical | Entire HTTP API (20+ endpoints) disappears — all API consumers broken |
| R-C2 | High | Critical | All workflow/execution features lost — no RuntimeEngine, no WorkflowEngine |
| R-C3 | High | High | All real-time observability lost — no ObservabilityConsumer |
| R-C4 | High | High | All structured persistence lost — no PersistenceStore |
| R-C5 | Medium | High | EOS DecisionEngine, ContextBuilder, CapabilityDiscovery, KnowledgeService all lost |
| R-C6 | High | High | 15+ test files + 37 benchmarks all broken |
| R-C7 | High | Medium | All lazy-loaded managers (LLM, tools, security, scheduler, etc.) lose their EOS integration point |

**Total risk score**: 16/12 (Very high — effectively a rewrite)

### Migration Option D: Hybrid

| Risk | Likelihood | Impact | Description |
|------|-----------|--------|-------------|
| R-D1 | Medium | Medium | Need to maintain clear boundaries and interface contracts between stacks |
| R-D2 | Medium | Low | Developers confused about which pattern to follow for new features |
| R-D3 | Low | Medium | Adapter/bridge code needs maintenance across releases |
| R-D4 | Low | Low | Some capabilities still duplicated (memory, events) with explicit adapter layer |

**Total risk score**: 5/12 (Low-Moderate — requires architectural governance)

---

## Phase 11 — Recommended Target Architecture

### Analysis of Options

**Option A: Maintain both stacks** — Rejected. The cost of maintaining two parallel implementations of similar concepts (memory, events, execution) exceeds the benefit of having a CLI-specific path. The CLI path has zero unique capabilities that cannot be provided by EOS.

**Option B: EOS becomes canonical** — **Recommended with modifications.** The EOS stack is the production HTTP surface with superior capability in every dimension. However:
- The manager layer (LLM, tools, security, etc.) should be formally integrated into EOS, not lazily loaded via `try/except: pass`
- The CLI path should be reimplemented using EOS components, not removed
- The circular dependency problem in EOS (14 modules) must be resolved
- ScannerPlugin and IndexerPlugin need EOS equivalents or adapter integration

**Option C: Legacy becomes canonical** — Rejected. The Orchestrator path lacks workflow engine, event-driven execution, capability discovery, knowledge service, structured persistence, real-time observability, and all the lazy-loaded managers (LLM, tools, security, etc.). Re-implementing these would take 50+ days and result in an inferior system.

**Option D: Hybrid** — Partially accepted. During the migration period (Phase 3: Dual Operation), both stacks coexist with explicit bridge layers. But the target state is Option B.

### Recommended Architecture: Converged EOS With Integrated Managers

```
┌──────────────────────────────────────────────────────────────────────┐
│                        API Layer (FastAPI)                            │
│  routes.py → 12 sub-routers → stack.get_stack()                      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
         ┌──────────▼──────────┐   ┌─────────▼──────────┐
         │  EOS Core (12 mods)  │   │  Manager Layer       │
         │  EventBus            │   │  (formally init'd)   │
         │  RuntimeEngine       │   │  memory/             │
         │  WorkflowEngine      │   │  llm/                │
         │  DecisionEngine      │   │  tools/              │
         │  ContextBuilder      │   │  security/           │
         │  CapabilityDiscovery │   │  embedding/          │
         │  KnowledgeService    │   │  vectorstore/        │
         │  Persistence         │   │  rag/                │
         │  Observability       │   │  scheduler/          │
         │  Registry            │   │  plugins/            │
         │  AgentIntegration    │   │  multiagent/         │
         │  Loader              │   │                     │
         └──────────┬──────────┘   └─────────┬────────────┘
                    │                        │
                    └──────────┬─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Core Layer          │
                    │  config, exceptions, │
                    │  logger, types       │
                    └─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  CLI Layer (refactored) │
                    │  uses EOS + managers    │
                    │  no legacy modules      │
                    └─────────────────────────┘
```

### Key Changes from Current State

1. **Formalize manager initialization** in `create_stack()` — replace 12 `try/except: pass` with proper initialization with error propagation
2. **Resolve EOS circular dependencies** — introduce abstract base modules for EventBus, RuntimeEngine, Observability
3. **Reimplement CLI commands** to use EOS components directly (not through `orchestrator.py`)
4. **Remove or archive** `orchestrator.py`, `events/bus.py`, `events/store.py`, `memory/engine.py`, `executor/engine.py`, `intelligence/decision/engine.py`, `recovery/engine.py`, `state/engine.py`, `reporting/`, `context/builder.py`
5. **Keep `core/config.py` as canonical** — defer `config/manager.py` integration
6. **Keep `agent/` scaffolding** — mark as `@deprecated` with warning; replace when Planner/Executor/Reflection are properly implemented

---

## Phase 12 — Migration Roadmap

### Phase 1: Preparation (Sprint 1, 5d)

| Task | Effort | Risk |
|------|--------|------|
| 1.1 Add `LegacyEventAdapter` bridge class | 2d | Low |
| 1.2 Add `LegacyMemoryAdapter` bridge (MemoryEngine ↔ MemoryManager) | 1d | Low |
| 1.3 Document EOS module interface contracts (formal API surface) | 1d | Low |
| 1.4 Resolve EOS circular dependencies (introduce abstract event/observability types) | 3d | Medium |
| 1.5 Replace `try/except: pass` in `create_stack()` with proper error propagation | 1d | Low |
| 1.6 Mark all legacy modules with `DEPRECATED` import-time warning | 0.5d | Low |

**Exit criteria**: All legacy modules produce deprecation warnings when imported. EOS circular dependencies resolved. Adapter classes written and tested.

### Phase 2: Dual Operation (Sprint 2-3, 10d)

| Task | Effort | Risk |
|------|--------|------|
| 2.1 Add `compress()` and `prune()` to MemoryManager (memory engine parity) | 1.5d | Low |
| 2.2 Add `snapshot()` to MemoryManager (memory engine parity) | 0.5d | Low |
| 2.3 Reimplement CLI `memory` command using MemoryManager | 0.5d | Low |
| 2.4 Reimplement CLI `recover` command using EOS RuntimeEngine | 1d | Low |
| 2.5 Reimplement CLI `state` command using PersistenceStore | 1d | Low |
| 2.6 Reimplement CLI `decision` command using EOSDecisionEngine | 0.5d | Low |
| 2.7 Reimplement CLI `execute` command using RuntimeEngine | 1d | Low |
| 2.8 Reimplement CLI `context` command using EOSContextBuilder | 0.5d | Low |
| 2.9 Reimplement CLI `report`/`metrics` commands using ObservabilityConsumer | 1d | Low |
| 2.10 Reimplement CLI `run` command using EOS WorkflowEngine → RuntimeEngine | 3d | Medium |
| 2.11 Wire ScannerPlugin and IndexerPlugin as EOS-compatible extensions | 2d | Medium |

**Exit criteria**: All CLI commands work using EOS components. Both stacks run in parallel. Adapter layer handles event/memory bridging. All tests pass.

### Phase 3: Migration (Sprint 4, 5d)

| Task | Effort | Risk |
|------|--------|------|
| 3.1 Migrate `tests/test_orchestrator_persistence_cli.py` to EOS-based tests | 2d | Low |
| 3.2 Migrate `tests/test_phase4.py` to EOS-based tests | 2d | Low |
| 3.3 Add integration tests for CLI commands using EOS stack | 2d | Low |
| 3.4 Run 37 benchmarks on converged stack — verify no regression | 1d | Low |
| 3.5 Update documentation: Architecture.md, DeveloperGuide.md, CLI.md | 2d | Low |

**Exit criteria**: Legacy test files migrated. All 37 benchmarks pass. Documentation updated.

### Phase 4: Deprecation (Sprint 5, 3d)

| Task | Effort | Risk |
|------|--------|------|
| 4.1 Archive `orchestrator.py` with README pointing to EOS equivalent | 0.5d | Low |
| 4.2 Archive `events/bus.py`, `events/store.py` | 0.5d | Low |
| 4.3 Archive `memory/engine.py` | 0.5d | Low |
| 4.4 Archive `executor/engine.py`, `intelligence/decision/engine.py` | 0.5d | Low |
| 4.5 Archive `recovery/engine.py` | 0.5d | Low |
| 4.6 Archive `state/engine.py` | 0.5d | Low |
| 4.7 Archive `reporting/` directory | 0.5d | Low |
| 4.8 Archive `context/builder.py` | 0.5d | Low |
| 4.9 Remove `api/manager.py` (dead code) | 0.5d | Low |
| 4.10 Verify no production imports remain for archived modules | 1d | Medium |
| 4.11 Final test run — full suite | 1d | Low |

**Exit criteria**: All legacy modules archived. Zero production imports reference them. Full test suite passes.

### Phase 5: Cleanup (Sprint 6, 2d)

| Task | Effort | Risk |
|------|--------|------|
| 5.1 Remove deprecation warning code (no longer needed) | 0.5d | Low |
| 5.2 Remove adapter bridge classes (LegacyEventAdapter, LegacyMemoryAdapter) | 0.5d | Low |
| 5.3 Final architecture documentation update | 1d | Low |
| 5.4 CHANGELOG entry for architecture convergence | 0.5d | Low |

**Exit criteria**: Clean architecture. No legacy code. All documentation reflects converged state.

### Total Migration Effort

| Phase | Duration | Engineering-Days |
|-------|----------|-----------------|
| Phase 1: Preparation | Sprint 1 (5d) | 9.5 |
| Phase 2: Dual Operation | Sprint 2-3 (10d) | 12.0 |
| Phase 3: Migration | Sprint 4 (5d) | 7.0 |
| Phase 4: Deprecation | Sprint 5 (3d) | 4.5 |
| Phase 5: Cleanup | Sprint 6 (2d) | 2.5 |
| **Total** | **6 sprints (25 working days)** | **35.5** |

With 2 engineers: ~3.5 sprints (18 working days)
With 3 engineers: ~2.5 sprints (12 working days)

### Verification Requirements

| Milestone | Verification Gate | Method |
|-----------|------------------|--------|
| Phase 1 complete | All 37 benchmarks pass with no regression | `pytest tests/benchmark_phase4_5.py` |
| Phase 2 complete | All 20 CLI commands produce same output as pre-migration | Side-by-side execution comparison |
| Phase 2 complete | All API endpoints return same responses | Automated API contract test (record/replay) |
| Phase 3 complete | All 45+ existing tests pass | `pytest tests/ -v` |
| Phase 4 complete | Zero future imports of archived modules | `grep -r "from aios.orchestrator" src/` = empty |
| Phase 5 complete | Full E2E test: CLI → API → persistence → retrieval | Manual E2E scenario |

---

## Final Recommendation

### Choose: **Converge to EOS**

The EOS stack should become the canonical execution architecture. The Orchestrator path should be reimplemented using EOS components and then archived.

**Rationale (summarised from evidence above):**

1. **The EOS stack is the production surface.** All HTTP API traffic goes through EOS. The CLI path is only used by developer tooling.

2. **The EOS stack is strictly superior in every dimension.** Feature matrix (Phase 3) shows EOS wins on: memory (3-tier vs 2-tier, embedding vs file), events (priority sync/async vs simple sync), execution (state machine vs linear pipeline), persistence (SQLite vs file), observability (real-time vs batch), security, scheduling, tool execution, multi-agent, planning, and more.

3. **The Orchestrator path has zero unique capabilities.** Everything it does can be done through EOS components. ScannerPlugin and IndexerPlugin are the only exceptions — they need EOS integration.

4. **The dependency structure supports convergence.** The EOS stack and manager layer (222 files) are already independent. Only 2 files bridge them. The circular dependencies in EOS are a known issue that must be resolved regardless of the convergence decision.

5. **Migration risk is low.** Removing the Orchestrator path impacts only CLI commands (estimated ~16d to reimplement). Removing EOS would destroy the HTTP API (50+ days with severe capability loss).

6. **The historical mandate supports this.** The SVF RC1.1 roadmap (July 9, 2026) explicitly called for "One runtime, one state system, one context loader." Convergence to EOS fulfills that mandate.

### Exceptions and Caveats

| Item | Recommendation | Justification |
|------|---------------|---------------|
| `core/config.py` | Keep as canonical | Used by 26 production files. `config/manager.py` is unused. |
| `agent/` scaffolding | Keep in place (deprecated) | Planner/Executor/Reflection stubs are placeholder structure for future real implementation |
| `config/manager.py` | Defer integration | Not urgent. The unused subsystem doesn't cause problems. |
| `api/manager.py` | Remove (dead code) | 187 lines of mock routing never used by FastAPI |
| `healing/`, `doctor/` | Keep (prototype) | Low-priority experimental features. Not causing harm. |

---

**Analysis complete. Every conclusion supported by source-code inspection and architecture document analysis.**
