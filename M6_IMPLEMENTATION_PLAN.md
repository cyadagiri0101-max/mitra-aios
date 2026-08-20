# MITRA M6 — REAL-TIME BI DASHBOARD & ANALYTICS GOVERNANCE
## MASTER IMPLEMENTATION + CERTIFICATION PROMPT

You are the primary implementation engineer for MITRA.

============================================================
0. NON-NEGOTIABLE BASELINE
============================================================

MITRA is currently at:

Release: v4.5.0
Milestone: M5
Branch: v3.3
HEAD: ca4f97d
Status: FORMALLY CERTIFIED

DO NOT restart MITRA.
DO NOT redesign M1–M5.
DO NOT modify certified business behavior without evidence.

M5 is the immutable functional baseline.

M6 objective:

    CERTIFY G11 — REAL-TIME BI DASHBOARD & ANALYTICS

The target release is:

    MITRA v4.6.0

Primary Golden Scenario:

    G11 — Real-time BI Dashboard

Current verified state:

    Implementation ≈ 86%
    Certified ≈ 78%

G11:

    Backend: approximately complete / real-data ready
    Frontend: integration gap
    Status: PARTIAL / UNBLOCKED

The central M6 problem is:

    REAL BACKEND AGGREGATES
             ↓
    REAL API CONTRACTS
             ↓
    PREMIUM DASHBOARD / ANALYTICS UI
             ↓
    DRILL-DOWN / TRACEABILITY
             ↓
    E2E VERIFICATION
             ↓
    CERTIFICATION

============================================================
1. GOVERNING PRINCIPLES
============================================================

Follow these rules throughout the entire milestone.

1. DO NOT invent business data.

2. DO NOT use mock/fake business KPI data in production UI.

3. DO NOT silently fall back to fabricated/static business data.

4. DO NOT redesign certified M1–M5 modules.

5. Prefer existing APIs and aggregate services.

6. Add backend endpoints only when an authoritative data source
   genuinely does not already exist.

7. Every KPI displayed to the user must have an identifiable,
   auditable backend data source.

8. Every KPI must be tenant-scoped.

9. Every protected endpoint must enforce permissions.

10. Tenant context must fail closed.

11. Preserve auditability and projectId traceability.

12. Do not fix historical baseline failures merely to make the
    test suite appear green.

13. Do not expand M6 into G12/G13/G14/G15.

14. Do not introduce AI writes.

15. Do not fabricate historical data for predictive analytics.

16. Do not modify certified functionality unless the change is
    required by an identified M6 defect or integration gap.

17. Code first, evidence always.

============================================================
2. IMPORTANT DOCUMENTATION CORRECTION
============================================================

During the M5 re-baseline audit, documentation contradictions
were discovered.

MITRA_GOLDEN_SCENARIOS.md contains stale claims that G12/G13 were
certified in M3.

Current code/evidence establishes:

    G11 = PARTIAL / UNBLOCKED
    G12 = PARTIAL
    G13 = PARTIAL
    G14 = PARTIAL
    G15 = PARTIAL / UNBLOCKED

DO NOT certify G12 or G13 during M6.

The following documentation corrections may be performed as a
parallel governance activity:

    MITRA_VISION_100_CURRENT_STATE.md
    MITRA_VISION_100_GAP_MATRIX.md
    MITRA_VISION_100_DEPENDENCY_GRAPH.md
    MITRA_GOLDEN_SCENARIOS.md

These documentation corrections must not modify production
business behavior.

============================================================
3. PHASE 0 — BASELINE RECONNAISSANCE
============================================================

Before changing anything, inspect the repository.

Run and record:

    git branch --show-current
    git status
    git log --oneline -10
    git show --stat HEAD
    git tag --list
    git show v4.5.0 --stat

Confirm:

    HEAD == v4.5.0
    commit == ca4f97d
    branch == v3.3

Do NOT begin implementation if the baseline unexpectedly differs.

Then inspect:

    MITRA_VISION_100_CURRENT_STATE.md
    MITRA_VISION_100_GAP_MATRIX.md
    MITRA_VISION_100_DEPENDENCY_GRAPH.md
    MITRA_GOLDEN_SCENARIOS.md
    M5_EVIDENCE_MATRIX.md
    ROADMAP.md
    PROJECT_CONSTITUTION.md
    TRACEABILITY_MODEL.md

Also inspect the current dashboard and analytics implementation.

Produce:

    M6_BASELINE_AUDIT.md

containing:

    - git baseline
    - existing M5 certification evidence
    - G11 current status
    - current dashboard architecture
    - current API sources
    - mock/fallback inventory
    - known baseline test failures
    - proposed M6 boundaries

Do not modify production code during Phase 0.

============================================================
4. PHASE 1 — COMPLETE G11 DATA-SOURCE AUDIT
============================================================

Inventory all existing authoritative KPI sources.

At minimum inspect:

    /analytics/dashboard
    /analytics/kpis

    /planning/capacity/summary
    /planning/capacity/timeline
    /planning/capacity/utilization
    /planning/capacity/recommendations
    /planning/capacity/risks
    /planning/capacity/what-if

    /project/:id/baselines/variance

    /project/dashboard/stats

    ProductionTrackingService.dashboard

    engineering traceability APIs

    Quality/NCR aggregates

    Service request/SLA data

For every KPI answer:

    1. Where does the value originate?
    2. Which backend service calculates it?
    3. Which controller exposes it?
    4. Is it tenant scoped?
    5. Is permission metadata present?
    6. Is the frontend consuming it?
    7. Is the value deterministic?
    8. Is it suitable for executive display?
    9. Can it support drill-down?
    10. Does it require a new aggregate endpoint?

Create:

    M6_KPI_DATA_CONTRACT.md

with a matrix:

    KPI
    Business Meaning
    Backend Source
    Endpoint
    Tenant Scope
    Permission
    Frontend Consumer
    Drill-down Target
    Status
    Evidence

============================================================
5. PHASE 2 — MOCK / FALLBACK ELIMINATION AUDIT
============================================================

Search the frontend comprehensively for:

    mock
    MOCK
    fallback
    fallbackData
    demo
    sample
    static KPI arrays
    hardcoded chart data
    placeholder
    Metabase
    fake metrics

Known examples include:

    DashboardPage.tsx
    dashboardMockData.ts
    AnalyticsPage.tsx
    BomAnalysisPage.tsx
    AIWorkspaceContext.tsx

Do NOT assume the known inventory is complete.

Perform a repository-wide audit.

Classify every finding:

    A. Real production data
    B. UI-only placeholder
    C. Test fixture
    D. Documentation/demo-only
    E. Production mock business data
    F. Unknown — investigate

Only E must be removed from production behavior for G11.

Create:

    M6_MOCK_DATA_AUDIT.md

============================================================
6. PHASE 3 — BACKEND CONTRACT HARDENING
============================================================

Prefer existing endpoints.

DO NOT create duplicate APIs.

Only add an endpoint when the existing authoritative data cannot
provide the required KPI.

Potential candidates identified during the audit:

    - service KPI trends
    - OEE trend
    - cost variance

Before implementing any of these:

    PROVE that an existing endpoint cannot satisfy the requirement.

For every new endpoint:

    - DTO validation
    - tenant fail-closed behavior
    - @Permissions metadata
    - RBAC tests
    - 401/403 tests
    - audit/project traceability where applicable
    - deterministic calculations
    - Swagger documentation
    - unit tests
    - integration/contract tests

Do not alter existing certified calculations unless an actual
defect is demonstrated.

============================================================
7. PHASE 4 — FRONTEND BI REWIRE
============================================================

Replace production mock/fallback business data with real API data.

Primary files likely include:

    DashboardPage.tsx
    AnalyticsPage.tsx
    dashboardMockData.ts
    related KPI/chart components

Do not blindly rewrite the pages.

First understand the existing premium MITRA UI system.

Preserve:

    - premium visual language
    - existing navigation
    - animations
    - responsive behavior
    - RBAC visibility
    - tenant awareness
    - existing design system
    - accessibility

The objective is:

    SAME / BETTER UI
    + REAL DATA
    + TRACEABLE KPIs
    + NO MOCK BUSINESS DATA

============================================================
8. REQUIRED M6 DASHBOARD CAPABILITIES
============================================================

The dashboard should expose real, authoritative metrics such as:

    Revenue
    Active Projects
    Schedule Variance
    Workload Delta
    Engineer Utilization
    Design Load
    Capacity Gap
    Machine Utilization
    Production Output
    Defect / NCR Rate
    Service SLA

Where authoritative data supports it, add:

    OEE trend
    Service trend / MTTR
    Cost variance

Do NOT fabricate any of these.

============================================================
9. KPI DRILL-DOWN
============================================================

A KPI must not be a dead number.

Where supported, implement:

    KPI
      ↓
    Aggregate explanation
      ↓
    Project / department / machine / service context
      ↓
    underlying records
      ↓
    traceability

At minimum G11 should provide useful drill-down for:

    schedule variance
    capacity gap
    workload
    production
    quality/service issues

The user should be able to understand:

    "Why is this KPI bad?"

using real underlying data.

============================================================
10. CAPACITY FORECAST VISUALIZATION
============================================================

G11 must include the Phase 7 DoD requirement:

    capacity forecast chart fed by the existing Phase 2
    capacity engine.

IMPORTANT:

This is visualization of the existing deterministic capacity
engine.

DO NOT implement ML forecasting here.

Do not turn G11 into G14.

G14 predictive ML remains OUT OF SCOPE.

============================================================
11. FILTERING
============================================================

Implement appropriate real-data filters.

At minimum evaluate:

    tenant
    project
    date/time period
    department/resource where supported

Do not create filters for which backend data cannot provide
authoritative results.

All filters must propagate correctly to backend queries.

============================================================
12. FRONTEND API CONTRACT TESTING
============================================================

For every dashboard KPI establish:

    frontend component
        ↓
    API service
        ↓
    endpoint
        ↓
    DTO
        ↓
    aggregate/service
        ↓
    database source

Verify that no static value can silently replace the real result.

If API failure occurs:

    show a truthful error/empty state

NOT:

    fake business numbers.

============================================================
13. TESTING REQUIREMENTS
============================================================

Add/maintain tests for:

### Backend

    - KPI calculation
    - tenant isolation
    - permission enforcement
    - empty-data behavior
    - invalid filters
    - deterministic calculations
    - aggregate correctness

### Frontend

    - KPI rendering
    - API mapping
    - loading state
    - error state
    - empty state
    - filtering
    - drill-down navigation

### E2E

Create:

    m6-bi-dashboard.e2e-spec.ts

or equivalent according to existing project conventions.

The E2E suite must prove:

    1. login/authentication
    2. tenant-scoped dashboard
    3. real KPI values
    4. no mock values
    5. KPI drill-down
    6. capacity visualization
    7. filtering
    8. permission behavior
    9. meaningful empty/error behavior

============================================================
14. NO TEST CHEATING
============================================================

Never:

    - weaken assertions
    - skip failing tests without documented reason
    - replace real APIs with mocks in production code
    - seed fake business data merely to make charts look good
    - modify baseline tests to hide regressions

The existing documented baseline failures must remain separately
classified.

If a previously passing M1–M5 test fails:

    STOP
    INVESTIGATE
    CLASSIFY
    FIX ONLY IF M6 CAUSED THE REGRESSION

============================================================
15. SECURITY VERIFICATION
============================================================

For every new/modified API verify:

    401 unauthenticated
    403 insufficient permission
    404 invalid resource where applicable
    tenant isolation
    cross-tenant denial

Verify dashboard data cannot leak between tenants.

Preserve:

    requireTenant()

or equivalent fail-closed behavior.

============================================================
16. PERFORMANCE
============================================================

Do not introduce N+1 dashboard queries.

Inspect:

    SQL query count
    aggregate query performance
    unnecessary frontend requests
    duplicated API calls
    React rendering loops

Use parallel aggregation where appropriate.

Existing dashboard aggregation already uses Promise.all-style
parallel collection. Preserve that pattern when safe.

Do not prematurely optimize without evidence.

============================================================
17. DOCUMENTATION
============================================================

Update only after implementation is verified.

Required documents:

    M6_BASELINE_AUDIT.md
    M6_KPI_DATA_CONTRACT.md
    M6_MOCK_DATA_AUDIT.md
    M6_IMPLEMENTATION_REPORT.md
    M6_EVIDENCE_MATRIX.md

Update Vision-100 documents:

    MITRA_VISION_100_CURRENT_STATE.md
    MITRA_VISION_100_GAP_MATRIX.md
    MITRA_VISION_100_DEPENDENCY_GRAPH.md
    MITRA_GOLDEN_SCENARIOS.md

G11 should become:

    CERTIFIED

only after all certification gates pass.

Do NOT claim G12/G13 certification.

============================================================
18. CERTIFICATION GATES
============================================================

M6 is NOT complete because the dashboard looks good.

M6 is complete only when ALL are satisfied.

### Code

    TypeScript PASS
    Backend build PASS
    Frontend build PASS
    lint PASS where configured

### Tests

    Backend unit PASS
    Frontend unit PASS
    API/contract PASS
    G11 E2E PASS
    controlled M1–M5 regression PASS

### Security

    tenant isolation PASS
    RBAC PASS
    401/403 PASS
    no data leakage

### Data integrity

    every KPI mapped to real source
    zero production mock KPI arrays
    zero fabricated business data
    no silent fallback to fake numbers

### UX

    dashboard usable
    responsive
    loading states
    empty states
    error states
    drill-down works
    filters work

### Governance

    KPI definitions documented
    data sources documented
    auditability preserved
    project traceability preserved

### Evidence

    screenshots
    E2E output
    test reports
    API contract evidence
    security evidence
    KPI mapping
    independent verification

### Release

    tag v4.6.0

============================================================
19. INDEPENDENT VERIFICATION
============================================================

Before declaring M6 complete, perform a separate verification pass.

Act as an independent auditor.

Do NOT trust implementation claims.

Re-check:

    - git diff
    - changed files
    - API sources
    - frontend data paths
    - mock-data removal
    - KPI calculations
    - tenant isolation
    - permissions
    - E2E
    - screenshots
    - regression status

Ask:

    "Can I prove every dashboard number comes from real
     authoritative MITRA data?"

If the answer is NO:

    M6 is NOT certified.

============================================================
20. RELEASE RULE
============================================================

Do not create/tag v4.6.0 until:

    G11 certification evidence is complete
    AND
    independent verification passes.

Expected final state:

    G11 = CERTIFIED

    G12 = PARTIAL
    G13 = PARTIAL
    G14 = PARTIAL
    G15 = PARTIAL / UNBLOCKED

============================================================
21. OUT OF SCOPE
============================================================

Explicitly DO NOT implement:

    G12 article lifecycle
    G12 decision corpus
    G13 Copilot certification
    G14 ML prediction
    G15 unified digital-thread graph
    AI writes
    major M1–M5 redesign
    MinIO migration unless directly blocking M6
    fabricated historical datasets
    speculative features

============================================================
22. EXECUTION METHOD
============================================================

Work in explicit phases.

After EACH phase:

    1. inspect
    2. implement only if required
    3. test
    4. report evidence
    5. update todo/status
    6. continue

Do not make large speculative batches of changes.

Use small, reversible changes.

Before modifying a file:

    understand its role
    identify consumers
    identify tests
    identify certified behavior

After modifying a file:

    run the smallest relevant verification immediately.

============================================================
23. FINAL REPORT FORMAT
============================================================

At completion produce:

# MITRA M6 — G11 CERTIFICATION REPORT

Include:

1. Baseline
2. Scope
3. Files changed
4. Backend changes
5. Frontend changes
6. KPI data-source matrix
7. Mock-data elimination evidence
8. Security evidence
9. Test results
10. E2E results
11. Regression results
12. Screenshot evidence
13. Known baseline failures
14. Risks
15. Definition-of-Done checklist
16. Independent verification
17. Vision-100 updated status
18. Release decision

Final decision must be exactly one of:

    CERTIFIED
    NOT CERTIFIED

Do not use ambiguous language such as:

    "mostly complete"
    "production ready"
    "should pass"

Certification requires evidence.

============================================================
24. START NOW
============================================================

BEGIN WITH PHASE 0.

DO NOT modify code yet.

First establish the v4.5.0 baseline and produce the M6 baseline
audit.

After Phase 0, stop and report:

    - current branch
    - HEAD
    - tag
    - git status
    - existing M5 certification state
    - G11 current state
    - initial mock/fallback findings
    - proposed implementation sequence

Then proceed to Phase 1 only after the baseline is confirmed.

Remember:

    M5 is certified.
    M6 is G11.
    Real data only.
    No fabricated KPIs.
    No M1–M5 redesign.
    No G12/G13/G14/G15 scope creep.
    Evidence before certification.