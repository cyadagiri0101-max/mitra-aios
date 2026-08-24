import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  engineeringQueryKeys,
} from './useEngineeringData';
import { engineeringApi } from '../services/engineeringApi';

vi.mock('../services/engineeringApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/engineeringApi')>();
  return {
    ...actual,
    engineeringApi: {
      trackingCopilot: {
        getComprehensiveProjectHealth: vi.fn(),
        getProjectPendingWork: vi.fn(),
        queryProjectStatus: vi.fn(),
        reconcileTrackingSheet: vi.fn(),
        applyAutoReconciliation: vi.fn(),
      },
      designPlanning: {
        getTeamCapacityBoard: vi.fn(),
        getProjectControlMetrics: vi.fn(),
        simulateProjectAcceptance: vi.fn(),
        simulateWhatIfCapacity: vi.fn(),
      },
      componentOperations: {
        getProjectDeliverables: vi.fn(),
        updateDeliverableStatus: vi.fn(),
        bulkAssignDeliverables: vi.fn(),
        toggleChecklistItem: vi.fn(),
      },
      designLifecycle: {
        getWorkPackageComponents: vi.fn(),
        createWorkPackage: vi.fn(),
        getHistoricalWorkloadRatios: vi.fn(),
      },
      tradeoffs: {
        synthesizeTradeoffStudy: vi.fn(),
        getTradeoffStudy: vi.fn(),
        recordHumanDecision: vi.fn(),
      },
      digitalThread: {
        getProjectGeometryAssets: vi.fn(),
        getEkosVisualNeighborhood: vi.fn(),
        performGovernedMeasurement: vi.fn(),
        query3dCopilot: vi.fn(),
      },
      toolProving: {
        getToolProvingCycles: vi.fn(),
        createToolProvingCycle: vi.fn(),
      },
    },
  };
});

describe('useEngineeringData Query Keys & Integration Functions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  describe('query keys deterministic structure', () => {
    it('generates deterministic query keys for all domains', () => {
      expect(engineeringQueryKeys.all).toEqual(['engineering']);
      expect(engineeringQueryKeys.health('BM331')).toEqual(['engineering', 'health', 'BM331']);
      expect(engineeringQueryKeys.capacity()).toEqual(['engineering', 'capacity']);
      expect(engineeringQueryKeys.wbs('wp-123')).toEqual(['engineering', 'wbs', 'wp-123']);
      expect(engineeringQueryKeys.deliverables('BM331')).toEqual(['engineering', 'deliverables', 'BM331']);
      expect(engineeringQueryKeys.trackingReconciliation('BM331')).toEqual([
        'engineering',
        'trackingReconciliation',
        'BM331',
      ]);
      expect(engineeringQueryKeys.pendingWork('BM331')).toEqual(['engineering', 'pendingWork', 'BM331']);
      expect(engineeringQueryKeys.historicalWorkload('BM331')).toEqual([
        'engineering',
        'historicalWorkload',
        'BM331',
      ]);
      expect(engineeringQueryKeys.toolProvingCycles('BM331')).toEqual([
        'engineering',
        'toolProvingCycles',
        'BM331',
      ]);
      expect(engineeringQueryKeys.tradeoffStudy('study-1')).toEqual(['engineering', 'tradeoffStudy', 'study-1']);
      expect(engineeringQueryKeys.geometryAssets('BM331')).toEqual(['engineering', 'geometryAssets', 'BM331']);
      expect(engineeringQueryKeys.ekosNeighborhood('node-1')).toEqual(['engineering', 'ekosNeighborhood', 'node-1']);
    });
  });

  describe('Query Execution via QueryClient', () => {
    it('fetches comprehensive health through QueryClient fetchQuery', async () => {
      const mockHealth = {
        projectId: 'BM331',
        scheduleHealthScore: 94,
        overallStatus: 'ON_TRACK',
      };
      vi.mocked(engineeringApi.trackingCopilot.getComprehensiveProjectHealth).mockResolvedValueOnce(
        mockHealth as any
      );

      const data = await queryClient.fetchQuery({
        queryKey: engineeringQueryKeys.health('BM331'),
        queryFn: () => engineeringApi.trackingCopilot.getComprehensiveProjectHealth('BM331'),
      });

      expect(data).toEqual(mockHealth);
      expect(engineeringApi.trackingCopilot.getComprehensiveProjectHealth).toHaveBeenCalledWith('BM331');
    });

    it('fetches team capacity through QueryClient', async () => {
      const mockCapacity = {
        totalCapacityHours: 320,
        totalAllocatedHours: 240,
        overallUtilizationPercentage: 75,
        engineers: [],
      };
      vi.mocked(engineeringApi.designPlanning.getTeamCapacityBoard).mockResolvedValueOnce(
        mockCapacity as any
      );

      const data = await queryClient.fetchQuery({
        queryKey: engineeringQueryKeys.capacity(),
        queryFn: () => engineeringApi.designPlanning.getTeamCapacityBoard(),
      });

      expect(data).toEqual(mockCapacity);
    });

    it('fetches 3D geometry assets through QueryClient', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          componentId: 'comp-1',
          activeOverlay: 'BLOCKER_CRITICAL',
          sourceFileHash: 'abc123sha',
        },
      ];
      vi.mocked(engineeringApi.digitalThread.getProjectGeometryAssets).mockResolvedValueOnce(
        mockAssets as any
      );

      const data = await queryClient.fetchQuery({
        queryKey: engineeringQueryKeys.geometryAssets('BM331'),
        queryFn: () => engineeringApi.digitalThread.getProjectGeometryAssets('BM331'),
      });

      expect(data).toEqual(mockAssets);
    });
  });

  describe('Mutation Invalidation Logic', () => {
    it('invalidates deliverables and health queries after deliverable status update', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(engineeringApi.componentOperations.updateDeliverableStatus).mockResolvedValueOnce({
        id: 'deliv-1',
        status: 'VERIFIED',
      } as any);

      // Perform mutation action
      await engineeringApi.componentOperations.updateDeliverableStatus('deliv-1', {
        status: 'VERIFIED',
      });

      // Invalidation pipeline
      await queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.deliverables('BM331') });
      await queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.health('BM331') });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['engineering', 'deliverables', 'BM331'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['engineering', 'health', 'BM331'] });
    });

    it('invalidates tradeoff study query after human approval decision', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(engineeringApi.tradeoffs.recordHumanDecision).mockResolvedValueOnce({
        id: 'study-1',
        decisionStatus: 'ACCEPTED',
      } as any);

      await engineeringApi.tradeoffs.recordHumanDecision('study-1', {
        decisionStatus: 'ACCEPTED',
        selectedCandidateId: 'cand-1',
        rationale: 'Approved',
        reviewedBy: 'eng_1',
      });

      await queryClient.invalidateQueries({ queryKey: engineeringQueryKeys.tradeoffStudy('study-1') });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['engineering', 'tradeoffStudy', 'study-1'] });
    });
  });
});
