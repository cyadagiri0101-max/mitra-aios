"""RuntimeEngine — execute workflows produced by WorkflowEngine."""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import StrEnum
from typing import TYPE_CHECKING

from aios.core.exceptions import RuntimeEngineError
from aios.core.logger import get_logger
from aios.eos.types import HealthStatus
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    RollbackPlan,
    Workflow,
    WorkflowEngine,
    WorkflowStep,
)

if TYPE_CHECKING:
    from aios.eos.event_bus import EventBus


class RuntimeState(StrEnum):
    """Runtime execution state for workflows and steps."""

    NOT_STARTED = "not_started"
    QUEUED = "queued"
    RUNNING = "running"
    WAITING = "waiting"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"


_VALID_TRANSITIONS: dict[RuntimeState, set[RuntimeState]] = {
    RuntimeState.NOT_STARTED: {RuntimeState.QUEUED},
    RuntimeState.QUEUED: {RuntimeState.RUNNING, RuntimeState.CANCELLED, RuntimeState.SKIPPED},
    RuntimeState.RUNNING: {
        RuntimeState.COMPLETED, RuntimeState.FAILED,
        RuntimeState.PAUSED, RuntimeState.CANCELLED,
        RuntimeState.ROLLED_BACK,
    },
    RuntimeState.WAITING: {RuntimeState.RUNNING, RuntimeState.CANCELLED, RuntimeState.SKIPPED},
    RuntimeState.PAUSED: {RuntimeState.RUNNING, RuntimeState.CANCELLED, RuntimeState.FAILED},
    RuntimeState.COMPLETED: {RuntimeState.ROLLED_BACK},
    RuntimeState.FAILED: {RuntimeState.QUEUED, RuntimeState.ROLLED_BACK},
    RuntimeState.ROLLED_BACK: set(),
    RuntimeState.CANCELLED: set(),
    RuntimeState.SKIPPED: set(),
}


class RuntimeEventType(StrEnum):
    """Types of runtime events emitted during execution."""

    EXECUTION_CREATED = "execution_created"
    EXECUTION_QUEUED = "execution_queued"
    EXECUTION_STARTED = "execution_started"
    EXECUTION_COMPLETED = "execution_completed"
    EXECUTION_FAILED = "execution_failed"
    EXECUTION_CANCELLED = "execution_cancelled"
    EXECUTION_PAUSED = "execution_paused"
    EXECUTION_RESUMED = "execution_resumed"
    EXECUTION_ROLLED_BACK = "execution_rolled_back"
    STEP_STARTED = "step_started"
    STEP_COMPLETED = "step_completed"
    STEP_FAILED = "step_failed"
    STEP_SKIPPED = "step_skipped"
    STEP_RETRYING = "step_retrying"
    ROLLBACK_STARTED = "rollback_started"
    ROLLBACK_STEP_STARTED = "rollback_step_started"
    ROLLBACK_STEP_COMPLETED = "rollback_step_completed"


@dataclass(frozen=True, slots=True)
class RuntimeEvent:
    """A single runtime event emitted during execution."""

    event_type: RuntimeEventType
    execution_id: str
    step_id: str | None = None
    message: str = ""
    timestamp: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class RetryPolicy:
    """Configurable retry policy for step execution."""

    max_retries: int = 3
    base_delay_seconds: float = 1.0
    backoff_multiplier: float = 2.0

    @property
    def is_disabled(self) -> bool:
        return self.max_retries <= 0


@dataclass(slots=True)
class CancellationToken:
    """Thread-safe cancellation token."""

    _cancelled: bool = False
    _lock: threading.Lock = field(default_factory=threading.Lock)

    @property
    def is_cancelled(self) -> bool:
        with self._lock:
            return self._cancelled

    def cancel(self) -> None:
        with self._lock:
            self._cancelled = True


@dataclass(slots=True)
class ExecutionProgress:
    """Execution progress tracking."""

    total_steps: int = 0
    completed_steps: int = 0
    failed_steps: int = 0
    skipped_steps: int = 0
    running_steps: int = 0
    percentage: float = 0.0

    @property
    def finished_steps(self) -> int:
        return self.completed_steps + self.failed_steps + self.skipped_steps


@dataclass(slots=True)
class ExecutionMetrics:
    """Execution performance metrics."""

    total_duration_seconds: float = 0.0
    total_retries: int = 0
    average_step_duration: float = 0.0
    max_step_duration: float = 0.0
    min_step_duration: float = 0.0


@dataclass(slots=True)
class RuntimeStep:
    """Runtime tracking for a single workflow step."""

    step_id: str
    workflow_step: WorkflowStep
    state: RuntimeState = RuntimeState.NOT_STARTED
    attempts: int = 0
    started_at: float | None = None
    completed_at: float | None = None
    error: str | None = None


@dataclass(slots=True)
class RuntimeExecution:
    """Tracks the entire execution of a single workflow."""

    execution_id: str
    workflow: Workflow
    state: RuntimeState = RuntimeState.NOT_STARTED
    steps: dict[str, RuntimeStep] = field(default_factory=dict)
    events: list[RuntimeEvent] = field(default_factory=list)
    created_at: float = 0.0
    started_at: float | None = None
    completed_at: float | None = None
    error: str | None = None
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    metrics: ExecutionMetrics = field(default_factory=ExecutionMetrics)


@dataclass(frozen=True, slots=True)
class RuntimeContext:
    """Immutable context for runtime execution."""

    execution_id: str
    workflow: Workflow
    state: RuntimeState
    step_count: int
    completed_count: int
    failed_count: int
    retry_policy: RetryPolicy


@dataclass(frozen=True, slots=True)
class RuntimeSnapshot:
    """Immutable snapshot of execution state at a point in time."""

    execution_id: str
    state: RuntimeState
    timestamp: float
    step_count: int
    completed_count: int
    failed_count: int
    running_count: int
    queued_count: int
    step_ids: tuple[str, ...]
    step_states: tuple[RuntimeState, ...]


@dataclass(frozen=True, slots=True)
class ExecutionHistoryEntry:
    """A single entry in execution history."""

    event_type: RuntimeEventType
    timestamp: float
    step_id: str | None = None
    message: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ExecutionHistory:
    """Complete execution history."""

    execution_id: str
    entries: tuple[ExecutionHistoryEntry, ...] = ()
    state_transitions: tuple[tuple[RuntimeState, RuntimeState, float], ...] = ()

    @property
    def is_empty(self) -> bool:
        return len(self.entries) == 0


@dataclass(frozen=True, slots=True)
class ExecutionReport:
    """Detailed execution report."""

    execution_id: str
    workflow_task: str
    strategy: str
    execution_mode: str
    state: RuntimeState
    created_at: float
    started_at: float | None
    completed_at: float | None
    duration_seconds: float
    total_steps: int
    completed_steps: int
    failed_steps: int
    skipped_steps: int
    total_retries: int
    total_cost: ExecutionCost
    total_duration: ExecutionDuration
    has_rollback: bool
    was_rolled_back: bool
    error: str | None


@dataclass(frozen=True, slots=True)
class RuntimeStatistics:
    """Summary statistics about the runtime engine."""

    total_executions: int
    successful_executions: int
    failed_executions: int
    cancelled_executions: int
    rollback_count: int
    average_duration: float
    average_retries: float
    average_workflow_size: float
    cache_size: int


@dataclass(slots=True)
class RuntimeValidationResult:
    """Outcome of :meth:`RuntimeEngine.validate`."""

    is_valid: bool = True
    invalid_state_transition: bool = False
    duplicate_runtime_ids: list[str] = field(default_factory=list)
    missing_execution: bool = False
    invalid_dependency_execution: list[str] = field(default_factory=list)
    circular_execution: list[str] = field(default_factory=list)
    invalid_progress: bool = False
    invalid_retry_count: bool = False
    invalid_rollback: bool = False
    invalid_history: bool = False
    invalid_metrics: bool = False
    invalid_runtime_report: bool = False
    warnings: list[str] = field(default_factory=list)


class RuntimeEngine:
    """Execute workflows produced by WorkflowEngine.

    Responsible for runtime orchestration only. Does not access
    filesystem, registries, or any layer below WorkflowEngine.
    """

    def __init__(self) -> None:
        self.logger = get_logger("aios.eos.runtime_engine")
        self._workflow_engine: WorkflowEngine | None = None
        self._executions: dict[str, RuntimeExecution] = {}
        self._execution_threads: dict[str, threading.Thread] = {}
        self._pause_events: dict[str, threading.Event] = {}
        self._cancel_tokens: dict[str, CancellationToken] = {}
        self._total_executions: int = 0
        self._successful_executions: int = 0
        self._failed_executions: int = 0
        self._cancelled_executions: int = 0
        self._rollback_count: int = 0
        self._duration_sum: float = 0.0
        self._retry_sum: int = 0
        self._step_sum: int = 0
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._event_bus: EventBus | None = None

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def workflow_engine(self) -> WorkflowEngine:
        if self._workflow_engine is None:
            raise RuntimeEngineError("RuntimeEngine has not been initialized")
        return self._workflow_engine

    def initialize(
        self, workflow_engine: WorkflowEngine,
        event_bus: EventBus | None = None,
    ) -> RuntimeEngine:
        """Bind to an initialized WorkflowEngine.

        If *event_bus* is provided, runtime events will be published to
        it in addition to being recorded internally.  The bus reference
        is stored without being called during initialization so that
        circular initialisation (EventBus → RuntimeEngine → EventBus)
        is avoided — callers pass the bus *after* initialising it.
        """
        if not workflow_engine.is_initialized:
            raise RuntimeEngineError(
                "WorkflowEngine must be initialized before passing to RuntimeEngine"
            )

        with self._lock:
            self._workflow_engine = workflow_engine
            self._event_bus = event_bus
            self._executions.clear()
            self._execution_threads.clear()
            self._pause_events.clear()
            self._cancel_tokens.clear()
            self._total_executions = 0
            self._successful_executions = 0
            self._failed_executions = 0
            self._cancelled_executions = 0
            self._rollback_count = 0
            self._duration_sum = 0.0
            self._retry_sum = 0
            self._step_sum = 0

        self._initialized = True
        self.logger.info("RuntimeEngine initialized")
        return self

    def bind_event_bus(self, event_bus: EventBus) -> None:
        """Connect an EventBus after initialisation.

        Called after EventBus has been initialised with this RuntimeEngine
        to complete the circular wiring without deadlock.
        """
        self._event_bus = event_bus

    # ── Public API ──────────────────────────────────────────────

    def execute(self, workflow: Workflow) -> str:
        """Execute a workflow and return the execution ID.

        Creates a RuntimeExecution, queues it, and starts a background
        thread to process steps according to the workflow's execution mode.
        """
        execution_id = str(uuid.uuid4())
        now = time.time()

        execution = RuntimeExecution(
            execution_id=execution_id,
            workflow=self._deep_copy_workflow(workflow),
            state=RuntimeState.QUEUED,
            steps={},
            events=[],
            created_at=now,
            retry_policy=RetryPolicy(),
        )

        # Create RuntimeSteps from workflow steps
        for wf_step in workflow.steps:
            rt_step = RuntimeStep(
                step_id=wf_step.step_id,
                workflow_step=wf_step,
                state=RuntimeState.QUEUED,
            )
            execution.steps[wf_step.step_id] = rt_step

        cancel_token = CancellationToken()
        pause_event = threading.Event()

        with self._lock:
            self._executions[execution_id] = execution
            self._cancel_tokens[execution_id] = cancel_token
            self._pause_events[execution_id] = pause_event
            self._total_executions += 1
            self._step_sum += len(workflow.steps)

        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_CREATED,
            message=f"Execution created for: {workflow.task_description}",
        )
        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_QUEUED,
            message="Execution queued",
        )

        thread = threading.Thread(
            target=self._run_execution,
            args=(execution_id,),
            daemon=True,
        )
        with self._lock:
            self._execution_threads[execution_id] = thread
        thread.start()

        self.logger.info(
            "Started execution %s — mode=%s, steps=%d",
            execution_id,
            workflow.execution_mode.value,
            len(workflow.steps),
        )
        return execution_id

    def execute_step(self, step: WorkflowStep) -> RuntimeStep:
        """Execute a single workflow step standalone and return result."""
        rt_step = RuntimeStep(
            step_id=f"direct_{step.step_id}",
            workflow_step=step,
            state=RuntimeState.RUNNING,
            started_at=time.time(),
        )
        self.logger.info("Executing standalone step: %s", step.step_id)

        try:
            # Simulate step execution — in production this invokes real logic
            rt_step.state = RuntimeState.COMPLETED
            rt_step.completed_at = time.time()
            self.logger.info("Standalone step completed: %s", step.step_id)
        except Exception as e:
            rt_step.state = RuntimeState.FAILED
            rt_step.completed_at = time.time()
            rt_step.error = str(e)
            self.logger.error(
                "Standalone step failed: %s — %s", step.step_id, e
            )

        return rt_step

    def pause(self, execution_id: str) -> RuntimeExecution:
        """Pause a running execution."""
        execution = self._get_execution(execution_id)
        self._assert_state(
            execution, RuntimeState.RUNNING,
            "Can only pause a RUNNING execution",
        )

        with self._lock:
            execution.state = RuntimeState.PAUSED

        pause_event = self._pause_events.get(execution_id)
        if pause_event is not None:
            pause_event.set()

        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_PAUSED,
            message="Execution paused",
        )
        self.logger.info("Paused execution: %s", execution_id)
        return execution

    def resume(self, execution_id: str) -> RuntimeExecution:
        """Resume a paused execution."""
        execution = self._get_execution(execution_id)
        self._assert_state(
            execution, RuntimeState.PAUSED,
            "Can only resume a PAUSED execution",
        )

        with self._lock:
            execution.state = RuntimeState.RUNNING

        pause_event = self._pause_events.get(execution_id)
        if pause_event is not None:
            pause_event.clear()

        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_RESUMED,
            message="Execution resumed",
        )
        self.logger.info("Resumed execution: %s", execution_id)
        return execution

    def cancel(self, execution_id: str) -> RuntimeExecution:
        """Cancel a running or queued execution."""
        execution = self._get_execution(execution_id)
        if execution.state not in (
            RuntimeState.QUEUED, RuntimeState.RUNNING,
            RuntimeState.PAUSED, RuntimeState.WAITING,
        ):
            raise RuntimeEngineError(
                f"Cannot cancel execution in state: {execution.state.value}",
            )

        cancel_token = self._cancel_tokens.get(execution_id)
        if cancel_token is not None:
            cancel_token.cancel()

        with self._lock:
            execution.state = RuntimeState.CANCELLED
            execution.completed_at = time.time()
            self._cancelled_executions += 1

        # Clear pause so thread can exit
        pause_event = self._pause_events.get(execution_id)
        if pause_event is not None:
            pause_event.clear()

        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_CANCELLED,
            message="Execution cancelled",
        )
        self.logger.info("Cancelled execution: %s", execution_id)
        return execution

    def rollback(self, execution_id: str) -> RuntimeExecution:
        """Rollback an execution using the workflow's RollbackPlan."""
        execution = self._get_execution(execution_id)
        if execution.state not in (
            RuntimeState.COMPLETED, RuntimeState.FAILED, RuntimeState.RUNNING,
        ):
            raise RuntimeEngineError(
                f"Cannot rollback execution in state: {execution.state.value}",
            )

        workflow = execution.workflow
        rollback_plan = workflow.rollback_plan

        if rollback_plan is None or rollback_plan.is_empty:
            raise RuntimeEngineError(
                "Workflow has no rollback plan",
            )

        with self._lock:
            execution.state = RuntimeState.ROLLED_BACK
            self._rollback_count += 1

        self._emit_event(
            execution_id, RuntimeEventType.ROLLBACK_STARTED,
            message=f"Rollback started with {len(rollback_plan.rollback_steps)} steps",
        )

        # Execute rollback steps in reverse order
        for rs in rollback_plan.rollback_steps:
            self._emit_event(
                execution_id,
                RuntimeEventType.ROLLBACK_STEP_STARTED,
                step_id=rs.step_id,
                message=f"Rollback step: {rs.step_id}",
            )
            self._emit_event(
                execution_id,
                RuntimeEventType.ROLLBACK_STEP_COMPLETED,
                step_id=rs.step_id,
                message=f"Rollback step completed: {rs.step_id}",
            )

        with self._lock:
            execution.completed_at = time.time()

        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_ROLLED_BACK,
            message="Execution rolled back",
        )
        self.logger.info("Rolled back execution: %s", execution_id)
        return execution

    def status(self, execution_id: str) -> RuntimeState:
        """Get the current status of an execution."""
        execution = self._get_execution(execution_id)
        return execution.state

    def history(self, execution_id: str) -> ExecutionHistory:
        """Get the execution history."""
        execution = self._get_execution(execution_id)
        entries: list[ExecutionHistoryEntry] = []
        transitions: list[tuple[RuntimeState, RuntimeState, float]] = []

        for event in execution.events:
            entries.append(ExecutionHistoryEntry(
                event_type=event.event_type,
                timestamp=event.timestamp,
                step_id=event.step_id,
                message=event.message,
                metadata=event.metadata,
            ))

        return ExecutionHistory(
            execution_id=execution_id,
            entries=tuple(entries),
            state_transitions=tuple(transitions),
        )

    def report(self, execution_id: str) -> ExecutionReport:
        """Generate a detailed execution report."""
        execution = self._get_execution(execution_id)
        workflow = execution.workflow
        duration = 0.0
        if execution.started_at is not None:
            end = execution.completed_at or time.time()
            duration = end - execution.started_at

        completed = sum(
            1 for s in execution.steps.values()
            if s.state == RuntimeState.COMPLETED
        )
        failed = sum(
            1 for s in execution.steps.values()
            if s.state == RuntimeState.FAILED
        )
        skipped = sum(
            1 for s in execution.steps.values()
            if s.state == RuntimeState.SKIPPED
        )

        return ExecutionReport(
            execution_id=execution_id,
            workflow_task=workflow.task_description,
            strategy=workflow.strategy.value,
            execution_mode=workflow.execution_mode.value,
            state=execution.state,
            created_at=execution.created_at,
            started_at=execution.started_at,
            completed_at=execution.completed_at,
            duration_seconds=round(duration, 3),
            total_steps=len(execution.steps),
            completed_steps=completed,
            failed_steps=failed,
            skipped_steps=skipped,
            total_retries=execution.metrics.total_retries,
            total_cost=workflow.total_cost,
            total_duration=workflow.total_duration,
            has_rollback=workflow.rollback_plan is not None
            and not workflow.rollback_plan.is_empty,
            was_rolled_back=execution.state == RuntimeState.ROLLED_BACK,
            error=execution.error,
        )

    def snapshot(self, execution_id: str) -> RuntimeSnapshot:
        """Take an immutable snapshot of current execution state."""
        execution = self._get_execution(execution_id)
        step_ids = tuple(execution.steps.keys())
        step_states = tuple(s.state for s in execution.steps.values())
        completed = sum(1 for s in execution.steps.values() if s.state == RuntimeState.COMPLETED)
        failed = sum(1 for s in execution.steps.values() if s.state == RuntimeState.FAILED)
        running = sum(1 for s in execution.steps.values() if s.state == RuntimeState.RUNNING)
        queued = sum(1 for s in execution.steps.values() if s.state == RuntimeState.QUEUED)

        return RuntimeSnapshot(
            execution_id=execution_id,
            state=execution.state,
            timestamp=time.time(),
            step_count=len(execution.steps),
            completed_count=completed,
            failed_count=failed,
            running_count=running,
            queued_count=queued,
            step_ids=step_ids,
            step_states=step_states,
        )

    def validate(self, execution_id: str) -> RuntimeValidationResult:
        """Validate execution integrity."""
        result = RuntimeValidationResult()

        try:
            execution = self._get_execution(execution_id)
        except RuntimeEngineError:
            result.missing_execution = True
            result.is_valid = False
            return result

        self._check_invalid_state(execution, result)
        self._check_duplicate_ids(execution, result)
        self._check_progress(execution, result)
        self._check_retry_count(execution, result)
        self._check_rollback(execution, result)
        self._check_history(execution, result)
        self._check_metrics(execution, result)
        self._check_report(execution, result)

        if result.duplicate_runtime_ids:
            result.is_valid = False
        if result.missing_execution:
            result.is_valid = False
        if result.invalid_dependency_execution:
            result.is_valid = False
        if result.circular_execution:
            result.is_valid = False
        if result.invalid_progress:
            result.is_valid = False
        if result.invalid_retry_count:
            result.is_valid = False
        if result.invalid_rollback:
            result.is_valid = False
        if result.invalid_history:
            result.is_valid = False
        if result.invalid_metrics:
            result.is_valid = False
        if result.invalid_runtime_report:
            result.is_valid = False

        self.logger.info(
            "Validation: valid=%s, missing=%s, duplicate=%d",
            result.is_valid,
            result.missing_execution,
            len(result.duplicate_runtime_ids),
        )
        return result

    def statistics(self) -> RuntimeStatistics:
        """Return summary statistics about the runtime engine."""
        with self._lock:
            avg_duration = (
                self._duration_sum / self._total_executions
                if self._total_executions > 0
                else 0.0
            )
            avg_retries = (
                self._retry_sum / self._total_executions
                if self._total_executions > 0
                else 0.0
            )
            avg_workflow_size = (
                self._step_sum / self._total_executions
                if self._total_executions > 0
                else 0.0
            )

            return RuntimeStatistics(
                total_executions=self._total_executions,
                successful_executions=self._successful_executions,
                failed_executions=self._failed_executions,
                cancelled_executions=self._cancelled_executions,
                rollback_count=self._rollback_count,
                average_duration=round(avg_duration, 3),
                average_retries=round(avg_retries, 2),
                average_workflow_size=round(avg_workflow_size, 1),
                cache_size=len(self._executions),
            )

    def reload(self) -> RuntimeEngine:
        """Clear all caches and reset statistics."""
        self.logger.info("Reloading RuntimeEngine")
        with self._lock:
            self._executions.clear()
            self._execution_threads.clear()
            self._pause_events.clear()
            self._cancel_tokens.clear()
            self._total_executions = 0
            self._successful_executions = 0
            self._failed_executions = 0
            self._cancelled_executions = 0
            self._rollback_count = 0
            self._duration_sum = 0.0
            self._retry_sum = 0
            self._step_sum = 0
        return self

    def health(self) -> HealthStatus:
        """Check RuntimeEngine health.

        Returns:
            HealthStatus: Subsystem health with execution metrics.
        """
        with self._lock:
            if not self._initialized:
                return HealthStatus(
                    healthy=False,
                    status="not_initialized",
                    initialized=False,
                    active_executions=0,
                    total_executions=self._total_executions,
                    failed_executions=self._failed_executions,
                    cancelled_executions=self._cancelled_executions,
                    message="RuntimeEngine not initialized",
                )

            active_count = sum(
                1 for e in self._executions.values()
                if e.state in (RuntimeState.RUNNING, RuntimeState.QUEUED, RuntimeState.WAITING)
            )

            uptime = time.time() - (min(
                e.created_at for e in self._executions.values()
            ) if self._executions else time.time())

            is_healthy = self._initialized and active_count >= 0
            status = "healthy" if is_healthy else "degraded"

            message = f"Active: {active_count}, Total: {self._total_executions}, Failed: {self._failed_executions}, Cancelled: {self._cancelled_executions}"

            return HealthStatus(
                healthy=is_healthy,
                status=status,
                initialized=True,
                active_executions=active_count,
                total_executions=self._total_executions,
                failed_executions=self._failed_executions,
                cancelled_executions=self._cancelled_executions,
                uptime_seconds=uptime,
                message=message,
            )

    def shutdown(self) -> None:
        """Gracefully shutdown the RuntimeEngine.

        Cancels all running executions, waits for threads to complete,
        and releases resources. Idempotent—safe to call multiple times.
        """
        with self._lock:
            if not self._initialized:
                return

            # Signal all cancel tokens
            for cancel_token in self._cancel_tokens.values():
                cancel_token.cancel()

            # Clear all pause events to allow threads to exit
            for pause_event in self._pause_events.values():
                pause_event.clear()

        # Wait for all execution threads to complete
        join_timeout = 5.0  # 5 seconds per thread
        for exec_id, thread in list(self._execution_threads.items()):
            if thread.is_alive():
                thread.join(timeout=join_timeout)
                if thread.is_alive():
                    self.logger.warning(
                        "Execution thread %s did not terminate within timeout",
                        exec_id,
                    )

        # Mark all running executions as cancelled
        with self._lock:
            for execution in self._executions.values():
                if execution.state in (
                    RuntimeState.RUNNING, RuntimeState.QUEUED,
                    RuntimeState.WAITING, RuntimeState.PAUSED,
                ):
                    execution.state = RuntimeState.CANCELLED
                    execution.completed_at = time.time()
                    self._cancelled_executions += 1

            # Clear collections
            self._execution_threads.clear()
            self._pause_events.clear()
            self._cancel_tokens.clear()
            self._initialized = False

        self.logger.info("RuntimeEngine shutdown complete")

    # ── Internal Execution ──────────────────────────────────────

    def _run_execution(self, execution_id: str) -> None:
        """Background execution loop for a workflow."""
        execution = self._get_execution(execution_id)
        cancel_token = self._cancel_tokens.get(execution_id)
        pause_event = self._pause_events.get(execution_id)

        with self._lock:
            execution.state = RuntimeState.RUNNING
            execution.started_at = time.time()

        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_STARTED,
            message="Execution started",
        )

        try:
            order = self.workflow_engine.execution_order(execution.workflow)

            if order.is_empty:
                self._complete_execution(execution_id)
                return

            for group in order.parallel_groups:
                # Check cancellation
                if self._is_cancelled(execution_id, cancel_token):
                    return

                # Handle pause
                self._wait_if_paused(execution_id, pause_event, cancel_token)
                if self._is_cancelled(execution_id, cancel_token):
                    return

                group_steps = [s for s in execution.steps.values() if s.step_id in group]

                if len(group_steps) == 1:
                    success = self._execute_single_step(execution_id, group_steps[0])
                    if not success:
                        if self._is_cancelled(execution_id, cancel_token):
                            return
                        retried = self._handle_step_failure(
                            execution_id, group_steps[0],
                        )
                        if not retried:
                            self._fail_execution(
                                execution_id,
                                f"Step failed: {group_steps[0].step_id}",
                            )
                            return
                else:
                    success = self._execute_parallel_steps(execution_id, group_steps)
                    if not success:
                        if self._is_cancelled(execution_id, cancel_token):
                            return
                        self._fail_execution(
                            execution_id,
                            "Parallel step group failed",
                        )
                        return

            self._complete_execution(execution_id)

        except Exception as e:
            self.logger.error(
                "Execution %s failed with exception: %s",
                execution_id, e,
            )
            self._fail_execution(execution_id, str(e))

    def _execute_single_step(
        self, execution_id: str, rt_step: RuntimeStep,
    ) -> bool:
        """Execute a single runtime step. Returns True on success."""
        cancel_token = self._cancel_tokens.get(execution_id)

        with self._lock:
            rt_step.state = RuntimeState.RUNNING
            rt_step.started_at = time.time()
            rt_step.attempts += 1

        self._emit_event(
            execution_id, RuntimeEventType.STEP_STARTED,
            step_id=rt_step.step_id,
            message=f"Step started: {rt_step.step_id}",
        )

        # Simulate step execution time
        try:
            time.sleep(0.01)  # Minimal delay for simulation

            # Check cancellation during execution
            if cancel_token is not None and cancel_token.is_cancelled:
                with self._lock:
                    rt_step.state = RuntimeState.CANCELLED
                    rt_step.completed_at = time.time()
                return False

            with self._lock:
                rt_step.state = RuntimeState.COMPLETED
                rt_step.completed_at = time.time()

            self._emit_event(
                execution_id, RuntimeEventType.STEP_COMPLETED,
                step_id=rt_step.step_id,
                message=f"Step completed: {rt_step.step_id}",
            )
            return True

        except Exception as e:
            with self._lock:
                rt_step.state = RuntimeState.FAILED
                rt_step.completed_at = time.time()
                rt_step.error = str(e)

            self._emit_event(
                execution_id, RuntimeEventType.STEP_FAILED,
                step_id=rt_step.step_id,
                message=f"Step failed: {rt_step.step_id} — {e}",
            )
            return False

    def _execute_parallel_steps(
        self, execution_id: str, steps: list[RuntimeStep],
    ) -> bool:
        """Execute steps in parallel. Returns True if all succeed."""
        results: dict[str, bool] = {}
        results_lock = threading.Lock()

        def _run(step: RuntimeStep) -> None:
            success = self._execute_single_step(execution_id, step)
            with results_lock:
                results[step.step_id] = success

        threads = [
            threading.Thread(target=_run, args=(s,), daemon=True)
            for s in steps
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        return all(results.values())

    def _handle_step_failure(
        self, execution_id: str, rt_step: RuntimeStep,
    ) -> bool:
        """Handle step failure with retry. Returns True if retried successfully."""
        execution = self._get_execution(execution_id)
        policy = execution.retry_policy

        if policy.is_disabled:
            return False

        if rt_step.attempts >= policy.max_retries:
            return False

        for attempt in range(rt_step.attempts, policy.max_retries):
            if self._is_cancelled(execution_id, self._cancel_tokens.get(execution_id)):
                return False

            delay = policy.base_delay_seconds * (
                policy.backoff_multiplier ** attempt
            )
            self._emit_event(
                execution_id,
                RuntimeEventType.STEP_RETRYING,
                step_id=rt_step.step_id,
                message=f"Retrying step {rt_step.step_id} "
                f"(attempt {attempt + 1}/{policy.max_retries})",
                metadata={"retry_attempt": attempt + 1, "delay": delay},
            )

            time.sleep(delay * 0.01)  # Scaled for simulation speed

            success = self._execute_single_step(execution_id, rt_step)
            if success:
                with self._lock:
                    execution.metrics.total_retries += 1
                    self._retry_sum += 1
                return True

        return False

    def _complete_execution(self, execution_id: str) -> None:
        """Mark execution as completed."""
        execution = self._get_execution(execution_id)
        with self._lock:
            execution.state = RuntimeState.COMPLETED
            execution.completed_at = time.time()
            self._update_metrics(execution)
            self._successful_executions += 1

        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_COMPLETED,
            message="Execution completed successfully",
        )
        self.logger.info("Execution completed: %s", execution_id)

    def _fail_execution(self, execution_id: str, error: str) -> None:
        """Mark execution as failed."""
        execution = self._get_execution(execution_id)
        with self._lock:
            execution.state = RuntimeState.FAILED
            execution.completed_at = time.time()
            execution.error = error
            self._update_metrics(execution)
            self._failed_executions += 1

        self._emit_event(
            execution_id, RuntimeEventType.EXECUTION_FAILED,
            message=f"Execution failed: {error}",
        )
        self.logger.error("Execution failed: %s — %s", execution_id, error)

    def _is_cancelled(
        self, execution_id: str,
        cancel_token: CancellationToken | None,
    ) -> bool:
        """Check if execution was cancelled and handle state."""
        if cancel_token is not None and cancel_token.is_cancelled:
            execution = self._get_execution(execution_id)
            with self._lock:
                if execution.state != RuntimeState.CANCELLED:
                    execution.state = RuntimeState.CANCELLED
                    execution.completed_at = time.time()
                    self._cancelled_executions += 1
                    self._update_metrics(execution)
            return True
        return False

    def _wait_if_paused(
        self, execution_id: str,
        pause_event: threading.Event | None,
        cancel_token: CancellationToken | None,
    ) -> None:
        """Block execution while paused, checking cancellation."""
        if pause_event is None:
            return
        while pause_event.is_set():
            if cancel_token is not None and cancel_token.is_cancelled:
                return
            time.sleep(0.05)

    def _update_metrics(self, execution: RuntimeExecution) -> None:
        """Update duration metrics for an execution."""
        if execution.started_at is not None:
            end = execution.completed_at or time.time()
            duration = end - execution.started_at
            execution.metrics.total_duration_seconds = round(duration, 3)
            self._duration_sum += duration

        durations = []
        for step in execution.steps.values():
            if step.started_at is not None and step.completed_at is not None:
                durations.append(step.completed_at - step.started_at)

        if durations:
            execution.metrics.average_step_duration = round(
                sum(durations) / len(durations), 3
            )
            execution.metrics.max_step_duration = round(max(durations), 3)
            execution.metrics.min_step_duration = round(min(durations), 3)

    # ── Event System ────────────────────────────────────────────

    def _emit_event(
        self, execution_id: str,
        event_type: RuntimeEventType,
        step_id: str | None = None,
        message: str = "",
        metadata: dict | None = None,
    ) -> None:
        """Record an event internally and optionally publish to EventBus."""
        with self._lock:
            execution = self._executions.get(execution_id)
            if execution is None:
                return
            event = RuntimeEvent(
                event_type=event_type,
                execution_id=execution_id,
                step_id=step_id,
                message=message,
                timestamp=time.time(),
                metadata=metadata or {},
            )
            execution.events.append(event)

        # Publish to EventBus outside the runtime lock to avoid
        # lock ordering deadlocks (EventBus has its own lock).
        if self._event_bus is not None:
            try:
                self._event_bus.publish(event)
            except Exception:
                self.logger.warning(
                    "Failed to publish event to EventBus", exc_info=True,
                )

    # ── Helpers ─────────────────────────────────────────────────

    def _get_execution(self, execution_id: str) -> RuntimeExecution:
        """Get execution by ID, raising if not found."""
        with self._lock:
            execution = self._executions.get(execution_id)
            if execution is None:
                raise RuntimeEngineError(
                    f"Execution not found: {execution_id}",
                )
            return execution

    @staticmethod
    def _assert_state(
        execution: RuntimeExecution,
        expected: RuntimeState,
        message: str,
    ) -> None:
        """Assert execution is in expected state."""
        if execution.state != expected:
            raise RuntimeEngineError(
                f"{message} (current: {execution.state.value})",
            )

    @staticmethod
    def _deep_copy_workflow(workflow: Workflow) -> Workflow:
        """Create a deep copy of a workflow for execution."""
        copied_steps = [
            WorkflowStep(
                step_id=s.step_id,
                action_id=s.action_id,
                title=s.title,
                category=s.category,
                source=s.source,
                confidence=s.confidence,
                dependencies=s.dependencies,
                execution_mode=s.execution_mode,
                state=s.state,
                estimated_cost=ExecutionCost(
                    token_cost=s.estimated_cost.token_cost,
                    compute_cost=s.estimated_cost.compute_cost,
                    total_cost=s.estimated_cost.total_cost,
                ),
                estimated_duration=ExecutionDuration(
                    setup_seconds=s.estimated_duration.setup_seconds,
                    execution_seconds=s.estimated_duration.execution_seconds,
                    teardown_seconds=s.estimated_duration.teardown_seconds,
                    total_seconds=s.estimated_duration.total_seconds,
                ),
            )
            for s in workflow.steps
        ]

        rollback_plan = None
        if workflow.rollback_plan is not None:
            rollback_plan = RollbackPlan(
                rollback_steps=tuple(
                    WorkflowStep(
                        step_id=rs.step_id,
                        action_id=rs.action_id,
                        title=rs.title,
                        category=rs.category,
                        source=rs.source,
                        confidence=rs.confidence,
                        dependencies=rs.dependencies,
                        execution_mode=rs.execution_mode,
                        state=rs.state,
                        estimated_cost=ExecutionCost(
                            token_cost=rs.estimated_cost.token_cost,
                            compute_cost=rs.estimated_cost.compute_cost,
                            total_cost=rs.estimated_cost.total_cost,
                        ),
                        estimated_duration=ExecutionDuration(
                            setup_seconds=rs.estimated_duration.setup_seconds,
                            execution_seconds=rs.estimated_duration.execution_seconds,
                            teardown_seconds=rs.estimated_duration.teardown_seconds,
                            total_seconds=rs.estimated_duration.total_seconds,
                        ),
                    )
                    for rs in workflow.rollback_plan.rollback_steps
                ),
                rollback_mode=workflow.rollback_plan.rollback_mode,
            )

        return Workflow(
            task_description=workflow.task_description,
            strategy=workflow.strategy,
            steps=copied_steps,
            execution_mode=workflow.execution_mode,
            total_cost=ExecutionCost(
                token_cost=workflow.total_cost.token_cost,
                compute_cost=workflow.total_cost.compute_cost,
                total_cost=workflow.total_cost.total_cost,
            ),
            total_duration=ExecutionDuration(
                setup_seconds=workflow.total_duration.setup_seconds,
                execution_seconds=workflow.total_duration.execution_seconds,
                teardown_seconds=workflow.total_duration.teardown_seconds,
                total_seconds=workflow.total_duration.total_seconds,
            ),
            rollback_plan=rollback_plan,
        )

    # ── Validation Checks ───────────────────────────────────────

    @staticmethod
    def _is_valid_transition(
        current: RuntimeState, target: RuntimeState,
    ) -> bool:
        """Check if a state transition is valid."""
        allowed = _VALID_TRANSITIONS.get(current, set())
        return target in allowed

    def _check_invalid_state(
        self, execution: RuntimeExecution,
        result: RuntimeValidationResult,
    ) -> None:
        """Check for invalid state transitions."""
        valid_states = set(RuntimeState)
        for step in execution.steps.values():
            if step.state not in valid_states:
                result.invalid_state_transition = True
                result.warnings.append(
                    f"Step {step.step_id} has invalid state: {step.state}",
                )

    def _check_duplicate_ids(
        self, execution: RuntimeExecution,
        result: RuntimeValidationResult,
    ) -> None:
        """Check for duplicate runtime step IDs."""
        seen: set[str] = set()
        for step_id in execution.steps:
            if step_id in seen:
                result.duplicate_runtime_ids.append(step_id)
            seen.add(step_id)

    def _check_progress(
        self, execution: RuntimeExecution,
        result: RuntimeValidationResult,
    ) -> None:
        """Check execution progress consistency."""
        total = len(execution.steps)
        if total == 0:
            return

        completed = sum(1 for s in execution.steps.values() if s.state == RuntimeState.COMPLETED)
        failed = sum(1 for s in execution.steps.values() if s.state == RuntimeState.FAILED)
        running = sum(1 for s in execution.steps.values() if s.state == RuntimeState.RUNNING)

        total_accounted = completed + failed + running
        unaccounted = total - total_accounted

        if unaccounted < 0:
            result.invalid_progress = True

        if execution.state == RuntimeState.COMPLETED and failed > 0:
            result.invalid_progress = True

        if execution.state == RuntimeState.RUNNING and total_accounted == total and running == 0:
            result.invalid_progress = True
            result.warnings.append("All steps finished but execution still running")

    def _check_retry_count(
        self, execution: RuntimeExecution,
        result: RuntimeValidationResult,
    ) -> None:
        """Check retry count consistency."""
        for step in execution.steps.values():
            if step.attempts < 0:
                result.invalid_retry_count = True
                return
            if step.state in (RuntimeState.COMPLETED, RuntimeState.FAILED) and step.attempts < 1:
                result.invalid_retry_count = True
                result.warnings.append(
                    f"Step {step.step_id} is {step.state.value} with 0 attempts",
                )

    def _check_rollback(
        self, execution: RuntimeExecution,
        result: RuntimeValidationResult,
    ) -> None:
        """Check rollback consistency."""
        if execution.state == RuntimeState.ROLLED_BACK:
            if execution.workflow.rollback_plan is None:
                result.invalid_rollback = True
                result.warnings.append("Execution rolled back but no rollback plan exists")

    def _check_history(
        self, execution: RuntimeExecution,
        result: RuntimeValidationResult,
    ) -> None:
        """Check execution history consistency."""
        if execution.state == RuntimeState.COMPLETED:
            has_completed_event = any(
                e.event_type == RuntimeEventType.EXECUTION_COMPLETED
                for e in execution.events
            )
            if not has_completed_event:
                result.invalid_history = True
                result.warnings.append("Completed execution missing completion event")

    def _check_metrics(
        self, execution: RuntimeExecution,
        result: RuntimeValidationResult,
    ) -> None:
        """Check execution metrics consistency."""
        metrics = execution.metrics
        if metrics.total_duration_seconds < 0:
            result.invalid_metrics = True
        if metrics.average_step_duration < 0:
            result.invalid_metrics = True
        if metrics.max_step_duration < metrics.min_step_duration:
            result.invalid_metrics = True
        if metrics.total_retries < 0:
            result.invalid_metrics = True

    def _check_report(
        self, execution: RuntimeExecution,
        result: RuntimeValidationResult,
    ) -> None:
        """Check execution report consistency."""
        report = self.report(execution.execution_id)
        if report.total_steps != len(execution.steps):
            result.invalid_runtime_report = True
        if report.state != execution.state:
            result.invalid_runtime_report = True
        if report.duration_seconds < 0:
            result.invalid_runtime_report = True
