# OPERATIONS RUNBOOK - MITRA v3.2

**Purpose**: Operational procedures for running, maintaining, and troubleshooting MITRA  
**Audience**: Site Reliability Engineers, DevOps, System Administrators  
**Last Updated**: June 24, 2026

---

## Quick Commands

```bash
# Start all services
podman compose -f docker-compose.yml up -d

# Stop all services
podman compose -f docker-compose.yml down

# View service status
podman compose -f docker-compose.yml ps

# View logs
podman compose -f docker-compose.yml logs -f backend
podman compose -f docker-compose.yml logs -f frontend
podman compose -f docker-compose.yml logs -f postgres

# Execute command in container
podman exec <container_name> <command>
```

---

## Startup & Shutdown Procedures

### Startup Sequence (Fresh Boot)

**Step 1: Verify Prerequisites**
```bash
podman --version              # Should be v4.0+
podman compose version        # Should be v1.0.6+
```

**Step 2: Navigate to Project**
```bash
cd /opt/mitra3.2
```

**Step 3: Start Services**
```bash
podman compose -f docker-compose.yml up -d
```

**Step 4: Wait for Database**
```bash
# Wait 30-60 seconds for PostgreSQL to be healthy
podman compose -f docker-compose.yml ps | grep postgres
# Should show: "Up 2 minutes (healthy)"
```

**Step 5: Verify Services**
```bash
# Check all services
podman compose -f docker-compose.yml ps

# Expected output:
# CONTAINER ID  IMAGE                              STATUS
# ...           pgvector:pg16                      Up X seconds (healthy)
# ...           redis:7-alpine                     Up X seconds (healthy)
# ...           minio:latest                       Up X seconds (healthy)
# ...           localhost/mitra30_backend:latest   Up X seconds (healthy)
# ...           localhost/mitra30_frontend:latest  Up X seconds (healthy)
# ...           ollama:latest                      Up X seconds (healthy)
```

**Step 6: Verify API Endpoints**
```bash
# Backend health
curl http://localhost:3001/api/health
# Expected: {"status":"ok","info":{"database":{"status":"up"}}}

# AI health
curl http://localhost:3001/api/ai/health
# Expected: {"enabled":true,"available":true,"model":"phi3"}

# Frontend access
curl http://localhost:8080/
# Expected: HTML response
```

### Shutdown Sequence

**Step 1: Stop Services (Graceful)**
```bash
podman compose -f docker-compose.yml down
# Waits 10 seconds for containers to stop gracefully
```

**Step 2: Verify Shutdown**
```bash
podman ps | grep mitra
# Should return no results
```

**Step 3: Clean Up (Optional)**
```bash
# Stop and remove all containers, networks
podman compose -f docker-compose.yml down --remove-orphans

# Remove volumes (WARNING: Data loss)
podman volume rm <volume_name>  # Only if intentional
```

---

## Service Management

### Restart Individual Service

```bash
# Restart backend
podman compose -f docker-compose.yml restart backend

# Restart frontend
podman compose -f docker-compose.yml restart frontend

# Restart database
podman compose -f docker-compose.yml restart postgres
```

### View Service Logs

```bash
# Backend logs (last 100 lines)
podman compose -f docker-compose.yml logs --tail=100 backend

# Follow logs in real-time
podman compose -f docker-compose.yml logs -f backend

# Logs with timestamps
podman compose -f docker-compose.yml logs -f --timestamps backend

# Logs for specific time range (last 1 hour)
podman compose -f docker-compose.yml logs --since 1h backend

# Filter logs
podman compose -f docker-compose.yml logs backend | grep ERROR
```

### Execute Commands in Container

```bash
# Database backup
podman exec mitra30_postgres_1 pg_dump -U mitra_admin mitra_v2 > backup.sql

# Database restore
podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2 < backup.sql

# Interactive shell in backend
podman exec -it mitra30_backend_1 /bin/sh

# Check backend environment
podman exec mitra30_backend_1 env | grep OLLAMA
```

### Resource Monitoring

```bash
# View container stats (CPU, memory, network I/O)
podman stats

# View specific container stats
podman stats mitra30_backend_1

# View container inspection
podman inspect mitra30_backend_1 | grep -A 20 Memory
```

---

## Database Operations

### Backup Database

#### Automated Backup
```bash
./scripts/backup-postgres.sh
# Creates: backup-postgres-$(date +%Y%m%d-%H%M%S).sql.gz
```

#### Manual Backup
```bash
# Backup with compression
podman exec mitra30_postgres_1 pg_dump -U mitra_admin mitra_v2 | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Backup without compression
podman exec mitra30_postgres_1 pg_dump -U mitra_admin mitra_v2 > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore Database

```bash
# Restore from compressed backup
gunzip -c backup.sql.gz | podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2

# Restore from plain text backup
podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2 < backup.sql
```

### Database Migrations

```bash
# Run pending migrations
podman exec mitra30_backend_1 npm run migration:run

# Revert last migration
podman exec mitra30_backend_1 npm run migration:revert

# Show migration status
podman exec mitra30_backend_1 npm run migration:show
```

### Database Queries

```bash
# Connect to database shell
podman exec -it mitra30_postgres_1 psql -U mitra_admin mitra_v2

# Common queries
SELECT version();                              # PostgreSQL version
SELECT current_database();                     # Current database
SELECT * FROM pg_extension;                    # Installed extensions
SELECT COUNT(*) FROM users;                    # Count users
SELECT email, role FROM users WHERE role='ADMIN';  # List admins
```

---

## Troubleshooting Guide

### Issue: Backend Container Not Starting

**Symptoms**: 
- `podman compose ps` shows backend as "Exited" or "Restarting"

**Diagnosis**:
```bash
# Check logs
podman compose logs backend | tail -50

# Common issues in logs:
# - "Database connection refused" → PostgreSQL not ready
# - "Cannot find module" → Dependency issue
# - "Port 3001 already in use" → Port conflict
```

**Resolution**:
```bash
# If PostgreSQL issue, wait and restart
podman compose restart postgres backend

# If dependency issue, rebuild
podman compose build --no-cache backend
podman compose up -d backend

# If port conflict, change PORT in .env and rebuild
```

### Issue: AI Chat Endpoint Returns Error

**Symptoms**:
- POST /api/ai/chat returns 500 or timeout

**Diagnosis**:
```bash
# Check AI module health
curl http://localhost:3001/api/ai/health

# Check Ollama connectivity from backend
podman exec mitra30_backend_1 wget -qO- http://ollama:11434/api/tags

# Check backend logs for AI errors
podman compose logs backend | grep -i "ai\|ollama\|error"
```

**Resolution**:
```bash
# If Ollama not responding
podman compose restart ollama

# If model missing
podman exec mitra30_ollama_1 ollama pull phi3
podman exec mitra30_ollama_1 ollama pull nomic-embed-text

# If timeout issue, increase OLLAMA_TIMEOUT_MS in .env
# Default: 45000 (45 seconds)
# Increase to: 60000 (60 seconds) if needed
```

### Issue: Frontend Page Not Loading

**Symptoms**:
- Browser shows blank page or 404
- Cannot access http://localhost:8080

**Diagnosis**:
```bash
# Check frontend container
podman compose logs frontend

# Check if Nginx is serving files
podman exec mitra30_frontend_1 ls -la /usr/share/nginx/html/

# Check Nginx configuration
podman exec mitra30_frontend_1 nginx -t
```

**Resolution**:
```bash
# Rebuild frontend
podman compose build --no-cache frontend

# Restart frontend
podman compose restart frontend

# Check backend connectivity from frontend (via Nginx proxy)
curl http://localhost:8080/api/health
```

### Issue: Database Connection Pool Exhausted

**Symptoms**:
- "Connection pool exhausted" errors in backend
- Slow API responses
- Database connections at max

**Diagnosis**:
```bash
# Check active connections
podman exec mitra30_postgres_1 psql -U mitra_admin mitra_v2 -c "SELECT count(*) FROM pg_stat_activity WHERE datname='mitra_v2';"

# List connections
podman exec mitra30_postgres_1 psql -U mitra_admin mitra_v2 -c "SELECT pid, usename, application_name, state FROM pg_stat_activity;"
```

**Resolution**:
```bash
# Increase pool size in .env
DB_POOL_MAX=30  # Increase from 20

# Restart backend
podman compose restart backend

# Alternative: Reduce idle connections
# In docker-compose.yml, adjust idleConnectionTimeoutMillis
```

### Issue: Redis Cache Keys Growing Unbounded

**Symptoms**:
- Redis consuming excessive memory
- `podman stats` shows minio redis using 90%+ memory

**Diagnosis**:
```bash
# Check Redis memory
podman exec mitra30_redis_1 redis-cli info memory

# Check largest keys
podman exec mitra30_redis_1 redis-cli --bigkeys

# Check key count
podman exec mitra30_redis_1 redis-cli dbsize
```

**Resolution**:
```bash
# Clear Redis cache
podman exec mitra30_redis_1 redis-cli FLUSHDB

# Configure expiration policies in redis.conf
# Current: maxmemory-policy allkeys-lru (automatic eviction)
```

### Issue: Ollama Model Loading Fails

**Symptoms**:
- Ollama container stuck on "Pulling model"
- AI health endpoint shows model unavailable

**Diagnosis**:
```bash
# Check Ollama logs
podman compose logs ollama | tail -50

# List available models
podman exec mitra30_ollama_1 ollama list

# Check if phi3 is loaded
podman exec mitra30_ollama_1 ollama ps
```

**Resolution**:
```bash
# Pull models manually
podman exec mitra30_ollama_1 ollama pull phi3
podman exec mitra30_ollama_1 ollama pull nomic-embed-text

# If stuck, restart Ollama container
podman compose restart ollama

# Wait for models to load
sleep 30

# Verify
podman exec mitra30_ollama_1 ollama list
```

---

## Performance Tuning

### Database Performance

```bash
# Enable slow query logging
podman exec mitra30_postgres_1 psql -U mitra_admin mitra_v2 -c "SET log_min_duration_statement TO 1000;"

# Analyze query plans
EXPLAIN ANALYZE SELECT * FROM designs WHERE project_id = 'xxx';

# Create indexes for common queries
CREATE INDEX idx_designs_project_id ON designs(project_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```

### Backend Performance

```bash
# Monitor memory usage
podman stats mitra30_backend_1 --no-stream

# Check event loop lag (in logs)
# Look for: "Event loop delay: XXms" warnings

# Increase Node heap size in docker-compose.yml
# NODE_OPTIONS="--max-old-space-size=4096"
```

### Redis Performance

```bash
# Monitor hit/miss rate
podman exec mitra30_redis_1 redis-cli info stats | grep "hits\|misses"

# Adjust maxmemory policy if needed
podman exec mitra30_redis_1 redis-cli CONFIG GET maxmemory-policy
podman exec mitra30_redis_1 redis-cli CONFIG SET maxmemory-policy "allkeys-lru"
```

---

## Maintenance Tasks

### Daily Tasks

- [ ] Check service health: `podman compose ps`
- [ ] Review error logs: `podman compose logs backend | grep ERROR`
- [ ] Verify backups completed

### Weekly Tasks

- [ ] Full database backup verification (test restore)
- [ ] Review audit logs for anomalies
- [ ] Check disk space usage: `df -h`
- [ ] Monitor performance metrics

### Monthly Tasks

- [ ] Update container images: `podman compose pull`
- [ ] Rebuild containers: `podman compose build --no-cache`
- [ ] Review and rotate secrets if needed
- [ ] Test disaster recovery procedure

### Quarterly Tasks

- [ ] Security patch updates
- [ ] Performance analysis and tuning
- [ ] Capacity planning review
- [ ] Documentation update

---

## Emergency Procedures

### Service Down - Immediate Recovery

```bash
# 1. Check service status
podman compose ps

# 2. If service crashed, check logs
podman compose logs <service_name> | tail -100

# 3. Attempt restart
podman compose restart <service_name>

# 4. Wait and verify
sleep 10
podman compose ps

# 5. If still failing, rebuild
podman compose build --no-cache <service_name>
podman compose up -d <service_name>
```

### Database Corruption - Recovery

```bash
# 1. Stop backend (to prevent more writes)
podman compose stop backend

# 2. Verify database integrity
podman exec mitra30_postgres_1 pg_dump -U mitra_admin mitra_v2 > /dev/null

# 3. If verification passes, start backend
podman compose start backend

# 4. If verification fails, restore from backup
podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2 < latest-backup.sql
```

### Full System Recovery

```bash
# 1. Shut down all services
podman compose down

# 2. Remove containers (keep volumes)
podman container prune -f

# 3. Restore database if needed
# (See Database Recovery above)

# 4. Start services fresh
podman compose up -d

# 5. Verify
podman compose ps
curl http://localhost:3001/api/health
```

---

## Monitoring Checklist

### Hourly
- [ ] No error logs accumulating
- [ ] Response times normal (<1 second for API calls)
- [ ] No container restarts

### Daily
- [ ] Database connection pool healthy
- [ ] Redis memory stable
- [ ] Backup jobs completed
- [ ] No failed authentication attempts (check audit logs)

### Weekly
- [ ] Disk space available (>10% free)
- [ ] CPU usage patterns normal
- [ ] Memory usage patterns normal
- [ ] Network I/O within expectations

---

## Contact & Escalation

**Primary On-Call**: [Team Contact]  
**Secondary On-Call**: [Team Contact]  
**Incident Channel**: #mitra-incidents  
**Escalation**: [Manager Contact] if unresolved after 30 minutes

---

**End of Operations Runbook**
