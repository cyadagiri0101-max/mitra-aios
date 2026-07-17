# Stabilization Roadmap
## From "Appears Production-Ready" to "Production Validated"

**Current Status:** ✅ Structural validation complete (endpoints exist, builds pass)  
**Next Phase:** 🔄 Behavioral validation (runtime with real data)  
**Final Phase:** 📦 Release candidate (tagged and staging-tested)

---

## Critical Distinction

### ❌ What the Code Audit Verified

- Endpoints exist in backend controllers
- HTTP methods match specifications
- Import paths correct
- TypeScript compilation succeeds
- No mock data in code
- No hardcoded URLs
- Auth mechanisms present

**This answers:** "Is the implementation structurally sound?"  
**Result:** ✅ YES

---

### ⚠️ What the Code Audit Did NOT Verify

- API calls actually execute at runtime
- Backend returns real data (not errors)
- AI responses contain database information (not generic prose)
- Response data matches Dashboard/UI state
- Robot animations work during live async operations
- TTS plays actual content (not placeholders)
- UI remains responsive under real network conditions
- All 10 commands work together without race conditions

**This answers:** "Does the system behave correctly in production?"  
**Result:** ❓ UNKNOWN - needs testing

---

## Phase 1: Behavioral Validation (E2E Testing)
**Duration:** 1-2 hours  
**Owner:** You (with DevTools)  
**Goal:** Prove all 10 commands work with real data

### Activities

1. **Run All 10 Commands Against Live Backend**
   - Navigate DevTools → Network tab
   - Execute each command
   - Verify Status 200 on every call
   - Verify no CORS/401/500/429 errors
   - Document response times

2. **Validate Response Data**
   - BOM Risk: Contains actual project risk scores
   - Drawing: Real machining times (not generic)
   - Delay Risk: Specific blocked projects (not "delays happen")
   - Root Cause: References actual incidents
   - Quality Trends: Numbers match Analytics page
   - Dispatch Risks: Specific order numbers
   - Alerts: Matches Dashboard machine list
   - Maintenance: Scheduled dates are real
   - Plans: Specific conflict details

3. **Verify Data Consistency**
   - AI response: "3 active projects" = Dashboard: 3 projects
   - AI response: "5 dispatch orders at risk" = Dispatch page: 5 late orders
   - AI response: "Machine A offline" = Manufacturing dashboard: Machine A offline
   - AI response: "2 CAPA items" = Quality page: 2 CAPA items

4. **Test AI Response Quality**
   - **BAD:** "Delays can impact schedules" (generic prose)
   - **GOOD:** "Project P-2024-001 blocked by part arrival June 28" (specific data)
   - **BAD:** "I don't have access to that information" (auth/permission fail)
   - **GOOD:** "Last CAPA initiated by John Smith on 2026-06-15" (database content)

5. **Monitor for Errors**
   - Console should show: ✅ ZERO errors after all 10 commands
   - Network tab should show: ✅ ZERO retries (single API call per command)
   - Robot animation should show: ✅ Proper state transitions (never stuck)
   - TTS should play: ✅ Real response content (not "Loading...")

### Success Criteria

**PASS** if:
- ✅ All 10 commands return Status 200
- ✅ All responses contain real backend data
- ✅ Dashboard data matches AI responses
- ✅ No generic LLM prose detected
- ✅ Console error count: 0
- ✅ Network retries: 0
- ✅ UI responsiveness: No freezing

**FAIL** if:
- ❌ Any command returns 401/403/500/429
- ❌ Any response contains generic prose only
- ❌ Dashboard and AI response data don't match
- ❌ Console shows auth/type errors
- ❌ Any command requires retries
- ❌ UI freezes during execution

---

## Phase 2: Major Page Review
**Duration:** 1-2 hours (if Phase 1 passes)  
**Owner:** You  
**Goal:** Verify system stability with live data across all key pages

### Review Pages

- [ ] **Dashboard** - All widgets populate with real data
  - [ ] Machine status accurate
  - [ ] Alert counts match alerts table
  - [ ] KPIs calculate correctly
  
- [ ] **Analytics** - Charts match database state
  - [ ] Quality trends chart matches AI analysis
  - [ ] Dispatch analytics match dispatch risks
  - [ ] Timeline charts show real data

- [ ] **Manufacturing** - Machine status live
  - [ ] Machine list shows real machines
  - [ ] Status indicators (online/offline) accurate
  - [ ] Utilization percentages realistic

- [ ] **Projects** - Project details load
  - [ ] Project count matches AI `totalActiveProjects`
  - [ ] Delayed projects identifiable
  - [ ] Dependencies show real blocking projects

- [ ] **Quality** - CAPA and defect tracking
  - [ ] Defect list matches AI analysis categories
  - [ ] CAPA items show real data (initiator, date, status)
  - [ ] Trend charts consistent with AI forecast

- [ ] **Dispatch** - Dispatch orders
  - [ ] Order count matches AI `totalDispatchOrders`
  - [ ] Late orders identifiable (matches risk analysis)
  - [ ] Status updates accurate

- [ ] **Planning** - Process plans
  - [ ] Plan details load correctly
  - [ ] Resource allocations show real data
  - [ ] Timeline estimates realistic

### Common Issues to Check

- [ ] No "Loading..." spinners stuck for >30s
- [ ] All data loads within 5s per page
- [ ] Navigation between pages works smoothly
- [ ] Back/forward browser buttons work
- [ ] Filters apply correctly
- [ ] Export functions work (if applicable)
- [ ] No console errors on any page
- [ ] Mobile/responsive layout acceptable

---

## Phase 3: Issue Resolution
**Duration:** 1-4 hours (if Phase 1-2 find issues)  
**Owner:** You + Engineering  
**Goal:** Fix any behavioral mismatches

### Issue Categories

| Category | Example | Priority |
|----------|---------|----------|
| **Data Mismatch** | AI says 5 projects, Dashboard shows 3 | 🔴 CRITICAL |
| **API Error** | 401 on 2nd command attempt | 🔴 CRITICAL |
| **Generic Prose** | AI: "Contact your team lead" when data exists | 🟠 HIGH |
| **Performance** | Command takes 25s (timeout is 15s) | 🟠 HIGH |
| **UI Freeze** | Screen unresponsive during AI call | 🟠 HIGH |
| **Console Errors** | TypeScript undefined error | 🟡 MEDIUM |
| **Animation Glitch** | Robot stuck on presenting state | 🟡 MEDIUM |
| **TTS Issue** | Speaks "Loading..." instead of real response | 🟡 MEDIUM |

### Resolution Process

1. **Document Issue**
   - Command affected
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots/network trace

2. **Identify Root Cause**
   - Backend API logic (LLM not consuming database)
   - Frontend error handling (null coalescing missing)
   - Response parsing (DTO mismatch)
   - Authentication (token refresh timing)

3. **Fix and Retest**
   - Single issue at a time
   - Test in isolation first
   - Re-run affected command
   - Re-run all 10 commands to check for regression

---

## Phase 4: Release Candidate Tagging
**Duration:** 15 minutes (after Phase 1-3 pass)  
**Owner:** You  
**Goal:** Create versioned release for staging deployment

### Steps

```bash
# 1. Ensure all changes committed
git status  # Should show "nothing to commit"

# 2. Create tag
git tag -a v3.2-rc1 -m "AI Workspace live backend integration - E2E validated"

# 3. Create feature branch (if not already done)
git checkout -b feature/ai-workspace-live
git push origin feature/ai-workspace-live

# 4. Push tag
git push origin v3.2-rc1

# 5. Update CHANGELOG
# Add entry: "v3.2-rc1: AI Workspace connected to live backend APIs"
```

### Tag Should Include

- ✅ All 10 commands verified working
- ✅ No 401/403/500 errors
- ✅ All responses contain real data
- ✅ Dashboard sync verified
- ✅ No console errors
- ✅ E2E validation report included

---

## Phase 5: Staging Deployment & UAT
**Duration:** 24 hours  
**Owner:** DevOps + QA  
**Goal:** Final validation before production merge

### Activities

- [ ] Deploy v3.2-rc1 to staging environment
- [ ] Smoke test: All major pages load
- [ ] Run 10 AI commands against staging data
- [ ] Compare production requirements:
  - Rate limiting enforced (30 msgs/min)
  - Tenant isolation verified
  - No cross-tenant data leakage
  - Error handling works for edge cases
- [ ] Monitor logs for 24 hours:
  - No panic/error logs
  - No orphaned database connections
  - Ollama/LLM responding normally
  - Performance acceptable

### Green Light Criteria

- ✅ All 10 commands work on staging
- ✅ No data leakage between tenants
- ✅ Zero errors in logs over 24 hours
- ✅ Response times acceptable (p95 < 8s)
- ✅ No rate limit false positives
- ✅ Rollback procedure tested

---

## Phase 6: Production Merge
**Duration:** 30 minutes  
**Owner:** You (with DevOps standby)  
**Goal:** Merge feature branch to main and deploy

### Steps

```bash
# 1. Final sanity check
npm run build  # Both backend and frontend
npm run lint   # If applicable

# 2. Switch to main
git checkout main
git pull origin main

# 3. Merge feature branch
git merge feature/ai-workspace-live

# 4. Push to main
git push origin main

# 5. Deploy to production
# (Your deployment process - Docker, K8s, etc.)

# 6. Monitor production
# - Log in and run all 10 commands
# - Check error logs
# - Monitor API performance
```

### Rollback Plan (if issues discovered in production)

```bash
# If critical issue discovered:
git revert <commit-hash>
git push origin main
# Redeploy previous version
```

---

## Timeline Summary

| Phase | Duration | Status | Blocker Check |
|-------|----------|--------|---------------|
| **1. E2E Validation** | 1-2h | Start here | Must pass before Phase 2 |
| **2. Major Page Review** | 1-2h | If Phase 1 ✅ | Must pass before Phase 3 |
| **3. Issue Resolution** | 1-4h | If issues found | Must pass before Phase 4 |
| **4. RC Tagging** | 15m | If Phase 1-3 ✅ | Can proceed immediately |
| **5. Staging UAT** | 24h | After tag | Must pass before Phase 6 |
| **6. Production Merge** | 30m | After UAT ✅ | Final go/no-go decision |
| **Total (Fastest Path)** | **26-30 hours** | | (If zero issues found) |
| **Total (With Issues)** | **40-48 hours** | | (Typical - 2-3 issues fixed) |

---

## Success Definition

You can merge to production main when:

✅ **Code Level**
- No TypeScript errors
- No console errors
- Proper error handling
- All endpoints exist
- Authentication working

✅ **Functional Level**
- All 10 commands return Status 200
- All responses contain real data (not generic prose)
- Dashboard data matches AI responses
- No CORS/401/500 errors

✅ **Operational Level**
- Commands execute within timeout (500ms - 15s per command)
- UI never freezes
- Robot animates correctly
- TTS plays real content
- Zero retries needed

✅ **Deployment Level**
- Tagged as v3.2-rc1
- Feature branch created
- Staging tested for 24h with zero errors
- Rollback plan documented

---

## Your Decision Point: NOW

**At this moment, you have:**
- ✅ Working infrastructure (PostgreSQL, backend, frontend)
- ✅ Structurally correct integration code
- ✅ Compilation successful
- ✅ All endpoints verified

**Before production merge, YOU need to:**
1. Run the 10 E2E tests with DevTools (Phase 1)
2. Compare AI responses with Dashboard (Phase 2)
3. Fix any behavioral issues (Phase 3)
4. Tag and stage test (Phase 4-5)
5. Then merge to main (Phase 6)

**Recommendation:** Start Phase 1 immediately. If it passes, you have a production-ready system in 26 hours. If issues found, they'll surface now (not in production).

The difference between "appears good" and "proven good" is Phase 1-2. Everything else follows naturally.

