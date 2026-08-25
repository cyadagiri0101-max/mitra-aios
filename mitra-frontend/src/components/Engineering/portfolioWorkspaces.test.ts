import { describe, it, expect, vi, beforeEach } from 'vitest';
import { engineeringApi } from '../../services/engineeringApi';

vi.mock('../../services/engineeringApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/engineeringApi')>();
  return {
    ...actual,
    engineeringApi: {
      ...actual.engineeringApi,
      portfolio: {
        getSnapshot: vi.fn(),
        createSnapshot: vi.fn(),
        getDemand: vi.fn(),
        getCapacity: vi.fn(),
        getBottlenecks: vi.fn(),
        getBalancingRecommendations: vi.fn(),
        getAllocations: vi.fn(),
        createAllocation: vi.fn(),
        updateAllocationStatus: vi.fn(),
        simulateScenario: vi.fn(),
      },
    },
  };
});

describe('M12.5 Sprint 2: Portfolio Control Tower Workspace Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies non-autonomous advisory contract flag', async () => {
    const mockBalancing = {
      tenantId: 'tenant-1',
      timestamp: '2026-08-24T12:00:00Z',
      overallHealthScore: 88,
      bottlenecks: [],
      recommendations: [
        {
          recommendationId: 'rec-1',
          type: 'REALLOCATE_ENGINEER' as const,
          suggestedHours: 10,
          expectedUtilizationDelta: -12,
          rationale: 'Rebalance overloaded engineer ENG-01',
          isAutonomousDecision: false as const,
        },
      ],
      isAutonomousDecision: false as const,
    };

    vi.mocked(engineeringApi.portfolio.getBalancingRecommendations).mockResolvedValueOnce(mockBalancing);

    const data = await engineeringApi.portfolio.getBalancingRecommendations();
    expect(data.isAutonomousDecision).toBe(false);
    expect(data.recommendations[0].isAutonomousDecision).toBe(false);
  });

  it('verifies scenario simulation executes in-memory without mutation', async () => {
    const mockSimulation = {
      scenarioName: 'Delay Stress Simulation',
      tenantId: 'tenant-1',
      simulatedAt: '2026-08-24T12:00:00Z',
      baselineSummary: { totalDemandHours: 400, totalCapacityHours: 400, utilizationPercentage: 100, overloadedEngineersCount: 2 },
      simulatedSummary: { totalDemandHours: 450, totalCapacityHours: 400, utilizationPercentage: 112.5, overloadedEngineersCount: 3 },
      deltas: { demandHoursDelta: 50, capacityHoursDelta: 0, utilizationDelta: 12.5, overloadedEngineersDelta: 1 },
      affectedProjects: [{ projectId: 'BM289', impactDescription: 'Critical delay injection' }],
      affectedEngineers: [],
      scenarioBottlenecks: [],
      isAutonomousDecision: false as const,
    };

    vi.mocked(engineeringApi.portfolio.simulateScenario).mockResolvedValueOnce(mockSimulation);

    const res = await engineeringApi.portfolio.simulateScenario({
      scenarioName: 'Delay Stress Simulation',
      delayedProjects: [{ projectId: 'BM289', delayDays: 14 }],
    });

    expect(res.scenarioName).toBe('Delay Stress Simulation');
    expect(res.deltas.demandHoursDelta).toBe(50);
    expect(res.deltas.utilizationDelta).toBe(12.5);
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('verifies cross-project allocation creation and status transitions', async () => {
    const mockAlloc = {
      id: 'alloc-100',
      tenantId: 'tenant-1',
      projectId: 'BM289',
      engineerId: 'ENG-SR-01',
      engineerName: 'Rajesh Sharma',
      allocationRole: 'LEAD_DESIGNER',
      allocatedHoursPerWeek: 20,
      allocatedWorkloadUnits: 1,
      startDate: '2026-09-01',
      endDate: '2026-10-01',
      allocationStatus: 'ACTIVE' as const,
      skillFitScore: 95,
      source: 'MANUAL_ASSIGNMENT' as const,
      createdAt: '2026-08-24T12:00:00Z',
      updatedAt: '2026-08-24T12:00:00Z',
    };

    vi.mocked(engineeringApi.portfolio.createAllocation).mockResolvedValueOnce(mockAlloc);

    const created = await engineeringApi.portfolio.createAllocation({
      projectId: 'BM289',
      engineerId: 'ENG-SR-01',
      allocationRole: 'LEAD_DESIGNER',
      allocatedHoursPerWeek: 20,
      startDate: '2026-09-01',
      endDate: '2026-10-01',
    });

    expect(created.id).toBe('alloc-100');
    expect(created.allocationStatus).toBe('ACTIVE');

    const updatedAlloc = { ...mockAlloc, allocationStatus: 'RELEASED' as const, reviewRationale: 'Project delivered' };
    vi.mocked(engineeringApi.portfolio.updateAllocationStatus).mockResolvedValueOnce(updatedAlloc);

    const updated = await engineeringApi.portfolio.updateAllocationStatus('alloc-100', {
      status: 'RELEASED',
      rationale: 'Project delivered',
    });

    expect(updated.allocationStatus).toBe('RELEASED');
    expect(updated.reviewRationale).toBe('Project delivered');
  });
});
