# MITRA v3.2 Implementation Spec

## Context
Upgrade MITRA from v2.0.0 (backend) / v1.7 (UI) to v3.2.
Existing codebase at: `C:\Users\Srikanth\Desktop\Mitra3.0`

**Stack:**
- Backend: NestJS 11 + TypeORM + PostgreSQL + Redis + MinIO + Swagger
- Frontend: React + Vite + TypeScript + Tailwind CSS (assumed)
- Infrastructure: Docker Compose, Podman

## Existing Architecture Patterns

### Backend Module Pattern
```
modules/<name>/
  <name>.module.ts
  controllers/<name>.controller.ts
  services/<name>.service.ts
  entities/<name>.entity.ts
  dto/<name>.dto.ts
```

All modules registered in `src/app.module.ts`.
Guards: JwtAuthGuard, RolesGuard, PermissionsGuard (global via APP_GUARD).
Interceptors: AuditInterceptor, RequestContextInterceptor (global).

### Frontend Component Pattern
```
components/<Name>.tsx
pages/<Name>Page.tsx
context/<Name>Context.tsx
utils/api.ts
```

Routing in `App.tsx`. Layout in `Layout.tsx` + `Sidebar.tsx` + `Header.tsx`.

## Changes Required

### Backend — New Modules

#### 1. BOM Analysis Module (`modules/bom-analysis/`)
- Entity: `BomAnalysis` (id, projectId, bomData JSON, complexityScore, riskAreas JSON, confidence, createdAt)
- Entity: `BomItem` (id, analysisId, partNumber, quantity, material, vendor, leadTime, riskLevel, substituteSuggestions JSON)
- DTO: `AnalyzeBomDto`, `BomAnalysisResponseDto`, `BomItemDto`
- Controller: `POST /bom-analysis/analyze`, `GET /bom-analysis/:id`, `GET /bom-analysis/project/:projectId`
- Service: AI analysis logic (mock/simulated since Phi-3 is local), BOM parsing, risk detection, substitute suggestions
- Uses existing `@Permissions('bom:analyze')` decorator

#### 2. Drawing Analysis Module (`modules/drawing-analysis/`)
- Entity: `DrawingAnalysis` (id, projectId, fileName, fileType [STEP|IGES|PDF|DWG], fileUrl, partComplexity, suggestedMachiningTime, riskAreas JSON, confidence, extractedFeatures JSON, createdAt)
- DTO: `UploadDrawingDto`, `DrawingAnalysisResponseDto`
- Controller: `POST /drawing-analysis/upload`, `GET /drawing-analysis/:id`, `GET /drawing-analysis/project/:projectId`
- Service: File upload to MinIO, simulated AI analysis (extract features, complexity, machining time, risk areas)
- Storage integration with existing StorageModule
- Uses existing `@Permissions('drawing:analyze')` decorator

#### 3. Machine Status Module (`modules/machine-status/`)
- Entity: `MachineTelemetry` (id, machineId, machineName, status [RUNNING|IDLE|ALARM|SETUP|OFFLINE], spindleLoad, feedRate, coolantTemp, alarmCode, cycleCount, recordedAt, utilizationPercent)
- Entity: `MachineStatus` (id, machineId, currentStatus, lastTelemetryAt, totalRuntimeToday, utilizationPercent, updatedAt)
- DTO: `TelemetryDto`, `MachineStatusResponseDto`, `MachineStatusSummaryDto`
- Controller: `GET /machine-status`, `GET /machine-status/:machineId`, `POST /machine-status/telemetry` (for ingestion)
- Service: Store telemetry, calculate utilization, aggregate status for dashboard
- Uses existing `@Permissions('machine:read')` decorator

#### 4. AI Usage Tracking Module (`modules/ai-usage/`)
- Entity: `AiUsageRecord` (id, userId, prompt, modelName, responseTimeMs, tokenEstimate, createdAt)
- DTO: `AiUsageDto`, `AiUsageSummaryDto`
- Controller: `GET /ai-usage/stats`, `GET /ai-usage/user/:userId`, `POST /ai-usage/track` (called internally from AI service)
- Service: Track AI usage metrics, aggregate stats
- Integrate with existing `AiService` to track every AI call

### Backend — Updates to Existing Modules

#### 5. Audit Module Enhancement
- Update `audit.service.ts` to log business events: `design:released`, `quotation:approved`, `dispatch:released`, `trial:approved`, `capa:closed`, `mold:released`
- Add `AuditEventType` enum with business events
- Update `audit.interceptor.ts` to capture business event annotations
- Add `@AuditEvent('design:released')` decorator

#### 6. Fine-Grained Permissions Integration
- Add specific permission constants to existing controllers that use `@Roles()`:
  - `design.controller.ts`: `@Permissions('design:release')` on release endpoint
  - `quotation.controller.ts`: `@Permissions('quotation:approve')` on approve endpoint
  - `dispatch.controller.ts`: `@Permissions('dispatch:release')` on release endpoint
  - `cpsreview.controller.ts`: `@Permissions('trial:approve')` on approve endpoint
- The `PermissionsGuard` already exists and is globally applied. Just need to add `@Permissions()` decorators to the right endpoints.

#### 7. Backup Automation Scripts
- Create `scripts/backup/` directory with:
  - `backup-postgres.sh`: Daily pg_dump with timestamp, compress, store to MinIO backup bucket
  - `backup-minio.sh`: Mirror MinIO buckets to backup location
  - `restore-postgres.sh`: Restore from pg_dump
  - `verify-backup.sh`: Test restore to temp database, verify integrity
- Add `docker-compose.backup.yml` for scheduled backup container
- Add backup documentation to DEPLOYMENT.md

#### 8. App Module Registration
- Register all new modules in `src/app.module.ts`
- Update `package.json` version to `3.2.0`
- Update `main.ts` Swagger title to `MITRA v3.2 API`

### Frontend — Theme & Dashboard

#### 9. Blue Holographic Theme (`index.css`)
Replace existing CSS with industrial blue holographic theme:
- Base: `#0A192F`
- Surface: `#112240`
- Elevated: `#233554`
- Accent: `#64FFDA`
- Secondary accent: `#00B4D8`
- Success: `#2ECC71`
- Warning: `#F39C12`
- Error: `#E74C3C`
- Text primary: `#E6F1FF`
- Text secondary: `#8892B0`
- Font: Inter (UI), JetBrains Mono (data/numbers)
- Add glassmorphism utilities

#### 10. Manufacturing Hero Dashboard (`DashboardPage.tsx`)
- Replace current dashboard with 4 hero widgets:
  - Machines Running (8/12, 67% utilization)
  - Open Projects (34)
  - Pending Dispatches (7)
  - Overdue CAPAs (2)
- Below hero: Workflow timeline (8 stages) + AI Insights panel + Activity feed
- Auto-refresh every 30 seconds
- Color-coded status indicators
- Click to drill down

#### 11. Industrial Login Page (`LoginPage.tsx`)
- Replace generic "Hello Admin 👋" with industrial branding
- Title: `MITRA AI Production Intelligence Engine`
- Status line: `System Status: Operational | Version: 3.2`
- Prompt: `Enter credentials to access production data.`
- Blue holographic theme styling
- CNC/mold imagery background (subtle, dark overlay)

### Frontend — Components & Pages

#### 12. AI Search Animation (`SearchOverlay.tsx`)
- Full-screen overlay with Cmd+K / Ctrl+K trigger
- Animated states: `Initializing Search...` → `Analyzing Projects...` → `Processing Drawings...` → `Generating Insights...` → streaming results
- Waveform visualization
- Typing effect for streaming results
- Cyan border glow on input
- ESC to close

#### 13. Industrial AI Copilot (`AiCopilotPanel.tsx`)
- Replace cute robot avatar with abstract geometric waveform avatar
- Title: `MITRA AI Production Intelligence Engine`
- Status: `Engine Active. Awaiting instruction.`
- Input placeholder: `Enter query or select analysis type.`
- No emojis, no casual language
- Cyan border glow, glassmorphism panel
- Pulsing ring animation when processing

#### 14. BOM Analysis Page (`BomAnalysisPage.tsx`)
- New page at `/bom-analysis`
- Upload/import BOM section
- `Analyze BOM` button
- Results: `BOM Intelligence Report` with complexity, risk areas, confidence
- Table of BOM items with risk levels and substitute suggestions
- AI panel integration

#### 15. Drawing Analysis Page (`DrawingAnalysisPage.tsx`)
- New page at `/drawing-analysis`
- Upload: STEP, IGES, PDF, DWG
- Results: `Drawing Intelligence Report` with:
  - Part Complexity: High/Medium/Low
  - Suggested Machining Time: X hrs
  - Risk Areas Detected
  - Confidence: X%
- AI panel integration

#### 16. App.tsx & Routing Updates
- Add routes for new pages
- Update `SystemStatusBar.tsx` with industrial copy
- Update `Header.tsx` branding
- Update `Sidebar.tsx` navigation items for new pages
- Update `package.json` version to `3.2.0`

## Worker Assignments

### Backend Worker 1: New Feature Modules
- BOM Analysis module (full CRUD + entities + DTOs + service + controller)
- Drawing Analysis module (full CRUD + entities + DTOs + service + controller + MinIO upload)
- Machine Status module (entities + DTOs + service + controller + telemetry ingestion)
- AI Usage Tracking module (entity + DTO + service + controller + integration with AiService)

### Backend Worker 2: Infrastructure & Updates
- Audit enrichment (business event decorator, updated interceptor/service)
- Fine-grained permissions (@Permissions on key controllers)
- Backup scripts (bash scripts + docker-compose.backup.yml)
- App module registration + version updates + Swagger title

### Frontend Worker 1: Theme & Dashboard
- Blue Holographic Theme (index.css complete rewrite)
- DashboardPage with Hero Widgets (4 KPI cards + workflow timeline + AI insights + activity feed)
- LoginPage with industrial branding
- SystemStatusBar, Header updates

### Frontend Worker 2: Components & New Pages
- SearchOverlay with animation states
- AiCopilotPanel with industrial persona
- BomAnalysisPage
- DrawingAnalysisPage
- App.tsx routing updates + Sidebar navigation updates

## Validation Criteria
- All new backend modules compile (TypeScript check)
- All new frontend components compile (TypeScript + Vite build)
- No broken imports or missing dependencies
- Consistent patterns with existing code
- All routes registered
- All new features wired into app module
