"""Run command — full autonomous workflow via RuntimeEngine."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer

from aios.cli.commands._stack import get_stack


def run_cmd(
    ctx: typer.Context,
    mode: Annotated[
        str | None,
        typer.Option("--mode", "-m", help="Operating mode"),
    ] = None,
    dry_run: bool = typer.Option(False, "--dry-run", help="Preview without executing"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    profile: bool = typer.Option(False, "--profile", help="Enable profiling"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Run the full autonomous workflow via EOS RuntimeEngine."""
    config = ctx.obj["config"]
    if mode:
        config.mode = mode

    stack = get_stack(config)
    if stack.runtime_engine is None:
        typer.echo("Error: RuntimeEngine not available", err=True)
        raise typer.Exit(1)

    plan = stack.decision_engine.plan(config.mode)
    workflow = stack.workflow_engine.build(plan)
    execution_id = stack.runtime_engine.execute(workflow)

    result = {
        "status": "completed",
        "executionId": execution_id,
        "mode": config.mode,
    }

    if json_output:
        typer.echo(_json.dumps(result, indent=2, default=str))
        return

    typer.echo(f"Orchestration completed ({execution_id})")
    if verbose:
        typer.echo(f"  Mode: {config.mode}")
        typer.echo(f"  Workflow steps: {workflow.step_count}")
    if dry_run:
        typer.echo("Dry run — no actions executed")
