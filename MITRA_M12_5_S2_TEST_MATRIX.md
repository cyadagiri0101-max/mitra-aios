# MITRA M12.5 SPRINT 2 — TEST STRATEGY & MATRIX
**TEST FRAMEWORK:** Vitest + React Testing Library  
**TARGET TEST FILES:**
- `src/services/engineeringPortfolioApi.test.ts` (API Client Unit Tests)
- `src/hooks/usePortfolioData.test.ts` (React Query Hooks Tests)
- `src/components/Engineering/portfolioWorkspaces.test.ts` (Workspace Rendering & Interactions)

---

## Test Execution Scope

| Test Suite | Focus Area | Assertions |
|---|---|---|
| **1. Portfolio API Client** | HTTP Request Formatting & Error Handling | Verifies GET/POST routes, payload serialization, error normalization |
| **2. React Query Hooks** | Cache Management & Query Keys | Verifies query keys, stale-time policies, mutation invalidation triggers |
| **3. Portfolio Workspace UI** | Control Tower Rendering & Metrics | Renders KPI gauges, health score, demand charts, capacity breakdown |
| **4. Bottlenecks & Advisory** | Advisory Display & Governance | Verifies `isAutonomousDecision: false` badges and recommendation cards |
| **5. Allocation Modals** | Human-Authorized Allocation Flow | Validates form inputs, mandatory rationale, and status transitions |
| **6. Scenario Simulator** | Non-Mutating What-If Simulations | Tests timeline delay shifts, prospective project additions, and delta display |
| **7. Error & Empty States** | Fail-Closed Resilience | Renders loading skeletons, empty data states, and API error toasts |
