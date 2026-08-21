import { Test, TestingModule } from '@nestjs/testing';
import { G14FeatureController } from './g14-feature.controller';
import { G14FeatureEngineeringService } from '../services/g14-feature-engineering.service';
import { ExtractFeaturesDto, QueryFeatureSnapshotsDto } from '../dto/g14-feature.dto';
import { AuthUser } from '@common/decorators/current-user.decorator';

describe('G14FeatureController', () => {
  let controller: G14FeatureController;
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'test@example.com',
    tenantId: '11111111-1111-1111-1111-111111111111',
    role: 'ADMIN',
    permissions: ['predictive:read', 'predictive:manage'],
  };

  const mockFeatureEngineeringService = {
    extractProjectFeatures: jest.fn(),
    queryFeatureSnapshots: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [G14FeatureController],
      providers: [
        {
          provide: G14FeatureEngineeringService,
          useValue: mockFeatureEngineeringService,
        },
      ],
    }).compile();

    controller = module.get<G14FeatureController>(G14FeatureController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call extractProjectFeatures on extract endpoint', async () => {
    const dto: ExtractFeaturesDto = {
      projectId: '22222222-2222-2222-2222-222222222222',
      persistSnapshot: true,
    };
    mockFeatureEngineeringService.extractProjectFeatures.mockResolvedValue({
      featureVector: { denseVector: [1, 2, 3] },
    });

    const result = await controller.extractFeatures(dto, mockUser);

    expect(result).toBeDefined();
    expect(mockFeatureEngineeringService.extractProjectFeatures).toHaveBeenCalledWith(
      dto,
      mockUser.tenantId,
    );
  });

  it('should call queryFeatureSnapshots on snapshots endpoint', async () => {
    const query: QueryFeatureSnapshotsDto = {
      projectId: '22222222-2222-2222-2222-222222222222',
    };
    mockFeatureEngineeringService.queryFeatureSnapshots.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await controller.querySnapshots(query, mockUser);

    expect(result).toBeDefined();
    expect(mockFeatureEngineeringService.queryFeatureSnapshots).toHaveBeenCalledWith(
      query,
      mockUser.tenantId,
    );
  });
});
