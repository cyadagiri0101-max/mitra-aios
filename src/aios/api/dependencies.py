"""FastAPI dependency injection for the AIOS EOS stack."""

from __future__ import annotations

from aios.api.stack import EOSStack, create_stack

_stack_instance: EOSStack | None = None


def get_stack() -> EOSStack:
    global _stack_instance
    if _stack_instance is None:
        _stack_instance = create_stack()
    return _stack_instance


def set_stack(stack: EOSStack) -> None:
    global _stack_instance
    _stack_instance = stack


def reset_stack() -> None:
    global _stack_instance
    _stack_instance = None
