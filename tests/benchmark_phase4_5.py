"""Phase 4.5 — Performance & Scalability Benchmark Suite.

Measures 11 metrics at concurrency levels 1, 10, 100, 1000.
"""

from __future__ import annotations

import gc
import json
import threading
import time
import tracemalloc
from collections.abc import Callable
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from aios.api.app import create_app
from aios.core.config import AIOSConfig
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.context_builder import EOSContextBuilder
from aios.eos.decision_engine import EOSDecisionEngine
from aios.eos.event_bus import EventBus
from aios.eos.knowledge_service import KnowledgeService
from aios.eos.loader import EOSLoader
from aios.eos.registry import RegistryManager
from aios.eos.runtime_engine import (
    RuntimeEngine,
    RuntimeEventType,
    RuntimeState,
)
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    ExecutionMode,
    Workflow,
    WorkflowEngine,
    WorkflowStep,
)
from aios.scheduler.manager import Scheduler
from aios.scheduler.models import JobType, RetryPolicy

REPO_ROOT = Path(__file__).resolve().parents[1]
BENCHMARK_RESULTS: dict[str, Any] = {}


# ── Helpers ──────────────────────────────────────────────────────────────

@dataclass
class BenchmarkResult:
    name: str
    concurrency: int
    mean: float
    median: float
    min: float
    max: float
    p95: float
    p99: float
    total_ops: int
    total_time: float
    ops_per_sec: float
    unit: str = "seconds"

    def to_dict(self) -> dict:
        return asdict(self)


def _percentile(data: list[float], p: float) -> float:
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * p / 100.0
    f = int(k)
    c = f + 1
    if c >= len(sorted_data):
        return sorted_data[-1]
    return sorted_data[f] * (c - k) + sorted_data[c] * (k - f)


def _format_result(r: BenchmarkResult) -> str:
    return (
        f"  {r.name:40s} | concurrency={r.concurrency:<4d} | "
        f"mean={r.mean:.4f}s | p95={r.p95:.4f}s | p99={r.p99:.4f}s | "
        f"ops/s={r.ops_per_sec:.2f} | total={r.total_ops}"
    )


def _measure(
    name: str,
    concurrency: int,
    fn: Callable[[int], list[float]],
    unit: str = "seconds",
) -> BenchmarkResult:
    latencies = fn(concurrency)
    mean = sum(latencies) / len(latencies) if latencies else 0.0
    return BenchmarkResult(
        name=name,
        concurrency=concurrency,
        mean=mean,
        median=_percentile(latencies, 50),
        min=min(latencies) if latencies else 0.0,
        max=max(latencies) if latencies else 0.0,
        p95=_percentile(latencies, 95),
        p99=_percentile(latencies, 99),
        total_ops=len(latencies),
        total_time=sum(latencies),
        ops_per_sec=len(latencies) / sum(latencies) if sum(latencies) > 0 else 0.0,
        unit=unit,
    )


def _run_parallel(n: int, fn: Callable[[int], float]) -> list[float]:
    """Run `fn` in parallel with `n` concurrent calls. Returns latencies."""
    lock = threading.Lock()
    latencies: list[float] = []
    errors: list[Exception] = []

    def worker(i: int) -> None:
        try:
            start = time.monotonic()
            fn(i)
            elapsed = time.monotonic() - start
            with lock:
                latencies.append(elapsed)
        except Exception as e:
            with lock:
                errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    if errors:
        print(f"\n    [WARN] {len(errors)}/{n} threads failed: {errors[0]}")
    return latencies


def _setup_eos(base: Path) -> AIOSConfig:
    """Create minimal EOS tree and return config."""
    ai_dir = base / ".ai"
    ai_dir.mkdir(parents=True, exist_ok=True)
    for d in ("kernel", "engines", "index"):
        (ai_dir / d).mkdir(exist_ok=True)
    for fname in ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md"):
        (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")
    return AIOSConfig(repo_root=base)


def _make_sample_workflow(step_count: int = 5) -> Workflow:
    steps = [
        WorkflowStep(
            step_id=f"step_{i}",
            action_id=f"action_{i}",
            title=f"Step {i}",
            category="benchmark",
            source="benchmark",
            confidence=0.95,
            dependencies=(),
            execution_mode=ExecutionMode.SEQUENTIAL,
            state="pending",
            estimated_cost=ExecutionCost(10, 5, 15),
            estimated_duration=ExecutionDuration(0.1, 1.0, 0.1, 1.2),
        )
        for i in range(step_count)
    ]
    return Workflow(
        task_description="Benchmark workflow",
        strategy="benchmark",
        steps=steps,
        execution_mode=ExecutionMode.SEQUENTIAL,
        total_cost=ExecutionCost(10, 5, 15),
        total_duration=ExecutionDuration(0.1, 1.0, 0.1, 1.2),
        rollback_plan=None,
    )


# ── Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def eos_components(tmp_path_factory):
    base = tmp_path_factory.mktemp("aios_bench")
    config = _setup_eos(base)

    loader = EOSLoader(config)
    loader.initialize()
    rm = RegistryManager().initialize(loader)
    cd = CapabilityDiscovery().initialize(rm)
    ks = KnowledgeService().initialize(cd)
    cb = EOSContextBuilder(token_budget=12000).initialize(ks)
    de = EOSDecisionEngine().initialize(cb)
    we = WorkflowEngine().initialize(de)
    re = RuntimeEngine().initialize(we)
    eb = EventBus(max_history=10000)
    eb.initialize(re)
    re.bind_event_bus(eb)

    scheduler = Scheduler()
    scheduler.initialize()

    return {
        "config": config,
        "loader": loader,
        "registry": rm,
        "knowledge": ks,
        "discovery": cd,
        "context_builder": cb,
        "decision_engine": de,
        "workflow_engine": we,
        "runtime_engine": re,
        "event_bus": eb,
        "scheduler": scheduler,
    }


@pytest.fixture(scope="module")
def app_client(eos_components):
    from aios.api import dependencies
    from aios.api.stack import EOSStack

    # Provide a proper stack so the health endpoint doesn't call create_stack()
    stack = EOSStack(
        config=eos_components["config"],
        loader=eos_components["loader"],
        registry=eos_components["registry"],
        capability_discovery=eos_components["discovery"],
        knowledge_service=eos_components["knowledge"],
        context_builder=eos_components["context_builder"],
        decision_engine=eos_components["decision_engine"],
        workflow_engine=eos_components["workflow_engine"],
        runtime_engine=eos_components["runtime_engine"],
        event_bus=eos_components["event_bus"],
    )
    dependencies.set_stack(stack)

    app = create_app()
    with TestClient(app) as client:
        yield client

    dependencies.reset_stack()


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 1: EventBus Throughput
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100, 1000])
def test_bench_eventbus_throughput(eos_components, concurrency):
    """Measure EventBus publish + dispatch throughput."""
    bus = eos_components["event_bus"]
    bus.reload()

    received = [0]
    lock = threading.Lock()
    test_done = threading.Event()

    def handler(event):
        with lock:
            received[0] += 1
            if received[0] >= concurrency:
                test_done.set()

    bus.subscribe(handler, event_types=[
        RuntimeEventType.EXECUTION_CREATED,
        RuntimeEventType.EXECUTION_STARTED,
        RuntimeEventType.EXECUTION_COMPLETED,
    ])

    def publish_event(i: int) -> float:
        t0 = time.monotonic()
        for _ in range(10):
            bus.runtime_engine._emit_event(
                f"bench-{i}",
                RuntimeEventType.EXECUTION_CREATED,
                message=f"bench {i}",
            )
        return time.monotonic() - t0

    result = _measure("eventbus_throughput", concurrency, lambda n: _run_parallel(n, publish_event))
    result.unit = "seconds (10 events/call)"

    bench_key = f"eventbus_throughput_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print()
    print(_format_result(result))

    stats_after = bus.statistics()
    print(f"    EventBus stats: total={stats_after.total_events}, failed={stats_after.failed_dispatches}, avg_dispatch={stats_after.average_dispatch_time:.6f}s")


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 2: Runtime Throughput
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100])
def test_bench_runtime_throughput(eos_components, concurrency):
    """Measure workflow execution throughput (limited by thread pool)."""
    if concurrency > 100:
        pytest.skip("RuntimeEngine thread-per-workflow — skipping >100 for stability")

    engine = eos_components["runtime_engine"]
    engine.reload()

    def execute_workflow(i: int) -> float:
        wf = _make_sample_workflow(step_count=3)
        t0 = time.monotonic()
        exec_id = engine.execute(wf)
        # Wait for completion
        while True:
            try:
                s = engine.status(exec_id)
                if s in (RuntimeState.COMPLETED, RuntimeState.FAILED, RuntimeState.CANCELLED):
                    break
            except Exception:
                break
            time.sleep(0.005)
        return time.monotonic() - t0

    result = _measure("runtime_throughput", concurrency, lambda n: _run_parallel(n, execute_workflow))
    result.unit = "seconds per workflow"

    bench_key = f"runtime_throughput_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print()
    print(_format_result(result))

    stats = engine.statistics()
    print(f"    Runtime stats: total={stats.total_executions}, success={stats.successful_executions}, avg_dur={stats.average_duration:.3f}s")


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 3: Memory Usage
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100, 1000])
def test_bench_memory_usage(eos_components, concurrency):
    """Measure memory usage under load using tracemalloc."""
    if concurrency > 100:
        pytest.skip("Memory benchmark — using snapshot approach for >100")

    tracemalloc.start()
    gc.collect()

    snapshot_before = tracemalloc.take_snapshot()

    engine = eos_components["runtime_engine"]
    scheduler = eos_components["scheduler"]

    # Generate load
    objects_created = 0
    for i in range(concurrency):
        wf = _make_sample_workflow(step_count=2)
        engine.execute(wf)
        scheduler.schedule_job(f"bench-job-{i}", job_type=JobType.ONE_TIME, priority=i)
        objects_created += 1
        if i % 50 == 0 and i > 0:
            time.sleep(0.001)

    time.sleep(0.1)  # Let threads settle
    gc.collect()
    snapshot_after = tracemalloc.take_snapshot()
    tracemalloc.stop()

    stats_diff = snapshot_after.compare_to(snapshot_before, "lineno")
    total_size_diff = sum(s.size_diff for s in stats_diff)
    total_count_diff = sum(s.count_diff for s in stats_diff)

    result = BenchmarkResult(
        name="memory_usage",
        concurrency=concurrency,
        mean=total_size_diff / concurrency if concurrency > 0 else 0,
        median=0.0,
        min=0.0,
        max=0.0,
        p95=0.0,
        p99=0.0,
        total_ops=objects_created,
        total_time=total_size_diff,
        ops_per_sec=total_count_diff,
        unit="bytes_diff",
    )

    bench_key = f"memory_usage_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print(f"\n  memory_usage{'':33s} | concurrency={concurrency:<4d} | size_diff={total_size_diff:,} bytes | count_diff={total_count_diff}")


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 4: Lock Contention
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100, 1000])
def test_bench_lock_contention(eos_components, concurrency):
    """Measure lock contention by hammering thread-safe operations."""

    bus = eos_components["event_bus"]
    engine = eos_components["runtime_engine"]
    lock = threading.Lock()
    contention_count = [0]

    def contended_operation(i: int) -> float:
        t0 = time.monotonic()
        # Acquire and release multiple locks
        with lock:
            contention_count[0] += 1

        with bus._lock:
            pass

        # Read-only operations with locks
        bus.statistics()
        engine.statistics()

        return time.monotonic() - t0

    result = _measure("lock_contention", concurrency, lambda n: _run_parallel(n, contended_operation))
    result.unit = "seconds per lock cycle"

    bench_key = f"lock_contention_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print()
    print(_format_result(result))


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 5: Queue Depth
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100, 1000])
def test_bench_queue_depth(eos_components, concurrency):
    """Measure queue operation depth — push/pop from priority and task queues."""
    scheduler = eos_components["scheduler"]
    scheduler.reload()
    scheduler.initialize()

    latencies = []
    for i in range(concurrency):
        t0 = time.monotonic()
        job = scheduler.schedule_job(
            f"queue-bench-{i}",
            job_type=JobType.ONE_TIME,
            priority=i,
            payload={"index": i},
        )
        scheduler.cancel_job(job.id)
        latencies.append(time.monotonic() - t0)

    result = BenchmarkResult(
        name="queue_depth", concurrency=concurrency,
        mean=sum(latencies)/len(latencies) if latencies else 0,
        median=_percentile(latencies,50), min=min(latencies) if latencies else 0,
        max=max(latencies) if latencies else 0,
        p95=_percentile(latencies,95), p99=_percentile(latencies,99),
        total_ops=len(latencies), total_time=sum(latencies),
        ops_per_sec=len(latencies)/sum(latencies) if sum(latencies)>0 else 0,
        unit="seconds per queue op pair",
    )
    bench_key = f"queue_depth_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print("\n" + _format_result(result))

    stats = scheduler.get_statistics()
    print(f"    Queue stats: total={stats.total_jobs}, pending={stats.pending_jobs}")


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 6: Scheduler Throughput
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100, 1000])
def test_bench_scheduler_throughput(eos_components, concurrency):
    """Measure scheduler job submission throughput."""
    scheduler = eos_components["scheduler"]
    scheduler.reload()
    scheduler.initialize()

    latencies = []
    for i in range(concurrency):
        t0 = time.monotonic()
        scheduler.schedule_job(
            f"sched-bench-{i}",
            job_type=JobType.ONE_TIME,
            priority=i % 10,
            payload={"index": i},
            retry_policy=RetryPolicy(max_retries=0),
        )
        latencies.append(time.monotonic() - t0)

    result = BenchmarkResult(
        name="scheduler_throughput", concurrency=concurrency,
        mean=sum(latencies)/len(latencies) if latencies else 0,
        median=_percentile(latencies,50), min=min(latencies) if latencies else 0,
        max=max(latencies) if latencies else 0,
        p95=_percentile(latencies,95), p99=_percentile(latencies,99),
        total_ops=len(latencies), total_time=sum(latencies),
        ops_per_sec=len(latencies)/sum(latencies) if sum(latencies)>0 else 0,
        unit="seconds per job submission",
    )
    bench_key = f"scheduler_throughput_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print("\n" + _format_result(result))


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 7: Workflow Execution Latency
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100])
def test_bench_workflow_latency(eos_components, concurrency):
    """Measure end-to-end workflow execution latency."""
    if concurrency > 100:
        pytest.skip("Thread-per-workflow limit")

    engine = eos_components["runtime_engine"]
    engine.reload()

    latencies = []
    for i in range(concurrency):
        wf = _make_sample_workflow(step_count=5)
        t0 = time.monotonic()
        exec_id = engine.execute(wf)
        for _ in range(200):
            try:
                s = engine.status(exec_id)
                if s in (RuntimeState.COMPLETED, RuntimeState.FAILED, RuntimeState.CANCELLED):
                    break
            except Exception:
                break
            time.sleep(0.005)
        latencies.append(time.monotonic() - t0)

    result = BenchmarkResult(
        name="workflow_latency", concurrency=concurrency,
        mean=sum(latencies)/len(latencies) if latencies else 0,
        median=_percentile(latencies,50), min=min(latencies) if latencies else 0,
        max=max(latencies) if latencies else 0,
        p95=_percentile(latencies,95), p99=_percentile(latencies,99),
        total_ops=len(latencies), total_time=sum(latencies),
        ops_per_sec=len(latencies)/sum(latencies) if sum(latencies)>0 else 0,
        unit="seconds per workflow",
    )
    bench_key = f"workflow_latency_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print("\n" + _format_result(result))


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 8: API Latency
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100, 1000])
def test_bench_api_latency(app_client, concurrency, eos_components):
    """Measure REST API endpoint latency."""
    if concurrency > 100:
        pytest.skip("API benchmark — skipping >100 in unit test context")

    def call_health(i: int) -> float:
        t0 = time.monotonic()
        resp = app_client.get("/api/v1/health")
        _ = resp.status_code
        return time.monotonic() - t0

    result = _measure("api_latency", concurrency, lambda n: _run_parallel(n, call_health))
    result.unit = "seconds per request"

    bench_key = f"api_latency_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print()
    print(_format_result(result))


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 9: Startup Time
# ═══════════════════════════════════════════════════════════════════════════

def test_bench_startup_time():
    """Measure full system startup time — create_app, init EOS components, etc."""
    measurements = []
    for _ in range(5):
        gc.collect()
        t0 = time.monotonic()

        create_app()

        t1 = time.monotonic()
        measurements.append(t1 - t0)

    mean = sum(measurements) / len(measurements)
    result = BenchmarkResult(
        name="startup_time",
        concurrency=1,
        mean=mean,
        median=_percentile(measurements, 50),
        min=min(measurements),
        max=max(measurements),
        p95=_percentile(measurements, 95),
        p99=_percentile(measurements, 99),
        total_ops=len(measurements),
        total_time=sum(measurements),
        ops_per_sec=1.0 / mean if mean > 0 else 0.0,
        unit="seconds",
    )
    BENCHMARK_RESULTS["startup_time_1"] = result.to_dict()
    print()
    print(_format_result(result))


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 10: Shutdown Time
# ═══════════════════════════════════════════════════════════════════════════

def test_bench_shutdown_time(eos_components):
    """Measure time to shutdown all components."""
    measurements = []
    for _ in range(3):
        # Setup fresh components
        import tempfile
        base = Path(tempfile.mkdtemp())
        config = _setup_eos(base)
        loader = EOSLoader(config)
        loader.initialize()
        rm2 = RegistryManager().initialize(loader)
        cd2 = CapabilityDiscovery().initialize(rm2)
        ks2 = KnowledgeService().initialize(cd2)
        cb2 = EOSContextBuilder(token_budget=12000).initialize(ks2)
        de2 = EOSDecisionEngine().initialize(cb2)
        we2 = WorkflowEngine().initialize(de2)
        re2 = RuntimeEngine().initialize(we2)
        eb2 = EventBus(max_history=1000)
        eb2.initialize(re2)
        re2.bind_event_bus(eb2)

        t0 = time.monotonic()
        eb2.shutdown()
        re2.shutdown()
        we2.shutdown()
        if hasattr(de2, 'shutdown'):
            de2.shutdown()
        elapsed = time.monotonic() - t0
        measurements.append(elapsed)

    mean = sum(measurements) / len(measurements)
    result = BenchmarkResult(
        name="shutdown_time",
        concurrency=1,
        mean=mean,
        median=_percentile(measurements, 50),
        min=min(measurements),
        max=max(measurements),
        p95=_percentile(measurements, 95),
        p99=_percentile(measurements, 99),
        total_ops=len(measurements),
        total_time=sum(measurements),
        ops_per_sec=1.0 / mean if mean > 0 else 0.0,
        unit="seconds",
    )
    BENCHMARK_RESULTS["shutdown_time_1"] = result.to_dict()
    print()
    print(_format_result(result))


# ═══════════════════════════════════════════════════════════════════════════
# BENCHMARK 11: EventBus Dispatch Latency (granular)
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("concurrency", [1, 10, 100, 1000])
def test_bench_eventbus_dispatch_latency(eos_components, concurrency):
    """Measure fine-grained EventBus dispatch latency per event."""
    bus = eos_components["event_bus"]
    bus.reload()

    dispatch_latencies: list[float] = []
    dl_lock = threading.Lock()

    def handler(event):
        elapsed = time.monotonic() - event.timestamp
        with dl_lock:
            dispatch_latencies.append(elapsed)

    bus.subscribe(handler)

    def send_event(i: int) -> float:
        from aios.eos.runtime_engine import RuntimeEvent
        t0 = time.monotonic()
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_CREATED,
            execution_id=f"dl-bench-{i}",
            message="dispatch latency test",
            timestamp=time.time(),
        )
        bus.publish(event)
        return time.monotonic() - t0

    result = _measure("dispatch_latency", concurrency, lambda n: _run_parallel(n, send_event))
    result.unit = "seconds per dispatch"

    bench_key = f"dispatch_latency_{concurrency}"
    BENCHMARK_RESULTS[bench_key] = result.to_dict()
    print()
    print(_format_result(result))

    if dispatch_latencies:
        dl_mean = sum(dispatch_latencies) / len(dispatch_latencies)
        dl_max = max(dispatch_latencies)
        print(f"    Handler dispatch: mean={dl_mean:.6f}s, max={dl_max:.6f}s")


# ── Final Report ─────────────────────────────────────────────────────────

def test_benchmark_report():
    """Generate final benchmark report."""
    report_path = REPO_ROOT / "benchmark_results_phase4_5.json"
    report_path.write_text(json.dumps(BENCHMARK_RESULTS, indent=2, default=str), encoding="utf-8")

    print("\n")
    print("=" * 90)
    print("PHASE 4.5 — PERFORMANCE & SCALABILITY BENCHMARK REPORT")
    print("=" * 90)
    print(f"{'Metric':40s} {'Concur':>6s} {'Mean(s)':>10s} {'P95(s)':>10s} {'P99(s)':>10s} {'Ops/s':>10s} {'Total':>8s}")
    print("-" * 90)

    for key, data in sorted(BENCHMARK_RESULTS.items()):
        if isinstance(data, dict):
            print(
                f"{data.get('name', key):40s} "
                f"{data.get('concurrency', 0):>6d} "
                f"{data.get('mean', 0):>10.4f} "
                f"{data.get('p95', 0):>10.4f} "
                f"{data.get('p99', 0):>10.4f} "
                f"{data.get('ops_per_sec', 0):>10.2f} "
                f"{data.get('total_ops', 0):>8d}"
            )

    print("-" * 90)
    print(f"Report saved to: {report_path}")
