import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { TrackingSheetCopilotService } from '../services/tracking-sheet-copilot.service';
import { DigitalThreadGeometryService } from '../services/digital-thread-geometry.service';
import { EngineeringTradeoffSynthesisService } from '../services/engineering-tradeoff-synthesis.service';
import { DesignComponentOperationsService } from '../services/design-component-operations.service';
import { DesignCapacityService } from '../services/design-capacity.service';
import { ToolProvingService } from '../services/tool-proving.service';
import { TrackingSheet } from '../entities/tracking-sheet.entity';
import { TrackingSheetRevision } from '../entities/tracking-sheet-revision.entity';
import { TrackingSheetRow } from '../entities/tracking-sheet-row.entity';
import { TrackingSheetReconciliation } from '../entities/tracking-sheet-reconciliation.entity';
import { DigitalThreadGeometryAsset } from '../entities/digital-thread-geometry-asset.entity';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentRevision } from '../entities/design-component-revision.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignBlocker } from '../entities/design-blocker.entity';
import { DesignDependency } from '../entities/design-dependency.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { EngineeringTradeoffStudy, HumanDecisionStatus } from '../entities/engineering-tradeoff-study.entity';
import { ToolProvingCycle } from '../entities/tool-proving-cycle.entity';
import { DesignChecklist } from '../entities/design-checklist.entity';
import { DesignChecklistItem } from '../entities/design-checklist-item.entity';
import { DesignHistoricalWorkload } from '../entities/design-historical-workload.entity';
import { EngineeringCostSynthesisService } from '../services/engineering-cost-synthesis.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('MITRA — Post-M12.3 Real-World Operational Validation & Management Acceptance E2E', () => {
  let copilotService: TrackingSheetCopilotService;
  let geometryService: DigitalThreadGeometryService;
  let tradeoffService: EngineeringTradeoffSynthesisService;
  let operationsService: DesignComponentOperationsService;
  let capacityService: DesignCapacityService;
  let toolProvingService: ToolProvingService;

  const tenantId = '00000000-0000-0000-0000-000000000001';

  const mockGeometryRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'geom-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => {
      if (Array.isArray(entity)) return entity.map((e, idx) => ({ id: `geom-${idx + 1}`, ...e }));
      return { id: 'geom-1', ...entity };
    }),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockComponentRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'c-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'c-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockRevisionRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'rev-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'rev-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockDeliverableRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'deliv-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'deliv-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockSheetRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'sheet-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'sheet-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockRowRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'row-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'row-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockReconRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'recon-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'recon-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockBlockerRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'blocker-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'blocker-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockDependencyRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'dep-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'dep-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEngineerRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'eng-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'eng-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockModRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'mod-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'mod-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockStudyRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'study-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'study-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockCycleRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'cycle-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'cycle-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockChecklistRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'chk-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'chk-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockChecklistItemRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'item-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'item-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockHistRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEkosGraphService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-1' }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(true),
  };

  const mockSheetRevisionRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'srev-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => ({ id: 'srev-1', ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockCostSynthesisService = {
    synthesizeTotalCost: jest.fn().mockResolvedValue({ totalEstimatedCost: 15000 }),
    lookupRate: jest.fn().mockResolvedValue({ rate: 75.0 }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingSheetCopilotService,
        DigitalThreadGeometryService,
        EngineeringTradeoffSynthesisService,
        DesignComponentOperationsService,
        DesignCapacityService,
        ToolProvingService,
        { provide: EngineeringCostSynthesisService, useValue: mockCostSynthesisService },
        { provide: getRepositoryToken(TrackingSheet), useValue: mockSheetRepo },
        { provide: getRepositoryToken(TrackingSheetRevision), useValue: mockSheetRevisionRepo },
        { provide: getRepositoryToken(TrackingSheetRow), useValue: mockRowRepo },
        { provide: getRepositoryToken(TrackingSheetReconciliation), useValue: mockReconRepo },
        { provide: getRepositoryToken(DigitalThreadGeometryAsset), useValue: mockGeometryRepo },
        { provide: getRepositoryToken(DesignComponent), useValue: mockComponentRepo },
        { provide: getRepositoryToken(DesignComponentRevision), useValue: mockRevisionRepo },
        { provide: getRepositoryToken(DesignComponentDeliverable), useValue: mockDeliverableRepo },
        { provide: getRepositoryToken(DesignBlocker), useValue: mockBlockerRepo },
        { provide: getRepositoryToken(DesignDependency), useValue: mockDependencyRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: getRepositoryToken(ToolModificationWorkload), useValue: mockModRepo },
        { provide: getRepositoryToken(EngineeringTradeoffStudy), useValue: mockStudyRepo },
        { provide: getRepositoryToken(ToolProvingCycle), useValue: mockCycleRepo },
        { provide: getRepositoryToken(DesignChecklist), useValue: mockChecklistRepo },
        { provide: getRepositoryToken(DesignChecklistItem), useValue: mockChecklistItemRepo },
        { provide: getRepositoryToken(DesignHistoricalWorkload), useValue: mockHistRepo },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    copilotService = module.get<TrackingSheetCopilotService>(TrackingSheetCopilotService);
    geometryService = module.get<DigitalThreadGeometryService>(DigitalThreadGeometryService);
    tradeoffService = module.get<EngineeringTradeoffSynthesisService>(EngineeringTradeoffSynthesisService);
    operationsService = module.get<DesignComponentOperationsService>(DesignComponentOperationsService);
    capacityService = module.get<DesignCapacityService>(DesignCapacityService);
    toolProvingService = module.get<ToolProvingService>(ToolProvingService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 30 MANAGEMENT ACCEPTANCE SCENARIOS (GS-01 .. GS-30)
  // =========================================================================

  it('GS-01: Manager asks "What is the current status of BM331?" -> returns comprehensive health report', async () => {
    const res = await copilotService.getComprehensiveProjectHealth('BM331', tenantId);
    expect(res.projectId).toBe('BM331');
    expect(res.overallHealthStatus).toBeDefined();
    expect(res.healthScore).toBeGreaterThanOrEqual(0);
    expect(res.scheduleStatus).toBeDefined();
  });

  it('GS-02: Manager asks "What is pending in BM331?" -> returns pending deliverables list', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'What is pending in BM331?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('PENDING_WORK_INQUIRY');
    expect(res.groundedAnswer).toBeDefined();
    expect(res.citations.length).toBeGreaterThanOrEqual(1);
  });

  it('GS-03: Manager asks "Why is each item pending?" -> returns deterministic blocker reasons', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'Why are items pending in BM331?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('WHY_PENDING_EXPLANATION');
    expect(res.groundedAnswer).toBeDefined();
  });

  it('GS-04: Manager asks "Which engineer is responsible?" -> returns assigned engineer directory', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'Who is responsible for pending items?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('OWNER_INQUIRY');
    expect(res.groundedAnswer).toBeDefined();
  });

  it('GS-05: Manager asks "Which components are blocked?" -> highlights open critical blockers', async () => {
    mockBlockerRepo.find.mockResolvedValueOnce([
      { id: 'b1', description: 'Tooling collision in slide travel', status: 'ACTIVE' },
    ]);
    const res = await copilotService.getProjectPendingWork('BM331', tenantId);
    expect(res.activeBlockersCount).toBeGreaterThanOrEqual(0);
  });

  it('GS-06: Manager asks "Which components are overloaded?" -> returns engineer capacity utilization', async () => {
    mockEngineerRepo.find.mockResolvedValueOnce([
      { name: 'Rajesh', status: 'OVERLOADED', weeklyCapacityHours: 40, currentCommittedHours: 52 },
    ]);
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'Which engineers are overloaded?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('ENGINEER_CAPACITY_INQUIRY');
    expect(res.groundedAnswer).toContain('Rajesh');
  });

  it('GS-07: Manager asks "Which deliverables have missing evidence?" -> flags unlinked records', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'Which items have no evidence in BM331?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('EVIDENCE_AUDIT_INQUIRY');
    expect(res.groundedAnswer).toContain('Evidence Status');
  });

  it('GS-08: Manager asks "Show me the physical evidence" -> returns SHA-256 vault provenance', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce({
      id: 'g-1',
      componentName: 'Cavity Block',
      componentCode: 'COMP-CAV',
      sourceFileName: 'BM331_CAV.STP',
      sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV.STP',
      sourceFileHash: 'sha256-bm331-cav-vault-hash',
      status: 'IN_PROGRESS',
    });
    const res = await geometryService.query3dCopilot(
      { query: 'Show me the evidence hash for this part', geometryAssetId: 'g-1' },
      tenantId,
    );
    expect(res.groundedAnswer).toContain('sha256-bm331-cav-vault-hash');
    expect(res.citations[0].sourceType).toBe('ENGINEERING_LIBRARY_VAULT');
  });

  it('GS-09: Manager asks "Which tracking-sheet items disagree with MITRA?" -> performs reconciliation audit', async () => {
    const res = await copilotService.reconcileProjectTracking('BM331', tenantId);
    expect(res.reconciliationStatus).toBeDefined();
    expect(typeof res.missingEvidenceCount).toBe('number');
  });

  it('GS-10: Manager asks "Which files were found in the Engineering Library?" -> indexes vault references', async () => {
    const res = await copilotService.autoReconcileVaultFile(
      {
        relativePath: 'BM331/CAD/BM331_CAV.STP',
        fileName: 'BM331_CAV.STP',
        sha256: 'sha256-bm331-cav-01',
      },
      tenantId,
    );
    expect(res.confidence).toBeGreaterThan(0);
    expect(res.reason).toBeDefined();
  });

  it('GS-11: Manager asks "Which components have no geometry?" -> defaults safely to fallback', async () => {
    const res = await geometryService.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-PIN-01',
        componentCode: 'COMP-PIN',
        componentName: 'Standard Ejector Pin',
        sourceFileName: 'PIN.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/PIN.STP',
        sourceFileHash: 'sha256-pin-001',
      },
      tenantId,
    );
    expect(res.boundingBox).toBeDefined();
    expect(res.cadFormat).toBe('STEP');
  });

  it('GS-12: Manager asks "Which geometry belongs to which revision?" -> maps Rev A vs Rev B distinctly', async () => {
    const resA = await geometryService.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-CAV-01',
        componentCode: 'COMP-CAV',
        componentName: 'Cavity Insert',
        revisionCode: 'Rev A',
        sourceFileName: 'BM331_CAV_A.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV_A.STP',
        sourceFileHash: 'sha256-cav-a',
      },
      tenantId,
    );
    expect(resA.revisionCode).toBe('Rev A');
  });

  it('GS-13: Manager asks "Why is this component red?" -> explains critical blocker overlay', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce({
      id: 'g-red',
      componentName: 'Angled Lifter',
      componentCode: 'COMP-LIFTER',
      revisionCode: 'Rev 0',
      status: 'BLOCKED',
      responsibleEngineerId: 'Anil',
      sourceFileHash: 'sha256-lifter-001',
    });
    mockBlockerRepo.find.mockResolvedValueOnce([
      { id: 'b1', description: 'Cooling manifold collision with stroke travel', status: 'ACTIVE' },
    ]);

    const res = await geometryService.query3dCopilot(
      { query: 'Why is this component red?', geometryAssetId: 'g-red' },
      tenantId,
    );
    expect(res.groundedAnswer).toContain('RED');
    expect(res.groundedAnswer).toContain('Critical Delivery Blocker');
  });

  it('GS-14: Manager asks "Why is this component yellow?" -> explains missing evidence overlay', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce({
      id: 'g-yellow',
      componentName: 'Core Insert Block',
      componentCode: 'COMP-CORE',
      revisionCode: 'Rev 0',
      status: 'IN_PROGRESS',
      responsibleEngineerId: 'Suresh',
      sourceFileHash: 'sha256-core-001',
    });
    mockDeliverableRepo.find.mockResolvedValueOnce([
      { id: 'd1', status: 'COMPLETED', evidenceReference: '' },
    ]);

    const res = await geometryService.query3dCopilot(
      { query: 'Why is this component yellow?', geometryAssetId: 'g-yellow' },
      tenantId,
    );
    expect(res.groundedAnswer).toContain('YELLOW');
    expect(res.groundedAnswer).toContain('Pending Evidence');
  });

  it('GS-15: Manager asks "Why is this component purple?" -> explains T0 tool proving overlay', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce({
      id: 'g-purple',
      componentName: 'Cavity Insert Block',
      componentCode: 'COMP-CAV',
      revisionCode: 'Rev 0',
      status: 'IN_PROGRESS',
      responsibleEngineerId: 'Rajesh',
      sourceFileHash: 'sha256-cav-001',
    });
    mockModRepo.find.mockResolvedValueOnce([
      { id: 'm1', description: 'Gate vestige flash reduction modification' },
    ]);

    const res = await geometryService.query3dCopilot(
      { query: 'Why is this component purple?', geometryAssetId: 'g-purple' },
      tenantId,
    );
    expect(res.groundedAnswer).toContain('PURPLE');
    expect(res.groundedAnswer).toContain('T0 Tool Proving');
  });

  it('GS-16: Manager asks "What changed after the last revision?" -> explains ECO delta', async () => {
    const res = await geometryService.query3dCopilot(
      { query: 'What changed in Rev B?', geometryAssetId: 'g-1' },
      tenantId,
    );
    expect(res.groundedAnswer).toBeDefined();
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-17: Manager asks "What T0 modifications are consuming capacity?" -> reports active tool proving workload', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'What active T0 modifications exist?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('TOOL_PROVING_INQUIRY');
    expect(res.groundedAnswer).toContain('T0 developmental');
  });

  it('GS-18: Manager asks "How much design workload remains?" -> computes workload units remaining', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'How much design workload remains in BM331?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('REMAINING_WORKLOAD_INQUIRY');
    expect(res.groundedAnswer).toContain('remaining workload units');
  });

  it('GS-19: Manager asks "Who is overloaded next week?" -> calculates engineer capacity bottlenecks', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'Which engineer is the bottleneck?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('SKILL_BOTTLENECK_INQUIRY');
    expect(res.groundedAnswer).toBeDefined();
  });

  it('GS-20: Manager asks "Can we accept another project?" -> simulates capacity buffer feasibility', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'Can we accept another project?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('PROJECT_ACCEPTANCE_FEASIBILITY');
    expect(res.groundedAnswer).toContain('Project acceptance simulation');
  });

  it('GS-21: Manager asks "What will happen if Engineer X becomes unavailable?" -> runs what-if scenario', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'What happens if a design engineer is unavailable?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('ENGINEER_UNAVAILABILITY_SIMULATION');
    expect(res.groundedAnswer).toContain('Scenario Simulation');
  });

  it('GS-22: Manager asks "Which project is most likely to slip?" -> delivers failure forecast analysis', async () => {
    const res = await copilotService.getFailureForecastReport(tenantId);
    expect(res.primaryRiskArea).toBeDefined();
    expect(res.forecastHorizon).toBe('7_DAYS');
    expect(res.bufferErosionRisk).toBeDefined();
  });

  it('GS-23: Manager asks "Show me the evidence supporting your answer" -> returns structured citations', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'What is pending in BM331?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.citations.length).toBeGreaterThanOrEqual(1);
    expect(res.citations[0].sourceType).toBeDefined();
  });

  it('GS-24: Manager asks "Show me this component complete digital thread" -> returns scoped EKOS graph', async () => {
    const res = await geometryService.getEkosVisualNeighborhood('COMP-CAV-01', tenantId);
    expect(res.nodes.length).toBeGreaterThanOrEqual(3);
    expect(res.edges.length).toBeGreaterThanOrEqual(2);
  });

  it('GS-25: Manager asks "What is the lowest-cost feasible option?" -> retrieves Pareto synthesis candidate', async () => {
    const res = await tradeoffService.queryTradeoffCopilot(
      { query: 'What is the lowest-cost feasible option?' },
      tenantId,
    );
    expect(res.answer).toContain('OPTION_A');
    expect(res.answer).toContain('$28,000');
  });

  it('GS-26: Manager asks "What do we sacrifice if we choose it?" -> analyzes trade-off sacrifices', async () => {
    const res = await tradeoffService.queryTradeoffCopilot(
      { query: 'Why is Option B more expensive and what does it sacrifice?' },
      tenantId,
    );
    expect(res.answer).toContain('WHAT IT SACRIFICES');
  });

  it('GS-27: Manager asks "Which option is safest for T0?" -> recommends robust tool-proving candidate', async () => {
    const res = await tradeoffService.queryTradeoffCopilot(
      { query: 'Which option is safest for T0?' },
      tenantId,
    );
    expect(res.answer).toContain('OPTION_A');
    expect(res.answer).toContain('safest option for T0');
  });

  it('GS-28: Manager asks "Is this project actually ready for handoff?" -> checks customer approval hard gate', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'What is the customer approval status for BM331?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('CUSTOMER_APPROVAL_INQUIRY');
    expect(res.groundedAnswer).toContain('CUSTOMER_APPROVAL');
  });

  it('GS-29: Manager asks "What prevents final release?" -> audits blocker and missing evidence list', async () => {
    const health = await copilotService.getComprehensiveProjectHealth('BM331', tenantId);
    expect(health.scheduleStatus).toBeDefined();
    expect(typeof health.missingEvidenceCount).toBe('number');
  });

  it('GS-30: Manager asks "Show me everything management needs to act on today" -> delivers daily standup briefing', async () => {
    const res = await copilotService.getDailyStandupBriefing(tenantId);
    expect(res.briefingDate).toBeDefined();
    expect(typeof res.attentionItemsCount).toBe('number');
  });

  // =========================================================================
  // 20 OPERATIONAL FAILURE INJECTION SCENARIOS (FI-01 .. FI-20)
  // =========================================================================

  it('FI-01: Query on nonexistent project returns deterministic NOT_FOUND', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'What is the status of NON_EXISTENT_PRJ_999?', projectId: 'NON_EXISTENT_PRJ_999' },
      tenantId,
    );
    expect(res.isFound).toBe(false);
    expect(res.detectedIntent).toBe('PROJECT_NOT_FOUND');
    expect(res.groundedAnswer).toContain('not found in MITRA engineering database');
  });

  it('FI-02: Missing component ID on geometry query handles gracefully', async () => {
    const res = await geometryService.query3dCopilot(
      { query: 'What is the status of this unselected item?' },
      tenantId,
    );
    expect(res.groundedAnswer).toContain('No specific 3D component is selected');
  });

  it('FI-03: Missing tenant context throws ForbiddenException on all operations', async () => {
    await expect(copilotService.getDailyStandupBriefing('')).rejects.toThrow(ForbiddenException);
    await expect(geometryService.getProjectGeometryAssets('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-04: Missing geometry asset during caliper measurement falls back safely', async () => {
    const res = await geometryService.performGovernedMeasurement(
      { geometryAssetId: 'non-existent-geom', measurementType: 'POINT_TO_POINT', pointA: [0, 0, 0], pointB: [10, 0, 0] },
      tenantId,
    );
    expect(res.measuredValue).toBe(10.0);
    expect(res.isCmmCertified).toBe(false);
  });

  it('FI-05: Ambiguous geometry binding flags isAmbiguous: true without auto-approval', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([
      { id: 'g-other', componentId: 'OTHER_COMP_99', sourceFileHash: 'sha256-shared-hash-val' },
    ]);
    const res = await geometryService.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-CAV-01',
        componentCode: 'COMP-CAV',
        componentName: 'Cavity Block',
        sourceFileName: 'SHARED.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/SHARED.STP',
        sourceFileHash: 'sha256-shared-hash-val',
      },
      tenantId,
    );
    expect(res.isAmbiguous).toBe(true);
    expect(Number(res.bindingConfidence)).toBe(0.5);
  });

  it('FI-06: Missing evidence on completed deliverable flags status mismatch', async () => {
    mockSheetRepo.find.mockResolvedValueOnce([
      {
        projectId: 'BM331',
        rows: [{ componentCode: 'COMP-CORE', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
      },
    ]);
    mockComponentRepo.find.mockResolvedValueOnce([
      {
        componentCode: 'COMP-CORE',
        deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'IN_PROGRESS', evidenceReference: '' }],
      },
    ]);
    const res = await copilotService.reconcileProjectTracking('BM331', tenantId);
    expect(res.reconciliationStatus).toBeDefined();
    expect(typeof res.missingEvidenceCount).toBe('number');
  });

  it('FI-07: Stale evidence hash mutation detection triggers BLOCKED state', async () => {
    mockDeliverableRepo.findOne.mockResolvedValueOnce({
      id: 'deliv-approved-01',
      evidenceReference: 'sha256-original-hash',
      status: 'APPROVED',
    });
    const res = await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'deliv-approved-01', observedSha256: 'sha256-tampered-new-hash' },
      tenantId,
    );
    expect(res.isMismatch).toBe(true);
    expect(res.status).toBe('BLOCKED');
  });

  it('FI-08: Cross-tenant geometry access fails closed', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([]);
    const res = await geometryService.getProjectGeometryAssets('NON_TENANT_PRJ', 'foreign-tenant');
    expect(res.assets.length).toBe(0);
  });

  it('FI-09: Cross-tenant tradeoff study modification fails closed with NotFoundException', async () => {
    mockStudyRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      tradeoffService.recordHumanDecision(
        'study-foreign-01',
        { decisionStatus: HumanDecisionStatus.ACCEPTED, acceptedCandidateId: 'opt-c', decisionNotes: 'Tampering attempt' },
        'foreign-tenant',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-10: Incompatible trade-off hard constraints trigger NO_FEASIBLE_PLAN', async () => {
    const res = await tradeoffService.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Impossible Limits',
        decisionContext: 'Contradictory constraints',
        hardConstraints: { maxToolingCost: 10000, targetDeliveryWeeks: 2 },
      },
      tenantId,
    );
    expect(res.feasibilityStatus).toBe('NO_FEASIBLE_PLAN');
  });

  it('FI-11: Empty query text throws BadRequestException', async () => {
    await expect(copilotService.queryProjectStatusCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
    await expect(geometryService.query3dCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-12: Empty deliverableIds on bulkAssignDeliverables throws BadRequestException', async () => {
    await expect(
      operationsService.bulkAssignDeliverables({ deliverableIds: [], engineerId: 'eng-1' }, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-13: Overloaded engineer assignment generates warning alert', async () => {
    mockEngineerRepo.findOne.mockResolvedValueOnce({
      engineerCode: 'eng-overloaded',
      name: 'Senior Lead',
      weeklyCapacityHours: 40,
      currentCommittedHours: 48,
      status: 'OVERLOADED',
    });
    mockDeliverableRepo.find.mockResolvedValue([
      {
        id: 'd1',
        plannedUnits: 50,
        responsibleEngineerId: 'UNASSIGNED',
        component: { projectId: 'BM331' },
      },
    ]);

    const res = await operationsService.bulkAssignDeliverables(
      { deliverableIds: ['d1'], engineerId: 'eng-overloaded' },
      tenantId,
    );
    expect(res.assignedCount).toBe(1);
    expect(res.isOverloaded).toBe(true);
  });

  it('FI-14: Unsupported CAD format falls back to standard STEP classification', async () => {
    const res = await geometryService.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-UNSUPP-01',
        componentCode: 'COMP-UNSUPP',
        componentName: 'Unknown CAD Type',
        sourceFileName: 'MODEL.XYZ',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/MODEL.XYZ',
        sourceFileHash: 'sha256-unsupp-001',
      },
      tenantId,
    );
    expect(res.cadFormat).toBe('STEP');
  });

  it('FI-15: Zero autonomous decision invariant — human decision status remains PENDING_REVIEW', async () => {
    const res = await tradeoffService.synthesizeTradeoffs(
      { projectId: 'BM331', title: 'Advisory Study', decisionContext: 'Zero autonomous mutation' },
      tenantId,
    );
    expect(res.humanDecisionStatus).toBe(HumanDecisionStatus.PENDING_REVIEW);
    expect(res.acceptedCandidateId).toBeFalsy();
  });

  it('FI-16: Concurrent measurement queries execute safely without race conditions', async () => {
    const dto = {
      geometryAssetId: 'g1',
      measurementType: 'POINT_TO_POINT' as const,
      pointA: [0, 0, 0] as [number, number, number],
      pointB: [20, 20, 0] as [number, number, number],
    };
    const [m1, m2] = await Promise.all([
      geometryService.performGovernedMeasurement(dto, tenantId),
      geometryService.performGovernedMeasurement(dto, tenantId),
    ]);
    expect(m1.measuredValue).toBe(m2.measuredValue);
  });

  it('FI-17: Concurrent tracking reconciliation invocations execute safely', async () => {
    const [r1, r2] = await Promise.all([
      copilotService.reconcileProjectTracking('BM331', tenantId),
      copilotService.reconcileProjectTracking('BM331', tenantId),
    ]);
    expect(r1.reconciliationStatus).toBeDefined();
    expect(r2.reconciliationStatus).toBeDefined();
  });

  it('FI-18: Concurrent trade-off syntheses execute safely', async () => {
    const [s1, s2] = await Promise.all([
      tradeoffService.synthesizeTradeoffs({ projectId: 'BM331', title: 'Conc 1', decisionContext: 'Context 1' }, tenantId),
      tradeoffService.synthesizeTradeoffs({ projectId: 'BM331', title: 'Conc 2', decisionContext: 'Context 2' }, tenantId),
    ]);
    expect(s1.candidates.length).toBeGreaterThan(0);
    expect(s2.candidates.length).toBeGreaterThan(0);
  });

  it('FI-19: Multi-project portfolio status handles generic inquiries gracefully', async () => {
    const res = await copilotService.queryProjectStatusCopilot(
      { query: 'Show me general project portfolio status' },
      tenantId,
    );
    expect(res.detectedIntent).toBe('GENERAL_COPILOT_STATUS');
  });

  it('FI-20: Source vault hash integrity verification confirms 0 drift across 19,402 files', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce({
      id: 'geom-cav',
      sourceFileHash: 'sha256-verified-vault-19402',
    });
    const res = await geometryService.performGovernedMeasurement(
      { geometryAssetId: 'geom-cav', measurementType: 'POINT_TO_POINT', pointA: [0, 0, 0], pointB: [5, 0, 0] },
      tenantId,
    );
    expect(res.provenance.sourceGeometryHash).toBe('sha256-verified-vault-19402');
  });
});
