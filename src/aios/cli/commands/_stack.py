"""Shared EOS stack helper for CLI commands — avoids circular imports."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from aios.api.stack import EOSStack

_stack_cache: dict[str, EOSStack] = {}

def get_stack(config: object) -> EOSStack:
    """Create and cache the EOS stack for CLI commands, isolated per repo_root."""
    from aios.api.stack import create_stack

    repo_root = getattr(config, "repo_root", Path.cwd())
    cache_key = str(repo_root.resolve())
    if cache_key not in _stack_cache:
        eos_path = repo_root / ".ai"
        db_path = repo_root / "aios_persistence.db"
        _stack_cache[cache_key] = create_stack(
            eos_path=eos_path, db_path=db_path, repo_root=repo_root,
        )
    return _stack_cache[cache_key]
