import { Test, TestingModule } from '@nestjs/testing';
import { G14ModelRegistryController } from './g14-model-registry.controller';
import { G14ModelRegistryService } from '../services/g14-model-registry.service';
import { ModelCapability, ModelLifecycleStatus } from '../entities/g14-model-registry.entity';
import { AuthUser } from '@common/decorators/current-user.decorator';

describe('G14ModelRegistryController', () => {
  let controller: G14ModelRegistryController;
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'admin@mitra.ai',
    tenantId: '11111111-1111-1111-1111-111111111111',
    role: 'ADMIN',
    permissions: ['predictive:read', 'predictive:manage'],
  };

  const mockRegistryService = {
    listModels: jest.fn(),
    getActiveModelByCapability: jest.fn(),
    getModelById: jest.fn(),
    evaluateModel: jest.fn(),
    requestApproval: jest.fn(),
    approveModel: jest.fn(),
    rejectModel: jest.fn(),
    activateModel: jest.fn(),
    retireModel: jest.fn(),
    rollbackModel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [G14ModelRegistryController],
      providers: [
        { provide: G14ModelRegistryService, useValue: mockRegistryService },
      ],
    }).compile();

    controller = module.get<G14ModelRegistryController>(G14ModelRegistryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list models from registry', async () => {
    mockRegistryService.listModels.mockResolvedValue([
      { id: '1', modelVersion: 'G14_DELAY_RIDGE_V1' },
    ]);

    const result = await controller.listModels({}, mockUser);

    expect(result).toBeDefined();
    expect(mockRegistryService.listModels).toHaveBeenCalledWith({}, mockUser.tenantId);
  });

  it('should get active model by capability', async () => {
    mockRegistryService.getActiveModelByCapability.mockResolvedValue({
      id: '1',
      capability: ModelCapability.DELAY_PREDICTION,
      status: ModelLifecycleStatus.ACTIVE,
    });

    const result = await controller.getActiveModel(
      ModelCapability.DELAY_PREDICTION,
      mockUser,
    );

    expect(result).toBeDefined();
    expect(mockRegistryService.getActiveModelByCapability).toHaveBeenCalledWith(
      ModelCapability.DELAY_PREDICTION,
      mockUser.tenantId,
    );
  });

  it('should activate model', async () => {
    mockRegistryService.activateModel.mockResolvedValue({
      id: '1',
      status: ModelLifecycleStatus.ACTIVE,
    });

    const result = await controller.activateModel('1', {}, mockUser);

    expect(result).toBeDefined();
    expect(mockRegistryService.activateModel).toHaveBeenCalledWith(
      '1',
      {},
      mockUser.tenantId,
      mockUser.email,
    );
  });

  it('should rollback model', async () => {
    mockRegistryService.rollbackModel.mockResolvedValue({
      id: 'prev-1',
      status: ModelLifecycleStatus.ACTIVE,
    });

    const result = await controller.rollbackModel(
      '1',
      { rollbackReason: 'Degraded latency' },
      mockUser,
    );

    expect(result).toBeDefined();
    expect(mockRegistryService.rollbackModel).toHaveBeenCalledWith(
      '1',
      { rollbackReason: 'Degraded latency' },
      mockUser.tenantId,
      mockUser.email,
    );
  });
});
