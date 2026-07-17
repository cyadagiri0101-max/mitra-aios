"""Execute command — execute an EOS workflow via RuntimeEngine."""

from __future__ import annotations

import json as _json

import typer

from aios.cli.commands._stack import get_stack


def execute_cmd(
    ctx: typer.Context,
    dry_run: bool = typer.Option(False, "--dry-run", help="Preview without executing"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    profile: bool = typer.Option(False, "--profile", help="Enable profiling"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Execute an EOS workflow through the pipeline."""
    config = ctx.obj["config"]
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
        "dry_run": dry_run,
    }

    if json_output:
        typer.echo(_json.dumps(result, indent=2, default=str))
        return

    typer.echo(f"Execution completed: {execution_id}")
    if verbose:
        typer.echo(f"  Workflow steps: {workflow.step_count}")
        typer.echo(f"  Strategy: {plan.strategy.value}")
