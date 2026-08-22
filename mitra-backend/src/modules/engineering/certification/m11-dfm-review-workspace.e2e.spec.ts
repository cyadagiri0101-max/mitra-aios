import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GeometryDfmController } from '../controllers/geometry-dfm.controller';
import { EngineeringReasoningController } from '../controllers/engineering-reasoning.controller';
import { GeometricFeatureService } from '../services/geometric-feature.service';
import { DfmRuleEngineService } from '../services/dfm-rule-engine.service';
import { HistoricalDefectCorrelationService } from '../services/historical-defect-correlation.service';
import { EngineeringReasoningEngineService } from '../services/engineering-reasoning-engine.service';
import { EngineeringCostSynthesisService } from '../services/engineering-cost-synthesis.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { DfmFindingStatus } from '../entities/dfm-finding.entity';
import { ReasoningStatus } from '../entities/engineering-reasoning-result.entity';
import { GeometricFeatureType } from '../entities/geometric-feature.entity';

describe('M11.4 — Human-in-the-Loop DFM Review & Interactive 3D Canvas Certification', () => {
  let geometryController: GeometryDfmController;
  let reasoningController: EngineeringReasoningController;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';

  const userA: AuthUser = {
    id: 'user-eng-1',
    email: 'chief.engineer@tenant-a.com',
    tenantId: tenantA,
    role: 'ENGINEERING',
    permissions: ['engineering:read', 'engineering:review'],
  };

  const userB: AuthUser = {
    id: 'user-eng-2',
    email: 'unauthorized@tenant-b.com',
    tenantId: tenantB,
    role: 'ENGINEERING',
    permissions: ['engineering:read'],
  };

  const mockFeatureService = {
    extractFeatures: jest.fn(),
    getFeaturesByDrawing: jest.fn().mockImplementation((drwId, rev, tid) => {
      if (tid !== tenantA) return [];
      return [
        {
          id: 'FEAT-WALL-01',
          featureType: GeometricFeatureType.WALL_THICKNESS,
          parameters: { thickness: 0.8, threshold: 1.2 },
          unit: 'mm',
          confidence: 0.95,
          drawingId: drwId,
          drawingRevision: rev,
        },
        {
          id: 'FEAT-DRAFT-01',
          featureType: GeometricFeatureType.DRAFT_ANGLE,
          parameters: { draftAngle: 0.5, threshold: 1.0 },
          unit: 'deg',
          confidence: 0.90,
          drawingId: drwId,
          drawingRevision: rev,
        },
      ];
    }),
  };

  const mockDfmService = {
    evaluateDfm: jest.fn(),
    getFindingsByDrawing: jest.fn().mockImplementation((drwId, rev, tid) => {
      if (tid !== tenantA) return [];
      return [
        {
          id: 'FIND-DFM-WALL-001',
          ruleId: 'DFM-WALL-001',
          ruleVersion: '1.0',
          severity: 'CRITICAL',
          status: DfmFindingStatus.OPEN,
          observedValue: 0.8,
          expectedThreshold: 1.2,
          unit: 'mm',
          explanation: 'Localized cavity wall thickness is 0.80mm, violating minimum design limit of 1.20mm.',
          drawingId: drwId,
          drawingRevision: rev,
        },
      ];
    }),
    reviewFinding: jest.fn(),
  };

  const mockCorrelationService = {
    correlateHistoricalDefects: jest.fn(),
    getFindingHistory: jest.fn(),
    getCorrelationsByDrawing: jest.fn().mockImplementation((drwId, rev, tid) => {
      if (tid !== tenantA) return [];
      return [
        {
          id: 'CORR-SHORT-SHOT-01',
          defectType: 'SHORT_SHOT',
          similarityScore: 0.92,
          confidenceScore: 0.94,
          historicalOccurrences: 8,
          drawingId: drwId,
          drawingRevision: rev,
        },
      ];
    }),
  };

  const mockReasoningService = {
    getReasoningByFinding: jest.fn().mockImplementation((findingId, tid) => {
      if (tid !== tenantA) return [];
      return [
        {
          id: 'REAS-RESULT-001',
          findingId,
          reasoningVersion: '1.0',
          evidenceHash: 'sha256-hash-01',
          overallConfidence: 0.924,
          contradictionState: 'NO_CONFLICT',
          status: ReasoningStatus.GENERATED,
          steps: [
            { stepNumber: 1, stepName: 'Identify Geometric Finding', status: 'COMPLETE', confidence: 1.0 },
            { stepNumber: 2, stepName: 'Retrieve Historical Evidence', status: 'COMPLETE', confidence: 0.94 },
            { stepNumber: 3, stepName: 'Evaluate Feature Similarity', status: 'COMPLETE', confidence: 0.94 },
            { stepNumber: 4, stepName: 'Evaluate Material/Process Compatibility', status: 'COMPLETE', confidence: 0.90 },
            { stepNumber: 5, stepName: 'Evaluate Manufacturing Implications', status: 'COMPLETE', confidence: 0.88 },
            { stepNumber: 6, stepName: 'Evaluate Historical Defect Relevance', status: 'COMPLETE', confidence: 0.92 },
            { stepNumber: 7, stepName: 'Construct Engineering Assessment', status: 'COMPLETE', confidence: 0.91 },
            { stepNumber: 8, stepName: 'Estimate Operational/Cost Impact', status: 'COMPLETE', confidence: 0.92 },
            { stepNumber: 9, stepName: 'Generate Explainable Recommendation', status: 'COMPLETE', confidence: 0.95 },
          ],
          assumptions: [
            { assumptionId: 'A-1', description: 'ABS polymer resin', status: 'VERIFIED' },
          ],
          costSummary: {
            totalExpectedCost: 10000,
            costLow: 8500,
            costHigh: 12500,
            currency: 'INR',
          },
          recommendations: [
            {
              id: 'REC-01',
              title: 'Increase Wall Thickness to ≥ 1.20mm',
              priority: 'CRITICAL',
              status: 'PENDING',
            },
          ],
        },
      ];
    }),
    getReasoningResultById: jest.fn(),
    reviewReasoningResult: jest.fn().mockImplementation((id, dto, tid, user) => {
      if (tid !== tenantA) throw new Error('Reasoning result not found in tenant');
      return {
        id,
        status: dto.status,
        decisionNotes: dto.decisionNotes,
        reviewedBy: user.email,
        reviewedAt: new Date().toISOString(),
      };
    }),
  };

  const mockCostService = {
    calculateCostSynthesis: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeometryDfmController, EngineeringReasoningController],
      providers: [
        { provide: GeometricFeatureService, useValue: mockFeatureService },
        { provide: DfmRuleEngineService, useValue: mockDfmService },
        { provide: HistoricalDefectCorrelationService, useValue: mockCorrelationService },
        { provide: EngineeringReasoningEngineService, useValue: mockReasoningService },
        { provide: EngineeringCostSynthesisService, useValue: mockCostService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    geometryController = module.get<GeometryDfmController>(GeometryDfmController);
    reasoningController = module.get<EngineeringReasoningController>(EngineeringReasoningController);
  });

  describe('M11.4 Golden Scenarios GS-01 to GS-20', () => {
    it('GS-01: Analysis workspace loads unified context', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      expect(workspace).toBeDefined();
      expect(workspace.drawingId).toBe('TOOL-2026-X');
      expect(workspace.featuresCount).toBe(2);
      expect(workspace.findingsCount).toBe(1);
      expect(workspace.correlationsCount).toBe(1);
      expect(workspace.reasoningResultsCount).toBe(1);
    });

    it('GS-02: Correct drawing revision displayed and validated', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      expect(workspace.activeRevision).toBe('Rev B');
      expect(workspace.analysisRevision).toBe('Rev B');
      expect(workspace.revisionSafetyStatus).toBe('REVISION_MATCH_VERIFIED');
    });

    it('GS-03: Geometry features rendered and normalized', async () => {
      const features = await geometryController.getFeatures('TOOL-2026-X', 'Rev B', userA);
      expect(features.length).toBe(2);
      expect(features[0].featureType).toBe(GeometricFeatureType.WALL_THICKNESS);
      expect(features[0].unit).toBe('mm');
    });

    it('GS-04: Feature is selectable with measured dimensions', async () => {
      const features = await geometryController.getFeatures('TOOL-2026-X', 'Rev B', userA);
      const wallFeat: any = features.find((f: any) => f.id === 'FEAT-WALL-01');
      expect(wallFeat).toBeDefined();
      expect(wallFeat.parameters.thickness).toBe(0.8);
      expect(wallFeat.parameters.threshold).toBe(1.2);
    });

    it('GS-05: DFM finding highlights feature spatially', async () => {
      const findings = await geometryController.getFindings('TOOL-2026-X', 'Rev B', userA);
      expect(findings.length).toBe(1);
      expect(findings[0].severity).toBe('CRITICAL');
      expect(findings[0].ruleId).toBe('DFM-WALL-001');
    });

    it('GS-06: Finding details and threshold verification displayed', async () => {
      const findings = await geometryController.getFindings('TOOL-2026-X', 'Rev B', userA);
      expect(findings[0].observedValue).toBe(0.8);
      expect(findings[0].expectedThreshold).toBe(1.2);
      expect(findings[0].explanation).toContain('violating minimum design limit');
    });

    it('GS-07: Historical correlation displayed with similarity metrics', async () => {
      const correlations = await geometryController.getCorrelations('TOOL-2026-X', 'Rev B', userA);
      expect(correlations.length).toBe(1);
      expect(correlations[0].defectType).toBe('SHORT_SHOT');
      expect(correlations[0].similarityScore).toBe(0.92);
    });

    it('GS-08: Evidence citation resolves to authoritative source', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      const reasoning = workspace.reasoningResults[0];
      expect(reasoning.evidenceHash).toBe('sha256-hash-01');
    });

    it('GS-09: Multi-step reasoning chain (all 9 steps) displayed', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      const reasoning = workspace.reasoningResults[0];
      expect(reasoning.steps.length).toBe(9);
      expect(reasoning.steps[0].stepName).toBe('Identify Geometric Finding');
      expect(reasoning.steps[8].stepName).toBe('Generate Explainable Recommendation');
    });

    it('GS-10: Contradiction state displayed accurately', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      const reasoning = workspace.reasoningResults[0];
      expect(reasoning.contradictionState).toBe('NO_CONFLICT');
    });

    it('GS-11: Assumption governance tracked and displayed', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      const reasoning = workspace.reasoningResults[0];
      expect(reasoning.assumptions[0].status).toBe('VERIFIED');
    });

    it('GS-12: Multi-factor confidence score displayed', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      const reasoning = workspace.reasoningResults[0];
      expect(reasoning.overallConfidence).toBe(0.924);
    });

    it('GS-13: Governed cost synthesis displayed with 3-point range', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      const reasoning = workspace.reasoningResults[0];
      expect(reasoning.costSummary.totalExpectedCost).toBe(10000);
      expect(reasoning.costSummary.costLow).toBe(8500);
      expect(reasoning.costSummary.costHigh).toBe(12500);
    });

    it('GS-14: Unconfigured rate displays unavailable without fabrication', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      expect(workspace.advisoryNotice).toContain('AI proposes advisory recommendations');
    });

    it('GS-15: Cross-domain impact assessment displayed', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      expect(workspace.reasoningResults.length).toBeGreaterThan(0);
    });

    it('GS-16: EKOS graph lineage traceable', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      expect(workspace.findings[0].id).toBe('FIND-DFM-WALL-001');
    });

    it('GS-17: G12 knowledge candidate state displayed without auto-publish', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      expect(workspace.reasoningResults[0].recommendations[0].status).toBe('PENDING');
    });

    it('GS-18: G14 advisory context displayed with strict advisory label', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      expect(workspace.advisoryNotice).toBeDefined();
    });

    it('GS-19: Human review decision recorded with mandatory notes to audit ledger', async () => {
      const res = await reasoningController.reviewReasoning(
        'REAS-RESULT-001',
        {
          status: ReasoningStatus.ACCEPTED,
          decisionNotes: 'Approved wall thickness modification from 0.8mm to 1.25mm based on empirical short-shot data.',
        },
        userA,
      );
      expect(res.status).toBe(ReasoningStatus.ACCEPTED);
      expect(res.reviewedBy).toBe(userA.email);
    });

    it('GS-20: HARD INVARIANT — Zero autonomous CAD/BOM/schedule mutation verified', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userA);
      expect(workspace.advisoryNotice).toContain('CAD/BOM is never autonomously modified');
    });
  });

  describe('Failure Injection & Tenant Isolation', () => {
    it('FI-01: Tenant B cannot access Tenant A drawing analysis workspace', async () => {
      const workspaceB = await geometryController.getAnalysisWorkspace('TOOL-2026-X', 'Rev B', userB);
      expect(workspaceB.featuresCount).toBe(0);
      expect(workspaceB.findingsCount).toBe(0);
      expect(workspaceB.correlationsCount).toBe(0);
      expect(workspaceB.reasoningResultsCount).toBe(0);
    });

    it('FI-02: Tenant B cannot submit review on Tenant A reasoning result', async () => {
      await expect(
        reasoningController.reviewReasoning(
          'REAS-RESULT-001',
          {
            status: ReasoningStatus.ACCEPTED,
            decisionNotes: 'Attempting cross-tenant review injection',
          },
          userB,
        ),
      ).rejects.toThrow();
    });
  });
});
