# MITRA — Mold Development Lifecycle Platform

**Version:** 3.2.0 (Sprint 1.1)

MITRA is a mold development lifecycle management platform comprising an AI operating system (AIOS), a NestJS backend, and a React frontend.

## Repository Structure

```
mitra-aios/              — Python AIOS runtime (FastAPI, CLI, EOS engine)
mitra-backend/           — NestJS API (TypeORM, PostgreSQL, RBAC)
mitra-frontend/          — React dashboard (Vite, Tailwind, Zustand)
docs/                    — Documentation, ADRs, archived reports
scripts/                 — Utility scripts (backup, probe, validation)
```

## Requirements

| Component  | Runtime        | Database     | Cache  | Storage |
|------------|---------------|--------------|--------|---------|
| AIOS       | Python >= 3.13 | —            | —      | —       |
| Backend    | Node >= 20     | PostgreSQL 16 | Redis 7 | MinIO  |
| Frontend   | Node >= 20     | —            | —      | —       |

## Quick Start (Full Platform)

```bash
# 1. Prerequisites
#    - PostgreSQL 16+ running on localhost:5432
#    - Redis 7+ running on localhost:6379 (optional, disabled by default)
#    - MinIO running on localhost:9000 (optional)

# 2. Configure environment
cp .env.example .env
# Edit .env with your DB_USERNAME, DB_PASSWORD, JWT_SECRET

# 3. Backend setup
cd mitra-backend
npm install
npm run build
npm run migration:run     # Run all TypeORM migrations
npm run seed              # Seed reference data (requires SEED_ADMIN_PASSWORD)
npm run start:dev         # http://localhost:3001

# 4. Frontend setup (separate terminal)
cd mitra-frontend
npm install
npm run dev               # http://localhost:3000

# 5. AIOS setup
pip install -e ".[dev]"
aios --help
```

## Testing

```bash
# Backend unit tests
cd mitra-backend && npm test

# Backend E2E tests (requires test database)
cd mitra-backend && npm run test:e2e

# Backend with coverage
cd mitra-backend && npm run test:cov

# Python AIOS tests
pytest --cov=aios --cov-fail-under=80

# E2E commercial workflow verification
python scripts/workflow_certification_probe.py
```

## Release Verification

Push to `main` or `develop` triggers the `release-check` workflow which:
1. Runs Ruff lint and pytest on AIOS (Python, 80% coverage floor)
2. Builds and unit-tests the NestJS backend
3. Runs all TypeORM migrations against a fresh PostgreSQL
4. Seeds reference data (roles, permissions, workflow states)
5. Executes E2E tests against the running backend
6. Runs the workflow certification probe
7. Builds the React frontend

See [docs/DEVELOPER_QUICKSTART.md](docs/DEVELOPER_QUICKSTART.md) for detailed setup.

## Key Documentation

- [Architecture](docs/Architecture.md)
- [API Standards](API_STANDARDS.md)
- [Database Schema](DB_SCHEMAS.md)
- [Permission Model](PERMISSION_MODEL.md)
- [Security Architecture](SECURITY_ARCHITECTURE.md)
- [Developer Quick Start](docs/DEVELOPER_QUICKSTART.md)

## License

MIT — see [LICENSE](LICENSE).
