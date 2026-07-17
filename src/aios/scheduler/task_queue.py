"""Task queue for job management."""

from __future__ import annotations

import threading
import time
import uuid

from aios.core.exceptions import SchedulerError
from aios.core.logger import get_logger
from aios.scheduler.models import (
    Job,
    JobStatus,
    JobType,
    RetryPolicy,
    SchedulerValidationResult,
)


class TaskQueue:
    """Task queue for job management."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.scheduler.task_queue")
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> TaskQueue:
        """Initialize the task queue."""
        self._initialized = True
        self.logger.info("TaskQueue initialized")
        return self

    def add_job(
        self,
        name: str,
        job_type: JobType = JobType.ONE_TIME,
        priority: int = 0,
        delay: float = 0.0,
        interval: float = 0.0,
        cron_expression: str = "",
        retry_policy: RetryPolicy | None = None,
        dependencies: tuple[str, ...] = (),
        payload: dict | None = None,
        metadata: dict | None = None,
    ) -> Job:
        """Add a job to the queue."""
        self._require_initialized()

        job_id = str(uuid.uuid4())
        now = time.time()

        job = Job(
            id=job_id,
            name=name,
            job_type=job_type,
            status=JobStatus.PENDING,
            priority=priority,
            delay=delay,
            interval=interval,
            cron_expression=cron_expression,
            retry_policy=retry_policy or RetryPolicy(),
            dependencies=dependencies,
            payload=payload or {},
            metadata=metadata or {},
            created_at=now,
            scheduled_at=now + delay,
        )

        with self._lock:
            self._jobs[job_id] = job

        self.logger.info("Added job '%s' (ID: %s)", name, job_id)
        return job

    def get_job(self, job_id: str) -> Job | None:
        """Get a job by ID."""
        self._require_initialized()

        with self._lock:
            return self._jobs.get(job_id)

    def update_job(self, job_id: str, **updates) -> bool:
        """Update a job."""
        self._require_initialized()

        with self._lock:
            if job_id not in self._jobs:
                return False

            job = self._jobs[job_id]
            updated_job = Job(
                id=job.id,
                name=job.name,
                job_type=job.job_type,
                status=updates.get("status", job.status),
                priority=updates.get("priority", job.priority),
                delay=job.delay,
                interval=job.interval,
                cron_expression=job.cron_expression,
                retry_policy=job.retry_policy,
                dependencies=job.dependencies,
                payload=job.payload,
                metadata=job.metadata,
                created_at=job.created_at,
                scheduled_at=job.scheduled_at,
                started_at=updates.get("started_at", job.started_at),
                completed_at=updates.get("completed_at", job.completed_at),
                retry_count=updates.get("retry_count", job.retry_count),
                last_error=updates.get("last_error", job.last_error),
            )
            self._jobs[job_id] = updated_job
            return True

    def remove_job(self, job_id: str) -> bool:
        """Remove a job from the queue."""
        self._require_initialized()

        with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                self.logger.info("Removed job '%s'", job_id)
                return True
            return False

    def list_jobs(self, status: JobStatus | None = None) -> list[Job]:
        """List all jobs, optionally filtered by status."""
        self._require_initialized()

        with self._lock:
            jobs = list(self._jobs.values())
            if status:
                jobs = [j for j in jobs if j.status == status]
            return jobs

    def count(self, status: JobStatus | None = None) -> int:
        """Count jobs, optionally filtered by status."""
        self._require_initialized()

        with self._lock:
            if status:
                return sum(1 for j in self._jobs.values() if j.status == status)
            return len(self._jobs)

    def validate(self) -> SchedulerValidationResult:
        """Validate the task queue."""
        result = SchedulerValidationResult()

        with self._lock:
            if not self._jobs:
                result.warnings.append("No jobs in queue")

        return result

    def reload(self) -> TaskQueue:
        """Reload the task queue."""
        self.logger.info("Reloading TaskQueue")

        with self._lock:
            self._jobs.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if queue is initialized."""
        if not self._initialized:
            raise SchedulerError("TaskQueue has not been initialized")
