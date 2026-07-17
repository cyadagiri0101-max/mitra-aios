"""Priority queue for job scheduling."""

from __future__ import annotations

import heapq
import threading
import time

from aios.core.exceptions import SchedulerError
from aios.core.logger import get_logger
from aios.scheduler.models import (
    Job,
    SchedulerValidationResult,
)


class PriorityQueue:
    """Priority queue for job scheduling."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.scheduler.priority_queue")
        self._queue: list[tuple[int, float, str, Job]] = []  # (priority, timestamp, job_id, job)
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> PriorityQueue:
        """Initialize the priority queue."""
        self._initialized = True
        self.logger.info("PriorityQueue initialized")
        return self

    def push(self, job: Job) -> None:
        """Push a job onto the queue."""
        self._require_initialized()

        with self._lock:
            # Use negative priority for max-heap behavior (higher priority = lower number)
            heapq.heappush(self._queue, (-job.priority, time.time(), job.id, job))
            self.logger.debug("Pushed job '%s' with priority %d", job.id, job.priority)

    def pop(self) -> Job | None:
        """Pop the highest priority job from the queue."""
        self._require_initialized()

        with self._lock:
            if not self._queue:
                return None

            _, _, _, job = heapq.heappop(self._queue)
            self.logger.debug("Popped job '%s'", job.id)
            return job

    def peek(self) -> Job | None:
        """Peek at the highest priority job without removing it."""
        self._require_initialized()

        with self._lock:
            if not self._queue:
                return None

            _, _, _, job = self._queue[0]
            return job

    def remove(self, job_id: str) -> bool:
        """Remove a job from the queue by ID."""
        self._require_initialized()

        with self._lock:
            for i, (_, _, jid, _) in enumerate(self._queue):
                if jid == job_id:
                    self._queue.pop(i)
                    heapq.heapify(self._queue)
                    self.logger.debug("Removed job '%s'", job_id)
                    return True
            return False

    def size(self) -> int:
        """Get the number of jobs in the queue."""
        self._require_initialized()

        with self._lock:
            return len(self._queue)

    def is_empty(self) -> bool:
        """Check if the queue is empty."""
        self._require_initialized()

        with self._lock:
            return len(self._queue) == 0

    def clear(self) -> None:
        """Clear all jobs from the queue."""
        self._require_initialized()

        with self._lock:
            self._queue.clear()
            self.logger.info("Cleared priority queue")

    def validate(self) -> SchedulerValidationResult:
        """Validate the priority queue."""
        return SchedulerValidationResult()

    def reload(self) -> PriorityQueue:
        """Reload the priority queue."""
        self.logger.info("Reloading PriorityQueue")
        self.clear()
        return self

    def _require_initialized(self) -> None:
        """Check if queue is initialized."""
        if not self._initialized:
            raise SchedulerError("PriorityQueue has not been initialized")
