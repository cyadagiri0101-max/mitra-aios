# MITRA AIOS Release Notes

## Version 1.2.0rc2 (Release Candidate 2) — Latest

**Release Date:** 2026-07-20

### Overview

AIOS 1.2.0rc2 is the EOS Convergence Release Candidate, featuring the fully integrated Execution-Oriented System (EOS) core with 21 CLI commands, 15 REST API route modules, 7 LLM providers, 6 embedding providers, 7 vector store providers, and comprehensive production readiness validation.

### What's New in RC2 (Phase 19–22)

- **Registry generation gap fixed** — `aios index` now produces all 10 `*-registry.json` files required by integration tests
- **CLI version banner** — `aios --help` and `aios --version` correctly show `AIOS 1.2.0rc2` from single source
- **Production readiness** — Verified clean install from wheel + sdist on fresh environments; dependency vulnerability scan clean; license audit clean
- **Performance benchmarks** — 35/35 benchmarks passed; core engine stable (runtime ~60 ops/sec, eventbus ~150K ops/sec, API ~137 req/sec)
- **Security audit** — All CRITICAL/HIGH findings addressed or documented; `FINAL_SECURITY_REPORT.md` published
- **Full regression suite** — 3410 passed, 0 failed, 92.16% coverage

---

## Version 1.1.0

**Release Date:** July 2026

### Overview

MITRA AIOS 1.1.0 is the production release of the MITRA AI Operating System. This release includes a complete REST API, WebSocket support, Docker deployment, comprehensive documentation, and 96%+ test coverage with 3500+ passing tests.

### New Features

#### REST API Completion
- **Chat Endpoints** (`/chat`) - LLM and agent chat with conversation management
- **Agent Endpoints** (`/agents`) - Full CRUD, execution, and statistics
- **Workflow Endpoints** (`/workflows`) - Execute, monitor, pause, resume, cancel
- **Memory Endpoints** (`/memory`) - Store, retrieve, forget, consolidate
- **RAG Endpoints** (`/rag`) - Document indexing, search with citations
- **Tool Endpoints** (`/tools`) - Execute, register, unregister, statistics
- **Plugin Endpoints** (`/plugins`) - Install, uninstall, enable, disable
- **Embedding Endpoints** (`/embeddings`) - Generate and batch embeddings
- **Vector Store Endpoints** (`/vectorstores`) - Upsert, search, manage namespaces
- **Config Endpoints** (`/config`) - Get, set, validate, export configuration
- **Security Endpoints** (`/security`) - Permissions, secrets, tokens, encryption

#### WebSocket Support
- **General Events** (`/ws`) - Subscribe to system-wide events
- **Runtime Events** (`/ws/runtime`) - Real-time execution updates
- **Workflow Progress** (`/ws/workflow/{id}`) - Step-by-step progress
- **Agent Updates** (`/ws/agent/{name}`) - Agent conversation streaming
- **Tool Execution** (`/ws/tools`) - Tool execution status
- **Streaming Chat** (`/ws/chat`) - LLM response streaming
- Connection management with reconnection support
- Multiple concurrent client support

#### Docker Deployment
- Production-ready Dockerfile with security hardening
- Docker Compose with all services (backend, frontend, postgres, redis, ollama, nginx)
- Health checks for all services
- Startup ordering with dependency management
- Volume persistence for data
- Environment configuration

#### Documentation
- Architecture documentation with system diagrams
- Complete API reference with examples
- Deployment guide for development and production
- Developer guide with patterns and conventions
- User guide with use cases
- CLI reference for all 21 commands
- Security guide with best practices
- Troubleshooting guide for common issues

### Technical Improvements
- Pydantic v2 schemas for all API endpoints
- OpenAPI/Swagger documentation at `/docs`
- Authentication hooks (JWT, API keys)
- Rate limiting support
- Comprehensive error handling
- Type hints throughout
- Ruff linting compliance

### Testing
- 3532 tests passing
- 96% code coverage across entire codebase
- Unit tests for all API endpoints (58 endpoint groups)
- WebSocket connection and channel management tests
- Orchestrator, persistence, CLI command tests
- LLM/Embedding provider tests
- RAG, plugin, scheduler, recovery tests
- Repository, serialization, event store tests
- Mock-based integration tests
- Edge case and error path coverage

### Dependencies Added
- `fastapi>=0.110.0`
- `pydantic>=2.0`
- `uvicorn>=0.27.0`
- `websockets>=12.0`
- `httpx>=0.27.0` (dev)
- `pytest-asyncio>=0.23.0` (dev)
- `pytest-cov>=4.0` (dev)
- `ruff>=0.3.0` (dev)

### Bug Fixes
- Fixed `EndpointType` to use `StrEnum` instead of `str, Enum`
- Fixed route ordering for config and plugin endpoints
- Fixed Pydantic model validation for mock objects
- Fixed WebSocket broadcast worker lifecycle

### Breaking Changes
- API schemas now use Pydantic v2 models (request/response format unchanged)
- WebSocket endpoints require `ws://` protocol prefix

### Migration Guide
No migration required from previous development versions.

---

## Previous Development Versions

### Version 0.9.0-beta
- Added WebSocket manager infrastructure
- Initial API endpoint structure

### Version 0.8.0-beta
- Completed core subsystems
- 2000+ tests passing

### Version 0.7.0-beta
- Added multi-agent coordination
- Added RAG engine

### Version 0.6.0-beta
- Added memory system
- Added embedding providers

### Version 0.5.0-beta
- Added workflow engine
- Added runtime engine

### Version 0.4.0-beta
- Added decision engine
- Added context builder

### Version 0.3.0-beta
- Added plugin system
- Added tool execution

### Version 0.2.0-beta
- Added LLM provider layer
- Added vector store

### Version 0.1.0-alpha
- Initial project structure
- Core infrastructure

---

## Upgrading

### From Development Versions

```bash
# Pull latest changes
git pull origin main

# Install updated dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Restart services
docker compose -f docker-compose.aios.yml restart
```

### Docker Upgrade

```bash
# Pull latest images
docker compose -f docker-compose.aios.yml pull

# Rebuild backend
docker compose -f docker-compose.aios.yml build backend

# Restart all services
docker compose -f docker-compose.aios.yml up -d
```

---

## Known Issues

1. Ollama GPU support requires NVIDIA Container Toolkit
2. WebSocket reconnection may require manual retry after extended disconnects
3. Large document indexing may be slow without GPU acceleration

## Roadmap

### Version 1.2.0 (Planned)
- Enhanced streaming support
- Multi-modal input (images, audio)
- Workflow templates
- Plugin marketplace
- Dashboard UI

### Version 1.3.0 (Planned)
- Distributed execution
- Kubernetes deployment
- Advanced analytics
- Custom model fine-tuning
- Enterprise SSO
