"""Checkpoint command — manage persistence checkpoints."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer

from aios.cli.commands._stack import get_stack


def checkpoint_cmd(
    ctx: typer.Context,
    action: Annotated[
        str,
        typer.Argument(help="Action: statistics"),
    ] = "statistics",
    checkpoint_id: Annotated[
        str | None,
        typer.Option("--id", "-i", help="Checkpoint ID"),
    ] = None,
    keep: Annotated[
        int,
        typer.Option("--keep", "-k", help="Entries to keep"),
    ] = 10,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Manage persistence checkpoints via EOS PersistenceStore."""
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
        }
        if json_output:
            typer.echo(_json.dumps(data, indent=2, default=str))
            return
        typer.echo(f"Persistence entries: {data['total_entries']}")

    elif action == "validate":
        result = stack.persistence.validate()
        if json_output:
            typer.echo(_json.dumps({"issues": result}))
            return
        typer.echo(f"Validation: {len(result)} issues" if result else "Validation: OK")

    else:
        typer.echo(f"Unknown action: {action}. Use: statistics, validate", err=True)
        raise typer.Exit(1)
