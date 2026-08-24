import { describe, it, expect, vi, beforeEach } from 'vitest';
import { engineeringApi, normalizeApiError } from './engineeringApi';
import { api } from '../utils/api';

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('engineeringApi Client Abstraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('designLifecycle', () => {
    it('calls getWorkPackageComponents with correct encoded URL', async () => {
      const mockData = [{ id: 'comp-1', componentCode: 'BM331-CAV' }];
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData });

      const result = await engineeringApi.designLifecycle.getWorkPackageComponents('wp-123');
      expect(api.get).toHaveBeenCalledWith('/engineering/design-lifecycle/work-package/wp-123/components');
      expect(result).toEqual(mockData);
    });

    it('calls createWorkPackage with payload', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });
      const payload = { projectId: 'PRJ-1', packageName: 'Tooling Design' };
      const result = await engineeringApi.designLifecycle.createWorkPackage(payload);
      expect(api.post).toHaveBeenCalledWith('/engineering/design-lifecycle/work-package', payload);
      expect(result).toEqual({ success: true });
    });
  });

  describe('designPlanning', () => {
    it('calls getTeamCapacityBoard', async () => {
      const mockCapacity = { totalCapacityHours: 160, engineers: [] };
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockCapacity });

      const result = await engineeringApi.designPlanning.getTeamCapacityBoard();
      expect(api.get).toHaveBeenCalledWith('/engineering/design-planning/team-capacity');
      expect(result).toEqual(mockCapacity);
    });

    it('calls simulateProjectAcceptance with correct DTO', async () => {
      const simResult = { isFeasible: true, feasibilityScore: 92 };
      vi.mocked(api.post).mockResolvedValueOnce({ data: simResult });

      const payload = {
        candidateProjectId: 'PRJ-NEW',
        complexityScore: 1.4,
        targetDeliveryWeeks: 8,
        estimatedWorkloadHours: 320,
      };
      const result = await engineeringApi.designPlanning.simulateProjectAcceptance(payload);
      expect(api.post).toHaveBeenCalledWith(
        '/engineering/design-planning/project-acceptance-simulation',
        payload
      );
      expect(result).toEqual(simResult);
    });
  });

  describe('componentOperations', () => {
    it('calls getProjectDeliverables with query params', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] });
      await engineeringApi.componentOperations.getProjectDeliverables('PRJ-1');
      expect(api.get).toHaveBeenCalledWith('/engineering/design-component-operations/deliverables', {
        params: { projectId: 'PRJ-1' },
      });
    });

    it('calls updateDeliverableStatus with encoded ID', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'deliv-1', status: 'VERIFIED' } });
      const result = await engineeringApi.componentOperations.updateDeliverableStatus('deliv-1', {
        status: 'VERIFIED',
      });
      expect(api.post).toHaveBeenCalledWith(
        '/engineering/design-component-operations/deliverable/deliv-1/status',
        { status: 'VERIFIED' }
      );
      expect(result.status).toBe('VERIFIED');
    });
  });

  describe('trackingCopilot', () => {
    it('calls getComprehensiveProjectHealth', async () => {
      const mockHealth = { projectId: 'BM331', scheduleHealthScore: 88, overallStatus: 'ON_TRACK' };
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockHealth });

      const result = await engineeringApi.trackingCopilot.getComprehensiveProjectHealth('BM331');
      expect(api.get).toHaveBeenCalledWith(
        '/engineering/tracking-copilot/project/BM331/comprehensive-health'
      );
      expect(result).toEqual(mockHealth);
    });

    it('calls queryProjectStatus with query text', async () => {
      const mockAnswer = {
        answer: 'BM331 has 2 pending deliverables.',
        confidenceScore: 0.95,
        isAutonomousDecision: false,
        groundedEvidence: [],
      };
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockAnswer });

      const result = await engineeringApi.trackingCopilot.queryProjectStatus({
        projectId: 'BM331',
        queryText: 'What is pending?',
      });
      expect(api.post).toHaveBeenCalledWith('/engineering/tracking-copilot/status-query', {
        projectId: 'BM331',
        queryText: 'What is pending?',
      });
      expect(result.isAutonomousDecision).toBe(false);
    });
  });

  describe('tradeoffs', () => {
    it('calls synthesizeTradeoffStudy', async () => {
      const mockStudy = { id: 'study-1', decisionStatus: 'PENDING_REVIEW', candidates: [] };
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockStudy });

      const payload = {
        projectId: 'BM331',
        componentId: 'comp-1',
        objectiveWeights: {
          toolingCost: 0.3,
          cycleTime: 0.3,
          scrapRisk: 0.2,
          leadTimeDays: 0.1,
          designCapacityHours: 0.1,
          toolProvingRisk: 0.0,
        },
        hardConstraints: { maxToolingCost: 50000 },
      };
      const result = await engineeringApi.tradeoffs.synthesizeTradeoffStudy(payload);
      expect(api.post).toHaveBeenCalledWith('/engineering/tradeoffs/synthesize', payload);
      expect(result.decisionStatus).toBe('PENDING_REVIEW');
    });

    it('calls recordHumanDecision', async () => {
      const updatedStudy = { id: 'study-1', decisionStatus: 'ACCEPTED' };
      vi.mocked(api.post).mockResolvedValueOnce({ data: updatedStudy });

      const result = await engineeringApi.tradeoffs.recordHumanDecision('study-1', {
        decisionStatus: 'ACCEPTED',
        selectedCandidateId: 'cand-A',
        rationale: 'Best tooling cost and cycle balance',
        reviewedBy: 'lead_engineer_1',
      });
      expect(api.post).toHaveBeenCalledWith('/engineering/tradeoffs/study/study-1/decision', {
        decisionStatus: 'ACCEPTED',
        selectedCandidateId: 'cand-A',
        rationale: 'Best tooling cost and cycle balance',
        reviewedBy: 'lead_engineer_1',
      });
      expect(result.decisionStatus).toBe('ACCEPTED');
    });
  });

  describe('digitalThread', () => {
    it('calls performGovernedMeasurement and returns non-CMM disclaimer', async () => {
      const mockMeasurement = {
        distanceMm: 42.5,
        confidence: 0.99,
        disclaimer: 'DECISION SUPPORT MEASUREMENT — NOT CMM CERTIFIED. Refer to certified metrology reports for production release.',
        isCmmCertified: false,
        auditLogId: 'audit-123',
      };
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockMeasurement });

      const result = await engineeringApi.digitalThread.performGovernedMeasurement({
        geometryAssetId: 'geo-1',
        pointA: [0, 0, 0],
        pointB: [10, 20, 30],
        measurementMode: 'EUCLIDEAN_POINT_TO_POINT',
      });
      expect(api.post).toHaveBeenCalledWith('/engineering/digital-thread/caliper-measurement', {
        geometryAssetId: 'geo-1',
        pointA: [0, 0, 0],
        pointB: [10, 20, 30],
        measurementMode: 'EUCLIDEAN_POINT_TO_POINT',
      });
      expect(result.isCmmCertified).toBe(false);
      expect(result.disclaimer).toContain('NOT CMM CERTIFIED');
    });
  });

  describe('normalizeApiError', () => {
    it('correctly detects PROJECT_NOT_FOUND', () => {
      const axiosError = {
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

      const normalized = normalizeApiError(axiosError);
      expect(normalized.isProjectNotFound).toBe(true);
      expect(normalized.statusCode).toBe(404);
      expect(normalized.message).toContain('not found in MITRA engineering database');
    });

    it('correctly handles 401 and 403 authorization failures', () => {
      const authErr = {
        isAxiosError: true,
        response: { status: 401, data: { message: 'Unauthorized' } },
      };
      const forbidErr = {
        isAxiosError: true,
        response: { status: 403, data: { message: 'Forbidden' } },
      };

      expect(normalizeApiError(authErr).isUnauthorized).toBe(true);
      expect(normalizeApiError(forbidErr).isForbidden).toBe(true);
    });

    it('correctly handles timeout errors', () => {
      const timeoutErr = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };
      const normalized = normalizeApiError(timeoutErr);
      expect(normalized.isTimeout).toBe(true);
    });
  });
});
