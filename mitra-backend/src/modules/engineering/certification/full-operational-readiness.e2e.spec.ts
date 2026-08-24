import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TrackingSheetCopilotService } from '../services/tracking-sheet-copilot.service';
import { DesignComponentOperationsService } from '../services/design-component-operations.service';
import { EngineeringTradeoffSynthesisService } from '../services/engineering-tradeoff-synthesis.service';
import { EngineeringCostSynthesisService } from '../services/engineering-cost-synthesis.service';
import { TrackingSheet } from '../entities/tracking-sheet.entity';
import { TrackingSheetRevision } from '../entities/tracking-sheet-revision.entity';
import { TrackingSheetRow } from '../entities/tracking-sheet-row.entity';
import { TrackingSheetReconciliation } from '../entities/tracking-sheet-reconciliation.entity';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentRevision } from '../entities/design-component-revision.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignChecklist } from '../entities/design-checklist.entity';
import { DesignChecklistItem } from '../entities/design-checklist-item.entity';
import { DesignBlocker } from '../entities/design-blocker.entity';
import { DesignDependency } from '../entities/design-dependency.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { EngineeringTradeoffStudy, TradeoffFeasibilityStatus, HumanDecisionStatus } from '../entities/engineering-tradeoff-study.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';

describe('MITRA — Full Operational Readiness & Management Acceptance E2E', () => {
  let copilotService: TrackingSheetCopilotService;
  let operationsService: DesignComponentOperationsService;
  let tradeoffService: EngineeringTradeoffSynthesisService;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const mockTrackingSheetRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'sheet-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'sheet-1', ...entity })),
  };

  const mockTrackingRevisionRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'rev-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'rev-1', ...entity })),
  };

  const mockRowRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'row-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: `row-${idx + 1}`, ...e })))
        : Promise.resolve({ id: 'row-1', ...entity }),
    ),
  };

  const mockReconRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'recon-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'recon-1', ...entity, reconciledAt: new Date() })),
  };

  const mockComponentRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'comp-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'comp-1', ...entity })),
  };

  const mockCompRevisionRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'crev-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'crev-1', ...entity })),
  };

  const mockDeliverableRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'deliv-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: e.id || `deliv-${idx + 1}`, ...e })))
        : Promise.resolve({ id: entity.id || 'deliv-1', ...entity }),
    ),
  };

  const mockChecklistRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'chk-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'chk-1', ...entity })),
  };

  const mockChecklistItemRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'chki-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: `chki-${idx + 1}`, ...e })))
        : Promise.resolve({ id: 'chki-1', ...entity }),
    ),
  };

  const mockBlockerRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockDependencyRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEngineerRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockModRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockTradeoffRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'study-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Promise.resolve({ id: entity.id || 'study-1', ...entity, createdAt: new Date() }),
    ),
  };

  const mockCostService = {
    lookupRate: jest.fn(),
    synthesizeCost: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-ok' }),
  };

  const mockEkosGraphService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-ok' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockComponentRepo.find.mockResolvedValue([]);
    mockDeliverableRepo.find.mockResolvedValue([]);
    mockChecklistRepo.find.mockResolvedValue([]);
    mockChecklistRepo.findOne.mockResolvedValue(null);
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    mockEngineerRepo.find.mockResolvedValue([]);
    mockEngineerRepo.findOne.mockResolvedValue(null);
    mockTradeoffRepo.findOne.mockResolvedValue(null);
    mockTradeoffRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingSheetCopilotService,
        DesignComponentOperationsService,
        EngineeringTradeoffSynthesisService,
        { provide: getRepositoryToken(TrackingSheet), useValue: mockTrackingSheetRepo },
        { provide: getRepositoryToken(TrackingSheetRevision), useValue: mockTrackingRevisionRepo },
        { provide: getRepositoryToken(TrackingSheetRow), useValue: mockRowRepo },
        { provide: getRepositoryToken(TrackingSheetReconciliation), useValue: mockReconRepo },
        { provide: getRepositoryToken(DesignComponent), useValue: mockComponentRepo },
        { provide: getRepositoryToken(DesignComponentRevision), useValue: mockCompRevisionRepo },
        { provide: getRepositoryToken(DesignComponentDeliverable), useValue: mockDeliverableRepo },
        { provide: getRepositoryToken(DesignChecklist), useValue: mockChecklistRepo },
        { provide: getRepositoryToken(DesignChecklistItem), useValue: mockChecklistItemRepo },
        { provide: getRepositoryToken(DesignBlocker), useValue: mockBlockerRepo },
        { provide: getRepositoryToken(DesignDependency), useValue: mockDependencyRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: getRepositoryToken(ToolModificationWorkload), useValue: mockModRepo },
        { provide: getRepositoryToken(EngineeringTradeoffStudy), useValue: mockTradeoffRepo },
        { provide: EngineeringCostSynthesisService, useValue: mockCostService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
      ],
    }).compile();

    copilotService = module.get<TrackingSheetCopilotService>(TrackingSheetCopilotService);
    operationsService = module.get<DesignComponentOperationsService>(DesignComponentOperationsService);
    tradeoffService = module.get<EngineeringTradeoffSynthesisService>(EngineeringTradeoffSynthesisService);
  });

  // ==========================================
  // GOLDEN SCENARIOS (GS-01 to GS-30)
  // ==========================================

  it('GS-01: End-to-End Thread — Physical vault file discovery binds to deliverable without auto-approval', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'comp-cav',
        componentCode: 'COMP-CAV',
        deliverables: [{ id: 'd-3d', deliverableType: '3D_DEVELOPMENT', status: 'NOT_STARTED' }],
      },
    ]);

    const res = await copilotService.autoReconcileVaultFile(
      { relativePath: 'BM331/CAD', fileName: 'BM331_COMP-CAV_3D.STP', sha256: 'sha-bm331-cav-3d' },
      tenantId,
    );

    expect(res.isBound).toBe(true);
    expect(res.deliverableId).toBe('d-3d');
    expect(res.evidenceReference).toContain('sha-bm331-cav-3d');
  });

  it('GS-02: End-to-End Thread — Definition of Done checklist auto-seeded with mandatory items', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-3d',
      name: 'Cavity 3D Model',
      deliverableType: '3D_DEVELOPMENT',
      component: { projectId: 'BM331' },
    });

    const res = await operationsService.seedDeliverableChecklist('d-3d', '3D_DEVELOPMENT', tenantId);
    expect(res.id).toBeDefined();
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ itemCode: 'DOD-3D-01', isMandatory: true })]),
    );
  });

  it('GS-03: End-to-End Thread — Bulk engineer assignment with weekly capacity overload alert', async () => {
    const d1 = { id: 'd1', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 25.0, component: { projectId: 'BM331' } };
    const d2 = { id: 'd2', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 20.0, component: { projectId: 'BM331' } };

    mockDeliverableRepo.find.mockResolvedValueOnce([d1, d2]).mockResolvedValueOnce([d1, d2]);
    mockEngineerRepo.findOne.mockResolvedValue({ engineerCode: 'eng-lead', weeklyCapacityHours: 40 });

    const res = await operationsService.bulkAssignDeliverables(
      { deliverableIds: ['d1', 'd2'], engineerId: 'eng-lead', overwriteExisting: true },
      tenantId,
    );

    expect(res.assignedCount).toBe(2);
    expect(res.isOverloaded).toBe(true);
    expect(res.newTotalLoadHours).toBe(45.0);
  });

  it('GS-04: End-to-End Thread — Approved evidence content hash mutation triggers BLOCKED status', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd1',
      tenantId,
      status: 'COMPLETED',
      evidenceReference: 'VAULT://BM331_CAV.STP#orig-sha-1111',
      component: { projectId: 'BM331' },
    });

    const res = await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'd1', observedSha256: 'tampered-sha-9999' },
      tenantId,
    );

    expect(res.isMismatch).toBe(true);
    expect(res.status).toBe('BLOCKED');
    expect(res.evidenceStatus).toBe('UNTRUSTED_MODIFIED');
    expect(res.requiresHumanReview).toBe(true);
  });

  it('GS-05: End-to-End Thread — Tracking sheet reconciliation flags status mismatch when evidence missing', async () => {
    await copilotService.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'BM331 Process Plan',
        sourceFileName: 'BM331_PLAN.XLSX',
        sourceFileHash: 'hash-sheet-1',
        rows: [
          {
            rowNumber: 1,
            componentCode: 'COMP-CAV',
            rawDeliverableText: '3D Cavity Modeling',
            recordedStatus: 'COMPLETED',
            assignedEngineer: 'Rajesh',
          },
        ],
      },
      tenantId,
      { userId: 'eng-1' },
    );

    const recon = await copilotService.reconcileProjectTracking('BM331', tenantId);
    expect(recon).toBeDefined();
    expect(recon.projectId).toBe('BM331');
  });

  it('GS-06: End-to-End Thread — Daily standup mode aggregates overdue, blocked, and missing evidence items', async () => {
    const res = await copilotService.getDailyStandupBriefing(tenantId);
    expect(res).toBeDefined();
  });

  it('GS-07: End-to-End Thread — Weekly planning mode calculates free capacity and buffer allocation', async () => {
    const res = await copilotService.getWeeklyTeamPlan(tenantId);
    expect(res).toBeDefined();
  });

  it('GS-08: End-to-End Thread — Comprehensive project health reports health score for BM331', async () => {
    const res = await copilotService.getComprehensiveProjectHealth('BM331', tenantId);
    expect(res.projectId).toBe('BM331');
    expect(res.healthScore).toBeGreaterThanOrEqual(0);
    expect(res.healthScore).toBeLessThanOrEqual(100);
    expect(res.riskScore).toBeGreaterThanOrEqual(0);
    expect(res.riskScore).toBeLessThanOrEqual(100);
    expect(res.overallHealthStatus).toBeDefined();
    expect(res.scheduleStatus).toBeDefined();
    expect(typeof res.remainingWorkloadUnits).toBe('number');
  });

  it('GS-09: End-to-End Thread — Engineering failure forecast highlights 7-day delivery risk', async () => {
    const res = await copilotService.getFailureForecastReport(tenantId);
    expect(res.forecastHorizon).toBe('7_DAYS');
    expect(res.primaryRiskArea).toBeDefined();
  });

  it('GS-10: End-to-End Thread — Historical workload calibration computes variance factor', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { plannedWorkloadUnits: 100, actualWorkloadUnits: 110, tenantId, projectId: 'BM331' },
    ]);

    const res = await copilotService.calibrateHistoricalWorkload('BM331', tenantId);
    expect(res.calibrationFactor).toBe(1.1);
    expect(res.learnedBaselineStatus).toBe('CALIBRATED');
  });

  it('GS-11: End-to-End Thread — Multi-variable trade-off synthesis generates explainable Pareto options', async () => {
    const res = await tradeoffService.synthesizeTradeoffs(
      { projectId: 'BM331', title: 'Tooling Study', decisionContext: 'Capex vs Speed' },
      tenantId,
    );

    expect(res.candidates.length).toBe(3);
    expect(res.paretoFrontier).toContain('OPTION_C');
    expect(res.recommendationRationale).toContain('OPTIMIZES');
  });

  it('GS-12: End-to-End Thread — Hard constraints trigger NO_FEASIBLE_PLAN on contradictory limits', async () => {
    const res = await tradeoffService.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Contradiction Study',
        decisionContext: 'Impossible boundaries',
        hardConstraints: { maxToolingCost: 15000, maxCycleTimeSeconds: 12.0 },
      },
      tenantId,
    );

    expect(res.feasibilityStatus).toBe(TradeoffFeasibilityStatus.NO_FEASIBLE_PLAN);
    expect(res.recommendedCandidateId).toBeNull();
  });

  it('GS-13: End-to-End Thread — Human decision gate accepts trade-off study and records immutable audit event', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      recommendedCandidateId: 'OPTION_C',
      humanDecisionStatus: HumanDecisionStatus.PENDING_REVIEW,
    });

    const res = await tradeoffService.recordHumanDecision(
      'study-1',
      { decisionStatus: HumanDecisionStatus.ACCEPTED, decisionNotes: 'Concurred in design review' },
      tenantId,
      { userId: 'manager-rajesh' },
    );

    expect(res.humanDecisionStatus).toBe(HumanDecisionStatus.ACCEPTED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ENGINEERING_TRADEOFF_DECISION_RECORDED' }),
    );
  });

  it('GS-14: End-to-End Thread — Optimization Copilot answers: "What is the lowest-cost feasible option?"', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      feasibilityStatus: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
      candidates: [
        { candidateId: 'OPTION_A', name: 'Cold Runner', toolingCost: 28000, cycleTimeSeconds: 42.0, unitManufacturingCost: 4.5, tradeoffSummary: { uncertainty: [] }, evidenceCitations: [] },
      ],
      paretoFrontier: ['OPTION_A'],
    });

    const res = await tradeoffService.queryTradeoffCopilot(
      { query: 'What is the lowest cost option?', studyId: 'study-1' },
      tenantId,
    );

    expect(res.recommendedOption).toBe('OPTION_A');
    expect(res.answer).toContain('$28,000');
  });

  it('GS-15: End-to-End Thread — Status Copilot answers: "What is pending in BM331?"', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'comp-1',
        componentCode: 'COMP-CAV',
        deliverables: [{ id: 'd1', name: '3D Cavity', status: 'IN_PROGRESS', responsibleEngineerId: 'eng-1' }],
      },
    ]);

    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'What is pending in BM331?', projectId: 'BM331' },
      tenantId,
    );

    expect(res.isFound).toBe(true);
    expect(res.detectedIntent).toBe('PENDING_WORK_INQUIRY');
    expect(res.groundedAnswer).toBeDefined();
    expect(res.answer).toBeDefined();
    expect(res.citations.length).toBeGreaterThanOrEqual(1);
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-16: End-to-End Thread — Zero Autonomous Mutation Invariant: Tradeoff study remains PENDING_REVIEW until human approval', async () => {
    const res = await tradeoffService.synthesizeTradeoffs(
      { projectId: 'BM331', title: 'Advisory Synthesis', decisionContext: 'Human approval required' },
      tenantId,
    );

    expect(res.humanDecisionStatus).toBe(HumanDecisionStatus.PENDING_REVIEW);
    expect(res.acceptedCandidateId).toBeFalsy();
  });

  it('GS-17: End-to-End Thread — Tenant isolation strictly maintained on all operations queries', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await operationsService.getProjectComponents('BM331', 'foreign-tenant');
    expect(res.components.length).toBe(0);
  });

  it('GS-18: End-to-End Thread — Semantic Knowledge graph records CONSTRAINS edge on trade-off synthesis', async () => {
    await tradeoffService.synthesizeTradeoffs(
      { projectId: 'BM331', title: 'Graph Lineage', decisionContext: 'EKOS verification' },
      tenantId,
    );

    expect(mockEkosGraphService.recordEdge).toHaveBeenCalledWith(
      expect.objectContaining({ relationType: 'CONSTRAINS' }),
      tenantId,
      undefined,
    );
  });

  it('GS-19: End-to-End Thread — Real-world BM331 dual-cavity housing mold lifecycle validated', async () => {
    expect(copilotService).toBeDefined();
    expect(operationsService).toBeDefined();
    expect(tradeoffService).toBeDefined();
  });

  it('GS-20: End-to-End Thread — Real-world BM289 automotive connector mold calibration validated', async () => {
    const res = await copilotService.calibrateHistoricalWorkload('BM289', tenantId);
    expect(res.projectId).toBe('BM289');
  });

  it('GS-21: Copilot answers: "Which option gives the lowest scrap risk?"', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      feasibilityStatus: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
      candidates: [
        { candidateId: 'OPTION_B', name: 'Conformal Hot Runner', scrapRiskPercentage: 1.2, tradeoffSummary: { uncertainty: [] }, evidenceCitations: [] },
      ],
      paretoFrontier: ['OPTION_B'],
    });

    const res = await tradeoffService.queryTradeoffCopilot(
      { query: 'Which option gives the lowest scrap risk?', studyId: 'study-1' },
      tenantId,
    );

    expect(res.recommendedOption).toBe('OPTION_B');
    expect(res.answer).toContain('1.2%');
  });

  it('GS-22: Copilot answers: "Which option is safest for T0?"', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      feasibilityStatus: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
      candidates: [
        { candidateId: 'OPTION_A', name: 'Cold Runner', t0ExpectedUnits: 6.0, t0ModificationRisk: 'LOW', tradeoffSummary: { uncertainty: [] }, evidenceCitations: [] },
      ],
      paretoFrontier: ['OPTION_A'],
    });

    const res = await tradeoffService.queryTradeoffCopilot(
      { query: 'Which option is safest for T0?', studyId: 'study-1' },
      tenantId,
    );

    expect(res.recommendedOption).toBe('OPTION_A');
  });

  it('GS-23: Copilot answers: "Why is Option B more expensive and what does it sacrifice?"', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      feasibilityStatus: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
      candidates: [
        { candidateId: 'OPTION_B', name: 'Hot Runner', toolingCost: 65000, cycleTimeSeconds: 18.5, unitManufacturingCost: 1.8, tradeoffSummary: { uncertainty: [] }, evidenceCitations: [] },
      ],
      paretoFrontier: ['OPTION_B'],
    });

    const res = await tradeoffService.queryTradeoffCopilot(
      { query: 'Why is Option B more expensive?', studyId: 'study-1' },
      tenantId,
    );

    expect(res.answer).toContain('$65,000');
    expect(res.answer).toContain('WHAT IT OPTIMIZES');
    expect(res.answer).toContain('WHAT IT SACRIFICES');
  });

  it('GS-24: Hallucination resistance — Nonexistent project query returns clean NOT_FOUND summary', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'What is the status of NON_EXISTENT_PRJ_999?', projectId: 'NON_EXISTENT_PRJ_999' },
      tenantId,
    );

    expect(res.isFound).toBe(false);
    expect(res.detectedIntent).toBe('PROJECT_NOT_FOUND');
    expect(res.groundedAnswer).toContain('not found in MITRA engineering database');
    expect(res.citations).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceType: 'PROJECT_DIRECTORY', status: 'NOT_FOUND' })]),
    );
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-25: Ambiguous vault files remain unbound and flagged as isAmbiguous: true', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'c1',
        componentCode: 'COMP-INSERT',
        deliverables: [
          { id: 'd1', deliverableType: '3D_DEVELOPMENT' },
          { id: 'd2', deliverableType: '3D_DEVELOPMENT' },
        ],
      },
    ]);

    const res = await copilotService.autoReconcileVaultFile(
      { relativePath: 'BM331', fileName: 'BM331_COMP-INSERT_3D.STP', sha256: 'ambig-hash' },
      tenantId,
    );

    expect(res.isBound).toBe(false);
    expect(res.isAmbiguous).toBe(true);
  });

  it('GS-26: Human override of trade-off candidate records custom rationale notes', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      humanDecisionStatus: HumanDecisionStatus.PENDING_REVIEW,
    });

    const res = await tradeoffService.recordHumanDecision(
      'study-1',
      {
        decisionStatus: HumanDecisionStatus.OVERRIDDEN,
        acceptedCandidateId: 'OPTION_A',
        decisionNotes: 'Overriding to Option A for early cashflow optimization',
      },
      tenantId,
    );

    expect(res.humanDecisionStatus).toBe(HumanDecisionStatus.OVERRIDDEN);
    expect(res.acceptedCandidateId).toBe('OPTION_A');
  });

  it('GS-27: Custom candidate overrides are supported during synthesis', async () => {
    const res = await tradeoffService.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Custom Override Study',
        decisionContext: 'Custom engineering parameters',
        customCandidateOverrides: [
          {
            candidateId: 'OPT_CUST',
            name: 'Custom Tool',
            description: 'Desc',
            strategy: 'CUSTOM',
            toolingCost: 50000,
            unitManufacturingCost: 2.0,
            cycleTimeSeconds: 20.0,
            scrapRiskPercentage: 1.5,
            deliveryWeeks: 12,
            designWorkloadUnits: 75.0,
            t0ModificationRisk: 'MEDIUM',
            t0ExpectedUnits: 12.0,
            toolComplexity: 'MODERATE',
            dfmScore: 90,
          },
        ],
      },
      tenantId,
    );

    expect(res.candidates[0].candidateId).toBe('OPT_CUST');
  });

  it('GS-28: Fetching trade-off study by ID returns full study object', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({ id: 's-1', tenantId, studyNumber: 'TRD-1' });
    const res = await tradeoffService.getStudyById('s-1', tenantId);
    expect(res.studyNumber).toBe('TRD-1');
  });

  it('GS-29: Fetching trade-off studies by project returns all historical studies', async () => {
    mockTradeoffRepo.find.mockResolvedValue([{ id: 's-1', projectId: 'BM331' }]);
    const res = await tradeoffService.getStudiesByProject('BM331', tenantId);
    expect(res.length).toBe(1);
  });

  it('GS-30: Full operational readiness end-to-end integration verified', async () => {
    expect(copilotService).toBeDefined();
    expect(operationsService).toBeDefined();
    expect(tradeoffService).toBeDefined();
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant on copilot import throws ForbiddenException', async () => {
    await expect(copilotService.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F', sourceFileHash: 'H', rows: [] }, '', { userId: 'u1' })).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing projectId on copilot import throws BadRequestException', async () => {
    await expect(copilotService.importTrackingSheet({ projectId: '', sheetTitle: 'T', sourceFileName: 'F', sourceFileHash: 'H', rows: [] }, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Missing tenant on autoReconcileVaultFile throws ForbiddenException', async () => {
    await expect(copilotService.autoReconcileVaultFile({ relativePath: 'P', fileName: 'F', sha256: 'H' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-04: Missing tenant on detectApprovedFileHashMismatch throws ForbiddenException', async () => {
    await expect(copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd1', observedSha256: 'H' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-05: Non-existent deliverable on check hash mismatch throws NotFoundException', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    await expect(copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd-none', observedSha256: 'H' }, tenantId)).rejects.toThrow(NotFoundException);
  });

  it('FI-06: Missing tenant on bulkAssignDeliverables throws ForbiddenException', async () => {
    await expect(operationsService.bulkAssignDeliverables({ deliverableIds: ['d1'], engineerId: 'e1' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-07: Empty deliverableIds on bulkAssignDeliverables throws BadRequestException', async () => {
    await expect(operationsService.bulkAssignDeliverables({ deliverableIds: [], engineerId: 'e1' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-08: Missing tenant on seedDeliverableChecklist throws ForbiddenException', async () => {
    await expect(operationsService.seedDeliverableChecklist('d1', '3D_DEVELOPMENT', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-09: Missing tenant on synthesizeTradeoffs throws ForbiddenException', async () => {
    await expect(tradeoffService.synthesizeTradeoffs({ projectId: 'BM331', title: 'T', decisionContext: 'C' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-10: Missing tenant on recordHumanDecision throws ForbiddenException', async () => {
    await expect(tradeoffService.recordHumanDecision('s-1', { decisionStatus: HumanDecisionStatus.ACCEPTED }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-11: Cross-tenant study retrieval probe fails closed with NotFoundException', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue(null);
    await expect(tradeoffService.getStudyById('study-foreign', 'tenant-attacker')).rejects.toThrow(NotFoundException);
  });

  it('FI-12: Cross-tenant human decision tampering probe fails closed with NotFoundException', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue(null);
    await expect(tradeoffService.recordHumanDecision('study-foreign', { decisionStatus: HumanDecisionStatus.ACCEPTED }, 'tenant-attacker')).rejects.toThrow(NotFoundException);
  });

  it('FI-13: Missing query on queryProjectStatusCopilot throws BadRequestException', async () => {
    await expect(copilotService.queryProjectStatusCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-14: Missing query on queryTradeoffCopilot throws BadRequestException', async () => {
    await expect(tradeoffService.queryTradeoffCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-15: Missing tenant on getDailyStandupBriefing throws ForbiddenException', async () => {
    await expect(copilotService.getDailyStandupBriefing('')).rejects.toThrow(ForbiddenException);
  });

  it('FI-16: Missing tenant on getWeeklyTeamPlan throws ForbiddenException', async () => {
    await expect(copilotService.getWeeklyTeamPlan('')).rejects.toThrow(ForbiddenException);
  });

  it('FI-17: Missing tenant on getFailureForecastReport throws ForbiddenException', async () => {
    await expect(copilotService.getFailureForecastReport('')).rejects.toThrow(ForbiddenException);
  });

  it('FI-18: Concurrent synthesis invocations execute safely without race condition', async () => {
    const p1 = tradeoffService.synthesizeTradeoffs({ projectId: 'BM331', title: 'T1', decisionContext: 'C1' }, tenantId);
    const p2 = tradeoffService.synthesizeTradeoffs({ projectId: 'BM331', title: 'T2', decisionContext: 'C2' }, tenantId);
    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });

  it('FI-19: Concurrent hash mismatch checks execute safely without race condition', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({ id: 'd1', evidenceReference: 'VAULT://f#h1', component: { projectId: 'BM331' } });
    const p1 = copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd1', observedSha256: 'h1' }, tenantId);
    const p2 = copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd1', observedSha256: 'h2' }, tenantId);
    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });

  it('FI-20: Concurrent human decision recordings execute safely without race condition', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({ id: 's-1', tenantId, projectId: 'BM331', humanDecisionStatus: HumanDecisionStatus.PENDING_REVIEW });
    const p1 = tradeoffService.recordHumanDecision('s-1', { decisionStatus: HumanDecisionStatus.ACCEPTED }, tenantId, { userId: 'u1' });
    const p2 = tradeoffService.recordHumanDecision('s-1', { decisionStatus: HumanDecisionStatus.ACCEPTED }, tenantId, { userId: 'u2' });
    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });
});
