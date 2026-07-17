"""Request/response schemas for the AIOS REST API."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class LoadRequest:
    eos_path: str


@dataclass
class LoadResponse:
    success: bool
    metadata: dict | None = None
    errors: list[str] = field(default_factory=list)


@dataclass
class DiscoverRequest:
    task_description: str
    top_k: int = 10
    min_confidence: float = 0.0


@dataclass
class DiscoverResponse:
    capabilities: list[dict] = field(default_factory=list)
    total_found: int = 0


@dataclass
class KnowledgeSearchRequest:
    query: str
    top_k: int = 10


@dataclass
class KnowledgeSearchResponse:
    results: list[dict] = field(default_factory=list)
    total_found: int = 0


@dataclass
class ContextBuildRequest:
    task_description: str
    max_tokens: int = 4096


@dataclass
class ContextBuildResponse:
    context: dict | None = None
    item_count: int = 0
    warnings: list[str] = field(default_factory=list)


@dataclass
class PlanRequest:
    task_description: str
    strategy: str = "sequential"


@dataclass
class PlanResponse:
    plan: dict | None = None
    action_count: int = 0


@dataclass
class WorkflowBuildRequest:
    task_description: str
    strategy: str = "sequential"
    steps: list[dict] = field(default_factory=list)


@dataclass
class WorkflowBuildResponse:
    workflow: dict | None = None
    step_count: int = 0


@dataclass
class ExecuteRequest:
    workflow: dict


@dataclass
class ExecuteResponse:
    execution_id: str = ""
    status: str = ""


@dataclass
class ExecuteAgentRequest:
    workflow: dict


@dataclass
class ExecuteAgentResponse:
    execution_id: str = ""
    all_successful: bool = False
    summary: dict | None = None


@dataclass
class PublishEventRequest:
    event_type: str
    execution_id: str
    step_id: str | None = None
    message: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass
class RegisterToolRequest:
    name: str
    description: str = ""
    parameters: list[dict] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    timeout_seconds: float = 30.0


@dataclass
class MetricResponse:
    metrics: dict | None = None
    timestamp: float = 0.0


@dataclass
class ErrorResponse:
    detail: str
    error_type: str = ""
    status_code: int = 400
