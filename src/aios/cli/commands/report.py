"""Report command — generate EOS observability reports."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer

from aios.cli.commands._stack import get_stack


def report_cmd(
    ctx: typer.Context,
    report_type: Annotated[
        str | None,
        typer.Argument(help="Report type: statistics, metrics, health, all"),
    ] = "all",
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Generate observability reports from EOS components."""
    config = ctx.obj["config"]
    stack = get_stack(config)

    data: dict[str, object] = {}

    if report_type in ("statistics", "all"):
        if stack.observability:
            stats = stack.observability.statistics()
            data["statistics"] = {
                "total_events": stats.total_events_consumed,
                "execution_events": stats.total_execution_events,
                "errors": stats.total_errors,
            }

    if report_type in ("metrics", "all"):
        if stack.observability:
            metrics = stack.observability.metrics()
            data["metrics"] = {
                "uptime_seconds": metrics.uptime_seconds,
                "total_events": metrics.total_events_seen,
                "error_rate": metrics.error_rate,
                "active_executions": metrics.active_executions,
            }

    if report_type in ("health", "all"):
        if stack.observability:
            health = stack.observability.health()
            data["health"] = {
                "status": health.status,
                "healthy": health.healthy,
                "events_processed": health.events_processed,
                "message": health.message,
            }

    if json_output:
        typer.echo(_json.dumps(data, indent=2, default=str))
        return

    for section, values in data.items():
        typer.echo(f"{section.capitalize()} report:")
        for key, val in values.items():
            typer.echo(f"  {key}: {val}")
