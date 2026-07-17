"""Doctor command — comprehensive system diagnostics via EOS."""

from __future__ import annotations

import json as _json

import typer

from aios.cli.commands._stack import get_stack


def doctor_cmd(
    ctx: typer.Context,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Run comprehensive system diagnostics via EOS health chain."""
    config = ctx.obj["config"]
    stack = get_stack(config)

    checks: dict[str, object] = {}

    if stack.loader:
        try:
            loader_health = stack.loader.validate()
            checks["loader"] = loader_health if not loader_health else "OK"
        except Exception as e:
            checks["loader"] = str(e)

    if stack.registry:
        try:
            rv = stack.registry.validate()
            checks["registry"] = "OK" if rv.is_valid else f"issues: {len(rv.schema_issues)} schema, {len(rv.duplicate_ids)} dup, {len(rv.orphaned_ids)} orphan"
        except Exception as e:
            checks["registry"] = str(e)

    if stack.capability_discovery:
        try:
            cv = stack.capability_discovery.validate()
            checks["capabilities"] = "OK" if cv.is_valid else f"issues: {len(cv.deprecated)} deprecated, {len(cv.circular)} circular"
        except Exception as e:
            checks["capabilities"] = str(e)

    if stack.runtime_engine:
        runtime_stats = stack.runtime_engine.statistics()
        checks["runtime"] = f"{runtime_stats.total_executions} executions, {runtime_stats.successful_executions} completed"

    if stack.event_bus:
        eb_health = stack.event_bus.health()
        checks["event_bus"] = "OK" if eb_health.healthy else eb_health.message

    if stack.observability:
        obs_health = stack.observability.health()
        checks["observability"] = "OK" if obs_health.healthy else obs_health.message

    if stack.persistence:
        try:
            pv = stack.persistence.validate()
            checks["persistence"] = "OK" if not pv else pv
        except Exception as e:
            checks["persistence"] = str(e)

    data = {
        "version": "1.2.0",
        "repository": str(config.repo_root),
        "mode": config.mode,
        "status": "healthy" if all(
            v == "OK" for v in checks.values() if isinstance(v, str)
        ) else "degraded",
        "checks": {k: v for k, v in checks.items() if isinstance(v, str)},
        "details": {k: v for k, v in checks.items() if not isinstance(v, str)},
    }

    runtime = config.repo_root / ".ai" / "runtime"
    artifacts = list(runtime.glob("*.json")) if runtime.exists() else []
    data["runtimeArtifacts"] = [a.name for a in sorted(artifacts)]
    data["artifactCount"] = len(artifacts)

    if json_output:
        typer.echo(_json.dumps(data, indent=2, default=str))
        return

    typer.echo("AIOS Doctor — System Diagnostics")
    typer.echo(f"Version: {data['version']} | Repository: {data['repository']}")
    typer.echo(f"Health: {data['status']}")
    typer.echo(f"Runtime artifacts: {data['artifactCount']} found")
    if verbose:
        for name, status in checks.items():
            if isinstance(status, str):
                typer.echo(f"  {name}: {status}")
            else:
                typer.echo(f"  {name}: {_json.dumps(status)}")
        for a in data.get("runtimeArtifacts", []):
            typer.echo(f"  artifact: {a}")
