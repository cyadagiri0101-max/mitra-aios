/**
 * MITRA Engineering Intelligence Platform
 * M12.5 — Enterprise Portfolio Orchestration & Global Capacity Balancing
 * TanStack React Query Hooks Layer for Portfolio Control Tower
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

import {
  engineeringApi,
  type EnterprisePortfolioSnapshotDto,
  type PortfolioDemandSummaryDto,
  type PortfolioCapacitySummaryDto,
  type BalancingAnalysisResultDto,
  type CrossProjectAllocationDto,
  type CreateCrossProjectAllocationDto,
  type UpdateAllocationStatusDto,
  type CreatePortfolioSnapshotDto,
  type SimulatePortfolioScenarioDto,
  type ScenarioSimulationResultDto,
  type PortfolioDemandQueryDto,
  type PortfolioCapacityQueryDto,
  type PortfolioBalancingQueryDto,
  normalizeApiError,
  type NormalizedApiError,
} from '../services/engineeringApi';

export { usePortfolioRealtimeSync, type PortfolioRealtimeEvent } from './usePortfolioRealtimeSync';

// ============================================================================
// 1. CANONICAL QUERY KEYS
// ============================================================================

export const portfolioQueryKeys = {
  all: ['portfolio'] as const,
  snapshot: () => [...portfolioQueryKeys.all, 'snapshot'] as const,
  demand: (params?: PortfolioDemandQueryDto) =>
    [...portfolioQueryKeys.all, 'demand', params || {}] as const,
  capacity: (params?: PortfolioCapacityQueryDto) =>
    [...portfolioQueryKeys.all, 'capacity', params || {}] as const,
  bottlenecks: () => [...portfolioQueryKeys.all, 'bottlenecks'] as const,
  recommendations: (params?: PortfolioBalancingQueryDto) =>
    [...portfolioQueryKeys.all, 'recommendations', params || {}] as const,
  allocations: (params?: { projectId?: string; engineerId?: string }) =>
    [...portfolioQueryKeys.all, 'allocations', params || {}] as const,
};

// ============================================================================
// 2. QUERY HOOKS
// ============================================================================

/**
 * 1. Authoritative Portfolio Snapshot Hook
 * Stale time: 30 seconds
 */
export function usePortfolioSnapshot(
  options?: Omit<
    UseQueryOptions<EnterprisePortfolioSnapshotDto | null, NormalizedApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<EnterprisePortfolioSnapshotDto | null, NormalizedApiError>({
    queryKey: portfolioQueryKeys.snapshot(),
    queryFn: async () => {
      try {
        return await engineeringApi.portfolio.getSnapshot();
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

/**
 * 2. Cross-Project Demand Query Hook
 * Stale time: 30 seconds
 */
export function usePortfolioDemand(
  params?: PortfolioDemandQueryDto,
  options?: Omit<
    UseQueryOptions<PortfolioDemandSummaryDto, NormalizedApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<PortfolioDemandSummaryDto, NormalizedApiError>({
    queryKey: portfolioQueryKeys.demand(params),
    queryFn: async () => {
      try {
        return await engineeringApi.portfolio.getDemand(params);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

/**
 * 3. Global Engineering Capacity Query Hook
 * Stale time: 30 seconds
 */
export function usePortfolioCapacity(
  params?: PortfolioCapacityQueryDto,
  options?: Omit<
    UseQueryOptions<PortfolioCapacitySummaryDto, NormalizedApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<PortfolioCapacitySummaryDto, NormalizedApiError>({
    queryKey: portfolioQueryKeys.capacity(params),
    queryFn: async () => {
      try {
        return await engineeringApi.portfolio.getCapacity(params);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

/**
 * 4. Portfolio Bottlenecks Query Hook
 * Stale time: 30 seconds
 */
export function usePortfolioBottlenecks(
  options?: Omit<
    UseQueryOptions<BalancingAnalysisResultDto, NormalizedApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<BalancingAnalysisResultDto, NormalizedApiError>({
    queryKey: portfolioQueryKeys.bottlenecks(),
    queryFn: async () => {
      try {
        return await engineeringApi.portfolio.getBottlenecks();
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

/**
 * 5. Balancing Recommendations Hook
 * Stale time: 30 seconds
 */
export function useBalancingRecommendations(
  params?: PortfolioBalancingQueryDto,
  options?: Omit<
    UseQueryOptions<BalancingAnalysisResultDto, NormalizedApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<BalancingAnalysisResultDto, NormalizedApiError>({
    queryKey: portfolioQueryKeys.recommendations(params),
    queryFn: async () => {
      try {
        return await engineeringApi.portfolio.getBalancingRecommendations(params);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

/**
 * 6. Cross-Project Allocations Query Hook
 * Stale time: 30 seconds
 */
export function useCrossProjectAllocations(
  params?: { projectId?: string; engineerId?: string },
  options?: Omit<
    UseQueryOptions<CrossProjectAllocationDto[], NormalizedApiError>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<CrossProjectAllocationDto[], NormalizedApiError>({
    queryKey: portfolioQueryKeys.allocations(params),
    queryFn: async () => {
      try {
        return await engineeringApi.portfolio.getAllocations(params);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

// ============================================================================
// 3. MUTATION HOOKS (WITH TARGETED CACHE INVALIDATION)
// ============================================================================

/**
 * 7. Create Snapshot Mutation Hook
 */
export function useCreatePortfolioSnapshot(
  options?: UseMutationOptions<
    EnterprisePortfolioSnapshotDto,
    NormalizedApiError,
    CreatePortfolioSnapshotDto
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    EnterprisePortfolioSnapshotDto,
    NormalizedApiError,
    CreatePortfolioSnapshotDto
  >({
    mutationFn: async (dto: CreatePortfolioSnapshotDto) => {
      try {
        return await engineeringApi.portfolio.createSnapshot(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.snapshot() });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

/**
 * 8. Create Cross-Project Allocation Mutation Hook
 */
export function useCreateAllocation(
  options?: UseMutationOptions<
    CrossProjectAllocationDto,
    NormalizedApiError,
    CreateCrossProjectAllocationDto
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    CrossProjectAllocationDto,
    NormalizedApiError,
    CreateCrossProjectAllocationDto
  >({
    mutationFn: async (dto: CreateCrossProjectAllocationDto) => {
      try {
        return await engineeringApi.portfolio.createAllocation(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.all });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

/**
 * 9. Update Allocation Status Mutation Hook
 */
export function useUpdateAllocationStatus(
  options?: UseMutationOptions<
    CrossProjectAllocationDto,
    NormalizedApiError,
    { allocationId: string; dto: UpdateAllocationStatusDto }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    CrossProjectAllocationDto,
    NormalizedApiError,
    { allocationId: string; dto: UpdateAllocationStatusDto }
  >({
    mutationFn: async ({ allocationId, dto }) => {
      try {
        return await engineeringApi.portfolio.updateAllocationStatus(allocationId, dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.all });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

/**
 * 10. Simulate Scenario Mutation Hook (Non-mutating In-Memory Calculation)
 */
export function useSimulatePortfolioScenario(
  options?: UseMutationOptions<
    ScenarioSimulationResultDto,
    NormalizedApiError,
    SimulatePortfolioScenarioDto
  >
) {
  return useMutation<
    ScenarioSimulationResultDto,
    NormalizedApiError,
    SimulatePortfolioScenarioDto
  >({
    mutationFn: async (dto: SimulatePortfolioScenarioDto) => {
      try {
        return await engineeringApi.portfolio.simulateScenario(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    ...options,
  });
}
