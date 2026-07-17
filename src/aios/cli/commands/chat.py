"""Chat command — interactive conversation with AI agents."""

from __future__ import annotations

import json as _json
from typing import Annotated

import typer


def chat_cmd(
    ctx: typer.Context,
    message: Annotated[
        str | None, typer.Argument(help="Message to send (omit for interactive mode)")
    ] = None,
    agent: Annotated[
        str | None, typer.Option("--agent", "-a", help="Target agent name")
    ] = None,
    model: Annotated[
        str | None, typer.Option("--model", help="LLM model override")
    ] = None,
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
) -> None:
    """Chat with an AI agent interactively or send a single message."""
    config = ctx.obj["config"]

    if message:
        result = _send_message(config, message, agent=agent, model=model)
        if json_output:
            typer.echo(_json.dumps(result, indent=2, default=str))
        else:
            typer.echo(result.get("response", ""))
        return

    typer.echo("AIOS Chat — type 'exit' or 'quit' to stop")
    if agent:
        typer.echo(f"Agent: {agent}")
    while True:
        try:
            user_input = typer.prompt("You")
        except (typer.Abort, EOFError):
            typer.echo("\nGoodbye!")
            break
        if user_input.strip().lower() in ("exit", "quit"):
            typer.echo("Goodbye!")
            break
        result = _send_message(config, user_input, agent=agent, model=model)
        if verbose and "metadata" in result:
            typer.echo(f"  [metadata: {_json.dumps(result['metadata'], default=str)}]")
        typer.echo(f"Assistant: {result.get('response', '')}")


def _send_message(
    config: object,
    message: str,
    *,
    agent: str | None = None,
    model: str | None = None,
) -> dict:
    """Route a chat message to the appropriate handler."""
    try:
        from aios.agent.agent import Agent
        from aios.llm.manager import LLMManager

        llm = LLMManager(config)
        llm.initialize()
        agent_instance = Agent(name=agent or "default", llm_manager=llm)
        response = agent_instance.process_message(message)
        return {"response": response, "metadata": {"agent": agent or "default", "model": model}}
    except Exception as exc:
        return {"response": f"[error: {exc}]", "metadata": {"error": str(exc)}}
