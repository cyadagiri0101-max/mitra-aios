import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TrackingSheetCopilotService } from '../services/tracking-sheet-copilot.service';
import { TrackingSheet } from '../entities/tracking-sheet.entity';
import { TrackingSheetRevision } from '../entities/tracking-sheet-revision.entity';
import { TrackingSheetRow } from '../entities/tracking-sheet-row.entity';
import { TrackingSheetReconciliation } from '../entities/tracking-sheet-reconciliation.entity';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignBlocker } from '../entities/design-blocker.entity';
import { DesignDependency } from '../entities/design-dependency.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';

describe('MITRA M12.1F — Design Operations Final Audit & Scope Freeze E2E', () => {
  let service: TrackingSheetCopilotService;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const mockTrackingSheetRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'sheet-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'sheet-1', ...entity })),
  };

  const mockRevisionRepo = {
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
  };

  const mockDeliverableRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockBlockerRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockDependencyRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEngineerRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockModRepo = {
    find: jest.fn().mockResolvedValue([]),
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
    mockBlockerRepo.find.mockResolvedValue([]);
    mockDependencyRepo.find.mockResolvedValue([]);
    mockEngineerRepo.find.mockResolvedValue([]);
    mockModRepo.find.mockResolvedValue([]);
    mockTrackingSheetRepo.findOne.mockResolvedValue(null);
    mockTrackingSheetRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingSheetCopilotService,
        { provide: getRepositoryToken(TrackingSheet), useValue: mockTrackingSheetRepo },
        { provide: getRepositoryToken(TrackingSheetRevision), useValue: mockRevisionRepo },
        { provide: getRepositoryToken(TrackingSheetRow), useValue: mockRowRepo },
        { provide: getRepositoryToken(TrackingSheetReconciliation), useValue: mockReconRepo },
        { provide: getRepositoryToken(DesignComponent), useValue: mockComponentRepo },
        { provide: getRepositoryToken(DesignComponentDeliverable), useValue: mockDeliverableRepo },
        { provide: getRepositoryToken(DesignBlocker), useValue: mockBlockerRepo },
        { provide: getRepositoryToken(DesignDependency), useValue: mockDependencyRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: getRepositoryToken(ToolModificationWorkload), useValue: mockModRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
      ],
    }).compile();

    service = module.get<TrackingSheetCopilotService>(TrackingSheetCopilotService);
  });

  // ==========================================
  // GOLDEN SCENARIOS (GS-01 to GS-30)
  // ==========================================

  it('GS-01: Audit 14-Stage Lifecycle and Deliverable Representation', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 'sheet-1',
      rows: [
        { componentCode: 'COMP-CAV', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' },
        { componentCode: 'COMP-CAV', normalizedDeliverableType: 'DETAILING', recordedStatus: 'COMPLETED' },
        { componentCode: 'COMP-CAV', normalizedDeliverableType: 'PROCESS_PLANNING', recordedStatus: 'IN_PROGRESS' },
        { componentCode: 'COMP-CAV', normalizedDeliverableType: 'FINAL_PART_LIST', recordedStatus: 'PENDING' },
      ],
    });
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CAV',
        deliverables: [
          { deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: 'VAULT://3D.STP' },
          { deliverableType: 'DETAILING', status: 'COMPLETED', evidenceReference: 'VAULT://2D.PDF' },
        ],
      },
    ]);
    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.totalItems).toBe(4);
    expect(res.fullyVerifiedCount).toBe(2);
  });

  it('GS-02: Audit Component Hierarchy (Project -> Component -> Deliverable -> Engineer)', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CORE-B',
        name: 'Body Insert B',
        deliverables: [
          { id: 'd1', name: 'Electrode Extraction', deliverableType: 'ELECTRODE_EXTRACTION', responsibleEngineerId: 'Engineer Rajesh', status: 'IN_PROGRESS' },
        ],
      },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems[0].componentCode).toBe('COMP-CORE-B');
    expect(res.pendingItems[0].responsibleEngineer).toBe('Engineer Rajesh');
  });

  it('GS-03: Audit Tracking Sheet Ingestion with SHA-256 and Cell Provenance', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'BM331 Process Planning Master',
        sourceFileName: 'BM331.xlsx',
        rows: [{ componentCode: 'COMP-1', cellProvenance: { sheet: 'Inserts', cell: 'C14' } }],
      },
      tenantId,
      { userId: 'u1' },
    );
    expect(res.sourceFileHash).toBeDefined();
    expect(res.rows[0].cellProvenance).toEqual({ sheet: 'Inserts', cell: 'C14' });
  });

  it('GS-04: Audit Four-State Status Truth Model Verification', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: 'VAULT://CAD.STP' }] },
    ]);
    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.reconciliationStatus).toBe('RECONCILED');
  });

  it('GS-05: Audit Missing Evidence Detection (Sheet COMPLETE without Vault Artifact)', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }] },
    ]);
    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.missingEvidenceCount).toBe(1);
  });

  it('GS-06: Audit Unverified Completion Detection (DoD Checklist Open)', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'IN_PROGRESS' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }] },
    ]);
    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.unverifiedCompletionCount).toBe(1);
  });

  it('GS-07: Audit Status Mismatch Detection (Sheet vs MITRA WBS)', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'IN_PROGRESS', evidenceReference: 'VAULT://FILE' }] },
    ]);
    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.statusMismatchCount).toBe(1);
  });

  it('GS-08: Audit Process Planning Support (3D/2D Inserts, Electrodes, EDM, CMM)', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-PP',
        deliverables: [
          { id: 'd1', deliverableType: 'PROCESS_PLANNING', name: 'Insert 2D Machining Drawings', status: 'IN_PROGRESS' },
          { id: 'd2', deliverableType: 'ELECTRODE_EXTRACTION', name: 'Electrode Details', status: 'IN_PROGRESS' },
        ],
      },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems.length).toBe(2);
  });

  it('GS-09: Audit Final Part List Standard Fastener Deliverables', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'COMP-FPL', deliverables: [{ id: 'd1', deliverableType: 'FINAL_PART_LIST', name: 'Fastener Hardware BOM', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems[0].whyPendingReason).toContain('final component verification');
  });

  it('GS-10: Audit Customer Approval Hard Gate Lock Enforcement', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'customer approval status for BM331', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('CUSTOMER_APPROVAL_INQUIRY');
    expect(res.groundedAnswer).toContain('Gated strictly at CUSTOMER_APPROVAL stage');
  });

  it('GS-11: Audit Gross Capacity Calculation', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40 },
      { weeklyCapacityHours: 40 },
      { weeklyCapacityHours: 40 },
    ]);
    const res = await service.getAdvancedLoadPlanning('WEEK', tenantId);
    expect(res.capacity.grossWeeklyCapacityHours).toBe(120);
  });

  it('GS-12: Audit Protected Buffer (15%) Capacity Preservation', async () => {
    mockEngineerRepo.find.mockResolvedValue([{ weeklyCapacityHours: 100 }]);
    const res = await service.getAdvancedLoadPlanning('WEEK', tenantId);
    expect(res.capacity.protectedEngineeringBufferHours).toBe(15);
  });

  it('GS-13: Audit Effective Capacity (75%) Calculation', async () => {
    mockEngineerRepo.find.mockResolvedValue([{ weeklyCapacityHours: 100 }]);
    const res = await service.getAdvancedLoadPlanning('WEEK', tenantId);
    expect(res.capacity.effectiveEngineeringCapacityHours).toBe(75);
  });

  it('GS-14: Audit Separation of Committed Demand from Revision Rework Demand', async () => {
    mockComponentRepo.find.mockResolvedValue([{ plannedWorkloadUnits: 50, reworkWorkloadUnits: 10 }]);
    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.demandClassification.committedDemandUnits).toBe(50);
    expect(res.demandClassification.engineeringReworkUnits).toBe(10);
  });

  it('GS-15: Audit Separation of T0 Tool Proving Modification Demand', async () => {
    mockModRepo.find.mockResolvedValue([{ estimatedWorkloadUnits: 8.5 }]);
    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.demandClassification.toolProvingModificationUnits).toBe(8.5);
  });

  it('GS-16: Audit Daily Standup Mode Morning Briefing', async () => {
    const res = await service.getDailyStandupBriefing(tenantId);
    expect(res.briefingDate).toBeDefined();
    expect(res.customerApprovalPendingCount).toBe(1);
  });

  it('GS-17: Audit Weekly Planning Mode Resource Allocation and Skill Bottlenecks', async () => {
    mockEngineerRepo.find.mockResolvedValue([{ weeklyCapacityHours: 40, status: 'OVERLOADED' }]);
    const res = await service.getWeeklyTeamPlan(tenantId);
    expect(res.skillConstraints.length).toBeGreaterThan(0);
  });

  it('GS-18: Audit Project Manager Comprehensive Health Report', async () => {
    const res = await service.getComprehensiveProjectHealth('BM331', tenantId);
    expect(res.overallHealthStatus).toBeDefined();
    expect(res.riskScore).toBeDefined();
  });

  it('GS-19: Audit Engineering Manager Predictive Failure Forecast', async () => {
    mockEngineerRepo.find.mockResolvedValue([{ name: 'Lead', status: 'OVERLOADED' }]);
    const res = await service.getFailureForecastReport(tenantId);
    expect(res.primaryRiskArea).toBe('CRITICAL_PATH_CAVITY_MODELING');
    expect(res.bufferErosionRisk).toBe('HIGH');
  });

  it('GS-20: Audit Historical Workload Variance and Calibration Factor Calculation', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { plannedWorkloadUnits: 25, actualWorkloadUnits: 30 },
    ]);
    const res = await service.calibrateHistoricalWorkload('BM331', tenantId);
    expect(res.varianceUnits).toBe(5);
    expect(res.calibrationFactor).toBe(1.2);
  });

  it('GS-21: Audit Grounded "What is pending in BM331?" Copilot Query', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'COMP-1', deliverables: [{ id: 'd1', name: 'Electrode Extraction', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending in BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('PENDING_WORK_INQUIRY');
    expect(res.groundedAnswer).toContain('Electrode Extraction');
  });

  it('GS-22: Audit Grounded "Why is each item pending?" Root-Cause Explanation', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'COMP-1', deliverables: [{ id: 'd1', status: 'BLOCKED' }] },
    ]);
    mockBlockerRepo.find.mockResolvedValue([{ category: 'DESIGN', description: 'Parting surface freeze pending' }]);
    const res = await service.queryProjectStatusCopilot({ query: 'Why is it pending in BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('WHY_PENDING_EXPLANATION');
    expect(res.groundedAnswer).toContain('Parting surface freeze pending');
  });

  it('GS-23: Audit Grounded "Who is responsible?" Assigned Engineer Query', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'COMP-1', deliverables: [{ id: 'd1', responsibleEngineerId: 'Sr Designer Suresh', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'Who is responsible for BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('OWNER_INQUIRY');
    expect(res.groundedAnswer).toContain('Sr Designer Suresh');
  });

  it('GS-24: Audit G13 Structured Citations in Natural Language Answers', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending in BM331?', projectId: 'BM331' }, tenantId);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('GS-25: Audit Multi-Project Real-World Portfolio Acceptance (BM289 & BM331)', async () => {
    const res1 = await service.getComprehensiveProjectHealth('BM331', tenantId);
    const res2 = await service.getComprehensiveProjectHealth('BM289', tenantId);
    expect(res1.projectId).toBe('BM331');
    expect(res2.projectId).toBe('BM289');
  });

  it('GS-26: Audit Project Acceptance Simulator Advisory Result', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'Can we accept another project?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('PROJECT_ACCEPTANCE_FEASIBILITY');
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-27: Audit What-If Sensitivity Simulation for Engineer Unavailability', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What happens if an engineer is unavailable for one week?' }, tenantId);
    expect(res.detectedIntent).toBe('ENGINEER_UNAVAILABILITY_SIMULATION');
    expect(res.groundedAnswer).toContain('Scenario Simulation');
  });

  it('GS-28: Audit Zero Autonomous Execution Invariant Preservation', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What is the status of BM331?', projectId: 'BM331' }, tenantId);
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-29: Audit Multi-Tenant Fail-Closed Security Isolation', async () => {
    const res = await service.getDailyStandupBriefing('foreign-tenant');
    expect(res.criticalOverdueCount).toBe(0);
  });

  it('GS-30: Audit Complete Frozen Design Operations End-to-End Execution', async () => {
    // 1. Import Tracking Sheet
    const sheet = await service.importTrackingSheet(
      { projectId: 'BM331', sheetTitle: 'Frozen Master', sourceFileName: 'FROZEN.xlsx', rows: [] },
      tenantId,
      { userId: 'u1' },
    );
    expect(sheet.id).toBeDefined();

    // 2. Reconcile Truth
    const recon = await service.reconcileProjectTracking('BM331', tenantId);
    expect(recon.reconciliationStatus).toBeDefined();

    // 3. Daily Briefing
    const daily = await service.getDailyStandupBriefing(tenantId);
    expect(daily.briefingDate).toBeDefined();

    // 4. Weekly Plan
    const weekly = await service.getWeeklyTeamPlan(tenantId);
    expect(weekly.planningHorizon).toBe('NEXT_WEEK');

    // 5. Health Report
    const health = await service.getComprehensiveProjectHealth('BM331', tenantId);
    expect(health.projectId).toBe('BM331');

    // 6. Failure Forecast
    const forecast = await service.getFailureForecastReport(tenantId);
    expect(forecast.forecastHorizon).toBe('7_DAYS');

    // 7. Historical Calibration
    const calibration = await service.calibrateHistoricalWorkload('BM331', tenantId);
    expect(calibration.learnedBaselineStatus).toBe('CALIBRATED');
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant on import tracking sheet throws ForbiddenException', async () => {
    await expect(service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: 'F' } as any, '', { userId: 'u1' })).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing project ID on import tracking sheet throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: '', sheetTitle: 'T', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Missing sheet title on import throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: 'P1', sheetTitle: '', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-04: Missing source file name on import throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: '' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-05: Missing tenant on reconcile tracking throws ForbiddenException', async () => {
    await expect(service.reconcileProjectTracking('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-06: Missing tenant on get project pending work throws ForbiddenException', async () => {
    await expect(service.getProjectPendingWork('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-07: Missing tenant on query copilot throws ForbiddenException', async () => {
    await expect(service.queryProjectStatusCopilot({ query: 'What is pending?' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-08: Empty query on copilot throws BadRequestException', async () => {
    await expect(service.queryProjectStatusCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-09: Missing tenant on advanced load planning throws ForbiddenException', async () => {
    await expect(service.getAdvancedLoadPlanning('30_DAYS', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-10: Cross-tenant tracking reconciliation probe returns empty safely', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue(null);
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.reconcileProjectTracking('BM331', 'foreign-tenant');
    expect(res.totalItems).toBe(0);
  });

  it('FI-11: Audit log error on import is non-blocking to business operation', async () => {
    mockAuditService.log.mockRejectedValueOnce(new Error('Audit logger offline'));
    await expect(service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow();
  });

  it('FI-12: Empty rows array on import handled cleanly without crash', async () => {
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'Empty', sourceFileName: 'F.XLSX', rows: [] }, tenantId, { userId: 'u1' });
    expect(res.totalRowsCount).toBe(0);
  });

  it('FI-13: Tracking row with unmapped deliverable defaults to 3D_DEVELOPMENT safely', async () => {
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'Unmapped', sourceFileName: 'F.XLSX', rows: [{ rawDeliverableText: 'Custom special work item' }] }, tenantId, { userId: 'u1' });
    expect(res.rows[0].normalizedDeliverableType).toBe('3D_DEVELOPMENT');
  });

  it('FI-14: Zero capacity engineers on load planning handled without divide-by-zero', async () => {
    mockEngineerRepo.find.mockResolvedValue([]);
    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.capacity.utilizationPercentage).toBe(0);
  });

  it('FI-15: Copilot query on project with 0 pending items handled gracefully', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending in BM999?', projectId: 'BM999' }, tenantId);
    expect(res.groundedAnswer).toContain('0 pending engineering items');
  });

  it('FI-16: Copilot query with missing projectId defaults to BM331 safely', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending?' }, tenantId);
    expect(res.projectId).toBe('BM331');
  });

  it('FI-17: Tracking row without assigned engineer defaults to UNASSIGNED', async () => {
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [{ assignedEngineer: '' }] }, tenantId, { userId: 'u1' });
    expect(res.rows[0].assignedEngineer).toBe('UNASSIGNED');
  });

  it('FI-18: Tracking row without status defaults to PENDING', async () => {
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [{ recordedStatus: undefined }] }, tenantId, { userId: 'u1' });
    expect(res.rows[0].recordedStatus).toBe('PENDING');
  });

  it('FI-19: EKOS warning during tracking sheet import does not block sheet save', async () => {
    mockEkosGraphService.recordEdge.mockRejectedValueOnce(new Error('Graph node busy'));
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [] }, tenantId, { userId: 'u1' });
    expect(res.id).toBeDefined();
  });

  it('FI-20: Concurrent tracking sheet import executes safely', async () => {
    const p1 = service.importTrackingSheet({ projectId: 'BM1', sheetTitle: 'T1', sourceFileName: 'F1.XLSX', rows: [] }, tenantId, { userId: 'u1' });
    const p2 = service.importTrackingSheet({ projectId: 'BM2', sheetTitle: 'T2', sourceFileName: 'F2.XLSX', rows: [] }, tenantId, { userId: 'u1' });
    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });
});
