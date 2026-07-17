"""Custom exception hierarchy for AIOS."""

from __future__ import annotations


class AIOSBaseError(Exception):
    """Base exception for all AIOS errors."""

    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


class ConfigError(AIOSBaseError):
    """Configuration loading or validation error."""


class ConfigurationError(AIOSBaseError):
    """Unified configuration system error."""

    def __init__(
        self,
        message: str,
        *,
        key: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.key = key
        self.issues = issues or []


class SecretsError(AIOSBaseError):
    """Secrets management, storage, or access error."""

    def __init__(
        self,
        message: str,
        *,
        secret_name: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.secret_name = secret_name
        self.issues = issues or []


class RepositoryError(AIOSBaseError):
    """Repository scanning or access error."""


class PluginError(AIOSBaseError):
    """Plugin installation, loading, or lifecycle error."""

    def __init__(
        self,
        message: str,
        *,
        plugin_name: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.plugin_name = plugin_name
        self.issues = issues or []


class StateError(AIOSBaseError):
    """State generation, synchronization, or validation error."""


class ValidationError(AIOSBaseError):
    """Repository or state validation failure."""

    def __init__(
        self,
        message: str,
        *,
        failed_checks: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.failed_checks = failed_checks or []


class EventError(AIOSBaseError):
    """Event bus or event store error."""


class RecoveryError(AIOSBaseError):
    """Checkpoint or session recovery error."""


class ContextError(AIOSBaseError):
    """Context loading or token budget error."""


class DecisionError(AIOSBaseError):
    """Decision engine evaluation or selection error."""


class MemoryError(AIOSBaseError):
    """Memory store, index, or search error."""


class ExecutionError(AIOSBaseError):
    """Executor pipeline or dispatch error."""


class ReportingError(AIOSBaseError):
    """Report generation error."""


class OrchestrationError(AIOSBaseError):
    """Orchestrator integration error."""


class EOSLoaderError(AIOSBaseError):
    """EOS discovery, validation, or loading error."""

    def __init__(
        self,
        message: str,
        *,
        failed_checks: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.failed_checks = failed_checks or []


class RegistryManagerError(AIOSBaseError):
    """Registry schema validation, lookup, or integrity error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class CapabilityDiscoveryError(AIOSBaseError):
    """Capability discovery, search, or validation error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class KnowledgeServiceError(AIOSBaseError):
    """Knowledge indexing, retrieval, or graph integrity error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class ContextBuilderError(AIOSBaseError):
    """Context assembly, budget, or validation error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class DecisionEngineError(AIOSBaseError):
    """Decision planning, evaluation, or validation error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class WorkflowEngineError(AIOSBaseError):
    """Workflow generation, dependency resolution, or validation error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class RuntimeEngineError(AIOSBaseError):
    """Runtime execution, state transition, or orchestration error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class EventBusError(AIOSBaseError):
    """Event bus publish, subscribe, or dispatch error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class PersistenceError(AIOSBaseError):
    """Persistence store read, write, or integrity error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class ObservabilityError(AIOSBaseError):
    """Observability consumer, metrics, or monitoring error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class AgentError(AIOSBaseError):
    """Agent execution, tool registration, or integration error."""

    def __init__(
        self,
        message: str,
        *,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.issues = issues or []


class APIError(AIOSBaseError):
    """API server request, response, or routing error."""

    def __init__(
        self,
        message: str,
        *,
        endpoint: str = "",
        status_code: int = 500,
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.endpoint = endpoint
        self.status_code = status_code
        self.issues = issues or []


class LLMProviderError(AIOSBaseError):
    """LLM provider generation, streaming, embedding, or validation error."""

    def __init__(
        self,
        message: str,
        *,
        provider: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.provider = provider
        self.issues = issues or []


class ToolError(AIOSBaseError):
    """Tool execution, permission, sandbox, or validation error."""

    def __init__(
        self,
        message: str,
        *,
        tool_name: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.tool_name = tool_name
        self.issues = issues or []


class AgentLayerError(AIOSBaseError):
    """Agent execution, planning, reflection, or coordination error."""

    def __init__(
        self,
        message: str,
        *,
        agent_name: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.agent_name = agent_name
        self.issues = issues or []


class MultiAgentError(AIOSBaseError):
    """Multi-agent coordination, consensus, or communication error."""

    def __init__(
        self,
        message: str,
        *,
        agent_id: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.agent_id = agent_id
        self.issues = issues or []


class RAGError(AIOSBaseError):
    """RAG engine retrieval, indexing, or search error."""

    def __init__(
        self,
        message: str,
        *,
        component: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.component = component
        self.issues = issues or []


class EmbeddingError(AIOSBaseError):
    """Embedding generation, caching, or provider error."""

    def __init__(
        self,
        message: str,
        *,
        provider: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.provider = provider
        self.issues = issues or []


class VectorStoreError(AIOSBaseError):
    """Vector store operation, search, or provider error."""

    def __init__(
        self,
        message: str,
        *,
        provider: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.provider = provider
        self.issues = issues or []


class SchedulerError(AIOSBaseError):
    """Scheduler job, queue, or execution error."""

    def __init__(
        self,
        message: str,
        *,
        job_id: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.job_id = job_id
        self.issues = issues or []


class SecurityError(AIOSBaseError):
    """Security permission, authentication, or encryption error."""

    def __init__(
        self,
        message: str,
        *,
        component: str = "",
        issues: list[str] | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details=details)
        self.component = component
        self.issues = issues or []
