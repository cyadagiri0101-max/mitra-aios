# AI Workspace ↔ Backend API Mapping

**Date:** 2026-06-27  
**Status:** Implementation Plan  
**Task:** Connect 10 AI commands to live backend capabilities (replacing mocks)

---

## Executive Summary

The frontend AIWorkspace has 10 commands with mock implementations (1.8-2.4s delay). This document maps each command to real backend endpoints and outlines the implementation strategy.

**Timeline:** ✅ Discovery complete → 🔄 Implementation → 🧪 Testing → 📋 Reporting

---

## Command Mapping Table

| ID | AI Command | Description | Primary Endpoint(s) | Secondary Endpoints | Response Handler |
|----|-----------|-------------|-------------------|-------------------|------------------|
| 1 | `bom-risk` | Material, lead-time, substitute risks | `POST /api/bom-analysis/analyze` | `GET /api/project/:id` | Format as risk report with severity badges |
| 2 | `drawing` | Manufacturability, tolerance, release risk | `POST /api/drawing-analysis/upload` | `GET /api/drawing-analysis/:id` | Format as design review summary |
| 3 | `delay-risk` | Predict delays across active projects | `POST /api/ai/chat` + PROJECTS context | `GET /api/project?status=ACTIVE` | LLM + project delay analysis |
| 4 | `root-cause` | Production/quality exception root causes | `POST /api/ai/analyze` (CAPA entity) | `POST /api/ai/chat` | LLM-driven RCA using CAPA data |
| 5 | `recommend` | Next best actions for today | `POST /api/ai/chat` + project context | `GET /api/project?urgency=HIGH` | LLM recommendations with priority |
| 6 | `quality` | Quality trends & rising defects | `POST /api/ai/chat` + TRIALS/CAPA intent | `GET /api/trial-observation` | Trend analysis with defect categories |
| 7 | `dispatch` | Dispatch orders at-risk analysis | `GET /api/dispatch` + `POST /api/ai/chat` | `GET /api/dispatch?status=SHIPPED` | At-risk detection + flagging |
| 8 | `alerts` | Production alerts by severity | `GET /api/machine-status/summary/dashboard` | `GET /api/machine-status` | Severity grouping, time-ordered |
| 9 | `maintenance` | Maintenance forecast | `GET /api/machine-status` + telemetry | `POST /api/ai/chat` (MANUFACTURING intent) | Predictive maintenance alerts |
| 10 | `planning` | Production plan conflicts/gaps | `GET /api/planning/process-plans/:id` | `GET /api/machine/booking/conflicts` | Conflict matrix + gap analysis |

---

## Implementation Architecture

### Service Layer (New)

**File:** `mitra-frontend/src/services/aiCommandService.ts`

A specialized service that:
1. **Routes each command to its backend endpoints**
2. **Handles authentication & error states**
3. **Formats responses for UI display**
4. **Manages timeouts (min 500ms, max 30s per command)**

**Public Methods:**
```typescript
async analyzeBomRisk(projectId: string): Promise<BomRiskReport>
async reviewDrawing(projectId: string, fileBase64?: string): Promise<DrawingReview>
async predictDelayRisks(): Promise<DelayRiskAnalysis>
async findRootCauses(entityType: 'capa' | 'trial', entityId: string): Promise<RootCauseAnalysis>
async getRecommendations(context?: ProjectContext): Promise<Recommendations>
async analyzeQualityTrends(): Promise<QualityTrendReport>
async checkDispatchRisks(): Promise<DispatchRiskReport>
async summarizeAlerts(): Promise<ProductionAlertSummary>
async forecastMaintenance(): Promise<MaintenanceForecast>
async reviewProductionPlan(planId: string): Promise<PlanConflictAnalysis>
```

### Context Update (AIWorkspaceContext.tsx)

**Changes:**
1. Replace `runAction` setTimeout mock with `aiCommandService.execute()`
2. Add loading state transitions: `idle` → `loading` → `success/error` → `idle`
3. Map robot state: `presenting` (loading) → `success` or `warning` (error)
4. Parse command results into `ActionResult` object

### Response Models (New)

Create DTOs in `mitra-frontend/src/types/aiResponses.ts`:
```typescript
interface BomRiskReport {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complexityScore: 0-10;
  riskAreas: Array<{ part: string; risk: string; recommendation: string }>;
  summary: string;
}

interface DelayRiskAnalysis {
  topBlockers: Array<{ projectId: string; risk: string; daysBehind: number }>;
  projects: ProjectStatus[];
  summary: string;
}
// ... etc.
```

---

## Backend Endpoint Details

### 1. BOM Risk Analysis
```
POST /api/bom-analysis/analyze
Request: {
  projectId: string,
  bomData: Record<string, any>  // raw parts, quantities, materials, vendors
}
Response: {
  riskAreas: Array<{ issue: string; severity: string; suggestion: string }>,
  complexityScore: 0-10,
  confidence: 0-1,
  items: Array<{ partNo: string; riskLevel: string; substitutes: [] }>
}
```
**Error Cases:** 404 project not found, 400 invalid bomData

---

### 2. Drawing Analysis
```
POST /api/drawing-analysis/upload
Request: {
  projectId: string,
  fileType: 'STEP' | 'IGES' | 'PDF' | 'DWG',
  fileContentBase64: string
}
Response: {
  partComplexity: 'LOW' | 'MEDIUM' | 'HIGH',
  suggestedMachiningTime: number (hours),
  riskAreas: Array<{ area: string; type: string; mitigation: string }>,
  extractedFeatures: Array<{ name: string; value: any }>,
  confidence: 0-1
}
```
**Error Cases:** 404 project not found, 400 unsupported file type, 413 file too large

---

### 3. Delay Risk Prediction
```
POST /api/ai/chat
Request: {
  message: "Predict delay risks across all active projects and rank the top blockers.",
  intent: 'PROJECTS'
}
Response: {
  answer: string,  // LLM-generated analysis
  intent: 'PROJECTS',
  context: {
    projects: Array<{
      projectNumber: string,
      name: string,
      currentStage: string,
      daysOverdue: number,
      targetDeliveryDate: string
    }>
  }
}
```

---

### 4. Root Cause Analysis
```
POST /api/ai/analyze  (or POST /api/ai/chat with CAPA intent)
Request: {
  entityType: 'capa' | 'trial',
  entityId: string,
  question: "What are the likely root causes?"
}
Response: {
  answer: string,  // RCA narrative
  intent: 'CAPA',
  context: {
    capaNumber: string,
    issueDescription: string,
    currentStatus: string,
    relatedTrials: Array<{ ... }>
  }
}
```

---

### 5. Recommendations
```
POST /api/ai/chat
Request: {
  message: "Recommend the next best actions to keep all active projects on track today.",
  intent: 'PROJECTS'
}
Response: {
  answer: string,  // LLM recommendations with priority
  intent: 'PROJECTS'
}
```

---

### 6. Quality Trends
```
POST /api/ai/chat
Request: {
  message: "Summarize current quality trends and flag rising defect categories.",
  intent: 'TRIALS'  // or 'CAPA'
}
Response: {
  answer: string,  // Trend narrative
  context: {
    trialObservations: Array<{
      trialDate: string,
      result: 'PASS' | 'FAIL',
      rejectedParts: number,
      observations: string
    }>
  }
}
```

---

### 7. Dispatch Risk
```
GET /api/dispatch?status=PLANNING,PACKED,SHIPPED
Response: DispatchPlan[] {
  dispatchNumber: string,
  status: string,
  plannedDate: string,
  shippedDate?: string,
  deliveredDate?: string,
  customerName: string
}
→ Then POST /api/ai/chat with dispatch context
```

---

### 8. Production Alerts
```
GET /api/machine-status/summary/dashboard
Response: {
  totalMachines: number,
  machinesRunning: number,
  machinesInAlarm: number,
  alarmSummary: Array<{ alarmCode: string; machineId: string; severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; count: number }>,
  utilizationPercent: number
}
```

---

### 9. Maintenance Forecast
```
GET /api/machine-status
Response: MachineStatus[] {
  machineId: string,
  status: 'RUNNING' | 'IDLE' | 'ALARM' | 'OFFLINE',
  totalRuntimeToday: number,
  utilizationPercent: 0-100,
  cycleCount: number,
  alarmCode?: string,
  lastTelemetryAt: string
}
→ Then POST /api/ai/chat (MANUFACTURING intent) for forecasting
```

---

### 10. Production Plan Conflicts
```
GET /api/planning/process-plans/:id
Response: {
  id: string,
  projectId: string,
  status: string,
  totalEstimatedHours: number,
  routings: ProcessRouting[]  // operations with timings
}

GET /api/machine/booking/conflicts  (if exists, or query derived)
Response: Array<{
  machineId: string,
  conflictingBookings: Array<{ startTime: string; endTime: string; projectIds: string[] }>
}>
```

---

## Implementation Steps

### Phase 1: Service Creation
1. Create `mitra-frontend/src/services/aiCommandService.ts`
2. Implement 10 command handler methods
3. Add error handling (401, 404, 500, timeout)
4. Add response formatting/parsing
5. Add loading state management

### Phase 2: Context Integration
1. Refactor `AIWorkspaceContext.tsx` `runAction` function
2. Call `aiCommandService.execute(commandId)` instead of setTimeout
3. Update robot state transitions
4. Add success/error toast notifications

### Phase 3: Type Safety
1. Create `mitra-frontend/src/types/aiResponses.ts` with all response DTOs
2. Update `aiCommandService` to use strict typing
3. Add response validation

### Phase 4: Testing
1. Manual test each of 10 commands
2. Verify error handling (network, timeout, auth)
3. Check robot state animations match response timing
4. Verify TTS/speak works with real response content

### Phase 5: Reporting
1. Document all changes
2. List deprecated mock code
3. Provide deployment checklist
4. Create runbook for troubleshooting

---

## API Authentication & Authorization

**All endpoints require:**
- `Authorization: Bearer <JWT>`
- Role check (typically ADMIN, MANAGEMENT, PRODUCTION, QUALITY, DESIGN, PLANNING roles)

**Frontend API Interceptor:**
- Already implemented in `mitra-frontend/src/services/api.ts`
- Automatically adds JWT from `localStorage.auth.token`
- Handles 401 refresh token flow

---

## Timeout Strategy

| Command | Min Timeout (ms) | Max Timeout (ms) | Rationale |
|---------|-----------------|-----------------|-----------|
| BOM Risk | 500 | 5000 | DB query + analysis engine |
| Drawing | 1000 | 8000 | File processing + feature extraction |
| Delay Risk | 1000 | 10000 | Multiple project queries + LLM |
| Root Cause | 2000 | 15000 | LLM inference (45s Ollama timeout) |
| Recommend | 2000 | 15000 | LLM inference + context enrichment |
| Quality Trends | 1500 | 12000 | Multi-table aggregation + LLM |
| Dispatch Risk | 1000 | 8000 | Dispatch query + AI analysis |
| Alerts | 500 | 5000 | Fast dashboard aggregate query |
| Maintenance | 1500 | 10000 | Machine data + trend analysis |
| Planning | 2000 | 12000 | Complex conflict resolution |

**Global Fallback:** 30s after which command is marked `failed` and robot state → `warning`

---

## Error Handling Matrix

| HTTP Status | Robot State | UI Toast | Retry Option |
|------------|-----------|---------|--------------|
| 401 Unauthorized | `warning` | "Session expired. Please log in." | Yes (redirect login) |
| 403 Forbidden | `warning` | "Insufficient permissions for this analysis." | No |
| 404 Not Found | `warning` | "Data not found. Check project/order exists." | No |
| 500 Server Error | `warning` | "Backend error. Try again later." | Yes (exponential backoff) |
| Timeout | `warning` | "Analysis took too long. Try again." | Yes |
| Network Error | `warning` | "Connection lost. Check internet." | Yes |

---

## Success Metrics

- [ ] All 10 commands return real data within timeout windows
- [ ] No console errors for successful commands
- [ ] Robot animations match command category (search/think/present as appropriate)
- [ ] TTS speaks real response content (not "Loading...")
- [ ] Error handling prevents app crashes
- [ ] API rate limiting respected (30 msgs/min for chat)
- [ ] Tenant isolation verified (no data leakage cross-tenant)

---

## Files to Modify

1. **Create:** `mitra-frontend/src/services/aiCommandService.ts` (NEW, ~500 lines)
2. **Create:** `mitra-frontend/src/types/aiResponses.ts` (NEW, ~300 lines)
3. **Modify:** `mitra-frontend/src/context/AIWorkspaceContext.tsx` (update `runAction`)
4. **Modify:** `mitra-frontend/src/services/api.ts` (ensure auth interceptor)
5. **No changes needed:** Backend (APIs already exist and properly implemented)

---

## Deployment Checklist

- [ ] .env has `VITE_API_BASE_URL` correctly set
- [ ] JWT is properly stored in localStorage
- [ ] Backend AI module enabled (AI_ENABLED=true, OLLAMA_URL configured)
- [ ] All 10 endpoints are deployed and responding
- [ ] Rate limiting is not overly restrictive for testing
- [ ] Error logs are being collected for troubleshooting
- [ ] Load testing passed (concurrent AI command requests)

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| LLM timeout (Ollama down) | HIGH | Fallback to structured data display; monitor Ollama health |
| Network latency | MEDIUM | Increase timeout; add retry logic with exponential backoff |
| Rate limiting hit | MEDIUM | Implement queue; show "too many requests" message gracefully |
| Auth token expired | LOW | Automatic refresh via interceptor |
| UI freezing during long LLM call | MEDIUM | Show indeterminate progress bar; don't block UI thread |

---

## Next Steps

1. ✅ Complete discovery (this document)
2. → Implement `aiCommandService.ts`
3. → Refactor `AIWorkspaceContext.tsx`
4. → Create response DTOs
5. → Manual testing (all 10 commands)
6. → Create final implementation report
