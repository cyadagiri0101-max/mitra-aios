# MITRA Release Status

## Release
- Package: `MITRA-v3.9-WORKING-RELEASE.zip`
- Release folder: `RELEASE/`

## Deployment snapshot
- Deployment date: 2026-06-24 12:27:28 +05:30
- MITRA backend version: `3.2.0`
- MITRA frontend version: `3.2.0`
- Podman Client version: `5.8.2`
- Podman Server version: `5.8.3`
- podman-compose version: `1.6.0`

## Running containers
- `mitra30_postgres_1` — `docker.io/pgvector/pgvector:pg16`
- `mitra30_redis_1` — `docker.io/library/redis:7-alpine`
- `mitra30_minio_1` — `docker.io/minio/minio:latest`
- `mitra30_backend_1` — `localhost/mitra30_backend:latest`
- `mitra30_frontend_1` — `localhost/mitra30_frontend:latest`

## URLs
- Frontend URL: `http://localhost:8080`
- Backend URL: `http://localhost:3001`

## Health check results
- `/api/health/liveness`: `{"status":"ok","timestamp":"2026-06-24T06:57:30.257Z"}`
- `/api/health`: `{"status":"ok","info":{"database":{"status":"up"}},"error":{},"details":{"database":{"status":"up"}}}`
- Database connection: `PG_OK`
