# SYSTEM ARCHITECTURE - MITRA v3.2

**Document Version**: 1.0
**Last Updated**: June 24, 2026
**Audience**: Architects, DevOps, Backend/Frontend Developers

---

## Architecture Overview

MITRA v3.2 is a containerized, multi-service manufacturing intelligence platform designed for enterprise deployments. The architecture follows microservices principles with clear separation of concerns while maintaining simplicity for deployment and operation.

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / CLIENT                       │
│                     (Desktop, Mobile, Web)                      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                        │
            ┌───────▼─────────┐    ┌────────▼────────┐
            │   Frontend      │    │   Static Assets │
            │ (React + Nginx) │    │   (CDN-ready)   │
            └───────┬─────────┘    └─────────────────┘
                    │ (HTTP/HTTPS: 8080)
                    │
    ┌───────────────▼───────────────┐
    │   API Gateway / Load Balancer │
    │      (Optional - External)    │
    └───────────────┬───────────────┘
                    │ (HTTP/HTTPS: 3001)
        ┌───────────▼───────────────┐
        │  Backend (NestJS)         │
        │  - Auth & RBAC            │
        │  - Business Logic         │
        │  - AI Integration         │
        │  - REST API               │
        └───────────────────────────┘
                    │
    ┌───────────────┼───────────────┬──────────────────┐
    │               │               │                  │
┌───▼──────┐  ┌────▼─────┐  ┌──────▼───┐  ┌──────────▼──┐
│PostgreSQL│  │  Redis   │  │  MinIO   │  │  Ollama    │
│+ pgvector│  │  Cache   │  │  Object  │  │  LLM       │
│ Database │  │          │  │ Storage  │  │ (AI Models)│
└──────────┘  └──────────┘  └──────────┘  └────────────┘
```

---

## Component Architecture

### Frontend Tier

#### React Application
- **Technology**: React 18.x with Vite
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context API
- **HTTP Client**: Fetch API / Axios
- **Build Target**: Node 20-alpine
- **Port**: 8080 (Nginx reverse proxy)
- **Features**:
  - Multi-tenant project management
  - Design collaboration
  - Quality tracking
  - Audit logging
  - AI copilot panel (Phase 4)

#### Nginx Web Server
- **Technology**: Nginx 1.x (Alpine-based)
- **Purpose**:
  - Static asset serving
  - SSL/TLS termination (production)
  - Reverse proxy to backend
  - Gzip compression
  - Cache headers
- **Configuration**: Via `nginx.conf` in deployment

### Backend Tier

#### NestJS Application
- **Technology**: Node.js 20 (Alpine) + NestJS 10.x
- **Architecture Pattern**: Modular monolith with clear separation
- **Port**: 3001
- **Features**:
  - RESTful API (OpenAPI/Swagger documented)
  - JWT-based authentication
  - Role-Based Access Control (RBAC)
  - Request/Response interceptors
  - Global error handling
  - Structured logging

#### Core Modules
```
backend/src/
├── app.module.ts                 # Root module
├── main.ts                       # Entry point
├── common/                       # Shared utilities
│   ├── decorators/              # Custom decorators (@Auth, @Roles)
│   ├── dto/                     # Data Transfer Objects
│   ├── entities/                # TypeORM entities
│   ├── guards/                  # Auth guards, JWT verification
│   ├── interceptors/            # Response formatting
│   ├── middleware/              # Request middleware
│   ├── services/                # Shared services
│   ├── strategies/              # Passport.js strategies
│   └── logger/                  # Structured logging
├── modules/
│   ├── auth/                    # Authentication & authorization
│   ├── user/                    # User management
│   ├── project/                 # Project management
│   ├── design/                  # Design module
│   ├── quality/                 # Quality management
│   ├── document/                # Document management
│   ├── ai/                      # AI/LLM integration ← PHASE 3
│   │   ├── providers/
│   │   │   └── ollama.provider.ts  # Ollama HTTP client
│   │   └── ai.service.ts           # AI business logic
│   └── [other modules]
├── database/
│   ├── data-source.ts           # TypeORM connection config
│   ├── seed.ts                  # Database seeding
│   └── migrations/              # Schema migrations
└── test/                        # End-to-end tests
```

#### AI Module (Phase 3)

**Ollama Integration**:
- **Model**: phi3:latest (chat/completion)
- **Embedding Model**: nomic-embed-text:latest
- **HTTP Client**: Axios with retry logic
- **Timeout**: 45 seconds (configurable)
- **Endpoint**: `http://ollama:11434`

**AI Service**:
```typescript
// Key methods
- chat(message: string): Promise<{answer, modelUsed, intent, context}>
- generateEmbedding(text: string): Promise<number[]>
- health(): Promise<{enabled, available, model, version}>
```

### Data Tier

#### PostgreSQL 16 + pgvector
- **Port**: 5432 (internal only)
- **Databases**:
  - `mitra_v2` (main database)
  - `postgres` (system database)
- **Extensions**:
  - `pgvector` (for vector embeddings)
  - `uuid-ossp` (for UUID generation)

**Schema Highlights**:
```sql
-- Users (RBAC)
users (id, email, role, tenant_id)
roles (id, name, permissions)

-- Projects & Designs
projects (id, name, tenant_id, created_at)
designs (id, project_id, data, status)

-- Quality & Audit
quality_records (id, project_id, findings)
audit_logs (id, entity, action, user_id, timestamp)

-- Documents (if needed for embeddings - Phase 4)
documents (id, project_id, content, embeddings: vector(768))

-- AI Artifacts
ai_interactions (id, user_id, prompt, response, model_used)
```

#### Redis 7
- **Port**: 6379 (internal only)
- **Purpose**:
  - Session storage
  - Cache layer (projects, user data)
  - Rate limiting counters
  - Background job queue (future)
- **Persistence**:
  - Snapshots: Save 900 changes every 1 sec
  - AOF: Disabled (snapshots sufficient)

#### MinIO Object Storage
- **Port**: 9000 (API), 9001 (Console)
- **Purpose**: S3-compatible storage for:
  - Design documents
  - Uploaded files
  - Attachments
  - Backups
- **Bucket**: `mitra-documents`
- **Access**: Via AWS SDK v3 from backend

### AI Tier

#### Ollama Container
- **Image**: docker.io/ollama/ollama:latest
- **Port**: 11434 (internal only)
- **Runtime**: Linux (Alpine-based)
- **Models**:
  - `phi3:latest` (3.8B parameters, Q4_0 quantization)
  - `nomic-embed-text:latest` (137M parameters, F16 quantization)
- **Volume**: ollama-data (persistent model storage)

**Ollama API Endpoints Used**:
```
GET  /api/tags                      # List available models
POST /api/embeddings                # Generate embeddings (Phase 4)
POST /api/generate                  # Chat completion (used via /api/chat proxy)
POST /api/pull                      # Download models
```

---

## Network Architecture

### Container Network

**Network Name**: `mitra30_mitra-internal` (bridge)
**Subnet**: 10.89.0.0/24
**Gateway**: 10.89.0.1
**DNS**: Podman internal DNS (automatic service discovery)

**Container IP Allocation**:
```
10.89.0.23  postgres    (database.mitra-internal)
10.89.0.24  redis       (redis.mitra-internal)
10.89.0.25  minio       (minio.mitra-internal)
10.89.0.26  backend     (backend.mitra-internal)
10.89.0.27  frontend    (frontend.mitra-internal)
10.89.0.28  ollama      (ollama.mitra-internal)
```

### Service Communication

```
Frontend → Backend (HTTP)
  └─ http://localhost:3001/api/...

Backend → PostgreSQL
  └─ postgres:5432 (internal DNS)

Backend → Redis
  └─ redis:6379 (internal DNS)

Backend → MinIO
  └─ minio:9000 (internal DNS)

Backend → Ollama
  └─ ollama:11434 (internal DNS)

External Client → Frontend (HTTP)
  └─ http://localhost:8080

External Client → Backend (HTTP)
  └─ http://localhost:3001/api/...
```

### External Port Mapping

```
Host Port  →  Container Port  →  Service
8080       →  80              →  Nginx (Frontend)
3001       →  3001            →  NestJS Backend
5432       →  5432            →  PostgreSQL (optional external access)
6379       →  6379            →  Redis (optional external access)
9000       →  9000            →  MinIO API (optional external access)
9001       →  9001            →  MinIO Console (optional external access)
11434      →  11434           →  Ollama (internal, mapped for debugging)
```

---

## Data Flow Diagrams

### Authentication Flow

```
1. Client
   └─ POST /api/auth/login {email, password}
   └─ Backend
      ├─ Query PostgreSQL for user
      ├─ Verify password (bcrypt)
      ├─ Generate JWT (signed with JWT_SECRET)
      └─ Response: {access_token, refresh_token, user}

2. Client stores JWT in localStorage/sessionStorage

3. Subsequent requests
   └─ Header: Authorization: Bearer <JWT>
   └─ Backend Guard verifies JWT
      ├─ Decode JWT
      ├─ Extract user context (ID, role, permissions)
      └─ Attach to request
```

### AI Chat Flow

```
Client Request (POST /api/ai/chat)
├─ Validate JWT
├─ Check AI_ENABLED flag
├─ Backend Service
│  ├─ Parse user message
│  ├─ HTTP Request to Ollama
│  │  └─ POST http://ollama:11434/api/generate
│  │     Body: {model: "phi3", prompt: "..."}
│  ├─ Wait for Ollama response (up to 45 seconds)
│  ├─ Parse response
│  ├─ Store in AI audit logs (PostgreSQL)
│  └─ Format response
└─ Response: {answer, modelUsed, intent, context, processingMs}
```

### Embedding Flow (Phase 4, Infrastructure Ready)

```
Backend Process
├─ Document uploaded to MinIO
├─ Trigger embedding generation
├─ HTTP Request to Ollama
│  └─ POST http://ollama:11434/api/embeddings
│     Body: {model: "nomic-embed-text", input: "...text..."}
├─ Receive embedding vector (768 dimensions)
├─ Store in PostgreSQL
│  └─ UPDATE documents SET embeddings = pgvector_cast(...)
└─ Trigger vector search indexing
```

---

## Security Architecture

### Authentication & Authorization

**JWT Strategy**:
- Tokens signed with HS256
- Expiration: 15 minutes
- Refresh token: 7 days
- Refresh endpoint: POST /api/auth/refresh

**Role-Based Access Control (RBAC)**:
```
Admin
├─ project:*
├─ design:*
├─ quality:*
├─ document:*
├─ user:manage
└─ audit:read

Manager
├─ project:read, create, update
├─ design:read, create, update, approve
├─ quality:read, create, close
└─ document:read, upload, download

Engineer
├─ project:read
├─ design:read, create
├─ quality:read, create
└─ document:read, upload, download
```

### Network Security

- **Internal Communication**: Isolated bridge network
  - Postgres, Redis, MinIO, Ollama not exposed to host
  - Only backend container can access these services
  - Frontend only communicates with backend via HTTP

- **External Communication**: Port filtering
  - Firewall rules whitelist approved IPs
  - Backend (3001) and Frontend (8080) only exposed to trusted networks

- **Data Encryption**:
  - SSL/TLS termination at Nginx (production)
  - Passwords hashed with bcrypt (backend)
  - JWT signing with secret key
  - Database connections over TCP (no encryption in default setup, use SSL in production)

### API Rate Limiting

```
Global:
  - 100 requests per minute per IP
  - Tracked via Redis

Auth Endpoint:
  - 10 login attempts per 15 minutes
  - Tracked via Redis
```

---

## Database Schema (Simplified View)

```
┌──────────────────────────────────────────────────────────────┐
│                        MITRA v3.2 Database                   │
├──────────────────────────────────────────────────────────────┤
│
│  Authentication & Users
│  ├─ users (id, email, password_hash, role, tenant_id)
│  ├─ refresh_tokens (id, user_id, token_hash, expires_at)
│  └─ roles (id, name, permissions[])
│
│  Multi-Tenancy
│  └─ tenants (id, name, created_at)
│
│  Core Business Logic
│  ├─ projects (id, name, tenant_id, status)
│  ├─ designs (id, project_id, data, status, created_at)
│  ├─ quality_records (id, project_id, findings, status)
│  └─ workflows (id, name, steps[])
│
│  Documents & Files
│  └─ documents (id, project_id, name, s3_key, created_at)
│
│  Audit & Logging
│  ├─ audit_logs (id, entity, action, user_id, timestamp)
│  └─ ai_interactions (id, user_id, prompt, response, model_used)
│
│  Vector Embeddings (Phase 4 Ready)
│  └─ document_embeddings (document_id, embedding: vector(768))
│
└──────────────────────────────────────────────────────────────┘
```

---

## Scalability Considerations

### Horizontal Scaling (Future)

**Backend Replicas**:
- Multiple NestJS instances behind load balancer
- Session shared via Redis
- Database connection pooling (max: 20 per instance)

**Database Scaling**:
- PostgreSQL read replicas for reporting
- pgvector indexes optimized for vector search (Phase 4)

**Caching Strategy**:
- Redis cluster for distributed cache
- Cache invalidation via events

### Vertical Scaling

**CPU**: Additional cores benefit Ollama model inference
**RAM**:
- PostgreSQL buffer pool: 25% of available RAM
- Backend Node heap: 4GB (configurable)
- Redis in-memory storage: Depends on data size
- Ollama model loading: Depends on model size

**Storage**:
- PostgreSQL: Grows with data (backups: 20-30GB)
- MinIO: Depends on uploaded documents
- Ollama models: 2.2GB (phi3) + 274MB (nomic-embed-text)

---

## Deployment Architectures

### Development
- Single host, Podman rootless
- All services on single machine
- Local volume mounts for hot reload
- No persistence guarantees

### Staging
- Single host or small cluster
- Persistent volumes on external storage
- Full backup strategy
- Performance testing baseline

### Production
- Dedicated database server (PostgreSQL)
- Dedicated cache server (Redis Cluster)
- Dedicated storage server (MinIO)
- Load balancer for backend instances
- Ollama on GPU-accelerated host (optional)
- Multi-region ready (future)

---

## Monitoring & Observability

### Health Checks
- **Backend**: HTTP GET /api/health (interval: 30s)
- **Frontend**: HTTP GET /health (interval: 30s)
- **Database**: pg_isready command (interval: 10s)
- **Redis**: PING command (interval: 10s)
- **MinIO**: mc ready command (interval: 15s)
- **Ollama**: HTTP GET /api/tags (interval: 60s)

### Logging
- **Backend**: Structured JSON logs (winston)
- **Frontend**: Console logs (development), disabled (production)
- **Database**: Query logging (slow queries: >500ms)
- **All services**: Docker/Podman json-file driver
  - Rotation: 10MB per file, 3 files retained

### Metrics
- Response times (backend)
- Error rates (5xx, 4xx)
- Database query performance
- Cache hit/miss rates
- AI model inference time

---

## Disaster Recovery

### Backup Strategy
- **PostgreSQL**: Daily at 2 AM UTC
- **MinIO**: Daily incremental snapshots
- **Redis**: Optional (session data can be regenerated)

### Recovery Time Objectives (RTO)
- Database: 30 minutes (restore from backup)
- Services: 5 minutes (restart containers)

### Recovery Point Objectives (RPO)
- Database: 24 hours (daily backups)
- MinIO: 24 hours (incremental snapshots)

---

## Technology Decision Rationale

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Backend Framework | NestJS | Type-safe, modular, enterprise-ready |
| Frontend Framework | React | Rich ecosystem, component reusability |
| Database | PostgreSQL | ACID compliance, pgvector for embeddings |
| Cache | Redis | Fast in-memory store, proven at scale |
| Object Storage | MinIO | S3-compatible, self-hosted, open-source |
| LLM Runtime | Ollama | Local inference, no external dependencies |
| Containerization | Podman | Rootless by default, OCI-compliant |
| Frontend Server | Nginx | Lightweight, high performance, simple config |

---

**End of System Architecture**
