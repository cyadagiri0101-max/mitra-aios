"""Data models for scheduler."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class JobStatus(StrEnum):
    """Job status."""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(StrEnum):
    """Job type."""
    ONE_TIME = "one_time"
    RECURRING = "recurring"
    DELAYED = "delayed"
    CRON = "cron"


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    """Retry policy for jobs."""
    max_retries: int = 3
    retry_delay: float = 1.0
    exponential_backoff: bool = True
    max_delay: float = 60.0


@dataclass(frozen=True, slots=True)
class Job:
    """Job model."""
    id: str = ""
    name: str = ""
    job_type: JobType = JobType.ONE_TIME
    status: JobStatus = JobStatus.PENDING
    priority: int = 0
    delay: float = 0.0
    interval: float = 0.0
    cron_expression: str = ""
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    dependencies: tuple[str, ...] = ()
    payload: dict = field(default_factory=dict)
    metadata: dict = field(default_factory=dict)
    created_at: float = 0.0
    scheduled_at: float = 0.0
    started_at: float = 0.0
    completed_at: float = 0.0
    retry_count: int = 0
    last_error: str = ""


@dataclass(slots=True)
class SchedulerStatistics:
    """Scheduler statistics."""
    total_jobs: int = 0
    pending_jobs: int = 0
    running_jobs: int = 0
    completed_jobs: int = 0
    failed_jobs: int = 0
    cancelled_jobs: int = 0


@dataclass(slots=True)
class SchedulerValidationResult:
    """Scheduler validation result."""
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
