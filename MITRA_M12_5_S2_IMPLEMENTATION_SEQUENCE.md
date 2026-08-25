# MITRA M12.5 SPRINT 2 — IMPLEMENTATION SEQUENCE PLAN
**EXECUTION WORKFLOW (TO BE EXECUTED UPON SPRINT 2 AUTHORIZATION)**

---

## Phase 1: API Client Extension (`engineeringApi.ts`)
- Add TypeScript interfaces: `EnterprisePortfolioSnapshotDto`, `CrossProjectAllocationDto`, `PortfolioDemandSummaryDto`, `PortfolioCapacitySummaryDto`, `BalancingAnalysisResultDto`, `ScenarioSimulationResultDto`.
- Add `engineeringApi.portfolio` sub-namespace wrapping Axios endpoints (`/api/engineering/portfolio/*`).

## Phase 2: React Query Hooks (`usePortfolioData.ts`)
- Define canonical query keys: `portfolioQueryKeys.all`, `portfolioQueryKeys.snapshot()`, `portfolioQueryKeys.demand()`, `portfolioQueryKeys.capacity()`, `portfolioQueryKeys.bottlenecks()`, `portfolioQueryKeys.allocations()`.
- Implement `usePortfolioSnapshot`, `usePortfolioDemand`, `usePortfolioCapacity`, `usePortfolioBottlenecks`, `useBalancingRecommendations`, `useCrossProjectAllocations`.
- Implement mutations: `useCreatePortfolioSnapshot`, `useCreateAllocation`, `useUpdateAllocationStatus`, `useSimulatePortfolioScenario`.

## Phase 3: UI Components (`src/components/Engineering/`)
- Create `PortfolioControlTowerWorkspace.tsx` and modular panels:
  - `PortfolioDemandPanel.tsx`
  - `GlobalCapacityPanel.tsx`
  - `BottleneckAnalysisPanel.tsx`
  - `RebalancingAdvisoryPanel.tsx`
  - `CrossProjectAllocationTable.tsx`
  - `PortfolioScenarioSimulatorModal.tsx`
  - `PortfolioSnapshotHistoryModal.tsx`

## Phase 4: Verification & Regression
- Execute frontend unit tests (`vitest run --run`).
- Execute production frontend build (`tsc && vite build`).
- Execute full backend regression (`npm test`).
- Enforce release staging hard stop.
