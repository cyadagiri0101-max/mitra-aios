import { describe, it, expect, vi, beforeEach } from 'vitest';
import { engineeringApi } from './engineeringApi';
import { api } from '../utils/api';

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('M12.5 Sprint 2: engineeringApi.portfolio Client Abstraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getSnapshot correctly', async () => {
    const mockSnapshot = {
      id: 'snap-1',
      snapshotName: 'Q3 Baseline',
      isAutonomousDecision: false,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockSnapshot });

    const res = await engineeringApi.portfolio.getSnapshot();
    expect(api.get).toHaveBeenCalledWith('/engineering/portfolio/snapshot');
    expect(res).toEqual(mockSnapshot);
  });

  it('calls createSnapshot with payload', async () => {
    const mockSnapshot = { id: 'snap-2', snapshotName: 'Ad-hoc freeze' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockSnapshot });

    const payload = { snapshotName: 'Ad-hoc freeze' };
    const res = await engineeringApi.portfolio.createSnapshot(payload);
    expect(api.post).toHaveBeenCalledWith('/engineering/portfolio/snapshot', payload);
    expect(res).toEqual(mockSnapshot);
  });

  it('calls getDemand with query params', async () => {
    const mockDemand = {
      tenantId: 'tenant-1',
      totalDemandHours: 420.5,
      activeProjectsCount: 3,
      projects: [],
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockDemand });

    const query = { timeframeDays: 60 };
    const res = await engineeringApi.portfolio.getDemand(query);
    expect(api.get).toHaveBeenCalledWith('/engineering/portfolio/demand', { params: query });
    expect(res).toEqual(mockDemand);
  });

  it('calls getCapacity with query params', async () => {
    const mockCapacity = {
      tenantId: 'tenant-1',
      totalEngineersCount: 5,
      overallUtilizationPercentage: 88.5,
      engineers: [],
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockCapacity });

    const query = { engineerRole: 'LEAD_DESIGNER' };
    const res = await engineeringApi.portfolio.getCapacity(query);
    expect(api.get).toHaveBeenCalledWith('/engineering/portfolio/capacity', { params: query });
    expect(res).toEqual(mockCapacity);
  });

  it('calls getBottlenecks', async () => {
    const mockBottlenecks = {
      tenantId: 'tenant-1',
      overallHealthScore: 85,
      bottlenecks: [{ type: 'ENGINEER_OVERLOAD', severity: 'HIGH' }],
      isAutonomousDecision: false,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockBottlenecks });

    const res = await engineeringApi.portfolio.getBottlenecks();
    expect(api.get).toHaveBeenCalledWith('/engineering/portfolio/bottlenecks');
    expect(res).toEqual(mockBottlenecks);
  });

  it('calls getBalancingRecommendations with query params', async () => {
    const mockRecommendations = {
      tenantId: 'tenant-1',
      recommendations: [{ type: 'REALLOCATE_ENGINEER', suggestedHours: 15 }],
      isAutonomousDecision: false,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockRecommendations });

    const query = { targetUtilizationCap: 90 };
    const res = await engineeringApi.portfolio.getBalancingRecommendations(query);
    expect(api.get).toHaveBeenCalledWith('/engineering/portfolio/balancing/recommendations', { params: query });
    expect(res).toEqual(mockRecommendations);
  });

  it('calls getAllocations with filter params', async () => {
    const mockAllocations = [{ id: 'alloc-1', projectId: 'BM289', allocatedHoursPerWeek: 20 }];
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockAllocations });

    const params = { projectId: 'BM289' };
    const res = await engineeringApi.portfolio.getAllocations(params);
    expect(api.get).toHaveBeenCalledWith('/engineering/portfolio/allocations', { params });
    expect(res).toEqual(mockAllocations);
  });

  it('calls createAllocation with payload', async () => {
    const mockAllocation = { id: 'alloc-2', projectId: 'BM331', engineerId: 'ENG-1' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockAllocation });

    const payload = {
      projectId: 'BM331',
      engineerId: 'ENG-1',
      allocationRole: 'LEAD_DESIGNER',
      allocatedHoursPerWeek: 25,
      startDate: '2026-09-01',
      endDate: '2026-10-01',
    };
    const res = await engineeringApi.portfolio.createAllocation(payload);
    expect(api.post).toHaveBeenCalledWith('/engineering/portfolio/allocation', payload);
    expect(res).toEqual(mockAllocation);
  });

  it('calls updateAllocationStatus with encoded id', async () => {
    const mockAllocation = { id: 'alloc-1', allocationStatus: 'RELEASED' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockAllocation });

    const payload = { status: 'RELEASED' as const, rationale: 'Program completed' };
    const res = await engineeringApi.portfolio.updateAllocationStatus('alloc-1', payload);
    expect(api.post).toHaveBeenCalledWith('/engineering/portfolio/allocation/alloc-1/status', payload);
    expect(res).toEqual(mockAllocation);
  });

  it('calls simulateScenario with what-if payload', async () => {
    const mockResult = {
      scenarioName: 'Slip Stress Test',
      deltas: { demandHoursDelta: 40, capacityHoursDelta: 0, utilizationDelta: 12.5, overloadedEngineersDelta: 1 },
      isAutonomousDecision: false,
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResult });

    const payload = {
      scenarioName: 'Slip Stress Test',
      capacityMultiplier: 1.0,
      delayedProjects: [{ projectId: 'BM289', delayDays: 14 }],
    };
    const res = await engineeringApi.portfolio.simulateScenario(payload);
    expect(api.post).toHaveBeenCalledWith('/engineering/portfolio/scenario/simulate', payload);
    expect(res).toEqual(mockResult);
  });
});
