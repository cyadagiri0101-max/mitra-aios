# MITRA AIOS Release Notes

## Version 1.4.0 (MES Core — Sprint 2.4)

**Release Date:** 2026-08-03

### Overview

Sprint 2.4 delivers the Manufacturing Execution System (MES) core: DB-driven work-order and job-card workflows, immutable release snapshots, shop-floor execution with automatic work-order roll-up, machine master + scheduling, material reservations/issues with shortage tracking, inspection checkpoints driving NCRs, production dashboards, and a transactional outbox event stream — plus a consolidated MES frontend console.

### What's New

#### Work-Order Engine
- `generateFromArtifacts` + `release` create a draft WO with job cards, material reservations and inspection checkpoints from released drawings/BOMs/routings/process plans, frozen in an immutable `snapshot` (revisions + cost baseline)
- DB-driven lifecycle workflows (work_order_lifecycle, job_card_lifecycle) seeded with 24 transitions; transition keys in `manufacturing.constants.ts`

#### Shop Floor
- Job start / production logging (`operation_logs` with quantities, duration, downtime, setup, shift) / job transitions with hold reasons
- Automatic WO completion/scrap roll-up when all job cards are terminal; material reservations auto-released on completion

#### Machines & Scheduling
- Machine master CRUD, maintenance flag, calendars, bookings (soft overlap advisory), raw-SQL queue and utilization, next-available slot
- Batch scheduling to least-loaded compatible machine + explicit assignment (booking + `SCHEDULE_ASSIGNED`)

#### Materials
- Reservations with planned/reserved/issued quantities; issue (partial → shortage event, full → issue slip `MI-`), release-unused (variance), consumption summary, shortage list

#### Inspection & NCR
- Checkpoint plans per WO with PASS/FAIL recording (critical → CRITICAL NCR); NCR lifecycle OPEN→INVESTIGATION→ACTION→VERIFIED→CLOSED with `closed_at` stamping

#### Production Tracking & Events
- Dashboard (status counts, quantities incl. rework/scrap, hours), board, per-WO history timeline
- 23 transactional `manufacturing.*` outbox events (WORK_ORDER_*, JOB_*, MATERIAL_*, MACHINE_*, INSPECTION_*, SCHEDULE_ASSIGNED) + NCR_RAISED/NCR_CLOSED

#### Frontend
- `/manufacturing` MES console with 6 tabs: Dashboard, Work Orders (release + transitions + snapshot detail), Shop Floor (start/log/transition), Machines (maintenance, queue, bookings), Materials (issue/release, shortage banner), Inspection & NCR

### Verification

- Backend: `tsc --noEmit` clean; 61 test suites / 713 tests passing (10 new MES suites, 61 tests)
- Frontend: `tsc --noEmit` clean; `vite build` succeeds
- Docs: `Manufacturing_Architecture.md`, `MES_Workflow.md`, `Traceability_Model.md`, `Manufacturing_Completion_Report_2.4.md`

---

## Version 1.3.0 (Engineering Completion — Sprint 2.3.1)

**Release Date:** 2026-08-03

### Overview

Sprint 2.3.1 delivers the Engineering Completion package: full traceability between engineering, manufacturing, and quality; BOM item effectivity + substitutions; routing revision snapshots; multi-reviewer reviews; unit conversions; a transactional outbox with AI-ready event hooks; and a new consolidated Engineering frontend page.

### What's New

#### Engineering Traceability (G-1)
- New `engineering_trace_edges` generic graph + migration columns on `work_orders`, `process_plans`, `trial_observations`, `inspection_reports`, `retrials` linking to drawings/BOMs/routings
- Work order artifact links (`drawing_id`/`bom_id`/`bom_item_id`/`routing_id`/`process_plan_id`) validated to exist and be RELEASED
- Trial observation links validated for existence (trials are part of the release process)

#### BOMs (G-2, G-3)
- Item effectivity windows (`effective_from`/`effective_to`) with point-in-time selection (`asOf`/`effectiveOn`)
- Substitutions (`engineering_bom_substitutions`) with status/priority/effectivity, guarded against RELEASED BOMs

#### Process Planning (G-4)
- Immutable routing revision snapshots (jsonb) + `createRevision`/`listRevisions`/`compareRevisions`
- Predecessor operation sequencing with cycle detection

#### Reviews (G-5)
- Multi-reviewer assignments (`engineering_review_assignments`) with role, idempotent assignment, decision rollup to review status, and `REVIEW_ASSIGNED` events

#### Unit Conversions (G-8)
- `uom_conversions` table + 16 global seed conversions, tenant overrides, `/engineering/uoms/convert` endpoint

#### Transactional Outbox (G-13) + AI hooks
- `domain_outbox` + `OutboxService` (transactional append, relay, retry) + relay/retry endpoints
- 3 new disabled AI hooks: substitute suggestion, routing comparison, review capacity balancing

#### Frontend
- New `/engineering` page with 6 tabs (BOMs & substitutions, Routings & revisions, Reviews & assignments, Unit conversions, Traceability, Outbox relay)

### Verification

- Backend: `tsc --noEmit` clean; 51 test suites / 657 tests passing
- Frontend: `tsc --noEmit` clean

---

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
