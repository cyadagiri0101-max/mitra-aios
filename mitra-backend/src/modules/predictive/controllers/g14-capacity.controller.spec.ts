import { Test, TestingModule } from '@nestjs/testing';
import { G14CapacityController } from './g14-capacity.controller';
import { G14CapacityTrainingService } from '../services/g14-capacity-training.service';
import { G14CapacityForecastService } from '../services/g14-capacity-forecast.service';
import { TrainCapacityModelDto, PredictCapacityDto, QueryBottlenecksDto } from '../dto/g14-capacity.dto';
import { AuthUser } from '@common/decorators/current-user.decorator';

describe('G14CapacityController', () => {
  let controller: G14CapacityController;
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'test@example.com',
    tenantId: '11111111-1111-1111-1111-111111111111',
    role: 'ADMIN',
    permissions: ['predictive:read', 'predictive:manage'],
  };

  const mockTrainingService = {
    trainCapacityModel: jest.fn(),
    getActiveModel: jest.fn(),
  };
  const mockForecastService = {
    predictCapacity: jest.fn(),
    getBottlenecks: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [G14CapacityController],
      providers: [
        {
          provide: G14CapacityTrainingService,
          useValue: mockTrainingService,
        },
        {
          provide: G14CapacityForecastService,
          useValue: mockForecastService,
        },
      ],
    }).compile();

    controller = module.get<G14CapacityController>(G14CapacityController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call trainCapacityModel on train endpoint', async () => {
    const dto: TrainCapacityModelDto = {
      regularizationAlpha: 1.0,
      minSamplesThreshold: 5,
    };
    mockTrainingService.trainCapacityModel.mockResolvedValue({
      id: 'cap-model-1',
      modelVersion: 'G14_CAPACITY_RIDGE_V1',
    });

    const result = await controller.trainModel(dto, mockUser);

    expect(result).toBeDefined();
    expect(mockTrainingService.trainCapacityModel).toHaveBeenCalledWith(
      dto,
      mockUser.tenantId,
    );
  });

  it('should call getActiveModel on active endpoint', async () => {
    mockTrainingService.getActiveModel.mockResolvedValue({
      id: 'cap-model-1',
      modelVersion: 'G14_CAPACITY_RIDGE_V1',
    });

    const result = await controller.getActiveModel(mockUser);

    expect(result).toBeDefined();
    expect(mockTrainingService.getActiveModel).toHaveBeenCalledWith(
      mockUser.tenantId,
    );
  });

  it('should call predictCapacity on predict endpoint', async () => {
    const dto: PredictCapacityDto = {
      machineId: '22222222-2222-2222-2222-222222222222',
      forecastHorizonDays: 30,
    };
    mockForecastService.predictCapacity.mockResolvedValue({
      predictedDeficitHours: 25.0,
      overloadProbability: 0.8,
    });

    const result = await controller.predictCapacity(dto, mockUser);

    expect(result).toBeDefined();
    expect(mockForecastService.predictCapacity).toHaveBeenCalledWith(
      dto,
      mockUser.tenantId,
    );
  });

  it('should call getBottlenecks on bottlenecks endpoint', async () => {
    const dto: QueryBottlenecksDto = {
      riskTier: 'HIGH',
    };
    mockForecastService.getBottlenecks.mockResolvedValue([
      { machineId: 'm1', riskTier: 'HIGH' },
    ]);

    const result = await controller.getBottlenecks(dto, mockUser);

    expect(result).toBeDefined();
    expect(mockForecastService.getBottlenecks).toHaveBeenCalledWith(
      dto,
      mockUser.tenantId,
    );
  });
});
