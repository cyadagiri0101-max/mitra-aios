import { Test, TestingModule } from '@nestjs/testing';
import { G14PredictionController } from './g14-prediction.controller';
import { G14ModelTrainingService } from '../services/g14-model-training.service';
import { G14DelayInferenceService } from '../services/g14-delay-inference.service';
import { TrainModelDto, PredictDelayDto } from '../dto/g14-prediction.dto';
import { AuthUser } from '@common/decorators/current-user.decorator';

describe('G14PredictionController', () => {
  let controller: G14PredictionController;
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'test@example.com',
    tenantId: '11111111-1111-1111-1111-111111111111',
    role: 'ADMIN',
    permissions: ['predictive:read', 'predictive:manage'],
  };

  const mockModelTrainingService = {
    trainProjectDelayModel: jest.fn(),
    getActiveModel: jest.fn(),
  };
  const mockDelayInferenceService = {
    predictProjectDelay: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [G14PredictionController],
      providers: [
        {
          provide: G14ModelTrainingService,
          useValue: mockModelTrainingService,
        },
        {
          provide: G14DelayInferenceService,
          useValue: mockDelayInferenceService,
        },
      ],
    }).compile();

    controller = module.get<G14PredictionController>(G14PredictionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call trainProjectDelayModel on train endpoint', async () => {
    const dto: TrainModelDto = {
      regularizationAlpha: 1.0,
      minSamplesThreshold: 5,
    };
    mockModelTrainingService.trainProjectDelayModel.mockResolvedValue({
      id: 'model-1',
      modelVersion: 'G14_RIDGE_V1',
    });

    const result = await controller.trainModel(dto, mockUser);

    expect(result).toBeDefined();
    expect(mockModelTrainingService.trainProjectDelayModel).toHaveBeenCalledWith(
      dto,
      mockUser.tenantId,
    );
  });

  it('should call getActiveModel on active endpoint', async () => {
    mockModelTrainingService.getActiveModel.mockResolvedValue({
      id: 'model-1',
      modelVersion: 'G14_RIDGE_V1',
    });

    const result = await controller.getActiveModel(mockUser);

    expect(result).toBeDefined();
    expect(mockModelTrainingService.getActiveModel).toHaveBeenCalledWith(
      mockUser.tenantId,
    );
  });

  it('should call predictProjectDelay on predict endpoint', async () => {
    const dto: PredictDelayDto = {
      projectId: '22222222-2222-2222-2222-222222222222',
      confidenceIntervalPct: 95,
    };
    mockDelayInferenceService.predictProjectDelay.mockResolvedValue({
      predictedDelayDays: 5.5,
      delayProbability: 0.8,
    });

    const result = await controller.predictDelay(dto, mockUser);

    expect(result).toBeDefined();
    expect(mockDelayInferenceService.predictProjectDelay).toHaveBeenCalledWith(
      dto,
      mockUser.tenantId,
    );
  });
});
