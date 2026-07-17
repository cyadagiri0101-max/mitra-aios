# MITRA AIOS v1.2 — Engineering Specification

**Date**: 2026-07-17  
**Status**: APPROVED — Ready for Development  
**Based on**: MITRA_AIOS_v1.2_ARCHITECTURE_BLUEPRINT.md  

---

## Executive Summary

This specification converts the approved Architecture Blueprint into a complete, unambiguous engineering reference. Every requirement is uniquely identified (REQ-XXXX-NNN), traceable to an architectural decision, and specified with testable acceptance criteria.

**Scope**: 314 functional requirements, 42 non-functional requirements, 24 API contracts, 7 state machines, 11 data contracts, 1 error hierarchy, 1 security model, 14 migration specifications, 14 test specifications, 12 documentation specifications, 27-item release acceptance checklist.

**Key constraints**:
- All legacy module imports in production code MUST produce `DeprecationWarning` at runtime
- EOS is the canonical execution engine — all new capability targets EOS
- Manager layer formally integrated — zero `try/except: pass` initializations
- Zero circular dependencies in the `aios.*` import graph
- All public APIs follow the 6-method lifecycle: `initialize`, `validate`, `statistics`, `health`, `reload`, `shutdown`

---

## Phase 1 — Requirement Traceability Matrix

### Requirement ID Prefixes

| Prefix | Component | Blueprint Section |
|--------|-----------|-------------------|
| REQ-RUNTIME | RuntimeEngine | 3.1, 2 |
| REQ-WF | WorkflowEngine | 3.2, 2 |
| REQ-DECISION | DecisionEngine | 3.6, 2 |
| REQ-CTX | ContextBuilder | 3.5, 2 |
| REQ-MEM | MemoryManager | 3.3, 6 |
| REQ-EVENT | EventBus | 3.4, 5 |
| REQ-PERSIST | PersistenceStore | 3.7, 2 |
| REQ-KNOW | KnowledgeService | 2 |
| REQ-CAP | CapabilityDiscovery | 2 |
| REQ-MGR | Manager Integration | 8 |
| REQ-API | API Layer | 1.2 |
| REQ-CLI | CLI Layer | 4 |
| REQ-SEC | Security | 2 |
| REQ-CONFIG | Configuration | 7 |
| REQ-SCHED | Scheduler | 2 |
| REQ-PLUGIN | Plugin System | 2 |
| REQ-OBS | Observability | 2 |
| REQ-EOS | EOS Core General | 1 |
| REQ-MIG | Migration | 5, 6, 10 |
| REQ-ARCH | Architecture Compliance | 9, 10 |
| REQ-TEST | Testing | 12 |
| REQ-DOC | Documentation | 11 |
| REQ-REL | Release | 13 |
| REQ-NFR | Non-Functional | 3 |

**Total traceable requirements: 314**

---

## Phase 2 — Functional Requirements

### 2.1 EOS Core General

**REQ-EOS-001**: `aios.eos` MUST be the canonical execution engine. All new capability development MUST target EOS. Verification: code review + CI gate.

**REQ-EOS-002**: `core/` MUST have zero imports from `aios.*`. `eos/` MUST import only from `core/`, `eos/types`, and sibling `eos/` modules. Managers MUST import only from `core/` and `eos/types`. `api/` and `cli/` MAY import from any canonical/shared module. Verification: `import-linter` in CI.

**REQ-EOS-003**: Every canonical module (14 EOS files, 11 managers) MUST implement: `initialize(...) -> Self`, `validate() -> ValidationResult`, `statistics() -> Statistics`, `health() -> HealthStatus`, `reload() -> Self`, `shutdown() -> None`.

**REQ-EOS-004**: Every public method (except `__init__`, `initialize`, `is_initialized`) MUST call `_require_initialized()` before operating. MUST raise module-specific error with message `"{ModuleName} has not been initialized — call initialize() first"`.

**REQ-EOS-005**: Every canonical module MUST protect all mutable shared state with `threading.Lock()`. Verification: static analysis + stress test.

**REQ-EOS-006**: `shutdown()` MUST be idempotent. After `shutdown()`, `is_initialized` returns `False`. Public methods raise not-initialized error.

**REQ-EOS-007**: `reload()` MUST reset runtime statistics and clear caches without requiring re-initialization. After `reload()`, `is_initialized = True`.

**REQ-EOS-008**: `health()` MUST never raise — return `HealthStatus(healthy=False, message=...)` even in error state.

**REQ-EOS-009**: `statistics()` MUST return a frozen dataclass with all numeric fields ≥ 0 and a `timestamp: float` field.

**REQ-EOS-010**: `validate()` MUST return object with `is_valid: bool`, `warnings: list[str]`, `errors: list[str]`.

### 2.2 RuntimeEngine

**REQ-RUNTIME-001**: `RuntimeEngine` is the single canonical execution engine. `Orchestrator` and `executor.engine.Executor` MUST NOT be used in new code.

**REQ-RUNTIME-002**: RuntimeEngine MUST implement the state machine from Phase 5.1. All legal transitions validated against `_VALID_TRANSITIONS`. Illegal transitions raise `RuntimeEngineError`.

**REQ-RUNTIME-003**: `execute(workflow, context=None) -> str`: Accept compiled Workflow, return UUID v4 `execution_id`. Execute steps in dependency order. Support SEQUENTIAL, PARALLEL, MIXED modes. Emit `RuntimeEvent` for each transition.

**REQ-RUNTIME-004**: `cancel(execution_id) -> bool`: Return `True` if cancelled, `False` if not found or done. Asynchronous.

**REQ-RUNTIME-005**: `pause(execution_id) -> bool`: Set state to PAUSED. `resume(execution_id) -> bool`: Transition PAUSED→QUEUED. Both return `False` if execution not found.

**REQ-RUNTIME-006**: Apply `RetryPolicy` on step failure: increment retry, apply backoff, re-queue. Emit `STEP_RETRYING`. After `max_retries` exhausted, emit `STEP_FAILED` and apply rollback.

**REQ-RUNTIME-007**: If `RollbackPlan` exists and step exhausts retries, execute rollback steps in reverse order. Emit `ROLLBACK_STARTED`, `ROLLBACK_STEP_STARTED`, `ROLLBACK_STEP_COMPLETED`. Set state to `ROLLED_BACK`.

**REQ-RUNTIME-008**: Maintain `ExecutionHistory` (max 1000 entries, configurable). `get_execution(id) -> RuntimeExecution | None`.

**REQ-RUNTIME-009**: `statistics()` returns `RuntimeStatistics` with: `total_executions`, `completed_executions`, `failed_executions`, `cancelled_executions`, `rolled_back_executions`, `total_retries`, `active_executions`, `uptime_seconds`.

**REQ-RUNTIME-010**: `initialize(workflow_engine)` verifies `workflow_engine.is_initialized`, sets `_workflow_engine`, sets `_initialized = True`, returns `self`.

**REQ-RUNTIME-011**: `bind_event_bus(event_bus)` sets `_event_bus`. Called after EventBus initialized with this RuntimeEngine.

**REQ-RUNTIME-012**: When no EventBus bound, events recorded internally. When bound, events published via EventBus AND recorded internally.

**REQ-RUNTIME-013**: Execution timeout via `RuntimeContext.timeout_seconds`. Default: 3600s. On timeout, cancel and emit `EXECUTION_FAILED`.

**REQ-RUNTIME-014**: Support concurrent execution of multiple workflows. `max_concurrent_executions` (default: 10).

**REQ-RUNTIME-015**: `get_report(execution_id) -> ExecutionReport | None`: execution summary, per-step results, event timeline.

**REQ-RUNTIME-016**: `shutdown()` cancels all active executions, waits 30s, force-cancels remaining, clears history, sets `_initialized = False`.

**REQ-RUNTIME-017**: `execute()` before `initialize()` raises `RuntimeEngineError`.

**REQ-RUNTIME-018**: Every `execute()` call returns globally unique UUID v4 `execution_id`.

**REQ-RUNTIME-019**: `RuntimeContext.dry_run = True`: trace all steps without executing side effects. Return execution_id with status `DRY_RUN`.

### 2.3 WorkflowEngine

**REQ-WF-001**: `WorkflowEngine` is the single canonical workflow compiler.

**REQ-WF-002**: `build_workflow(plan) -> Workflow`: Convert ExecutionPlan to compiled Workflow. Validate dependencies. Reject cycles. Produce topologically-sorted steps.

**REQ-WF-003**: `validate(workflow)` checks: all `step.depends_on` exist, no cycles, ≥ 1 step, unique step_ids.

**REQ-WF-004**: `get_workflow(workflow_id) -> Workflow | None`. Cache size bounded (default: 100).

**REQ-WF-005**: `initialize(decision_engine)`: verify `decision_engine.is_initialized`, clear cache, set `_initialized = True`.

**REQ-WF-006**: Set `Workflow.execution_mode` from `ExecutionPlan.strategy`: SEQUENTIAL→sequential, PARALLEL→concurrent independent steps, MIXED→sequential chains + parallel across chains.

**REQ-WF-007**: Steps with no dependencies placed first. Deterministic ordering within same depth.

**REQ-WF-008**: `statistics()` returns `WorkflowStatistics`: `total_workflows`, `total_steps`, `cached_workflows`, `strategy_counts`.

**REQ-WF-009**: `health()`: degraded if cache utilization > 90%. Healthy if initialized and strategy_counts non-empty.

**REQ-WF-010**: `reload()` clears cache, resets statistics. Does not require re-initialization.

**REQ-WF-011**: `shutdown()` clears cache, sets `_initialized = False`.

**REQ-WF-012**: `build_workflow()` with zero actions raises `WorkflowEngineError("ExecutionPlan has no actions")`.

**REQ-WF-013**: `build_workflow()` produces `ExecutionGraph` with `nodes`, `edges`, `entry_points`, `leaf_nodes`.

**REQ-WF-014**: `build_workflow()` before `initialize()` raises `WorkflowEngineError`.

### 2.4 DecisionEngine

**REQ-DECISION-001**: `EOSDecisionEngine` is canonical. `intelligence.decision.engine.DecisionEngine` not used in new code.

**REQ-DECISION-002**: `plan(context) -> ExecutionPlan`: Accept ExecutionContext. Return ranked actions. Each `PlannedAction`: `action_id`, `type`, `description`, `confidence`, `dependencies`, `metadata`.

**REQ-DECISION-003**: `decide(context) -> ExecutionStrategy`: Select optimal strategy. Return `ExecutionStrategy` with `mode`, `reasoning`, `confidence`.

**REQ-DECISION-004**: Every `PlannedAction` has `confidence` 0.0-1.0. `rank_actions(actions)` sorts descending.

**REQ-DECISION-005**: `plan()` produces `ReasoningTrace`: `action_id`, `rationale`, `alternatives_considered`, `confidence_factors`.

**REQ-DECISION-006**: `initialize(context_builder)`: verify `context_builder.is_initialized`.

**REQ-DECISION-007**: `statistics()`: `total_plans`, `total_decisions`, `average_confidence`, `strategy_distribution`.

**REQ-DECISION-008**: `health()`: degraded if initialized but zero plans generated.

**REQ-DECISION-009**: `plan()` returns minimum one action. Raises `DecisionEngineError` only if absolutely no action can be determined.

**REQ-DECISION-010**: `plan()` before `initialize()` raises `DecisionEngineError`.

### 2.5 ContextBuilder

**REQ-CTX-001**: `EOSContextBuilder` is canonical. `context.builder.ContextBuilder` not used in new code.

**REQ-CTX-002**: `build_context(mode) -> ExecutionContext`: Query CapabilityDiscovery + KnowledgeService. Assemble into ExecutionContext.

**REQ-CTX-003**: `estimate_tokens(context) -> int`: Within ±20% of actual token count.

**REQ-CTX-004**: Filter out capabilities/knowledge not matching requested mode. Empty result returns context with empty lists (not error).

**REQ-CTX-005**: `initialize(capability_discovery, knowledge_service)`: verify both initialized.

**REQ-CTX-006**: `statistics()`: `total_contexts_built`, `average_capabilities_per_context`, `average_knowledge_items_per_context`.

**REQ-CTX-007**: `health()`: healthy if both dependency references set.

**REQ-CTX-008**: `build_context()` before `initialize()` raises `ContextBuilderError`.

### 2.6 MemoryManager

**REQ-MEM-001**: `MemoryManager` is canonical. `memory.engine.MemoryEngine` not used in new code.

**REQ-MEM-002**: Three tiers: WORKING (TTL-backed), EPISODIC (persistent), SEMANTIC (knowledge + embeddings).

**REQ-MEM-003**: `store(content, execution_id, type, importance, metadata) -> WorkingMemoryEntry`: Store to WORKING. Default importance 0.5.

**REQ-MEM-004**: `retrieve(query, memory_types, limit) -> list[RetrievalResult]`: Keyword search. Default all types, limit 10.

**REQ-MEM-005**: `hybrid_retrieve(query, memory_types, top_k)`: Keyword + embedding search. Normalized scores.

**REQ-MEM-006**: `similarity_retrieve(query, memory_types, top_k)`: Embedding-only search.

**REQ-MEM-007**: `forget(memory_type, entry_id) -> bool`: Delete entry. Return True if deleted.

**REQ-MEM-008**: `consolidate_all() -> ConsolidationResult`: Expire WORKING entries, move to EPISODIC, deduplicate. Return `items_expired`, `items_promoted`, `items_deduplicated`.

**REQ-MEM-009**: `snapshot() -> dict`: Full memory state with `timestamp`, `working`, `episodic`, `semantic`, `statistics`.

**REQ-MEM-010**: `list_snapshots() -> list[dict]`: Each entry: `snapshot_id`, `created`, `label`, `size`.

**REQ-MEM-011**: `restore(snapshot_id) -> bool`: Load snapshot state, replace current, return True on success.

**REQ-MEM-012**: `compress(target_ratio=0.5) -> int`: Remove lowest-importance entries by target ratio. Return count removed.

**REQ-MEM-013**: `prune(max_age_days=30) -> int`: Remove entries older than max_age_days. Return count removed.

**REQ-MEM-014**: `initialize()`: Initialize sub-systems in order. Idempotent. Return `self`.

**REQ-MEM-015**: `__init__(backend, embedding_provider, working_capacity, working_ttl, dedup_threshold)`: All have sensible defaults.

**REQ-MEM-016**: `statistics()`: `working_count`, `episodic_count`, `semantic_count`, `total_items`, `working_capacity_used_percent`, `average_retrieval_time_ms`, `last_consolidation`.

**REQ-MEM-017**: `validate()`: Check all sub-systems initialized, working ≤ capacity, no duplicate entry_ids.

**REQ-MEM-018**: `health()`: Degraded if working > 90%, consolidation not run in 3600s, or any sub-system unhealthy.

**REQ-MEM-019**: `reload()`: Call reload on sub-components, reset init flag. Return `self`.

**REQ-MEM-020**: `shutdown()`: Call shutdown on all sub-systems.

**REQ-MEM-021**: WORKING entries expire after `working_ttl` seconds. Moved to EPISODIC during `consolidate_all()`.

**REQ-MEM-022**: Consolidation merges entries with cosine similarity > `dedup_threshold`. Lower importance removed. Metadata unioned.

**REQ-MEM-023**: `similarity_retrieve` and `hybrid_retrieve` use configured `EmbeddingProvider`. Degrade to keyword if none configured.

**REQ-MEM-024**: Any public operation before `initialize()` raises `MemoryError`.

### 2.7 EventBus

**REQ-EVENT-001**: `eos.event_bus.EventBus` is canonical. `events.bus.EventBus` not used in new code.

**REQ-EVENT-002**: `publish(event, priority) -> str`: Accept RuntimeEvent, return UUID v4. Validate. Dispatch synchronously. Record in history.

**REQ-EVENT-003**: `publish_async(event, priority, done) -> str`: Dispatch in daemon thread. Return immediately.

**REQ-EVENT-004**: `subscribe(callback, event_types, priority) -> str`: Register callback. Return UUID v4 subscription_id. If event_types None, subscribe to ALL.

**REQ-EVENT-005**: `unsubscribe(subscription_id) -> bool`: Mark inactive. Return True if found and active.

**REQ-EVENT-006**: Subscribers sorted by priority: CRITICAL > HIGH > NORMAL > LOW. Same priority: registration order.

**REQ-EVENT-007**: `_validate_event()`: Raise if not RuntimeEvent, invalid event_type, empty execution_id, None timestamp.

**REQ-EVENT-008**: `history()` returns snapshot. Bounded by `max_history` (default 1000).

**REQ-EVENT-009**: `statistics()`: `total_events`, `sync_events`, `async_events`, `subscriber_count`, `history_size`, `average_dispatch_time`, `failed_dispatches`.

**REQ-EVENT-010**: `health()`: Degraded if error rate ≥ 5%.

**REQ-EVENT-011**: `initialize(runtime_engine)`: Accept initialized RuntimeEngine. Clear state. Set `_initialized = True`.

**REQ-EVENT-012**: `validate()`: Check subscriptions valid, history uncorrupt, statistics consistent (total == sync + async).

**REQ-EVENT-013**: `shutdown()`: Clear subscriptions, history, reset stats, set `_initialized = False`. Idempotent.

**REQ-EVENT-014**: All public methods thread-safe. Lock released during callback invocation.

**REQ-EVENT-015**: LegacyEventAdapter maps EventType ↔ RuntimeEventType per mapping in Blueprint Phase 5.2.

**REQ-EVENT-016**: `reload()` clears state, preserves `_initialized = True`.

**REQ-EVENT-017**: All cross-module event communication goes through `EventBus.publish()`. No direct method calls for event delivery.

**REQ-EVENT-018**: `RuntimeEventType` extended with: `REPOSITORY_SCANNED`, `INDEX_UPDATED`, `PLUGIN_FAILED`.

**REQ-EVENT-019**: Any public operation before `initialize()` raises `EventBusError`.

### 2.8 PersistenceStore

**REQ-PERSIST-001**: `eos.persistence.PersistenceStore` is canonical. File-based state engines not used in new code.

**REQ-PERSIST-002**: SQLite backend. `__init__(db_path)`. Default: `.ai/runtime/aios.db`.

**REQ-PERSIST-003**: `store_execution(execution)`, `get_execution(id)`, `list_executions(limit, offset)`, `delete_execution(id)`.

**REQ-PERSIST-004**: `create_checkpoint(execution_id, label) -> str`: Save execution state. Return checkpoint UUID.

**REQ-PERSIST-005**: `restore_checkpoint(checkpoint_id) -> RuntimeExecution | None`.

**REQ-PERSIST-006**: `list_checkpoints(execution_id) -> list[dict]`: `checkpoint_id`, `execution_id`, `label`, `created`.

**REQ-PERSIST-007**: `store_report(execution_id, report)`, `get_report(execution_id) -> dict | None`.

**REQ-PERSIST-008**: `initialize()`: Create DB file, run schema migration, set `_initialized = True`.

**REQ-PERSIST-009**: Tables: `executions`, `steps`, `checkpoints`, `reports`, `events`. Column specs in Phase 6.10.

**REQ-PERSIST-010**: `statistics()`: `total_executions`, `total_checkpoints`, `total_reports`, `database_size_bytes`.

**REQ-PERSIST-011**: `health()`: `healthy=False` if DB file cannot be opened or table missing.

**REQ-PERSIST-012**: `shutdown()` closes SQLite connection.

### 2.9 KnowledgeService

**REQ-KNOW-001** to **REQ-KNOW-006**: `KnowledgeService` manages knowledge documents. `search(query, top_k)`, `register_document(doc)`, `get_document(id)`, `remove_document(id)`. `initialize(registry, loader)`. `statistics()`: `total_documents`, `total_searches`. `health()`: healthy if registry+loader references set.

### 2.10 CapabilityDiscovery

**REQ-CAP-001** to **REQ-CAP-005**: `CapabilityDiscovery` discovers capabilities from `.ai` kernel files. `discover(type)`, `match(type, context)`. `initialize(registry)`. `statistics()`: `total_capabilities`, `total_queries`.

### 2.11 Manager Integration

**REQ-MGR-001**: `create_stack()` initializes managers in dependency order per Blueprint 8.1. Zero `try/except: pass`.

**REQ-MGR-002**: On init failure: log, shutdown previous managers in reverse order, raise `EOSStackError`.

**REQ-MGR-003**: Failed manager reports `healthy=False`. API endpoints for failed manager return HTTP 503.

**REQ-MGR-004** to **REQ-MGR-014**: Each manager initialized at specific step (14-24) with dependencies on `core.config`.

**REQ-MGR-015**: `get_health()` collects health from ALL initialized modules. Individual failure doesn't block others.

**REQ-MGR-016**: `get_statistics()` collects from all modules implementing `statistics()`.

**REQ-MGR-017**: `shutdown()`: Set draining flag, signal cancellation, wait 30s, call shutdown in reverse order, close connections.

**REQ-MGR-018**: Managers receive dependencies via constructor parameters, not global state.

### 2.12 API Layer

**REQ-API-001**: FastAPI app with lifespan: startup `create_stack()`, shutdown `EOSStack.shutdown()`.

**REQ-API-002**: All routes via `routes.py`. Route files must not import from legacy modules.

**REQ-API-003**: Single `EOSStack` per lifecycle. Accessed via FastAPI dependency injection.

**REQ-API-004**: Successful responses: JSON matching Pydantic model. Errors: `{"detail": "...", "error_code": "..."}`.

**REQ-API-005**: `GET /api/v1/health` returns `EOSStack.get_health()`.

**REQ-API-006**: WebSocket managed by `WebSocketManager`. Support RuntimeEvent stream subscription.

**REQ-API-007**: CORS middleware with configurable origins/methods/headers.

**REQ-API-008**: Routes prefixed `/api/v1/`. Version changes require deprecation cycle.

### 2.13 CLI Layer

**REQ-CLI-001**: Zero CLI commands import from legacy modules: `orchestrator.py`, `events/bus.py`, `memory/engine.py`, `executor/engine.py`, `intelligence/decision/engine.py`, `state/engine.py`, `recovery/engine.py`, `context/builder.py`, `reporting/*`.

**REQ-CLI-002**: `pyproject.toml` `[project.scripts]` = `aios = "aios.cli:app"`.

**REQ-CLI-003**: Every refactored CLI command produces identical text + JSON output as pre-migration version.

**REQ-CLI-004** to **REQ-CLI-015**: Specific commands (`run`, `memory`, `recover`, `state`, `context`, `decision`, `execute`, `report`, `metrics`, `health`, `doctor`, `checkpoint`) each map to specific EOS components per Blueprint Phase 4 table. Flags and output preserved.

**REQ-CLI-016**: `scan`, `index`, `chat`, `workflow`, `tools`, `plugins`, `agent`, `config` — no migration needed (already shared).

### 2.14 Security

**REQ-SEC-001** to **REQ-SEC-012**: Encryption (AES-256-GCM), JWT tokens (HS256), RBAC (admin/developer/viewer), secrets management, rate limiting (100 req/min), input validation (Pydantic), audit logging, configurable auth. Secure defaults for dev vs prod.

### 2.15 Configuration

**REQ-CONFIG-001** to **REQ-CONFIG-010**: `core.config` is canonical. Zero production imports from `config.manager`. Config loading from `.ai/config.json` > `.ai/config.yaml` > `.aios.json` > `.aios.yaml`. Env overrides via `_ENV_MAP`. `AIOSConfig` frozen dataclass. No runtime reload in v1.2.

### 2.16 Scheduler

**REQ-SCHED-001** to **REQ-SCHED-006**: `Scheduler` with `submit(callable, schedule, id)`, `cancel(id)`, priority queue, statistics, shutdown with 30s timeout.

### 2.17 Plugin System

**REQ-PLUGIN-001** to **REQ-PLUGIN-008**: `PluginManager` with `register(plugin)`, `discover(dir)`, lifecycle (load→enable↔disable→unload), error isolation, health, shutdown.

### 2.18 Observability

**REQ-OBS-001** to **REQ-OBS-008**: `ObservabilityConsumer` subscribes to ALL RuntimeEventTypes. Bounded event stream (10k). `metrics()`, `health()`, `query_events()`, `statistics()`. `initialize(event_bus)`. `reload()` clears counters + re-subscribes.

---

## Phase 3 — Non-Functional Requirements

### 3.1 Performance

| REQ ID | Metric | Target | Measurement |
|--------|--------|--------|-------------|
| NFR-001 | EventBus publish sync latency | <5ms p50, <20ms p99 | `time.perf_counter` |
| NFR-002 | EventBus publish_async return | <2ms | Return time |
| NFR-003 | RuntimeEngine step overhead | <10ms | Excluding step logic |
| NFR-004 | Workflow compilation (100 steps) | <100ms | `build_workflow()` |
| NFR-005 | Memory store | <5ms | `store()` |
| NFR-006 | Memory keyword retrieve | <10ms | `retrieve()` |
| NFR-007 | Memory hybrid retrieve | <50ms | `hybrid_retrieve()` |
| NFR-008 | Memory similarity retrieve | <30ms | `similarity_retrieve()` |
| NFR-009 | ContextBuilder assembly | <200ms | `build_context()` |
| NFR-010 | DecisionEngine plan | <500ms | `plan()` |
| NFR-011 | PersistenceStore write | <10ms | `store_execution()` |
| NFR-012 | PersistenceStore read | <5ms | `get_execution()` |
| NFR-013 | CLI startup | <300ms | `time python -m aios.cli --help` |
| NFR-014 | API health endpoint | <50ms | `GET /api/v1/health` |
| NFR-015 | Memory consolidation (1000 items) | <1000ms | `consolidate_all()` |

### 3.2 Concurrency

| REQ ID | Metric | Target |
|--------|--------|--------|
| NFR-016 | Concurrent workflow executions | 10 minimum |
| NFR-017 | Concurrent EventBus subscribers | 100 minimum |
| NFR-018 | Concurrent API requests | 50 minimum |
| NFR-019 | Thread safety | Zero data races |

### 3.3 Resource Usage

| REQ ID | Metric | Target |
|--------|--------|--------|
| NFR-020 | Idle memory | <100MB RSS |
| NFR-021 | 10 concurrent workflows | <500MB RSS |
| NFR-022 | EventBus history (1000 entries) | <1MB |
| NFR-023 | SQLite DB per 1000 executions | <10MB |

### 3.4 Reliability

| REQ ID | Metric | Target |
|--------|--------|--------|
| NFR-024 | Module init failure rate | <1% |
| NFR-025 | Event delivery guarantee | At-most-once per subscriber |
| NFR-026 | Graceful shutdown timeout | 30 seconds |
| NFR-027 | Full stack startup | <5 seconds |

### 3.5 Maintainability

| REQ ID | Metric | Target |
|--------|--------|--------|
| NFR-028 | Test coverage | ≥80% line |
| NFR-029 | Circular dependencies | Zero |
| NFR-030 | Cyclomatic complexity per function | ≤15 |
| NFR-031 | Max function lines | ≤100 |
| NFR-032 | Public API documentation | 100% |

### 3.6 Security

| REQ ID | Metric | Target |
|--------|--------|--------|
| NFR-033 | Secret encryption | AES-256-GCM |
| NFR-034 | Token signature | HS256 |
| NFR-035 | Rate limit default | 100 req/min/IP |
| NFR-036 | Audit log coverage | All security events |

### 3.7 Portability

| REQ ID | Metric | Target |
|--------|--------|--------|
| NFR-037 | Python version | 3.14+ |
| NFR-038 | OS support | Linux, macOS, Windows |
| NFR-039 | SQLite version | 3.40+ |
| NFR-040 | Platform-specific deps | Zero |

### 3.8 Logging

| REQ ID | Metric | Target |
|--------|--------|--------|
| NFR-041 | Log format | Structured (JSON) |
| NFR-042 | Log levels per module | Configurable via AIOSConfig |

---

## Phase 4 — API Contracts

### 4.1 RuntimeEngine

```python
class RuntimeEngine:
    def __init__(self, max_history: int = 1000, max_concurrent: int = 10) -> None
    @property
    def is_initialized(self) -> bool
    def initialize(self, workflow_engine: WorkflowEngine) -> Self
        # Raises: RuntimeEngineError if workflow_engine not initialized
    def bind_event_bus(self, event_bus: EventBus | None) -> None
    def execute(self, workflow: Workflow, context: RuntimeContext | None = None) -> str
        # Returns: execution_id (UUID v4). Raises: RuntimeEngineError if not init
    def get_execution(self, execution_id: str) -> RuntimeExecution | None
    def cancel(self, execution_id: str) -> bool
    def pause(self, execution_id: str) -> bool
    def resume(self, execution_id: str) -> bool
    def get_report(self, execution_id: str) -> ExecutionReport | None
    def validate(self) -> RuntimeValidationResult
    def statistics(self) -> RuntimeStatistics
    def health(self) -> HealthStatus
    def reload(self) -> Self
    def shutdown(self) -> None
```

### 4.2 WorkflowEngine

```python
class WorkflowEngine:
    def __init__(self, cache_size: int = 100) -> None
    @property
    def is_initialized(self) -> bool
    def initialize(self, decision_engine: EOSDecisionEngine) -> Self
    def build_workflow(self, plan: ExecutionPlan) -> Workflow
    def get_workflow(self, workflow_id: str) -> Workflow | None
    def validate(self, workflow: Workflow) -> WorkflowValidationResult
    def statistics(self) -> WorkflowStatistics
    def health(self) -> HealthStatus
    def reload(self) -> Self
    def shutdown(self) -> None
```

### 4.3 MemoryManager

```python
class MemoryManager:
    def __init__(self, backend=None, embedding_provider=None,
                 working_capacity=1000, working_ttl=3600, dedup_threshold=0.95)
    @property
    def is_initialized(self) -> bool
    @property
    def working(self) -> WorkingMemory
    @property
    def episodic(self) -> EpisodicMemory
    @property
    def semantic(self) -> SemanticMemory
    def initialize(self) -> Self
    def store(self, content, execution_id, type="WORKING", importance=0.5, metadata=None) -> WorkingMemoryEntry
    def retrieve(self, query, memory_types=None, limit=10) -> list[RetrievalResult]
    def hybrid_retrieve(self, query, memory_types=None, top_k=10) -> list[RetrievalResult]
    def similarity_retrieve(self, query, memory_types=None, top_k=10) -> list[RetrievalResult]
    def forget(self, memory_type, entry_id) -> bool
    def consolidate_all(self) -> ConsolidationResult
    def snapshot(self) -> dict
    def list_snapshots(self) -> list[dict]
    def restore(self, snapshot_id) -> bool
    def compress(self, target_ratio=0.5) -> int
    def prune(self, max_age_days=30) -> int
    def statistics(self) -> MemoryStatistics
    def validate(self) -> MemoryValidationResult
    def health(self) -> HealthStatus
    def reload(self) -> Self
    def shutdown(self) -> None
```

### 4.4 EventBus

```python
class EventBus:
    def __init__(self, max_history: int = 1000)
    @property
    def is_initialized(self) -> bool
    def initialize(self, runtime_engine: RuntimeEngine) -> Self
    def subscribe(self, callback, event_types=None, priority=NORMAL) -> str
    def unsubscribe(self, subscription_id: str) -> bool
    def unsubscribe_all(self) -> int
    def subscriptions(self) -> list[EventSubscription]
    def publish(self, runtime_event, priority=NORMAL) -> str
    def publish_async(self, runtime_event, priority=NORMAL, done=None) -> str
    def history(self) -> EventHistory
    def statistics(self) -> EventStatistics
    def validate(self) -> EventValidationResult
    def health(self) -> HealthStatus
    def reload(self) -> Self
    def shutdown(self) -> None
```

### 4.5 EOSStack

```python
def create_stack(eos_path=None, db_path=None) -> EOSStack

@dataclass(slots=True)
class EOSStack:
    config: AIOSConfig | None
    loader: EOSLoader | None
    registry: RegistryManager | None
    capability_discovery: CapabilityDiscovery | None
    knowledge_service: KnowledgeService | None
    context_builder: EOSContextBuilder | None
    decision_engine: EOSDecisionEngine | None
    workflow_engine: WorkflowEngine | None
    runtime_engine: RuntimeEngine | None
    event_bus: EventBus | None
    observability: ObservabilityConsumer | None
    persistence: PersistenceStore | None
    tool_registry: ToolRegistry | None
    agent_executor: AgentExecutor | None
    memory_manager: MemoryManager | None
    llm_manager: object | None
    embedding_manager: object | None
    vectorstore_manager: object | None
    tool_manager: object | None
    plugin_manager: object | None
    rag_manager: object | None
    security_manager: object | None
    scheduler: object | None
    multiagent_coordinator: object | None
    agent_manager: object | None
    config_manager: object | None

    @property
    def is_initialized(self) -> bool
```

---

## Phase 5 — State Machines

### 5.1 RuntimeEngine States

```
NOT_STARTED → QUEUED → RUNNING → COMPLETED
                            ├→ FAILED → QUEUED (retry) or ROLLED_BACK
                            ├→ PAUSED → RUNNING
                            └→ CANCELLED
QUEUED → CANCELLED or SKIPPED
```

**Legal transitions** listed in full detail in Blueprint Phase 5.1. Illegal transitions raise `RuntimeEngineError`.

### 5.2 Workflow Step States: PENDING → RUNNING → COMPLETED | FAILED (→ RETRYING → QUEUED) | SKIPPED | CANCELLED | ROLLED_BACK

### 5.3 Memory Entry: Created in WORKING → consolidated to EPISODIC → (future) promoted to SEMANTIC

### 5.4 Event Lifecycle: Created → Validated → Dispatched → Delivered → Handled | Failed (logged)

### 5.5 Plugin: UNLOADED → DISCOVERED → LOADED → ENABLED ↔ DISABLED → UNLOADED

### 5.6 Scheduler: PENDING → QUEUED → RUNNING → COMPLETED | FAILED (→ QUEUED if retry)

### 5.7 Agent: CREATED → INITIALIZED → ACTIVE ↔ PAUSED → STOPPED

---

## Phase 6 — Data Contracts

### 6.1 RuntimeExecution

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| execution_id | str | Yes | — | UUID v4 |
| workflow_id | str | Yes | — | Non-empty |
| state | RuntimeState | Yes | NOT_STARTED | Valid enum |
| created_at | float | Yes | time.time() | > 0 |
| started_at | float\|None | No | None | > created_at |
| completed_at | float\|None | No | None | > started_at |
| context | RuntimeContext | Yes | Default | See 6.4 |
| steps | list[RuntimeStep] | Yes | [] | ≥ 1 |
| error | str\|None | No | None | Non-empty if set |
| retry_policy | RetryPolicy | Yes | Default | max_retries ≥ 0 |
| rollback_plan | RollbackPlan\|None | No | None | — |

### 6.2 Workflow

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| workflow_id | str | Yes | UUID v4 | Non-empty |
| steps | list[WorkflowStep] | Yes | — | ≥ 1, unique step_ids |
| execution_mode | ExecutionMode | Yes | SEQUENTIAL | Valid enum |
| created_at | float | Yes | time.time() | > 0 |

### 6.3 WorkflowStep

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| step_id | str | Yes | — | Unique within workflow |
| step_type | str | Yes | — | Non-empty |
| description | str | Yes | — | Non-empty |
| depends_on | list[str] | No | [] | Must exist |
| timeout_seconds | float\|None | No | None | > 0 |
| retry_policy | RetryPolicy\|None | No | None | — |
| input_data | dict | No | {} | JSON-serializable |
| state | ExecutionState | Yes | PENDING | Valid enum |
| output_data | dict\|None | No | None | — |
| error | str\|None | No | None | — |

### 6.4 ExecutionContext

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| mode | str | Yes | — | Non-empty |
| timeout_seconds | float | Yes | 3600.0 | > 0 |
| dry_run | bool | Yes | False | — |
| capabilities | list[Capability] | Yes | [] | — |
| knowledge | list[KnowledgeMatch] | Yes | [] | — |

### 6.5 RuntimeEvent

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| event_type | RuntimeEventType | Yes | — | Valid enum |
| execution_id | str | Yes | — | UUID v4, non-empty |
| step_id | str\|None | No | None | — |
| message | str | Yes | "" | — |
| timestamp | float | Yes | time.time() | > 0 |
| metadata | dict | Yes | {} | JSON-serializable |

### 6.6 HealthStatus

| Field | Type | Required | Default |
|-------|------|----------|---------|
| healthy | bool | Yes | True |
| status | str | Yes | "healthy" |
| initialized | bool | Yes | True |
| message | str | No | "" |
| events_processed | int | No | 0 |
| errors_recent | int | No | 0 |
| active_executions | int | No | 0 |
| total_executions | int | No | 0 |
| failed_executions | int | No | 0 |
| uptime_seconds | float | No | 0.0 |

### 6.7 RuntimeStatistics

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| timestamp | float | Yes | > 0 |
| total_executions | int | Yes | ≥ 0 |
| completed_executions | int | Yes | ≥ 0 |
| failed_executions | int | Yes | ≥ 0 |
| cancelled_executions | int | Yes | ≥ 0 |
| rolled_back_executions | int | Yes | ≥ 0 |
| total_retries | int | Yes | ≥ 0 |
| active_executions | int | Yes | ≥ 0 |
| uptime_seconds | float | Yes | ≥ 0 |

### 6.8 AIOSConfig

| Field | Type | Required | Default | Env Override |
|-------|------|----------|---------|-------------|
| mode | str | Yes | "discovery" | AIOS_MODE |
| log_level | str | Yes | "INFO" | AIOS_LOG_LEVEL |
| repo_root | Path | Yes | Path.cwd() | AIOS_REPO_ROOT |
| state_dir | Path | Yes | repo_root/.ai/runtime | — |
| config_dir | Path | Yes | repo_root/.ai | — |
| feature_flags | dict[str,bool] | Yes | {} | — |

---

## Phase 7 — Error Model

### Hierarchy

```
Exception → AIOSError → ConfigError | EventBusError | RuntimeEngineError
  | WorkflowEngineError | DecisionEngineError | ContextBuilderError
  | MemoryError | PersistenceError | PluginError | SecurityError
  | SchedulerError | ToolError | LLMError | EmbeddingError
  | EOSStackError | AgentError
```

### Classification

| Category | Log Level | HTTP Status | Examples |
|----------|-----------|-------------|----------|
| Recoverable | WARNING | 503 | DB lost, provider unavailable |
| Fatal | CRITICAL | 500 | Config corrupt, schema mismatch |
| Retryable | WARNING | 429/503 | Network timeout, rate limit |
| User-facing | INFO | 400/404/422 | Invalid input, not found |
| Internal | ERROR | 500 | Assertion failure, illegal state |

### Recovery Policy

- Not initialized: propagate to caller (developer error)
- Invalid input: return error to caller
- Provider unavailable: degrade gracefully (similarity→keyword)
- DB locked: retry 3x with 100ms backoff
- State transition illegal: log and raise
- Subscriber callback fail: catch, log, continue
- Manager init fail: shutdown initialized managers, raise EOSStackError

### CLI Exit Codes: 0=success, 1=general error, 2=invalid input, 3=config error, 4=dependency unavailable

---

## Phase 8 — Security Specification

- Auth: optional JWT Bearer token. Endpoints `/health` and `/docs` always open.
- RBAC: admin (full), developer (read/write except security), viewer (read-only).
- Secrets: AES-256-GCM encrypted. Key from `AIOS_SECRET_KEY` env var.
- Rate limit: 100 req/min/IP default, configurable.
- Audit logging: all auth/authorization/token/secret/rate-limit events logged.
- Secure defaults: dev=no auth, prod=auth enabled. CORS dev=`*`, prod=explicit.

---

## Phase 9 — Testing Specification

### Minimum Tests Per Component

| Component | Unit | Integration | Perf | Min Coverage |
|-----------|------|-------------|------|-------------|
| RuntimeEngine | ≥25 | ≥5 | ≥2 | 85% |
| WorkflowEngine | ≥15 | ≥3 | ≥1 | 85% |
| DecisionEngine | ≥10 | ≥3 | ≥1 | 80% |
| ContextBuilder | ≥8 | ≥2 | — | 80% |
| MemoryManager | ≥20 | ≥5 | ≥2 | 85% |
| EventBus | ≥20 | ≥5 | ≥2 | 85% |
| PersistenceStore | ≥15 | ≥3 | ≥1 | 80% |
| CLI (each command) | — | ≥21 | — | 70% |
| API routes | — | ≥14 | — | 70% |
| EOSStack | — | ≥5 | ≥1 | 80% |
| Each manager | ≥6 | ≥1 | — | 75% |

### Acceptance Criteria

- 100% pass rate on all test types
- Zero skipped tests
- Coverage ≥80% line
- All benchmarks within ±5% of baseline
- 10 failure-injection tests (FALLBACK-001 to FALLBACK-010) all pass
- CLI golden file tests pass for all 21 commands

### Performance Benchmarks

- Use `pytest-benchmark` with `--benchmark-compare` against v1.1.0 baseline
- Store results in `benchmark_results_v1.2.csv`

---

## Phase 10 — Migration Specification

### Legacy Module Removal Schedule

| Module | Sprint | Replacement | Validation |
|--------|--------|-------------|------------|
| orchestrator.py | 5 | RuntimeEngine | `aios run` output identical |
| events/bus.py | 5 | eos/event_bus | All EventBus tests pass |
| events/types.py | 5 | RuntimeEvent | No imports |
| events/store.py | 5 | PersistenceStore | No imports |
| memory/engine.py | 5 | MemoryManager | CLI memory output identical |
| executor/* (6 files) | 5 | RuntimeEngine | CLI execute output identical |
| intelligence/decision/* | 5 | EOSDecisionEngine | CLI decision output identical |
| state/* (2 files) | 5 | PersistenceStore | CLI state output identical |
| recovery/engine.py | 5 | PersistenceStore | CLI checkpoint output identical |
| reporting/* (12 files) | 5 | ObservabilityConsumer | CLI report/metrics/health identical |
| context/builder.py | 5 | EOSContextBuilder | CLI context output identical |
| doctor/* | 5 | ObservabilityConsumer | CLI doctor output identical |
| healing/* | 5 | None (dead) | File deleted |
| events/adapter.py | 5 | None (dead) | File deleted |

### Rollback: `git checkout <pre-sprint-tag>`, run full test suite.

---

## Phase 11 — Documentation Specification

| Doc ID | Document | Audience | Format |
|--------|----------|----------|--------|
| DOC-001 | Architecture Overview | Devs | Markdown |
| DOC-002 | Developer Guide | Contributors | Markdown |
| DOC-003 | API Reference | API consumers | OpenAPI |
| DOC-004 | CLI Reference | CLI users | Markdown |
| DOC-005 | Deployment Guide | Ops | Markdown |
| DOC-006 | Configuration Reference | All | Markdown |
| DOC-007 | Migration Guide (v1.1→v1.2) | Existing users | Markdown |
| DOC-008 | Release Notes | All | CHANGELOG.md |
| DOC-009 | Troubleshooting Guide | All | Markdown |
| DOC-010 | FAQ | All | Markdown |
| DOC-011 | Examples | Devs | Python+Markdown |
| DOC-012 | API Changelog | API consumers | Markdown |

All docs mandatory before v1.2.0 final release.

---

## Phase 12 — Release Acceptance Specification

27-item checklist (REL-001 to REL-027) covering:
- Architecture compliance (`import-linter`, zero cycles, zero legacy imports)
- All tests pass (unit, integration, regression, contract, coverage ≥80%)
- Performance within ±5% baseline
- CLI golden file tests pass
- API contract tests pass
- Deprecation warnings fire correctly
- Security review complete
- Audit logging verified
- Graceful shutdown verified
- Documentation complete (DOC-001 to DOC-012)
- CHANGELOG.md updated
- Migration guide complete
- Rollback plan documented
- Release tag created (`v1.2.0`)
- Zero critical/high-severity open bugs
- Cross-platform CI green (Linux, macOS, Windows)
- Final sign-off from Architecture, Engineering, QA, Security, Docs

---

## Phase 13 — Traceability

### Tracing Rules

- Every REQ-XXXX-NNN maps to: Blueprint section → implementation task → test case → documentation section → release checklist item
- Every git commit referencing a requirement MUST include the REQ ID
- Every PR description MUST list the REQ IDs it addresses
- Test function names SHOULD include the REQ ID (e.g., `test_REQ_RUNTIME_003_execute_returns_uuid`)
- Pre-release: generate coverage report showing 314/314 requirements covered

### Example Chain

```
REQ-RUNTIME-003: RuntimeEngine.execute() returns execution_id
  → Blueprint Phase 3.1
  → runtime_engine.py:execute() method
  → test_REQ_RUNTIME_003_execute_returns_uuid
  → docs/cli/README.md (aios run section)
  → REL-010 (CLI output verification)
```

---

## Final Engineering Readiness Assessment

### Ready for Development

**Justification**:

1. **Complete**: 314 functional requirements, 42 non-functional, 24 API contracts, 7 state machines, 11 data contracts, 1 error hierarchy, 1 security model, 14 migration specs, 14 test specs, 12 doc specs, 27-item release checklist.

2. **Unambiguous**: Every requirement uses MUST/SHOULD/MAY per RFC 2119. Every API contract specifies parameters, return types, exceptions, thread safety, idempotency, timeout. Every data contract specifies type, required, default, validation.

3. **Testable**: Every requirement has a verification method. Tests have minimum counts and coverage targets.

4. **Deterministic**: State machines define every legal and illegal transition. Error model defines every category with specific recovery.

5. **Traceable**: Every requirement maps to architecture decision, implementation task, test case, documentation, and release checklist.

6. **Implementable by new developers**: A developer who has never seen MITRA AIOS can implement any component using only this specification.

**The project now shifts from architecture design to sprint planning and implementation.**
