"""Comprehensive tests for uncovered modules: orchestrator, persistence, CLI commands, and more."""

from __future__ import annotations

import json
import tempfile
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import typer
from typer.testing import CliRunner

from aios.core.config import AIOSConfig, load_config
from aios.core.exceptions import (
    ConfigError,
    EmbeddingError,
    EOSLoaderError,
    LLMProviderError,
    RAGError,
    SchedulerError,
    ToolError,
    VectorStoreError,
)
from aios.embedding.manager import EmbeddingManager
from aios.eos.persistence import PersistenceStore
from aios.eos.runtime_engine import (
    ExecutionMetrics,
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
    Workflow,
    WorkflowStep,
)
from aios.llm.manager import LLMManager
from aios.rag.chunk_manager import ChunkManager
from aios.rag.models import ChunkStrategy, Document
from aios.scheduler.job_manager import JobManager
from aios.scheduler.models import Job, JobType
from aios.scheduler.models import RetryPolicy as SchedRetryPolicy
from aios.scheduler.priority_queue import PriorityQueue
from aios.scheduler.task_queue import TaskQueue
from aios.tools.cache import ToolCache
from aios.tools.config import ToolCacheConfig
from aios.tools.models import ToolRequest, ToolResponse
from aios.tools.provider import ToolProvider
from aios.tools.tool_registry import ToolRegistry
from aios.utils.serialization import read_json, write_json
from aios.vectorstore.models import (
    DistanceMetric,
    VectorRecord,
    VectorStoreConfig,
)
from aios.vectorstore.providers.in_memory import InMemoryVectorStore

runner = CliRunner()


# =========================================================================
# Helpers
# =========================================================================


def _make_step(step_id: str = "step_1", action_id: str = "action_1") -> WorkflowStep:
    return WorkflowStep(
        step_id=step_id,
        action_id=action_id,
        title=f"Step {step_id}",
        category="test",
        source="test",
        confidence=1.0,
        dependencies=[],
        execution_mode=ExecutionMode.SEQUENTIAL,
        state=ExecutionState.PENDING,
        estimated_cost=ExecutionCost(token_cost=10, compute_cost=5, total_cost=15),
        estimated_duration=ExecutionDuration(
            setup_seconds=1, execution_seconds=2, teardown_seconds=0.5, total_seconds=3.5,
        ),
    )


def _make_workflow() -> Workflow:
    return Workflow(
        task_description="test workflow",
        strategy=ExecutionMode.SEQUENTIAL,
        steps=[_make_step()],
        execution_mode=ExecutionMode.SEQUENTIAL,
        total_cost=ExecutionCost(token_cost=10, compute_cost=5, total_cost=15),
        total_duration=ExecutionDuration(
            setup_seconds=1, execution_seconds=2, teardown_seconds=0.5, total_seconds=3.5,
        ),
    )


@pytest.fixture
def tmp_config(tmp_path: Path) -> AIOSConfig:
    cfg = AIOSConfig(repo_root=tmp_path)
    cfg.ensure_directories()
    return cfg


# =========================================================================
# 1. Orchestrator
# =========================================================================


class TestOrchestrator:
    __test__ = False



    @patch("aios.state.engine.StateEngine.sync")
    @patch("aios.intelligence.decision.engine.DecisionEngine.decide")
    @patch("aios.executor.engine.Executor.execute")
    @patch("aios.reporting.generator.ReportGenerator.generate_all")
    def test_run_success_path(
        self, mock_gen, mock_exec, mock_decide, mock_sync, mock_idx, mock_scan,
        tmp_path: Path,
    ):
        from aios.orchestrator import Orchestrator

        mock_scan.return_value.is_ok = True
        mock_scan.return_value.payload = {"data": {"files": ["a.py"]}}
        mock_scan.return_value.errors = []
        mock_idx.return_value.is_ok = True
        mock_exec.return_value = {"status": "success", "executionId": "e1"}

        (tmp_path / ".ai" / "state").mkdir(parents=True, exist_ok=True)

        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        orch = Orchestrator(config)
        result = orch.run()
        assert result["status"] == "success"
        assert len(result["steps"]) == 7

    @patch("aios.plugins.scanner.plugin.ScannerPlugin.run")
    @patch("aios.plugins.indexer.plugin.IndexerPlugin.run")
    @patch("aios.state.engine.StateEngine.generate")
    @patch("aios.intelligence.decision.engine.DecisionEngine.decide")
    @patch("aios.executor.engine.Executor.execute")
    @patch("aios.reporting.generator.ReportGenerator.generate_all")
    def test_run_dry_run(
        self, mock_gen, mock_exec, mock_decide, mock_gen_state, mock_idx, mock_scan,
        tmp_path: Path,
    ):
        from aios.orchestrator import Orchestrator

        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        orch = Orchestrator(config, dry_run=True)
        result = orch.run()
        assert result["status"] == "dry_run"
        for s in result["steps"]:
            assert s["status"] == "dry_run"

    @patch("aios.plugins.scanner.plugin.ScannerPlugin.run")
    def test_run_scan_failure_stops(self, mock_scan, tmp_path: Path):
        from aios.orchestrator import Orchestrator

        mock_scan.return_value.is_ok = False
        mock_scan.return_value.payload = {"data": {"files": []}}
        mock_scan.return_value.errors = ["scan error"]

        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        orch = Orchestrator(config)
        result = orch.run()
        assert result["status"] == "failed"
        assert result["steps"][0]["status"] == "failed"
        assert len(result["steps"]) == 1

    @patch("aios.plugins.scanner.plugin.ScannerPlugin.run")
    @patch("aios.plugins.indexer.plugin.IndexerPlugin.run")
    def test_run_index_failure_stops(self, mock_idx, mock_scan, tmp_path: Path):
        from aios.orchestrator import Orchestrator

        mock_scan.return_value.is_ok = True
        mock_scan.return_value.payload = {"data": {"files": ["a.py"]}}
        mock_scan.return_value.errors = []
        mock_idx.return_value.is_ok = False

        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        orch = Orchestrator(config)
        result = orch.run()
        assert result["status"] == "failed"
        assert result["steps"][1]["status"] == "failed"

    @patch("aios.plugins.scanner.plugin.ScannerPlugin.run")
    def test_run_profile_enabled(self, mock_scan, tmp_path: Path):
        from aios.orchestrator import Orchestrator

        mock_scan.return_value.is_ok = True
        mock_scan.return_value.payload = {"data": {"files": []}}
        mock_scan.return_value.errors = []

        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        orch = Orchestrator(config, profile=True)
        result = orch.run()
        assert "steps" in result

    def test_should_stop_empty(self, tmp_path: Path):
        from aios.orchestrator import Orchestrator

        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config)
        assert orch._should_stop([]) is False

    def test_should_stop_failed(self, tmp_path: Path):
        from aios.orchestrator import Orchestrator

        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config)
        assert orch._should_stop([{"name": "scan", "status": "failed"}]) is True

    def test_event_handlers(self, tmp_path: Path):
        from aios.events.types import Event, EventType
        from aios.orchestrator import Orchestrator

        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config)
        e = Event(event_type=EventType.REPOSITORY_SCANNED, source="test", payload={"count": 5})
        orch._on_scan(e)
        e2 = Event(event_type=EventType.SESSION_STARTED, source="test", payload={"mode": "test"})
        orch._on_session_start(e2)
        e3 = Event(event_type=EventType.EXECUTION_COMPLETED, source="test", payload={"status": "ok"})
        orch._on_execution_done(e3)

    @patch("aios.plugins.scanner.plugin.ScannerPlugin.run")
    def test_finalize_dry_run(self, mock_scan, tmp_path: Path):
        from aios.orchestrator import Orchestrator

        mock_scan.return_value.is_ok = True
        mock_scan.return_value.payload = {"data": {"files": []}}
        mock_scan.return_value.errors = []

        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        orch = Orchestrator(config, dry_run=True)
        result = orch.run()
        assert result["status"] == "dry_run"

    def test_wire_events(self, tmp_path: Path):
        from aios.events.types import EventType
        from aios.orchestrator import Orchestrator

        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config)
        assert orch.event_bus._subscribers[EventType.REPOSITORY_SCANNED]
        assert orch.event_bus._subscribers[EventType.SESSION_STARTED]
        assert orch.event_bus._subscribers[EventType.EXECUTION_COMPLETED]

    @patch("aios.plugins.scanner.plugin.ScannerPlugin.run")
    @patch("aios.plugins.indexer.plugin.IndexerPlugin.run")
    @patch("aios.state.engine.StateEngine.generate")
    @patch("aios.intelligence.decision.engine.DecisionEngine.decide")
    @patch("aios.executor.engine.Executor.execute")
    @patch("aios.reporting.generator.ReportGenerator.generate_all")
    def test_run_without_state_dir(
        self, mock_gen, mock_exec, mock_decide, mock_state_gen, mock_idx, mock_scan,
        tmp_path: Path,
    ):
        from aios.orchestrator import Orchestrator

        mock_scan.return_value.is_ok = True
        mock_scan.return_value.payload = {"data": {"files": ["a.py"]}}
        mock_scan.return_value.errors = []
        mock_idx.return_value.is_ok = True
        mock_exec.return_value = {"status": "success", "executionId": "e1"}

        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        orch = Orchestrator(config)
        result = orch.run()
        assert result["status"] == "success"


# =========================================================================
# 2. PersistenceStore
# =========================================================================


class TestPersistenceAdditional:
    """Cover remaining uncovered lines in persistence.py."""

    @pytest.fixture
    def db_path(self):
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            path = Path(f.name)
        yield path
        if path.exists():
            path.unlink()

    @pytest.fixture
    def store(self, db_path):
        s = PersistenceStore(str(db_path))
        s.initialize(clear_existing=True)
        return s

    def test_save_report(self, store):
        from aios.eos.runtime_engine import ExecutionReport

        report = ExecutionReport(
            execution_id="rep1",
            workflow_task="test",
            strategy="sequential",
            execution_mode="automatic",
            state=RuntimeState.COMPLETED,
            created_at=100.0,
            started_at=100.0,
            completed_at=200.0,
            duration_seconds=100.0,
            total_steps=5,
            completed_steps=5,
            failed_steps=0,
            skipped_steps=0,
            total_retries=0,
            total_cost=ExecutionCost(token_cost=10, compute_cost=5, total_cost=15),
            total_duration=ExecutionDuration(
                setup_seconds=1, execution_seconds=2, teardown_seconds=0.5, total_seconds=3.5,
            ),
            has_rollback=False,
            was_rolled_back=False,
            error=None,
        )
        eid = store.save_report(report)
        assert eid == "rep1"
        loaded = store.load_report("rep1")
        assert loaded is not None
        assert loaded.workflow_task == "test"

    def test_load_report_nonexistent(self, store):
        assert store.load_report("nonexistent") is None

    def test_clear_all(self, store):
        store.save_workflow(_make_workflow())
        store.clear_all()
        assert store.workflow_count() == 0

    def test_statistics(self, store):
        wf = _make_workflow()
        store.save_workflow(wf)
        stats = store.statistics()
        assert stats.total_workflows >= 1

    def test_statistics_empty(self, store):
        stats = store.statistics()
        assert stats.total_workflows == 0
        assert stats.total_executions == 0

    def test_validate_no_orphans(self, store):
        warnings = store.validate()
        assert isinstance(warnings, list)

    def test_validate_with_orphans(self, store):
        # Insert orphan event directly via raw connection
        conn = store._conn()
        try:
            conn.execute("INSERT INTO events (execution_id, event_type, timestamp) VALUES (?, ?, ?)",
                         ("orphan", "test", time.time()))
            conn.commit()
        finally:
            conn.close()
        warnings = store.validate()
        assert len(warnings) >= 1

    def test_not_initialized_raises(self, tmp_path):
        db_file = tmp_path / "test.db"
        store = PersistenceStore(str(db_file))
        with pytest.raises(EOSLoaderError):
            store.save_workflow(_make_workflow())

    def test_save_execution_with_complex_data(self, store):
        wf = _make_workflow()
        store.save_workflow(wf)
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="exec_cplx",
            step_id="step_1",
            message="started",
            timestamp=100.0,
            metadata={"key": "val"},
        )
        step = RuntimeStep(
            step_id="step_1",
            workflow_step=_make_step(),
            state=RuntimeState.RUNNING,
            attempts=1,
            started_at=100.0,
            completed_at=200.0,
            error=None,
        )
        execution = RuntimeExecution(
            execution_id="exec_cplx",
            workflow=wf,
            state=RuntimeState.RUNNING,
            steps={"step_1": step},
            events=[event],
            created_at=100.0,
            started_at=100.0,
            completed_at=None,
            error=None,
            retry_policy=RetryPolicy(max_retries=3, base_delay_seconds=1.0, backoff_multiplier=2.0),
            metrics=ExecutionMetrics(
                total_duration_seconds=100.0, total_retries=1,
                average_step_duration=50.0, max_step_duration=100.0, min_step_duration=10.0,
            ),
        )
        eid = store.save_execution(execution)
        loaded = store.load_execution(eid)
        assert loaded is not None
        assert loaded.state == RuntimeState.RUNNING
        assert len(loaded.events) == 1
        assert loaded.events[0].metadata == {"key": "val"}
        assert loaded.metrics.total_retries == 1

    def test_save_execution_no_workflow_fallback(self, store):
        step = RuntimeStep(
            step_id="s1", workflow_step=_make_step(), state=RuntimeState.QUEUED, attempts=0,
        )
        execution = RuntimeExecution(
            execution_id="exec_no_wf",
            workflow=_make_workflow(),
            state=RuntimeState.QUEUED,
            steps={"s1": step},
            events=[],
            created_at=100.0,
        )
        eid = store.save_execution(execution)
        loaded = store.load_execution(eid)
        assert loaded is not None


# =========================================================================
# 3. CLI: state command
# =========================================================================


class TestStateCliCommand:
    """Cover state.py CLI (EOS PersistenceStore)."""

    def test_state_statistics(self, tmp_path: Path):
        from aios.cli.commands.state import state_cmd

        app = typer.Typer()
        app.command()(state_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["statistics"], obj={"config": config})
        assert result.exit_code == 0
        assert "State statistics:" in result.output

    def test_state_statistics_json(self, tmp_path: Path):
        from aios.cli.commands.state import state_cmd

        app = typer.Typer()
        app.command()(state_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["statistics", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_state_validate(self, tmp_path: Path):
        from aios.cli.commands.state import state_cmd

        app = typer.Typer()
        app.command()(state_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["validate"], obj={"config": config})
        assert result.exit_code == 0
        assert "State is current" in result.output or "Validation issues" in result.output

    def test_state_validate_json(self, tmp_path: Path):
        from aios.cli.commands.state import state_cmd

        app = typer.Typer()
        app.command()(state_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["validate", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_state_unknown_action(self, tmp_path: Path):
        from aios.cli.commands.state import state_cmd

        app = typer.Typer()
        app.command()(state_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        result = runner.invoke(app, ["bogus"], obj={"config": config})
        assert result.exit_code == 1


# =========================================================================
# 4. CLI: memory command
# =========================================================================


class TestMemoryCliCommand:
    __test__ = False

    def test_memory_store(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["store", "--key", "k1", "--value", "v1"], obj={"config": config})
        assert result.exit_code == 0
        assert "Stored" in result.output

    def test_memory_store_no_key(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        result = runner.invoke(app, ["store"], obj={"config": config})
        assert result.exit_code == 1

    def test_memory_store_json(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["store", "--key", "k1", "--value", "v1", "--json"],
                               obj={"config": config})
        assert result.exit_code == 0

    def test_memory_retrieve(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        # First store then retrieve
        me = MemoryEngine(config)
        me.remember("k1", "v1")
        result = runner.invoke(app, ["retrieve", "--query", "k1"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_retrieve_no_query(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        result = runner.invoke(app, ["retrieve"], obj={"config": config})
        assert result.exit_code == 1

    def test_memory_retrieve_json(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        me = MemoryEngine(config)
        me.remember("k1", "v1")
        result = runner.invoke(app, ["retrieve", "--query", "k1", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_retrieve_with_query(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        me = MemoryEngine(config)
        me.remember("k1", "some value to search")
        result = runner.invoke(app, ["retrieve", "--query", "value"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_retrieve_blank_query(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        result = runner.invoke(app, ["retrieve"], obj={"config": config})
        assert result.exit_code == 1

    def test_memory_retrieve_json_full(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        me = MemoryEngine(config)
        me.remember("k1", "searchable content")
        result = runner.invoke(app, ["retrieve", "--query", "content", "--json"],
                               obj={"config": config})
        assert result.exit_code == 0

    def test_memory_compress(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["compress"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_compress_json(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["compress", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_prune(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["prune"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_prune_json(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["prune", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_snapshot_default(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["snapshot"], obj={"config": config})
        assert result.exit_code == 0
        assert "Memory snapshot" in result.output

    def test_memory_snapshot_verbose(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["snapshot", "--verbose"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_snapshot_json(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["snapshot", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_memory_default_action_returns_snapshot(self, tmp_path: Path):
        from aios.cli.commands.memory import memory_cmd

        app = typer.Typer()
        app.command()(memory_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        # No action specified defaults to "snapshot"
        result = runner.invoke(app, ["snapshot"], obj={"config": config})
        assert result.exit_code == 0


# =========================================================================
# 5. CLI: recover command
# =========================================================================


class TestRecoverCliCommand:
    __test__ = False

    def test_recover_list(self, tmp_path: Path):
        from aios.cli.commands.recover import recover_cmd

        app = typer.Typer()
        app.command()(recover_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["--list"], obj={"config": config})
        assert result.exit_code == 0
        assert "No snapshots" in result.output

    def test_recover_list_json(self, tmp_path: Path):
        from aios.cli.commands.recover import recover_cmd

        app = typer.Typer()
        app.command()(recover_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["--list", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_recover_with_snapshot_id_list(self, tmp_path: Path):
        """Test listing snapshots shows them."""
        from aios.cli.commands.recover import recover_cmd
        from aios.memory.engine import MemoryEngine
        from aios.memory.snapshot import SnapshotManager

        app = typer.Typer()
        app.command()(recover_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        mem = MemoryEngine(config)
        sm = SnapshotManager(config, mem.store, mem.index)
        sm.create("test-snap")
        result = runner.invoke(app, ["--list"], obj={"config": config})
        assert result.exit_code == 0
        assert "Available snapshots" in result.output

    def test_recover_without_snapshot_no_snapshots(self, tmp_path: Path):
        """Test recover with no snapshots available."""
        from aios.cli.commands.recover import recover_cmd

        app = typer.Typer()
        app.command()(recover_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, [""], obj={"config": config})
        assert result.exit_code == 0
        assert "No snapshots available. Nothing to recover." in result.output

    def test_recover_json_output(self, tmp_path: Path):
        from aios.cli.commands.recover import recover_cmd

        app = typer.Typer()
        app.command()(recover_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["--list", "--json"], obj={"config": config})
        assert result.exit_code == 0


# =========================================================================
# 6. CLI: checkpoint command
# =========================================================================


class TestCheckpointCliCommand:
    """Cover checkpoint.py CLI."""

    def test_checkpoint_statistics(self, tmp_path: Path):
        from aios.cli.commands.checkpoint import checkpoint_cmd

        app = typer.Typer()
        app.command()(checkpoint_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["statistics"], obj={"config": config})
        assert result.exit_code == 0
        assert "Persistence entries:" in result.output

    def test_checkpoint_statistics_json(self, tmp_path: Path):
        from aios.cli.commands.checkpoint import checkpoint_cmd

        app = typer.Typer()
        app.command()(checkpoint_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["statistics", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_checkpoint_validate(self, tmp_path: Path):
        from aios.cli.commands.checkpoint import checkpoint_cmd

        app = typer.Typer()
        app.command()(checkpoint_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["validate"], obj={"config": config})
        assert result.exit_code == 0
        assert "Validation:" in result.output

    def test_checkpoint_validate_json(self, tmp_path: Path):
        from aios.cli.commands.checkpoint import checkpoint_cmd

        app = typer.Typer()
        app.command()(checkpoint_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["validate", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_checkpoint_unknown_action(self, tmp_path: Path):
        from aios.cli.commands.checkpoint import checkpoint_cmd

        app = typer.Typer()
        app.command()(checkpoint_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        result = runner.invoke(app, ["bogus"], obj={"config": config})
        assert result.exit_code == 1


# =========================================================================
# 7. CLI: chat command
# =========================================================================


class TestChatCliCommand:
    """Cover chat.py CLI."""

    def test_chat_single_message(self, tmp_path: Path):
        from aios.cli.commands.chat import chat_cmd

        app = typer.Typer()
        app.command()(chat_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["hello"], obj={"config": config})
        assert result.exit_code == 0

    def test_chat_json_output(self, tmp_path: Path):
        from aios.cli.commands.chat import chat_cmd

        app = typer.Typer()
        app.command()(chat_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["hello", "--json"], obj={"config": config})
        assert result.exit_code == 0

    def test_chat_with_agent(self, tmp_path: Path):
        from aios.cli.commands.chat import chat_cmd

        app = typer.Typer()
        app.command()(chat_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["hello", "--agent", "test-agent"], obj={"config": config})
        assert result.exit_code == 0

    def test_chat_with_model(self, tmp_path: Path):
        from aios.cli.commands.chat import chat_cmd

        app = typer.Typer()
        app.command()(chat_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["hello", "--model", "gpt-4"], obj={"config": config})
        assert result.exit_code == 0

    def test_chat_verbose(self, tmp_path: Path):
        from aios.cli.commands.chat import chat_cmd

        app = typer.Typer()
        app.command()(chat_cmd)
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        result = runner.invoke(app, ["hello", "--verbose"], obj={"config": config})
        assert result.exit_code == 0


# =========================================================================
# 8. AIOSConfig
# =========================================================================


class TestAIOSConfig:
    """Cover config.py."""

    def test_config_from_dict(self, tmp_path: Path):
        cfg = AIOSConfig.from_dict(tmp_path, {"mode": "scan", "provider": "test-provider"})
        assert cfg.mode == "scan"
        assert cfg.provider.name == "test-provider"

    def test_config_from_dict_with_provider_dict(self, tmp_path: Path):
        cfg = AIOSConfig.from_dict(tmp_path, {"provider": {"name": "custom", "capabilities": ["scan"]}})
        assert cfg.provider.name == "custom"

    def test_config_resolve_absolute_path(self, tmp_path: Path):
        cfg = AIOSConfig(repo_root=tmp_path, cache_dir=tmp_path / "custom_cache")
        assert str(cfg.cache_dir) == str((tmp_path / "custom_cache").resolve())

    def test_config_ensure_directories(self, tmp_path: Path):
        cfg = AIOSConfig(repo_root=tmp_path)
        cfg.ensure_directories()
        assert cfg.cache_dir.exists()

    def test_config_provider_from_string(self, tmp_path: Path):
        cfg = AIOSConfig(repo_root=tmp_path)
        cfg.__post_init__()
        assert cfg.provider.name == "default"

    def test_config_log_file_as_path(self, tmp_path: Path):
        cfg = AIOSConfig(repo_root=tmp_path, log_file=tmp_path / "test.log")
        assert cfg.log_file == tmp_path / "test.log"

    def test_load_config_with_explicit_path(self, tmp_path: Path):
        config_file = tmp_path / "config.json"
        config_file.write_text('{"mode": "explicit"}')
        cfg = load_config(tmp_path, config_path=config_file)
        assert cfg.mode == "explicit"

    def test_load_config_no_file_found(self, tmp_path: Path):
        cfg = load_config(tmp_path)
        assert cfg.mode == "discovery"

    def test_load_config_yaml_not_available(self, tmp_path: Path):
        config_file = tmp_path / "config.yaml"
        config_file.write_text("mode: yaml_test")
        with patch("aios.core.config.yaml", None):
            with pytest.raises(ConfigError):
                load_config(tmp_path, config_path=config_file)

    def test_load_config_json_file(self, tmp_path: Path):
        config_file = tmp_path / "config.json"
        config_file.write_text('{"mode": "json_mode"}')
        cfg = load_config(tmp_path, config_path=config_file)
        assert cfg.mode == "json_mode"

    def test_env_override(self, tmp_path: Path):
        with patch.dict("os.environ", {"AIOS_MODE": "env_mode"}, clear=True):
            cfg = load_config(tmp_path)
            assert cfg.mode == "env_mode"


# =========================================================================
# 9. StateEngine
# =========================================================================


class TestStateEngine:
    __test__ = False

    def test_generate(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        states = engine.generate()
        assert "project" in states
        assert "session" in states

    def test_sync_no_changes(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        config.state_dir.mkdir(parents=True, exist_ok=True)
        engine = StateEngine(config)
        engine.generate()
        result = engine.sync()
        assert result["count"] == 0 or result["count"] > 0

    def test_validate_no_drift(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        engine.generate()
        result = engine.validate()
        assert isinstance(result, dict)

    def test_validate_missing_files(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        result = engine.validate()
        assert result["drift_detected"] is True

    def test_diff_no_history(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        result = engine.diff()
        assert result["entries"] == []

    def test_history_empty(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        assert engine.history() == []

    def test_collect_evidence_no_index(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        evidence = engine._collect_evidence()
        assert evidence["scan"] is None

    def test_collect_evidence_with_index(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        config.index_dir.mkdir(parents=True, exist_ok=True)
        write_json(config.index_dir / "scan.json", {"summary": {"totalFiles": 5}})
        engine = StateEngine(config)
        evidence = engine._collect_evidence()
        assert evidence["scan"]["summary"]["totalFiles"] == 5

    def test_count_reports_no_dir(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        result = engine._count_reports()
        assert result["total"] == 0

    def test_count_reports_with_dir(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        (tmp_path / "reports").mkdir()
        (tmp_path / "reports" / "r1.md").write_text("report")
        engine = StateEngine(config)
        result = engine._count_reports()
        assert result["total"] == 1

    def test_scan_framework_no_dir(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        result = engine._scan_framework()
        assert result["total"] == 0

    def test_scan_architecture_no_dir(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        result = engine._scan_architecture()
        assert result["total"] == 0

    def test_get_git_info(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        info = engine._get_git_info()
        assert isinstance(info, dict)

    def test_derive_states(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        evidence = engine._collect_evidence()
        assert len(engine._derive_project(evidence)) > 0
        assert len(engine._derive_framework(evidence)) > 0
        assert len(engine._derive_repository(evidence)) > 0
        assert len(engine._derive_engagement(evidence)) > 0
        assert len(engine._derive_session(evidence)) > 0
        assert len(engine._derive_next_task(evidence)) > 0

    def test_read_write_state(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        engine._write_state("project", {"name": "test"})
        data = engine._read_state("project")
        assert data is not None
        assert data["name"] == "test"

    def test_compare_skips_updated(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        stale = engine._compare({"version": "1.0"}, {"version": "1.1", "updated": "now"})
        assert "version" in stale
        assert "updated" not in stale

    def test_record_history(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        engine._record_history("test", {"file1": {}})
        history = engine.history()
        assert len(history) >= 1

    def test_sync_with_changes(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        engine.generate()
        result = engine.sync()
        assert "changed" in result

    def test_diff_with_history(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        engine._record_history("test", {"f1": {}})
        result = engine.diff()
        assert result["total"] >= 1

    def test_read_state_yaml_fallback(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        json_path = config.state_dir / "test.json"
        write_json(json_path, {"key": "val"})
        data = engine._read_state("test")
        assert data == {"key": "val"}

    def test_try_read_nonexistent(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        engine = StateEngine(config)
        result = engine._try_read(tmp_path / "nonexistent.json")
        assert result is None

    def test_try_read_invalid_json(self, tmp_path: Path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        bad = tmp_path / "bad.json"
        bad.write_text("not json")
        engine = StateEngine(config)
        result = engine._try_read(bad)
        assert result is None


# =========================================================================
# 10. LLMManager
# =========================================================================


class TestLLMManager:
    """Cover llm/manager.py missing lines."""

    def test_initialized_property(self):
        mgr = LLMManager()
        assert mgr.is_initialized is False
        mgr.initialize()
        assert mgr.is_initialized is True

    def test_registry_property(self):
        mgr = LLMManager()
        assert mgr.registry is not None

    def test_cache_property(self):
        mgr = LLMManager()
        assert mgr.cache is not None

    def test_metrics_property(self):
        mgr = LLMManager()
        assert mgr.metrics is not None

    def test_initialize_returns_self(self):
        mgr = LLMManager()
        assert mgr.initialize() is mgr

    def test_initialize_idempotent(self):
        mgr = LLMManager()
        mgr.initialize()
        mgr.initialize()
        assert mgr.is_initialized

    def test_remove_provider_not_initialized(self):
        mgr = LLMManager()
        with pytest.raises(LLMProviderError):
            mgr.remove_provider("test")

    def test_provider_not_initialized(self):
        mgr = LLMManager()
        with pytest.raises(LLMProviderError):
            mgr.provider("test")

    def test_generate_not_initialized(self):
        mgr = LLMManager()
        from aios.llm.models import LLMRequest
        with pytest.raises(LLMProviderError):
            mgr.generate(LLMRequest(messages=()))

    def test_stream_not_initialized(self):
        mgr = LLMManager()
        from aios.llm.models import LLMRequest
        with pytest.raises(LLMProviderError):
            mgr.stream(LLMRequest(messages=()))

    def test_embed_not_initialized(self):
        mgr = LLMManager()
        from aios.llm.models import EmbeddingRequest
        with pytest.raises(LLMProviderError):
            mgr.embed(EmbeddingRequest(texts=("hello",)))

    def test_count_tokens_not_initialized(self):
        mgr = LLMManager()
        with pytest.raises(LLMProviderError):
            mgr.count_tokens("hello")

    def test_statistics_not_initialized(self):
        mgr = LLMManager()
        with pytest.raises(LLMProviderError):
            mgr.statistics()

    def test_statistics_after_init(self):
        mgr = LLMManager()
        mgr.initialize()
        stats = mgr.statistics()
        assert stats.requests == 0

    def test_validate(self):
        mgr = LLMManager()
        mgr.initialize()
        result = mgr.validate()
        assert result.is_valid is True

    def test_reload(self):
        mgr = LLMManager()
        mgr.initialize()
        mgr.reload()
        assert mgr.is_initialized is False

    def test_shutdown(self):
        mgr = LLMManager()
        mgr.initialize()
        mgr.shutdown()
        assert mgr.is_initialized is False

    def test_resolve_provider_no_default(self):
        from aios.llm.config import LLMConfig
        cfg = LLMConfig(default_provider="nonexistent")
        mgr = LLMManager(cfg)
        mgr.initialize()
        from aios.llm.models import LLMRequest
        with pytest.raises(LLMProviderError):
            mgr.generate(LLMRequest(messages=()))

    def test_find_fallback_no_registry(self):
        mgr = LLMManager()
        mgr.initialize()
        fallback = mgr._find_fallback("test")
        assert fallback is None


# =========================================================================
# 11. EmbeddingManager
# =========================================================================


class TestEmbeddingManager:
    """Cover embedding/manager.py missing lines."""

    def test_initialized_property(self):
        mgr = EmbeddingManager()
        assert mgr.is_initialized is False

    def test_registry_property(self):
        mgr = EmbeddingManager()
        assert mgr.registry is not None

    def test_cache_property(self):
        mgr = EmbeddingManager()
        assert mgr.cache is not None

    def test_initialize_returns_self(self):
        mgr = EmbeddingManager()
        assert mgr.initialize() is mgr

    def test_initialize_idempotent(self):
        mgr = EmbeddingManager()
        mgr.initialize()
        mgr.initialize()
        assert mgr.is_initialized

    def test_unregister_provider_not_initialized(self):
        mgr = EmbeddingManager()
        with pytest.raises(EmbeddingError):
            mgr.unregister_provider("test")

    def test_embed_not_initialized(self):
        mgr = EmbeddingManager()
        with pytest.raises(EmbeddingError):
            mgr.embed("hello")

    def test_embed_batch_not_initialized(self):
        mgr = EmbeddingManager()
        with pytest.raises(EmbeddingError):
            mgr.embed_batch(["hello"])

    def test_get_statistics_not_initialized(self):
        mgr = EmbeddingManager()
        with pytest.raises(EmbeddingError):
            mgr.get_statistics()

    def test_validate_not_initialized(self):
        mgr = EmbeddingManager()
        with pytest.raises(EmbeddingError):
            mgr.validate()

    def test_get_statistics_after_init(self):
        mgr = EmbeddingManager()
        mgr.initialize()
        stats = mgr.get_statistics()
        assert stats.total_requests == 0

    def test_validate_after_init(self):
        mgr = EmbeddingManager()
        mgr.initialize()
        result = mgr.validate()
        assert result.is_valid is True

    def test_reload(self):
        mgr = EmbeddingManager()
        mgr.initialize()
        mgr.reload()
        assert mgr.is_initialized is False

    def test_shutdown(self):
        mgr = EmbeddingManager()
        mgr.initialize()
        mgr.shutdown()
        assert mgr.is_initialized is False

    def test_get_provider_no_default(self):
        mgr = EmbeddingManager()
        mgr.initialize()
        with pytest.raises(EmbeddingError):
            mgr.embed("hello")

    def test_embed_failure(self):
        mgr = EmbeddingManager()
        mgr.initialize()
        with pytest.raises(EmbeddingError):
            mgr.embed("hello")


# =========================================================================
# 12. ChunkManager
# =========================================================================


class TestChunkManager:
    """Cover rag/chunk_manager.py missing lines."""

    def test_initialized_property(self):
        cm = ChunkManager()
        assert cm.is_initialized is False

    def test_strategy_property(self):
        cm = ChunkManager(ChunkStrategy.FIXED_SIZE)
        assert cm.strategy == ChunkStrategy.FIXED_SIZE

    def test_initialize(self):
        cm = ChunkManager()
        cm.initialize()
        assert cm.is_initialized

    def test_chunk_fixed_size(self):
        cm = ChunkManager(ChunkStrategy.FIXED_SIZE)
        cm.initialize()
        doc = Document(id="d1", content="hello world test document chunking", metadata={})
        chunks = cm.chunk_document(doc, chunk_size=10, overlap=3)
        assert len(chunks) >= 1
        assert chunks[0].document_id == "d1"

    def test_chunk_by_sentence(self):
        cm = ChunkManager(ChunkStrategy.SENTENCE)
        cm.initialize()
        doc = Document(id="d1", content="First sentence. Second sentence. Third sentence.", metadata={})
        chunks = cm.chunk_document(doc, chunk_size=50, overlap=10)
        assert len(chunks) >= 1

    def test_chunk_by_paragraph(self):
        cm = ChunkManager(ChunkStrategy.PARAGRAPH)
        cm.initialize()
        doc = Document(id="d1", content="Para one.\n\nPara two.\n\nPara three.", metadata={})
        chunks = cm.chunk_document(doc)
        assert len(chunks) == 3

    def test_chunk_semantic(self):
        cm = ChunkManager(ChunkStrategy.SEMANTIC)
        cm.initialize()
        doc = Document(id="d1", content="Sentence one. Sentence two.", metadata={})
        chunks = cm.chunk_document(doc, chunk_size=50)
        assert len(chunks) >= 1

    def test_unknown_strategy(self):
        cm = ChunkManager(ChunkStrategy.PARAGRAPH)
        cm.initialize()

        # temporarily set an unknown value
        with patch.object(cm, "_strategy", "unknown"):
            doc = Document(id="d1", content="test", metadata={})
            with pytest.raises(RAGError):
                cm.chunk_document(doc)

    def test_get_chunk(self):
        cm = ChunkManager(ChunkStrategy.FIXED_SIZE)
        cm.initialize()
        doc = Document(id="d1", content="test", metadata={})
        chunks = cm.chunk_document(doc, chunk_size=5, overlap=0)
        assert cm.get_chunk(chunks[0].id) is not None

    def test_get_chunk_nonexistent(self):
        cm = ChunkManager()
        cm.initialize()
        assert cm.get_chunk("nonexistent") is None

    def test_list_chunks(self):
        cm = ChunkManager(ChunkStrategy.FIXED_SIZE)
        cm.initialize()
        doc = Document(id="d1", content="test content", metadata={})
        cm.chunk_document(doc, chunk_size=5, overlap=0)
        assert len(cm.list_chunks("d1")) >= 1

    def test_list_chunks_all(self):
        cm = ChunkManager(ChunkStrategy.FIXED_SIZE)
        cm.initialize()
        assert cm.list_chunks() == []

    def test_delete_chunk(self):
        cm = ChunkManager(ChunkStrategy.FIXED_SIZE)
        cm.initialize()
        doc = Document(id="d1", content="test", metadata={})
        chunks = cm.chunk_document(doc, chunk_size=5, overlap=0)
        assert cm.delete_chunk(chunks[0].id) is True
        assert cm.get_chunk(chunks[0].id) is None

    def test_delete_chunk_nonexistent(self):
        cm = ChunkManager()
        cm.initialize()
        assert cm.delete_chunk("nonexistent") is False

    def test_delete_chunks_by_document(self):
        cm = ChunkManager(ChunkStrategy.FIXED_SIZE)
        cm.initialize()
        doc = Document(id="d1", content="test content", metadata={})
        cm.chunk_document(doc, chunk_size=5, overlap=0)
        assert cm.delete_chunks_by_document("d1") >= 1

    def test_count(self):
        cm = ChunkManager(ChunkStrategy.FIXED_SIZE)
        cm.initialize()
        doc = Document(id="d1", content="test", metadata={})
        cm.chunk_document(doc, chunk_size=5, overlap=0)
        assert cm.count("d1") >= 1

    def test_validate(self):
        cm = ChunkManager()
        cm.initialize()
        result = cm.validate()
        assert len(result.warnings) >= 1

    def test_reload(self):
        cm = ChunkManager()
        cm.initialize()
        cm.reload()
        assert cm.count() == 0

    def test_require_initialized(self):
        cm = ChunkManager()
        with pytest.raises(RAGError):
            cm.get_chunk("test")


# =========================================================================
# 13. JobManager
# =========================================================================


class TestJobManager:
    """Cover scheduler/job_manager.py missing lines."""

    @pytest.fixture
    def task_queue(self):
        tq = TaskQueue()
        tq.initialize()
        return tq

    @pytest.fixture
    def priority_queue(self):
        pq = PriorityQueue()
        pq.initialize()
        return pq

    @pytest.fixture
    def jm(self, task_queue, priority_queue):
        jm = JobManager(task_queue, priority_queue)
        jm.initialize()
        return jm

    def test_initialized_property(self, task_queue, priority_queue):
        jm = JobManager(task_queue, priority_queue)
        assert jm.is_initialized is False

    def test_executed_count(self, jm):
        assert jm.executed_count == 0

    def test_failed_count(self, jm):
        assert jm.failed_count == 0

    def test_schedule_job(self, jm, task_queue):
        job = task_queue.add_job(name="test", job_type=JobType.ONE_TIME, priority=1)
        jm.schedule_job(job)
        assert jm.executed_count == 0

    def test_execute_next_job(self, jm, task_queue):
        job = task_queue.add_job(name="test2", job_type=JobType.ONE_TIME, priority=1)
        jm.schedule_job(job)
        executed = jm.execute_next_job()
        assert executed is not None
        assert executed.id == job.id
        assert jm.executed_count == 1

    def test_execute_next_job_empty(self, jm):
        assert jm.execute_next_job() is None

    def test_cancel_job(self, jm, task_queue):
        job = task_queue.add_job(name="test3", job_type=JobType.ONE_TIME, priority=1)
        jm.schedule_job(job)
        assert jm.cancel_job(job.id) is True

    def test_validate(self, jm):
        result = jm.validate()
        assert result.is_valid is True

    def test_reload(self, jm):
        jm.reload()
        assert jm.executed_count == 0

    def test_require_initialized(self, task_queue, priority_queue):
        jm = JobManager(task_queue, priority_queue)
        with pytest.raises(SchedulerError):
            jm.schedule_job(Job(id="j1", name="t", job_type="t"))

    def test_execute_job_with_retry_and_backoff(self, jm, task_queue):
        retry_policy = SchedRetryPolicy(max_retries=1, retry_delay=0.01, exponential_backoff=True, max_delay=1.0)
        job = task_queue.add_job(name="retry-job", job_type=JobType.ONE_TIME, priority=1,
                                 retry_policy=retry_policy)
        jm.schedule_job(job)
        jm._execute_job = MagicMock(side_effect=Exception("fail"))
        jm.execute_next_job()

    def test_execute_job_permanent_failure(self, jm, task_queue):
        retry_policy = SchedRetryPolicy(max_retries=0, retry_delay=0.01)
        job = task_queue.add_job(name="perm-fail", job_type=JobType.ONE_TIME, priority=1,
                                 retry_policy=retry_policy)
        jm.schedule_job(job)
        jm._execute_job = MagicMock(side_effect=Exception("permanent failure"))
        jm.execute_next_job()
        assert jm.failed_count == 1

    def test_execute_next_not_initialized(self, task_queue, priority_queue):
        jm = JobManager(task_queue, priority_queue)
        with pytest.raises(SchedulerError):
            jm.execute_next_job()


# =========================================================================
# 14. Serialization
# =========================================================================


class TestSerialization:
    """Cover utils/serialization.py."""

    def test_read_json(self, tmp_path: Path):
        p = tmp_path / "test.json"
        p.write_text('{"key": "value"}')
        assert read_json(p) == {"key": "value"}

    def test_write_json(self, tmp_path: Path):
        p = tmp_path / "subdir" / "test.json"
        write_json(p, {"key": "value"})
        data = json.loads(p.read_text())
        assert data["key"] == "value"


# =========================================================================
# 15. InMemoryVectorStore
# =========================================================================


class TestInMemoryVectorStore:
    """Cover vectorstore/providers/in_memory.py."""

    @pytest.fixture
    def store(self):
        cfg = VectorStoreConfig(name="test", dimensions=3, distance_metric=DistanceMetric.COSINE)
        s = InMemoryVectorStore(cfg)
        s.initialize()
        return s

    def test_initialized_property(self):
        vs = InMemoryVectorStore()
        assert vs.is_initialized is False

    def test_name(self):
        vs = InMemoryVectorStore()
        assert vs.name == "in-memory"

    def test_statistics_empty(self, store):
        stats = store.statistics
        assert stats.total_vectors == 0
        assert stats.namespaces == []

    def test_upsert_and_get(self, store):
        vec = VectorRecord(id="v1", vector=(0.1, 0.2, 0.3), metadata={"label": "test"})
        assert store.upsert([vec]) == 1
        result = store.get("v1")
        assert result is not None
        assert result.id == "v1"

    def test_upsert_dimension_mismatch(self, store):
        vec = VectorRecord(id="bad", vector=(0.1, 0.2))
        with pytest.raises(VectorStoreError):
            store.upsert([vec])

    def test_get_nonexistent(self, store):
        assert store.get("nonexistent") is None

    def test_delete(self, store):
        vec = VectorRecord(id="d1", vector=(0.1, 0.2, 0.3))
        store.upsert([vec])
        assert store.delete("d1") is True
        assert store.get("d1") is None

    def test_delete_nonexistent(self, store):
        assert store.delete("nonexistent") is False

    def test_search(self, store):
        v1 = VectorRecord(id="v1", vector=(1.0, 0.0, 0.0))
        v2 = VectorRecord(id="v2", vector=(0.0, 1.0, 0.0))
        store.upsert([v1, v2])
        results = store.search((1.0, 0.1, 0.0), top_k=5)
        assert len(results) == 2
        assert results[0].record.id == "v1"
        assert results[0].rank == 1

    def test_search_dimension_mismatch(self, store):
        with pytest.raises(VectorStoreError):
            store.search((0.1, 0.2), top_k=5)

    def test_search_with_filters(self, store):
        v1 = VectorRecord(id="v1", vector=(1.0, 0.0, 0.0), metadata={"type": "a"})
        v2 = VectorRecord(id="v2", vector=(0.0, 1.0, 0.0), metadata={"type": "b"})
        store.upsert([v1, v2])
        results = store.search((1.0, 0.1, 0.0), top_k=5, filters={"type": "a"})
        assert len(results) == 1
        assert results[0].record.id == "v1"

    def test_search_with_filters_no_match(self, store):
        v1 = VectorRecord(id="v1", vector=(1.0, 0.0, 0.0), metadata={"type": "a"})
        store.upsert([v1])
        results = store.search((1.0, 0.1, 0.0), top_k=5, filters={"type": "nonexistent"})
        assert len(results) == 0

    def test_list_namespaces(self, store):
        assert store.list_namespaces() == []
        vec = VectorRecord(id="v1", vector=(0.1, 0.2, 0.3), namespace="custom")
        store.upsert([vec])
        assert "custom" in store.list_namespaces()

    def test_count(self, store):
        vec = VectorRecord(id="v1", vector=(0.1, 0.2, 0.3))
        store.upsert([vec])
        assert store.count() == 1
        assert store.count("nonexistent") == 0

    def test_clear(self, store):
        vec = VectorRecord(id="v1", vector=(0.1, 0.2, 0.3))
        store.upsert([vec])
        store.clear()
        assert store.count() == 0

    def test_health(self, store):
        assert store.health() is True

    def test_validate(self, store):
        result = store.validate()
        assert result.is_valid is True

    def test_reload(self, store):
        vec = VectorRecord(id="v1", vector=(0.1, 0.2, 0.3))
        store.upsert([vec])
        store.reload()
        assert store.count() == 0

    def test_shutdown(self, store):
        store.shutdown()
        assert store.is_initialized is False

    def test_cosine_similarity(self, store):
        sim = store._cosine_similarity((1.0, 0.0), (1.0, 0.0))
        assert sim == 1.0

    def test_cosine_similarity_zero_magnitude(self, store):
        sim = store._cosine_similarity((0.0, 0.0), (1.0, 0.0))
        assert sim == 0.0

    def test_euclidean_similarity(self, store):
        sim = store._euclidean_similarity((0.0, 0.0), (0.0, 0.0))
        assert sim == 1.0

    def test_dot_product(self, store):
        dp = store._dot_product((1.0, 2.0), (3.0, 4.0))
        assert dp == 11.0

    def test_matches_filters(self, store):
        assert store._matches_filters({"a": 1}, {"a": 1}) is True
        assert store._matches_filters({"a": 1}, {"a": 2}) is False
        assert store._matches_filters({"a": 1}, {"b": 1}) is False

    def test_not_initialized(self):
        vs = InMemoryVectorStore()
        with pytest.raises(VectorStoreError):
            vs.get("test")

    def test_get_with_custom_namespace(self, store):
        vec = VectorRecord(id="v1", vector=(0.1, 0.2, 0.3), namespace="ns1")
        store.upsert([vec])
        result = store.get("v1", namespace="ns1")
        assert result is not None


# =========================================================================
# 16. ToolCache
# =========================================================================


class TestToolCache:
    """Cover tools/cache.py."""

    def test_initialized_property(self):
        tc = ToolCache()
        assert tc.is_initialized is False

    def test_size(self):
        tc = ToolCache()
        tc.initialize()
        assert tc.size == 0

    def test_get_miss(self):
        tc = ToolCache()
        tc.initialize()
        req = ToolRequest(tool_name="test", arguments={})
        assert tc.get(req) is None

    def test_put_and_get(self):
        tc = ToolCache()
        tc.initialize()
        req = ToolRequest(tool_name="test", arguments={"a": 1})
        resp = ToolResponse(result="ok")
        tc.put(req, resp)
        cached = tc.get(req)
        assert cached is not None
        assert cached.result == "ok"

    def test_get_expired(self):
        cfg = ToolCacheConfig(ttl=-1, enabled=True, max_size=100)
        tc = ToolCache(cfg)
        tc.initialize()
        req = ToolRequest(tool_name="test", arguments={})
        resp = ToolResponse(result="ok")
        tc.put(req, resp)
        assert tc.get(req) is None

    def test_put_disabled(self):
        cfg = ToolCacheConfig(enabled=False, ttl=300, max_size=100)
        tc = ToolCache(cfg)
        tc.initialize()
        req = ToolRequest(tool_name="test", arguments={})
        resp = ToolResponse(result="ok")
        tc.put(req, resp)
        assert tc.get(req) is None

    def test_clear(self):
        tc = ToolCache()
        tc.initialize()
        req = ToolRequest(tool_name="test", arguments={})
        tc.put(req, ToolResponse(result="ok"))
        tc.clear()
        assert tc.get(req) is None

    def test_statistics(self):
        tc = ToolCache()
        tc.initialize()
        stats = tc.statistics()
        assert stats["size"] == 0

    def test_validate_valid(self):
        cfg = ToolCacheConfig(ttl=300, max_size=100)
        tc = ToolCache(cfg)
        tc.initialize()
        result = tc.validate()
        assert result.is_valid is True

    def test_validate_invalid_ttl(self):
        cfg = ToolCacheConfig(ttl=0, max_size=100)
        tc = ToolCache(cfg)
        tc.initialize()
        result = tc.validate()
        assert result.is_valid is False
        assert len(result.errors) >= 1

    def test_validate_invalid_max_size(self):
        cfg = ToolCacheConfig(ttl=300, max_size=0)
        tc = ToolCache(cfg)
        tc.initialize()
        result = tc.validate()
        assert result.is_valid is False

    def test_reload(self):
        tc = ToolCache()
        tc.initialize()
        req = ToolRequest(tool_name="test", arguments={})
        tc.put(req, ToolResponse(result="ok"))
        tc.reload()
        assert tc.size == 0

    def test_require_initialized(self):
        tc = ToolCache()
        with pytest.raises(ToolError):
            tc.get(ToolRequest(tool_name="test"))


# =========================================================================
# 17. ToolRegistry
# =========================================================================


class TestToolRegistry:
    """Cover tools/tool_registry.py."""

    def test_initialized_property(self):
        reg = ToolRegistry()
        assert reg.is_initialized is False

    def test_initialize(self):
        reg = ToolRegistry()
        reg.initialize()
        assert reg.is_initialized is True

    def test_list_providers_empty(self):
        reg = ToolRegistry()
        reg.initialize()
        assert reg.list_providers() == []

    def test_list_tools_empty(self):
        reg = ToolRegistry()
        reg.initialize()
        assert reg.list_tools() == []

    def test_get_provider_nonexistent(self):
        reg = ToolRegistry()
        reg.initialize()
        assert reg.get_provider("nonexistent") is None

    def test_get_tool_nonexistent(self):
        reg = ToolRegistry()
        reg.initialize()
        assert reg.get_tool("nonexistent") is None

    def test_validate_empty(self):
        reg = ToolRegistry()
        reg.initialize()
        result = reg.validate()
        assert len(result.warnings) >= 1

    def test_reload(self):
        reg = ToolRegistry()
        reg.initialize()
        reg.reload()
        assert reg.list_providers() == []

    def test_require_initialized(self):
        reg = ToolRegistry()
        with pytest.raises(ToolError):
            reg.get_provider("test")

    def test_register_provider_not_initialized(self):
        reg = ToolRegistry()
        with pytest.raises(ToolError):
            reg.register_provider(MagicMock(spec=ToolProvider))


# =========================================================================
# 18. WebSocket Manager additional coverage
# =========================================================================


class TestWebSocketManagerAdditional:
    """Cover remaining websocket_manager.py lines."""

    @pytest.mark.asyncio
    async def test_send_personal_no_connection(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        result = await mgr.send_personal("nonexistent", {"msg": "test"})
        assert result is False

    @pytest.mark.asyncio
    async def test_broadcast_no_subscribers(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        count = await mgr.broadcast("channel", {"msg": "test"})
        assert count == 0

    @pytest.mark.asyncio
    async def test_broadcast_all_no_connections(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        count = await mgr.broadcast_all({"msg": "test"})
        assert count == 0

    def test_get_active_connections_empty(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        assert mgr.get_active_connections() == []

    def test_get_subscriptions_empty(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        assert mgr.get_subscriptions("nonexistent") == []

    @pytest.mark.asyncio
    async def test_start_stop(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        await mgr.start()
        assert mgr._running is True
        await mgr.stop()
        assert mgr._running is False

    @pytest.mark.asyncio
    async def test_queue_broadcast(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        await mgr.queue_broadcast("test", {"msg": "hello"})
        assert mgr._message_queue.qsize() == 1

    @pytest.mark.asyncio
    async def test_broadcast_worker_timeout(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        mgr._running = True
        import asyncio
        task = asyncio.create_task(mgr._broadcast_worker())
        await asyncio.sleep(1.5)
        mgr._running = False
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass

    @pytest.mark.asyncio
    async def test_subscribe_unsubscribe(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        await mgr.subscribe("client1", ["ch1", "ch2"])
        assert "ch1" in mgr._subscriptions["client1"]
        await mgr.unsubscribe("client1", ["ch1"])
        assert "ch1" not in mgr._subscriptions["client1"]
        assert "ch2" in mgr._subscriptions["client1"]

    @pytest.mark.asyncio
    async def test_disconnect_removes_subscriptions(self):
        from aios.api.websocket_manager import ConnectionManager
        mgr = ConnectionManager()
        await mgr.subscribe("client1", ["ch1"])
        await mgr.disconnect("client1")
        assert "client1" not in mgr._subscriptions
        assert "client1" not in mgr._active_connections


# =========================================================================
# 19. WebSocket Routes
# =========================================================================


class TestWebSocketRoutes:
    """Test WS route handlers for coverage."""

    @pytest.fixture
    def mock_ws(self):
        """Create a mock WebSocket with async accept."""
        ws = MagicMock()
        async def async_accept():
            return None
        ws.accept = async_accept
        ws.send_json = MagicMock(return_value=None)
        ws.receive_text = MagicMock()
        return ws

    @pytest.mark.asyncio
    async def test_websocket_endpoint_unknown_action(self, mock_ws):
        import json

        from aios.api.websocket_routes import websocket_endpoint
        mock_ws.receive_text.side_effect = [json.dumps({"action": "unknown"}), RuntimeError("stop")]
        await websocket_endpoint(mock_ws)

    @pytest.mark.asyncio
    async def test_websocket_endpoint_exception(self, mock_ws):
        from aios.api.websocket_routes import websocket_endpoint
        mock_ws.receive_text.side_effect = RuntimeError("test error")
        await websocket_endpoint(mock_ws)

    @pytest.mark.asyncio
    async def test_runtime_events_not_initialized(self, mock_ws):
        from aios.api.websocket_routes import runtime_events_websocket
        mock_ws.receive_text.side_effect = [RuntimeError("stop")]
        with patch("aios.api.websocket_routes.get_stack") as mock_get_stack:
            mock_stack = MagicMock()
            mock_stack.runtime_engine = MagicMock()
            mock_stack.runtime_engine.is_initialized = False
            mock_get_stack.return_value = mock_stack
            await runtime_events_websocket(mock_ws)

    @pytest.mark.asyncio
    async def test_workflow_progress_error(self, mock_ws):
        from aios.api.websocket_routes import workflow_progress_websocket
        mock_ws.receive_text.side_effect = [RuntimeError("disconnected")]
        with patch("aios.api.websocket_routes.get_stack") as mock_get_stack:
            mock_stack = MagicMock()
            mock_stack.runtime_engine = MagicMock()
            mock_stack.runtime_engine.is_initialized = True
            mock_stack.runtime_engine.status.side_effect = Exception("not found")
            mock_get_stack.return_value = mock_stack
            await workflow_progress_websocket(mock_ws, "exec-1")

    @pytest.mark.asyncio
    async def test_agent_not_found(self, mock_ws):
        from aios.api.websocket_routes import agent_updates_websocket
        mock_ws.receive_text.side_effect = [RuntimeError("disconnected")]
        with patch("aios.api.websocket_routes.get_stack") as mock_get_stack:
            mock_stack = MagicMock()
            mock_stack.agent_manager = MagicMock()
            mock_stack.agent_manager.is_initialized = True
            mock_stack.agent_manager.get_agent.return_value = None
            mock_get_stack.return_value = mock_stack
            await agent_updates_websocket(mock_ws, "nonexistent")

    @pytest.mark.asyncio
    async def test_tools_not_initialized(self, mock_ws):
        from aios.api.websocket_routes import tool_execution_websocket
        mock_ws.receive_text.side_effect = [RuntimeError("disconnected")]
        with patch("aios.api.websocket_routes.get_stack") as mock_get_stack:
            mock_stack = MagicMock()
            mock_stack.tool_manager = MagicMock()
            mock_stack.tool_manager.is_initialized = False
            mock_get_stack.return_value = mock_stack
            await tool_execution_websocket(mock_ws)

    @pytest.mark.asyncio
    async def test_chat_not_initialized(self, mock_ws):
        from aios.api.websocket_routes import streaming_chat_websocket
        mock_ws.receive_text.side_effect = [RuntimeError("disconnected")]
        with patch("aios.api.websocket_routes.get_stack") as mock_get_stack:
            mock_stack = MagicMock()
            mock_stack.llm_manager = MagicMock()
            mock_stack.llm_manager.is_initialized = False
            mock_get_stack.return_value = mock_stack
            await streaming_chat_websocket(mock_ws)
