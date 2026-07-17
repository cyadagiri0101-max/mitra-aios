"""Persistence — SQLite-backed storage for workflows, executions, events, and reports."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from aios.core.exceptions import EOSLoaderError
from aios.core.logger import get_logger
from aios.eos.runtime_engine import (
    ExecutionMetrics,
    ExecutionReport,
    RetryPolicy,
    RuntimeEvent,
    RuntimeEventType,
    RuntimeExecution,
    RuntimeState,
    RuntimeStep,
)
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    ExecutionMode,
    ExecutionState,
    RollbackPlan,
    Workflow,
    WorkflowStep,
)

_DEFAULT_DB_PATH = "aios_persistence.db"

_SQL_CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    task_description TEXT NOT NULL,
    strategy TEXT NOT NULL,
    execution_mode TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    rollback_json TEXT,
    total_cost_json TEXT NOT NULL,
    total_duration_json TEXT NOT NULL,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at REAL NOT NULL,
    started_at REAL,
    completed_at REAL,
    error TEXT,
    retry_policy_json TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    updated_at REAL NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE TABLE IF NOT EXISTS execution_steps (
    id TEXT NOT NULL,
    execution_id TEXT NOT NULL,
    workflow_step_json TEXT NOT NULL,
    runtime_state TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    started_at REAL,
    completed_at REAL,
    error TEXT,
    updated_at REAL NOT NULL,
    PRIMARY KEY (id, execution_id),
    FOREIGN KEY (execution_id) REFERENCES executions(id)
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    step_id TEXT,
    message TEXT DEFAULT '',
    timestamp REAL NOT NULL,
    metadata_json TEXT DEFAULT '{}',
    FOREIGN KEY (execution_id) REFERENCES executions(id)
);

CREATE TABLE IF NOT EXISTS execution_reports (
    execution_id TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    created_at REAL NOT NULL,
    FOREIGN KEY (execution_id) REFERENCES executions(id)
);

CREATE TABLE IF NOT EXISTS runtime_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at REAL NOT NULL,
    FOREIGN KEY (execution_id) REFERENCES executions(id)
);
"""


@dataclass(slots=True)
class PersistenceStatistics:
    total_workflows: int = 0
    total_executions: int = 0
    total_events: int = 0
    total_reports: int = 0
    oldest_record: float = 0.0
    newest_record: float = 0.0
    database_size_bytes: int = 0


class PersistenceStore:
    """SQLite-backed store for EOS execution artifacts.

    Thread-safe with per-operation connection management.
    """

    def __init__(self, db_path: str | Path = _DEFAULT_DB_PATH) -> None:
        self.logger = get_logger("aios.eos.persistence")
        self._db_path = Path(db_path) if str(db_path) != ":memory:" else Path(":memory:")
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self, clear_existing: bool = False) -> PersistenceStore:
        """Create tables and optionally clear existing data."""
        if str(self._db_path) != ":memory:":
            self._db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self._db_path))
        try:
            if clear_existing:
                self._drop_tables(conn)
            conn.executescript(_SQL_CREATE_TABLES)
            conn.commit()
            self._initialized = True
            self.logger.info(
                "PersistenceStore initialized at %s", self._db_path,
            )
        finally:
            conn.close()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise EOSLoaderError(
                "PersistenceStore has not been initialized — call initialize() first",
            )

    def _conn(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self._db_path))

    # ── Workflows ───────────────────────────────────────────────

    def save_workflow(self, workflow: Workflow) -> str:
        self._require_initialized()
        now = time.time()
        wf_id = getattr(workflow, "_id", None) or str(
            hash(workflow.task_description + str(now)),
        )
        with self._lock:
            conn = self._conn()
            try:
                conn.execute(
                    """INSERT OR REPLACE INTO workflows
                    (id, task_description, strategy, execution_mode,
                     steps_json, rollback_json, total_cost_json,
                     total_duration_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        wf_id,
                        workflow.task_description,
                        workflow.strategy.value,
                        workflow.execution_mode.value,
                        json.dumps([self._step_to_dict(s) for s in workflow.steps]),
                        json.dumps(self._rollback_to_dict(workflow.rollback_plan))
                        if workflow.rollback_plan else None,
                        json.dumps(self._cost_to_dict(workflow.total_cost)),
                        json.dumps(self._duration_to_dict(workflow.total_duration)),
                        now,
                        now,
                    ),
                )
                conn.commit()
            finally:
                conn.close()
        return wf_id

    def load_workflow(self, workflow_id: str) -> Workflow | None:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                row = conn.execute(
                    "SELECT * FROM workflows WHERE id = ?",
                    (workflow_id,),
                ).fetchone()
                if row is None:
                    return None
                return self._row_to_workflow(row)
            finally:
                conn.close()

    def delete_workflow(self, workflow_id: str) -> bool:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                cur = conn.execute(
                    "DELETE FROM workflows WHERE id = ?",
                    (workflow_id,),
                )
                conn.commit()
                return cur.rowcount > 0
            finally:
                conn.close()

    def list_workflows(self) -> list[dict]:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                rows = conn.execute(
                    "SELECT id, task_description, strategy, execution_mode, "
                    "created_at, updated_at FROM workflows ORDER BY created_at DESC",
                ).fetchall()
                return [
                    {
                        "id": r[0],
                        "task_description": r[1],
                        "strategy": r[2],
                        "execution_mode": r[3],
                        "created_at": r[4],
                        "updated_at": r[5],
                    }
                    for r in rows
                ]
            finally:
                conn.close()

    def workflow_count(self) -> int:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                row = conn.execute(
                    "SELECT COUNT(*) FROM workflows",
                ).fetchone()
                return row[0] if row else 0
            finally:
                conn.close()

    # ── Executions ───────────────────────────────────────────────

    def save_execution(self, execution: RuntimeExecution) -> str:
        self._require_initialized()
        now = time.time()
        with self._lock:
            conn = self._conn()
            try:
                conn.execute(
                    """INSERT OR REPLACE INTO executions
                    (id, workflow_id, state, created_at, started_at,
                     completed_at, error, retry_policy_json, metrics_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        execution.execution_id,
                        execution.workflow.task_description
                        if hasattr(execution.workflow, 'task_description')
                        else "unknown",
                        execution.state.value,
                        execution.created_at,
                        execution.started_at,
                        execution.completed_at,
                        execution.error,
                        json.dumps(self._retry_to_dict(execution.retry_policy)),
                        json.dumps(self._metrics_to_dict(execution.metrics)),
                        now,
                    ),
                )
                for step in execution.steps.values():
                    conn.execute(
                        """INSERT OR REPLACE INTO execution_steps
                        (id, execution_id, workflow_step_json, runtime_state,
                         attempts, started_at, completed_at, error, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            step.step_id,
                            execution.execution_id,
                            json.dumps(self._step_to_dict(step.workflow_step)),
                            step.state.value,
                            step.attempts,
                            step.started_at,
                            step.completed_at,
                            step.error,
                            now,
                        ),
                    )
                for event in execution.events:
                    conn.execute(
                        """INSERT INTO events
                        (execution_id, event_type, step_id, message, timestamp, metadata_json)
                        VALUES (?, ?, ?, ?, ?, ?)""",
                        (
                            execution.execution_id,
                            event.event_type.value,
                            event.step_id,
                            event.message,
                            event.timestamp,
                            json.dumps(event.metadata),
                        ),
                    )
                conn.commit()
            finally:
                conn.close()
        return execution.execution_id

    def load_execution(self, execution_id: str) -> RuntimeExecution | None:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                row = conn.execute(
                    "SELECT * FROM executions WHERE id = ?",
                    (execution_id,),
                ).fetchone()
                if row is None:
                    return None
                return self._row_to_execution(row, conn)
            finally:
                conn.close()

    def load_executions(
        self,
        state: RuntimeState | None = None,
        limit: int = 100,
    ) -> list[RuntimeExecution]:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                if state:
                    rows = conn.execute(
                        "SELECT * FROM executions WHERE state = ? ORDER BY created_at DESC LIMIT ?",
                        (state.value, limit),
                    ).fetchall()
                else:
                    rows = conn.execute(
                        "SELECT * FROM executions ORDER BY created_at DESC LIMIT ?",
                        (limit,),
                    ).fetchall()
                return [self._row_to_execution(r, conn) for r in rows]
            finally:
                conn.close()

    def delete_execution(self, execution_id: str) -> bool:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                conn.execute("DELETE FROM events WHERE execution_id = ?", (execution_id,))
                conn.execute(
                    "DELETE FROM execution_steps WHERE execution_id = ?",
                    (execution_id,),
                )
                conn.execute(
                    "DELETE FROM execution_reports WHERE execution_id = ?",
                    (execution_id,),
                )
                conn.execute(
                    "DELETE FROM runtime_snapshots WHERE execution_id = ?",
                    (execution_id,),
                )
                cur = conn.execute(
                    "DELETE FROM executions WHERE id = ?",
                    (execution_id,),
                )
                conn.commit()
                return cur.rowcount > 0
            finally:
                conn.close()

    def execution_count(self) -> int:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                row = conn.execute(
                    "SELECT COUNT(*) FROM executions",
                ).fetchone()
                return row[0] if row else 0
            finally:
                conn.close()

    # ── Events ───────────────────────────────────────────────────

    def save_event(self, execution_id: str, event: RuntimeEvent) -> int:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                conn.execute(
                    """INSERT INTO events
                    (execution_id, event_type, step_id, message, timestamp, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        execution_id,
                        event.event_type.value,
                        event.step_id,
                        event.message,
                        event.timestamp,
                        json.dumps(event.metadata),
                    ),
                )
                conn.commit()
                return conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            finally:
                conn.close()

    def load_events(
        self,
        execution_id: str | None = None,
        event_type: RuntimeEventType | None = None,
        limit: int = 1000,
    ) -> list[RuntimeEvent]:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                query = "SELECT * FROM events WHERE 1=1"
                params: list = []
                if execution_id:
                    query += " AND execution_id = ?"
                    params.append(execution_id)
                if event_type:
                    query += " AND event_type = ?"
                    params.append(event_type.value)
                query += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)
                rows = conn.execute(query, params).fetchall()
                return [self._row_to_event(r) for r in rows]
            finally:
                conn.close()

    def event_count(self) -> int:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                row = conn.execute(
                    "SELECT COUNT(*) FROM events",
                ).fetchone()
                return row[0] if row else 0
            finally:
                conn.close()

    # ── Reports ──────────────────────────────────────────────────

    def save_report(self, report: ExecutionReport) -> str:
        self._require_initialized()
        now = time.time()
        with self._lock:
            conn = self._conn()
            try:
                conn.execute(
                    """INSERT OR REPLACE INTO execution_reports
                    (execution_id, report_json, created_at)
                    VALUES (?, ?, ?)""",
                    (
                        report.execution_id,
                        json.dumps(self._report_to_dict(report)),
                        now,
                    ),
                )
                conn.commit()
            finally:
                conn.close()
        return report.execution_id

    def load_report(self, execution_id: str) -> ExecutionReport | None:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                row = conn.execute(
                    "SELECT * FROM execution_reports WHERE execution_id = ?",
                    (execution_id,),
                ).fetchone()
                if row is None:
                    return None
                return self._dict_to_report(json.loads(row[1]))
            finally:
                conn.close()

    # ── Clear / Statistics ───────────────────────────────────────

    def clear_all(self) -> None:
        self._require_initialized()
        with self._lock:
            conn = self._conn()
            try:
                self._drop_tables(conn)
                conn.executescript(_SQL_CREATE_TABLES)
                conn.commit()
            finally:
                conn.close()
        self.logger.info("PersistenceStore cleared")

    def statistics(self) -> PersistenceStatistics:
        self._require_initialized()
        stats = PersistenceStatistics()
        with self._lock:
            conn = self._conn()
            try:
                stats.total_workflows = (
                    conn.execute("SELECT COUNT(*) FROM workflows").fetchone()[0] or 0
                )
                stats.total_executions = (
                    conn.execute("SELECT COUNT(*) FROM executions").fetchone()[0] or 0
                )
                stats.total_events = (
                    conn.execute("SELECT COUNT(*) FROM events").fetchone()[0] or 0
                )
                stats.total_reports = (
                    conn.execute("SELECT COUNT(*) FROM execution_reports").fetchone()[0] or 0
                )
                row = conn.execute(
                    "SELECT MIN(created_at), MAX(created_at) FROM executions",
                ).fetchone()
                if row and row[0]:
                    stats.oldest_record = row[0]
                    stats.newest_record = row[1]
                try:
                    stats.database_size_bytes = self._db_path.stat().st_size
                except (OSError, AttributeError):
                    stats.database_size_bytes = 0
            finally:
                conn.close()
        return stats

    def validate(self) -> list[str]:
        self._require_initialized()
        warnings: list[str] = []
        with self._lock:
            conn = self._conn()
            try:
                orphan_events = conn.execute(
                    """SELECT COUNT(*) FROM events e
                    LEFT JOIN executions ex ON e.execution_id = ex.id
                    WHERE ex.id IS NULL""",
                ).fetchone()[0]
                if orphan_events:
                    warnings.append(f"{orphan_events} orphaned event(s) found")

                orphan_steps = conn.execute(
                    """SELECT COUNT(*) FROM execution_steps s
                    LEFT JOIN executions ex ON s.execution_id = ex.id
                    WHERE ex.id IS NULL""",
                ).fetchone()[0]
                if orphan_steps:
                    warnings.append(f"{orphan_steps} orphaned step(s) found")

                integrity_result = conn.execute(
                    "PRAGMA integrity_check",
                ).fetchone()
                if integrity_result and integrity_result[0] != "ok":
                    warnings.append(
                        f"Database integrity check failed: {integrity_result[0]}",
                    )
            finally:
                conn.close()
        return warnings

    # ── Internal helpers ─────────────────────────────────────────

    @staticmethod
    def _drop_tables(conn: sqlite3.Connection) -> None:
        tables = [
            "runtime_snapshots",
            "execution_reports",
            "events",
            "execution_steps",
            "executions",
            "workflows",
        ]
        for t in tables:
            conn.execute(f"DROP TABLE IF EXISTS {t}")

    @staticmethod
    def _step_to_dict(step: WorkflowStep) -> dict:
        return {
            "step_id": step.step_id,
            "action_id": step.action_id,
            "title": step.title,
            "category": step.category,
            "source": step.source,
            "confidence": step.confidence,
            "dependencies": list(step.dependencies),
            "execution_mode": step.execution_mode.value,
            "state": step.state.value,
            "estimated_cost": {
                "token_cost": step.estimated_cost.token_cost,
                "compute_cost": step.estimated_cost.compute_cost,
                "total_cost": step.estimated_cost.total_cost,
            },
            "estimated_duration": {
                "setup_seconds": step.estimated_duration.setup_seconds,
                "execution_seconds": step.estimated_duration.execution_seconds,
                "teardown_seconds": step.estimated_duration.teardown_seconds,
                "total_seconds": step.estimated_duration.total_seconds,
            },
        }

    @staticmethod
    def _dict_to_step(d: dict) -> WorkflowStep:
        return WorkflowStep(
            step_id=d["step_id"],
            action_id=d["action_id"],
            title=d["title"],
            category=d["category"],
            source=d["source"],
            confidence=d["confidence"],
            dependencies=d.get("dependencies", []),
            execution_mode=ExecutionMode(d["execution_mode"]),
            state=ExecutionState(d["state"]),
            estimated_cost=ExecutionCost(
                token_cost=d["estimated_cost"]["token_cost"],
                compute_cost=d["estimated_cost"]["compute_cost"],
                total_cost=d["estimated_cost"]["total_cost"],
            ),
            estimated_duration=ExecutionDuration(
                setup_seconds=d["estimated_duration"]["setup_seconds"],
                execution_seconds=d["estimated_duration"]["execution_seconds"],
                teardown_seconds=d["estimated_duration"]["teardown_seconds"],
                total_seconds=d["estimated_duration"]["total_seconds"],
            ),
        )

    @staticmethod
    def _rollback_to_dict(plan: RollbackPlan | None) -> dict | None:
        if plan is None:
            return None
        return {
            "rollback_steps": [
                {
                    "step_id": s.step_id,
                    "action_id": s.action_id,
                    "title": s.title,
                    "category": s.category,
                    "source": s.source,
                    "confidence": s.confidence,
                    "dependencies": list(s.dependencies),
                    "execution_mode": s.execution_mode.value,
                    "state": s.state.value,
                    "estimated_cost": {
                        "token_cost": s.estimated_cost.token_cost,
                        "compute_cost": s.estimated_cost.compute_cost,
                        "total_cost": s.estimated_cost.total_cost,
                    },
                    "estimated_duration": {
                        "setup_seconds": s.estimated_duration.setup_seconds,
                        "execution_seconds": s.estimated_duration.execution_seconds,
                        "teardown_seconds": s.estimated_duration.teardown_seconds,
                        "total_seconds": s.estimated_duration.total_seconds,
                    },
                }
                for s in plan.rollback_steps
            ],
            "rollback_mode": plan.rollback_mode.value,
        }

    @staticmethod
    def _cost_to_dict(cost: ExecutionCost) -> dict:
        return {
            "token_cost": cost.token_cost,
            "compute_cost": cost.compute_cost,
            "total_cost": cost.total_cost,
        }

    @staticmethod
    def _duration_to_dict(dur: ExecutionDuration) -> dict:
        return {
            "setup_seconds": dur.setup_seconds,
            "execution_seconds": dur.execution_seconds,
            "teardown_seconds": dur.teardown_seconds,
            "total_seconds": dur.total_seconds,
        }

    @staticmethod
    def _retry_to_dict(policy: RetryPolicy) -> dict:
        return {
            "max_retries": policy.max_retries,
            "base_delay_seconds": policy.base_delay_seconds,
            "backoff_multiplier": policy.backoff_multiplier,
        }

    @staticmethod
    def _metrics_to_dict(metrics: ExecutionMetrics) -> dict:
        return {
            "total_duration_seconds": metrics.total_duration_seconds,
            "total_retries": metrics.total_retries,
            "average_step_duration": metrics.average_step_duration,
            "max_step_duration": metrics.max_step_duration,
            "min_step_duration": metrics.min_step_duration,
        }

    @staticmethod
    def _report_to_dict(report: ExecutionReport) -> dict:
        return {
            "execution_id": report.execution_id,
            "workflow_task": report.workflow_task,
            "strategy": report.strategy,
            "execution_mode": report.execution_mode,
            "state": report.state.value,
            "created_at": report.created_at,
            "started_at": report.started_at,
            "completed_at": report.completed_at,
            "duration_seconds": report.duration_seconds,
            "total_steps": report.total_steps,
            "completed_steps": report.completed_steps,
            "failed_steps": report.failed_steps,
            "skipped_steps": report.skipped_steps,
            "total_retries": report.total_retries,
            "total_cost": {
                "token_cost": report.total_cost.token_cost,
                "compute_cost": report.total_cost.compute_cost,
                "total_cost": report.total_cost.total_cost,
            },
            "total_duration": {
                "setup_seconds": report.total_duration.setup_seconds,
                "execution_seconds": report.total_duration.execution_seconds,
                "teardown_seconds": report.total_duration.teardown_seconds,
                "total_seconds": report.total_duration.total_seconds,
            },
            "has_rollback": report.has_rollback,
            "was_rolled_back": report.was_rolled_back,
            "error": report.error,
        }

    @staticmethod
    def _dict_to_report(d: dict) -> ExecutionReport:
        return ExecutionReport(
            execution_id=d["execution_id"],
            workflow_task=d["workflow_task"],
            strategy=d["strategy"],
            execution_mode=d["execution_mode"],
            state=RuntimeState(d["state"]),
            created_at=d["created_at"],
            started_at=d["started_at"],
            completed_at=d["completed_at"],
            duration_seconds=d["duration_seconds"],
            total_steps=d["total_steps"],
            completed_steps=d["completed_steps"],
            failed_steps=d["failed_steps"],
            skipped_steps=d["skipped_steps"],
            total_retries=d["total_retries"],
            total_cost=ExecutionCost(
                token_cost=d["total_cost"]["token_cost"],
                compute_cost=d["total_cost"]["compute_cost"],
                total_cost=d["total_cost"]["total_cost"],
            ),
            total_duration=ExecutionDuration(
                setup_seconds=d["total_duration"]["setup_seconds"],
                execution_seconds=d["total_duration"]["execution_seconds"],
                teardown_seconds=d["total_duration"]["teardown_seconds"],
                total_seconds=d["total_duration"]["total_seconds"],
            ),
            has_rollback=d["has_rollback"],
            was_rolled_back=d["was_rolled_back"],
            error=d.get("error"),
        )

    def _row_to_workflow(self, row: tuple) -> Workflow:
        steps = [self._dict_to_step(s) for s in json.loads(row[4])]
        rollback_data = json.loads(row[5]) if row[5] else None
        rollback_plan = None
        if rollback_data:
            rollback_plan = RollbackPlan(
                rollback_steps=tuple(
                    self._dict_to_step(s) for s in rollback_data["rollback_steps"]
                ),
                rollback_mode=ExecutionMode(rollback_data["rollback_mode"]),
            )
        cost_data = json.loads(row[6])
        dur_data = json.loads(row[7])
        return Workflow(
            task_description=row[1],
            strategy=ExecutionMode(row[2]),
            steps=steps,
            execution_mode=ExecutionMode(row[3]),
            total_cost=ExecutionCost(
                token_cost=cost_data["token_cost"],
                compute_cost=cost_data["compute_cost"],
                total_cost=cost_data["total_cost"],
            ),
            total_duration=ExecutionDuration(
                setup_seconds=dur_data["setup_seconds"],
                execution_seconds=dur_data["execution_seconds"],
                teardown_seconds=dur_data["teardown_seconds"],
                total_seconds=dur_data["total_seconds"],
            ),
            rollback_plan=rollback_plan,
        )

    def _row_to_execution(
        self, row: tuple, conn: sqlite3.Connection,
    ) -> RuntimeExecution:
        steps_rows = conn.execute(
            "SELECT * FROM execution_steps WHERE execution_id = ?",
            (row[0],),
        ).fetchall()
        steps: dict[str, RuntimeStep] = {}
        for sr in steps_rows:
            ws = self._dict_to_step(json.loads(sr[2]))
            steps[sr[0]] = RuntimeStep(
                step_id=sr[0],
                workflow_step=ws,
                state=RuntimeState(sr[3]),
                attempts=sr[4] or 0,
                started_at=sr[5],
                completed_at=sr[6],
                error=sr[7],
            )

        events_rows = conn.execute(
            "SELECT * FROM events WHERE execution_id = ? ORDER BY timestamp ASC",
            (row[0],),
        ).fetchall()
        events = [self._row_to_event(er) for er in events_rows]

        retry_data = json.loads(row[7]) if row[7] else {}
        metrics_data = json.loads(row[8]) if row[8] else {}

        workflow_row = conn.execute(
            "SELECT * FROM workflows WHERE id = ?",
            (row[1],),
        ).fetchone()
        workflow: Workflow
        if workflow_row:
            workflow = self._row_to_workflow(workflow_row)
        else:
            step_workflow_steps = [
                s.workflow_step for s in steps.values()
            ] if steps else []
            workflow = Workflow(
                task_description=row[1],
                strategy=ExecutionMode.SEQUENTIAL,
                steps=step_workflow_steps,
                execution_mode=ExecutionMode.SEQUENTIAL,
                total_cost=ExecutionCost(),
                total_duration=ExecutionDuration(),
            )

        return RuntimeExecution(
            execution_id=row[0],
            workflow=workflow,
            state=RuntimeState(row[2]),
            steps=steps,
            events=events,
            created_at=row[3],
            started_at=row[4],
            completed_at=row[5],
            error=row[6] if len(row) > 6 else None,
            retry_policy=RetryPolicy(
                max_retries=retry_data.get("max_retries", 3),
                base_delay_seconds=retry_data.get("base_delay_seconds", 1.0),
                backoff_multiplier=retry_data.get("backoff_multiplier", 2.0),
            ),
            metrics=ExecutionMetrics(
                total_duration_seconds=metrics_data.get("total_duration_seconds", 0.0),
                total_retries=metrics_data.get("total_retries", 0),
                average_step_duration=metrics_data.get("average_step_duration", 0.0),
                max_step_duration=metrics_data.get("max_step_duration", 0.0),
                min_step_duration=metrics_data.get("min_step_duration", 0.0),
            ),
        )

    @staticmethod
    def _row_to_event(row: tuple) -> RuntimeEvent:
        return RuntimeEvent(
            event_type=RuntimeEventType(row[2]),
            execution_id=row[1],
            step_id=row[3],
            message=row[4] or "",
            timestamp=row[5],
            metadata=json.loads(row[6]) if row[6] else {},
        )
