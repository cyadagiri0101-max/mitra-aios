# MITRA Developer Quick Start

## Purpose

This quick start helps new developers get the MITRA repository running locally with the required backend services and test harness.

## Prerequisites

- Git
- Node.js 20+ (for frontend and backend)
- npm
- Python 3.14+
- PostgreSQL
- Redis
- MinIO
- Docker / Docker Compose

## Repository setup

```bash
git clone <repository-url> d:\Mitra3.0
cd d:\Mitra3.0
```

## Backend setup

```bash
cd d:\Mitra3.0\mitra-backend
npm install
```

## Frontend setup

```bash
cd d:\Mitra3.0\mitra-frontend
npm install
```

## Environment

Copy the example env file and configure values:

```bash
cp .env.example .env
```

Key services:
- `DATABASE_URL` for PostgreSQL
- `REDIS_URL` for Redis
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` for MinIO
- `JWT_SECRET`

## Running backend locally

```bash
cd d:\Mitra3.0\mitra-backend
npm run start:dev
```

## Running frontend locally

```bash
cd d:\Mitra3.0\mitra-frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

## Database migrations

See `docs/MIGRATIONS.md` for detailed migration guidance.

To run migrations:

```bash
cd d:\Mitra3.0\mitra-backend
npm run typeorm migration:run
```

## Tests

### Backend

```bash
cd d:\Mitra3.0\mitra-backend
npm test -- --runInBand
```

### Frontend

```bash
cd d:\Mitra3.0\mitra-frontend
npm test
```

## Certification probe

Use the workflow certification probe to validate the commercial workflow end-to-end:

```bash
cd d:\Mitra3.0
python scripts/workflow_certification_probe.py
```

## Release baseline notes

- Preserve `docker-compose.yml` as the canonical compose file.
- Archive or ignore local runtime artifacts such as `.venv/` and `.ai_back up/`.
- Keep `mitra-backend/src/database/migrations/` intact for the release baseline.

## Useful docs

- `PROJECT_CONSTITUTION.md`
- `ROADMAP.md`
- `ARCHITECTURE.md`
- `DOMAIN_MODEL.md`
- `MODULE_SPECIFICATIONS.md`
- `DATA_LIBRARY_GUIDE.md`
- `AI_STRATEGY.md`
- `TRACEABILITY_MODEL.md`
- `IMPLEMENTATION_GUIDELINES.md`
- `DOCUMENTATION_GAP_REPORT.md`
- `REPOSITORY_AUDIT.md`
- `TECHNICAL_DEBT_REGISTER.md`
- `SPRINT2_READINESS_REPORT.md`
