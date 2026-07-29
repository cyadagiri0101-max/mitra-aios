# Deployment Guides

## Purpose

This document provides deployment instructions, environment configuration, and operational procedures for MITRA.

---

## Deployment Architecture

```
                        ┌──────────────┐
                        │   Nginx       │
                        │  (TLS 1.3)    │
                        │ Port 443      │
                        └──────┬───────┘
                   ┌───────────┴───────────┐
                   ▼                       ▼
          ┌──────────────┐       ┌──────────────┐
          │   Frontend    │       │   Backend    │
          │   nginx:alpine│       │   Node:20    │
          │   Port 80     │       │   Port 3000  │
          └──────────────┘       └──────┬───────┘
                   ┌────────────────────┼────────────────────┐
                   ▼                    ▼                    ▼
          ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
          │  PostgreSQL  │    │    Redis     │    │    MinIO     │
          │  Port 5432   │    │  Port 6379   │    │  Port 9000   │
          └──────────────┘    └──────────────┘    └──────────────┘
                                        ┌──────────────┐
                                        │    Ollama    │
                                        │  Port 11434  │
                                        └──────────────┘
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Node.js | 20 LTS | Local development (optional) |
| npm | 10+ | Dependency management |

---

## Environment Configuration

### .env file

```bash
# ─── Application ───
NODE_ENV=production
APP_NAME=MITRA
APP_PORT=3000

# ─── Database ───
DB_HOST=postgres
DB_PORT=5432
DB_NAME=mitra
DB_USER=mitra
DB_PASSWORD=${DB_PASSWORD}

# ─── Redis ───
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# ─── MinIO ───
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
MINIO_BUCKET=mitra-files

# ─── JWT ───
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=900
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=604800

# ─── AI ───
AI_ENABLED=true
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.1:8b

# ─── Observability ───
LOG_LEVEL=info
ENABLE_METRICS=true
```

---

## Docker Compose Deployment

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mitra
      POSTGRES_USER: mitra
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mitra"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mitra-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mitra-network

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - mitra-network

  backend:
    build:
      context: ./mitra-backend
      dockerfile: Dockerfile
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      minio: { condition: service_healthy }
    volumes:
      - backend_uploads:/app/uploads
    networks:
      - mitra-network

  frontend:
    build:
      context: ./mitra-frontend
      dockerfile: Dockerfile
    depends_on:
      - backend
    networks:
      - mitra-network

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - mitra-network

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    command: serve
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - mitra-network

volumes:
  postgres_data:
  redis_data:
  minio_data:
  backend_uploads:
  ollama_data:

networks:
  mitra-network:
    driver: bridge
```

### Deploy Commands

```bash
# Initial deployment
docker compose up -d

# Build and start
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f backend

# Stop
docker compose down

# Stop and remove volumes (destructive)
docker compose down -v

# Update specific service
docker compose up -d --build backend

# Scale backend
docker compose up -d --scale backend=3
```

---

## Nginx Configuration

```nginx
# nginx.conf
upstream frontend {
    server frontend:80;
}

upstream backend {
    server backend:3000;
}

server {
    listen 443 ssl http2;
    server_name mitra.local;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts for long-running requests (reports, uploads)
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        client_max_body_size 500M;
    }

    # Swagger UI
    location /api/docs {
        proxy_pass http://backend;
    }

    # File uploads
    location /uploads/ {
        proxy_pass http://backend;
        client_max_body_size 500M;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

---

## Database Initialization

```sql
-- scripts/init-db.sql
CREATE SCHEMA IF NOT EXISTS commercial;
CREATE SCHEMA IF NOT EXISTS project;
CREATE SCHEMA IF NOT EXISTS engineering;
CREATE SCHEMA IF NOT EXISTS manufacturing;
CREATE SCHEMA IF NOT EXISTS quality;
CREATE SCHEMA IF NOT EXISTS service;
CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Enable pgvector extension for knowledge embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Seed admin user (password must be changed on first login)
INSERT INTO security.users (id, email, password_hash, display_name, is_active)
VALUES (
  gen_random_uuid(),
  'admin@mitra.local',
  '$2b$12$...',  -- bcrypt hash of 'admin123!'
  'System Admin',
  TRUE
);

-- Seed default roles
INSERT INTO security.roles (name, description, is_system) VALUES
  ('admin', 'Full system access', TRUE),
  ('manager', 'Operational management', TRUE),
  ('sales_rep', 'Commercial domain', TRUE),
  ('project_lead', 'Project domain', TRUE),
  ('engineer', 'Engineering domain', TRUE),
  ('production_planner', 'Manufacturing planning', TRUE),
  ('operator', 'Manufacturing execution', TRUE),
  ('qa_inspector', 'Quality inspection', TRUE),
  ('qa_engineer', 'Quality engineering', TRUE),
  ('service_tech', 'Service domain', TRUE),
  ('viewer', 'Read-only access', TRUE);
```

---

## Deployment Checklist

### Pre-deployment
- [ ] All tests pass: `npm run test:all`
- [ ] Backend builds: `npm run build` (in mitra-backend)
- [ ] Frontend builds: `npm run build` (in mitra-frontend)
- [ ] Database migrations regenerate: `npm run migration:generate`
- [ ] Environment variables configured in `.env`
- [ ] TLS certificates available in `./ssl/`
- [ ] Ollama model pulled: `docker compose exec ollama ollama pull llama3.1:8b`
- [ ] Backup of previous deployment exists

### Deployment Steps
```bash
# 1. Pull latest code
git pull origin main

# 2. Build and restart
docker compose up -d --build

# 3. Run migrations
docker compose exec backend npm run migration:run

# 4. Seed data (if new deployment)
docker compose exec backend npm run seed

# 5. Verify health
curl -k https://mitra.local/api/health

# 6. Verify frontend loads
curl -k https://mitra.local/

# 7. Check logs for errors
docker compose logs --tail=100 backend
```

### Post-deployment
- [ ] All services are healthy (`docker compose ps`)
- [ ] Can log in as admin
- [ ] Can create customer, RFQ, quotation
- [ ] Can create project
- [ ] Audit log is populating
- [ ] File upload (MinIO) is working
- [ ] AI copilot responds to queries

---

## Backup and Restore

### Automated Backup

```bash
#!/bin/bash
# scripts/backup.sh
BACKUP_DIR="/var/backups/mitra"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup (encrypted)
docker compose exec -T postgres pg_dump -U mitra mitra | \
  gpg --encrypt --recipient backup@mitra.local > \
  "${BACKUP_DIR}/mitra_db_${DATE}.sql.gpg"

# MinIO backup (config + metadata)
docker compose exec minio mc mirror /data "${BACKUP_DIR}/minio_${DATE}"

# Redis backup
docker compose exec redis redis-cli --pass ${REDIS_PASSWORD} SAVE
docker compose cp redis:/data/dump.rdb "${BACKUP_DIR}/redis_${DATE}.rdb"

# Retention: keep 30 daily, 12 monthly, 3 yearly
find ${BACKUP_DIR} -name "mitra_db_*.sql.gpg" -mtime +30 -delete
```

### Scheduled Backup (cron)
```cron
# /etc/cron.d/mitra-backup
0 2 * * * root /opt/mitra/scripts/backup.sh
0 3 1 * * root /opt/mitra/scripts/backup-db-only.sh
```

### Restore Procedure

```bash
# scripts/restore.sh
BACKUP_FILE=$1

# 1. Decrypt database backup
gpg --decrypt ${BACKUP_FILE} > /tmp/mitra_restore.sql

# 2. Stop backend services
docker compose stop backend

# 3. Drop and recreate database
docker compose exec -T postgres psql -U mitra -c "DROP DATABASE IF EXISTS mitra;"
docker compose exec -T postgres psql -U mitra -c "CREATE DATABASE mitra;"

# 4. Restore
docker compose exec -T postgres psql -U mitra < /tmp/mitra_restore.sql

# 5. Restart
docker compose start backend
```

---

## Monitoring

### Health Check Endpoint

```bash
curl https://mitra.local/api/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123456,
  "dependencies": {
    "postgres": "connected",
    "redis": "connected",
    "minio": "connected",
    "ollama": "available"
  }
}
```

### Logging

| Log Source | Location | Retention |
|------------|----------|-----------|
| Backend | `docker compose logs backend` | 7 days |
| Frontend | `docker compose logs frontend` | 7 days |
| Nginx | `docker compose logs nginx` | 30 days |
| Database | PostgreSQL logs (via Docker) | 7 days |
| Audit | `audit.audit_log` table | 1 year minimum |
