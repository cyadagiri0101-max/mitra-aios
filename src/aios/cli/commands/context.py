"""Context command — build execution context via EOSContextBuilder."""

from __future__ import annotations

import json as _json
from typing import Annotated, Any

import typer

from aios.cli.commands._stack import get_stack


def context_cmd(
    ctx: typer.Context,
    mode: Annotated[
        str | None,
        typer.Argument(help="Task description for context building"),
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Build execution context for a task via EOSContextBuilder."""
    config = ctx.obj["config"]
    stack = get_stack(config)
    if stack.context_builder is None:
        typer.echo("Error: EOSContextBuilder not available", err=True)
        raise typer.Exit(1)

    target = mode or config.mode
    try:
        context = stack.context_builder.build(target)
    except Exception as e:
        typer.echo(f"Context build failed: {e}", err=True)
        raise typer.Exit(1)

    data: dict[str, Any] = {
        "task": context.task_description,
        "items_count": len(context.items),
        "utilization_percent": context.utilization_percent,
        "items": [
            {"id": item.item_id, "title": item.title, "category": item.category, "score": item.score}
            for item in context.items
        ],
    }

    if json_output:
        typer.echo(_json.dumps(data, indent=2, default=str))
        return

    typer.echo(
        f"Context built: task={target}, "
        f"{data['items_count']} items, "
        f"{data['utilization_percent']:.0f}% budget used"
    )
    if verbose:
        for item in data["items"]:
            typer.echo(f"  [{item['category']}] {item['title']} ({item['score']:.2f})")
