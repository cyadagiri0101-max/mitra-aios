"""Plugins command — manage AIOS plugins."""

from __future__ import annotations

import json as _json
from typing import Annotated, Any

import typer


def plugins_cmd(
    ctx: typer.Context,
    action: Annotated[
        str,
        typer.Argument(help="Action: list, install, uninstall, enable, disable, info"),
    ] = "list",
    plugin_name: Annotated[
        str | None, typer.Option("--plugin", "-p", help="Plugin name")
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Manage AIOS plugins."""
    config = ctx.obj["config"]

    if action == "list":
        result: dict[str, Any] = {"plugins": [], "total": 0}
        try:
            from aios.plugins.manager import PluginManager

            manager = PluginManager(config)
            manager.initialize()
            plugins = manager.list_plugins()
            result = {"plugins": plugins, "total": len(plugins)}
        except Exception as exc:
            result = {"plugins": [], "total": 0, "error": str(exc)}
            if json_output:
                typer.echo(_json.dumps(result, indent=2))
            else:
                typer.echo("Plugins: 0")
                typer.echo(f"Warning: {exc}", err=True)
            return

        if json_output:
            typer.echo(_json.dumps(result, indent=2, default=str))
            return
        typer.echo(f"Plugins: {result['total']}")
        for p in result["plugins"]:
            status = "enabled" if p.get("enabled", False) else "disabled"
            typer.echo(f"  {p.get('name', 'unknown')}: {status}")

    elif action in ("install", "uninstall", "enable", "disable"):
        if not plugin_name:
            typer.echo(f"--plugin required for {action}", err=True)
            raise typer.Exit(1)
        typer.echo(f"{action.capitalize()}ing plugin: {plugin_name}")
        if json_output:
            typer.echo(_json.dumps({"action": action, "plugin": plugin_name}, indent=2))

    elif action == "info":
        if not plugin_name:
            typer.echo("--plugin required for info", err=True)
            raise typer.Exit(1)
        result = {"name": plugin_name, "version": "unknown", "enabled": False}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))
        else:
            typer.echo(f"Plugin: {result['name']}")
            typer.echo(f"  Version: {result['version']}")
            typer.echo(f"  Enabled: {result['enabled']}")

    else:
        typer.echo(f"Unknown action: {action}", err=True)
        raise typer.Exit(1)
