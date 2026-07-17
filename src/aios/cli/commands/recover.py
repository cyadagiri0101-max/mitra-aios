"""Recover command — restore from EOS memory snapshot."""

from __future__ import annotations

import json as _json

import typer

from aios.cli.commands._stack import get_stack


def recover_cmd(
    ctx: typer.Context,
    snapshot_id: str = typer.Argument("", help="Snapshot ID to restore (omit for latest)"),
    list_snapshots: bool = typer.Option(False, "--list", help="List available snapshots"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Recover system state from an EOS memory snapshot."""
    config = ctx.obj["config"]
    stack = get_stack(config)
    if stack.memory_manager is None:
        typer.echo("Error: MemoryManager not available", err=True)
        raise typer.Exit(1)

    mm = stack.memory_manager

    if list_snapshots:
        snaps = mm.list_snapshots()
        if json_output:
            typer.echo(_json.dumps(snaps, indent=2, default=str))
            return
        if not snaps:
            typer.echo("No snapshots available.")
            return
        typer.echo(f"Available snapshots ({len(snaps)}):")
        for s in snaps:
            typer.echo(f"  {s['snapshot_id']}  {s.get('label', '')}  {s.get('created', '')}")
        return

    sid = snapshot_id.strip() if snapshot_id else ""
    if not sid:
        snaps = mm.list_snapshots()
        if not snaps:
            typer.echo("No snapshots available. Nothing to recover.")
            return
        sid = snaps[0]["snapshot_id"]
        typer.echo(f"No snapshot specified, using latest: {sid}")

    ok = mm.restore(sid)
    if ok:
        typer.echo(f"Recovered from snapshot {sid}")
    else:
        typer.echo(f"Failed to recover from snapshot {sid}", err=True)
        raise typer.Exit(code=1)
