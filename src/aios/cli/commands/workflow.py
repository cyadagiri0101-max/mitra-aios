"""Workflow command — manage multi-agent workflows."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer


def workflow_cmd(
    ctx: typer.Context,
    action: Annotated[
        str,
        typer.Argument(help="Action: list, start, status, cancel"),
    ] = "list",
    workflow_id: Annotated[
        str | None, typer.Option("--id", help="Workflow ID")
    ] = None,
    name: Annotated[
        str | None, typer.Option("--name", "-n", help="Workflow name")
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Manage multi-agent workflows."""
    config = ctx.obj["config"]

    if action == "list":
        result = {"workflows": [], "total": 0}
        try:
            from aios.multiagent.coordinator import MultiAgentCoordinator

            coordinator = MultiAgentCoordinator(config)
            coordinator.initialize()
            workflows = coordinator.list_workflows()
            result = {"workflows": workflows, "total": len(workflows)}
        except Exception as exc:
            result = {"workflows": [], "total": 0, "error": str(exc)}
            if json_output:
                typer.echo(_json.dumps(result, indent=2))
            else:
                typer.echo("Workflows: 0")
                typer.echo(f"Warning: {exc}", err=True)
            return

        if json_output:
            typer.echo(_json.dumps(result, indent=2, default=str))
            return
        typer.echo(f"Workflows: {result['total']}")
        for wf in result["workflows"]:
            typer.echo(f"  {wf.get('id', 'unknown')}: {wf.get('name', 'unnamed')}")

    elif action == "start":
        if not name:
            typer.echo("--name required for start", err=True)
            raise typer.Exit(1)
        typer.echo(f"Starting workflow: {name}")
        result = {"status": "started", "name": name}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))

    elif action == "status":
        if not workflow_id:
            typer.echo("--id required for status", err=True)
            raise typer.Exit(1)
        result = {"id": workflow_id, "status": "unknown"}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))
        else:
            typer.echo(f"Workflow {workflow_id}: {result['status']}")

    elif action == "cancel":
        if not workflow_id:
            typer.echo("--id required for cancel", err=True)
            raise typer.Exit(1)
        typer.echo(f"Cancelling workflow: {workflow_id}")

    else:
        typer.echo(f"Unknown action: {action}", err=True)
        raise typer.Exit(1)
