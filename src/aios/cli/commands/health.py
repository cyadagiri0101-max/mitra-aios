"""Health command — check system health via EOS."""

from __future__ import annotations

import json as _json

import typer

from aios.cli.commands._stack import get_stack


def health_cmd(
    ctx: typer.Context,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Check system health status via EOS ObservabilityConsumer."""
    config = ctx.obj["config"]
    stack = get_stack(config)

    if stack.observability is None:
        typer.echo("Error: Observability not available", err=True)
        raise typer.Exit(1)

    health = stack.observability.health()

    if json_output:
        typer.echo(
            _json.dumps(
                {
                    "status": health.status,
                    "healthy": health.healthy,
                    "event_bus_connected": health.event_bus_connected,
                    "events_processed": health.events_processed,
                    "subscriber_active": health.subscriber_active,
                    "errors_recent": health.errors_recent,
                    "message": health.message,
                },
                indent=2,
                default=str,
            ),
        )
        return

    typer.echo(f"System health: {health.status}")
    if verbose:
        typer.echo(f"  EventBus connected: {health.event_bus_connected}")
        typer.echo(f"  Events processed: {health.events_processed}")
        typer.echo(f"  Subscriber active: {health.subscriber_active}")
        typer.echo(f"  Recent errors: {health.errors_recent}")
        if health.message:
            typer.echo(f"  Message: {health.message}")
