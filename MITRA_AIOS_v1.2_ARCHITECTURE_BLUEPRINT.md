# MITRA AIOS v1.2 — Architecture Implementation Blueprint

**Date**: 2026-07-17  
**Author**: Chief Software Architect / Principal Systems Engineer  
**Status**: APPROVED — Ready for Implementation  
**Version**: 1.2.0-draft  
**Based on**: MITRA_AIOS_ARCHITECTURE_CONVERGENCE_ANALYSIS.md (Phase 1-12 analysis)

---

## Executive Summary

MITRA AIOS currently operates two independent execution architectures: the **CLI Orchestrator path** (legacy toolchain) and the **API/EOS path** (production engine). The convergence analysis determined that the EOS stack is strictly superior in every dimension and should become the canonical runtime.

This blueprint defines the executable engineering program to converge both paths into a single architecture. It covers module ownership, interface contracts, migration sequencing, release engineering, and success metrics across 14 domains.

**Key decisions**:
- **EOS becomes canonical** — all new capability development targets EOS
- **Legacy modules deprecated in v1.2, removed in v1.3**
- **Manager layer formally integrated** — no more `try/except: pass` lazy loading
- **CLI commands reimplemented** using EOS components
- **core/config.py remains canonical** — config/manager.py integration deferred to v1.3+
- **Zero circular dependencies** — enforced via CI

**Total migration effort**: 35.5 engineering-days across 6 sprints  
**Release target**: v1.2.0-rc1 within 8-10 weeks

---

## Phase 1 — Target Architecture Specification

### 1.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLI Layer (Refactored)                           │
│  aios.cli.app (typer) → 21 commands → all backed by EOS + Managers       │
│  No direct imports to orchestrator.py, events/bus.py, memory/engine.py    │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────┐
│                         API Layer (FastAPI)                                │
│  aios.api.app → 14 route files → aios.api.stack:EOSStack                  │
│  All routes use EOS core or formally-initialized managers                  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
         ┌──────────▼──────────┐   ┌─────────▼──────────────────┐
         │   EOS Core Layer     │   │  Manager Integration Layer │
         │   (Canonical)         │   │  (Formal lifecycle)        │
         │                       │   │                             │
         │  ┌─────────────────┐  │   │  MemoryManager              │
         │  │ EventBus         │  │   │  LLMManager                 │
         │  │ RuntimeEngine    │  │   │  EmbeddingManager           │
         │  │ WorkflowEngine   │  │   │  VectorStoreManager         │
         │  │ DecisionEngine   │  │   │  ToolManager                │
         │  │ ContextBuilder   │  │   │  PluginManager              │
         │  │ CapabilityDisc.  │  │   │  RAGManager                 │
         │  │ KnowledgeService │  │   │  SecurityManager            │
         │  │ PersistenceStore │  │   │  Scheduler                  │
         │  │ Observability    │  │   │  MultiAgentCoordinator      │
         │  │ Loader + Registry│  │   │                             │
         │  │ AgentIntegration │  │   │  All follow 6-method        │
         │  └─────────────────┘  │   │  lifecycle contract          │
         └──────────┬──────────┘   └─────────┬──────────────────────┘
                    │                        │
                    └──────────┬─────────────┘
                               │
                    ┌──────────▼──────────────────────────────────────┐
                    │              Core Shared Layer                    │
                    │  aios.core.config     — AIOSConfig (canonical)    │
                    │  aios.core.exceptions  — all exception types      │
                    │  aios.core.logger      — logging infrastructure   │
                    │  aios.core.types       — shared type definitions  │
                    │  aios.utils.serialization — JSON/YAML helpers     │
                    │  aios.repository.*     — file scanning/hashing    │
                    └──────────────────────────────────────────────────┘
```

### 1.2 Layer Responsibilities

| Layer | Responsibility | Ownership |
|-------|---------------|-----------|
| **CLI Layer** | Command-line interface for all AIOS operations. Typer-based. Each command delegates to EOS or manager APIs. Zero legacy module imports. | CLI team |
| **API Layer** | FastAPI HTTP/WebSocket surface. Route handlers call through EOSStack. No business logic in routes. | API team |
| **EOS Core Layer** | Event-driven execution engine. RuntimeEngine (state machine), WorkflowEngine (DAG), DecisionEngine (planning), EventBus (pub/sub), PersistenceStore (SQLite), ObservabilityConsumer (telemetry), CapabilityDiscovery, KnowledgeService, ContextBuilder, Loader, Registry, AgentIntegration. | EOS core team |
| **Manager Layer** | Cross-cutting capability providers. Each manager implements the 6-method lifecycle (initialize, validate, statistics, health, reload, shutdown). Formally wired in EOSStack. | Manager owners (per module) |
| **Core Shared Layer** | Zero-dependency utilities used by every other layer. Config, exceptions, logger, types, serialization, repository helpers. | Platform team |

### 1.3 Module Lifecycle

Every canonical module (EOS + managers) implements these six methods:

```python
def initialize(self, ...) -> Self          # One-time setup, dependency injection
def validate(self) -> ValidationResult     # Integrity check
def statistics(self) -> Statistics         # Runtime metrics snapshot
def health(self) -> HealthStatus          # Liveness check with subsystem details
def reload(self) -> Self                  # Graceful config/state reload
def shutdown(self) -> None                # Resource cleanup, idempotent
```

Plus:
- `is_initialized: bool` property
- `_require_initialized()` guard on all public methods
- Thread safety via `threading.Lock()` on mutable state

### 1.4 Dependency Rules

```
Layer          → May Import From
─────          ──────────────────────────────────────────
CLI            → core, eos, managers, api (for stack creation)
API            → core, eos, managers
EOS Core       → core, eos.types, eos (sibling modules)
Managers       → core, eos.types (NOT eos modules directly)
Core Shared    → nothing in aios.* (stdlib + third-party only)
```

**Cross-layer rules**:
- Managers NEVER import from EOS modules (they provide services TO EOS)
- CLI NEVER imports legacy modules (orchestrator.py, events/bus.py, memory/engine.py)
- EOS modules import from each other with NO circular dependencies (enforced by types.py)
- Core layer has ZERO aios.* imports

---

## Phase 2 — Module Ownership

### 2.1 Ownership Classification

#### CANONICAL (14 files) — Active production, target state

| Module | Rationale | Future Owner |
|--------|-----------|-------------|
| `aios/eos/event_bus.py` | Priority sync/async event bus. Thread-safe. 613 lines. | EOS core |
| `aios/eos/runtime_engine.py` | State machine execution. 1409 lines. Primary orchestrator replacement. | EOS core |
| `aios/eos/workflow_engine.py` | DAG workflow compilation and execution. 889 lines. | EOS core |
| `aios/eos/decision_engine.py` | Strategy planning and action ranking. 625 lines. | EOS core |
| `aios/eos/context_builder.py` | Execution context assembly. 438 lines. | EOS core |
| `aios/eos/capability_discovery.py` | .ai kernel capability discovery. | EOS core |
| `aios/eos/knowledge_service.py` | Knowledge document management. | EOS core |
| `aios/eos/persistence.py` | SQLite-backed persistence. 894 lines. | EOS core |
| `aios/eos/observability.py` | Real-time event stream, metrics, health. | EOS core |
| `aios/eos/loader.py` | EOS tree discovery and loading. | EOS core |
| `aios/eos/registry.py` | EOS module registry. | EOS core |
| `aios/eos/agent_integration.py` | Agent-Tool bridging. | EOS core |
| `aios/eos/types.py` | Shared EOS type definitions (HealthStatus, SystemMetrics, EventStreamEntry). | EOS core |
| `aios/eos/__init__.py` | Public API re-exports. | EOS core |

#### SHARED (~140 files) — Used by both stacks, retained as-is

| Subsystem | Rationale | Expected Removal |
|-----------|-----------|-----------------|
| `aios/core/` (5 files) | Zero-dependency foundation. Used by everything. | Never |
| `aios/utils/` (2 files) | JSON/YAML serialization. Used everywhere. | Never |
| `aios/repository/` (6 files) | File scanning/walking. Used by scanner + indexer. | Never |
| `aios/llm/` (10+ files) | LLM provider abstraction. 8 providers. Canonical. | Never |
| `aios/embedding/` (9 files) | Embedding provider abstraction. 6 providers. Canonical. | Never |
| `aios/tools/` (15 files) | Tool execution. 8 providers. Canonical. | Never |
| `aios/security/` (8 files) | Encryption, tokens, permissions, secrets. | Never |
| `aios/plugins/` (9 files) | Plugin lifecycle management. | Never |
| `aios/scheduler/` (6 files) | Task queue and scheduling. | Never |
| `aios/rag/` (10 files) | Chunk, index, retrieve, rerank. | Never |
| `aios/vectorstore/` (9 files) | 6 vector database providers. | Never |
| `aios/multiagent/` (9 files) | Multi-agent coordination. | Never |
| `aios/observability/` (6 files) | Observability manager (layer above eos observability). | Never |
| `aios/memory/memory_manager.py` (canonical) | 3-tier embedding memory. Formal replacement for MemoryEngine. | Never |
| `aios/memory/working_memory.py` | Working memory subsystem. | Never |
| `aios/memory/episodic_memory.py` | Episodic memory subsystem. | Never |
| `aios/memory/semantic_memory.py` | Semantic memory subsystem. | Never |
| `aios/memory/retrieval.py` | Retrieval engine (keyword + hybrid + semantic). | Never |
| `aios/memory/consolidation.py` | Memory consolidation with TTL and dedup. | Never |
| `aios/memory/memory_store.py` | Abstract memory backend. | Never |
| `aios/memory/embeddings.py` | Memory embedding provider. | Never |
| `aios/memory/models.py` | Memory data models. | Never |
| `aios/agent/` (12 files) | Agent scaffolding. Used by both stacks. | When EOS agent_integration matures |
| `aios/api/` (24 files) | API layer. Stays. | Never |
| `aios/cli/` (24 files) | CLI layer. Commands refactored to use EOS. | Never (but commands change internally) |
| `aios/config/` (8 files) | Dynamic config manager. Unused in prod but exists. | Deferred to v1.3+ |

#### LEGACY (~35 files) — Only used by Orchestrator path, replaced by EOS

| Module | Replaced By | Removal Sprint | Migration Status |
|--------|-------------|----------------|-----------------|
| `aios/orchestrator.py` | `eos/runtime_engine.py` | Sprint 5 | Deprecation warning added |
| `aios/executor/engine.py` | `eos/runtime_engine.py` | Sprint 5 | Not yet deprecated |
| `aios/executor/dispatcher.py` | `eos/runtime_engine.py` | Sprint 5 | Not yet deprecated |
| `aios/executor/pipeline.py` | `eos/runtime_engine.py` | Sprint 5 | Not yet deprecated |
| `aios/executor/monitor.py` | `eos/observability.py` | Sprint 5 | Not yet deprecated |
| `aios/executor/rollback.py` | EOS RuntimeEngine rollback | Sprint 5 | Not yet deprecated |
| `aios/executor/failure.py` | EOS RuntimeEngine retry | Sprint 5 | Not yet deprecated |
| `aios/intelligence/decision/engine.py` | `eos/decision_engine.py` | Sprint 5 | Not yet deprecated |
| `aios/intelligence/decision/evaluator.py` | EOS decision engine | Sprint 5 | Not yet deprecated |
| `aios/intelligence/decision/risk.py` | EOS decision engine | Sprint 5 | Not yet deprecated |
| `aios/intelligence/decision/scorer.py` | EOS decision engine | Sprint 5 | Not yet deprecated |
| `aios/intelligence/decision/strategy.py` | EOS decision engine | Sprint 5 | Not yet deprecated |
| `aios/state/engine.py` | EOS PersistenceStore | Sprint 5 | Not yet deprecated |
| `aios/state/validator.py` | EOS PersistenceStore | Sprint 5 | Not yet deprecated |
| `aios/recovery/engine.py` | EOS PersistenceStore | Sprint 5 | Not yet deprecated |
| `aios/reporting/` (12 files) | EOS observability | Sprint 5 | Not yet deprecated |
| `aios/context/builder.py` | `eos/context_builder.py` | Sprint 5 | Not yet deprecated |
| `aios/memory/store.py` | `memory/memory_store.py` | Sprint 5 | Not yet deprecated |
| `aios/memory/compressor.py` | `memory/consolidation.py` | Sprint 5 | Not yet deprecated |
| `aios/memory/index.py` | `memory/retrieval.py` | Sprint 5 | Not yet deprecated |
| `aios/memory/search.py` | `memory/retrieval.py` | Sprint 5 | Not yet deprecated |
| `aios/memory/knowledge.py` | `semantic_memory.py` | Sprint 5 | Not yet deprecated |
| `aios/memory/snapshot.py` | MemoryManager snapshot API | Sprint 5 | Not yet deprecated |

#### DEPRECATED (7 files) — Warning issued, scheduled for removal

| Module | Deprecation Added | Removal Target | Replacement |
|--------|------------------|----------------|-------------|
| `aios/events/__init__.py` | Sprint 1 (v1.2) | v1.3 | `aios.eos.event_bus` |
| `aios/events/bus.py` | Sprint 1 (v1.2) | v1.3 | `aios.eos.event_bus` |
| `aios/events/types.py` | Sprint 1 (v1.2) | v1.3 | `aios.eos.*` RuntimeEvent |
| `aios/events/store.py` | Sprint 1 (v1.2) | v1.3 | `aios.eos.persistence` |
| `aios/orchestrator.py` | Sprint 1 (v1.2) | v1.3 | `aios.eos.runtime_engine` |
| `aios/memory/engine.py` | Sprint 1 (v1.2) | v1.3 | `aios.memory.memory_manager` |

#### ARCHIVE (3 files) — Dead code, never imported

| Module | Rationale | Action |
|--------|-----------|--------|
| `aios/events/adapter.py` | LegacyEventAdapter created in Sprint 1 but never imported. Bridge no longer needed — CLI commands refactored directly to EOS. | Remove immediately |
| `aios/doctor/diagnostics.py` | DiagnosticsEngine never imported. CLI doctor uses reporting/health_reporter instead. | Remove in Sprint 5 |
| `aios/healing/` (2 files) | RepairEngine never imported by any consumer. | Remove in Sprint 5 |

#### EXPERIMENTAL (1 file)

| Module | Rationale | Action |
|--------|-----------|--------|
| `aios/doctor/__init__.py` | Exists but only exports dead diagnostics module. | Remove alongside diagnostics.py |

---

## Phase 3 — Canonical Interface Specification

### 3.1 RuntimeEngine (`aios/eos/runtime_engine.py`)

**Purpose**: State-machine-driven workflow execution. Replaces `orchestrator.py` and `executor/engine.py`.

**Responsibilities**:
- Execute compiled workflows produced by WorkflowEngine
- Manage execution state machine (NOT_STARTED → QUEUED → RUNNING → COMPLETED / FAILED / ROLLED_BACK / CANCELLED)
- Handle retry policies, rollback plans, and cancellation tokens
- Emit RuntimeEvents for every state transition
- Maintain execution history and statistics

**Lifecycle**:
```
__init__() → initialize(workflow_engine) → bind_event_bus(event_bus)
  → execute(workflow) → [run, pause, resume, cancel] → shutdown()
```

**Thread safety**: Full — `threading.Lock()` on all mutable state.

**Error model**: `RuntimeEngineError` for initialization failures. State transition errors raised immediately. Execution failures captured as failed step state (not exceptions).

**Public API**:
- `initialize(workflow_engine) -> Self`
- `bind_event_bus(event_bus) -> None`
- `execute(workflow, context) -> str` (execution_id)
- `get_execution(execution_id) -> RuntimeExecution`
- `cancel(execution_id) -> bool`
- `pause(execution_id) -> bool`
- `resume(execution_id) -> bool`
- `validate() -> RuntimeValidationResult`
- `statistics() -> RuntimeStatistics`
- `health() -> HealthStatus`
- `reload() -> Self`
- `shutdown() -> None`

**Extension points**: `RetryPolicy` configuration, `CancellationToken`, custom `RuntimeContext`.

### 3.2 WorkflowEngine (`aios/eos/workflow_engine.py`)

**Purpose**: Convert ExecutionPlan into executable DAG workflows. Topological sort with dependency resolution.

**Responsibilities**:
- Accept ExecutionPlan from DecisionEngine
- Compile into Workflow (ordered WorkflowSteps with dependency edges)
- Validate workflow integrity (no orphaned steps, no cycles)
- Cache compiled workflows
- Support sequential, parallel, and mixed execution modes

**Lifecycle**:
```
__init__() → initialize(decision_engine) → build_workflow(plan) → health() → shutdown()
```

**Thread safety**: Full — `threading.Lock()` on cache and counters.

**Public API**:
- `initialize(decision_engine) -> Self`
- `build_workflow(plan) -> Workflow`
- `get_workflow(workflow_id) -> Workflow | None`
- `validate(workflow) -> WorkflowValidationResult`
- `health() -> HealthStatus`
- `statistics() -> WorkflowStatistics`
- `reload() -> Self`
- `shutdown() -> None`

### 3.3 MemoryManager (`aios/memory/memory_manager.py`)

**Purpose**: Unified memory with three tiers. Replaces `memory/engine.py`.

**Responsibilities**:
- Working, Episodic, and Semantic memory management
- Keyword, hybrid, and semantic retrieval
- TTL-based expiry and consolidation
- Deduplication
- Cross-tier statistics

**Lifecycle**:
```
__init__(backend, embedding_provider, ...) → initialize() → store()/retrieve() → consolidate_all() → shutdown()
```

**Thread safety**: Full — `threading.Lock()`.

**Gaps to close (Sprint 3)**:
- Add `snapshot() -> dict` (full state dump)
- Add `list_snapshots() -> list[SnapshotMeta]`
- Add `restore(snapshot_id) -> bool`
- Add `compress(target_ratio) -> int`
- Add `prune(max_age_days) -> int`

**Public API** (target):
- `initialize() -> Self`
- `store(content, execution_id, type, importance, metadata) -> WorkingMemoryEntry`
- `retrieve(query, memory_types, limit) -> list[RetrievalResult]`
- `hybrid_retrieve(query, memory_types, top_k) -> list[RetrievalResult]`
- `similarity_retrieve(query, memory_types, top_k) -> list[RetrievalResult]`
- `forget(memory_type, entry_id) -> bool`
- `consolidate_all() -> ConsolidationResult`
- `snapshot() -> dict`
- `list_snapshots() -> list[dict]`
- `restore(snapshot_id) -> bool`
- `compress(target_ratio) -> int`
- `prune(max_age_days) -> int`
- `statistics() -> MemoryStatistics`
- `validate() -> MemoryValidationResult`
- `health() -> HealthStatus`
- `reload() -> Self`
- `shutdown() -> None`

### 3.4 EventBus (`aios/eos/event_bus.py`)

**Purpose**: Thread-safe priority pub/sub for all runtime events. Replaces `events/bus.py`.

**Responsibilities**:
- Publish RuntimeEvents with priority ordering
- Sync + async dispatch modes
- Bounded event history
- Subscriber lifecycle management
- Error isolation (handler failures don't propagate)

**Lifecycle**:
```
__init__(max_history) → initialize(runtime_engine) → subscribe()/publish() → shutdown()
```

**Thread safety**: Full — `threading.Lock()`.

**Public API**:
- `initialize(runtime_engine) -> Self`
- `subscribe(callback, event_types, priority) -> str` (subscription_id)
- `unsubscribe(subscription_id) -> bool`
- `unsubscribe_all() -> int`
- `publish(runtime_event, priority) -> str`
- `publish_async(runtime_event, priority, done) -> str`
- `history() -> EventHistory`
- `statistics() -> EventStatistics`
- `validate() -> EventValidationResult`
- `health() -> HealthStatus`
- `reload() -> Self`
- `shutdown() -> None`

### 3.5 ContextBuilder (`aios/eos/context_builder.py`)

**Purpose**: Assemble execution context from capabilities, knowledge, and conversation state.

**Responsibilities**:
- Query CapabilityDiscovery for relevant capabilities
- Query KnowledgeService for relevant documents
- Build ExecutionContext with mode, profiles, and assembled data
- Estimate token usage

**Lifecycle**:
```
__init__() → initialize(capability_discovery, knowledge_service) → build_context(mode) → shutdown()
```

### 3.6 DecisionEngine (`aios/eos/decision_engine.py`)

**Purpose**: Plan execution strategies with confidence scoring and reasoning traces.

**Responsibilities**:
- Accept context from ContextBuilder
- Generate ExecutionPlan with ranked actions
- Select optimal execution strategy
- Produce reasoning traces for explainability

**Lifecycle**:
```
__init__() → initialize(context_builder) → decide(context) / plan(context) → shutdown()
```

### 3.7 PersistenceStore (`aios/eos/persistence.py`)

**Purpose**: SQLite-backed persistence for execution history, checkpoints, and reports.

**Responsibilities**:
- Store execution records, step results, and reports
- CRUD operations on 5 SQLite tables
- Checkpoint creation and restoration
- Query execution history

**Lifecycle**:
```
__init__(db_path) → initialize() → store_execution()/get_execution() → shutdown()
```

### 3.8 Manager Interface Contract

Every manager module MUST implement:

```python
class ManagerProtocol(Protocol):
    @property
    def is_initialized(self) -> bool: ...
    
    def initialize(self, **deps) -> Self: ...
    def validate(self) -> ValidationResult: ...
    def statistics(self) -> Statistics: ...
    def health(self) -> HealthStatus: ...
    def reload(self) -> Self: ...
    def shutdown(self) -> None: ...
```

Where:
- `ValidationResult`: list of warnings/errors, is_valid flag
- `Statistics`: typed dataclass with module-specific metrics
- `HealthStatus`: from `aios.eos.types`

---

## Phase 4 — CLI Modernization

### 4.1 Command Migration Table

| Current Command | Current Implementation | Future EOS Implementation | Effort | Backward Compat |
|----------------|----------------------|--------------------------|--------|-----------------|
| `aios scan` | `plugins/scanner/plugin.py` → ScannerPlugin | Same (already shared) — no change needed | 0d | Full |
| `aios index` | `plugins/indexer/plugin.py` → IndexerPlugin | Same (already shared) — no change needed | 0d | Full |
| `aios state` | `state/engine.py` → StateEngine | `eos/persistence.py` → PersistenceStore | 1d | Full (output format) |
| `aios context` | `context/builder.py` → ContextBuilder | `eos/context_builder.py` → EOSContextBuilder | 0.5d | Full |
| `aios checkpoint` | `recovery/engine.py` → RecoveryEngine | `eos/persistence.py` → PersistenceStore | 1d | Full |
| `aios run` | `orchestrator.py` → Orchestrator | `eos/runtime_engine.py` → RuntimeEngine | 3d | Full (output format) |
| `aios execute` | `executor/engine.py` → Executor | `eos/runtime_engine.py` → RuntimeEngine | 1d | Full |
| `aios report` | `reporting/generator.py` → ReportGenerator | `eos/observability.py` → ObservabilityConsumer | 1d | Full |
| `aios metrics` | `reporting/generator.py` → ReportGenerator | `eos/observability.py` → ObservabilityConsumer | 0.5d | Full |
| `aios memory` | `memory/engine.py` → MemoryEngine | `memory/memory_manager.py` → MemoryManager | 0.5d | Full (once gap methods added) |
| `aios decision` | `intelligence/decision/engine.py` → DecisionEngine | `eos/decision_engine.py` → EOSDecisionEngine | 0.5d | Full |
| `aios validate` | `state/validator.py` → StateValidator | EOS validation chain | 1d | Full |
| `aios health` | `reporting/generator.py` → ReportGenerator | `eos.observability.health()` | 0.5d | Full |
| `aios doctor` | `reporting/health_reporter.py` | EOS health chain (or remove — prototype) | 0.5d | Full |
| `aios recover` | `memory/engine.py` + `memory/snapshot.py` | `MemoryManager` snapshot API | 1d | Full |
| `aios chat` | `llm/manager.py` → LLMManager | Same (already shared) — no change needed | 0d | Full |
| `aios workflow` | `multiagent/coordinator.py` | Same (already shared) | 0d | Full |
| `aios tools` | `tools/manager.py` → ToolManager | Same (already shared) | 0d | Full |
| `aios plugins` | `plugins/manager.py` → PluginManager | Same (already shared) | 0d | Full |
| `aios agent` | `agent/agent_manager.py` → AgentManager | Same (already shared) | 0d | Full |
| `aios config` | `core/config.py` → AIOSConfig | Same (already shared) | 0d | Full |

**Total CLI migration effort**: ~13 engineering-days (cumulative, parallelizable)

### 4.2 Migration Strategy

1. **Sprint 3** (4d): Migrate `run`, `execute`, `decision`, `validate`, `health`, `doctor`
2. **Sprint 4** (3d): Migrate `state`, `context`, `checkpoint`, `memory`, `recover`
3. **Sprint 4** (1d): Migrate `report`, `metrics`
4. **No change**: `scan`, `index`, `chat`, `workflow`, `tools`, `plugins`, `agent`, `config`

### 4.3 Backward Compatibility

- All CLI commands preserve their output format (JSON, text, verbose)
- All CLI flags preserved identically
- Deprecation warnings shown only for legacy module imports (addressed by refactoring)
- No command names change

---

## Phase 5 — Event Migration Blueprint

### 5.1 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Legacy Consumers                          │
│  (orchestrator.py — removed in Sprint 5)                      │
│  (test_aios_runtime.py — migrated in Sprint 4)               │
└──────────┬───────────────────────────────────────────────────┘
           │  (removed in Sprint 5 — no adapter needed)
           │
┌──────────▼───────────────────────────────────────────────────┐
│               EOS EventBus (aios/eos/event_bus.py)            │
│                                                                  │
│  EventPriority: LOW, NORMAL, HIGH, CRITICAL                    │
│  DispatchMode: SYNC, ASYNC                                     │
│  History: EventHistory (bounded deque, configurable max)        │
│  Validation: _validate_event() on every publish                │
│  Statistics: EventStatistics (total, sync, async, failed, ...)  │
│  Health: error_rate < 5% threshold                              │
│  Subscriptions: EventSubscription with is_active flag           │
│  Thread safety: threading.Lock() on all mutation                │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Event Type Mapping

| Legacy EventType | EOS RuntimeEventType | Migration |
|-----------------|---------------------|-----------|
| EXECUTION_STARTED | EXECUTION_STARTED | Direct 1:1 |
| EXECUTION_COMPLETED | EXECUTION_COMPLETED | Direct 1:1 |
| EXECUTION_FAILED | EXECUTION_FAILED | Direct 1:1 |
| SESSION_STARTED | EXECUTION_STARTED | Map to equivalent |
| SESSION_COMPLETED | EXECUTION_COMPLETED | Map to equivalent |
| ORCHESTRATION_STARTED | EXECUTION_CREATED | Map — begin execution |
| ORCHESTRATION_COMPLETED | EXECUTION_COMPLETED | Map — end execution |
| DECISION_MADE | (no equivalent) | Replace: EOSDecisionEngine emits events via publish |
| MEMORY_STORED | (no equivalent) | Replace: MemoryManager has no event — remove |
| MEMORY_COMPRESSED | (no equivalent) | Replace: removed |
| REPORT_GENERATED | (no equivalent) | Replace: ObservabilityConsumer shows metrics |
| METRICS_COLLECTED | (no equivalent) | Replace: ObservabilityConsumer shows metrics |
| CHECKPOINT_CREATED | (no equivalent) | Replace: PersistenceStore operation |
| CHECKPOINT_RESTORED | (no equivalent) | Replace: PersistenceStore operation |
| REPOSITORY_SCANNED | (add as new event) | Add to RuntimeEventType enum |
| INDEX_UPDATED | (add as new event) | Add to RuntimeEventType enum |
| STATE_UPDATED | (remove) | Replace with PersistenceStore writes |
| CONFIG_CHANGED | (add if needed) | Deferred |
| CACHE_UPDATED | (remove) | Internal detail, not needed |
| VALIDATION_COMPLETE | (remove) | Replacement: validate() return value |
| PLUGIN_FAILED | (add as new event) | PluginManager emits directly |

### 5.3 Deprecation Schedule

| Release | Event |
|---------|-------|
| v1.2.0-rc1 | All legacy event types deprecated. EOS RuntimeEventType extended with REPOSITORY_SCANNED, INDEX_UPDATED, PLUGIN_FAILED |
| v1.2.0 | Legacy EventBus issues DeprecationWarning. All new code must use EOS EventBus. |
| v1.3.0 | Legacy EventBus removed. All event types migrated to RuntimeEventType. |

### 5.4 Performance Expectations

| Metric | Legacy EventBus | EOS EventBus | Expected After Migration |
|--------|----------------|-------------|-------------------------|
| Dispatch latency | Untested | Benchmarked (<5ms) | Same (no regression) |
| Throughput | Single-threaded | Thread-safe | Higher (async + parallel dispatch) |
| History capacity | Unlimited (memory leak) | Bounded (configurable) | Bounded by config |
| Concurrent subscribers | Not supported | Thread-safe | Safe |

### 5.5 Failure Handling

- Handler exceptions are logged and counted in `_failed_dispatches`
- Error rate < 5% → healthy; ≥ 5% → degraded
- Failed dispatches do NOT prevent other handlers from running
- Individual subscriber failure is isolated

### 5.6 Ordering Guarantees

- Subscribers with the same priority receive events in registration order
- HIGH priority subscribers always process before NORMAL before LOW
- Async dispatch is best-effort ordering (thread scheduling dependent)

### 5.7 Threading

- All mutations protected by `threading.Lock()`
- Async dispatch runs in `threading.Thread(daemon=True)`
- No thread pool (each async publish spawns a thread — acceptable for event volume)
- Shutdown cancels pending async tasks

---

## Phase 6 — Memory Migration Blueprint

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       MemoryManager                                  │
│  aios/memory/memory_manager.py (191 lines → ~250 after gaps)        │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ WorkingMemory│  │EpisodicMemory│  │SemanticMemory│               │
│  │ (TTL-backed) │  │(event-based) │  │(knowledge)   │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│         └─────────────────┼─────────────────┘                        │
│                           │                                          │
│                    ┌──────▼──────┐                                   │
│                    │RetrievalEngine│                                 │
│                    │ keyword      │                                  │
│                    │ hybrid       │                                  │
│                    │ similarity   │                                  │
│                    └──────┬──────┘                                   │
│                           │                                          │
│                    ┌──────▼──────┐                                   │
│                    │Consolidation│                                   │
│                    │Engine       │                                   │
│                    │ TTL expiry  │                                   │
│                    │ dedup       │                                   │
│                    └──────┬──────┘                                   │
│                           │                                          │
│                    ┌──────▼──────┐                                   │
│                    │MemoryStore  │                                   │
│                    │Backend      │                                   │
│                    │ (in-memory) │                                   │
│                    └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Memory Abstraction

| Abstraction | Implementation | Status |
|-------------|---------------|--------|
| `WorkingMemory` | `aios/memory/working_memory.py` | Canonical |
| `EpisodicMemory` | `aios/memory/episodic_memory.py` | Canonical |
| `SemanticMemory` | `aios/memory/semantic_memory.py` | Canonical |
| `RetrievalEngine` | `aios/memory/retrieval.py` | Canonical |
| `ConsolidationEngine` | `aios/memory/consolidation.py` | Canonical |
| `MemoryStoreBackend` | `aios/memory/memory_store.py` | Canonical |
| `EmbeddingProvider` | `aios/memory/embeddings.py` | Canonical |

### 6.3 Gaps to Close (Sprint 3, ~3d)

| Gap | Current State | Target | Effort |
|-----|--------------|--------|--------|
| `snapshot()` | Not in MemoryManager | Return full state dict | 0.5d |
| `list_snapshots()` | Not in MemoryManager | List all saved snapshots | 0.5d |
| `restore(snapshot_id)` | Not in MemoryManager | Restore from snapshot | 0.5d |
| `compress(target_ratio)` | Not in MemoryManager | ConsolidationEngine needs target-ratio mode | 1d |
| `prune(max_age_days)` | Not in MemoryManager | Age-based pruning in ConsolidationEngine | 0.5d |

### 6.4 Compatibility Layer

No adapter needed. The CLI `memory` and `recover` commands will be directly refactored in Sprint 4 to use `MemoryManager` instead of `MemoryEngine`. Both implement similar operations — the gap methods listed above ensure full API parity.

### 6.5 Migration Sequence

| Step | Sprint | Effort | Description |
|------|--------|--------|-------------|
| 1 | 3 | 3d | Add gap methods (snapshot, list_snapshots, restore, compress, prune) to MemoryManager + ConsolidationEngine |
| 2 | 4 | 1d | Refactor CLI `memory` command to import MemoryManager instead of MemoryEngine |
| 3 | 4 | 1d | Refactor CLI `recover` command to use MemoryManager snapshot API |
| 4 | 4 | 0.5d | Add deprecation warning to memory/engine.py (done in Sprint 1) |
| 5 | 5 | 0.5d | Remove memory/engine.py, memory/compressor.py (if unused), memory/index.py, memory/search.py, memory/knowledge.py, memory/store.py, memory/snapshot.py |

---

## Phase 7 — Configuration Strategy

### 7.1 Decision: Should ConfigManager replace core/config.py?

**No — `core/config.py` remains canonical.**

### 7.2 Rationale

| Factor | `core/config.py` | `config/manager.py` |
|--------|-----------------|---------------------|
| **Production usage** | 26 files (100%) | 0 files (0%) |
| **Lines of code** | 208 | 382 + 6 submodules (~1200 total) |
| **Dependencies** | core.exceptions + yaml (optional) | 6 submodules + tomli + yaml |
| **Schema** | Typed dataclass (compile-time safety) | Optional schema (runtime validation) |
| **Integration surface** | One import, one call (`load_config(path)`) | 3-step init (loader + merger + env) |
| **Migration cost** | 0 (it's already canonical) | 5d to migrate 26 consumers |

### 7.3 Advantages & Disadvantages

#### Keep `core/config.py` (Recommended)

**Advantages**:
- Zero migration cost — all 26 consumers already use it
- Typed dataclass provides compile-time safety
- Simple, predictable, well-understood
- 208 lines vs 1200+ for config/manager.py

**Disadvantages**:
- No secrets management (secrets handled separately in security/manager.py)
- No TOML support (JSON + YAML only)
- No config reload at runtime
- No env var priority chain (simple file→env)

#### Replace with `config/manager.py`

**Advantages**:
- Secrets management built-in
- TOML + .env support
- Multi-format loading
- Documented priority chain

**Disadvantages**:
- 5d migration to update 26 consumers
- Runtime validation (no compile-time type safety)
- 6 additional submodules to maintain
- Zero production usage — untested integration path

### 7.4 Risk Assessment

| Risk | Keep core/config.py | Replace with config/manager.py |
|------|-------------------|-------------------------------|
| Production breakage | None (unchanged) | High (26 consumers change) |
| Developer friction | None | Medium (new API to learn) |
| Feature gap | Low (secrets in security/) | None (all features present) |
| Maintenance burden | Low (208 lines) | Medium (1200+ lines) |

### 7.5 Recommendation

**Keep `core/config.py` as canonical for v1.2.** Defer `config/manager.py` integration to v1.3+ with these conditions:
1. A formal RFC defines the migration
2. An adapter layer provides backward compatibility during the transition
3. All 26 consumers are updated in a single sprint
4. The typed dataclass pattern is preserved (config/manager.py gains typed accessors)

---

## Phase 8 — Manager Integration

### 8.1 Formal Initialization Order

The current `api/stack.py:create_stack()` initializes modules in a hardcoded chain. The target state formalizes this with proper error propagation.

```
┌──────────────────────────────────────────────────────────────┐
│                    EOSStack.initialize()                       │
│                                                                │
│  Step  │ Module                │ Depends On                   │
│  ───── │ ───────────────────── │ ──────────────────────────── │
│  1     │ EOSLoader             │ config                       │
│  2     │ RegistryManager       │ EOSLoader                    │
│  3     │ CapabilityDiscovery   │ RegistryManager              │
│  4     │ KnowledgeService      │ RegistryManager + Loader      │
│  5     │ EOSContextBuilder     │ CapabilityDiscovery + Know.   │
│  6     │ EOSDecisionEngine     │ ContextBuilder               │
│  7     │ WorkflowEngine        │ DecisionEngine               │
│  8     │ RuntimeEngine         │ WorkflowEngine               │
│  9     │ EventBus              │ RuntimeEngine                │
│  10    │ ObservabilityConsumer │ EventBus                     │
│  11    │ PersistenceStore      │ (none — file-based)           │
│  12    │ ToolRegistry          │ (none)                       │
│  13    │ AgentExecutor         │ WorkflowEngine + ToolRegistry │
│  ────  │ ───────────────────── │ ──────────────────────────── │
│  14    │ MemoryManager         │ core config                   │
│  15    │ LLMManager            │ core config                   │
│  16    │ EmbeddingManager      │ core config                   │
│  17    │ VectorStoreManager    │ core config                   │
│  18    │ ToolManager           │ core config                   │
│  19    │ PluginManager         │ core config                   │
│  20    │ RAGManager            │ core config                   │
│  21    │ SecurityManager       │ core config                   │
│  22    │ Scheduler             │ core config                   │
│  23    │ MultiAgentCoordinator │ core config                   │
│  24    │ AgentManager          │ core config                   │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 Initialization Error Handling

```
for step in init_plan:
    try:
        step.module.initialize(**step.deps)
    except Exception as e:
        # Log with full context
        logger.error(f"Failed to initialize {step.name}: {e}")
        # Shutdown already-initialized modules in reverse order
        for prev in reversed(init_plan[:i]):
            try:
                prev.module.shutdown()
            except Exception as cleanup_e:
                logger.error(f"Cleanup failed for {prev.name}: {cleanup_e}")
        # Re-raise with aggregate error
        raise EOSStackError(f"Stack initialization failed at {step.name}: {e}")
```

### 8.3 Failure Handling Per Manager

| Manager | Failure Mode | Default State | Graceful Degradation |
|---------|-------------|---------------|---------------------|
| MemoryManager | Backend unavailable | Ephemeral in-memory | API returns 503 for memory endpoints |
| LLMManager | No providers configured | No LLM capability | Chat commands return "no LLM configured" |
| EmbeddingManager | No providers | No embeddings | Similarity retrieval degrades to keyword-only |
| VectorStoreManager | No providers | No vector store | Hybrid search degrades to keyword-only |
| ToolManager | No providers | No tools | Tool commands return "no tools available" |
| PluginManager | Loader fails | No plugins | Plugin commands return "no plugins" |
| RAGManager | Chunker fails | No RAG | RAG endpoints return 503 |
| SecurityManager | Encryption init fails | No encryption | Security endpoints return 503 |
| Scheduler | Queue init fails | No scheduling | Scheduling commands return 503 |
| MultiAgentCoordinator | Bus init fails | No multi-agent | Workflow commands return 503 |
| AgentManager | Registry init fails | No agents | Agent commands return 503 |

### 8.4 Shutdown Protocol

```
1. Stop accepting new work (set draining flag)
2. Signal running operations to complete (cancellation tokens)
3. Wait for in-flight operations (configurable timeout, default 30s)
4. Call shutdown() on each module in reverse initialization order
5. Close external connections (DB, network, file handles)
6. Log completion
```

### 8.5 Health Monitoring

```
EOSStack.get_health() -> dict[str, HealthStatus]
    foreach module in stack:
        try:
            status[module.name] = module.health()
        except Exception as e:
            status[module.name] = HealthStatus(
                healthy=False, status="error",
                message=f"health() call failed: {e}"
            )
    overall = all(s.healthy for s in status.values())
    return {"overall": overall, "modules": status}
```

### 8.6 Statistics Aggregation

```
EOSStack.get_statistics() -> dict[str, Statistics]
    foreach module that implements statistics():
        result[name] = module.statistics()
```

---

## Phase 9 — Dependency Cleanup

### 9.1 Dependency Policy

#### Rule 1: No Circular Dependencies
- The import graph MUST be a DAG (Directed Acyclic Graph)
- CI enforces this via `pytest-arch` or `import-linter`
- Current violations (all resolved in Sprint 1):
  - `event_bus.py` ↔ `runtime_engine.py` (resolved via types.py)
  - `observability.py` ↔ `event_bus.py` ↔ `runtime_engine.py` → `workflow_engine.py` (resolved via types.py)

#### Rule 2: Layer Boundaries

```
core/       → nothing in aios.*
utils/      → core/ only
eos/types/  → core/ + eos/runtime_engine.py (for RuntimeEventType, under TYPE_CHECKING)
eos/        → core/, eos/types/, eos/ (siblings only)
managers/   → core/, eos/types/ only (NOT eos/ modules)
api/        → core/, eos/, managers/*
cli/        → core/, eos/, managers/*, api/
```

#### Rule 3: Allowed Imports

| Source Layer | Can Import |
|-------------|-----------|
| `core/` | stdlib, third-party |
| `utils/` | `core/`, stdlib |
| `eos/` | `core/`, `eos/types`, `eos/` (sibling, no cycles), stdlib |
| `memory/` | `core/`, `memory/` (internal), stdlib |
| `llm/` | `core/`, `llm/` (internal), stdlib |
| `tools/` | `core/`, `tools/` (internal), stdlib |
| `security/` | `core/`, `security/` (internal), stdlib |
| `plugins/` | `core/`, `plugins/` (internal), stdlib |
| `scheduler/` | `core/`, `scheduler/` (internal), stdlib |
| `embedding/` | `core/`, `embedding/` (internal), stdlib |
| `vectorstore/` | `core/`, `vectorstore/` (internal), stdlib |
| `rag/` | `core/`, `rag/` (internal), stdlib |
| `multiagent/` | `core/`, `multiagent/` (internal), stdlib |
| `observability/` | `core/`, `observability/` (internal), stdlib |
| `api/` | `core/`, `eos/`, `api/` (internal), any manager, stdlib |
| `cli/` | `core/`, `eos/`, `cli/` (internal), any manager, `api/`, stdlib |

#### Rule 4: Forbidden Imports

| Forbidden Pattern | Reason | Enforcement |
|------------------|--------|-------------|
| `eos/` importing any manager (`llm/`, `tools/`, etc.) | Managers provide services TO EOS; EOS should not depend on concrete managers | CI lint rule |
| Manager importing another manager | Managers must be independent; inject dependencies through EOSStack | CI lint rule |
| Any module importing `orchestrator.py` | Legacy — must use `RuntimeEngine` | CI lint rule (after Sprint 5) |
| Any module importing `events/bus.py` | Legacy — must use `eos/event_bus.py` | CI lint rule (after Sprint 5) |
| Any module importing `memory/engine.py` | Legacy — must use `memory/memory_manager.py` | CI lint rule (after Sprint 5) |

### 9.2 Static Analysis

```toml
# pyproject.toml
[tool.pylint."MESSAGES CONTROL"]
disable = []
enable = ["cyclic-import"]

[tool.import-linter]
root_packages = ["aios"]
extension_packages = []

[[tool.import-linter.containers]]
name = "eos_layer"
type = "package"
paths = ["aios/eos/"]

[[tool.import-linter.containers]]
name = "manager_layer"
type = "package"
paths = [
    "aios/memory/",
    "aios/llm/",
    "aios/tools/",
    "aios/plugins/",
    "aios/scheduler/",
    "aios/security/",
    "aios/embedding/",
    "aios/vectorstore/",
    "aios/rag/",
    "aios/multiagent/",
    "aios/observability/",
]

[[tool.import-linter.forbidden_imports]]
containers = ["eos_layer"]
forbidden_imports = ["manager_layer"]

[[tool.import-linter.forbidden_imports]]
containers = ["manager_layer"]
forbidden_imports = [
    "aios.eos",
    "aios.orchestrator",
    "aios.events.bus",
    "aios.memory.engine",
]
```

---

## Phase 10 — Package Reorganization

### 10.1 Current Structure

```
src/aios/
├── __init__.py
├── agent/              # Shared — agent scaffolding
├── api/                # Shared — FastAPI + routes + stack
├── cli/                # Shared — typer commands (some legacy-backed)
├── config/             # Unused — deferred
├── context/            # Legacy — separate from EOS context_builder
├── core/               # Shared — config, exceptions, logger, types
├── doctor/             # Archive — dead code
├── embedding/          # Shared — providers
├── eos/                # Canonical — target architecture
├── events/             # Deprecated — replaced by eos/event_bus
├── executor/           # Legacy — replaced by eos/runtime_engine
├── healing/            # Archive — dead code
├── intelligence/       # Legacy — replaced by eos/decision_engine
├── llm/                # Shared — providers
├── memory/             # Shared + Legacy — some canonical, some deprecated
├── multiagent/         # Shared — coordinator
├── observability/      # Shared — observability manager
├── plugins/            # Shared — plugin lifecycle + scanner/indexer
├── rag/                # Shared — RAG pipeline
├── recovery/           # Legacy — replaced by PersistenceStore
├── reporting/          # Legacy — replaced by EOS observability
├── repository/         # Shared — file scanning/walking
├── scheduler/          # Shared — task queue
├── security/           # Shared — encryption, tokens, permissions
├── state/              # Legacy — replaced by PersistenceStore
├── tools/              # Shared — providers
├── utils/              # Shared — serialization
└── vectorstore/        # Shared — providers
```

### 10.2 Target Structure

```
src/aios/
├── __init__.py
├── core/               # Unchanged — config, exceptions, logger, types
├── utils/              # Unchanged — serialization
├── repository/         # Unchanged — file scanning/walking
├── eos/                # Canonical execution engine (UNCHANGED)
│   ├── __init__.py
│   ├── event_bus.py
│   ├── runtime_engine.py
│   ├── workflow_engine.py
│   ├── decision_engine.py
│   ├── context_builder.py
│   ├── capability_discovery.py
│   ├── knowledge_service.py
│   ├── persistence.py
│   ├── observability.py
│   ├── loader.py
│   ├── registry.py
│   ├── agent_integration.py
│   └── types.py
├── api/                # Unchanged structure, formal init in stack.py
│   ├── __init__.py
│   ├── app.py
│   ├── stack.py        # FORMALIZED — no try/except:pass
│   ├── routes.py
│   └── 14 route files + websocket + auth + rate_limiter
├── cli/                # Unchanged structure, all commands use EOS
│   ├── __init__.py
│   ├── app.py
│   └── commands/       # 21 files — all refactored to EOS APIs
├── memory/             # Canonical only — deprecated files removed
│   ├── __init__.py
│   ├── memory_manager.py    # Canonical
│   ├── working_memory.py    # Canonical
│   ├── episodic_memory.py   # Canonical
│   ├── semantic_memory.py   # Canonical
│   ├── retrieval.py         # Canonical
│   ├── consolidation.py     # Canonical
│   ├── memory_store.py      # Canonical
│   ├── embeddings.py        # Canonical
│   └── models.py            # Canonical
├── llm/                # Unchanged
├── tools/              # Unchanged
├── plugins/            # Unchanged
├── scheduler/          # Unchanged
├── security/           # Unchanged
├── embedding/          # Unchanged
├── vectorstore/        # Unchanged
├── rag/               # Unchanged
├── observability/      # Unchanged
├── multiagent/         # Unchanged
├── agent/              # Unchanged (scaffolding)
├── config/             # Unchanged (deferred to v1.3+)
└── (removed)
    ├── orchestrator.py     → REMOVED
    ├── events/              → REMOVED
    ├── executor/            → REMOVED
    ├── intelligence/        → REMOVED
    ├── state/               → REMOVED
    ├── recovery/            → REMOVED
    ├── reporting/           → REMOVED
    ├── context/             → REMOVED
    ├── doctor/              → REMOVED
    └── healing/             → REMOVED
```

### 10.3 Migration Path

| Sprint | Removed | Added/Changed |
|--------|---------|---------------|
| 1 | (none) | `eos/types.py` — extracted types. `events/adapter.py` — bridge (later archived). Deprecation warnings. |
| 2 | (none) | `api/stack.py` — formal init. CLI commands — migrated to EOS. |
| 3 | (none) | MemoryManager gap methods. CLI `run` → RuntimeEngine. |
| 4 | (none) | CLI `state/context/checkpoint/memory/recover/report/metrics` → EOS. Tests migrated. |
| 5 | `orchestrator.py`, `events/`, `executor/`, `intelligence/`, `state/`, `recovery/`, `reporting/`, `context/`, `doctor/`, `healing/`, `events/adapter.py` | Remove all legacy + archive modules |
| 6 | (none) | Final cleanup, lint rules, documentation |

---

## Phase 11 — Release Engineering

### 11.1 Versioning

```
v1.2.0-rc1  — Sprint 2 end    — Formal init, CLI commands migrated, deprecation warnings active
v1.2.0-rc2  — Sprint 4 end    — All CLI commands on EOS, all tests passing, no legacy imports in CLI
v1.2.0      — Sprint 5 end    — Legacy modules removed, full convergence complete
v1.2.1      — Sprint 6 end    — Bug fixes, documentation, CI polish
v1.3.0      — Future           — ConfigManager integration (if approved), new features
```

### 11.2 Deprecation Policy

| Phase | Warning Type | Behavior |
|-------|-------------|----------|
| v1.2.0-rc1 | `DeprecationWarning` | Shown on import/instantiation of legacy modules |
| v1.2.0-rc2 | `PendingDeprecationWarning` | Upgraded — warns of imminent removal |
| v1.2.0 | `ImportError` on direct import | Legacy modules physically removed |

Legacy modules in v1.2.0-rc1/rc2:
- Can still be imported and used
- Show warning once per Python process (`warnings.simplefilter("once", DeprecationWarning)`)
- Documentation points to replacement API

### 11.3 Feature Flags

Not required for this migration. CLI commands are being refactored in-place with identical output formats. If rollback is needed, the old `cli/commands/*.py` can be restored from git.

For future feature development, use `aios.core.config.AIOSConfig.feature_flags: dict[str, bool]`.

### 11.4 Compatibility Guarantees

| Surface | Guarantee |
|---------|-----------|
| CLI command names | No changes |
| CLI output formats | Preserved (JSON keys, text structure) |
| CLI flags | No changes |
| HTTP API endpoints | No changes |
| HTTP API response shapes | No changes |
| WebSocket message formats | No changes |
| Python public API (eos.*) | No breaking changes within v1.x |

### 11.5 LTS Strategy

- v1.2.x receives bug fixes for 6 months after v1.3.0 release
- Legacy module removal only occurs at major version boundaries
- Critical security fixes backported to latest v1.x release

### 11.6 Rollback Policy

Each migration sprint produces a git tag. Rollback = `git checkout <pre-sprint-tag>`.

| Sprint | Tag | Rollback Impact |
|--------|-----|----------------|
| 1 | `v1.1.0-baseline` | Full rollback to pre-migration state |
| 2 | `v1.2.0-rc1-rollback` | Revert to Sprint 1 state |
| 3 | `v1.2.0-rc1-rollback` | Same (Sprint 3 is additive — CLI still works both ways) |
| 4 | `v1.2.0-rc2-rollback` | Revert to Sprint 3 state |
| 5 | `v1.1.0-baseline` | Full rollback (legacy modules removed in Sprint 5) |

---

## Phase 12 — Test Strategy

### 12.1 Test Pyramid

```
          ╱╲
         ╱ E2E ╲           5% — Full workflow tests
        ╱────────╲
       ╱Integration╲       15% — Module integration + CLI + API
      ╱──────────────╲
     ╱   Contract      ╲   10% — API contract tests (OpenAPI validation)
    ╱────────────────────╲
   ╱    Unit tests         ╲ 70% — Module-level tests (existing + new)
  ╱──────────────────────────╲
```

### 12.2 Test Plan Per Sprint

#### Sprint 1-2 (Preparation + Dual Operation)

| Test Type | Scope | New/Existing | Runner |
|-----------|-------|-------------|--------|
| Unit | EOS modules (all 14) | Existing (15+ test files) | pytest |
| Unit | LegacyEventAdapter | New (1 file, 10 tests) | pytest |
| Unit | Circular dependency resolution | New (import chain test) | pytest |
| Unit | MemoryManager gap methods | New (5 tests per gap) | pytest |
| Unit | Manager formal initialization | New (1 test per manager, 12 tests) | pytest |
| Regression | Legacy imports still work | New (5 tests with DeprecationWarning) | pytest |
| Integration | CLI commands with EOS backend | New (3 tests: run, memory, recover) | pytest |

#### Sprint 3-4 (Migration)

| Test Type | Scope | New/Existing | Runner |
|-----------|-------|-------------|--------|
| Unit | RuntimeEngine → CLI run | New (test aliasing) | pytest |
| Unit | PersistenceStore → CLI state/checkpoint | New | pytest |
| Unit | EOSDecisionEngine → CLI decision | New | pytest |
| Unit | ObservabilityConsumer → CLI report/metrics/health | New | pytest |
| Unit | MemoryManager → CLI memory/recover | New | pytest |
| Integration | Full workflow: CLI → EOS → Persistence | New (3 tests) | pytest |
| Regression | Compare CLI output: legacy vs EOS | New (golden file tests) | pytest |
| Contract | OpenAPI schema validation | New | pytest + openapi-core |

#### Sprint 5-6 (Removal + Cleanup)

| Test Type | Scope | New/Existing | Runner |
|-----------|-------|-------------|--------|
| Unit | Legacy module removal | Verify ImportError | pytest |
| Regression | Full test suite against new structure | Existing (all tests) | pytest |
| Performance | Benchmark comparison: pre vs post migration | Existing (37 benchmarks) | pytest-benchmark |
| Stress | EOS execution under load | New | locust / k6 |
| Failure | Manager init failure + graceful degradation | New (fault injection) | pytest |
| Recovery | PersistenceStore checkpoint/restore | New | pytest |

### 12.3 Verification Gates

| Gate | Criteria | Blocking |
|------|----------|----------|
| **Import test** | `python -c "from aios.eos import *"` succeeds with no circular import warnings | Yes |
| **CLI smoke test** | All 21 commands print help without errors | Yes |
| **Legacy CLI test** | `aios memory snapshot` returns valid JSON | Yes (until refactored) |
| **EOS CLI test** | `aios workflow --help` prints workflow help | Yes |
| **Test suite** | 100% of existing tests pass | Yes |
| **Benchmark** | No regression >5% vs baseline | Warning |
| **Lint** | `pylint --enable=cyclic-import` passes | Yes |
| **Contract** | OpenAPI spec validation passes | Yes (API-affecting changes) |

### 12.4 Performance Benchmarks

| Benchmark | Current Baseline | Target | Measurement |
|-----------|-----------------|--------|-------------|
| EventBus publish latency | N/A (not benchmarked) | <5ms avg | `time.perf_counter` |
| RuntimeEngine workflow execution | ~500ms (estimated) | No regression | pytest-benchmark |
| Memory store throughput | N/A | No regression | pytest-benchmark |
| CLI startup time | ~200ms | <300ms | `time` command |

---

## Phase 13 — Success Metrics

### 13.1 Measurable Goals

| Metric | Current Value | Target (v1.2.0) | Measurement |
|--------|--------------|-----------------|-------------|
| **Legacy module imports in production code** | ~15 files import from legacy modules | **0** | grep count |
| **Duplicate implementations** | 6 pairs (events, memory, decision, execution, recovery, context) | **0** | Manual audit |
| **CLI command compatibility** | 21 commands, 3 legacy-backed | **21/21 on EOS** | CLI smoke tests |
| **API regression** | N/A (baseline) | **0** | Contract tests |
| **Performance regression** | N/A (baseline) | **<5% vs v1.1.0** | Benchmarks |
| **Memory API parity** | MemoryManager lacks 5 methods | **Methods: snapshot, list_snapshots, restore, compress, prune** | Unit tests |
| **Event API parity** | Legacy EventBus has 20 event types | **All mapped to RuntimeEventType** | Mapping verification |
| **Test coverage (line)** | Unknown | **>80%** | `pytest --cov` |
| **Circular dependencies** | 4 cycles (all mitigated) | **0** | `import-linter` |
| **Manager initialization** | 12 try/except:pass blocks | **0 — all formally initialized** | Code inspection |

### 13.2 Release Criteria

| Criterion | Requirement |
|-----------|-------------|
| All tests pass | 100% pass rate (allow known skips with documented reason) |
| CLI commands | 21/21 backed by EOS |
| Legacy imports | 0 in production code (CLI + API + EOS + managers) |
| Circular dependencies | 0 detected by static analysis |
| API contract | OpenAPI validation passes |
| Benchmarks | No regression >5% vs v1.1.0 baseline |
| Deprecation warnings | All legacy modules issue warnings |
| Documentation | Updated module map, architecture diagram, migration guide |

### 13.3 Post-Release Monitoring (v1.2.1)

| Metric | Monitoring Method |
|--------|------------------|
| CLI crash rate | Error tracking |
| API error rate | ObservabilityConsumer + logging |
| Memory usage | MemoryManager.statistics() |
| Event bus health | EventBus.health() |
| Manager health | EOSStack.get_health() |

---

## Phase 14 — Final Engineering Program

### 14.1 Executive Summary

MITRA AIOS v1.2 converges the dual execution architecture (CLI Orchestrator path + API/EOS path) into a single EOS-canonical runtime. The migration removes ~35 legacy files, formalizes 12 manager integrations, resolves 4 circular dependency chains, and refactors 8 CLI commands. All 21 CLI commands and all 20+ HTTP API endpoints remain fully backward compatible.

**Total effort**: 35.5 engineering-days  
**Timeline**: 6 sprints × ~6 days = 8-10 weeks  
**Risk**: Low (verified through architecture analysis and risk assessment)

### 14.2 Target Architecture

See Phase 1 for complete architecture diagram and layer definitions.

### 14.3 Canonical Module Map

See Phase 2 for ownership classification of all ~200 files across 29 subdirectories.

### 14.4 Interface Specifications

See Phase 3 for canonical API contracts for RuntimeEngine, WorkflowEngine, MemoryManager, EventBus, ContextBuilder, DecisionEngine, PersistenceStore, and the Manager Protocol.

### 14.5 CLI Migration Plan

See Phase 4 for the 21-command migration table. 8 commands need refactoring (13d), 13 commands need no changes (already on EOS or shared modules).

### 14.6 Event Migration Plan

See Phase 5 for event type mapping, deprecation schedule, and threading model. EOS EventBus is strictly superior (613 lines vs 71) with priority dispatch, async mode, and thread safety.

### 14.7 Memory Migration Plan

See Phase 6 for abstraction tiers and gap analysis. MemoryManager needs 5 additional methods (snapshot, list_snapshots, restore, compress, prune) — estimated 3d effort.

### 14.8 Configuration Strategy

**Decision**: Keep `core/config.py` as canonical. Defer `config/manager.py` integration to v1.3+. Rationale: 26 files already use core/config.py with zero defects; migrating to a 1200-line unused system adds risk without benefit.

### 14.9 Manager Integration Plan

See Phase 8 for initialization order (24 modules, dependency-graph ordered), failure handling per manager (graceful degradation for all), shutdown protocol (reverse-order with timeout), and health monitoring.

### 14.10 Dependency Policy

See Phase 9 for layer rules, allowed/forbidden imports, and CI enforcement with `import-linter`. All 4 existing circular dependency cycles resolved in Sprint 1.

### 14.11 Package Reorganization

See Phase 10 for current → target structure. 11 legacy/archive directories removed, 18 directories retained. No structural renames — all changes are additive or subtractive.

### 14.12 Release Engineering Strategy

See Phase 11 for versioning (v1.2.0-rc1 → rc2 → final), deprecation policy (warning → pending removal → removal), compatibility guarantees (zero CLI/API/contract breakage), and rollback strategy (git tags per sprint).

### 14.13 Test Strategy

See Phase 12 for test pyramid (70/15/10/5%), sprint-by-sprint test plan, verification gates (7 gates, 6 blocking), and performance benchmarks.

### 14.14 Success Metrics

See Phase 13 for 10 measurable goals with current and target values, release criteria (9 requirements), and post-release monitoring (5 metrics).

### 14.15 Engineering Milestones

```
Sprint 1 (5d) — Preparation
├── LegacyEventAdapter (archive — created but unused)
├── Circular dependency resolution in EOS (4 cycles → 0)
├── Deprecation warnings on legacy modules
├── CLI command inventory
└── eos/types.py created
▶ Exit: Deprecation warnings active. EOS import graph acyclic.

Sprint 2 (5d) — Dual Operation Foundation
├── Formalize api/stack.py initialization (remove 12 try/except:pass)
├── Add compress/prune/snapshot/restore/list_snapshots to MemoryManager
├── CLI: migrate `aios decision` to EOSDecisionEngine
├── CLI: migrate `aios validate` to EOS validation chain
└── CLI: migrate `aios health` to ObservableConsumer.health()
▶ Exit: Managers formally initialized. 3 CLI commands migrated.

Sprint 3 (5d) — Core CLI Migration
├── CLI: migrate `aios run` to RuntimeEngine (3d, most complex)
├── CLI: migrate `aios execute` to RuntimeEngine
├── CLI: migrate `aios doctor` to EOS health chain
└── Test: golden file regression tests for migrated commands
▶ Exit: `aios run` works end-to-end on EOS. 6 commands migrated total.

Sprint 4 (5d) — Remaining CLI + Tests
├── CLI: migrate `aios state` to PersistenceStore
├── CLI: migrate `aios context` to EOSContextBuilder
├── CLI: migrate `aios checkpoint` to PersistenceStore
├── CLI: migrate `aios memory` to MemoryManager
├── CLI: migrate `aios recover` to MemoryManager snapshot API
├── CLI: migrate `aios report` to ObservabilityConsumer
├── CLI: migrate `aios metrics` to ObservabilityConsumer
├── Migrate test_orchestrator_persistence_cli.py → EOS-based tests
├── Migrate test_phase4.py → EOS-based tests
└── Migrate test_aios_runtime.py EventBus tests → EOS EventBus
▶ Exit: All 21 CLI commands on EOS. Zero legacy module imports in CLI.

Sprint 5 (5d) — Removal
├── Remove orchestrator.py, events/, executor/, intelligence/
├── Remove state/, recovery/, reporting/, context/
├── Remove doctor/, healing/
├── Remove memory/engine.py and legacy memory submodules
├── Remove events/adapter.py (never used)
├── Add ImportError guard on removed modules (clear error message)
├── Update all imports in remaining files
├── Run full test suite
├── Update architecture documentation
└── Tag v1.2.0-rc2
▶ Exit: All legacy modules removed. Full test suite passes. Tag created.

Sprint 6 (3d) — Polish
├── Add import-linter CI rules
├── Add pylint cyclic-import check to CI
├── Add pytest-cov threshold (80%)
├── Run and document benchmarks
├── Update CLI_COMMAND_INVENTORY.md (final)
├── Finalize architecture documentation
└── Tag v1.2.0
▶ Exit: CI gates active. Benchmarks documented. Release ready.
```

### 14.16 Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|-----------|--------|------------|-------|
| R1 | CLI command output format differs after migration | Medium | Medium | Golden file tests comparing legacy vs EOS output | CLI team |
| R2 | MemoryManager gap methods have bugs | Low | Medium | Unit test each gap method (5 tests) | Memory team |
| R3 | EOS EventBus initialization requires RuntimeEngine | Low | Low | Already resolved in Sprint 1 via types.py | EOS core |
| R4 | Manager initialization order incorrect | Low | High | Dependency graph validation in stack.py | Platform team |
| R5 | Circular dependency re-introduced after cleanup | Low | Medium | CI import-linter enforcement | Platform team |
| R6 | Performance regression in RuntimeEngine workflow execution | Low | Medium | Benchmark comparison pre/post migration | EOS core |
| R7 | Legacy module removal breaks external scripts/tools | Medium | Low | Deprecation warnings active for 2 releases; clear error message on removal | Release team |
| R8 | Team velocity insufficient for 6 sprints | Medium | Medium | Parallelize CLI migration; reduce scope to critical path if needed | PM |

### 14.17 Rollback Strategy

| Failure Scenario | Detection | Action |
|-----------------|-----------|--------|
| CLI command broken after EOS migration | CI test failure or manual smoke test | `git checkout <pre-sprint-tag>`; fix in next sprint |
| Performance regression >5% | Benchmark comparison | Profile and optimize; if unfixable, revert to legacy path for that command only |
| API regression | Contract test failure | `git checkout <pre-sprint-tag>`; fix in next sprint |
| Circular dependency introduced | CI lint failure | Revert PR; redesign import structure |
| Manager init failure in production | Health check alert | `EOSStack.get_health()` reports degraded; service continues without failing manager |

### 14.18 Final Recommendation

## Ready for Implementation

**Justification**:

1. **Architecture analysis complete**: The convergence analysis (10 phases) exhaustively mapped both execution stacks, compared 30 capabilities, traced 978 import edges, classified 277 files, and assessed 4 migration scenarios. All evidence supports EOS convergence.

2. **Risk low**: The Orchestrator path is limited to CLI commands (3 of 21 directly depend on legacy modules). No HTTP API depends on it. Removal risk score: 4/12. EOS removal risk score: 16/12 (our chosen direction avoids this).

3. **Migration path incremental**: 6 sprints with clearly defined exit criteria. Each sprint produces a testable increment. Rollback is git-tag simple.

4. **No fundamental unknowns**: The circular dependency problem is resolved (Sprint 1). The memory gap is analyzed and bounded (3d). The CLI migration is mapped command-by-command. The manager integration is specified module-by-module.

5. **Team can work in parallel**: Sprint 2+ work decomposes into independent tracks:
   - Track A: CLI migration (Sprint 3-4)
   - Track B: MemoryManager gap methods (Sprint 3)
   - Track C: stack.py formal init (Sprint 2)
   - Track D: Test migration (Sprint 4)
   - Track E: Removal + CI (Sprint 5-6)

6. **Success objectively measurable**: 10 metrics with current and target values. 9 release criteria. 7 verification gates.

**The blueprint is sufficiently detailed for multiple engineering teams to begin implementation immediately.**
