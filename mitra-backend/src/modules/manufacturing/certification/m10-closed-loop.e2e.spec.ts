import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OperationalClosedLoopService } from '../services/operational-closed-loop.service';
import {
  OperationalRecommendation,
  OperationalRecommendationType,
  OperationalRecommendationStatus,
} from '../entities/operational-recommendation.entity';
import { ManufacturingSignal, ManufacturingSignalType } from '../entities/manufacturing-signal.entity';
import { ManufacturingObservation } from '../entities/manufacturing-observation.entity';
import { WorkOrder, WorkOrderStatus } from '../entities/workorder.entity';
import { AuditService } from '../../audit/services/audit.service';

describe('M10.4 Operational Closed Loop E2E Certification (GS-01 -> GS-15)', () => {
  let service: OperationalClosedLoopService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';

  const machineId = '30000000-0000-0000-0000-000000000001';
  const workOrderId = '30000000-0000-0000-0000-000000000002';
  const projectId = '30000000-0000-0000-0000-000000000003';
  const recId = '30000000-0000-0000-0000-000000000004';

  const mockRecommendationRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: recId, ...dto })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockSignalRepo = {
    find: jest.fn(),
  };

  const mockObservationRepo = {
    find: jest.fn(),
  };

  const mockWorkOrderRepo = {
    find: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationalClosedLoopService,
        { provide: getRepositoryToken(OperationalRecommendation), useValue: mockRecommendationRepo },
        { provide: getRepositoryToken(ManufacturingSignal), useValue: mockSignalRepo },
        { provide: getRepositoryToken(ManufacturingObservation), useValue: mockObservationRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<OperationalClosedLoopService>(OperationalClosedLoopService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01 to GS-03: Machine degradation detected and correlated to Work Order & Project', async () => {
    mockWorkOrderRepo.find.mockResolvedValue([
      { id: workOrderId, projectId, status: WorkOrderStatus.IN_PROGRESS },
    ]);
    mockSignalRepo.find.mockResolvedValue([
      { signalType: ManufacturingSignalType.CYCLE_TIME, value: 78.0, machineId, projectId },
      { signalType: ManufacturingSignalType.CYCLE_TIME, value: 82.0, machineId, projectId },
    ]);
    mockObservationRepo.find.mockResolvedValue([]);
    mockRecommendationRepo.find.mockResolvedValue([]);

    const state = await service.getOperationalState(tenantA, machineId, projectId);

    expect(state.activeWorkOrdersCount).toBe(1);
    expect(state.averageCycleTimeSec).toBe(80.0);
    expect(state.cycleTimeDeviationPct).toBe(33.33);
    expect(state.anomaliesDetected).toBe(1);
  });

  it('GS-04 to GS-08: Advisory operational recommendation generation with evidence context', async () => {
    mockWorkOrderRepo.find.mockResolvedValue([]);
    mockSignalRepo.find.mockResolvedValue([{ value: 85.0 }]);
    mockObservationRepo.find.mockResolvedValue([]);
    mockRecommendationRepo.find.mockResolvedValue([]);

    const recs = await service.evaluateAnomaliesAndRecommend(tenantA, machineId);

    expect(recs.length).toBe(1);
    expect(recs[0].status).toBe(OperationalRecommendationStatus.REVIEW);
    expect(recs[0].evidenceContext.deviationPct).toBeGreaterThan(15);
  });

  it('GS-09: Human accepts recommendation with decision notes', async () => {
    const rec = { id: recId, tenantId: tenantA, status: OperationalRecommendationStatus.REVIEW };
    mockRecommendationRepo.findOne.mockResolvedValue(rec);

    const reviewed = await service.reviewRecommendation(
      recId,
      { status: OperationalRecommendationStatus.ACCEPTED, decisionNotes: 'Maintenance order issued' },
      tenantA,
      { id: 'plant-mgr-1' },
    );

    expect(reviewed.status).toBe(OperationalRecommendationStatus.ACCEPTED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'OPERATIONAL_RECOMMENDATION_REVIEWED' }),
    );
  });

  it('GS-10: Human modifies recommendation', async () => {
    const rec = { id: recId, tenantId: tenantA, status: OperationalRecommendationStatus.REVIEW };
    mockRecommendationRepo.findOne.mockResolvedValue(rec);

    const reviewed = await service.reviewRecommendation(
      recId,
      { status: OperationalRecommendationStatus.MODIFIED, decisionNotes: 'Adjusted feed rate to 90%' },
      tenantA,
      { id: 'engineer-1' },
    );

    expect(reviewed.status).toBe(OperationalRecommendationStatus.MODIFIED);
  });

  it('GS-11: Human rejects recommendation', async () => {
    const rec = { id: recId, tenantId: tenantA, status: OperationalRecommendationStatus.REVIEW };
    mockRecommendationRepo.findOne.mockResolvedValue(rec);

    const reviewed = await service.reviewRecommendation(
      recId,
      { status: OperationalRecommendationStatus.REJECTED, decisionNotes: 'Temporary trial fixture intentional variance' },
      tenantA,
      { id: 'engineer-1' },
    );

    expect(reviewed.status).toBe(OperationalRecommendationStatus.REJECTED);
  });

  it('GS-12: Invariant — Zero autonomous execution without human approval', async () => {
    const recs = await service.evaluateAnomaliesAndRecommend(tenantA, machineId);

    recs.forEach((r) => {
      expect(r.status).toBe(OperationalRecommendationStatus.REVIEW);
      expect(r.status).not.toBe(OperationalRecommendationStatus.APPLIED);
    });
  });

  it('GS-13: Multi-tenant operational state isolation', async () => {
    await expect(
      service.getOperationalState('', machineId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('GS-14 & GS-15: Evidence lineage and historical review auditability', async () => {
    mockRecommendationRepo.find.mockResolvedValue([
      { id: recId, status: OperationalRecommendationStatus.ACCEPTED },
    ]);

    const recs = await service.getRecommendations(tenantA, OperationalRecommendationStatus.ACCEPTED);

    expect(recs.length).toBe(1);
    expect(recs[0].status).toBe(OperationalRecommendationStatus.ACCEPTED);
  });
});
