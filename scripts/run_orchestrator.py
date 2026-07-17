"""Run the full AIOS orchestrator to generate runtime outputs."""

from aios.orchestrator import Orchestrator
from aios.core.config import AIOSConfig
from pathlib import Path

config = AIOSConfig(repo_root=Path.cwd())
orch = Orchestrator(config, dry_run=False, profile=True)
result = orch.run()

print("Orchestration status:", result["status"])
print("Steps executed:", len(result["steps"]))
for s in result["steps"]:
    print(f'  {s["name"]}: {s["status"]} ({s.get("duration", 0)}s)')
print("Total duration:", result["metrics"]["totalDurationSeconds"])

# Verify runtime artifacts
runtime = Path.cwd() / ".ai" / "runtime"
for f in ["orchestration.json", "decision.json", "execution.json",
          "memory.json", "memory-index.json", "metrics.json",
          "health-report.json"]:
    path = runtime / f
    print(f'  {"OK" if path.exists() else "MISSING"}: {path}')
