"""Streaming support for LLM responses."""

from __future__ import annotations

import threading
import time
from collections.abc import Callable, Iterator

from aios.core.logger import get_logger


class LLMStream:
    def __init__(
        self,
        source: Iterator[str],
        timeout: float = 30.0,
    ) -> None:
        self.logger = get_logger("aios.llm.stream")
        self._source = source
        self._timeout = timeout
        self._buffer: list[str] = []
        self._done: bool = False
        self._error: Exception | None = None
        self._lock = threading.Lock()
        self._callbacks: list[Callable[[str], None]] = []
        self._cancelled: bool = False
        self._start_time: float = time.monotonic()

    def __iter__(self) -> Iterator[str]:
        return self

    def __next__(self) -> str:
        if self._cancelled:
            raise StopIteration
        if self._done:
            raise StopIteration
        if time.monotonic() - self._start_time > self._timeout:
            self._error = TimeoutError("Stream timeout exceeded")
            raise self._error
        try:
            chunk = next(self._source)
            with self._lock:
                self._buffer.append(chunk)
                for cb in list(self._callbacks):
                    try:
                        cb(chunk)
                    except Exception:
                        self.logger.exception("Stream callback failed")
            return chunk
        except StopIteration:
            self._done = True
            raise

    def cancel(self) -> None:
        with self._lock:
            self._cancelled = True

    def on_chunk(self, callback: Callable[[str], None]) -> None:
        with self._lock:
            self._callbacks.append(callback)

    @property
    def chunks(self) -> list[str]:
        with self._lock:
            return list(self._buffer)

    @property
    def is_done(self) -> bool:
        return self._done

    @property
    def is_cancelled(self) -> bool:
        return self._cancelled

    @property
    def error(self) -> Exception | None:
        return self._error

    def collect(self) -> str:
        parts: list[str] = []
        for chunk in self:
            parts.append(chunk)
        return "".join(parts)
