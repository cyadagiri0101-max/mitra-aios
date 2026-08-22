import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OperationalClosedLoopService } from './operational-closed-loop.service';
import {
  OperationalRecommendation,
  OperationalRecommendationStatus,
} from '../entities/operational-recommendation.entity';
import { ManufacturingSignal } from '../entities/manufacturing-signal.entity';
import { ManufacturingObservation } from '../entities/manufacturing-observation.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { AuditService } from '../../audit/services/audit.service';

describe('OperationalClosedLoopService', () => {
  let service: OperationalClosedLoopService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockMachineId = '22222222-2222-2222-2222-222222222222';
  const mockRecId = '44444444-4444-4444-4444-444444444444';

  const mockRecommendationRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: mockRecId, ...dto })),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should derive operational state with cycle-time deviation', async () => {
    mockWorkOrderRepo.find.mockResolvedValue([{ id: 'wo-1' }]);
    mockSignalRepo.find.mockResolvedValue([
      { value: 75.0 },
      { value: 85.0 },
    ]);
    mockObservationRepo.find.mockResolvedValue([]);
    mockRecommendationRepo.find.mockResolvedValue([]);

    const state = await service.getOperationalState(mockTenantId, mockMachineId);

    expect(state.activeWorkOrdersCount).toBe(1);
    expect(state.averageCycleTimeSec).toBe(80.0);
    expect(state.cycleTimeDeviationPct).toBe(33.33);
    expect(state.anomaliesDetected).toBe(1);
  });

  it('should generate advisory recommendation when cycle-time deviation exceeds threshold', async () => {
    mockWorkOrderRepo.find.mockResolvedValue([]);
    mockSignalRepo.find.mockResolvedValue([{ value: 80.0 }]);
    mockObservationRepo.find.mockResolvedValue([]);
    mockRecommendationRepo.find.mockResolvedValue([]);

    const recs = await service.evaluateAnomaliesAndRecommend(mockTenantId, mockMachineId);

    expect(recs.length).toBe(1);
    expect(recs[0].status).toBe(OperationalRecommendationStatus.REVIEW);
    expect(mockRecommendationRepo.save).toHaveBeenCalled();
  });

  it('should govern human review of an operational recommendation', async () => {
    const existingRec = {
      id: mockRecId,
      tenantId: mockTenantId,
      status: OperationalRecommendationStatus.REVIEW,
    };
    mockRecommendationRepo.findOne.mockResolvedValue(existingRec);

    const reviewed = await service.reviewRecommendation(
      mockRecId,
      {
        status: OperationalRecommendationStatus.ACCEPTED,
        decisionNotes: 'Tool insert replacement scheduled during shift handover',
      },
      mockTenantId,
      { id: 'supervisor-1' },
    );

    expect(reviewed.status).toBe(OperationalRecommendationStatus.ACCEPTED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'OPERATIONAL_RECOMMENDATION_REVIEWED' }),
    );
  });
});
