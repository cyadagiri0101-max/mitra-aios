"""Index command — build file registry, dependency graph, and search index."""

from __future__ import annotations

import json as _json

import typer

from aios.plugins.indexer.plugin import IndexerPlugin


def index_cmd(
    ctx: typer.Context,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Build indexes from scan results (run 'scan' first)."""
    config = ctx.obj["config"]
    plugin = IndexerPlugin(config)
    result = plugin.run()

    if json:
        typer.echo(_json.dumps(result.payload, indent=2, default=str))
        return

    if result.is_ok:
        payload = result.payload
        typer.echo(
            f"Index built: {payload.get('registryCount', 0)} files, "
            f"{payload.get('dependencyCount', 0)} refs"
        )
        if verbose:
            typer.echo(f"  Index File   : {payload.get('indexFile', '')}")
            typer.echo(f"  Summary File : {payload.get('summaryFile', '')}")
    else:
        typer.echo(f"Index failed: {result.errors}", err=True)
        raise typer.Exit(1)
