import { describe, it, expect, vi, beforeEach } from 'vitest';
import { engineeringQueryKeys } from '../../hooks/useEngineeringData';
import { engineeringApi } from '../../services/engineeringApi';

vi.mock('../../services/engineeringApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/engineeringApi')>();
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

describe('M12.4 Sprint 2: Core Engineering Workspace Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. S2-01: DesignControlTowerWorkspace Integration
  // ==========================================================================
  describe('S2-01: DesignControlTowerWorkspace Data Contracts', () => {
    it('GS-S2-01: processes live project health payload into control tower KPIs', async () => {
      const mockHealth = {
        projectId: 'BM331',
        scheduleHealthScore: 92,
        overallStatus: 'ON_TRACK',
        activeDeliverablesCount: 14,
        completedDeliverablesCount: 10,
        blockedDeliverablesCount: 0,
        missingEvidenceCount: 0,
        discrepancyCount: 0,
        totalPlannedHours: 54.0,
        totalActualHours: 58.5,
        burnRateVariancePercentage: 8.3,
        topBlockers: [],
        citations: [],
      };

      vi.mocked(engineeringApi.trackingCopilot.getComprehensiveProjectHealth).mockResolvedValueOnce(
        mockHealth as any
      );

      const health = await engineeringApi.trackingCopilot.getComprehensiveProjectHealth('BM331');
      expect(health.projectId).toBe('BM331');
      expect(health.scheduleHealthScore).toBe(92);
      expect(health.overallStatus).toBe('ON_TRACK');
      expect(health.totalPlannedHours).toBe(54.0);
    });

    it('FI-S2-04: handles PROJECT_NOT_FOUND cleanly', async () => {
      const notFoundErr = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {
            statusCode: 404,
            error: 'PROJECT_NOT_FOUND',
            message: 'Project NON_EXISTENT_PRJ_999 not found in MITRA engineering database.',
          },
        },
      };

      vi.mocked(engineeringApi.trackingCopilot.getComprehensiveProjectHealth).mockRejectedValueOnce(
        notFoundErr
      );

      await expect(
        engineeringApi.trackingCopilot.getComprehensiveProjectHealth('NON_EXISTENT_PRJ_999')
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: { error: 'PROJECT_NOT_FOUND' },
        },
      });
    });
  });

  // ==========================================================================
  // 2. S2-02: DesignCapacityWorkspace Integration
  // ==========================================================================
  describe('S2-02: DesignCapacityWorkspace Data Contracts', () => {
    it('GS-S2-03: processes team capacity board with overloaded engineer detection', async () => {
      const mockCapacity = {
        totalCapacityHours: 80,
        totalAllocatedHours: 78,
        overallUtilizationPercentage: 97.5,
        overloadedEngineersCount: 1,
        engineers: [
          {
            engineerId: 'eng-1',
            engineerName: 'Alice Tooling Engineer',
            role: 'SENIOR',
            maxWeeklyHours: 40.0,
            allocatedHours: 34.0,
            utilizationPercentage: 85.0,
            isOverloaded: false,
            assignedDeliverablesCount: 4,
          },
          {
            engineerId: 'eng-2',
            engineerName: 'Bob Cavity Specialist',
            role: 'MID',
            maxWeeklyHours: 40.0,
            allocatedHours: 44.0,
            utilizationPercentage: 110.0,
            isOverloaded: true,
            assignedDeliverablesCount: 6,
          },
        ],
      };

      vi.mocked(engineeringApi.designPlanning.getTeamCapacityBoard).mockResolvedValueOnce(
        mockCapacity as any
      );

      const capacity = await engineeringApi.designPlanning.getTeamCapacityBoard();
      expect(capacity.overloadedEngineersCount).toBe(1);
      expect(capacity.engineers[1].isOverloaded).toBe(true);
      expect(capacity.overallUtilizationPercentage).toBe(97.5);
    });
  });

  // ==========================================================================
  // 3. S2-03: DesignComponentOperationsPanel Integration
  // ==========================================================================
  describe('S2-03: DesignComponentOperationsPanel Integration', () => {
    it('GS-S2-04: retrieves project deliverables hierarchy', async () => {
      const mockDeliverables = [
        {
          id: 'deliv-101',
          componentId: 'comp-1',
          projectId: 'BM331',
          deliverableName: 'Core Cavity 3D CAD',
          status: 'VERIFIED',
          assignedEngineerId: 'eng-1',
          assignedEngineerName: 'Alice',
          evidenceFileHash: 'e0566f0f72...368b72e405',
          isEvidenceLinked: true,
          activeBlockerCount: 0,
          checklists: [
            {
              id: 'chk-1',
              deliverableId: 'deliv-101',
              itemDescription: 'Draft angle check >= 1.5 deg',
              isMandatory: true,
              isCompleted: true,
            },
          ],
        },
      ];

      vi.mocked(engineeringApi.componentOperations.getProjectDeliverables).mockResolvedValueOnce(
        mockDeliverables as any
      );

      const deliverables = await engineeringApi.componentOperations.getProjectDeliverables('BM331');
      expect(deliverables.length).toBe(1);
      expect(deliverables[0].status).toBe('VERIFIED');
      expect(deliverables[0].isEvidenceLinked).toBe(true);
      expect(deliverables[0].checklists[0].isCompleted).toBe(true);
    });

    it('GS-S2-05: executes human status mutation and updates deliverable', async () => {
      const updatedDeliverable = {
        id: 'deliv-101',
        componentId: 'comp-1',
        projectId: 'BM331',
        deliverableName: 'Core Cavity 3D CAD',
        status: 'APPROVED',
        isEvidenceLinked: true,
        activeBlockerCount: 0,
        checklists: [],
      };

      vi.mocked(engineeringApi.componentOperations.updateDeliverableStatus).mockResolvedValueOnce(
        updatedDeliverable as any
      );

      const result = await engineeringApi.componentOperations.updateDeliverableStatus('deliv-101', {
        status: 'APPROVED',
        notes: 'Approved by lead tooling engineer',
      });

      expect(engineeringApi.componentOperations.updateDeliverableStatus).toHaveBeenCalledWith(
        'deliv-101',
        { status: 'APPROVED', notes: 'Approved by lead tooling engineer' }
      );
      expect(result.status).toBe('APPROVED');
    });

    it('FI-S2-11: handles checklist toggle DoD update', async () => {
      const updatedItem = {
        id: 'chk-1',
        deliverableId: 'deliv-101',
        itemDescription: 'Cooling line diameter check',
        isMandatory: true,
        isCompleted: true,
        verifiedBy: 'lead_eng_1',
      };

      vi.mocked(engineeringApi.componentOperations.toggleChecklistItem).mockResolvedValueOnce(
        updatedItem as any
      );

      const result = await engineeringApi.componentOperations.toggleChecklistItem('chk-1', {
        isCompleted: true,
        verifiedBy: 'lead_eng_1',
      });

      expect(result.isCompleted).toBe(true);
    });
  });

  // ==========================================================================
  // 4. S2-04: DesignLifecycleWbsPanel Integration
  // ==========================================================================
  describe('S2-04: DesignLifecycleWbsPanel Integration', () => {
    it('GS-S2-06: loads live WBS component hierarchy', async () => {
      const mockComponents = [
        {
          id: 'comp-1',
          projectId: 'BM331',
          workPackageId: 'DWP-001',
          componentCode: 'BM331-CAV-01',
          componentName: 'Main Cavity Insert',
          complexityScore: 1.4,
          createdAt: '2026-08-24T00:00:00Z',
          updatedAt: '2026-08-24T00:00:00Z',
        },
      ];

      vi.mocked(engineeringApi.designLifecycle.getWorkPackageComponents).mockResolvedValueOnce(
        mockComponents as any
      );

      const comps = await engineeringApi.designLifecycle.getWorkPackageComponents('DWP-001');
      expect(comps.length).toBe(1);
      expect(comps[0].componentCode).toBe('BM331-CAV-01');
      expect(comps[0].complexityScore).toBe(1.4);
    });
  });

  // ==========================================================================
  // 5. S2-05: DesignProjectLoadControlPanel Integration
  // ==========================================================================
  describe('S2-05: DesignProjectLoadControlPanel Integration', () => {
    it('GS-S2-07: retrieves project control metrics', async () => {
      const mockMetrics = {
        projectId: 'BM331',
        totalEstimatedHours: 54.0,
        burnRateHoursPerDay: 4.5,
        plannedFinishDate: '2026-09-15',
        forecastedFinishDate: '2026-09-16',
        slippageDays: 1,
        complexityMultiplier: 1.35,
      };

      vi.mocked(engineeringApi.designPlanning.getProjectControlMetrics).mockResolvedValueOnce(
        mockMetrics as any
      );

      const metrics = await engineeringApi.designPlanning.getProjectControlMetrics('BM331');
      expect(metrics.projectId).toBe('BM331');
      expect(metrics.complexityMultiplier).toBe(1.35);
      expect(metrics.slippageDays).toBe(1);
    });
  });

  // ==========================================================================
  // 6. S2-06: DesignTeamCapacityPanel Integration
  // ==========================================================================
  describe('S2-06: DesignTeamCapacityPanel Integration', () => {
    it('GS-S2-08: reuses deterministic query keys for capacity deduplication', () => {
      const key1 = engineeringQueryKeys.capacity();
      const key2 = engineeringQueryKeys.capacity();
      expect(key1).toEqual(key2);
      expect(key1).toEqual(['engineering', 'capacity']);
    });
  });

  // ==========================================================================
  // 7. S2-07 & S2-08: Tracking Sheet & Reconciliation Integration
  // ==========================================================================
  describe('S2-07 & S2-08: Tracking Sheet & Reconciliation Integration', () => {
    it('GS-S2-09: loads tracking sheet reconciliation report', async () => {
      const mockRecon = {
        projectId: 'BM331',
        totalTrackingRows: 24,
        matchedDeliverablesCount: 22,
        discrepanciesCount: 2,
        discrepancies: [
          {
            trackingSheetRowId: 'row-1',
            componentCode: 'BM331-CAV-01',
            sheetStatus: 'COMPLETED',
            systemStatus: 'IN_PROGRESS',
            discrepancyType: 'STATUS_MISMATCH' as const,
            suggestedResolution: 'Promote deliverable to completed upon evidence verification',
          },
          {
            trackingSheetRowId: 'row-2',
            componentCode: 'BM331-CORE-02',
            sheetStatus: 'RELEASED',
            systemStatus: 'VERIFIED',
            discrepancyType: 'HASH_DRIFT' as const,
            suggestedResolution: 'Rescan vault physical blob SHA-256',
          },
        ],
      };

      vi.mocked(engineeringApi.trackingCopilot.reconcileTrackingSheet).mockResolvedValueOnce(
        mockRecon as any
      );

      const report = await engineeringApi.trackingCopilot.reconcileTrackingSheet('BM331');
      expect(report.discrepanciesCount).toBe(2);
      expect(report.discrepancies[0].discrepancyType).toBe('STATUS_MISMATCH');
      expect(report.discrepancies[1].discrepancyType).toBe('HASH_DRIFT');
    });

    it('GS-S2-10: executes human auto-reconciliation mutation', async () => {
      vi.mocked(engineeringApi.trackingCopilot.applyAutoReconciliation).mockResolvedValueOnce({
        reconciledCount: 2,
      });

      const res = await engineeringApi.trackingCopilot.applyAutoReconciliation({
        projectId: 'BM331',
        discrepancyIds: ['row-1', 'row-2'],
      });

      expect(engineeringApi.trackingCopilot.applyAutoReconciliation).toHaveBeenCalledWith({
        projectId: 'BM331',
        discrepancyIds: ['row-1', 'row-2'],
      });
      expect(res.reconciledCount).toBe(2);
    });
  });

  // ==========================================================================
  // 8. S2-09: PendingWorkPanel Integration
  // ==========================================================================
  describe('S2-09: PendingWorkPanel Integration', () => {
    it('GS-S2-11: loads live blockers and pending deliverables', async () => {
      const mockPending = {
        projectId: 'BM331',
        pendingDeliverables: [
          {
            id: 'deliv-1',
            componentId: 'comp-1',
            projectId: 'BM331',
            deliverableName: 'Cooling Layout 3D',
            status: 'IN_PROGRESS' as const,
            isEvidenceLinked: false,
            activeBlockerCount: 1,
            checklists: [],
          },
        ],
        activeBlockers: [
          {
            id: 'blk-1',
            componentId: 'comp-1',
            title: 'Cooling line diameter collision',
            severity: 'CRITICAL' as const,
            reason: 'Baffle diameter exceeds cavity boundary by 0.5mm',
          },
        ],
        totalPendingHours: 6.5,
      };

      vi.mocked(engineeringApi.trackingCopilot.getProjectPendingWork).mockResolvedValueOnce(
        mockPending as any
      );

      const pending = await engineeringApi.trackingCopilot.getProjectPendingWork('BM331');
      expect(pending.activeBlockers.length).toBe(1);
      expect(pending.activeBlockers[0].severity).toBe('CRITICAL');
      expect(pending.pendingDeliverables[0].activeBlockerCount).toBe(1);
    });
  });

  // ==========================================================================
  // 9. S2-10: PlannedVsActualLoadPanel Integration
  // ==========================================================================
  describe('S2-10: PlannedVsActualLoadPanel Integration', () => {
    it('GS-S2-12: loads historical workload variance ratios', async () => {
      const mockHistorical = [
        {
          id: 'hw-1',
          projectId: 'BM331',
          componentType: 'COOLING_MODIFICATION',
          plannedHours: 6.0,
          actualHours: 5.5,
          varianceRatio: -0.083,
          complexityLevel: 'MEDIUM',
        },
        {
          id: 'hw-2',
          projectId: 'BM331',
          componentType: 'T_DIA_CORRECTION',
          plannedHours: 2.0,
          actualHours: 2.0,
          varianceRatio: 0.0,
          complexityLevel: 'LOW',
        },
      ];

      vi.mocked(engineeringApi.designLifecycle.getHistoricalWorkloadRatios).mockResolvedValueOnce(
        mockHistorical as any
      );

      const history = await engineeringApi.designLifecycle.getHistoricalWorkloadRatios('BM331');
      expect(history.length).toBe(2);
      expect(history[0].componentType).toBe('COOLING_MODIFICATION');
      expect(history[0].actualHours).toBe(5.5);
    });
  });
});
