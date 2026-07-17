"""Job manager for job execution and lifecycle."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import SchedulerError
from aios.core.logger import get_logger
from aios.scheduler.models import (
    Job,
    JobStatus,
    SchedulerValidationResult,
)
from aios.scheduler.priority_queue import PriorityQueue
from aios.scheduler.task_queue import TaskQueue


class JobManager:
    """Manager for job execution and lifecycle."""

    def __init__(
        self,
        task_queue: TaskQueue,
        priority_queue: PriorityQueue,
    ) -> None:
        self.logger = get_logger("aios.scheduler.job_manager")
        self._task_queue = task_queue
        self._priority_queue = priority_queue
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executed_jobs: int = 0
        self._failed_jobs: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def executed_count(self) -> int:
        with self._lock:
            return self._executed_jobs

    @property
    def failed_count(self) -> int:
        with self._lock:
            return self._failed_jobs

    def initialize(self) -> JobManager:
        """Initialize the job manager."""
        self._initialized = True
        self.logger.info("JobManager initialized")
        return self

    def schedule_job(self, job: Job) -> None:
        """Schedule a job for execution."""
        self._require_initialized()

        # Update job status
        self._task_queue.update_job(job.id, status=JobStatus.SCHEDULED)

        # Add to priority queue
        self._priority_queue.push(job)

        self.logger.info("Scheduled job '%s'", job.name)

    def execute_next_job(self) -> Job | None:
        """Execute the next job in the queue."""
        self._require_initialized()

        job = self._priority_queue.pop()
        if not job:
            return None

        # Update job status
        self._task_queue.update_job(job.id, status=JobStatus.RUNNING, started_at=time.time())

        try:
            # Simulate job execution
            self._execute_job(job)

            # Update job status
            self._task_queue.update_job(job.id, status=JobStatus.COMPLETED, completed_at=time.time())

            with self._lock:
                self._executed_jobs += 1

            self.logger.info("Executed job '%s'", job.name)
            return job

        except Exception as e:
            # Handle retry
            retry_policy = job.retry_policy
            if job.retry_count < retry_policy.max_retries:
                retry_count = job.retry_count + 1
                delay = retry_policy.retry_delay
                if retry_policy.exponential_backoff:
                    delay *= (2 ** (retry_count - 1))
                    delay = min(delay, retry_policy.max_delay)

                self._task_queue.update_job(
                    job.id,
                    status=JobStatus.PENDING,
                    retry_count=retry_count,
                    last_error=str(e),
                )

                # Reschedule with delay
                rescheduled_job = Job(
                    id=job.id,
                    name=job.name,
                    job_type=job.job_type,
                    status=JobStatus.PENDING,
                    priority=job.priority,
                    delay=delay,
                    interval=job.interval,
                    cron_expression=job.cron_expression,
                    retry_policy=job.retry_policy,
                    dependencies=job.dependencies,
                    payload=job.payload,
                    metadata=job.metadata,
                    created_at=job.created_at,
                    scheduled_at=time.time() + delay,
                    started_at=job.started_at,
                    completed_at=job.completed_at,
                    retry_count=retry_count,
                    last_error=str(e),
                )
                self._priority_queue.push(rescheduled_job)

                self.logger.warning("Job '%s' failed, retrying (%d/%d)", job.name, retry_count, retry_policy.max_retries)
            else:
                self._task_queue.update_job(
                    job.id,
                    status=JobStatus.FAILED,
                    completed_at=time.time(),
                    last_error=str(e),
                )

                with self._lock:
                    self._failed_jobs += 1

                self.logger.error("Job '%s' failed after %d retries: %s", job.name, retry_policy.max_retries, e)

            return job

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a job."""
        self._require_initialized()

        # Remove from priority queue
        self._priority_queue.remove(job_id)

        # Update job status
        return self._task_queue.update_job(job_id, status=JobStatus.CANCELLED)

    def _execute_job(self, job: Job) -> None:
        """Execute a job (placeholder implementation)."""
        # Simulate job execution
        time.sleep(0.01)

    def validate(self) -> SchedulerValidationResult:
        """Validate the job manager."""
        return SchedulerValidationResult()

    def reload(self) -> JobManager:
        """Reload the job manager."""
        self.logger.info("Reloading JobManager")

        with self._lock:
            self._executed_jobs = 0
            self._failed_jobs = 0

        return self

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise SchedulerError("JobManager has not been initialized")
