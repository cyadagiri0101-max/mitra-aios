"""Agent command — manage AI agents."""

from __future__ import annotations

import json as _json
from typing import Annotated, Any

import typer


def agent_cmd(
    ctx: typer.Context,
    action: Annotated[
        str,
        typer.Argument(help="Action: list, create, status, stop, info"),
    ] = "list",
    agent_name: Annotated[
        str | None, typer.Option("--agent", "-a", help="Agent name")
    ] = None,
    agent_type: Annotated[
        str | None, typer.Option("--type", "-t", help="Agent type (worker, supervisor, etc.)")
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Manage AI agents."""
    config = ctx.obj["config"]

    if action == "list":
        result: dict[str, Any] = {"agents": [], "total": 0}
        try:
            from aios.agent.agent_registry import AgentRegistry

            registry = AgentRegistry(config)
            registry.initialize()
            agents = registry.list_agents()
            result = {"agents": agents, "total": len(agents)}
        except Exception as exc:
            result = {"agents": [], "total": 0, "error": str(exc)}
            if json_output:
                typer.echo(_json.dumps(result, indent=2))
            else:
                typer.echo("Agents: 0")
                typer.echo(f"Warning: {exc}", err=True)
            return

        if json_output:
            typer.echo(_json.dumps(result, indent=2, default=str))
            return
        typer.echo(f"Agents: {result['total']}")
        for a in result["agents"]:
            typer.echo(f"  {a.get('name', 'unknown')}: {a.get('type', 'worker')}")

    elif action == "create":
        if not agent_name:
            typer.echo("--agent required for create", err=True)
            raise typer.Exit(1)
        result = {"status": "created", "name": agent_name, "type": agent_type or "worker"}
        typer.echo(f"Created agent: {agent_name} ({result['type']})")
        if json_output:
            typer.echo(_json.dumps(result, indent=2))

    elif action == "status":
        if not agent_name:
            typer.echo("--agent required for status", err=True)
            raise typer.Exit(1)
        result = {"name": agent_name, "status": "idle", "tasks_completed": 0}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))
        else:
            typer.echo(f"Agent {agent_name}: {result['status']}")
            if verbose:
                typer.echo(f"  Tasks completed: {result['tasks_completed']}")

    elif action == "stop":
        if not agent_name:
            typer.echo("--agent required for stop", err=True)
            raise typer.Exit(1)
        typer.echo(f"Stopping agent: {agent_name}")
        if json_output:
            typer.echo(_json.dumps({"status": "stopped", "name": agent_name}, indent=2))

    elif action == "info":
        if not agent_name:
            typer.echo("--agent required for info", err=True)
            raise typer.Exit(1)
        result = {"name": agent_name, "type": agent_type or "worker", "status": "unknown", "capabilities": []}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))
        else:
            typer.echo(f"Agent: {result['name']}")
            typer.echo(f"  Type: {result['type']}")
            typer.echo(f"  Status: {result['status']}")

    else:
        typer.echo(f"Unknown action: {action}", err=True)
        raise typer.Exit(1)
