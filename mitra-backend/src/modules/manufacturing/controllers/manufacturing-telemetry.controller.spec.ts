import { Test, TestingModule } from '@nestjs/testing';
import { ManufacturingTelemetryController } from './manufacturing-telemetry.controller';
import { ManufacturingTelemetryService } from '../services/manufacturing-telemetry.service';
import { OperationalClosedLoopService } from '../services/operational-closed-loop.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { OperationalRecommendationStatus } from '../entities/operational-recommendation.entity';

describe('ManufacturingTelemetryController', () => {
  let controller: ManufacturingTelemetryController;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'operator@mitra.ai',
    tenantId: mockTenantId,
    role: 'OPERATIONS',
    permissions: [],
  };

  const mockTelemetryService = {
    ingestSignal: jest.fn(),
    batchIngest: jest.fn(),
    getSignalsByMachine: jest.fn(),
    createObservation: jest.fn(),
    getFeedbackByWorkOrder: jest.fn(),
  };

  const mockClosedLoopService = {
    getOperationalState: jest.fn(),
    evaluateAnomaliesAndRecommend: jest.fn(),
    getRecommendations: jest.fn(),
    reviewRecommendation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManufacturingTelemetryController],
      providers: [
        { provide: ManufacturingTelemetryService, useValue: mockTelemetryService },
        { provide: OperationalClosedLoopService, useValue: mockClosedLoopService },
      ],
    }).compile();

    controller = module.get<ManufacturingTelemetryController>(ManufacturingTelemetryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should ingest signal via POST /telemetry/ingest', async () => {
    mockTelemetryService.ingestSignal.mockResolvedValue({ id: 'sig-1' });

    const res = await controller.ingestSignal(
      {
        sourceId: 's-1',
        signalType: 'CYCLE_TIME',
        value: 55,
        unit: 's',
        eventTimestamp: new Date().toISOString(),
      },
      mockUser,
    );

    expect(res).toEqual({ id: 'sig-1' });
  });

  it('should get operational state via GET /closed-loop/state', async () => {
    mockClosedLoopService.getOperationalState.mockResolvedValue({ activeWorkOrdersCount: 2 });

    const res = await controller.getOperationalState('m-1', 'p-1', mockUser);

    expect(res).toEqual({ activeWorkOrdersCount: 2 });
  });

  it('should review recommendation via POST /closed-loop/recommendations/:id/review', async () => {
    mockClosedLoopService.reviewRecommendation.mockResolvedValue({
      id: 'rec-1',
      status: OperationalRecommendationStatus.ACCEPTED,
    });

    const res = await controller.reviewRecommendation(
      'rec-1',
      { status: OperationalRecommendationStatus.ACCEPTED },
      mockUser,
    );

    expect(res.status).toBe(OperationalRecommendationStatus.ACCEPTED);
  });
});
