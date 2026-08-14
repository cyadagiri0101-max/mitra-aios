# Phase 1 E2E Testing - Quick Start Guide
## DevTools Validation of All 10 AI Commands

**Goal:** Prove each command produces a real API call with real data (Status 200, not generic LLM prose)
**Time:** ~10 minutes per command (100-120 minutes total for all 10)
**Difficulty:** Low (mostly clicking and observing)

---

## Pre-Flight: Setup (5 minutes)

### 1. Start Backend
```bash
cd c:\Users\Srikanth\Desktop\Mitra3.0\mitra-backend
npm run start
```
Wait for: `[Nest] 12345 - 06/27/2026, 10:00:00 AM     LOG [NestFactory] Application successfully started +1234ms`

### 2. Start Frontend
```bash
cd c:\Users\Srikanth\Desktop\Mitra3.0\mitra-frontend
npm run dev
```
Wait for: `VITE v5.4.21 ready in X ms → Local: http://localhost:5173/`

### 3. Open Browser & Login
- Open http://localhost:5173
- Login with admin user
- Verify you're on Dashboard

### 4. Open DevTools
- Press **F12**
- Click **Network** tab
- ✅ DevTools is recording network calls

### 5. Verify Admin Permissions
- Click menu → "AI Workspace" (should be visible)
- If not visible: Check admin role permissions

---

## Testing Pattern: Repeat for Each of 10 Commands

### Step 1: Clear Network Tab
```
Network tab → Trash icon → Clear all requests
```

### Step 2: Set Filters (Optional but helpful)
```
Network tab → Filter box → Type: "api"
```
This hides static assets, shows only API calls.

### Step 3: Execute Command
- Click the AI command button in AI Workspace
- Watch Network tab as call executes

### Step 4: Verify Network Call

**What to look for:**
| Field | Expected | ✓ or ✗ |
|-------|----------|--------|
| **Method** | POST or GET | _____ |
| **Endpoint** | `/api/...` | _____ |
| **Status** | **200** (green) | _____ |
| **Response Time** | < 8000ms | _____ |
| **CORS** | No errors | _____ |

**Red flags:**
- ❌ Status 401 = Not authenticated
- ❌ Status 403 = Permission denied
- ❌ Status 500 = Backend error
- ❌ Status 429 = Rate limited
- ❌ Multiple calls = Retry happening

### Step 5: Inspect Response

**In Network tab:**
1. Click the API call row
2. Click **Response** tab
3. Verify response contains real data:

| Command | Look For | Example | ✓/✗ |
|---------|----------|---------|-----|
| BOM Risk | `complexityScore`, `riskAreas` | `"complexityScore": 7.3` | _____ |
| Drawing | `partComplexity`, `machiningTime` | `"suggestedMachiningTime": 12.5` | _____ |
| Delay Risk | `topBlockers`, `projectsAtRisk` | `"projectsAtRisk": 3` | _____ |
| Root Cause | `findings`, `entityId` | `"findings": ["part delay", ...]` | _____ |
| Recommend | `recommendations`, `priority` | `"priority": "URGENT"` | _____ |
| Quality | `overallTrend`, `defectCategories` | `"overallTrend": "declining"` | _____ |
| Dispatch | `ordersAtRisk`, `riskyOrders` | `"ordersAtRisk": 2` | _____ |
| Alerts | `totalAlerts`, `alerts[]` | `"totalAlerts": 3` | _____ |
| Maintenance | `forecast[]`, `scheduledDate` | `"scheduledDate": "2026-06-30"` | _____ |
| Planning | `conflicts`, `gaps` | `"conflicts": ["resource"]` | _____ |

**Bad response indicators:**
- ❌ `"error": "..."`
- ❌ Generic text: "I don't have access"
- ❌ Empty arrays: `"findings": []` when data should exist
- ❌ Null/undefined values

### Step 6: Check Console
- Click **Console** tab
- Look for errors (red X symbols)
- **Should see:** Nothing (clean console)
- **If you see:** Auth errors, type errors, network errors → **FAIL**

### Step 7: Verify UI Behavior
- [ ] Robot animated (presenting → success/warning → idle)
- [ ] Response appeared in chat panel
- [ ] TTS played (if enabled)
- [ ] No loading spinner stuck
- [ ] No white screen

### Step 8: Record Results

| Command | Endpoint | Status | Data Present | Errors | Pass? |
|---------|----------|--------|--------------|--------|-------|
| 1. BOM Risk | POST /api/bom-analysis/analyze | 200 | ✓/✗ | _____ | ✓/✗ |
| 2. Drawing | POST /api/drawing-analysis/upload | 200 | ✓/✗ | _____ | ✓/✗ |
| 3. Delay Risk | POST /api/ai/chat | 200 | ✓/✗ | _____ | ✓/✗ |
| 4. Root Cause | POST /api/ai/analyze | 200 | ✓/✗ | _____ | ✓/✗ |
| 5. Recommend | POST /api/ai/chat | 200 | ✓/✗ | _____ | ✓/✗ |
| 6. Quality | POST /api/ai/chat | 200 | ✓/✗ | _____ | ✓/✗ |
| 7. Dispatch | GET /api/dispatch | 200 | ✓/✗ | _____ | ✓/✗ |
| 8. Alerts | GET /api/machine-status/summary/dashboard | 200 | ✓/✗ | _____ | ✓/✗ |
| 9. Maintenance | GET /api/machine-status | 200 | ✓/✗ | _____ | ✓/✗ |
| 10. Planning | GET /api/planning/process-plans/:id | 200 | ✓/✗ | _____ | ✓/✗ |

---

## Critical Validations (After All 10 Commands)

### 1. Network Tab Summary
```
Expected:
- 10 requests total
- All Status 200
- All endpoints start with /api/
- Zero red (error) entries
- Zero yellow (warning) entries
```

### 2. Data Consistency Check

**Compare AI responses with Dashboard:**

```
AI Command Response:    |    Dashboard Page:
"3 active projects"     |    Projects page shows 3 ✓/✗
"5 dispatch at risk"    |    Dispatch shows 5 late ✓/✗
"Machine A offline"     |    Manufacturing shows A offline ✓/✗
```

### 3. LLM Response Quality

**Check each AI response for:**

| Type | Good Example | Bad Example |
|------|--------------|------------|
| **Specific Data** | "P-2024-001 blocked by part arrival June 28" | "Projects can experience delays" |
| **Database Info** | "Initiated by John Smith on 2026-06-15" | "I don't have access to that" |
| **Numbers** | "3 high-risk areas found" | "Risks are important to monitor" |
| **Action Items** | "Schedule tool maintenance by June 30" | "Contact administrator" |

**Score each response:**
- ✅ Specific to your data = PASS
- ⚠️ Generic but not wrong = MEDIUM
- ❌ Generic or "I don't know" = FAIL

---

## Failure Troubleshooting

### If Status 401 (Not Authenticated)
```
Likely cause: JWT token expired or not set
Fix: Log out → Log back in
```

### If Status 403 (Permission Denied)
```
Likely cause: User role doesn't have AI commands
Fix: Verify user is admin
```

### If Status 500 (Backend Error)
```
Likely cause: Backend crashed or database down
Fix: Check backend terminal for error, restart if needed
```

### If Response is Generic Prose
```
Likely cause: Backend not consuming database in LLM prompt
Fix: Check backend AI module logic, update prompt to include data context
```

### If No API Call Visible in Network Tab
```
Likely cause: API call might be cached, or code path didn't reach API
Fix: Hard refresh (Ctrl+Shift+R), clear cache, check console for errors
```

### If Console Shows Auth Error
```
Example: "Cannot read property 'tenantId' of null"
Likely cause: JWT not properly decoded
Fix: Check token is in Authorization header (Network → Request Headers)
```

---

## Quick Sanity Check (30 seconds)

After all 10 commands, run this quick check:

```
1. DevTools Network tab → Verify 10 rows visible
2. Check Status column → All should show "200"
3. Check Type column → Should be "xhr" (XMLHttpRequest) or "fetch"
4. Check Size column → Should not be "0" (means response had content)
5. DevTools Console → Should be empty (no errors)
6. Close DevTools → Try clicking a command again
7. UI should remain responsive (no freeze)
```

**If all above pass:** ✅ Phase 1 PASSES - Ready for Phase 2

**If any above fails:** ✗ Phase 1 FAILS - Document issue and troubleshoot

---

## Expected Timing

| Command | Expected API Time | UI Delay (Robot + TTS) | Total |
|---------|---|---|---|
| 1. BOM | 500-2000ms | +1000ms | ~2-3s |
| 2. Drawing | 1000-3000ms | +1000ms | ~3-4s |
| 3. Delay | 1000-5000ms | +1000ms | ~3-6s |
| 4. Root Cause | 2000-8000ms | +1000ms | ~4-9s |
| 5. Recommend | 1000-5000ms | +1000ms | ~3-6s |
| 6. Quality | 1000-5000ms | +1000ms | ~3-6s |
| 7. Dispatch | 1000-3000ms | +1000ms | ~3-4s |
| 8. Alerts | 500-2000ms | +1000ms | ~2-3s |
| 9. Maintenance | 1000-3000ms | +1000ms | ~3-4s |
| 10. Planning | 2000-8000ms | +1000ms | ~4-9s |

**Should NOT take:**
- ❌ > 15 seconds (would timeout)
- ❌ Same time every time (fake delay)
- ❌ Instantly (would mean no actual API call)

---

## Pass/Fail Rubric

### PASS (All Green)
```
✅ All 10 commands return Status 200
✅ Zero CORS errors
✅ Zero 401/403/500 errors
✅ All responses contain real data (not generic)
✅ Dashboard data matches AI responses
✅ Console shows zero errors
✅ No UI freezes
✅ Single API call per command (no retries)
```

### FAIL (Any Red)
```
❌ Any command returns error status (401/403/500/429)
❌ Any response is generic prose
❌ Dashboard and AI data don't match
❌ Console shows auth/type errors
❌ UI freezes during execution
❌ Multiple API calls per command (retries happening)
❌ Response is empty or null
```

---

## Next Steps After Phase 1

**If PASS:**
→ Proceed to Phase 2 (Major page review)
→ Continue to Phase 3-6 (Staging, RC tag, production merge)

**If FAIL:**
→ Document the issue
→ Post issue details + network screenshot
→ Fix backend/frontend code
→ Re-run Phase 1

---

## Reporting Results

When you finish Phase 1, share:

1. **Screenshot of Network tab**
   - Shows all 10 API calls with status codes
   - Timestamp to verify today's run

2. **Console log screenshot**
   - Should show empty or only warnings
   - No red errors

3. **One example response**
   - Screenshot of Response tab for one command
   - Shows data is real (not generic)

4. **Test results table**
   - 10 rows (one per command)
   - Columns: Command, Status, Data Present, Errors, Pass/Fail

5. **Overall assessment**
   - "10/10 PASS" or "8/10 PASS, 2 FAIL"
   - List any failures

---

## Start Now

1. Terminal 1: Start backend
2. Terminal 2: Start frontend
3. Browser: Login
4. DevTools: Network tab open
5. Click first AI command: "Analyze BOM Risk"
6. Watch Network tab → Verify Status 200
7. Check Response → Verify real data
8. Repeat for commands 2-10
9. Document results

**Estimated Time:** 100-120 minutes for all 10 commands (10 min each)

**When to reach out:** If any command doesn't return Status 200, or response contains generic prose

Go! 🚀

