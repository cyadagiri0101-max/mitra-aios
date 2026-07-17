"""Validate command — run EOS validation chain."""

from __future__ import annotations

import json as _json

import typer

from aios.cli.commands._stack import get_stack


def validate_cmd(
    ctx: typer.Context,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Validate all EOS components against repository evidence."""
    config = ctx.obj["config"]
    stack = get_stack(config)

    results: dict[str, object] = {}

    for name, component in [
        ("loader", stack.loader),
        ("registry", stack.registry),
        ("capability", stack.capability_discovery),
        ("context", stack.context_builder),
        ("decision", stack.decision_engine),
        ("workflow", stack.workflow_engine),
        ("runtime", stack.runtime_engine),
        ("event_bus", stack.event_bus),
        ("observability", stack.observability),
        ("persistence", stack.persistence),
    ]:
        if component is not None and hasattr(component, "validate"):
            try:
                result = component.validate()
                results[name] = result
            except Exception as e:
                results[name] = {"error": str(e)}
        else:
            results[name] = {"error": "not available"}

    passed = sum(
        1
        for r in results.values()
        if isinstance(r, object) and not (isinstance(r, dict) and "error" in r)
    )
    failed = len(results) - passed

    if json_output:
        typer.echo(_json.dumps(results, indent=2, default=str))
        return

    status = "pass" if failed == 0 else "fail"
    typer.echo(f"Validation: {status} ({passed} pass / {failed} fail)")
    if verbose:
        for name, result in results.items():
            if isinstance(result, dict) and "error" in result:
                typer.echo(f"  {name}: ERROR — {result['error']}")
            else:
                typer.echo(f"  {name}: OK")
