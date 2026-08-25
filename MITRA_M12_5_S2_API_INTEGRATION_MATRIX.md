# MITRA M12.5 SPRINT 2 — API INTEGRATION MATRIX
**BACKEND CONTROLLER:** `PortfolioOrchestrationController` (`/api/engineering/portfolio`)  
**FRONTEND CLIENT:** `engineeringApi.portfolio` (`mitra-frontend/src/services/engineeringApi.ts`)  

---

## Endpoint Integration Matrix

| Endpoint Route | HTTP Method | Frontend Client Method | React Query Hook | Request DTO / Query | Response DTO | Cache Invalidation |
|---|---|---|---|---|---|---|
| `/snapshot` | `GET` | `getSnapshot()` | `usePortfolioSnapshot` | None | `EnterprisePortfolioSnapshotDto` | 30s stale time |
| `/snapshot` | `POST` | `createSnapshot()` | `useCreatePortfolioSnapshot` | `CreatePortfolioSnapshotDto` | `EnterprisePortfolioSnapshotDto` | Invalidates `['portfolio', 'snapshot']` |
| `/demand` | `GET` | `getDemand()` | `usePortfolioDemand` | `PortfolioDemandQueryDto` | `PortfolioDemandSummaryDto` | 30s stale time |
| `/capacity` | `GET` | `getCapacity()` | `usePortfolioCapacity` | `PortfolioCapacityQueryDto` | `PortfolioCapacitySummaryDto` | 30s stale time |
| `/bottlenecks` | `GET` | `getBottlenecks()` | `usePortfolioBottlenecks` | None | `BalancingAnalysisResultDto` | 30s stale time |
| `/balancing/recommendations` | `GET` | `getBalancingRecommendations()` | `useBalancingRecommendations` | `PortfolioBalancingQueryDto` | `BalancingAnalysisResultDto` | 30s stale time |
| `/allocations` | `GET` | `getAllocations()` | `useCrossProjectAllocations` | `{ projectId?, engineerId? }` | `CrossProjectAllocationDto[]` | 30s stale time |
| `/allocation` | `POST` | `createAllocation()` | `useCreateAllocation` | `CreateCrossProjectAllocationDto` | `CrossProjectAllocationDto` | Invalidates `['portfolio']` |
| `/allocation/:id/status` | `POST` | `updateAllocationStatus()` | `useUpdateAllocationStatus` | `UpdateAllocationStatusDto` | `CrossProjectAllocationDto` | Invalidates `['portfolio']` |
| `/scenario/simulate` | `POST` | `simulateScenario()` | `useSimulatePortfolioScenario` | `SimulatePortfolioScenarioDto` | `ScenarioSimulationResultDto` | Non-mutating (In-memory) |
