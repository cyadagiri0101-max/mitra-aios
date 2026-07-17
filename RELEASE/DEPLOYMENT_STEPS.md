# Deployment Steps

1. Copy the environment template and populate secrets.
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and replace every `REPLACE_WITH_*` placeholder with secure values.
   - DB_PASSWORD
   - JWT_SECRET
   - JWT_REFRESH_SECRET
   - MINIO_ACCESS_KEY
   - MINIO_SECRET_KEY
   - REDIS_PASSWORD
   - SEED_ADMIN_PASSWORD

3. Build the container images.
   ```bash
   podman compose -f podman-compose.yml build
   ```

4. Start the core services.
   ```bash
   podman compose -f podman-compose.yml up -d postgres redis minio backend frontend
   ```

5. Run database migrations.
   ```bash
   podman compose -f podman-compose.yml exec backend npm run migration:run
   ```

6. Seed initial data.
   ```bash
   podman compose -f podman-compose.yml exec backend npm run seed
   ```

7. Verify the deployment.
   ```bash
   curl http://localhost:8080
   curl http://localhost:3001/api/health/liveness
   curl http://localhost:3001/api/health
   ```

## Notes
- Use the `.env.example` file in this release package to create `.env`.
- Do not commit `.env` to source control.
- If `podman compose` is available, use the native plugin rather than the `podman-compose` Python wrapper.
