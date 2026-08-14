# End-to-End Validation Plan
## AI Workspace Live Data Integration

**Objective:** Verify all 10 commands produce real backend calls with real data (not generic LLM prose)
**Method:** DevTools Network tab + Console + Dashboard comparison
**Validation Criteria:** Status 200, no CORS/401/500, responses match backend data

---

## Pre-Flight Checklist

- [ ] Backend running on `localhost:3001`
- [ ] PostgreSQL healthy with seed data
- [ ] Frontend running on `localhost:5173`
- [ ] DevTools open (F12)
- [ ] Network tab recording
- [ ] Admin user logged in
- [ ] Console clear (no pre-existing errors)

---

## Command 1: Analyze BOM Risk

### Setup
- Navigate to Projects page
- Select any active project
- Open DevTools → Network tab
- Click "Analyze BOM Risk" command in AI Workspace

### Verification Checklist

- [ ] **Network Call:**
  - [ ] Endpoint: `POST /api/bom-analysis/analyze`
  - [ ] Status: **200**
  - [ ] No CORS errors
  - [ ] No 401 errors
  - [ ] No 500 errors
  - [ ] Response time: < 5000ms
  - [ ] Single call only (no retries)

- [ ] **Response Content:**
  - [ ] Contains `complexityScore` (number)
  - [ ] Contains `riskAreas[]` (array of specific risk items)
  - [ ] Not generic prose like "I don't have access"
  - [ ] Specific to selected project

- [ ] **Robot Animation:**
  - [ ] Transitions: idle → presenting → success/warning → idle
  - [ ] Not stuck on presenting
  - [ ] Updates within 200ms of API response

- [ ] **TTS Playback:**
  - [ ] Robot speaks the actual analysis result
  - [ ] Not "Loading..." or generic text
  - [ ] Includes specific project data (e.g., "3 high-risk areas found")

- [ ] **UI:**
  - [ ] Never freezes
  - [ ] Result panel displays summary
  - [ ] No white-screen or error state

---

## Command 2: Review Drawing

### Setup
- Navigate to Projects page
- Select project with drawings
- Open DevTools → Network tab
- Click "Review Drawing" command

### Verification Checklist

- [ ] **Network Call:**
  - [ ] Endpoint: `POST /api/drawing-analysis/upload`
  - [ ] Status: **200**
  - [ ] No CORS errors
  - [ ] No 401 errors
  - [ ] Response time: < 8000ms
  - [ ] Single call only

- [ ] **Response Content:**
  - [ ] Contains `partComplexity` (enum: simple/medium/complex)
  - [ ] Contains `suggestedMachiningTime` (number)
  - [ ] Contains `toleranceRisks[]` (specific to drawing)
  - [ ] `releaseApproved` is boolean (true/false)
  - [ ] Not generic advice

- [ ] **Backend Data:**
  - [ ] Machining time matches drawing complexity
  - [ ] Risk areas are specific to part geometry
  - [ ] Numbers are reasonable (not 0 or extreme)

- [ ] **Robot Animation:** ✓ Same as Command 1

- [ ] **TTS Playback:** ✓ Speaks actual values (e.g., "12.5 hours recommended")

---

## Command 3: Predict Delay Risks

### Setup
- Navigate to Dashboard or Projects
- Open DevTools → Network tab
- Click "Predict Delay Risks" command

### Verification Checklist

- [ ] **Network Calls:**
  - [ ] Call 1: `POST /api/ai/chat` with PROJECTS intent
  - [ ] Status: **200** on all calls
  - [ ] No CORS/401/500 errors
  - [ ] Response time: < 10000ms
  - [ ] Single call only (no retries)

- [ ] **Response Content:**
  - [ ] Contains `topBlockers[]` (specific issues)
  - [ ] Contains `totalActiveProjects` (number from database)
  - [ ] Contains `projectsAtRisk` (number from database)
  - [ ] Contains detailed analysis with project names
  - [ ] Not generic like "Projects can be delayed..."

- [ ] **Backend Data Validation:**
  - [ ] `totalActiveProjects` matches Projects page count
  - [ ] Blocked projects exist in database
  - [ ] Blockers are real (dependencies, resource conflicts)

- [ ] **Robot & TTS:** ✓ Animate and speak real data

---

## Command 4: Find Root Causes

### Setup
- Navigate to Quality or Manufacturing
- Select incident/defect
- Open DevTools → Network tab
- Click "Find Root Cause" command

### Verification Checklist

- [ ] **Network Call:**
  - [ ] Endpoint: `POST /api/ai/analyze` (**CRITICAL - user emphasized this**)
  - [ ] Status: **200**
  - [ ] No CORS/401/500/429 errors
  - [ ] Response time: < 15000ms
  - [ ] Single call only

- [ ] **Response Content:**
  - [ ] Contains `findings[]` (array of root causes)
  - [ ] Contains `entityType` (quality, dispatch, production, etc.)
  - [ ] Contains `entityId` matching selected incident
  - [ ] Each finding is specific to the incident
  - [ ] Not generic advice

- [ ] **Backend Data:**
  - [ ] Root causes traced to actual data (defect trends, resource issues, etc.)
  - [ ] Analysis references specific incidents/measurements
  - [ ] Findings are actionable (not vague)

- [ ] **Robot & TTS:** ✓ Specific to the incident being analyzed

---

## Command 5: Recommend Actions

### Setup
- (Continuation of Command 4 or new incident)
- Open DevTools → Network tab
- Click "Recommend Actions" command

### Verification Checklist

- [ ] **Network Call:**
  - [ ] Endpoint: `POST /api/ai/chat` with appropriate intent
  - [ ] Status: **200**
  - [ ] No CORS/401/500 errors
  - [ ] Response time: < 10000ms

- [ ] **Response Content:**
  - [ ] Contains `recommendations[]` (actionable items)
  - [ ] Each recommendation has `priority` (URGENT/HIGH/MEDIUM/LOW)
  - [ ] Recommendations are specific to context
  - [ ] Not boilerplate like "Follow procedures..."

- [ ] **Verify Against Backend:**
  - [ ] Recommendations match available resources
  - [ ] Priorities align with incident severity
  - [ ] Actions are feasible given project state

- [ ] **Robot & TTS:** ✓ Speak specific actions with priorities

---

## Command 6: Analyze Quality Trends

### Setup
- Navigate to Quality Analytics page
- Open DevTools → Network tab
- Click "Analyze Quality Trends" command

### Verification Checklist

- [ ] **Network Calls:**
  - [ ] Endpoint: `POST /api/ai/chat` with TRIALS intent
  - [ ] Status: **200**
  - [ ] No errors
  - [ ] Response time: < 10000ms

- [ ] **Response Content:**
  - [ ] Contains `overallTrend` (improving/stable/declining)
  - [ ] Contains `defectCategories[]` (specific types from database)
  - [ ] Contains `risingCategories[]` (if any)
  - [ ] Numbers match Quality Analytics page

- [ ] **Compare with Dashboard:**
  - [ ] Trend direction matches Dashboard charts
  - [ ] Defect counts match (±5% variance acceptable)
  - [ ] Time period is correct (today/week/month)

- [ ] **LLM Response:**
  - [ ] Analysis is data-driven (specific numbers)
  - [ ] Not generic like "Quality is important..."
  - [ ] Identifies specific problem areas

- [ ] **Robot & TTS:** ✓ Speak actual trend (improving/stable/declining with numbers)

---

## Command 7: Check Dispatch Risks

### Setup
- Navigate to Dispatch page
- Open DevTools → Network tab
- Click "Check Dispatch Risks" command

### Verification Checklist

- [ ] **Network Calls:**
  - [ ] Call 1: `GET /api/dispatch` (fetch dispatch orders)
  - [ ] Call 2: `POST /api/ai/chat` (analyze risks)
  - [ ] All Status: **200**
  - [ ] No CORS/401/500 errors
  - [ ] Total response time: < 10000ms
  - [ ] No retry calls

- [ ] **Response Content:**
  - [ ] Contains `totalDispatchOrders` (from backend count)
  - [ ] Contains `ordersAtRisk` (subset of total)
  - [ ] Contains `riskyOrders[]` with specific order numbers
  - [ ] Not "there are no risks" if data exists

- [ ] **Compare with Dispatch Page:**
  - [ ] `totalDispatchOrders` = visible order count on page
  - [ ] `riskyOrders` correspond to real late/delayed orders
  - [ ] Risk factors are actual (deadline near, resource unavailable, etc.)

- [ ] **Robot & TTS:** ✓ Speak specific order numbers and risk status

---

## Command 8: Summarize Alerts

### Setup
- Navigate to Dashboard (Machine Status)
- Open DevTools → Network tab
- Click "Summarize Alerts" command

### Verification Checklist

- [ ] **Network Call:**
  - [ ] Endpoint: `GET /api/machine-status/summary/dashboard`
  - [ ] Status: **200**
  - [ ] No errors
  - [ ] Response time: < 5000ms
  - [ ] Single call only

- [ ] **Response Content:**
  - [ ] Contains `totalAlerts` (count > 0 if alerts exist)
  - [ ] Contains `alerts[]` with specific machines
  - [ ] Alert severities match Dashboard display
  - [ ] Not generic summary

- [ ] **Dashboard Sync:**
  - [ ] Alert count matches Dashboard widget
  - [ ] Machine names match (spell-for-spell)
  - [ ] Severity levels match colors (red=critical, orange=warning, etc.)
  - [ ] Timestamp of alerts is current

- [ ] **Robot & TTS:** ✓ Speak actual alert counts by severity (e.g., "3 critical, 2 warning")

---

## Command 9: Forecast Maintenance

### Setup
- Navigate to Manufacturing/Machine Status page
- Open DevTools → Network tab
- Click "Forecast Maintenance" command

### Verification Checklist

- [ ] **Network Calls:**
  - [ ] Call 1: `GET /api/machine-status` (fetch machine data)
  - [ ] Call 2: `POST /api/ai/chat` (generate forecast)
  - [ ] All Status: **200**
  - [ ] No errors
  - [ ] Response time: < 10000ms

- [ ] **Response Content:**
  - [ ] Contains `machinesRequiringMaintenance` (count)
  - [ ] Contains `forecast[]` with specific machine IDs
  - [ ] Each forecast has `scheduledDate`, `estimatedDowntime`, `priority`
  - [ ] Not generic like "Regular maintenance is important..."

- [ ] **Forecast Validation:**
  - [ ] Machines needing maintenance have high runtime hours (from database)
  - [ ] Scheduled dates are reasonable (within 14 days)
  - [ ] Priorities align with machine criticality
  - [ ] Not forecasting maintenance for recently-serviced machines

- [ ] **Robot & TTS:** ✓ Speak machine names and scheduled dates (e.g., "Lathe 3 needs service on June 30th")

---

## Command 10: Review Production Plan

### Setup
- Navigate to Planning page
- Select active process plan
- Open DevTools → Network tab
- Click "Review Production Plan" command

### Verification Checklist

- [ ] **Network Calls:**
  - [ ] Call 1: `GET /api/planning/process-plans/:id`
  - [ ] Call 2: `POST /api/ai/chat` or other AI endpoint (analysis)
  - [ ] All Status: **200**
  - [ ] No errors
  - [ ] Response time: < 15000ms

- [ ] **Response Content:**
  - [ ] Contains `planId` matching selected plan
  - [ ] Contains `projectId` from database
  - [ ] Contains `estimatedHours` (realistic number)
  - [ ] Contains `conflicts[]` if any exist
  - [ ] Contains `gaps[]` (resource, tooling, etc.)
  - [ ] Not generic

- [ ] **Plan Validation:**
  - [ ] Conflicts are real (overlapping resources, missing tools, etc.)
  - [ ] Gaps correspond to actual project shortfalls
  - [ ] Estimated hours match complexity
  - [ ] Recommendations are specific to plan

- [ ] **Compare with Planning Page:**
  - [ ] Plan duration matches page display
  - [ ] Resource allocations are accurate
  - [ ] Any noted conflicts appear in both places

- [ ] **Robot & TTS:** ✓ Speak plan summary with specific conflicts/gaps

---

## Network Tab Summary

After all 10 commands, the Network tab should show:

```
✅ 10 successful API calls (POST/GET)
✅ All Status 200
✅ No CORS errors
✅ No 401 Unauthorized
✅ No 500 Server errors
✅ No 429 Rate limit errors
✅ No retry calls (single attempt per command)
✅ Response times: 500ms - 15000ms (within timeout limits)
✅ All responses contain real data (project IDs, machine names, numbers)
❌ ZERO generic LLM prose ("I don't have access", "Contact administrator", etc.)
```

---

## Console Errors Check

After all 10 commands:

```
✅ No TypeScript errors
✅ No React warnings about hooks/dependencies
✅ No network CORS messages
✅ No auth/token errors
✅ No "Cannot read property" undefined errors
✅ No import/module errors
```

---

## Data Consistency Matrix

| Dashboard Data | AI Response | Match? | Notes |
|---|---|---|---|
| Total Active Projects | `totalActiveProjects` | ✓/✗ | Should be exact |
| Total Dispatch Orders | `totalDispatchOrders` | ✓/✗ | Should be exact |
| Machine Count (Online) | Machine forecast list | ✓/✗ | Count should match |
| Quality Alert Count | Alert summary | ✓/✗ | Should be within 1 |
| Delayed Projects | Delay risk blockers | ✓/✗ | Specific projects listed |
| Maintenance Due | Forecast dates | ✓/✗ | Machines match |

---

## Pass/Fail Criteria

### PASS if:
- ✅ All 10 commands execute successfully (Status 200)
- ✅ No CORS/401/500/429 errors on any command
- ✅ All responses contain backend data (not generic prose)
- ✅ Dashboard data matches AI responses (within acceptable variance)
- ✅ Robot animates correctly (presenting → success/warning → idle)
- ✅ TTS speaks real data (not "Loading...")
- ✅ UI never freezes
- ✅ Console shows zero errors
- ✅ Single API call per command (no retries)

### FAIL if:
- ❌ Any command returns Status 401/403/500/429
- ❌ Any response contains generic LLM prose
- ❌ Dashboard data doesn't match AI responses
- ❌ CORS errors present
- ❌ Robot stuck on presenting state
- ❌ TTS plays generic text
- ❌ UI freezes during execution
- ❌ Console shows auth/type errors
- ❌ Multiple API calls per command (indicates retries/failures)

---

## Success = Stabilization Phase Complete

Once all 10 commands PASS this validation:

1. ✅ Tag release candidate: `v3.2-rc1`
2. ✅ Create feature branch: `feature/ai-workspace-live`
3. ✅ Merge to main
4. ✅ Update changelog with AI integration details
5. ✅ Deploy to staging for final UAT
6. ✅ Monitor logs for 24 hours
7. ✅ Deploy to production

---

## Timeline

- **Validation Phase:** 1-2 hours (10 commands × ~10 min each + documentation)
- **Issue Resolution:** 1-4 hours (if any failures found)
- **Stabilization:** 1-2 days (major pages review if issues found)
- **Release Readiness:** When all above passes + no new issues for 24 hours

---

## Next Action

1. Start frontend dev server: `npm run dev`
2. Open DevTools (F12)
3. Navigate to Dashboard
4. Log in with admin user
5. Begin Command 1 validation
6. Record all results in this checklist
7. Document any failures for immediate fix

