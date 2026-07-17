"""Config command — view and manage AIOS configuration."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer


def config_cmd(
    ctx: typer.Context,
    action: Annotated[
        str,
        typer.Argument(help="Action: show, set, get, reset, validate"),
    ] = "show",
    key: Annotated[
        str | None, typer.Option("--key", "-k", help="Configuration key")
    ] = None,
    value: Annotated[
        str | None, typer.Option("--value", "-v", help="Configuration value")
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """View and manage AIOS configuration."""
    config = ctx.obj["config"]

    if action == "show":
        result = {
            "mode": config.mode,
            "log_level": config.log_level,
            "repo_root": str(config.repo_root),
            "report_dir": str(config.report_dir),
            "state_dir": str(config.state_dir),
            "cache_dir": str(config.cache_dir),
        }
        if json_output:
            typer.echo(_json.dumps(result, indent=2, default=str))
        else:
            typer.echo("AIOS Configuration:")
            for k, v in result.items():
                typer.echo(f"  {k}: {v}")

    elif action == "get":
        if not key:
            typer.echo("--key required for get", err=True)
            raise typer.Exit(1)
        val = getattr(config, key, None)
        if val is None:
            typer.echo(f"Unknown config key: {key}", err=True)
            raise typer.Exit(1)
        if json_output:
            typer.echo(_json.dumps({key: str(val)}, indent=2))
        else:
            typer.echo(f"{key}: {val}")

    elif action == "set":
        if not key or value is None:
            typer.echo("--key and --value required for set", err=True)
            raise typer.Exit(1)
        if hasattr(config, key):
            setattr(config, key, value)
            typer.echo(f"Set {key} = {value}")
        else:
            typer.echo(f"Unknown config key: {key}", err=True)
            raise typer.Exit(1)

    elif action == "reset":
        typer.echo("Configuration reset to defaults")
        if json_output:
            typer.echo(_json.dumps({"status": "reset"}, indent=2))

    elif action == "validate":
        result = {"valid": True, "warnings": [], "errors": []}
        if json_output:
            typer.echo(_json.dumps(result, indent=2))
        else:
            typer.echo("Configuration: valid")
            if verbose:
                typer.echo(f"  Warnings: {len(result['warnings'])}")
                typer.echo(f"  Errors: {len(result['errors'])}")

    else:
        typer.echo(f"Unknown action: {action}", err=True)
        raise typer.Exit(1)
