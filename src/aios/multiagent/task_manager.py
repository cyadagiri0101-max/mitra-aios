"""Task manager for multi-agent task delegation and tracking."""

from __future__ import annotations

import threading
import uuid

from aios.core.exceptions import MultiAgentError
from aios.core.logger import get_logger
from aios.multiagent.models import (
    MultiAgentValidationResult,
    Task,
    TaskStatus,
)


class TaskManager:
    """Manager for task creation, assignment, and tracking."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.multiagent.task_manager")
        self._tasks: dict[str, Task] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> TaskManager:
        self._initialized = True
        self.logger.info("TaskManager initialized")
        return self

    def create_task(
        self,
        description: str,
        assigned_to: str = "",
        priority: int = 0,
        dependencies: tuple[str, ...] = (),
        metadata: dict | None = None,
    ) -> Task:
        """Create a new task."""
        self._require_initialized()
        with self._lock:
            task_id = str(uuid.uuid4())
            task = Task(
                id=task_id,
                description=description,
                assigned_to=assigned_to,
                status=TaskStatus.ASSIGNED if assigned_to else TaskStatus.PENDING,
                priority=priority,
                dependencies=dependencies,
                metadata=metadata or {},
            )
            self._tasks[task_id] = task
            self.logger.debug("Created task '%s': %s", task_id, description[:50])
            return task

    def get_task(self, task_id: str) -> Task | None:
        """Get a task by ID."""
        self._require_initialized()
        with self._lock:
            return self._tasks.get(task_id)

    def assign_task(self, task_id: str, agent_id: str) -> bool:
        """Assign a task to an agent."""
        self._require_initialized()
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            updated_task = Task(
                id=task.id,
                description=task.description,
                assigned_to=agent_id,
                status=TaskStatus.ASSIGNED,
                priority=task.priority,
                dependencies=task.dependencies,
                result=task.result,
                metadata=task.metadata,
            )
            self._tasks[task_id] = updated_task
            self.logger.debug("Assigned task '%s' to '%s'", task_id, agent_id)
            return True

    def update_status(self, task_id: str, status: TaskStatus, result: str = "") -> bool:
        """Update task status and result."""
        self._require_initialized()
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            updated_task = Task(
                id=task.id,
                description=task.description,
                assigned_to=task.assigned_to,
                status=status,
                priority=task.priority,
                dependencies=task.dependencies,
                result=result,
                metadata=task.metadata,
            )
            self._tasks[task_id] = updated_task
            self.logger.debug("Updated task '%s' status to %s", task_id, status.value)
            return True

    def list_tasks(self, status: TaskStatus | None = None) -> list[Task]:
        """List tasks, optionally filtered by status."""
        self._require_initialized()
        with self._lock:
            tasks = list(self._tasks.values())
            if status:
                tasks = [t for t in tasks if t.status == status]
            return tasks

    def delete_task(self, task_id: str) -> bool:
        """Delete a task."""
        self._require_initialized()
        with self._lock:
            if task_id in self._tasks:
                del self._tasks[task_id]
                self.logger.debug("Deleted task '%s'", task_id)
                return True
            return False

    def count(self, status: TaskStatus | None = None) -> int:
        """Count tasks, optionally filtered by status."""
        self._require_initialized()
        with self._lock:
            if status:
                return sum(1 for t in self._tasks.values() if t.status == status)
            return len(self._tasks)

    def validate(self) -> MultiAgentValidationResult:
        """Validate task manager state."""
        result = MultiAgentValidationResult()
        with self._lock:
            if not self._tasks:
                result.warnings.append("No tasks have been created")
            # Check for circular dependencies
            for task in self._tasks.values():
                if task.id in task.dependencies:
                    result.errors.append(f"Task '{task.id}' has circular dependency")
                    result.is_valid = False
        return result

    def reload(self) -> TaskManager:
        """Reload task manager."""
        self.logger.info("Reloading TaskManager")
        with self._lock:
            self._tasks.clear()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MultiAgentError("TaskManager has not been initialized")
