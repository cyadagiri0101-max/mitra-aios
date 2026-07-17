"""Tests for AIOS Scheduler."""

from __future__ import annotations

import pytest

from aios.core.exceptions import SchedulerError
from aios.scheduler.job_manager import JobManager
from aios.scheduler.manager import Scheduler
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

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_retry_policy_creation(self):
        policy = RetryPolicy(
            max_retries=5,
            retry_delay=2.0,
            exponential_backoff=True,
            max_delay=120.0,
        )
        assert policy.max_retries == 5
        assert policy.retry_delay == 2.0
        assert policy.exponential_backoff is True
        assert policy.max_delay == 120.0

    def test_job_creation(self):
        job = Job(
            id="job1",
            name="test-job",
            job_type=JobType.ONE_TIME,
            status=JobStatus.PENDING,
            priority=5,
            delay=10.0,
        )
        assert job.id == "job1"
        assert job.name == "test-job"
        assert job.job_type == JobType.ONE_TIME
        assert job.status == JobStatus.PENDING
        assert job.priority == 5
        assert job.delay == 10.0

    def test_scheduler_statistics_creation(self):
        stats = SchedulerStatistics(
            total_jobs=100,
            pending_jobs=50,
            running_jobs=10,
            completed_jobs=35,
            failed_jobs=3,
            cancelled_jobs=2,
        )
        assert stats.total_jobs == 100
        assert stats.pending_jobs == 50
        assert stats.running_jobs == 10
        assert stats.completed_jobs == 35
        assert stats.failed_jobs == 3
        assert stats.cancelled_jobs == 2

    def test_scheduler_validation_result_creation(self):
        result = SchedulerValidationResult(
            is_valid=False,
            warnings=["Warning 1"],
            errors=["Error 1"],
        )
        assert result.is_valid is False
        assert result.warnings == ["Warning 1"]
        assert result.errors == ["Error 1"]

    def test_job_status_enum(self):
        assert JobStatus.PENDING.value == "pending"
        assert JobStatus.SCHEDULED.value == "scheduled"
        assert JobStatus.RUNNING.value == "running"
        assert JobStatus.COMPLETED.value == "completed"
        assert JobStatus.FAILED.value == "failed"
        assert JobStatus.CANCELLED.value == "cancelled"

    def test_job_type_enum(self):
        assert JobType.ONE_TIME.value == "one_time"
        assert JobType.RECURRING.value == "recurring"
        assert JobType.DELAYED.value == "delayed"
        assert JobType.CRON.value == "cron"


# ---------------------------------------------------------------------------
# PriorityQueue
# ---------------------------------------------------------------------------


class TestPriorityQueue:
    def test_initialize(self):
        queue = PriorityQueue()
        assert queue.is_initialized is False
        queue.initialize()
        assert queue.is_initialized is True

    def test_push_and_pop(self):
        queue = PriorityQueue().initialize()
        job = Job(id="job1", name="test", priority=5)
        queue.push(job)
        popped = queue.pop()
        assert popped is not None
        assert popped.id == "job1"

    def test_pop_empty(self):
        queue = PriorityQueue().initialize()
        assert queue.pop() is None

    def test_peek(self):
        queue = PriorityQueue().initialize()
        job = Job(id="job1", name="test", priority=5)
        queue.push(job)
        peeked = queue.peek()
        assert peeked is not None
        assert peeked.id == "job1"
        assert queue.size() == 1  # Should not remove

    def test_priority_ordering(self):
        queue = PriorityQueue().initialize()
        job1 = Job(id="job1", name="low", priority=1)
        job2 = Job(id="job2", name="high", priority=10)
        job3 = Job(id="job3", name="medium", priority=5)

        queue.push(job1)
        queue.push(job2)
        queue.push(job3)

        # Higher priority should come first
        first = queue.pop()
        assert first.id == "job2"

        second = queue.pop()
        assert second.id == "job3"

        third = queue.pop()
        assert third.id == "job1"

    def test_remove(self):
        queue = PriorityQueue().initialize()
        job = Job(id="job1", name="test")
        queue.push(job)
        assert queue.remove("job1") is True
        assert queue.size() == 0

    def test_remove_nonexistent(self):
        queue = PriorityQueue().initialize()
        assert queue.remove("nonexistent") is False

    def test_size(self):
        queue = PriorityQueue().initialize()
        queue.push(Job(id="job1", name="test1"))
        queue.push(Job(id="job2", name="test2"))
        assert queue.size() == 2

    def test_is_empty(self):
        queue = PriorityQueue().initialize()
        assert queue.is_empty() is True
        queue.push(Job(id="job1", name="test"))
        assert queue.is_empty() is False

    def test_clear(self):
        queue = PriorityQueue().initialize()
        queue.push(Job(id="job1", name="test"))
        queue.clear()
        assert queue.size() == 0

    def test_validate(self):
        queue = PriorityQueue().initialize()
        result = queue.validate()
        assert isinstance(result, SchedulerValidationResult)

    def test_reload(self):
        queue = PriorityQueue().initialize()
        queue.push(Job(id="job1", name="test"))
        queue.reload()
        assert queue.size() == 0

    def test_uninitialized_raises(self):
        queue = PriorityQueue()
        with pytest.raises(SchedulerError):
            queue.push(Job(id="job1", name="test"))


# ---------------------------------------------------------------------------
# TaskQueue
# ---------------------------------------------------------------------------


class TestTaskQueue:
    def test_initialize(self):
        queue = TaskQueue()
        assert queue.is_initialized is False
        queue.initialize()
        assert queue.is_initialized is True

    def test_add_job(self):
        queue = TaskQueue().initialize()
        job = queue.add_job("test-job", priority=5)
        assert job.name == "test-job"
        assert job.priority == 5
        assert job.status == JobStatus.PENDING

    def test_get_job(self):
        queue = TaskQueue().initialize()
        job = queue.add_job("test-job")
        retrieved = queue.get_job(job.id)
        assert retrieved is not None
        assert retrieved.id == job.id

    def test_get_nonexistent_job(self):
        queue = TaskQueue().initialize()
        assert queue.get_job("nonexistent") is None

    def test_update_job(self):
        queue = TaskQueue().initialize()
        job = queue.add_job("test-job")
        assert queue.update_job(job.id, status=JobStatus.RUNNING) is True
        updated = queue.get_job(job.id)
        assert updated.status == JobStatus.RUNNING

    def test_update_nonexistent_job(self):
        queue = TaskQueue().initialize()
        assert queue.update_job("nonexistent", status=JobStatus.RUNNING) is False

    def test_remove_job(self):
        queue = TaskQueue().initialize()
        job = queue.add_job("test-job")
        assert queue.remove_job(job.id) is True
        assert queue.get_job(job.id) is None

    def test_remove_nonexistent_job(self):
        queue = TaskQueue().initialize()
        assert queue.remove_job("nonexistent") is False

    def test_list_jobs_all(self):
        queue = TaskQueue().initialize()
        queue.add_job("job1")
        queue.add_job("job2")
        jobs = queue.list_jobs()
        assert len(jobs) == 2

    def test_list_jobs_by_status(self):
        queue = TaskQueue().initialize()
        job1 = queue.add_job("job1")
        queue.add_job("job2")
        queue.update_job(job1.id, status=JobStatus.RUNNING)

        running = queue.list_jobs(JobStatus.RUNNING)
        pending = queue.list_jobs(JobStatus.PENDING)

        assert len(running) == 1
        assert len(pending) == 1

    def test_count_all(self):
        queue = TaskQueue().initialize()
        queue.add_job("job1")
        queue.add_job("job2")
        assert queue.count() == 2

    def test_count_by_status(self):
        queue = TaskQueue().initialize()
        job1 = queue.add_job("job1")
        queue.add_job("job2")
        queue.update_job(job1.id, status=JobStatus.RUNNING)

        assert queue.count(JobStatus.RUNNING) == 1
        assert queue.count(JobStatus.PENDING) == 1

    def test_validate(self):
        queue = TaskQueue().initialize()
        result = queue.validate()
        assert isinstance(result, SchedulerValidationResult)

    def test_reload(self):
        queue = TaskQueue().initialize()
        queue.add_job("test-job")
        queue.reload()
        assert queue.count() == 0

    def test_uninitialized_raises(self):
        queue = TaskQueue()
        with pytest.raises(SchedulerError):
            queue.add_job("test-job")


# ---------------------------------------------------------------------------
# JobManager
# ---------------------------------------------------------------------------


class TestJobManager:
    def test_initialize(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue)
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_schedule_job(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue).initialize()

        job = task_queue.add_job("test-job")
        manager.schedule_job(job)

        assert priority_queue.size() == 1

    def test_execute_next_job(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue).initialize()

        job = task_queue.add_job("test-job")
        manager.schedule_job(job)

        executed = manager.execute_next_job()
        assert executed is not None
        assert executed.id == job.id
        assert manager.executed_count == 1

    def test_execute_empty_queue(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue).initialize()

        assert manager.execute_next_job() is None

    def test_cancel_job(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue).initialize()

        job = task_queue.add_job("test-job")
        manager.schedule_job(job)

        assert manager.cancel_job(job.id) is True
        assert priority_queue.size() == 0

    def test_statistics(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue).initialize()

        assert manager.executed_count == 0
        assert manager.failed_count == 0

    def test_validate(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue).initialize()

        result = manager.validate()
        assert isinstance(result, SchedulerValidationResult)

    def test_reload(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue).initialize()

        job = task_queue.add_job("test-job")
        manager.schedule_job(job)
        manager.execute_next_job()

        manager.reload()
        assert manager.executed_count == 0

    def test_uninitialized_raises(self):
        task_queue = TaskQueue().initialize()
        priority_queue = PriorityQueue().initialize()
        manager = JobManager(task_queue, priority_queue)

        with pytest.raises(SchedulerError):
            manager.schedule_job(Job(id="job1", name="test"))


# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------


class TestScheduler:
    def test_initialize(self):
        scheduler = Scheduler()
        assert scheduler.is_initialized is False
        scheduler.initialize()
        assert scheduler.is_initialized is True

    def test_double_initialize(self):
        scheduler = Scheduler().initialize()
        scheduler.initialize()
        assert scheduler.is_initialized is True

    def test_schedule_job(self):
        scheduler = Scheduler().initialize()
        job = scheduler.schedule_job("test-job", priority=5)
        assert job.name == "test-job"
        assert job.priority == 5

    def test_cancel_job(self):
        scheduler = Scheduler().initialize()
        job = scheduler.schedule_job("test-job")
        assert scheduler.cancel_job(job.id) is True

    def test_get_job(self):
        scheduler = Scheduler().initialize()
        job = scheduler.schedule_job("test-job")
        retrieved = scheduler.get_job(job.id)
        assert retrieved is not None
        assert retrieved.id == job.id

    def test_list_jobs(self):
        scheduler = Scheduler().initialize()
        scheduler.schedule_job("job1")
        scheduler.schedule_job("job2")
        jobs = scheduler.list_jobs()
        assert len(jobs) == 2

    def test_execute_next(self):
        scheduler = Scheduler().initialize()
        job = scheduler.schedule_job("test-job")
        executed = scheduler.execute_next()
        assert executed is not None
        assert executed.id == job.id

    def test_get_statistics(self):
        scheduler = Scheduler().initialize()
        scheduler.schedule_job("job1")
        scheduler.schedule_job("job2")
        stats = scheduler.get_statistics()
        assert isinstance(stats, SchedulerStatistics)
        assert stats.total_jobs == 2

    def test_validate(self):
        scheduler = Scheduler().initialize()
        result = scheduler.validate()
        assert isinstance(result, SchedulerValidationResult)

    def test_reload(self):
        scheduler = Scheduler().initialize()
        scheduler.schedule_job("test-job")
        scheduler.reload()
        assert scheduler.is_initialized is False

    def test_shutdown(self):
        scheduler = Scheduler().initialize()
        scheduler.schedule_job("test-job")
        scheduler.shutdown()
        assert scheduler.is_initialized is False

    def test_uninitialized_raises(self):
        scheduler = Scheduler()
        with pytest.raises(SchedulerError):
            scheduler.schedule_job("test-job")

    def test_components_accessible(self):
        scheduler = Scheduler().initialize()
        assert scheduler.task_queue is not None
        assert scheduler.priority_queue is not None
        assert scheduler.job_manager is not None


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_scheduler_workflow(self):
        scheduler = Scheduler().initialize()

        # Schedule jobs
        job1 = scheduler.schedule_job("job1", priority=5)
        job2 = scheduler.schedule_job("job2", priority=10)
        job3 = scheduler.schedule_job("job3", priority=1)

        # List jobs
        jobs = scheduler.list_jobs()
        assert len(jobs) == 3

        # Execute jobs (should execute in priority order)
        executed1 = scheduler.execute_next()
        assert executed1.id == job2.id  # Highest priority

        executed2 = scheduler.execute_next()
        assert executed2.id == job1.id  # Medium priority

        executed3 = scheduler.execute_next()
        assert executed3.id == job3.id  # Lowest priority

        # Get statistics
        stats = scheduler.get_statistics()
        assert stats.total_jobs == 3
        assert stats.completed_jobs == 3

        # Validate
        validation = scheduler.validate()
        assert validation.is_valid is True

        scheduler.shutdown()
