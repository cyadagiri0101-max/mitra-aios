# MITRA AIOS User Guide

## What is MITRA?

MITRA (Modular Intelligent Task Routing Architecture) is an AI Operating System that provides autonomous AI agents, intelligent workflow execution, and comprehensive tool integration. It enables building sophisticated AI-powered applications with minimal effort.

## Getting Started

### Installation

```bash
pip install -e .
```

### Quick Start

```bash
# Start the API server
uvicorn aios.api.app:create_app --factory --port 8000

# Or use Docker
docker compose -f docker-compose.aios.yml up -d
```

### First API Call

```bash
# Check system health
curl http://localhost:8000/api/v1/health

# Chat with the AI
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, MITRA!"}'
```

## Core Concepts

### Agents

Agents are autonomous AI entities that can plan, execute, and reflect on tasks.

```bash
# Create an agent
curl -X POST http://localhost:8000/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "researcher",
    "description": "An agent that researches topics",
    "tools": ["search", "file_read"]
  }'

# Run the agent
curl -X POST http://localhost:8000/api/v1/agents/run \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "researcher",
    "goal": "Find the latest news about AI"
  }'

# Chat with the agent
curl -X POST http://localhost:8000/api/v1/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "researcher",
    "message": "What did you find?"
  }'
```

### Workflows

Workflows orchestrate multi-step tasks with dependency management.

```bash
# Execute a workflow
curl -X POST http://localhost:8000/api/v1/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "task_description": "Build a REST API with authentication",
    "strategy": "sequential"
  }'

# Check status
curl http://localhost:8000/api/v1/workflows/status/{execution_id}
```

### Memory

MITRA has a three-tier memory system: working, episodic, and semantic.

```bash
# Store a memory
curl -X POST http://localhost:8000/api/v1/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The user prefers Python over JavaScript",
    "memory_type": "semantic",
    "importance": 0.8
  }'

# Retrieve memories
curl -X POST http://localhost:8000/api/v1/memory/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "query": "user programming preferences",
    "method": "hybrid",
    "limit": 5
  }'
```

### RAG (Retrieval-Augmented Generation)

Index documents and search for relevant information.

```bash
# Index a document
curl -X POST http://localhost:8000/api/v1/rag/index \
  -H "Content-Type: application/json" \
  -d '{
    "content": "MITRA is an AI Operating System...",
    "title": "MITRA Overview",
    "source": "docs/overview.md"
  }'

# Search
curl -X POST http://localhost:8000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is MITRA?",
    "top_k": 5,
    "include_citations": true
  }'
```

### Tools

Tools extend agent capabilities with external integrations.

```bash
# List available tools
curl http://localhost:8000/api/v1/tools

# Execute a tool
curl -X POST http://localhost:8000/api/v1/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "file_read",
    "parameters": {"path": "README.md"}
  }'
```

## Real-Time Updates

### WebSocket Connections

Connect via WebSocket for real-time updates:

```javascript
// General events
const ws = new WebSocket('ws://localhost:8000/api/v1/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    channels: ['runtime', 'workflow']
  }));
};
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

// Workflow progress
const wsWorkflow = new WebSocket('ws://localhost:8000/api/v1/ws/workflow/{execution_id}');

// Agent chat
const wsAgent = new WebSocket('ws://localhost:8000/api/v1/ws/agent/{agent_name}');
wsAgent.onopen = () => {
  wsAgent.send(JSON.stringify({
    action: 'chat',
    message: 'Hello!'
  }));
};
```

## Using the CLI

```bash
# List all commands
aios --help

# Start interactive chat
aios chat "Hello, how can you help me?"

# Run a complete workflow
aios run --mode implementation

# Check system health
aios health --verbose

# Manage memory
aios memory store "Important fact" --type semantic
aios memory recall "fact"

# List tools
aios tools list
```

## Configuration

MITRA can be configured via files or environment variables:

```toml
# config.toml
[llm]
provider = "ollama"
model = "llama3"

[embedding]
provider = "ollama"
model = "nomic-embed-text"

[rag]
chunk_size = 512
top_k = 10
```

Or via environment variables:

```bash
export AIOS_LLM_PROVIDER=openai
export AIOS_LOG_LEVEL=debug
```

## Use Cases

### Research Assistant

```bash
# Create a researcher agent
curl -X POST http://localhost:8000/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "researcher",
    "description": "Researches topics and provides summaries",
    "tools": ["search", "file_read", "file_write"]
  }'

# Ask it to research
curl -X POST http://localhost:8000/api/v1/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "researcher",
    "message": "Research the current state of quantum computing"
  }'
```

### Document Analysis

```bash
# Index documents
for doc in docs/*.md; do
  curl -X POST http://localhost:8000/api/v1/rag/index \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$(cat $doc)\", \"source\": \"$doc\"}"
done

# Ask questions
curl -X POST http://localhost:8000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the main features?", "include_citations": true}'
```

### Code Generation

```bash
# Create a coding agent
curl -X POST http://localhost:8000/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "coder",
    "description": "Writes Python code",
    "tools": ["file_read", "file_write", "shell"]
  }'

# Ask it to write code
curl -X POST http://localhost:8000/api/v1/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "coder",
    "message": "Write a Python function to sort a list of dictionaries by a key"
  }'
```

## Monitoring

```bash
# System health
curl http://localhost:8000/api/v1/health

# Metrics
curl http://localhost:8000/api/v1/observability/metrics

# Memory stats
curl http://localhost:8000/api/v1/memory/statistics

# Runtime stats
curl http://localhost:8000/api/v1/runtime/statistics
```

## Next Steps

- Read the [API Reference](API.md) for complete endpoint documentation
- Check [Deployment Guide](Deployment.md) for production setup
- See [Security Guide](Security.md) for authentication setup
