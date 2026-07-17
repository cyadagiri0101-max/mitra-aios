# MITRA AIOS API Reference

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All endpoints support optional JWT bearer token authentication. Set `AIOS_AUTH_ENABLED=true` to enforce.

```
Authorization: Bearer <token>
```

## Chat Endpoints

### POST /chat
Send a message to an LLM or agent and receive a response.

**Request:**
```json
{
  "message": "Hello, how can you help me?",
  "agent_name": "optional-agent-name",
  "model": "optional-model-name",
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": false,
  "metadata": {}
}
```

**Response (200):**
```json
{
  "response": "I can help you with...",
  "conversation_id": "agent-name",
  "tokens_used": 150,
  "model": "default",
  "metadata": {}
}
```

### GET /chat/history/{conversation_id}
Get conversation history for an agent.

### DELETE /chat/history/{conversation_id}
Clear conversation history for an agent.

---

## Agent Endpoints

### POST /agents
Create a new agent.

**Request:**
```json
{
  "name": "research-agent",
  "role": "researcher",
  "description": "An agent for research tasks",
  "model": "gpt-4",
  "tools": ["search", "file_read"],
  "max_turns": 10,
  "config": {}
}
```

**Response (200):**
```json
{
  "name": "research-agent",
  "agent_id": "agent-abc123",
  "status": "created"
}
```

### GET /agents
List all agents.

### GET /agents/{name}
Get agent details.

### DELETE /agents/{name}
Delete an agent.

### POST /agents/run
Execute an agent with a goal.

**Request:**
```json
{
  "goal": "Research the latest AI developments",
  "agent_name": "research-agent",
  "timeout_seconds": 300.0
}
```

**Response (200):**
```json
{
  "agent_name": "research-agent",
  "result": "Here are the latest AI developments...",
  "success": true,
  "turns_used": 3,
  "duration_seconds": 12.5
}
```

### POST /agents/chat
Chat with a specific agent.

**Request:**
```json
{
  "message": "What did you find?",
  "agent_name": "research-agent"
}
```

### GET /agents/statistics
Get agent execution statistics.

---

## Workflow Endpoints

### POST /workflows/execute
Execute a workflow.

**Request:**
```json
{
  "task_description": "Build a REST API",
  "strategy": "sequential",
  "parameters": {}
}
```

**Response (200):**
```json
{
  "execution_id": "exec-abc123",
  "status": "queued",
  "workflow_id": "wf-xyz789"
}
```

### GET /workflows/status/{execution_id}
Get workflow execution status.

### POST /workflows/cancel/{execution_id}
Cancel a running workflow.

### POST /workflows/pause/{execution_id}
Pause a running workflow.

### POST /workflows/resume/{execution_id}
Resume a paused workflow.

### GET /workflows
List all workflows.

### GET /workflows/statistics
Get workflow execution statistics.

---

## Memory Endpoints

### POST /memory/store
Store a memory entry.

**Request:**
```json
{
  "content": "Important information to remember",
  "memory_type": "working",
  "execution_id": "optional-exec-id",
  "importance": 0.8,
  "metadata": {"source": "conversation"}
}
```

**Response (200):**
```json
{
  "entry_id": "mem-abc123",
  "memory_type": "working",
  "timestamp": 1700000000.0,
  "content_preview": "Important information to remember"
}
```

### POST /memory/retrieve
Search and retrieve memories.

**Request:**
```json
{
  "query": "search terms",
  "memory_types": ["working", "episodic"],
  "limit": 10,
  "method": "hybrid"
}
```

Methods: `hybrid`, `keyword`, `similarity`

### POST /memory/forget
Delete a memory entry.

### POST /memory/consolidate
Trigger memory consolidation.

### GET /memory/statistics
Get memory statistics.

---

## RAG Endpoints

### POST /rag/index
Index a document into the RAG pipeline.

**Request:**
```json
{
  "content": "Document content to index",
  "title": "Document Title",
  "source": "file://path/to/doc",
  "metadata": {"author": "John"}
}
```

### POST /rag/search
Search the RAG index.

**Request:**
```json
{
  "query": "search query",
  "top_k": 10,
  "method": "hybrid",
  "include_citations": true
}
```

### GET /rag/statistics
Get RAG statistics.

---

## Tool Endpoints

### GET /tools
List all registered tools.

### GET /tools/{name}
Get tool details.

### POST /tools/register
Register a new tool.

**Request:**
```json
{
  "name": "search",
  "description": "Web search tool",
  "parameters": [
    {
      "name": "query",
      "type": "string",
      "description": "Search query",
      "required": true
    }
  ],
  "tags": ["search", "web"],
  "timeout_seconds": 30.0
}
```

### POST /tools/execute
Execute a tool.

**Request:**
```json
{
  "tool_name": "search",
  "parameters": {"query": "AI news"},
  "timeout_seconds": 30.0
}
```

### GET /tools/providers
List tool providers.

### DELETE /tools/{name}
Unregister a tool.

### GET /tools/statistics
Get tool execution statistics.

---

## Plugin Endpoints

### GET /plugins
List all plugins.

### GET /plugins/{name}
Get plugin details.

### POST /plugins/install
Install a plugin.

### POST /plugins/uninstall/{name}
Uninstall a plugin.

### POST /plugins/enable/{name}
Enable a plugin.

### POST /plugins/disable/{name}
Disable a plugin.

### GET /plugins/statistics
Get plugin statistics.

---

## Embedding Endpoints

### POST /embeddings/embed
Generate an embedding for text.

**Request:**
```json
{
  "text": "Text to embed",
  "provider_name": "optional-provider"
}
```

**Response (200):**
```json
{
  "embedding": [0.1, 0.2, 0.3, ...],
  "dimensions": 1536,
  "provider": "openai",
  "cached": false
}
```

### POST /embeddings/embed-batch
Generate embeddings for multiple texts.

### GET /embeddings/statistics
Get embedding statistics.

---

## Vector Store Endpoints

### POST /vectorstores/upsert
Insert or update vector records.

**Request:**
```json
{
  "records": [
    {
      "id": "doc-1",
      "vector": [0.1, 0.2, 0.3],
      "metadata": {"title": "Document 1"}
    }
  ],
  "namespace": "default",
  "provider_name": "inmemory"
}
```

### POST /vectorstores/search
Search for similar vectors.

**Request:**
```json
{
  "query_vector": [0.1, 0.2, 0.3],
  "top_k": 10,
  "namespace": "default",
  "filters": {"category": "docs"},
  "provider_name": "inmemory"
}
```

### DELETE /vectorstores/{record_id}
Delete a vector record.

### GET /vectorstores/namespaces
List namespaces.

### GET /vectorstores/providers
List vector store providers.

### GET /vectorstores/statistics
Get vector store statistics.

---

## Config Endpoints

### GET /config/{key}
Get a configuration value by dot-notation key.

### POST /config/set
Set a configuration value.

### POST /config/delete
Delete a configuration value.

### POST /config/validate
Validate the current configuration.

### POST /config/reload
Reload configuration from sources.

### GET /config/export/{fmt}
Export configuration in JSON, YAML, or TOML format.

### GET /config/statistics
Get configuration statistics.

---

## Security Endpoints

### POST /security/permissions/grant
Grant a permission.

### POST /security/permissions/check
Check a permission.

### POST /security/secrets/store
Store an encrypted secret.

### GET /security/secrets/{name}
Retrieve a secret.

### POST /security/tokens/create
Create an authentication token.

### POST /security/tokens/validate
Validate a token.

### POST /security/encrypt
Encrypt data.

### POST /security/decrypt
Decrypt data.

### GET /security/statistics
Get security statistics.

---

## Existing EOS Endpoints

### POST /loader/load
Load an EOS tree from disk.

### POST /capabilities/discover
Discover capabilities matching a task.

### POST /knowledge/search
Search the knowledge service.

### POST /context/build
Build context for a task.

### POST /plan/create
Create an execution plan.

### POST /workflow/build
Build a workflow from a plan.

### POST /runtime/execute
Execute a workflow.

### GET /runtime/status/{execution_id}
Get execution status.

### GET /runtime/history/{execution_id}
Get execution history.

### GET /runtime/report/{execution_id}
Get execution report.

### GET /runtime/snapshot/{execution_id}
Get execution snapshot.

### GET /runtime/statistics
Get runtime statistics.

### POST /runtime/pause/{execution_id}
Pause an execution.

### POST /runtime/resume/{execution_id}
Resume an execution.

### POST /runtime/cancel/{execution_id}
Cancel an execution.

### POST /runtime/rollback/{execution_id}
Rollback an execution.

### POST /events/publish
Publish a runtime event.

### GET /events/history
Get event history.

### GET /events/statistics
Get event statistics.

### GET /observability/metrics
Get observability metrics.

### GET /observability/health
Get health status.

### GET /observability/events
Query observability events.

### GET /health
System health check.

---

## WebSocket Endpoints

### WS /ws
General WebSocket for event subscription.

**Actions:**
- `subscribe` - Subscribe to channels
- `unsubscribe` - Unsubscribe from channels
- `ping` - Keepalive ping

### WS /ws/runtime
Real-time runtime execution events.

### WS /ws/workflow/{execution_id}
Workflow progress updates for a specific execution.

### WS /ws/agent/{agent_name}
Agent conversation streaming.

**Actions:**
- `chat` - Send message to agent

### WS /ws/tools
Tool execution updates.

**Actions:**
- `execute` - Execute a tool

### WS /ws/chat
Streaming chat with LLM.

**Actions:**
- `chat` - Send message for streaming response

---

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Error description",
  "error_type": "ErrorType",
  "status_code": 400
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable |
