# Running Services

- postgres: PostgreSQL 16 + pgvector for application data. Exposed on host port 5432.
- redis: Redis 7 for cache, rate limiting, and session data. Exposed on host port 6379.
- minio: MinIO S3-compatible object storage. Exposed on host ports 9000 and 9001.
- backend: NestJS API server running on port 3001. Depends on postgres, redis, and minio.
- frontend: React/Vite application served by nginx on port 8080.
- ollama: Optional local LLM service. Included in `podman-compose.yml` but not required for the core deployment.
