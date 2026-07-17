"""Scan command — run the scanner plugin."""

from __future__ import annotations

import json as _json

import typer

from aios.plugins.scanner.plugin import ScannerPlugin


def scan_cmd(
    ctx: typer.Context,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Scan the repository and produce scan.json."""
    config = ctx.obj["config"]
    plugin = ScannerPlugin(config)
    result = plugin.run()

    if json_output:
        typer.echo(_json.dumps(result.payload, indent=2, default=str))
        return

    if result.is_ok:
        summary = result.payload.get("summary", {})
        total = summary.get("totalFiles", 0)
        typer.echo(f"Scan complete: {total} files indexed")
        if verbose:
            typer.echo(f"  Directories : {summary.get('totalDirectories', 0)}")
            typer.echo(f"  Duration    : {summary.get('scanDurationSeconds', 0)}s")
            typer.echo(f"  Duplicates  : {summary.get('duplicateGroupCount', 0)}")
    else:
        typer.echo(f"Scan failed: {result.errors}", err=True)
        raise typer.Exit(1)
