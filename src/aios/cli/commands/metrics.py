"""Metrics command — collect and display EOS observability metrics."""

from __future__ import annotations

import json as _json

import typer

from aios.cli.commands._stack import get_stack


def metrics_cmd(
    ctx: typer.Context,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Collect and display runtime metrics from EOS ObservabilityConsumer."""
    config = ctx.obj["config"]
    stack = get_stack(config)
    if stack.observability is None:
        typer.echo("Error: Observability not available", err=True)
        raise typer.Exit(1)

    metrics = stack.observability.metrics()
    data = {
        "uptime_seconds": metrics.uptime_seconds,
        "total_events_seen": metrics.total_events_seen,
        "total_executions_started": metrics.total_executions_started,
        "total_executions_completed": metrics.total_executions_completed,
        "total_executions_failed": metrics.total_executions_failed,
        "total_steps_executed": metrics.total_steps_executed,
        "total_steps_failed": metrics.total_steps_failed,
        "total_retries": metrics.total_retries,
        "error_rate": metrics.error_rate,
        "active_executions": metrics.active_executions,
        "event_rate_per_second": metrics.event_rate_per_second,
    }

    if json_output:
        typer.echo(_json.dumps(data, indent=2, default=str))
        return

    typer.echo("EOS Runtime metrics:")
    if verbose:
        for key, value in data.items():
            typer.echo(f"  {key}: {value}")
