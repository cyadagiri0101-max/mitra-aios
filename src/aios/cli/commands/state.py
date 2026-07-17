"""State command — manage persistence state via PersistenceStore."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer

from aios.cli.commands._stack import get_stack


def state_cmd(
    ctx: typer.Context,
    action: Annotated[
        str,
        typer.Argument(help="Action: statistics, validate"),
    ] = "statistics",
    baseline: Annotated[
        str | None,
        typer.Option("--baseline", "-b", help="Baseline timestamp"),
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Manage persistence state via EOS PersistenceStore."""
    config = ctx.obj["config"]
    stack = get_stack(config)
    if stack.persistence is None:
        typer.echo("Error: PersistenceStore not available", err=True)
        raise typer.Exit(1)

    if action == "statistics":
        stats = stack.persistence.statistics()
        data = {
            "total_entries": stats.total_workflows,
            "total_workflows": stats.total_workflows,
            "total_executions": stats.total_executions,
            "total_events": stats.total_events,
            "total_reports": stats.total_reports,
        }
        if json_output:
            typer.echo(_json.dumps(data, indent=2, default=str))
            return
        typer.echo(f"State statistics: {data['total_entries']} entries")

    elif action == "validate":
        result = stack.persistence.validate()
        data = {"validation": result, "drift_detected": len(result) > 0}
        if json_output:
            typer.echo(_json.dumps(data, indent=2, default=str))
            return
        if result:
            typer.echo(f"Validation issues: {len(result)}")
            for item in result:
                typer.echo(f"  {item}")
        else:
            typer.echo("State is current — no issues detected")

    else:
        typer.echo(f"Unknown action: {action}. Use: statistics, validate", err=True)
        raise typer.Exit(1)
