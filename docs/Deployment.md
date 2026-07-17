# MITRA AIOS Deployment Guide

## Prerequisites

- Python 3.12+
- Docker & Docker Compose (for containerized deployment)
- PostgreSQL 16+ (for production)
- Redis 7+ (for production)
- Ollama (for local LLM inference, optional)

## Quick Start (Development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd Mitra3.0
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
pip install -e ".[dev]"
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run Tests

```bash
pytest tests/ -v
```

### 4. Start API Server

```bash
uvicorn aios.api.app:create_app --factory --reload --host 0.0.0.0 --port 8000
```

### 5. Access API Documentation

Open http://localhost:8000/docs for Swagger UI.

---

## Docker Deployment

### Full Stack

```bash
# Copy environment configuration
cp .env.docker .env

# Start all services
docker compose -f docker-compose.aios.yml up -d

# Check status
docker compose -f docker-compose.aios.yml ps

# View logs
docker compose -f docker-compose.aios.yml logs -f backend
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| backend | 8000 | AIOS API server |
| frontend | 3000 | Web UI |
| nginx | 80 | Reverse proxy |
| postgres | 5432 | Database |
| redis | 6379 | Cache |
| ollama | 11434 | Local LLM |

### Individual Services

```bash
# Backend only
docker compose -f docker-compose.aios.yml up -d backend postgres redis

# With Ollama
docker compose -f docker-compose.aios.yml --profile gpu up -d
```

---

## Production Deployment

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_PASSWORD` | Yes | - | Database password |
| `AIOS_LLM_PROVIDER` | No | `ollama` | LLM provider |
| `AIOS_EMBEDDING_PROVIDER` | No | `ollama` | Embedding provider |
| `AIOS_VECTORSTORE_PROVIDER` | No | `inmemory` | Vector store |
| `AIOS_AUTH_ENABLED` | No | `false` | Enable authentication |
| `AIOS_LOG_LEVEL` | No | `INFO` | Log level |

### Health Checks

```bash
# API health
curl http://localhost:8000/api/v1/health

# Observability health
curl http://localhost:8000/api/v1/observability/health

# System metrics
curl http://localhost:8000/api/v1/observability/metrics
```

### Scaling

```bash
# Scale backend
docker compose -f docker-compose.aios.yml up -d --scale backend=3

# Scale with load balancer
# Configure nginx upstream for multiple backend instances
```

---

## Configuration

### Config Hierarchy

Configuration is loaded in priority order (highest first):

1. Runtime overrides (API/CLI)
2. Environment variables
3. Secrets manager
4. Project files (config.toml, config.yaml, config.json)
5. Default values

### Config File Locations

```
project-root/
├── config.toml          # Primary config
├── config.yaml          # Alternative format
├── .ai/
│   └── config/
│       ├── secrets.json # Secrets (gitignored)
│       └── overrides.json
└── .env                 # Environment variables
```

### Sample Config

```toml
[llm]
provider = "ollama"
model = "llama3"
temperature = 0.7
max_tokens = 4096

[embedding]
provider = "ollama"
model = "nomic-embed-text"

[vectorstore]
provider = "faiss"
dimensions = 768

[rag]
chunk_size = 512
chunk_overlap = 64
top_k = 10

[security]
encryption_enabled = true
token_expiry_seconds = 3600

[api]
host = "0.0.0.0"
port = 8000
rate_limit_rpm = 60
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup
pg_dump -h localhost -U aios_user aios > backup.sql

# Restore
psql -h localhost -U aios_user aios < backup.sql
```

### State Files

```bash
# Backup state directory
tar -czf state-backup.tar.gz .ai/

# Restore
tar -xzf state-backup.tar.gz
```

### Checkpoint Recovery

```bash
# List checkpoints
aios checkpoint list

# Resume from checkpoint
aios checkpoint resume <checkpoint_id>
```

---

## Monitoring

### Built-in Metrics

- `GET /api/v1/observability/metrics` - System metrics
- `GET /api/v1/runtime/statistics` - Execution statistics
- `GET /api/v1/memory/statistics` - Memory usage
- `GET /api/v1/tools/statistics` - Tool execution stats

### Log Files

Logs are written to stderr and optionally to files:

```bash
# View backend logs
docker compose -f docker-compose.aios.yml logs -f backend

# Local logs
# Set AIOS_LOG_FILE=path/to/log.log
```

### Health Monitoring

```bash
# Full system health check
aios doctor --verbose

# Quick health check
aios health
```

---

## Troubleshooting

See [Troubleshooting.md](Troubleshooting.md) for common issues and solutions.

## Security

See [Security.md](Security.md) for security configuration and best practices.
