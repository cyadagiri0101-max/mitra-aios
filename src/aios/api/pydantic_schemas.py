"""Pydantic v2 request/response schemas for AIOS REST API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Standard error response."""

    detail: str
    error_type: str = ""
    status_code: int = 400


class ChatRequest(BaseModel):
    """Chat request."""

    message: str = Field(..., min_length=1, description="User message")
    agent_name: str | None = Field(None, description="Agent name to chat with")
    model: str | None = Field(None, description="LLM model to use")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Temperature")
    max_tokens: int = Field(2048, ge=1, le=32768, description="Max tokens")
    stream: bool = Field(False, description="Enable streaming")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class ChatResponse(BaseModel):
    """Chat response."""

    response: str = Field(..., description="AI response")
    conversation_id: str = Field("", description="Conversation ID")
    tokens_used: int = Field(0, description="Tokens used")
    model: str = Field("", description="Model used")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class AgentCreateRequest(BaseModel):
    """Create agent request."""

    name: str = Field(..., min_length=1, description="Agent name")
    role: str = Field("assistant", description="Agent role")
    description: str = Field("", description="Agent description")
    model: str | None = Field(None, description="LLM model")
    tools: list[str] = Field(default_factory=list, description="Tool names")
    max_turns: int = Field(10, ge=1, le=100, description="Max conversation turns")
    config: dict[str, Any] = Field(default_factory=dict, description="Agent configuration")


class AgentCreateResponse(BaseModel):
    """Create agent response."""

    name: str
    agent_id: str
    status: str = "created"


class AgentRunRequest(BaseModel):
    """Run agent request."""

    goal: str = Field(..., min_length=1, description="Goal to achieve")
    agent_name: str = Field(..., description="Agent name")
    timeout_seconds: float = Field(300.0, ge=1.0, description="Timeout")


class AgentRunResponse(BaseModel):
    """Run agent response."""

    agent_name: str
    result: str
    success: bool
    turns_used: int = 0
    duration_seconds: float = 0.0


class AgentChatRequest(BaseModel):
    """Chat with agent request."""

    message: str = Field(..., min_length=1, description="Message")
    agent_name: str = Field(..., description="Agent name")


class AgentChatResponse(BaseModel):
    """Chat with agent response."""

    agent_name: str
    response: str
    conversation_length: int = 0


class AgentInfo(BaseModel):
    """Agent information."""

    name: str
    role: str = ""
    description: str = ""
    status: str = "unknown"
    is_initialized: bool = False


class AgentStatisticsResponse(BaseModel):
    """Agent statistics."""

    agents: dict[str, Any] = Field(default_factory=dict)
    total_agents: int = 0


class WorkflowExecuteRequest(BaseModel):
    """Execute workflow request."""

    task_description: str = Field(..., min_length=1, description="Task description")
    strategy: str = Field("sequential", description="Execution strategy")
    parameters: dict[str, Any] = Field(default_factory=dict, description="Parameters")


class WorkflowExecuteResponse(BaseModel):
    """Execute workflow response."""

    execution_id: str
    status: str
    workflow_id: str = ""


class WorkflowStatusResponse(BaseModel):
    """Workflow status response."""

    execution_id: str
    status: str
    progress: float = 0.0
    current_step: str = ""
    completed_steps: int = 0
    total_steps: int = 0


class WorkflowListResponse(BaseModel):
    """Workflow list response."""

    workflows: list[dict[str, Any]] = Field(default_factory=list)
    total: int = 0


class MemoryStoreRequest(BaseModel):
    """Store memory request."""

    content: str = Field(..., min_length=1, description="Memory content")
    memory_type: str = Field("working", description="Memory type")
    execution_id: str | None = Field(None, description="Execution ID")
    importance: float = Field(0.5, ge=0.0, le=1.0, description="Importance")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Metadata")


class MemoryStoreResponse(BaseModel):
    """Store memory response."""

    entry_id: str
    memory_type: str
    timestamp: float
    content_preview: str = ""


class MemoryRetrieveRequest(BaseModel):
    """Retrieve memory request."""

    query: str = Field(..., min_length=1, description="Search query")
    memory_types: list[str] = Field(default_factory=list, description="Memory types to search")
    limit: int = Field(10, ge=1, le=100, description="Max results")
    method: str = Field("hybrid", description="Search method")


class MemoryRetrieveResponse(BaseModel):
    """Retrieve memory response."""

    results: list[dict[str, Any]] = Field(default_factory=list)
    total_found: int = 0


class MemoryForgetRequest(BaseModel):
    """Forget memory request."""

    entry_id: str = Field(..., description="Entry ID to forget")
    memory_type: str = Field("working", description="Memory type")


class MemoryStatisticsResponse(BaseModel):
    """Memory statistics response."""

    working_memory_count: int = 0
    episodic_memory_count: int = 0
    semantic_memory_count: int = 0
    total_memories: int = 0
    consolidation_count: int = 0


class RAGIndexRequest(BaseModel):
    """Index document request."""

    content: str = Field(..., min_length=1, description="Document content")
    title: str = Field("", description="Document title")
    source: str = Field("", description="Document source")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Metadata")


class RAGIndexResponse(BaseModel):
    """Index document response."""

    document_id: str
    chunks_created: int = 0
    embeddings_generated: int = 0


class RAGSearchRequest(BaseModel):
    """Search RAG request."""

    query: str = Field(..., min_length=1, description="Search query")
    top_k: int = Field(10, ge=1, le=100, description="Max results")
    method: str = Field("hybrid", description="Search method")
    include_citations: bool = Field(False, description="Include citations")


class RAGSearchResponse(BaseModel):
    """Search RAG response."""

    results: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    total_found: int = 0


class RAGStatisticsResponse(BaseModel):
    """RAG statistics response."""

    total_documents: int = 0
    total_chunks: int = 0
    total_embeddings: int = 0
    search_count: int = 0


class ToolExecuteRequest(BaseModel):
    """Execute tool request."""

    tool_name: str = Field(..., min_length=1, description="Tool name")
    parameters: dict[str, Any] = Field(default_factory=dict, description="Parameters")
    timeout_seconds: float = Field(30.0, ge=1.0, description="Timeout")


class ToolExecuteResponse(BaseModel):
    """Execute tool response."""

    tool_name: str
    success: bool
    result: Any = None
    error: str = ""
    duration_seconds: float = 0.0


class ToolStatisticsResponse(BaseModel):
    """Tool statistics response."""

    total_tools: int = 0
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    providers: list[str] = Field(default_factory=list)


class PluginInstallRequest(BaseModel):
    """Install plugin request."""

    name: str = Field(..., min_length=1, description="Plugin name")
    version: str = Field("1.0.0", description="Plugin version")
    description: str = Field("", description="Plugin description")
    entry_point: str = Field("", description="Entry point")
    dependencies: list[str] = Field(default_factory=list, description="Dependencies")


class PluginInstallResponse(BaseModel):
    """Install plugin response."""

    name: str
    version: str
    status: str = "installed"


class PluginInfo(BaseModel):
    """Plugin information."""

    name: str
    version: str = ""
    description: str = ""
    status: str = "unknown"
    enabled: bool = False


class PluginStatisticsResponse(BaseModel):
    """Plugin statistics response."""

    total_plugins: int = 0
    enabled_plugins: int = 0
    disabled_plugins: int = 0


class EmbedRequest(BaseModel):
    """Embed text request."""

    text: str = Field(..., min_length=1, description="Text to embed")
    provider_name: str | None = Field(None, description="Provider name")


class EmbedResponse(BaseModel):
    """Embed text response."""

    embedding: list[float] = Field(default_factory=list)
    dimensions: int = 0
    provider: str = ""
    cached: bool = False


class EmbedBatchRequest(BaseModel):
    """Embed batch request."""

    texts: list[str] = Field(..., min_length=1, description="Texts to embed")
    provider_name: str | None = Field(None, description="Provider name")


class EmbedBatchResponse(BaseModel):
    """Embed batch response."""

    embeddings: list[list[float]] = Field(default_factory=list)
    dimensions: int = 0
    provider: str = ""
    total_embedded: int = 0
    cached_count: int = 0


class EmbeddingStatisticsResponse(BaseModel):
    """Embedding statistics response."""

    total_embeddings: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    providers: list[str] = Field(default_factory=list)


class VectorUpsertRequest(BaseModel):
    """Upsert vectors request."""

    records: list[dict[str, Any]] = Field(..., min_length=1, description="Vector records")
    namespace: str = Field("default", description="Namespace")
    provider_name: str | None = Field(None, description="Provider name")


class VectorUpsertResponse(BaseModel):
    """Upsert vectors response."""

    upserted_count: int = 0
    namespace: str = ""
    provider: str = ""


class VectorSearchRequest(BaseModel):
    """Search vectors request."""

    query_vector: list[float] = Field(..., min_length=1, description="Query vector")
    top_k: int = Field(10, ge=1, le=1000, description="Max results")
    namespace: str = Field("default", description="Namespace")
    filters: dict[str, Any] = Field(default_factory=dict, description="Filters")
    provider_name: str | None = Field(None, description="Provider name")


class VectorSearchResponse(BaseModel):
    """Search vectors response."""

    results: list[dict[str, Any]] = Field(default_factory=list)
    total_found: int = 0
    namespace: str = ""


class VectorStatisticsResponse(BaseModel):
    """Vector store statistics response."""

    total_vectors: int = 0
    namespaces: list[str] = Field(default_factory=list)
    providers: list[str] = Field(default_factory=list)


class ConfigGetResponse(BaseModel):
    """Get config response."""

    key: str
    value: Any = None
    exists: bool = True


class ConfigSetRequest(BaseModel):
    """Set config request."""

    key: str = Field(..., min_length=1, description="Config key")
    value: Any = Field(..., description="Config value")


class ConfigDeleteRequest(BaseModel):
    """Delete config request."""

    key: str = Field(..., min_length=1, description="Config key")


class ConfigExportResponse(BaseModel):
    """Export config response."""

    format: str
    content: str


class ConfigStatisticsResponse(BaseModel):
    """Config statistics response."""

    total_keys: int = 0
    sources_loaded: int = 0
    validation_errors: int = 0


class SecurityPermissionRequest(BaseModel):
    """Grant/check permission request."""

    principal: str = Field(..., min_length=1, description="Principal ID")
    resource: str = Field(..., min_length=1, description="Resource ID")
    level: str = Field("read", description="Permission level")


class SecurityPermissionResponse(BaseModel):
    """Permission response."""

    principal: str
    resource: str
    level: str
    granted: bool = False


class SecuritySecretRequest(BaseModel):
    """Store secret request."""

    name: str = Field(..., min_length=1, description="Secret name")
    value: str = Field(..., min_length=1, description="Secret value")


class SecuritySecretResponse(BaseModel):
    """Secret response."""

    name: str
    stored: bool = False
    retrieved_value: str | None = None


class SecurityTokenRequest(BaseModel):
    """Create token request."""

    principal: str = Field(..., min_length=1, description="Principal ID")
    token_type: str = Field("access", description="Token type")
    expires_in: int = Field(3600, ge=60, description="Expires in seconds")


class SecurityTokenResponse(BaseModel):
    """Token response."""

    token: str
    token_type: str
    expires_at: float = 0.0
    principal: str = ""


class SecurityEncryptRequest(BaseModel):
    """Encrypt/decrypt request."""

    data: str = Field(..., min_length=1, description="Data to encrypt/decrypt")


class SecurityEncryptResponse(BaseModel):
    """Encrypt/decrypt response."""

    result: str
    operation: str = "encrypt"


class SecurityStatisticsResponse(BaseModel):
    """Security statistics response."""

    total_permissions: int = 0
    total_secrets: int = 0
    total_credentials: int = 0
    total_tokens: int = 0


class HealthResponse(BaseModel):
    """Health check response."""

    healthy: bool
    status: str = "ok"
    version: str = ""
    uptime_seconds: float = 0.0
    layers: dict[str, bool] = Field(default_factory=dict)


class MetricsResponse(BaseModel):
    """Metrics response."""

    metrics: dict[str, Any] = Field(default_factory=dict)
    timestamp: float = 0.0


class EventSubscribeRequest(BaseModel):
    """Subscribe to events request."""

    event_types: list[str] = Field(default_factory=list, description="Event types to subscribe")
    client_id: str = Field("", description="Client ID")


class EventSubscribeResponse(BaseModel):
    """Subscribe response."""

    subscription_id: str
    event_types: list[str] = Field(default_factory=list)
    status: str = "subscribed"
