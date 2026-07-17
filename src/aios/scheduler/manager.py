"""Scheduler - main facade for the scheduler system."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import SchedulerError
from aios.core.logger import get_logger
from aios.scheduler.job_manager import JobManager
from aios.scheduler.models import (
    Job,
    JobStatus,
    JobType,
    RetryPolicy,
    SchedulerStatistics,
    SchedulerValidationResult,
)
from aios.scheduler.priority_queue import PriorityQueue
from aios.scheduler.task_queue import TaskQueue


class Scheduler:
    """Main facade for the scheduler system."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.scheduler.manager")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._running: bool = False

        # Initialize components
        self._task_queue = TaskQueue()
        self._priority_queue = PriorityQueue()
        self._job_manager = JobManager(
            task_queue=self._task_queue,
            priority_queue=self._priority_queue,
        )

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def task_queue(self) -> TaskQueue:
        return self._task_queue

    @property
    def priority_queue(self) -> PriorityQueue:
        return self._priority_queue

    @property
    def job_manager(self) -> JobManager:
        return self._job_manager

    def initialize(self) -> Scheduler:
        """Initialize the scheduler and all components."""
        with self._lock:
            if self._initialized:
                return self

            self._task_queue.initialize()
            self._priority_queue.initialize()
            self._job_manager.initialize()

            self._initialized = True
            self.logger.info("Scheduler initialized")

        return self

    def schedule_job(
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
        """Schedule a job."""
        self._require_initialized()

        job = self._task_queue.add_job(
            name=name,
            job_type=job_type,
            priority=priority,
            delay=delay,
            interval=interval,
            cron_expression=cron_expression,
            retry_policy=retry_policy,
            dependencies=dependencies,
            payload=payload,
            metadata=metadata,
        )

        self._job_manager.schedule_job(job)
        return job

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a job."""
        self._require_initialized()
        return self._job_manager.cancel_job(job_id)

    def get_job(self, job_id: str) -> Job | None:
        """Get a job by ID."""
        self._require_initialized()
        return self._task_queue.get_job(job_id)

    def list_jobs(self, status: JobStatus | None = None) -> list[Job]:
        """List all jobs, optionally filtered by status."""
        self._require_initialized()
        return self._task_queue.list_jobs(status)

    def execute_next(self) -> Job | None:
        """Execute the next job in the queue."""
        self._require_initialized()
        return self._job_manager.execute_next_job()

    def run(self) -> None:
        """Run the scheduler (blocking)."""
        self._require_initialized()

        with self._lock:
            self._running = True

        self.logger.info("Scheduler started")

        try:
            while self._running:
                job = self.execute_next()
                if not job:
                    time.sleep(0.1)
        finally:
            with self._lock:
                self._running = False
            self.logger.info("Scheduler stopped")

    def stop(self) -> None:
        """Stop the scheduler."""
        with self._lock:
            self._running = False

    def get_statistics(self) -> SchedulerStatistics:
        """Get scheduler statistics."""
        self._require_initialized()

        return SchedulerStatistics(
            total_jobs=self._task_queue.count(),
            pending_jobs=self._task_queue.count(JobStatus.PENDING),
            running_jobs=self._task_queue.count(JobStatus.RUNNING),
            completed_jobs=self._task_queue.count(JobStatus.COMPLETED),
            failed_jobs=self._task_queue.count(JobStatus.FAILED),
            cancelled_jobs=self._task_queue.count(JobStatus.CANCELLED),
        )

    def validate(self) -> SchedulerValidationResult:
        """Validate the scheduler."""
        self._require_initialized()

        result = SchedulerValidationResult()

        # Validate all components
        for component in [self._task_queue, self._priority_queue, self._job_manager]:
            component_result = component.validate()
            result.warnings.extend(component_result.warnings)
            result.errors.extend(component_result.errors)
            if not component_result.is_valid:
                result.is_valid = False

        return result

    def reload(self) -> Scheduler:
        """Reload the scheduler."""
        self.logger.info("Reloading Scheduler")

        with self._lock:
            self._task_queue.reload()
            self._priority_queue.reload()
            self._job_manager.reload()
            self._initialized = False

        self.logger.info("Scheduler reloaded")
        return self

    def shutdown(self) -> None:
        """Shutdown the scheduler."""
        self.logger.info("Shutting down Scheduler")

        self.stop()

        with self._lock:
            self._initialized = False

    def _require_initialized(self) -> None:
        """Check if scheduler is initialized."""
        if not self._initialized:
            raise SchedulerError("Scheduler has not been initialized")
