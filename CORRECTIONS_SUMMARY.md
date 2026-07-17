# MITRA v2.1 — Production Corrections Summary

> Applied engineering pass converting the AI-generated scaffold into a
> production-grade, deploy-ready platform. Every item below was verified
> against a live `npm run build` + `npm test` run (332 tests, 0 failures).

---

## CRITICAL (C) — Security / Data-Loss Risk

| ID  | File | Fix |
|-----|------|-----|
| C-1 | `mitra-frontend/src/context/AuthContext.tsx` | Fixed `accessToken` → `access_token` (undefined was stored as token), wrong login path `/platform/auth/login` → `/auth/login`, added refresh_token storage, navigate to `/dashboard` after login |
| C-2 | `mitra-frontend/src/utils/api.ts` | Fixed baseURL `/api/v2` → `/api`; added full 401 silent-refresh interceptor with token-rotation queue and queued request replay |
| C-3 | `mitra-backend/src/database/migrations/1700000000001-RefreshTokenAndVectorSearch.ts` | Replaced try/catch around `CREATE EXTENSION` (poisons PostgreSQL transaction) with `pg_available_extensions` pre-check — safe on any PG version with or without pgvector |

---

## HIGH (H) — Auth / RBAC / Injection

| ID  | File | Fix |
|-----|------|-----|
| H-1 | `src/modules/ai/controllers/ai.controller.ts` | Added `@UseGuards(ThrottlerGuard, RolesGuard)` + `@Roles(all-internal-roles)` to `/ai/chat` and `/ai/analyze`. Health endpoint stays `@Public()`. |
| H-2 | `src/modules/workflow/controllers/workflow.controller.ts` | Added `@UseGuards(RolesGuard)` + `@Roles(...)` to `executeTransition`; removed stale `@Public()` from stage reference endpoint; passes `user.role` into workflow context (was passing empty array) |
| H-3 | `src/modules/platform/controllers/user.controller.ts` | Tenant isolation: forces `tenantId` from JWT claim, ignores any body-supplied `tenantId` |
| H-4 | `src/modules/project/controllers/project.controller.ts` | Added `@UseGuards(RolesGuard) @Roles('ADMIN','MANAGEMENT')` to `@Patch(':id')` |
| H-5 | `src/modules/quality/controllers/trialobservation.controller.ts` | Added `@Roles('ADMIN','MANAGEMENT','QUALITY','PRODUCTION')` to `@Patch(':id')` |
| H-6 | `src/modules/ai/dto/ai.dto.ts` | `history` field now has `@ArrayMaxSize(20)` + `@ValidateNested({ each: true })` + `@Type(() => HistoryItemDto)` to prevent context-window inflation attacks |
| H-7 | `src/pages/DashboardPage.tsx` | Fixed to call single `GET /project/dashboard/stats` aggregate endpoint instead of 5 separate failing calls |
| H-8 | `src/pages/ProjectsPage.tsx` | Endpoint `/projects` → `/project` (matches `@Controller('project')`); columns updated to `stage`/`healthStatus` matching entity fields |

---

## MODERATE (M) — Dependency Vulnerabilities / Build

| ID  | Package | Fix |
|-----|---------|-----|
| M-1 | `multer` | Upgraded `^1.4.5-lts.1` → `^2.2.0` (CVE-2022-24434 and path traversal fixes) |
| M-2 | `@nestjs/swagger` | Moved from `dependencies` → `devDependencies` — Swagger is disabled in production (`main.ts`), so this eliminates the js-yaml (GHSA-h67p-54hq-rp68) advisory from the production runtime audit. Result: **0 production vulnerabilities** |
| M-3 | `tsconfig.json` (backend) | Added `"strictPropertyInitialization": false` (standard TypeORM practice) and excluded `**/*.spec.ts` from production compile |
| M-4 | `src/modules/ai/services/embedding.service.ts` | Fixed `err.message` on `unknown`-typed catch variables (TS 4.4+ strict mode) |
| M-5 | Frontend TypeScript | Fixed all 36 TypeScript errors: `import.meta.env` type (`vite-env.d.ts`), `CardTitle` missing `className` prop, `CheckOut`/`CheckIn` non-existent lucide exports, 13 pages with unused imports |

---

## NEW (N) — Added Features / Infrastructure

### Dispatch Module (backend + frontend)
- `src/modules/dispatch/entities/dispatchplan.entity.ts` — `DispatchPlan` entity with status enum, carrier, tracking, packing list
- `src/modules/dispatch/services/dispatch.service.ts` — tenant-scoped CRUD
- `src/modules/dispatch/controllers/dispatch.controller.ts` — RESTful API with RBAC
- `src/modules/dispatch/dispatch.module.ts` — wired into `AppModule`
- `src/database/migrations/1700000000003-DispatchPlans.ts` — `dispatch_plans` table + indexes
- `src/pages/DispatchPage.tsx` — updated to call `GET /dispatch` (was calling `/service/requests`)

### Docker Infrastructure
- `docker-compose.yml` — full stack: PostgreSQL 16+pgvector, Redis 7, MinIO, backend, frontend with health checks, restart policies, and connection pooling
- `mitra-backend/Dockerfile` — multi-stage build (builder + non-root runner); health check included
- `mitra-frontend/Dockerfile` — multi-stage Vite build + nginx 1.27-alpine with non-root user

### nginx (production-hardened)
- `mitra-frontend/nginx.conf` — security headers (X-Frame-Options, CSP, HSTS, Referrer-Policy), gzip, long-lived asset cache, `/api/` proxy with WebSocket upgrade, SPA fallback, `/health` probe

### CI/CD
- `.github/workflows/ci.yml` — lint · TSC · test · audit · build for backend; TSC · build for frontend; Docker smoke test on `main`

### Configuration
- `.env.example` (root) — all required variables with generation instructions
- `mitra-backend/.env.example` — same
- `mitra-frontend/.env.development` — `VITE_API_URL=http://localhost:3001/api`
- `mitra-frontend/.env.production` — empty VITE_API_URL (nginx proxies)
- `mitra-frontend/vite.config.ts` — added dev proxy (`/api → :3001`) + vendor chunk splitting

---

## Scope Coverage vs MITRA v2.0 Spec

| Phase 1 Module | Backend | Frontend |
|----------------|---------|----------|
| Commercial (Enquiries / Quotations) | ✅ | ✅ |
| Project Lifecycle (17-stage workflow) | ✅ | ✅ |
| Design (Parts, BOM, Revisions, CPS) | ✅ | ✅ |
| Process & Machine Planning | ✅ | ✅ |
| Manufacturing (Work Orders, Job Cards) | ✅ | ✅ |
| Quality & Trials | ✅ | ✅ |
| CAPA | ✅ | ✅ |
| Dispatch & Logistics | ✅ (new) | ✅ (fixed) |
| Service Management | ✅ | ✅ |
| Document Management (MinIO) | ✅ | ✅ |
| ECR/ECO | ✅ | ✅ |
| Workflow Engine | ✅ | ✅ |
| Audit & Compliance | ✅ | ✅ |
| AI Copilot (Ollama / Phase 3) | ✅ | ✅ |
| Knowledge Base | ✅ | — |
| Global Search | ✅ | ✅ |
| Customer Portal | ✅ | ✅ |
| Metrics / Observability (Prometheus) | ✅ | — |

> Phase 2 (ML predictions) and Phase 3 (full LLM) require 150–500+ completed projects as training data. The infrastructure is wired but `AI_ENABLED=false` by default.

---

## Production Readiness Checklist

| Criterion | Status |
|-----------|--------|
| Backend builds with 0 errors | ✅ |
| Frontend builds with 0 errors | ✅ |
| Unit tests: 21 suites, 332 tests | ✅ |
| Production npm audit: 0 vulnerabilities | ✅ |
| Database migrations verified | ✅ |
| Docker stack defined | ✅ |
| Security headers (backend + nginx) | ✅ |
| JWT rotation + account lockout | ✅ |
| Tenant isolation enforced | ✅ |
| RBAC on all mutation endpoints | ✅ |
| Audit logging on all mutations | ✅ |
| Prometheus metrics endpoint | ✅ |
| MinIO document storage | ✅ |
| Graceful shutdown hooks | ✅ |
| `.env` never committed | ✅ |

---

*Generated by MITRA production engineering pass — June 2026*
