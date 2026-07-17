"""Specialized agents for multi-agent framework."""

from __future__ import annotations

from aios.multiagent.agent import MultiAgent
from aios.multiagent.models import AgentRole, Task


class WorkerAgent(MultiAgent):
    """Worker agent that executes tasks."""

    def __init__(self, agent_id: str) -> None:
        super().__init__(agent_id, AgentRole.WORKER)

    def execute_task(self, task: Task) -> str:
        """Execute a task."""
        self.logger.info("Worker '%s' executing task '%s'", self._agent_id, task.id)
        result = super().execute_task(task)
        self.store_memory(f"task_result_{task.id}", result)
        return result


class SupervisorAgent(MultiAgent):
    """Supervisor agent that manages and coordinates workers."""

    def __init__(self, agent_id: str) -> None:
        super().__init__(agent_id, AgentRole.SUPERVISOR)
        self._managed_agents: list[str] = []

    def add_worker(self, agent_id: str) -> None:
        """Add a worker to the supervisor's management."""
        self._managed_agents.append(agent_id)
        self.logger.info("Supervisor '%s' now manages '%s'", self._agent_id, agent_id)

    def delegate_task(self, task: Task, worker_id: str) -> None:
        """Delegate a task to a worker."""
        if not self._task_manager:
            from aios.core.exceptions import MultiAgentError
            raise MultiAgentError("Task manager not initialized", agent_id=self._agent_id)

        self._task_manager.assign_task(task.id, worker_id)
        self.send_message(worker_id, f"Task '{task.id}' assigned to you", "assignment")

    def monitor_workers(self) -> dict[str, str]:
        """Monitor worker status."""
        status = {}
        for worker_id in self._managed_agents:
            status[worker_id] = "active"
        return status


class CriticAgent(MultiAgent):
    """Critic agent that evaluates and provides feedback."""

    def __init__(self, agent_id: str) -> None:
        super().__init__(agent_id, AgentRole.CRITIC)

    def evaluate(self, content: str, criteria: str = "quality") -> dict:
        """Evaluate content based on criteria."""
        self.logger.info("Critic '%s' evaluating content", self._agent_id)
        # Simulate evaluation
        score = 0.85
        feedback = f"Content evaluated with score {score} on {criteria}"
        return {
            "score": score,
            "feedback": feedback,
            "criteria": criteria,
        }

    def provide_feedback(self, agent_id: str, feedback: str) -> None:
        """Provide feedback to another agent."""
        self.send_message(agent_id, feedback, "feedback")


class PlannerAgent(MultiAgent):
    """Planner agent that creates and manages plans."""

    def __init__(self, agent_id: str) -> None:
        super().__init__(agent_id, AgentRole.PLANNER)

    def create_plan(self, goal: str) -> list[Task]:
        """Create a plan to achieve a goal."""
        self.logger.info("Planner '%s' creating plan for: %s", self._agent_id, goal)
        if not self._task_manager:
            from aios.core.exceptions import MultiAgentError
            raise MultiAgentError("Task manager not initialized", agent_id=self._agent_id)

        # Simulate plan creation
        tasks = []
        for i in range(3):
            task = self._task_manager.create_task(
                description=f"Step {i + 1} for goal: {goal}",
                priority=i,
            )
            tasks.append(task)

        self.store_memory(f"plan_{goal}", str([t.id for t in tasks]))
        return tasks


class ResearchAgent(MultiAgent):
    """Research agent that gathers information."""

    def __init__(self, agent_id: str) -> None:
        super().__init__(agent_id, AgentRole.RESEARCHER)

    def research(self, topic: str) -> str:
        """Research a topic and return findings."""
        self.logger.info("Researcher '%s' researching: %s", self._agent_id, topic)
        # Simulate research
        findings = f"Research findings on '{topic}': Key insights and data collected."
        self.store_memory(f"research_{topic}", findings)
        return findings

    def analyze(self, data: str) -> dict:
        """Analyze data and return insights."""
        self.logger.info("Researcher '%s' analyzing data", self._agent_id)
        # Simulate analysis
        return {
            "summary": f"Analysis of: {data[:100]}",
            "insights": ["Insight 1", "Insight 2"],
            "confidence": 0.9,
        }


class ExecutionAgent(MultiAgent):
    """Execution agent that executes complex operations."""

    def __init__(self, agent_id: str) -> None:
        super().__init__(agent_id, AgentRole.EXECUTOR)

    def execute_operation(self, operation: str, parameters: dict) -> dict:
        """Execute a complex operation."""
        self.logger.info("Executor '%s' executing operation: %s", self._agent_id, operation)
        # Simulate operation execution
        result = {
            "operation": operation,
            "status": "completed",
            "output": f"Operation '{operation}' executed with parameters: {parameters}",
        }
        self.store_memory(f"operation_{operation}", str(result))
        return result

    def batch_execute(self, operations: list[tuple[str, dict]]) -> list[dict]:
        """Execute multiple operations in batch."""
        results = []
        for operation, parameters in operations:
            result = self.execute_operation(operation, parameters)
            results.append(result)
        return results
