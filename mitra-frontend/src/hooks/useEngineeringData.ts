/**
 * MITRA Engineering Intelligence Platform
 * M12.4 — Live Engineering Operations & Workspace Integration
 * TanStack React Query Hooks Layer for Engineering Workspaces
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
  type ComprehensiveProjectHealthResponse,
  type TeamCapacityBoardResponse,
  type ProjectControlMetricsResponse,
  type DesignComponentDto,
  type DesignComponentDeliverableDto,
  type TrackingSheetReconciliationReport,
  type ProjectPendingWorkResponse,
  type HistoricalWorkloadDto,
  type ToolProvingCycleDto,
  type EngineeringTradeoffStudyDto,
  type DigitalThreadGeometryAssetDto,
  type EkosVisualNeighborhoodResponse,
  type GovernedMeasurementResult,
  type CopilotGroundedResponse,
  type UpdateDeliverableStatusDto,
  type BulkAssignDeliverablesDto,
  type ToggleChecklistItemDto,
  type ProjectAcceptanceSimulationDto,
  type ProjectAcceptanceSimulationResult,
  type WhatIfSimulationDto,
  type WhatIfSimulationResult,
  type SynthesizeTradeoffDto,
  type RecordHumanDecisionDto,
  type PerformMeasurementDto,
  type CopilotStatusQueryDto,
  type CreateToolProvingCycleDto,
  normalizeApiError,
  type NormalizedApiError,
} from '../services/engineeringApi';

// ============================================================================
// 1. CANONICAL QUERY KEYS
// ============================================================================

export const engineeringQueryKeys = {
  all: ['engineering'] as const,
  health: (projectId: string) => [...engineeringQueryKeys.all, 'health', projectId] as const,
  capacity: () => [...engineeringQueryKeys.all, 'capacity'] as const,
  projectControl: (projectId: string) => [...engineeringQueryKeys.all, 'projectControl', projectId] as const,
  wbs: (workPackageId: string) => [...engineeringQueryKeys.all, 'wbs', workPackageId] as const,
  deliverables: (projectId: string) => [...engineeringQueryKeys.all, 'deliverables', projectId] as const,
  trackingReconciliation: (projectId: string) =>
    [...engineeringQueryKeys.all, 'trackingReconciliation', projectId] as const,
  pendingWork: (projectId: string) => [...engineeringQueryKeys.all, 'pendingWork', projectId] as const,
  historicalWorkload: (projectId?: string) =>
    [...engineeringQueryKeys.all, 'historicalWorkload', projectId || 'all'] as const,
  toolProvingCycles: (projectId: string) =>
    [...engineeringQueryKeys.all, 'toolProvingCycles', projectId] as const,
  tradeoffStudy: (studyId: string) => [...engineeringQueryKeys.all, 'tradeoffStudy', studyId] as const,
  geometryAssets: (projectId: string) => [...engineeringQueryKeys.all, 'geometryAssets', projectId] as const,
  ekosNeighborhood: (nodeId: string) => [...engineeringQueryKeys.all, 'ekosNeighborhood', nodeId] as const,
};

// ============================================================================
// 2. QUERY HOOKS (EVIDENCE-BASED CACHE POLICIES)
// ============================================================================

/**
 * 1. Comprehensive Project Health Query Hook
 * Stale time: 30 seconds (dynamic operational dashboard)
 */
export function useProjectHealth(
  projectId: string,
  options?: Omit<UseQueryOptions<ComprehensiveProjectHealthResponse, NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ComprehensiveProjectHealthResponse, NormalizedApiError>({
    queryKey: engineeringQueryKeys.health(projectId),
    queryFn: async () => {
      try {
        return await engineeringApi.trackingCopilot.getComprehensiveProjectHealth(projectId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: Boolean(projectId && projectId.trim().length > 0),
    ...options,
  });
}

/**
 * 2. Team Capacity Board Query Hook
 * Stale time: 30 seconds
 */
export function useTeamCapacity(
  options?: Omit<UseQueryOptions<TeamCapacityBoardResponse, NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TeamCapacityBoardResponse, NormalizedApiError>({
    queryKey: engineeringQueryKeys.capacity(),
    queryFn: async () => {
      try {
        return await engineeringApi.designPlanning.getTeamCapacityBoard();
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
 * 3. Project Control Metrics Query Hook
 */
export function useProjectControl(
  projectId: string,
  options?: Omit<UseQueryOptions<ProjectControlMetricsResponse, NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProjectControlMetricsResponse, NormalizedApiError>({
    queryKey: engineeringQueryKeys.projectControl(projectId),
    queryFn: async () => {
      try {
        return await engineeringApi.designPlanning.getProjectControlMetrics(projectId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 45_000,
    enabled: Boolean(projectId),
    ...options,
  });
}

/**
 * 4. WBS Components Query Hook
 */
export function useWbsComponents(
  workPackageId: string,
  options?: Omit<UseQueryOptions<DesignComponentDto[], NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DesignComponentDto[], NormalizedApiError>({
    queryKey: engineeringQueryKeys.wbs(workPackageId),
    queryFn: async () => {
      try {
        return await engineeringApi.designLifecycle.getWorkPackageComponents(workPackageId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 60_000,
    enabled: Boolean(workPackageId),
    ...options,
  });
}

/**
 * 5. Project Deliverables Query Hook
 */
export function useProjectDeliverables(
  projectId: string,
  options?: Omit<UseQueryOptions<DesignComponentDeliverableDto[], NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DesignComponentDeliverableDto[], NormalizedApiError>({
    queryKey: engineeringQueryKeys.deliverables(projectId),
    queryFn: async () => {
      try {
        return await engineeringApi.componentOperations.getProjectDeliverables(projectId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    enabled: Boolean(projectId),
    ...options,
  });
}

/**
 * 6. Tracking Sheet Reconciliation Diff Query Hook
 */
export function useTrackingReconciliation(
  projectId: string,
  options?: Omit<UseQueryOptions<TrackingSheetReconciliationReport, NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TrackingSheetReconciliationReport, NormalizedApiError>({
    queryKey: engineeringQueryKeys.trackingReconciliation(projectId),
    queryFn: async () => {
      try {
        return await engineeringApi.trackingCopilot.reconcileTrackingSheet(projectId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 60_000,
    enabled: Boolean(projectId),
    ...options,
  });
}

/**
 * 7. Pending Work & Blockers Query Hook
 */
export function useProjectPendingWork(
  projectId: string,
  options?: Omit<UseQueryOptions<ProjectPendingWorkResponse, NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProjectPendingWorkResponse, NormalizedApiError>({
    queryKey: engineeringQueryKeys.pendingWork(projectId),
    queryFn: async () => {
      try {
        return await engineeringApi.trackingCopilot.getProjectPendingWork(projectId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 30_000,
    enabled: Boolean(projectId),
    ...options,
  });
}

/**
 * 8. Historical Workload Variance Ratios Query Hook
 */
export function useHistoricalWorkload(
  projectId?: string,
  options?: Omit<UseQueryOptions<HistoricalWorkloadDto[], NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<HistoricalWorkloadDto[], NormalizedApiError>({
    queryKey: engineeringQueryKeys.historicalWorkload(projectId),
    queryFn: async () => {
      try {
        return await engineeringApi.designLifecycle.getHistoricalWorkloadRatios(projectId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 5 * 60_000,
    ...options,
  });
}

/**
 * 9. Tool Proving Cycles Query Hook
 */
export function useToolProvingCycles(
  projectId: string,
  options?: Omit<UseQueryOptions<ToolProvingCycleDto[], NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ToolProvingCycleDto[], NormalizedApiError>({
    queryKey: engineeringQueryKeys.toolProvingCycles(projectId),
    queryFn: async () => {
      try {
        return await engineeringApi.toolProving.getToolProvingCycles(projectId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 60_000,
    enabled: Boolean(projectId),
    ...options,
  });
}

/**
 * 10. Trade-off Study Query Hook
 */
export function useTradeoffStudy(
  studyId: string,
  options?: Omit<UseQueryOptions<EngineeringTradeoffStudyDto, NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EngineeringTradeoffStudyDto, NormalizedApiError>({
    queryKey: engineeringQueryKeys.tradeoffStudy(studyId),
    queryFn: async () => {
      try {
        return await engineeringApi.tradeoffs.getTradeoffStudy(studyId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 2 * 60_000,
    enabled: Boolean(studyId),
    ...options,
  });
}

/**
 * 11. 3D Digital Thread Geometry Assets Query Hook
 * Stale time: 10 minutes (static 3D models)
 */
export function useGeometryAssets(
  projectId: string,
  options?: Omit<UseQueryOptions<DigitalThreadGeometryAssetDto[], NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DigitalThreadGeometryAssetDto[], NormalizedApiError>({
    queryKey: engineeringQueryKeys.geometryAssets(projectId),
    queryFn: async () => {
      try {
        return await engineeringApi.digitalThread.getProjectGeometryAssets(projectId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    enabled: Boolean(projectId),
    ...options,
  });
}

/**
 * 12. Scoped EKOS Visual Neighborhood Graph Query Hook
 */
export function useEkosVisualNeighborhood(
  nodeId: string,
  options?: Omit<UseQueryOptions<EkosVisualNeighborhoodResponse, NormalizedApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EkosVisualNeighborhoodResponse, NormalizedApiError>({
    queryKey: engineeringQueryKeys.ekosNeighborhood(nodeId),
    queryFn: async () => {
      try {
        return await engineeringApi.digitalThread.getEkosVisualNeighborhood(nodeId);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    staleTime: 5 * 60_000,
    enabled: Boolean(nodeId),
    ...options,
  });
}

// ============================================================================
// 3. MUTATION HOOKS (WITH TARGETED CACHE INVALIDATION)
// ============================================================================

/**
 * Update Deliverable Status Mutation
 */
export function useUpdateDeliverableStatus(
  options?: UseMutationOptions<
    DesignComponentDeliverableDto,
    NormalizedApiError,
    { deliverableId: string; projectId: string; dto: UpdateDeliverableStatusDto }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    DesignComponentDeliverableDto,
    NormalizedApiError,
    { deliverableId: string; projectId: string; dto: UpdateDeliverableStatusDto }
  >({
    mutationFn: async ({ deliverableId, dto }) => {
      try {
        return await engineeringApi.componentOperations.updateDeliverableStatus(deliverableId, dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.deliverables(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.health(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.pendingWork(variables.projectId) });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

/**
 * Bulk Assign Deliverables Mutation
 */
export function useBulkAssignDeliverables(
  options?: UseMutationOptions<
    { updatedCount: number; deliverableIds: string[] },
    NormalizedApiError,
    { projectId: string; dto: BulkAssignDeliverablesDto }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    { updatedCount: number; deliverableIds: string[] },
    NormalizedApiError,
    { projectId: string; dto: BulkAssignDeliverablesDto }
  >({
    mutationFn: async ({ dto }) => {
      try {
        return await engineeringApi.componentOperations.bulkAssignDeliverables(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.deliverables(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.capacity() });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

/**
 * Toggle Checklist Item Mutation
 */
export function useToggleChecklistItem(
  options?: UseMutationOptions<
    unknown,
    NormalizedApiError,
    { checklistItemId: string; projectId: string; dto: ToggleChecklistItemDto }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    NormalizedApiError,
    { checklistItemId: string; projectId: string; dto: ToggleChecklistItemDto }
  >({
    mutationFn: async ({ checklistItemId, dto }) => {
      try {
        return await engineeringApi.componentOperations.toggleChecklistItem(checklistItemId, dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.deliverables(variables.projectId) });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

/**
 * Apply Auto-Reconciliation Mutation
 */
export function useApplyAutoReconciliation(
  options?: UseMutationOptions<
    { reconciledCount: number },
    NormalizedApiError,
    { projectId: string; discrepancyIds: string[] }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    { reconciledCount: number },
    NormalizedApiError,
    { projectId: string; discrepancyIds: string[] }
  >({
    mutationFn: async ({ projectId, discrepancyIds }) => {
      try {
        return await engineeringApi.trackingCopilot.applyAutoReconciliation({
          projectId,
          discrepancyIds,
        });
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.trackingReconciliation(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.deliverables(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.health(variables.projectId) });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

/**
 * Project Acceptance Simulation Mutation
 */
export function useSimulateAcceptance(
  options?: UseMutationOptions<ProjectAcceptanceSimulationResult, NormalizedApiError, ProjectAcceptanceSimulationDto>
) {
  return useMutation<ProjectAcceptanceSimulationResult, NormalizedApiError, ProjectAcceptanceSimulationDto>({
    mutationFn: async (dto) => {
      try {
        return await engineeringApi.designPlanning.simulateProjectAcceptance(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    ...options,
  });
}

/**
 * WhatIf Simulation Mutation
 */
export function useSimulateWhatIf(
  options?: UseMutationOptions<WhatIfSimulationResult, NormalizedApiError, WhatIfSimulationDto>
) {
  return useMutation<WhatIfSimulationResult, NormalizedApiError, WhatIfSimulationDto>({
    mutationFn: async (dto) => {
      try {
        return await engineeringApi.designPlanning.simulateWhatIfCapacity(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    ...options,
  });
}

/**
 * Synthesize Trade-off Study Mutation
 */
export function useSynthesizeTradeoff(
  options?: UseMutationOptions<EngineeringTradeoffStudyDto, NormalizedApiError, SynthesizeTradeoffDto>
) {
  return useMutation<EngineeringTradeoffStudyDto, NormalizedApiError, SynthesizeTradeoffDto>({
    mutationFn: async (dto) => {
      try {
        return await engineeringApi.tradeoffs.synthesizeTradeoffStudy(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    ...options,
  });
}

/**
 * Record Human Trade-off Decision Mutation (Human Governance Gate)
 */
export function useRecordTradeoffDecision(
  options?: UseMutationOptions<
    EngineeringTradeoffStudyDto,
    NormalizedApiError,
    { studyId: string; dto: RecordHumanDecisionDto }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    EngineeringTradeoffStudyDto,
    NormalizedApiError,
    { studyId: string; dto: RecordHumanDecisionDto }
  >({
    mutationFn: async ({ studyId, dto }) => {
      try {
        return await engineeringApi.tradeoffs.recordHumanDecision(studyId, dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.tradeoffStudy(variables.studyId) });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

/**
 * Governed 3D Caliper Measurement Mutation
 */
export function useGovernedMeasurement(
  options?: UseMutationOptions<GovernedMeasurementResult, NormalizedApiError, PerformMeasurementDto>
) {
  return useMutation<GovernedMeasurementResult, NormalizedApiError, PerformMeasurementDto>({
    mutationFn: async (dto) => {
      try {
        return await engineeringApi.digitalThread.performGovernedMeasurement(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    ...options,
  });
}

/**
 * Grounded Status Copilot Query Mutation
 */
export function useQueryCopilotStatus(
  options?: UseMutationOptions<CopilotGroundedResponse, NormalizedApiError, CopilotStatusQueryDto>
) {
  return useMutation<CopilotGroundedResponse, NormalizedApiError, CopilotStatusQueryDto>({
    mutationFn: async (dto) => {
      try {
        return await engineeringApi.trackingCopilot.queryProjectStatus(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    ...options,
  });
}

/**
 * Create Tool Proving Cycle Mutation
 */
export function useCreateToolProvingCycle(
  options?: UseMutationOptions<
    ToolProvingCycleDto,
    NormalizedApiError,
    { projectId: string; dto: CreateToolProvingCycleDto }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    ToolProvingCycleDto,
    NormalizedApiError,
    { projectId: string; dto: CreateToolProvingCycleDto }
  >({
    mutationFn: async ({ dto }) => {
      try {
        return await engineeringApi.toolProving.createToolProvingCycle(dto);
      } catch (err) {
        throw normalizeApiError(err);
      }
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.toolProvingCycles(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.health(variables.projectId) });
      if (options?.onSuccess) {
        (options.onSuccess as (d: typeof data, v: typeof variables, c: typeof context) => void)(data, variables, context);
      }
    },
    ...options,
  });
}

// Convenient aliases for sprint alignment
export const useSimulateProjectAcceptance = useSimulateAcceptance;
export const useQueryProjectStatus = useQueryCopilotStatus;
export const usePerformMeasurement = useGovernedMeasurement;

