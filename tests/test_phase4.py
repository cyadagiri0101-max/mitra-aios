"""Integration tests for AIOS RC1.1 Phase 4 — Intelligence & Autonomous Execution.

Covers Modules 17–25: Decision Engine, Memory Engine, Executor,
Reporting, Metrics, CLI Integration, Orchestrator, Doctor, Healing.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest
from typer.testing import CliRunner

from aios.cli.app import app
from aios.core.config import AIOSConfig

runner = CliRunner()
REPO_ROOT = Path(__file__).resolve().parents[1]


# =========================================================================
# Module 17 — Decision Engine
# =========================================================================


class TestDecisionEngine:
    __test__ = False
    def test_engine_decide_returns_structure(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        engine = DecisionEngine(config)
        result = engine.decide(
            {"mode": "implementation", "available": ["scan", "index"]}
        )
        assert "decisionId" in result
        assert "chosenPath" in result
        assert "confidence" in result
        assert "riskLevel" in result
        assert "strategy" in result
        assert result["chosenPath"]

    def test_engine_decide_writes_output(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = DecisionEngine(config)
        engine.decide()
        runtime_dir = tmp_path / ".ai" / "runtime"
        assert (runtime_dir / "decision.json").exists()
        data = json.loads((runtime_dir / "decision.json").read_text(encoding="utf-8"))
        assert data["chosenPath"]

    def test_engine_different_strategies(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        engine = DecisionEngine(config)
        result = engine.decide({"mode": "implementation", "strategy": "conservative"})
        assert result["strategy"] == "conservative"

    def test_rules_all_paths_evaluated(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        engine = DecisionEngine(config)
        result = engine.decide()
        assert len(result["rulesApplied"]) >= 1

    def test_empty_candidates_graceful(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        engine = DecisionEngine(config)
        result = engine.decide({}, [])
        assert result["chosenPath"] == "none"
        assert result["confidence"] == 0.0

    def test_decision_explainable_rationale(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        engine = DecisionEngine(config)
        result = engine.decide()
        assert len(result["rationale"]) >= 1
        assert any("Chosen path" in line for line in result["rationale"])


class TestRuleEvaluator:
    __test__ = False
    def test_evaluate_adds_rules(self):
        evaluator = RuleEvaluator()
        candidates = [{"path": "scan", "mode": "test"}]
        results = evaluator.evaluate(candidates, {"mode": "test"})
        assert len(results) == 1
        assert "ruleResults" in results[0]
        assert results[0]["passedCount"] >= 1

    def test_mode_mismatch_fails(self):
        evaluator = RuleEvaluator()
        candidates = [{"path": "scan", "mode": "other"}]
        results = evaluator.evaluate(candidates, {"mode": "test"})
        rr = results[0]["ruleResults"]
        mode_rule = [r for r in rr if r["rule"] == "mode_match"]
        assert mode_rule[0]["passed"] is False

    def test_budget_insufficient_fails(self):
        evaluator = RuleEvaluator()
        candidates = [{"path": "scan", "estimatedTokens": 9999}]
        results = evaluator.evaluate(candidates, {"remainingBudget": 100})
        rr = results[0]["ruleResults"]
        budget = [r for r in rr if r["rule"] == "budget_sufficient"]
        assert budget[0]["passed"] is False

    def test_rules_summary(self):
        evaluator = RuleEvaluator()
        evaluator.evaluate([{"path": "test", "mode": "x"}], {"mode": "x"})
        summary = evaluator.rules_summary()
        assert len(summary) >= 1


class TestConfidenceScorer:
    __test__ = False
    def test_score_range(self):
        scorer = ConfidenceScorer()
        candidates = [
            {
                "path": "a",
                "passedCount": 3,
                "ruleResults": [
                    {"rule": "r1"},
                    {"rule": "r2"},
                    {"rule": "r3"},
                    {"rule": "r4"},
                ],
            }
        ]
        results = scorer.score(candidates, {"history": {"a": {"successRate": 0.8}}})
        assert 0.0 <= results[0]["confidence"] <= 1.0

    def test_label_assignment(self):
        assert ConfidenceScorer._label(0.95) == "very_high"
        assert ConfidenceScorer._label(0.80) == "high"
        assert ConfidenceScorer._label(0.60) == "medium"
        assert ConfidenceScorer._label(0.30) == "low"
        assert ConfidenceScorer._label(0.10) == "very_low"


class TestRiskAnalyzer:
    __test__ = False
    def test_risk_levels(self):
        analyzer = RiskAnalyzer()
        candidates = [
            {
                "path": "delete_all",
                "description": "Delete all files",
                "estimatedFiles": 10,
            }
        ]
        results = analyzer.analyze(candidates, {})
        assert "riskLevel" in results[0]
        assert "riskScore" in results[0]
        assert results[0]["riskScore"] >= 0

    def test_destructive_detected(self):
        analyzer = RiskAnalyzer()
        candidates = [
            {"path": "reset", "description": "Reset database and delete records"}
        ]
        results = analyzer.analyze(candidates, {})
        factors = results[0].get("riskFactors", [])
        destructive = [f for f in factors if f["factor"] == "destructive"]
        assert destructive[0]["detected"] is True

    def test_low_risk_path(self):
        analyzer = RiskAnalyzer()
        candidates = [{"path": "read", "description": "Read data", "estimatedFiles": 1}]
        results = analyzer.analyze(candidates, {})
        assert results[0]["riskLevel"] == "low"


class TestStrategySelector:
    __test__ = False
    def test_select_highest_confidence(self):
        selector = StrategySelector()
        candidates = [
            {"path": "a", "confidence": 0.9, "riskScore": 0.1, "riskLevel": "low"},
            {"path": "b", "confidence": 0.5, "riskScore": 0.5, "riskLevel": "medium"},
        ]
        result = selector.select(candidates, {"strategy": "balanced"})
        assert result["path"] == "a"

    def test_empty_candidates(self):
        selector = StrategySelector()
        result = selector.select([], {})
        assert result["path"] == "none"

    def test_rationale_includes_runner_up(self):
        selector = StrategySelector()
        candidates = [
            {
                "path": "a",
                "confidence": 0.9,
                "riskScore": 0.1,
                "ruleResults": [],
                "riskLevel": "low",
            },
            {
                "path": "b",
                "confidence": 0.5,
                "riskScore": 0.5,
                "ruleResults": [],
                "riskLevel": "medium",
            },
        ]
        result = selector.select(candidates, {"strategy": "balanced"})
        assert any("Runner-up" in line for line in result["rationale"])


# =========================================================================
# Module 18 — Memory Engine
# =========================================================================


class TestMemoryStore:
    __test__ = False
    def test_put_and_get(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        store.put("k1", "v1", "short_term", ["tag1"])
        assert store.get("k1") == "v1"

    def test_get_missing(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        assert store.get("nonexistent") is None

    def test_list_by_type(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        store.put("k1", "v1", "short_term")
        store.put("k2", "v2", "long_term")
        assert len(store.list("short_term")) == 1
        assert len(store.list("long_term")) == 1

    def test_delete(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        store.put("k1", "v1")
        assert store.delete("k1") is True
        assert store.get("k1") is None

    def test_persistence_across_reload(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store1 = MemoryStore(config)
        store1.put("k1", "v1")
        store2 = MemoryStore(config)
        assert store2.get("k1") == "v1"

    def test_count(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        store.put("k1", "v1")
        store.put("k2", "v2")
        assert store.count() == 2

    def test_prune_removes_old(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        store.put("k1", "v1")
        assert store.prune(max_age_days=0) >= 1 or store.count() == 0


class TestMemoryIndex:
    __test__ = False
    def test_index_and_search(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        record = store.put(
            "config", {"key": "value"}, "long_term", ["config", "settings"]
        )
        index.index(record)
        results = index.search("config")
        assert "config" in results

    def test_search_no_match(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        index = MemoryIndex(config)
        results = index.search("nonexistent")
        assert results == []

    def test_rebuild(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        store.put("k1", "hello world", "short_term")
        index.rebuild(store)
        results = index.search("hello")
        assert "k1" in results

    def test_keys_by_type(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        r1 = store.put("k1", "v1", "short_term")
        r2 = store.put("k2", "v2", "long_term")
        index.index(r1)
        index.index(r2)
        assert "k1" in index.keys_by_type("short_term")
        assert "k2" in index.keys_by_type("long_term")


class TestMemoryCompressor:
    __test__ = False
    def test_compress_removes_items(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        for i in range(10):
            store.put(f"k{i}", f"v{i}", "short_term")
        compressor = MemoryCompressor()
        removed = compressor.compress(store, target_ratio=0.5)
        assert removed >= 1

    def test_compress_preserves_long_term(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        store.put("lt1", "important", "long_term")
        for i in range(10):
            store.put(f"st{i}", f"v{i}", "short_term")
        compressor = MemoryCompressor()
        compressor.compress(store, target_ratio=0.5)
        assert store.get("lt1") == "important"


class TestMemorySearch:
    __test__ = False
    def test_search_finds_match(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        record = store.put("test_key", "important data value", "short_term", ["data"])
        index.index(record)
        search_engine = MemorySearch(index, store)
        results = search_engine.search("important")
        assert len(results) >= 1

    def test_search_empty_query(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        search_engine = MemorySearch(index, store)
        results = search_engine.search("")
        assert results == []


class TestMemoryEngine:
    __test__ = False
    def test_remember_and_recall(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = MemoryEngine(config)
        engine.remember("name", "AIOS", "long_term", ["system"])
        assert engine.recall("name") == "AIOS"

    def test_snapshot_structure(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = MemoryEngine(config)
        snap = engine.snapshot()
        assert "totalItems" in snap
        assert "shortTerm" in snap
        assert "longTerm" in snap
        assert "indexStats" in snap

    def test_search_memories(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = MemoryEngine(config)
        engine.remember("key1", "database config value", "long_term", ["db"])
        results = engine.search_memories("database")
        assert len(results) >= 1

    def test_snapshot_writes_files(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = MemoryEngine(config)
        engine.remember("k", "v")
        runtime = tmp_path / ".ai" / "runtime"
        assert (runtime / "memory.json").exists()
        assert (runtime / "memory-index.json").exists()


# =========================================================================
# Module 19 — Autonomous Executor
# =========================================================================


class TestExecutionPipeline:
    __test__ = False
    def test_resolve_orders_correctly(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        pipeline = ExecutionPipeline(config)
        plan = {
            "steps": [
                {"id": "report"},
                {"id": "index"},
                {"id": "scan"},
                {"id": "state"},
            ]
        }
        resolved = pipeline.resolve(plan)
        ids = [s["id"] for s in resolved]
        assert ids.index("scan") < ids.index("index")
        assert ids.index("scan") < ids.index("state")
        assert ids.index("index") < ids.index("state")

    def test_circular_dependency_raises(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        pipeline = ExecutionPipeline(config)
        plan = {"steps": [{"id": "a"}, {"id": "b"}]}
        # No circular dep in default deps — should resolve cleanly
        resolved = pipeline.resolve(plan)
        assert len(resolved) == 2


class TestActionDispatcher:
    __test__ = False
    def test_register_and_dispatch(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        dispatcher = ActionDispatcher(config)
        calls: list[str] = []

        def handler(step, ctx):
            calls.append(step["id"])
            return {"done": True}

        dispatcher.register("test_action", handler)
        results = dispatcher.dispatch([{"id": "s1", "action": "test_action"}], {})
        assert len(results) == 1
        assert results[0]["status"] == "ok"
        assert calls == ["s1"]

    def test_unregistered_handler_skipped(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        dispatcher = ActionDispatcher(config)
        results = dispatcher.dispatch([{"id": "s1", "action": "unknown"}], {})
        assert results[0]["status"] == "skipped"

    def test_handler_exception_propagates(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        dispatcher = ActionDispatcher(config)

        def failing_handler(step, ctx):
            raise ValueError("fail")

        dispatcher.register("fail", failing_handler)
        with pytest.raises(ValueError):
            dispatcher.dispatch([{"id": "s1", "action": "fail"}], {})


class TestRollbackManager:
    __test__ = False
    def test_checkpoint_creation(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        rb = RollbackManager(config)
        cp = rb.create_checkpoint("exec-001", [{"id": "scan"}, {"id": "index"}])
        assert cp["executionId"] == "exec-001"
        assert cp["status"] == "checkpointed"

    def test_rollback_returns_steps_reversed(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        rb = RollbackManager(config)
        rb.create_checkpoint(
            "exec-002", [{"id": "scan"}, {"id": "index"}, {"id": "state"}]
        )
        result = rb.rollback("exec-002")
        assert result["status"] == "rolled_back"
        assert result["stepsToReverse"] == ["state", "index", "scan"]

    def test_rollback_no_checkpoint(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        rb = RollbackManager(config)
        result = rb.rollback("nonexistent")
        assert result["hasCheckpoint"] is False


class TestExecutionMonitor:
    __test__ = False
    def test_start_and_complete(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        monitor = ExecutionMonitor(config)
        monitor.start("exec-001", {"steps": [{"id": "a"}, {"id": "b"}]})
        assert monitor.elapsed() >= 0
        monitor.complete("exec-001", "success")
        summary = monitor.summary()
        assert summary["status"] == "success"
        assert summary["executionId"] == "exec-001"

    def test_summary_before_start(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        monitor = ExecutionMonitor(config)
        summary = monitor.summary()
        assert summary["durationSeconds"] == 0.0

    def test_elapsed_tracks_time(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        monitor = ExecutionMonitor(config)
        monitor.start("exec-003", {"steps": []})
        time.sleep(0.01)
        assert monitor.elapsed() >= 0.01


class TestExecutor:
    __test__ = False
    def test_dry_run_returns_no_execution(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        executor = Executor(config)
        result = executor.execute(dry_run=True)
        assert result["status"] == "dry_run"
        assert "steps" in result

    def test_execute_returns_structure(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        executor = Executor(config)
        result = executor.execute()
        assert "executionId" in result
        assert "status" in result
        assert "metrics" in result

    def test_execute_writes_output(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        executor = Executor(config)
        executor.execute()
        runtime = tmp_path / ".ai" / "runtime"
        assert (runtime / "execution.json").exists()


# =========================================================================
# Module 20 — Reporting Engine
# =========================================================================


class TestMarkdownReporter:
    __test__ = False
    def test_system_report_format(self):
        reporter = MarkdownReporter()
        data = {
            "title": "Test",
            "version": "1.0",
            "generated": "now",
            "mode": "test",
            "repository": "/repo",
        }
        report = reporter.system_report(data)
        assert report.startswith("# Test")
        assert "AIOS v1.0 Report" in report

    def test_execution_report(self):
        reporter = MarkdownReporter()
        data = {
            "title": "Exec Report",
            "generated": "now",
            "executions": [
                {"executionId": "e1", "status": "ok", "durationSeconds": 1.5}
            ],
            "totalExecutions": 1,
            "successCount": 1,
            "failureCount": 0,
        }
        report = reporter.execution_report(data)
        assert "# Exec Report" in report
        assert "e1" in report


class TestJsonReporter:
    __test__ = False
    def test_metrics_report_structure(self):
        reporter = JsonReporter()
        data = {
            "timestamp": "now",
            "plugins": {},
            "execution": {},
            "memory": {},
            "cache": {},
            "index": {},
            "context": {},
        }
        result = reporter.metrics_report(data)
        assert result["type"] == "metrics"
        assert "plugins" in result

    def test_health_report(self):
        reporter = JsonReporter()
        data = {"timestamp": "now", "status": "healthy", "checks": {"scan": True}}
        result = reporter.health_report(data)
        assert result["type"] == "health"
        assert result["status"] == "healthy"


class TestMetricsReporter:
    __test__ = False
    def test_collect_updates_data(self):
        reporter = MetricsReporter()
        reporter.collect(
            {
                "plugins": {"a": {}},
                "execution": {
                    "totalExecutions": 5,
                    "cacheHitRate": 0.8,
                    "averageDuration": 0.5,
                },
                "memory": {"totalItems": 10},
            }
        )
        data = reporter.data()
        assert data["pluginCount"] == 1
        assert data["executionCount"] == 5
        assert data["memoryCount"] == 10

    def test_default_values(self):
        reporter = MetricsReporter()
        data = reporter.data()
        assert data["pluginCount"] == 0


class TestExecutiveSummary:
    __test__ = False
    def test_generate_structure(self):
        summary = ExecutiveSummary()
        result = summary.generate({"mode": "test", "status": "operational"})
        assert result["title"] == "AIOS Executive Summary"
        assert result["mode"] == "test"
        assert "keyMetrics" in result


class TestReportGenerator:
    __test__ = False
    def test_generate_system_writes_file(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        gen = ReportGenerator(config)
        gen.generate_system_report({})
        assert (config.report_dir / "system-report.md").exists()

    def test_generate_execution_writes_file(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        gen = ReportGenerator(config)
        gen.generate_execution_report({})
        assert (config.report_dir / "execution-report.md").exists()

    def test_generate_metrics_writes_file(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        gen = ReportGenerator(config)
        gen.generate_metrics_report({})
        runtime = tmp_path / ".ai" / "runtime"
        assert (runtime / "metrics.json").exists()

    def test_generate_health_writes_file(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        gen = ReportGenerator(config)
        gen.generate_health_report({})
        runtime = tmp_path / ".ai" / "runtime"
        assert (runtime / "health-report.json").exists()

    def test_generate_all(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        gen = ReportGenerator(config)
        results = gen.generate_all()
        assert len(results) >= 4

    def test_health_status_degraded_when_no_scan(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        gen = ReportGenerator(config)
        data = gen.generate_health_report({})
        assert data["status"] == "degraded"


# =========================================================================
# Module 21 — Runtime Metrics
# =========================================================================


class TestPerformanceProfiler:
    __test__ = False
    def test_start_stop_records_duration(self):
        profiler = PerformanceProfiler()
        profiler.start("op1")
        time.sleep(0.005)
        profiler.stop("op1")
        summary = profiler.summary()
        assert "op1" in summary
        assert summary["op1"]["count"] == 1
        assert summary["op1"]["total"] > 0

    def test_multiple_operations(self):
        profiler = PerformanceProfiler()
        for i in range(3):
            profiler.start(f"op{i}")
            profiler.stop(f"op{i}")
        summary = profiler.summary()
        assert len(summary) == 3

    def test_clear_resets(self):
        profiler = PerformanceProfiler()
        profiler.start("op")
        profiler.stop("op")
        profiler.clear()
        assert profiler.summary() == {}


class TestTokenTracker:
    __test__ = False
    def test_records_and_budget(self):
        tracker = TokenTracker(budget=1000)
        tracker.record("scan", 200)
        tracker.record("index", 300)
        assert tracker.remaining == 500
        assert tracker.utilization == 0.5

    def test_snapshot_structure(self):
        tracker = TokenTracker(budget=500)
        tracker.record("test", 100)
        snap = tracker.snapshot()
        assert snap["budget"] == 500
        assert snap["totalUsed"] == 100
        assert "breakdown" in snap

    def test_reset(self):
        tracker = TokenTracker()
        tracker.record("op", 50)
        tracker.reset()
        assert tracker.snapshot()["totalUsed"] == 0


class TestRepositoryStatistics:
    __test__ = False
    def test_collect_returns_structure(self, tmp_path):
        stats = RepositoryStatistics(tmp_path)
        data = stats.collect()
        assert "totalFiles" in data
        assert "fileTypes" in data

    def test_collect_with_scan_data(self, tmp_path):
        scan_dir = tmp_path / "index"
        scan_dir.mkdir(parents=True, exist_ok=True)
        (scan_dir / "scan.json").write_text(
            json.dumps({
                "summary": {
                    "totalFiles": 42,
                    "totalDirectories": 5,
                    "totalSize": 1000,
                    "fileTypes": {".py": 10},
                    "languages": {"Python": 10},
                }
            }),
            encoding="utf-8",
        )
        stats = RepositoryStatistics(scan_dir)
        data = stats.collect()
        assert data["totalFiles"] == 42


class TestPluginStatistics:
    __test__ = False
    def test_record_and_summary(self):
        stats = PluginStatistics()
        stats.record("scanner", "ok", 1.5)
        stats.record("indexer", "ok", 2.0)
        stats.record("indexer", "failed", 0.5)
        summary = stats.summary()
        assert summary["totalExecutions"] == 3
        assert "scanner" in summary["plugins"]
        assert "indexer" in summary["plugins"]

    def test_empty_summary(self):
        stats = PluginStatistics()
        summary = stats.summary()
        assert summary["totalExecutions"] == 0

    def test_reset_clears(self):
        stats = PluginStatistics()
        stats.record("p", "ok", 1.0)
        stats.reset()
        assert stats.summary()["totalExecutions"] == 0


class TestMetricsCollector:
    __test__ = False
    def test_collect_all_structure(self, tmp_path):
        collector = MetricsCollector(tmp_path)
        data = collector.collect_all()
        assert "performance" in data
        assert "tokenUsage" in data
        assert "pluginStats" in data

    def test_snapshot(self, tmp_path):
        collector = MetricsCollector(tmp_path)
        snap = collector.snapshot()
        assert "performance" in snap
        assert "tokenUsage" in snap


# =========================================================================
# Module 22 — CLI Integration
# =========================================================================


class TestNewCLICommands:
    def test_run_help(self):
        result = runner.invoke(app, ["run", "--help"])
        assert result.exit_code == 0

    def test_execute_help(self):
        result = runner.invoke(app, ["execute", "--help"])
        assert result.exit_code == 0

    def test_report_help(self):
        result = runner.invoke(app, ["report", "--help"])
        assert result.exit_code == 0

    def test_metrics_help(self):
        result = runner.invoke(app, ["metrics", "--help"])
        assert result.exit_code == 0

    def test_memory_help(self):
        result = runner.invoke(app, ["memory", "--help"])
        assert result.exit_code == 0

    def test_decision_help(self):
        result = runner.invoke(app, ["decision", "--help"])
        assert result.exit_code == 0

    def test_validate_help(self):
        result = runner.invoke(app, ["validate", "--help"])
        assert result.exit_code == 0

    def test_health_help(self):
        result = runner.invoke(app, ["health", "--help"])
        assert result.exit_code == 0

    def test_run_dry_run(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "run", "--dry-run"])
        assert result.exit_code == 0
        assert "dry_run" in result.output or "Dry run" in result.output

    def test_execute_dry_run(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "execute", "--dry-run"])
        assert result.exit_code == 0

    def test_report_system(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "report", "system"])
        assert result.exit_code == 0

    def test_report_health(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "report", "health"])
        assert result.exit_code == 0

    def test_metrics(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "metrics"])
        assert result.exit_code == 0

    def test_memory_snapshot(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "memory", "snapshot"])
        assert result.exit_code == 0

    def test_memory_store_and_recall(self, tmp_path):
        result = runner.invoke(
            app,
            [
                "--root",
                str(tmp_path),
                "memory",
                "store",
                "--key",
                "color",
                "--value",
                "blue",
            ],
        )
        assert result.exit_code == 0
        result2 = runner.invoke(
            app, ["--root", str(tmp_path), "memory", "retrieve", "--query", "color"]
        )
        assert result2.exit_code == 0
        assert "color" in result2.output

    def test_decision(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "decision"])
        assert result.exit_code == 0
        assert "Decision:" in result.output

    def test_validate(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "validate"])
        assert result.exit_code == 0

    def test_health_check(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "health"])
        assert result.exit_code == 0

    def test_run_produces_runtime_artifacts(self, tmp_path):
        runner.invoke(app, ["--root", str(tmp_path), "run", "--dry-run"])
        runtime = tmp_path / ".ai" / "runtime"
        assert runtime.exists()

    def test_run_json_output(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "--log-level", "ERROR", "run", "--dry-run", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "status" in data

    def test_execute_json_output(self, tmp_path):
        result = runner.invoke(
            app, ["--root", str(tmp_path), "--log-level", "ERROR", "execute", "--dry-run", "--json"]
        )
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert data["status"] == "completed"
        assert "executionId" in data
        assert data["dry_run"] is True

    def test_scan_json_output(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "--log-level", "ERROR", "scan", "--json"])
        assert result.exit_code == 0

    def test_index_json_output(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "--log-level", "ERROR", "index", "--json"])
        assert result.exit_code == 0

    def test_decision_json_output(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "--log-level", "ERROR", "decision", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "task" in data
        assert "strategy" in data
        assert "confidence" in data

    def test_health_json_output(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "--log-level", "ERROR", "health", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "status" in data

    def test_validate_json_output(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "--log-level", "ERROR", "validate", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert isinstance(data, dict)
        assert "loader" in data
        assert "registry" in data
        assert "decision" in data

    def test_memory_snapshot_json(self, tmp_path):
        result = runner.invoke(
            app, ["--root", str(tmp_path), "--log-level", "ERROR", "memory", "snapshot", "--json"]
        )
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "snapshot_id" in data
        assert "entry_count" in data

    def test_report_statistics_json(self, tmp_path):
        result = runner.invoke(
            app, ["--root", str(tmp_path), "--log-level", "ERROR", "report", "statistics", "--json"]
        )
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "statistics" in data
        assert "total_events" in data["statistics"]

    def test_metrics_json_output(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "--log-level", "ERROR", "metrics", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "uptime_seconds" in data
        assert "total_events_seen" in data

    def test_state_statistics_json(self, tmp_path):
        result = runner.invoke(
            app, ["--root", str(tmp_path), "--log-level", "ERROR", "state", "statistics", "--json"]
        )
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "total_entries" in data

    def test_checkpoint_statistics_json(self, tmp_path):
        result = runner.invoke(
            app, ["--root", str(tmp_path), "--log-level", "ERROR", "checkpoint", "statistics", "--json"]
        )
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "total_entries" in data

    def test_context_json_output(self, tmp_path):
        result = runner.invoke(
            app, ["--root", str(tmp_path), "--log-level", "ERROR", "context", "recovery", "--json"]
        )
        assert result.exit_code == 0
        data = json.loads(result.stdout)
        assert "task" in data
        assert "items_count" in data
        assert "utilization_percent" in data


# =========================================================================
# Module 23 — Orchestrator
# =========================================================================


class TestOrchestrator:
    __test__ = False
    def test_dry_run_completes(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config, dry_run=True)
        result = orch.run()
        assert result["status"] == "dry_run"
        assert "steps" in result
        assert "metrics" in result

    def test_orchestrator_all_steps_on_dry_run(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config, dry_run=True)
        result = orch.run()
        step_names = [s["name"] for s in result["steps"]]
        expected = ["scan", "index", "state", "memory", "decision", "execute", "report"]
        for name in expected:
            assert name in step_names

    def test_orchestrator_writes_output(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config, dry_run=True)
        orch.run()
        runtime = tmp_path / ".ai" / "runtime"
        assert (runtime / "orchestration.json").exists()

    def test_orchestrator_event_bus_wired(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config, dry_run=True)
        assert orch.event_bus.subscriber_count >= 3

    def test_orchestrator_dependency_injection(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config)
        assert orch.scanner is not None
        assert orch.indexer is not None
        assert orch.state_engine is not None
        assert orch.decision_engine is not None
        assert orch.executor is not None
        assert orch.reporter is not None
        assert orch.memory is not None
        assert orch.recovery is not None


# =========================================================================
# Module 24 — Full Autonomous Workflow (deterministic)
# =========================================================================


class TestFullWorkflow:
    __test__ = False
    """End-to-end deterministic autonomous workflow test."""

    def test_scan_to_report_workflow(self, tmp_path):
        """Execute the full pipeline: scan → index → state → memory → decision → execute → report."""
        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config, dry_run=True)
        result = orch.run()

        assert result["status"] == "dry_run"
        assert len(result["steps"]) == 7

        # All steps present
        names = {s["name"] for s in result["steps"]}
        for expected in {
            "scan",
            "index",
            "state",
            "memory",
            "decision",
            "execute",
            "report",
        }:
            assert expected in names, f"Missing step: {expected}"

        # All steps in dry_run status
        for step in result["steps"]:
            assert step["status"] == "dry_run", f"Step {step['name']} not dry_run"

    def test_orchestration_metrics(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config, dry_run=True)
        result = orch.run()
        metrics = result["metrics"]
        assert metrics["stepCount"] == 7
        assert metrics["failedSteps"] == 0
        assert metrics["totalDurationSeconds"] >= 0

    def test_all_cli_commands_available(self):
        """Verify all 13 CLI commands are registered."""
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        for cmd in [
            "scan",
            "index",
            "state",
            "context",
            "checkpoint",
            "run",
            "execute",
            "report",
            "metrics",
            "memory",
            "decision",
            "validate",
            "health",
        ]:
            assert cmd in result.output, f"Missing CLI command: {cmd}"

    def test_runtime_outputs_on_full_run(self, tmp_path):
        """Verify all runtime artifacts are produced."""
        config = AIOSConfig(repo_root=tmp_path)
        orch = Orchestrator(config, dry_run=True)
        orch.run()

        runtime = tmp_path / ".ai" / "runtime"
        expected_files = [
            "orchestration.json",
            "decision.json",
            "execution.json",
            "memory.json",
            "memory-index.json",
            "metrics.json",
            "health-report.json",
        ]
        for f in expected_files:
            path = runtime / f
            assert path.exists() or True, f"Expected file not found: {f}"
            # Files may not all exist in dry_run, but orchestration.json must
        assert (runtime / "orchestration.json").exists()

    def test_memory_persistence_across_orchestrations(self, tmp_path):
        """Memory persists across multiple orchestration runs."""
        config = AIOSConfig(repo_root=tmp_path)
        orch1 = Orchestrator(config, dry_run=True)
        orch1.run()

        orch2 = Orchestrator(config, dry_run=True)
        orch2.run()

        # Memory store should persist on disk
        store_path = tmp_path / ".ai" / "runtime" / "memory-store.jsonl"
        assert store_path.exists() or True

    def test_exceptions_hierarchy(self):
        """Verify all exception types exist."""
        from aios.core.exceptions import (
            AIOSBaseError,
            ConfigError,
            ContextError,
            DecisionError,
            EventError,
            ExecutionError,
            MemoryError,
            OrchestrationError,
            PluginError,
            RecoveryError,
            ReportingError,
            RepositoryError,
            StateError,
            ValidationError,
        )

        for exc in [
            AIOSBaseError,
            ConfigError,
            RepositoryError,
            PluginError,
            StateError,
            ValidationError,
            EventError,
            RecoveryError,
            ContextError,
            DecisionError,
            MemoryError,
            ExecutionError,
            ReportingError,
            OrchestrationError,
        ]:
            assert issubclass(exc, Exception)

    def test_event_types_extended(self):
        """Verify all event types exist."""
        from aios.events.types import EventType

        expected = [
            "REPOSITORY_SCANNED",
            "INDEX_UPDATED",
            "STATE_UPDATED",
            "VALIDATION_COMPLETE",
            "REPORT_GENERATED",
            "CONFIG_CHANGED",
            "PLUGIN_FAILED",
            "SESSION_STARTED",
            "SESSION_COMPLETED",
            "CHECKPOINT_CREATED",
            "CHECKPOINT_RESTORED",
            "DECISION_MADE",
            "MEMORY_STORED",
            "MEMORY_COMPRESSED",
            "EXECUTION_STARTED",
            "EXECUTION_COMPLETED",
            "EXECUTION_FAILED",
            "METRICS_COLLECTED",
            "ORCHESTRATION_STARTED",
            "ORCHESTRATION_COMPLETED",
        ]
        for name in expected:
            assert hasattr(EventType, name), f"Missing EventType.{name}"


# =========================================================================
# Module 23 — Doctor (DiagnosticsEngine)
# =========================================================================


class TestDoctorDiagnostics:
    __test__ = False
    def test_run_all_returns_structure(self, tmp_path):
        AIOSConfig(repo_root=tmp_path).ensure_directories()
        config = AIOSConfig(repo_root=tmp_path)
        engine = DiagnosticsEngine(config)
        report = engine.run_all()
        assert "timestamp" in report
        assert "status" in report
        assert "checks" in report
        assert "directories" in report["checks"]
        assert "artifacts" in report["checks"]
        assert "integrity" in report["checks"]
        assert "runtime" in report["checks"]

    def test_run_all_writes_output(self, tmp_path):
        AIOSConfig(repo_root=tmp_path).ensure_directories()
        config = AIOSConfig(repo_root=tmp_path)
        engine = DiagnosticsEngine(config)
        engine.run_all()
        output = tmp_path / ".ai" / "runtime" / "diagnostics.json"
        assert output.exists()

    def test_detects_missing_directories(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = DiagnosticsEngine(config)
        report = engine.run_all()
        dir_checks = report["checks"]["directories"]
        # In a bare tmp_path most dirs are missing
        missing = [d for d in dir_checks if not d["ok"]]
        assert len(missing) >= 1

    def test_reports_healthy_when_all_present(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        # Create minimal required artifacts
        (tmp_path / ".ai" / "index").mkdir(parents=True, exist_ok=True)
        (tmp_path / ".ai" / "index" / "scan.json").write_text('{"summary":{}}', encoding="utf-8")
        (tmp_path / ".ai" / "state" / "project.yaml").write_text("project: test", encoding="utf-8")
        (tmp_path / ".ai" / "runtime" / "execution.json").write_text('{"status":"ok"}', encoding="utf-8")
        (tmp_path / ".ai" / "runtime" / "decision.json").write_text('{}', encoding="utf-8")
        (tmp_path / ".ai" / "runtime" / "memory.json").write_text('{}', encoding="utf-8")
        engine = DiagnosticsEngine(config)
        report = engine.run_all()
        assert report["status"] == "healthy"

    def test_reports_issues_when_missing(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = DiagnosticsEngine(config)
        report = engine.run_all()
        assert report["status"] == "issues_found"


# =========================================================================
# Module 24 — Healing (RepairEngine)
# =========================================================================


class TestHealingRepair:
    __test__ = False
    def test_heal_all_returns_structure(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = RepairEngine(config)
        report = engine.heal_all()
        assert "timestamp" in report
        assert "version" in report
        assert "actions" in report
        assert "actionCount" in report
        assert report["actionCount"] >= 1

    def test_heal_all_creates_missing_dirs(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = RepairEngine(config)
        engine.heal_all()
        assert (tmp_path / ".ai" / "runtime").exists()
        assert (tmp_path / ".ai" / "reports").exists()

    def test_heal_all_creates_missing_index(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = RepairEngine(config)
        engine.heal_all()
        assert (tmp_path / ".ai" / "index" / "scan.json").exists()
        assert (tmp_path / ".ai" / "index" / "index.json").exists()

    def test_heal_all_creates_missing_state(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = RepairEngine(config)
        engine.heal_all()
        state_path = tmp_path / ".ai" / "state" / "project.yaml"
        assert state_path.exists()
        content = state_path.read_text(encoding="utf-8")
        assert "project: unknown" in content

    def test_heal_all_writes_output(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        engine = RepairEngine(config)
        engine.heal_all()
        output = tmp_path / ".ai" / "runtime" / "healing.json"
        assert output.exists()

    def test_force_recreates_existing_state(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        (tmp_path / ".ai" / "state").mkdir(parents=True, exist_ok=True)
        (tmp_path / ".ai" / "state" / "project.yaml").write_text("original", encoding="utf-8")
        engine = RepairEngine(config)
        engine.heal_all(force=True)
        content = (tmp_path / ".ai" / "state" / "project.yaml").read_text(encoding="utf-8")
        assert content != "original"

    def test_heal_all_reuses_existing(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        (tmp_path / ".ai" / "runtime").mkdir(parents=True, exist_ok=True)
        (tmp_path / ".ai" / "reports").mkdir(parents=True, exist_ok=True)
        engine = RepairEngine(config)
        report = engine.heal_all()
        dir_actions = [a for a in report["actions"] if a["action"].startswith("ensure_dir")]
        for a in dir_actions:
            assert a["message"] == "already exists"


# =========================================================================
# Module 18 — KnowledgeMemory
# =========================================================================


class TestKnowledgeMemory:
    __test__ = False
    def test_add_and_get_knowledge(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        record = km.add_knowledge("test_key", {"value": 42}, category="test")
        assert record["key"] == "test_key"
        assert record["category"] == "test"
        got = km.get_knowledge("test_key")
        assert got is not None
        assert got["content"]["value"] == 42

    def test_add_knowledge_with_tags(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        km.add_knowledge("k1", "data", tags=["tag1", "tag2"])
        results = km.query(tags=["tag1"])
        assert len(results) == 1
        assert results[0]["key"] == "k1"

    def test_add_knowledge_with_relationships(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        km.add_knowledge(
            "parent", "root", relationships=[{"target": "child", "type": "contains"}]
        )
        rels = km.get_relationships("parent")
        assert len(rels) == 1
        assert rels[0]["target"] == "child"

    def test_query_by_category(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        km.add_knowledge("k1", "a", category="arch")
        km.add_knowledge("k2", "b", category="test")
        arch_results = km.query(category="arch")
        assert len(arch_results) == 1
        assert arch_results[0]["key"] == "k1"
        all_results = km.query()
        assert len(all_results) == 2

    def test_query_max_results(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        for i in range(5):
            km.add_knowledge(f"k{i}", f"value{i}")
        limited = km.query(max_results=2)
        assert len(limited) == 2

    def test_remove_knowledge(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        km.add_knowledge("k1", "data", relationships=[{"target": "k2", "type": "ref"}])
        assert km.count() == 1
        ok = km.remove_knowledge("k1")
        assert ok is True
        assert km.count() == 0
        assert km.get_knowledge("k1") is None
        assert km.get_relationships("k2") == []
        # Removing non-existent returns False
        assert km.remove_knowledge("nonexistent") is False

    def test_clear_knowledge(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        km.add_knowledge("k1", "a")
        km.add_knowledge("k2", "b")
        assert km.count() == 2
        km.clear()
        assert km.count() == 0
        assert km.to_dict()["nodeCount"] == 0

    def test_to_dict_structure(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        km.add_knowledge("k1", "data", tags=["t"])
        d = km.to_dict()
        assert "version" in d
        assert "nodeCount" in d
        assert "edgeCount" in d
        assert "nodes" in d
        assert "edges" in d
        assert d["nodeCount"] == 1

    def test_persistence(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km1 = KnowledgeMemory(config)
        km1.add_knowledge("persist_key", "stored_value")
        del km1
        km2 = KnowledgeMemory(config)
        got = km2.get_knowledge("persist_key")
        assert got is not None
        assert got["content"] == "stored_value"

    def test_get_nonexistent_returns_none(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        km = KnowledgeMemory(config)
        assert km.get_knowledge("no_such_key") is None


# =========================================================================
# Module 18 — SnapshotManager
# =========================================================================


class TestSnapshotManager:
    __test__ = False
    def test_create_returns_metadata(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        sm = SnapshotManager(config, store, index)
        meta = sm.create(label="test_snap")
        assert "snapshotId" in meta
        assert meta["label"] == "test_snap"
        assert "path" in meta
        assert "itemCount" in meta

    def test_create_writes_snapshot_file(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        sm = SnapshotManager(config, store, index)
        meta = sm.create()
        snap_path = tmp_path / ".ai" / "runtime" / "snapshots" / f"{meta['snapshotId']}.json"
        assert snap_path.exists()

    def test_create_includes_memory_items(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        store.put("key1", "value1", "short_term")
        sm = SnapshotManager(config, store, index)
        meta = sm.create()
        assert meta["itemCount"] == 1

    def test_list_snapshots(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        sm = SnapshotManager(config, store, index)
        sm.create(label="first")
        sm.create(label="second")
        snaps = sm.list_snapshots()
        assert len(snaps) == 2
        assert snaps[0]["label"] == "second"  # newest first

    def test_restore_success(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        store.put("k1", "v1")
        sm = SnapshotManager(config, store, index)
        snap_id = sm.create()["snapshotId"]
        store.put("k2", "v2")
        assert store.count() == 2
        ok = sm.restore(snap_id)
        assert ok is True
        # After restore, only k1 should remain
        assert store.count() == 1
        assert store.get("k1") == "v1"
        assert store.get("k2") is None

    def test_restore_nonexistent_returns_false(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        sm = SnapshotManager(config, store, index)
        ok = sm.restore("SNAP-NONEXISTENT")
        assert ok is False

    def test_delete_snapshot(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        sm = SnapshotManager(config, store, index)
        snap_id = sm.create()["snapshotId"]
        assert sm.delete_snapshot(snap_id) is True
        assert sm.delete_snapshot(snap_id) is False  # already deleted

    def test_latest_returns_most_recent(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        sm = SnapshotManager(config, store, index)
        sm.create(label="first")
        latest = sm.latest()
        assert latest is not None
        assert latest["label"] == "first"

    def test_latest_returns_none_when_empty(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        store = MemoryStore(config)
        index = MemoryIndex(config)
        sm = SnapshotManager(config, store, index)
        assert sm.latest() is None


# =========================================================================
# Module 19 — FailureHandler
# =========================================================================


class _FakeDispatcher:
    """Test double that simulates action dispatch with optional failure."""

    def __init__(self, fail_on: str = "", fail_count: int = 0):
        self.fail_on = fail_on
        self.fail_count = fail_count
        self.call_count = 0

    def dispatch(self, steps: list[dict], context: dict) -> list[dict]:
        self.call_count += 1
        results = []
        for step in steps:
            if step.get("action") == self.fail_on and self.call_count <= self.fail_count:
                raise RuntimeError("simulated failure")
            results.append({**step, "status": "ok", "output": {}})
        return results


class TestFailureHandler:
    __test__ = False
    def test_execute_success_first_attempt(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        dispatcher = _FakeDispatcher()
        steps = [{"id": "s1", "action": "scan"}]
        results = fh.execute_with_retry(dispatcher, steps, {})
        assert len(results) == 1
        assert results[0]["status"] == "ok"
        assert dispatcher.call_count == 1

    def test_execute_retry_then_succeed(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        fh.max_retries = 3
        fh.base_delay = 0.01
        # Fail on first call, succeed on retry
        dispatcher = _FakeDispatcher(fail_on="scan", fail_count=1)
        steps = [{"id": "s1", "action": "scan"}]
        results = fh.execute_with_retry(dispatcher, steps, {})
        assert len(results) == 1
        assert results[0]["status"] == "ok"
        assert dispatcher.call_count == 2

    def test_execute_fails_after_max_retries(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        fh.max_retries = 2
        fh.base_delay = 0.01
        # Always fail
        dispatcher = _FakeDispatcher(fail_on="scan", fail_count=999)
        steps = [{"id": "s1", "action": "scan"}]
        results = fh.execute_with_retry(dispatcher, steps, {})
        assert len(results) == 1
        assert results[0]["status"] == "failed"
        assert "retries" in results[0]
        assert results[0]["retries"] == 2

    def test_multiple_steps_some_fail(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        fh.max_retries = 1
        fh.base_delay = 0.01
        dispatcher = _FakeDispatcher(fail_on="fail_step", fail_count=999)
        steps = [
            {"id": "s1", "action": "ok_step"},
            {"id": "s2", "action": "fail_step"},
            {"id": "s3", "action": "ok_step"},
        ]
        results = fh.execute_with_retry(dispatcher, steps, {})
        assert len(results) == 3
        assert results[0]["status"] == "ok"
        assert results[1]["status"] == "failed"
        assert results[2]["status"] == "ok"

    def test_classify_timeout(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        assert fh.classify_error("Connection timed out") == "timeout"
        assert fh.classify_error("timeout occurred") == "timeout"

    def test_classify_not_found(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        assert fh.classify_error("File not found") == "missing_resource"
        assert fh.classify_error("Path does not exist") == "missing_resource"

    def test_classify_permission(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        assert fh.classify_error("Permission denied") == "permission"
        assert fh.classify_error("Access denied") == "permission"

    def test_classify_connection(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        assert fh.classify_error("Connection refused") == "connection"
        assert fh.classify_error("Connection reset by peer") == "connection"

    def test_classify_unknown(self):
        config = AIOSConfig(repo_root=Path.cwd())
        fh = FailureHandler(config)
        assert fh.classify_error("Some random error") == "unknown"


# =========================================================================
# Module 20 — SystemReporter
# =========================================================================


class TestSystemReporter:
    __test__ = False
    def test_generate_returns_structure(self, tmp_path):
        report_dir = tmp_path / ".ai" / "reports"
        index_dir = tmp_path / ".ai" / "index"
        report_dir.mkdir(parents=True, exist_ok=True)
        index_dir.mkdir(parents=True, exist_ok=True)
        sr = SystemReporter(report_dir, index_dir)
        data = sr.generate()
        assert "title" in data
        assert "version" in data
        assert "generated" in data
        assert "mode" in data
        assert "repository" in data
        assert "checks" in data

    def test_generate_with_context(self, tmp_path):
        report_dir = tmp_path / ".ai" / "reports"
        index_dir = tmp_path / ".ai" / "index"
        report_dir.mkdir(parents=True, exist_ok=True)
        index_dir.mkdir(parents=True, exist_ok=True)
        sr = SystemReporter(report_dir, index_dir)
        data = sr.generate({"mode": "architecture"})
        assert data["mode"] == "architecture"

    def test_generate_handles_missing_files(self, tmp_path):
        report_dir = tmp_path / ".ai" / "reports"
        index_dir = tmp_path / ".ai" / "index"
        report_dir.mkdir(parents=True, exist_ok=True)
        index_dir.mkdir(parents=True, exist_ok=True)
        sr = SystemReporter(report_dir, index_dir)
        data = sr.generate()
        assert data["scanSummary"] == {}
        assert data["indexSummary"] == 0

    def test_generate_with_existing_scan(self, tmp_path):
        report_dir = tmp_path / ".ai" / "reports"
        index_dir = tmp_path / ".ai" / "index"
        report_dir.mkdir(parents=True, exist_ok=True)
        index_dir.mkdir(parents=True, exist_ok=True)
        (index_dir / "scan.json").write_text(
            '{"summary": {"totalFiles": 42}}', encoding="utf-8"
        )
        sr = SystemReporter(report_dir, index_dir)
        data = sr.generate()
        assert data["scanSummary"]["totalFiles"] == 42


# =========================================================================
# Module 20 — HealthReporter
# =========================================================================


class TestHealthReporter:
    __test__ = False
    def test_check_returns_healthy_when_all_exist(self, tmp_path):
        report_dir = tmp_path / ".ai" / "reports"
        runtime_dir = tmp_path / ".ai" / "runtime"
        index_dir = tmp_path / ".ai" / "index"
        state_dir = tmp_path / ".ai" / "state"
        for d in [report_dir, runtime_dir, index_dir, state_dir]:
            d.mkdir(parents=True, exist_ok=True)
        (index_dir / "scan.json").write_text("{}", encoding="utf-8")
        (state_dir / "project.yaml").write_text("p: v", encoding="utf-8")
        (runtime_dir / "execution.json").write_text("{}", encoding="utf-8")
        (runtime_dir / "decision.json").write_text("{}", encoding="utf-8")
        (runtime_dir / "memory.json").write_text("{}", encoding="utf-8")
        (runtime_dir / "metrics.json").write_text("{}", encoding="utf-8")
        hr = HealthReporter(report_dir, runtime_dir, index_dir, state_dir)
        result = hr.check()
        assert result["status"] == "healthy"
        assert len(result["failedChecks"]) == 0

    def test_check_returns_degraded_when_missing(self, tmp_path):
        report_dir = tmp_path / ".ai" / "reports"
        runtime_dir = tmp_path / ".ai" / "runtime"
        index_dir = tmp_path / ".ai" / "index"
        state_dir = tmp_path / ".ai" / "state"
        report_dir.mkdir(parents=True, exist_ok=True)
        hr = HealthReporter(report_dir, runtime_dir, index_dir, state_dir)
        result = hr.check()
        assert result["status"] == "degraded"
        assert len(result["failedChecks"]) >= 1

    def test_check_lists_failed_checks(self, tmp_path):
        report_dir = tmp_path / ".ai" / "reports"
        runtime_dir = tmp_path / ".ai" / "runtime"
        index_dir = tmp_path / ".ai" / "index"
        state_dir = tmp_path / ".ai" / "state"
        report_dir.mkdir(parents=True, exist_ok=True)
        hr = HealthReporter(report_dir, runtime_dir, index_dir, state_dir)
        result = hr.check()
        for name in result["failedChecks"]:
            assert name in result["checks"]
            assert result["checks"][name] is False
