# Environment Variables

Use `.env.example` as the deployment template. Do NOT include actual secrets in this file.

## Application
- APP_NAME
- NODE_ENV
- PORT
- LOG_LEVEL
- ALLOWED_ORIGINS

## Database
- DB_HOST
- DB_PORT
- DB_USERNAME
- DB_PASSWORD
- DB_NAME
- DB_SYNC
- DB_LOGGING
- DB_SSL
- DB_POOL_MAX
- DB_POOL_MIN

## JWT
- JWT_SECRET
- JWT_EXPIRATION
- JWT_REFRESH_SECRET
- JWT_REFRESH_EXPIRATION

## MinIO
- MINIO_ENDPOINT
- MINIO_PORT
- MINIO_ACCESS_KEY
- MINIO_SECRET_KEY
- MINIO_USE_SSL
- MINIO_BUCKET
- MINIO_ENABLED

## Redis
- REDIS_HOST
- REDIS_PORT
- REDIS_PASSWORD

## AI / Ollama
- AI_ENABLED
- OLLAMA_URL
- OLLAMA_MODEL
- OLLAMA_TIMEOUT_MS

## Seeding
- SEED_ADMIN_PASSWORD

## Auth throttling
- AUTH_LOGIN_THROTTLE_LIMIT
- AUTH_LOGIN_THROTTLE_TTL_MS

## Rate limiting
- RATE_LIMIT_WINDOW_MS
- RATE_LIMIT_MAX_REQUESTS

## Notes
- Replace all `REPLACE_WITH_*` values in `.env` before deploying.
- Never commit `.env` to source control.
