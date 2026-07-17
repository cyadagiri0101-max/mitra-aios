# MITRA v3.2 — Complete Deployment Guide

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20.x | Backend build |
| npm | 10.x | Package management |
| Podman | 5.x+ | Container runtime (Windows/Linux) |
| Git Bash / WSL | latest | Shell scripts |
| openssl | any | Secret generation |

## Quick Start (5 Steps)

```bash
# 1. Unzip the project
cd MITRA-v3.2

# 2. Generate secrets
bash scripts/generate-secrets.sh
# Copy the generated values into your .env file

# 3. Install dependencies & build backend
cd mitra-backend
npm install
npm run build

# 4. Install dependencies & build frontend
cd ../mitra-frontend
npm install
npm run build

# 5. Start all containers
cd ..
podman compose -f podman-compose.yml up -d

# 6. Initialize database
podman compose -f podman-compose.yml exec backend npm run migration:run
podman compose -f podman-compose.yml exec backend npm run seed

# 7. Verify health
curl http://localhost:3001/api/health
```

## Environment Configuration

### Required Variables (MUST be filled before starting)

```env
# Database
DB_PASSWORD=your_32_char_random_here

# JWT (generate: openssl rand -hex 32)
JWT_SECRET=your_64_hex_char_here
JWT_REFRESH_SECRET=your_different_64_hex_char_here

# MinIO
MINIO_ACCESS_KEY=your_16_char_access_key
MINIO_SECRET_KEY=your_32_char_secret_key

# Redis
REDIS_PASSWORD=your_16_char_password

# Admin seed (only used on first run)
SEED_ADMIN_PASSWORD=your_strong_admin_password
```

### Optional Variables (have sensible defaults)

```env
# Application
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost,http://localhost:8080

# Database tuning
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_SYNC=false
DB_LOGGING=false

# Auth throttling
AUTH_LOGIN_THROTTLE_LIMIT=10
AUTH_LOGIN_THROTTLE_TTL_MS=900000

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# AI (disabled by default)
AI_ENABLED=false
```

## Docker / Podman Deployment

### Option A: Podman (Recommended for Windows)

```bash
# IMPORTANT: Use "podman compose" (native Go plugin) NOT "podman-compose"
# The Python "podman-compose" tool has known YAML parsing bugs.

# Verify DNS inside the VM first
podman machine ssh
ping google.com -c 4
exit

# If DNS fails, fix it:
podman machine ssh
# Inside VM:
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
exit

# Clean build (no cache)
podman compose -f podman-compose.yml down
podman system prune -af --volumes
podman builder prune -af
podman compose -f podman-compose.yml up -d --build

# Check status
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View logs
podman compose -f podman-compose.yml logs -f backend
```

### Option B: Docker (Linux / macOS / Docker Desktop)

```bash
docker compose down
docker system prune -af --volumes
docker compose up -d --build

# Verify
docker ps
docker compose logs -f backend
```

## Troubleshooting

### "Cannot find module '@nestjs/swagger'" or similar

This means a package was incorrectly placed in `devDependencies` but is needed at runtime.

```bash
# The fix: move the package to dependencies in package.json
# Already fixed in v3.2 — if you see this, ensure you are using the latest package.json
```

### "Missing required environment variables: JWT_SECRET, DB_PASSWORD"

The `.env` file is incomplete or not being loaded.

```bash
# Verify .env exists at PROJECT ROOT (not inside mitra-backend/)
ls -la .env

# Verify values are filled (not placeholders)
grep "DB_PASSWORD" .env
# Should NOT show: REPLACE_WITH_...

# If using Podman, the container must be RECREATED after .env changes:
podman compose -f podman-compose.yml down
podman compose -f podman-compose.yml up -d --build
```

### "Connection refused" or "database does not exist"

PostgreSQL container is not ready or the database was not created.

```bash
# Wait for postgres healthcheck
podman compose -f podman-compose.yml ps

# Check postgres logs
podman compose -f podman-compose.yml logs postgres

# Run migrations manually
podman compose -f podman-compose.yml exec backend npm run migration:run
```

### "Temporary failure in name resolution" (Podman on Windows)

DNS inside the Podman VM is broken.

```bash
podman machine ssh
# Inside VM:
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
ping google.com -c 4
exit
```

### Backend container keeps restarting

Check the exact error:

```bash
podman compose -f podman-compose.yml logs backend --tail 50
```

Common causes:
1. `.env` missing or incomplete → Fill all `REPLACE_WITH_*` values
2. Database not reachable → Check `DB_HOST=postgres` is correct for compose networking
3. Redis auth failed → Ensure `REDIS_PASSWORD` matches between `.env` and container

## Verification Checklist

After deployment, verify each service:

```bash
# 1. Backend health
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}

# 2. Frontend
curl http://localhost:8080
# Expected: HTML page

# 3. PostgreSQL
podman compose exec postgres psql -U mitra_admin -d mitra_v2 -c "SELECT COUNT(*) FROM users;"

# 4. Redis
podman compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
# Expected: PONG

# 5. MinIO
open http://localhost:9001
# Login with MINIO_ACCESS_KEY / MINIO_SECRET_KEY
```

## Security Hardening (Production)

1. **Change ALL secrets** from the generated `.env` values
2. **Enable HTTPS** via reverse proxy (nginx, Traefik, or cloud load balancer)
3. **Restrict CORS** to your actual domain:
   ```env
   ALLOWED_ORIGINS=https://your-domain.com
   ```
4. **Enable Redis password** and ensure it matches between `.env` and the Redis healthcheck
5. **Review firewall rules** — only expose ports 3001 (backend), 8080 (frontend), and 9001 (MinIO console) to your network

## Backup & Recovery

```bash
# Automated backup scripts are included in scripts/backup/
# See scripts/backup/README.md for full documentation

# Quick manual backup
podman compose exec postgres pg_dump -U mitra_admin mitra_v2 > backup_$(date +%Y%m%d).sql
```

## Support

If you encounter an issue not covered here:
1. Run `podman compose logs <service>` and capture the error
2. Check the audit reports in `docs/audit/` for known issues
3. Regenerate `node_modules` and `dist` from scratch
