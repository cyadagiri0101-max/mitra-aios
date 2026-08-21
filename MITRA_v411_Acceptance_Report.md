# MITRA v4.1.1 — FINAL CLIENT DEMO ACCEPTANCE REPORT

**Date:** 2026-08-17  
**Version:** MITRA v4.1.1 — Patch commit `8b4346a252f427c37928fa247557395d14ad52db`  
**Branch:** `v3.3` — Working tree: CLEAN (confirmed)  

> [!WARNING]
> **Browser automation tool is unavailable in this session.** The Playwright CDN driver (v1.57.0-win32_x64) returns HTTP 404 from all Azure CDN endpoints. The audit was performed via: direct HTTP API probing, PostgreSQL direct queries, full source code inspection, and process/port enumeration. All findings are confirmed by hard evidence.

---

## PHASE 0 — RUNTIME STATUS

| Service | Port | Status | Evidence |
|---|---|---|---|
| Backend (NestJS) | 3001 | ❌ **NOT RUNNING** | Port 3001 absent from `netstat` LISTENING list |
| Frontend (Vite) | 3000 | ❌ **NOT RUNNING** | Port 3000 absent from `netstat` LISTENING list |
| PostgreSQL | 5432 | ✅ RUNNING | TCP 0.0.0.0:5432 LISTENING, PID 10212 |
| Redis | 6379 | ❌ NOT RUNNING | `Test-NetConnection 127.0.0.1:6379 → False` |
| Ollama (AI) | 11434 | ✅ Present | TCP 127.0.0.1:11434 LISTENING, PID 63996 |

**Node processes:** 4 active `node.exe` processes are all `chrome-devtools-mcp` — none are MITRA frontend or backend.

> [!CAUTION]
> `failed_login_attempts = 3` on `admin@mitra.local` (not locked yet, but 2 attempts from lockout threshold of 5). This is a pre-demo risk.

---

## DATABASE CONTENT AUDIT

| Table | Rows | Demo Status |
|---|---|---|
| tenants | 1 | ✅ |
| users | 4 | ✅ |
| customers | 12 | ✅ |
| enquiries | 9 | ✅ RFQ-2026-0001 to 0009 |
| quotations | 7 | ✅ QTN-2026-0001 to 0007, all PROJECT_CREATED |
| projects | 11 | ⚠️ All DRAFT, duplicate names |
| project_milestones | 31 | ✅ |
| project_tasks | 2 | ⚠️ Very sparse |
| work_orders | 0 | ❌ Empty |
| machine_masters | 0 | ❌ Empty |
| engineering_drawings | 0 | ❌ Empty |
| engineering_documents | 0 | ❌ Empty |
| engineering_components | 0 | ❌ Empty |
| inspection_plans | 0 | ❌ Empty |
| inspection_reports | 0 | ❌ Empty |
| ncr_records | 0 | ❌ Empty |
| quality_control_plans | 0 | ❌ Empty |
| service_requests | 0 | ❌ Empty |
| service_installations | 0 | ❌ Empty |
| service_visits | 0 | ❌ Empty |
| knowledge_articles | 0 | ❌ Empty |

**Schema:** 176 tables — all present, 32 migrations applied ✅

---

## SOURCE CODE AUDIT (Static)

### Auth (PASS)
- `loadStoredToken()` calls `setAccessToken(token)` synchronously ✅ (v4.1.1 fix confirmed in source)
- `login()` extracts `{ access_token, user }` correctly ✅
- `navigate('/dashboard', { replace: true })` on success ✅
- `ProtectedRoute` checks `!!accessToken && !!user` ✅

### Router (PASS)
All routes defined in `App.tsx`: `/dashboard`, `/projects` (+ sub-routes), `/enquiries`, `/quotations`, `/customers`, `/rfqs`, `/engineering`, `/manufacturing`, `/quality`, `/capa`, `/trials`, `/dispatch`, `/service`, `/ai-assistant`, `/analytics`, `/search`, `/settings` — **no missing routes** ✅

### AI Disabled (PASS)
- `AI_ENABLED=false` in `.env` ✅
- `AiAssistantPage.tsx` route registered ✅

### Tenant Isolation (STRUCTURAL PASS)
- 1 tenant in DB — no cross-tenant exposure possible
- All tables have `tenant_id` FK column ✅

---

## ACCEPTANCE MATRIX

| Module | Result | Evidence |
|---|---|---|
| Runtime | ❌ FAIL | Backend + Frontend + Redis not running |
| Dashboard | ⚠️ UNVERIFIABLE | Runtime down |
| Login | ⚠️ UNVERIFIABLE LIVE | Auth fix in source; DB not locked |
| Project Management | ⚠️ PARTIAL | 11 projects/31 milestones/2 tasks, all DRAFT |
| Commercial | ✅ DATA PRESENT | 12 customers, 9 enquiries, 7 quotations |
| Engineering | ❌ EMPTY | 0 drawings/documents/components |
| Manufacturing | ❌ EMPTY | 0 work orders/machines |
| Quality | ❌ EMPTY | 0 inspection plans/NCRs |
| Service | ❌ EMPTY | 0 requests/visits/installations |
| Knowledge | ❌ EMPTY | 0 articles |
| AI disabled behavior | ✅ CONFIGURED | AI_ENABLED=false |
| Navigation | ✅ SOURCE PASS | All routes in App.tsx |
| Console health | ⚠️ UNVERIFIABLE | Runtime down |
| Tenant isolation | ✅ STRUCTURAL | 1 tenant, FK enforcement |
| End-to-end demo critical path | ❌ BLOCKED | Runtime not running |

---

## FINDINGS CLASSIFICATION

### P0 — Application Unusable
- **P0-001** Frontend server (port 3000) NOT running — demo inaccessible
- **P0-002** Backend server (port 3001) NOT running — all API calls fail
- **P0-003** Redis (port 6379) NOT running — backend will fail on throttler/session ops

### P1 — Major Business Function Broken (data gap)
- **P1-001** Engineering: 0 drawings, 0 documents, 0 components — empty screens only
- **P1-002** Manufacturing: 0 work orders, 0 machines — empty screens only
- **P1-003** Quality: 0 inspection plans/reports, 0 NCRs — empty screens only
- **P1-004** Service: 0 service requests/visits/installations — empty screens only

### P2 — Meaningful Defects
- **P2-001** `failed_login_attempts = 3` on `admin@mitra.local` — 2 attempts from lockout during demo
- **P2-002** All 11 projects in DRAFT status — no active/completed project to demonstrate lifecycle
- **P2-003** Duplicate project names (9 × "ABC Bottle Blow Mold Project") — reduces coherence
- **P2-004** `knowledge_articles = 0` — Knowledge/EKL module empty
- **P2-005** `project_tasks = 2` — Task management appears nearly empty

### P3 — Cosmetic / Non-blocking
- **P3-001** CSP `frame-ancestors` meta tag warnings (non-blocking, from prior session)
- **P3-002** 3 stale test user accounts with no role in DB
- **P3-003** Vite CJS API deprecation warning (non-breaking)

### INFO — Expected Behavior
- **INFO-001** `AI_ENABLED=false` — AI shows disabled state. Intentional.
- **INFO-002** Ollama running on 11434 but AI disabled by config. Correct.
- **INFO-003** `rfqs` table = 0 — enquiries table used for RFQ workflow in this schema.
- **INFO-004** `sales_orders` = 0 — quotations convert directly to projects.

---

## FINAL DECISION

### C. DEMO BLOCKED

**Primary blocker:** Runtime stack (Frontend + Backend + Redis) is not running.  
**Secondary blocker:** Engineering, Manufacturing, Quality, and Service have zero data — these sections will show blank empty-state screens only, which is not acceptable for a client-facing product demo.

**What IS ready (pending runtime start):**
- ✅ Login → Dashboard flow (v4.1.1 auth fix present and DB not locked)
- ✅ Commercial lifecycle: Customer → Enquiry → Quotation chain populated
- ✅ Projects + 31 milestones
- ✅ All routes correctly wired

---

## PRE-DEMO ACTIONS REQUIRED

| Priority | Action |
|---|---|
| **IMMEDIATE** | Start backend: `cd mitra-backend && npm run start:prod` |
| **IMMEDIATE** | Start frontend: `cd mitra-frontend && npm run dev` |
| **IMMEDIATE** | Start Redis before starting backend |
| **HIGH** | Verify `GET /api/health` → `{ status: ok, database: up }` |
| **HIGH** | Reset `failed_login_attempts = 0` for `admin@mitra.local` in DB before demo |
| **RECOMMENDED** | Seed engineering/manufacturing/quality/service with demo data |
| **RECOMMENDED** | Rename duplicate projects to distinct meaningful names |
| **CONSTRAINT** | Do NOT modify source code, config, release tags, or commit |

---

**SOURCE CHANGES: NONE**  
**GIT CHANGES: NONE**  
**RELEASE CHANGES: NONE**  
**DATABASE CHANGES: NONE**

---
*Audit method: HTTP API probing, PostgreSQL psql direct query, PowerShell netstat/process inspection, full source code static analysis. Browser visual audit blocked by Playwright CDN unavailability (v1.57.0-win32_x64 → HTTP 404 from Azure CDN).*
