# DEPLOYMENT CHECKLIST - MITRA v3.2

**Purpose**: Production deployment verification for MITRA v3.2
**Audience**: DevOps, Site Reliability Engineers, System Administrators
**Last Updated**: June 24, 2026

---

==================================================
LOGIN ROOT CAUSE ANALYSIS
==================================================

DO NOT ASSUME FRONTEND ISSUE.

Facts already verified:

- Backend auth works
- JWT generation works
- User exists
- Password is correct
- /api/auth/login returns token

Trace complete login flow:

LoginPage
AuthContext
api.ts
axios interceptors
ProtectedRoute
Router
Dashboard redirect
localStorage/sessionStorage

Verify:

1. Network request
2. Network response
3. Token storage
4. Auth state
5. Route guards
6. Redirect logic
7. Browser console errors

Find actual root cause.

Fix root cause.

Success:

```
admin@mitra.local
Itk98NC0oE0zQjBc40AIxyJq
```

must reach dashboard after login.

---

## Pre-Deployment Environment Setup

### System Requirements
- [ ] OS: Linux, macOS, or Windows with WSL2/Podman
- [ ] RAM: Minimum 16GB (recommended: 32GB for production)
- [ ] CPU: Minimum 8 cores (recommended: 16+ cores for production)
- [ ] Disk: Minimum 50GB SSD (recommended: 100GB+ for production)
- [ ] Network: 100Mbps+ connection (dedicated for production)

### Software Requirements
- [ ] Podman v4.0+ or Docker v20.10+ installed
- [ ] Podman Compose v1.0.6+ (or Docker Compose v2.0+)
  - Verify: `podman compose version`
- [ ] Python 3.8+ for podman-compose
  - Verify: `python3 --version`
- [ ] Git installed for version management
  - Verify: `git --version`

### Network Requirements
- [ ] Firewall: Port 3001 (backend) accessible
- [ ] Firewall: Port 8080 (frontend) accessible
- [ ] Firewall: Port 5432 (PostgreSQL) restricted to internal only
- [ ] Firewall: Port 6379 (Redis) restricted to internal only
- [ ] Firewall: Port 11434 (Ollama) restricted to internal only
- [ ] DNS: Hostname resolves (if using custom domain)
- [ ] SSL/TLS: Certificate ready (if using HTTPS)

---

## Project Setup

### Code Deployment
- [ ] Clone MITRA v3.2 repository or extract release package
  ```bash
  cd /opt/mitra3.2
  ```
- [ ] Verify directory structure exists:
  - [ ] `mitra-backend/` (NestJS app)
  - [ ] `mitra-frontend/` (React app)
  - [ ] `scripts/` (setup and maintenance scripts)
  - [ ] `docker-compose.yml` (orchestration)
  - [ ] `.env.example` (configuration template)

- [ ] Create `.env` file from template
  ```bash
  cp .env.example .env
  ```

- [ ] Verify file permissions (should be readable by deployment user)
  ```bash
  chmod 644 .env
  chmod 755 scripts/*.sh
  ```

### Environment Configuration

#### Database Variables
- [ ] `DB_HOST`: Set to internal hostname or `postgres` (for podman)
- [ ] `DB_PORT`: Verify 5432
- [ ] `DB_USERNAME`: Set to `mitra_admin`
- [ ] `DB_PASSWORD`: Generate strong password (32+ chars)
  - [ ] Use: `openssl rand -hex 16`
- [ ] `DB_NAME`: Set to `mitra_v2`
- [ ] `DB_SYNC`: Set to `false` (production)
- [ ] `DB_LOGGING`: Set to `false` (production)
- [ ] `DB_SSL`: Set to `true` if database requires SSL
- [ ] `DB_POOL_MAX`: Set to 20 (adjust based on load)
- [ ] `DB_POOL_MIN`: Set to 2

#### Redis Variables
- [ ] `REDIS_HOST`: Set to `redis`
- [ ] `REDIS_PORT`: Verify 6379
- [ ] `REDIS_PASSWORD`: Generate strong password (32+ chars)

#### JWT Variables
- [ ] `JWT_SECRET`: Generate 64-char secret
  - [ ] Use: `openssl rand -hex 32`
- [ ] `JWT_EXPIRATION`: Set to `15m` (adjust as needed)
- [ ] `JWT_REFRESH_SECRET`: Generate 64-char secret
- [ ] `JWT_REFRESH_EXPIRATION`: Set to `7d`

#### MinIO Variables
- [ ] `MINIO_ENDPOINT`: Set to `minio`
- [ ] `MINIO_PORT`: Verify 9000
- [ ] `MINIO_ACCESS_KEY`: Generate strong key (32+ chars)
- [ ] `MINIO_SECRET_KEY`: Generate strong secret (32+ chars)
- [ ] `MINIO_USE_SSL`: Set to `false` (internal only)
- [ ] `MINIO_BUCKET`: Set to `mitra-documents`

#### Ollama/AI Variables
- [ ] `AI_ENABLED`: Set to `true`
- [ ] `OLLAMA_URL`: Set to `http://ollama:11434`
- [ ] `OLLAMA_MODEL`: Set to `phi3`
- [ ] `OLLAMA_TIMEOUT_MS`: Set to 45000 (45 seconds)

#### Admin Variables
- [ ] `SEED_ADMIN_PASSWORD`: Generate strong password
- [ ] `APP_NAME`: Set to `MITRA v3.2`
- [ ] `NODE_ENV`: Set to `production`

#### Logging Variables
- [ ] `LOG_LEVEL`: Set to `info` (production)

#### Rate Limiting
- [ ] `AUTH_LOGIN_THROTTLE_LIMIT`: Set to 10 attempts
- [ ] `AUTH_LOGIN_THROTTLE_TTL_MS`: Set to 900000 (15 min)
- [ ] `RATE_LIMIT_WINDOW_MS`: Set to 60000 (1 min)
- [ ] `RATE_LIMIT_MAX_REQUESTS`: Set to 100 per minute

### Initial Podman Setup
- [ ] Run initialization script (required once)
  ```bash
  ./scripts/podman-setup.sh
  ```
  - [ ] Creates named volumes
  - [ ] Sets volume ownership
  - [ ] Initializes bridge network

- [ ] Verify volumes created
  ```bash
  podman volume ls | grep mitra
  ```

---

## Build Verification

### Backend Build
- [ ] Build backend image
  ```bash
  podman compose build backend --no-cache
  ```
  - [ ] Build completes without errors
  - [ ] All npm dependencies installed
  - [ ] NestJS compilation successful
  - [ ] Image tagged as `localhost/mitra30_backend:latest`

### Frontend Build
- [ ] Build frontend image
  ```bash
  podman compose build frontend --no-cache
  ```
  - [ ] Build completes without errors
  - [ ] Vite bundle created
  - [ ] Tailwind CSS compiled
  - [ ] Image tagged as `localhost/mitra30_frontend:latest`

### Database Migration
- [ ] Start database and backend containers
  ```bash
  podman compose up -d postgres backend
  ```
  - [ ] Wait for database to be healthy (30+ seconds)

- [ ] Run migrations
  ```bash
  podman compose exec backend npm run migration:run
  ```
  - [ ] All migrations complete successfully
  - [ ] No error messages about schema

- [ ] Verify migration output
  - [ ] Check for "Migration completed" message
  - [ ] No "already exists" errors (acceptable on re-run)

### Database Seeding
- [ ] Run seed script
  ```bash
  podman compose exec backend npm run seed
  ```
  - [ ] Admin user created successfully
  - [ ] Sample data inserted
  - [ ] No duplicate key errors

- [ ] Verify admin user created
  ```bash
  # Connect to database and run:
  SELECT email, role FROM users WHERE role='ADMIN' LIMIT 1;
  ```

---

## Pre-Production Verification

### Container Health Checks
- [ ] Start all services
  ```bash
  podman compose up -d
  ```

- [ ] Wait for services to stabilize (60 seconds)

- [ ] Verify all containers running and healthy
  ```bash
  podman compose ps
  ```
  - [ ] `postgres`: status "Up" with "(healthy)"
  - [ ] `redis`: status "Up" with "(healthy)"
  - [ ] `minio`: status "Up" with "(healthy)"
  - [ ] `backend`: status "Up" with "(healthy)"
  - [ ] `frontend`: status "Up" with "(healthy)"
  - [ ] `ollama`: status "Up" with "(healthy)"

### API Endpoint Verification

#### Backend Health
- [ ] Check backend health
  ```bash
  curl http://localhost:3001/api/health
  ```
  - [ ] Response: `{"status":"ok","info":{"database":{"status":"up"}}}`
  - [ ] Status code: 200

#### AI Module Health
- [ ] Check AI module
  ```bash
  curl http://localhost:3001/api/ai/health
  ```
  - [ ] Response includes: `"enabled":true,"available":true`
  - [ ] Model: `phi3`
  - [ ] Status code: 200

#### Authentication
- [ ] Test login endpoint
  ```bash
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@mitra.local","password":"<SEED_ADMIN_PASSWORD>"}'
  ```
  - [ ] Response includes `access_token`
  - [ ] Response includes `user` object with ADMIN role
  - [ ] Status code: 200

#### AI Chat Endpoint
- [ ] Test AI chat (using JWT from login)
  ```bash
  curl -X POST http://localhost:3001/api/ai/chat \
    -H "Authorization: Bearer <JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"message":"Hello"}'
  ```
  - [ ] Response: 200 OK
  - [ ] Contains `answer` field
  - [ ] Contains `modelUsed` field set to `phi3`
  - [ ] Response time < 30 seconds

#### Frontend Access
- [ ] Access frontend
  ```bash
  curl http://localhost:8080/
  ```
  - [ ] Returns HTML (status 200)
  - [ ] Contains React app bundle

### Ollama Model Verification
- [ ] Check available models
  ```bash
  podman exec mitra30_ollama_1 ollama list
  ```
  - [ ] Output includes: `phi3:latest`
  - [ ] Output includes: `nomic-embed-text:latest`
  - [ ] Both models show size and modification time

- [ ] Verify model connectivity from backend
  ```bash
  podman exec mitra30_backend_1 wget -qO- http://ollama:11434/api/tags
  ```
  - [ ] Returns JSON with models array
  - [ ] Includes `nomic-embed-text:latest` with "embedding" capability
  - [ ] Includes `phi3:latest` with "completion" capability

---

## Production Hardening

### Security Configuration
- [ ] Firewall rules configured
  - [ ] Port 3001: Backend (whitelist internal IPs)
  - [ ] Port 8080: Frontend (whitelist user IPs)
  - [ ] Port 5432: PostgreSQL (only from backend)
  - [ ] Port 6379: Redis (only from backend)
  - [ ] Port 11434: Ollama (only from backend)

- [ ] SSL/TLS certificates deployed (if using HTTPS)
  - [ ] Certificate valid and not expired
  - [ ] Private key secured
  - [ ] Nginx reverse proxy configured

- [ ] Environment variables secured
  - [ ] `.env` file permissions: 600 (not world-readable)
  - [ ] Secrets not in code or logs
  - [ ] Credentials rotated from defaults

### Backup Configuration
- [ ] Database backup script tested
  ```bash
  ./scripts/backup-postgres.sh
  ```
  - [ ] Backup file created successfully
  - [ ] Backup compressed
  - [ ] Backup can be restored

- [ ] Backup location verified
  - [ ] Remote backup storage configured
  - [ ] Backup retention policy set (e.g., 30 days)
  - [ ] Backup recovery procedure documented

### Monitoring Setup
- [ ] Container logs enabled
  - [ ] Log rotation configured
  - [ ] Log files persisted
  - [ ] Log monitoring tool configured (optional)

- [ ] Health check monitoring
  - [ ] Health endpoint monitored every 5 minutes
  - [ ] Alerts configured for unhealthy services
  - [ ] Runbook documented for alert response

---

## Production Deployment

### Pre-Launch Checklist
- [ ] All previous checklist items completed
- [ ] Team trained on operations and troubleshooting
- [ ] Backup and recovery procedures tested
- [ ] Rollback plan documented and tested
- [ ] Support contacts identified
- [ ] Incident response plan prepared

### Launch
- [ ] All services running and healthy
- [ ] Monitoring tools active
- [ ] Team on-call and ready
- [ ] Launch timestamp recorded

### Post-Launch Verification (First 24 Hours)
- [ ] No error logs in backend
- [ ] No database connection errors
- [ ] Chat endpoint functioning correctly
- [ ] Frontend responsive and functional
- [ ] Backup jobs completed successfully
- [ ] Performance metrics within expectations

---

## Rollback Plan

If deployment fails:

1. [ ] Stop current deployment
   ```bash
   podman compose down
   ```

2. [ ] Restore database from backup
   ```bash
   ./scripts/restore-postgres.sh backup-file.sql
   ```

3. [ ] Revert to previous version
   ```bash
   # Use previous image tags or re-pull previous version
   podman compose -f docker-compose.yml.backup up -d
   ```

4. [ ] Verify services
   ```bash
   podman compose ps
   curl http://localhost:3001/api/health
   ```

---

## Sign-Off

- [ ] DevOps Engineer: _________________ Date: ___________
- [ ] System Administrator: _________________ Date: ___________
- [ ] Project Manager: _________________ Date: ___________

---

**End of Deployment Checklist**
