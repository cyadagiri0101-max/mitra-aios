"""AIOS main CLI application."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from aios.cli.commands import (
    agent_cmd,
    chat_cmd,
    checkpoint_cmd,
    config_cmd,
    context_cmd,
    decision_cmd,
    doctor_cmd,
    execute_cmd,
    health_cmd,
    index_cmd,
    memory_cmd,
    metrics_cmd,
    plugins_cmd,
    recover_cmd,
    report_cmd,
    run_cmd,
    scan_cmd,
    state_cmd,
    tools_cmd,
    validate_cmd,
    workflow_cmd,
)
from aios import __version__
from aios.core.config import load_config
from aios.core.logger import get_logger


def _version_callback(value: bool) -> None:
    if value:
        print(f"AIOS {__version__}")
        raise typer.Exit()

app = typer.Typer(
    name="aios",
    help=f"AIOS {__version__} — AI Operating System runtime",
    no_args_is_help=True,
)

app.command("scan")(scan_cmd)
app.command("index")(index_cmd)
app.command("state")(state_cmd)
app.command("context")(context_cmd)
app.command("checkpoint")(checkpoint_cmd)
app.command("run")(run_cmd)
app.command("execute")(execute_cmd)
app.command("report")(report_cmd)
app.command("metrics")(metrics_cmd)
app.command("memory")(memory_cmd)
app.command("decision")(decision_cmd)
app.command("validate")(validate_cmd)
app.command("health")(health_cmd)
app.command("doctor")(doctor_cmd)
app.command("recover")(recover_cmd)
app.command("chat")(chat_cmd)
app.command("workflow")(workflow_cmd)
app.command("tools")(tools_cmd)
app.command("plugins")(plugins_cmd)
app.command("agent")(agent_cmd)
app.command("config")(config_cmd)


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    version: Annotated[
        bool | None,
        typer.Option("--version", callback=_version_callback, is_eager=True, help="Show version and exit"),
    ] = None,
    repo_root: Annotated[
        Path | None,
        typer.Option("--root", "-r", help="Repository root directory"),
    ] = None,
    mode: Annotated[
        str | None,
        typer.Option("--mode", "-m", help="Operating mode"),
    ] = None,
    log_level: Annotated[
        str | None,
        typer.Option("--log-level", "-l", help="Log level"),
    ] = None,
) -> None:
    """Initialize shared config on every invocation."""
    if ctx.resilient_parsing:
        return

    root = (repo_root or Path.cwd()).resolve()
    config = load_config(root)

    if mode:
        config.mode = mode
    if log_level:
        config.log_level = log_level.upper()

    config.ensure_directories()

    logger = get_logger("aios.cli", config.log_level)
    logger.info("AIOS v%s | root=%s mode=%s", __version__, root, config.mode)

    ctx.ensure_object(dict)
    ctx.obj["config"] = config
