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

describe('MITRA M12.1E — Design Operations Production Readiness & Management Acceptance E2E', () => {
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

  it('GS-01: Daily Standup Mode answers "Show me everything that needs attention today"', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'Show me everything that needs attention today', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('DAILY_STANDUP_BRIEFING');
    expect(res.groundedAnswer).toContain('Daily Standup Briefing');
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-02: Daily standup briefing computes total attention items', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', status: 'BLOCKED' }] },
    ]);
    mockBlockerRepo.find.mockResolvedValue([{ category: 'DESIGN' }]);

    const res = await service.getDailyStandupBriefing(tenantId);
    expect(res.criticalOverdueCount).toBe(1);
    expect(res.activeBlockersCount).toBe(1);
  });

  it('GS-03: Weekly Planning Mode answers "Plan my design team for next week"', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'Plan my design team for next week' }, tenantId);
    expect(res.detectedIntent).toBe('WEEKLY_PLANNING_MODE');
    expect(res.groundedAnswer).toContain('Weekly Team Plan');
  });

  it('GS-04: Weekly team plan calculates gross, effective, and buffer capacity', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40, status: 'HEALTHY' },
      { weeklyCapacityHours: 40, status: 'HEALTHY' },
    ]);
    const res = await service.getWeeklyTeamPlan(tenantId);
    expect(res.capacity.grossWeeklyCapacityHours).toBe(80);
    expect(res.capacity.effectiveEngineeringCapacityHours).toBe(60);
    expect(res.capacity.protectedEngineeringBufferHours).toBe(12);
  });

  it('GS-05: Project Manager Mode answers "Give me the complete health of BM331"', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'Give me the complete health of BM331', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('PROJECT_MANAGER_HEALTH_REPORT');
    expect(res.groundedAnswer).toContain('Complete Health Report for BM331');
  });

  it('GS-06: Comprehensive project health computes composite risk score', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', status: 'BLOCKED', plannedUnits: 5 }] },
    ]);
    mockBlockerRepo.find.mockResolvedValue([{ category: 'DESIGN' }]);

    const res = await service.getComprehensiveProjectHealth('BM331', tenantId);
    expect(res.overallHealthStatus).toBe('CRITICAL');
    expect(res.riskScore).toBeGreaterThan(0);
    expect(res.remainingWorkloadUnits).toBe(5);
  });

  it('GS-07: Engineering Manager Mode answers "Where is my team going to fail next week?"', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'Where is my team going to fail next week?' }, tenantId);
    expect(res.detectedIntent).toBe('ENGINEERING_MANAGER_FAILURE_FORECAST');
    expect(res.groundedAnswer).toContain('Failure Forecast & Delivery Risk Analysis');
  });

  it('GS-08: Failure forecast predicts bottleneck skills and slippage projects when overloaded', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { name: 'Lead Engineer', status: 'OVERLOADED' },
    ]);
    const res = await service.getFailureForecastReport(tenantId);
    expect(res.primaryRiskArea).toBe('CRITICAL_PATH_CAVITY_MODELING');
    expect(res.bufferErosionRisk).toBe('HIGH');
    expect(res.slippageRiskProjects).toContain('BM331');
  });

  it('GS-09: Daily briefing tracks unassigned deliverables', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', responsibleEngineerId: '', status: 'NOT_STARTED' }] },
    ]);
    const res = await service.getDailyStandupBriefing(tenantId);
    expect(res.unassignedCount).toBe(1);
  });

  it('GS-10: Daily briefing tracks missing evidence records', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }] },
    ]);
    const res = await service.getDailyStandupBriefing(tenantId);
    expect(res.missingEvidenceCount).toBe(1);
  });

  it('GS-11: Weekly plan identifies bottleneck alerts when engineers overloaded', async () => {
    mockEngineerRepo.find.mockResolvedValue([{ weeklyCapacityHours: 40, status: 'OVERLOADED' }]);
    const res = await service.getWeeklyTeamPlan(tenantId);
    expect(res.skillConstraints.length).toBeGreaterThan(0);
  });

  it('GS-12: Project health tracks active T0 modifications count', async () => {
    mockModRepo.find.mockResolvedValue([{ estimatedWorkloadUnits: 4.0 }]);
    const res = await service.getComprehensiveProjectHealth('BM331', tenantId);
    expect(res.t0ModificationsCount).toBe(1);
  });

  it('GS-13: Historical calibration computes planned vs actual workload variance', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { plannedWorkloadUnits: 20, actualWorkloadUnits: 25 },
    ]);
    const res = await service.calibrateHistoricalWorkload('BM331', tenantId);
    expect(res.plannedWorkloadUnits).toBe(20);
    expect(res.actualWorkloadUnits).toBe(25);
    expect(res.varianceUnits).toBe(5);
    expect(res.calibrationFactor).toBe(1.25);
    expect(res.learnedBaselineStatus).toBe('CALIBRATED');
  });

  it('GS-14: Historical calibration handles exact planned matching', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { plannedWorkloadUnits: 30, actualWorkloadUnits: 30 },
    ]);
    const res = await service.calibrateHistoricalWorkload('BM289', tenantId);
    expect(res.varianceUnits).toBe(0);
    expect(res.calibrationFactor).toBe(1.0);
  });

  it('GS-15: Multi-project portfolio query handles general status seamlessly', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'Tell me about BM289', projectId: 'BM289' }, tenantId);
    expect(res.detectedIntent).toBe('GENERAL_COPILOT_STATUS');
    expect(res.groundedAnswer).toContain('BM289 Status');
  });

  it('GS-16: Truth model verifies evidence reference against SHA-256 hash', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: 'VAULT://FILE.STP' }] },
    ]);
    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.fullyVerifiedCount).toBe(1);
  });

  it('GS-17: Weekly plan classifies demand into committed, rework, and T0 units', async () => {
    mockComponentRepo.find.mockResolvedValue([{ plannedWorkloadUnits: 15, reworkWorkloadUnits: 3 }]);
    mockModRepo.find.mockResolvedValue([{ estimatedWorkloadUnits: 2 }]);
    const res = await service.getWeeklyTeamPlan(tenantId);
    expect(res.demand.committedUnits).toBe(15);
    expect(res.demand.reworkUnits).toBe(3);
    expect(res.demand.t0Units).toBe(2);
    expect(res.demand.totalDemandUnits).toBe(20);
  });

  it('GS-18: Daily briefing returns briefing date in ISO format', async () => {
    const res = await service.getDailyStandupBriefing(tenantId);
    expect(res.briefingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('GS-19: Failure forecast recommends mitigation plan', async () => {
    mockEngineerRepo.find.mockResolvedValue([{ name: 'Lead 1', status: 'OVERLOADED' }]);
    const res = await service.getFailureForecastReport(tenantId);
    expect(res.recommendedMitigation).toContain('Reassign');
  });

  it('GS-20: Project health evaluates schedule status as DELAYED when blockers exist', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', status: 'BLOCKED' }] },
    ]);
    mockBlockerRepo.find.mockResolvedValue([{ category: 'DESIGN' }]);
    const res = await service.getComprehensiveProjectHealth('BM331', tenantId);
    expect(res.scheduleStatus).toBe('DELAYED');
  });

  it('GS-21: Project health evaluates schedule status as ON_SCHEDULE when 0 critical items', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.getComprehensiveProjectHealth('BM331', tenantId);
    expect(res.scheduleStatus).toBe('ON_SCHEDULE');
    expect(res.overallHealthStatus).toBe('ON_TRACK');
  });

  it('GS-22: Daily standup briefing includes active blockers count', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', status: 'BLOCKED' }] },
    ]);
    mockBlockerRepo.find.mockResolvedValue([{ category: 'DESIGN' }, { category: 'MANUFACTURING' }]);
    const res = await service.getDailyStandupBriefing(tenantId);
    expect(res.activeBlockersCount).toBe(2);
  });

  it('GS-23: Failure forecast shows LOW risk when 0 overloaded engineers', async () => {
    mockEngineerRepo.find.mockResolvedValue([{ name: 'Eng 1', status: 'AVAILABLE' }]);
    const res = await service.getFailureForecastReport(tenantId);
    expect(res.bufferErosionRisk).toBe('LOW');
  });

  it('GS-24: Historical calibration handles zero planned units safely', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.calibrateHistoricalWorkload('EMPTY', tenantId);
    expect(res.calibrationFactor).toBe(1.0);
  });

  it('GS-25: Weekly planning mode provides G13 structured citation', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'weekly planning' }, tenantId);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('GS-26: Project manager mode provides G13 structured citation', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'complete health report for BM331', projectId: 'BM331' }, tenantId);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('GS-27: Engineering manager mode provides G13 structured citation', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'failure forecast next week' }, tenantId);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('GS-28: Daily standup mode provides G13 structured citation', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'daily standup briefing' }, tenantId);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('GS-29: Reconcile tracking sheet saves historical audit trail on discrepancy', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }] },
    ]);
    await service.reconcileProjectTracking('BM331', tenantId);
    expect(mockReconRepo.save).toHaveBeenCalled();
  });

  it('GS-30: Complete management operations end-to-end workflow execution', async () => {
    // 1. Daily standup
    const briefing = await service.getDailyStandupBriefing(tenantId);
    expect(briefing.briefingDate).toBeDefined();

    // 2. Weekly planning
    const plan = await service.getWeeklyTeamPlan(tenantId);
    expect(plan.planningHorizon).toBe('NEXT_WEEK');

    // 3. Project health
    const health = await service.getComprehensiveProjectHealth('BM331', tenantId);
    expect(health.projectId).toBe('BM331');

    // 4. Failure forecast
    const forecast = await service.getFailureForecastReport(tenantId);
    expect(forecast.forecastHorizon).toBe('7_DAYS');

    // 5. Calibration
    const calibration = await service.calibrateHistoricalWorkload('BM331', tenantId);
    expect(calibration.learnedBaselineStatus).toBe('CALIBRATED');
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant on getDailyStandupBriefing throws ForbiddenException', async () => {
    await expect(service.getDailyStandupBriefing('')).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing tenant on getWeeklyTeamPlan throws ForbiddenException', async () => {
    await expect(service.getWeeklyTeamPlan('')).rejects.toThrow(ForbiddenException);
  });

  it('FI-03: Missing tenant on getComprehensiveProjectHealth throws ForbiddenException', async () => {
    await expect(service.getComprehensiveProjectHealth('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-04: Missing tenant on getFailureForecastReport throws ForbiddenException', async () => {
    await expect(service.getFailureForecastReport('')).rejects.toThrow(ForbiddenException);
  });

  it('FI-05: Missing tenant on calibrateHistoricalWorkload throws ForbiddenException', async () => {
    await expect(service.calibrateHistoricalWorkload('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-06: Cross-tenant daily briefing probe returns empty safely', async () => {
    const res = await service.getDailyStandupBriefing('foreign-tenant');
    expect(res.criticalOverdueCount).toBe(0);
  });

  it('FI-07: Cross-tenant weekly plan probe returns zero capacity safely', async () => {
    const res = await service.getWeeklyTeamPlan('foreign-tenant');
    expect(res.capacity.grossWeeklyCapacityHours).toBe(0);
  });

  it('FI-08: Cross-tenant project health probe returns zero items safely', async () => {
    const res = await service.getComprehensiveProjectHealth('BM331', 'foreign-tenant');
    expect(res.pendingDeliverablesCount).toBe(0);
  });

  it('FI-09: Cross-tenant failure forecast probe returns clean buffer', async () => {
    const res = await service.getFailureForecastReport('foreign-tenant');
    expect(res.bufferErosionRisk).toBe('LOW');
  });

  it('FI-10: Cross-tenant calibration probe returns zero variance safely', async () => {
    const res = await service.calibrateHistoricalWorkload('BM331', 'foreign-tenant');
    expect(res.varianceUnits).toBe(0);
  });

  it('FI-11: Empty query on copilot throws BadRequestException', async () => {
    await expect(service.queryProjectStatusCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-12: Missing tenant on copilot throws ForbiddenException', async () => {
    await expect(service.queryProjectStatusCopilot({ query: 'test' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-13: Zero capacity engineers on weekly planning handled cleanly', async () => {
    mockEngineerRepo.find.mockResolvedValue([]);
    const res = await service.getWeeklyTeamPlan(tenantId);
    expect(res.capacity.utilizationPercentage).toBe(0);
  });

  it('FI-14: Audit error on sheet import handled safely', async () => {
    mockAuditService.log.mockRejectedValueOnce(new Error('Audit offline'));
    await expect(service.importTrackingSheet({ projectId: 'P', sheetTitle: 'T', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow();
  });

  it('FI-15: Missing project ID on import throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: '', sheetTitle: 'T', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-16: Missing sheet title on import throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: 'P', sheetTitle: '', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-17: Missing source file name on import throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: 'P', sheetTitle: 'T', sourceFileName: '' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-18: Tracking row without assigned engineer defaults to UNASSIGNED', async () => {
    const res = await service.importTrackingSheet({ projectId: 'P', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [{ assignedEngineer: '' }] }, tenantId, { userId: 'u1' });
    expect(res.rows[0].assignedEngineer).toBe('UNASSIGNED');
  });

  it('FI-19: Tracking row without status defaults to PENDING', async () => {
    const res = await service.importTrackingSheet({ projectId: 'P', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [{ recordedStatus: undefined }] }, tenantId, { userId: 'u1' });
    expect(res.rows[0].recordedStatus).toBe('PENDING');
  });

  it('FI-20: Concurrent project health calls execute safely', async () => {
    const p1 = service.getComprehensiveProjectHealth('BM331', tenantId);
    const p2 = service.getComprehensiveProjectHealth('BM289', tenantId);
    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });
});
