"""Structured logging for AIOS."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

_DEFAULT_LEVEL = "INFO"
_FORMATTER = logging.Formatter(
    "%(asctime)s %(levelname)-8s %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

_configured: set[str] = set()


def get_logger(
    name: str,
    level: str | None = None,
    log_file: Path | str | None = None,
) -> logging.Logger:
    """Return a configured logger instance.

    Each unique *name* is configured exactly once. Subsequent calls with the
    same name return the existing logger without adding duplicate handlers.
    """
    if name in _configured:
        return logging.getLogger(name)

    logger = logging.getLogger(name)
    resolved = (level or _DEFAULT_LEVEL).upper()
    numeric = getattr(logging, resolved, logging.INFO)
    logger.setLevel(numeric)
    logger.propagate = False

    stream = logging.StreamHandler(sys.stderr)
    stream.setFormatter(_FORMATTER)
    logger.addHandler(stream)

    if log_file is not None:
        path = Path(log_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(path, encoding="utf-8")
        fh.setFormatter(_FORMATTER)
        logger.addHandler(fh)

    _configured.add(name)
    return logger
