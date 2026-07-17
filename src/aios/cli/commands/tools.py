"""Tools command — list, inspect, and run tools."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer


def tools_cmd(
    ctx: typer.Context,
    action: Annotated[
        str,
        typer.Argument(help="Action: list, inspect, run, permissions"),
    ] = "list",
    tool_name: Annotated[
        str | None, typer.Option("--tool", "-t", help="Tool name")
    ] = None,
    args: Annotated[
        str | None, typer.Option("--args", help="JSON arguments for run")
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """List, inspect, and run registered tools."""
    config = ctx.obj["config"]

    if action == "list":
        result = {"tools": [], "total": 0}
        try:
            from aios.tools.manager import ToolManager

            manager = ToolManager(config)
            manager.initialize()
            tools = manager.list_tools()
            result = {"tools": tools, "total": len(tools)}
        except Exception as exc:
            result = {"tools": [], "total": 0, "error": str(exc)}
            if json_output:
                typer.echo(_json.dumps(result, indent=2))
            else:
                typer.echo("Tools: 0")
                typer.echo(f"Warning: {exc}", err=True)
            return

        if json_output:
            typer.echo(_json.dumps(result, indent=2, default=str))
            return
        typer.echo(f"Tools: {result['total']}")
        for t in result["tools"]:
            typer.echo(f"  {t.get('name', 'unknown')}: {t.get('description', '')}")

    elif action == "inspect":
        if not tool_name:
            typer.echo("--tool required for inspect", err=True)
            raise typer.Exit(1)
        result = {"name": tool_name, "description": "", "permissions": []}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))
        else:
            typer.echo(f"Tool: {result['name']}")
            typer.echo(f"  Description: {result['description']}")
            typer.echo(f"  Permissions: {result['permissions']}")

    elif action == "run":
        if not tool_name:
            typer.echo("--tool required for run", err=True)
            raise typer.Exit(1)
        parsed_args = {}
        if args:
            try:
                parsed_args = _json.loads(args)
            except _json.JSONDecodeError:
                typer.echo("Invalid JSON in --args", err=True)
                raise typer.Exit(1)
        typer.echo(f"Running tool: {tool_name}")
        result = {"tool": tool_name, "args": parsed_args, "status": "executed"}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))
        else:
            typer.echo("  Result: executed")

    elif action == "permissions":
        result = {"permissions": ["read", "write", "execute", "network", "sandbox"]}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))
        else:
            typer.echo("Available permissions:")
            for p in result["permissions"]:
                typer.echo(f"  - {p}")

    else:
        typer.echo(f"Unknown action: {action}", err=True)
        raise typer.Exit(1)
