"""Memory command — manage memory via MemoryManager."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer

from aios.cli.commands._stack import get_stack
from aios.memory.models import MemoryType


def memory_cmd(
    ctx: typer.Context,
    action: Annotated[
        str,
        typer.Argument(help="Action: store, retrieve, snapshot, compress, prune, list_snapshots"),
    ] = "snapshot",
    key: Annotated[
        str | None, typer.Option("--key", "-k", help="Content to store")
    ] = None,
    value: Annotated[
        str | None, typer.Option("--value", "-v", help="Metadata label")
    ] = None,
    query: Annotated[
        str | None, typer.Option("--query", "-q", help="Search query")
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Manage long-term and short-term memories via EOS MemoryManager."""
    config = ctx.obj["config"]
    stack = get_stack(config)
    if stack.memory_manager is None:
        typer.echo("Error: MemoryManager not available", err=True)
        raise typer.Exit(1)

    mm = stack.memory_manager

    if action == "store":
        if not key:
            typer.echo("--key required for store", err=True)
            raise typer.Exit(1)
        entry = mm.store(key, type=value or "general")
        data = {"id": entry.id, "content": entry.content}
        if json_output:
            typer.echo(_json.dumps(data, indent=2, default=str))
            return
        typer.echo(f"Stored: {entry.id}")

    elif action == "retrieve":
        if not query:
            typer.echo("--query required for retrieve", err=True)
            raise typer.Exit(1)
        results = mm.retrieve(query)
        data = [{"id": r.entry.id, "content": r.entry.content, "score": r.score} for r in results]
        if json_output:
            typer.echo(_json.dumps(data, indent=2, default=str))
            return
        typer.echo(f"Results: {len(results)}")
        for r in results:
            typer.echo(f"  {r.entry.id}: {r.entry.content[:80]}")

    elif action == "compress":
        result = mm.compress()
        data = {"moved_to_episodic": len(result.moved_to_episodic), "moved_to_semantic": len(result.moved_to_semantic), "expired": len(result.expired)}
        if json_output:
            typer.echo(_json.dumps(data, indent=2))
            return
        typer.echo(f"Compressed: episodic={data['moved_to_episodic']}, semantic={data['moved_to_semantic']}, expired={data['expired']}")

    elif action == "prune":
        count = mm.prune(min_importance=0.1)
        if json_output:
            typer.echo(_json.dumps({"removed": count}))
            return
        typer.echo(f"Pruned: {count} items removed")

    elif action == "list_snapshots":
        snaps = mm.list_snapshots()
        if json_output:
            typer.echo(_json.dumps(snaps, indent=2, default=str))
            return
        if not snaps:
            typer.echo("No snapshots available")
        else:
            typer.echo(f"Snapshots ({len(snaps)}):")
            for s in snaps:
                typer.echo(f"  {s['snapshot_id']}  {s.get('label', '')}  {s.get('created', '')}")

    else:
        snap = mm.snapshot(label=action if action != "snapshot" else "")
        if json_output:
            typer.echo(_json.dumps(snap, indent=2, default=str))
            return
        typer.echo(f"Memory snapshot: {snap['entry_count']} entries")
