"""Decision command — evaluate paths and make decisions."""

from __future__ import annotations

import json as _json

import typer

from aios.cli.commands._stack import get_stack


def decision_cmd(
    ctx: typer.Context,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    profile: bool = typer.Option(False, "--profile", help="Enable profiling"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Evaluate execution paths and make an optimal decision using EOSDecisionEngine."""
    config = ctx.obj["config"]
    stack = get_stack(config)

    if stack.decision_engine is None:
        typer.echo("Error: Decision engine not available", err=True)
        raise typer.Exit(1)

    plan = stack.decision_engine.plan(config.mode)

    if json_output:
        typer.echo(
            _json.dumps(
                {
                    "task": plan.task_description,
                    "strategy": plan.strategy.value,
                    "confidence": plan.overall_confidence,
                    "actions": [
                        {
                            "id": a.action_id,
                            "title": a.title,
                            "category": a.category,
                            "confidence": a.confidence,
                            "rationale": a.rationale,
                        }
                        for a in plan.actions
                    ],
                    "recommendations": plan.recommendations,
                },
                indent=2,
                default=str,
            ),
        )
        return

    typer.echo(f"Decision: {plan.strategy.value}")
    typer.echo(f"  Confidence: {plan.overall_confidence:.3f}")
    typer.echo(f"  Actions: {plan.action_count}")
    if verbose:
        for action in plan.actions:
            typer.echo(f"  [{action.category}] {action.title} ({action.confidence:.2f})")
        for rec in plan.recommendations:
            typer.echo(f"  ! {rec}")
