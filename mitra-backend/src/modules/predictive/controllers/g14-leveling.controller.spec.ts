import { Test, TestingModule } from '@nestjs/testing';
import { G14LevelingController } from './g14-leveling.controller';
import { G14TimelineLevelingService } from '../services/g14-timeline-leveling.service';
import { LevelingRiskTier, RecommendationStatus } from '../entities/g14-leveling-recommendation.entity';
import { AuthUser } from '@common/decorators/current-user.decorator';

describe('G14LevelingController', () => {
  let controller: G14LevelingController;
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'planner@mitra.ai',
    tenantId: '11111111-1111-1111-1111-111111111111',
    role: 'ADMIN',
    permissions: ['predictive:read', 'predictive:manage'],
  };

  const mockLevelingService = {
    getProjectTimelineRisk: jest.fn(),
    getMachineCapacityRisk: jest.fn(),
    generateRecommendations: jest.fn(),
    listRecommendations: jest.fn(),
    getRecommendationById: jest.fn(),
    reviewRecommendation: jest.fn(),
    acceptRecommendation: jest.fn(),
    modifyRecommendation: jest.fn(),
    rejectRecommendation: jest.fn(),
    cancelRecommendation: jest.fn(),
    applyRecommendation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [G14LevelingController],
      providers: [
        { provide: G14TimelineLevelingService, useValue: mockLevelingService },
      ],
    }).compile();

    controller = module.get<G14LevelingController>(G14LevelingController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get project timeline risk', async () => {
    mockLevelingService.getProjectTimelineRisk.mockResolvedValue({
      projectId: 'proj-1',
      riskTier: LevelingRiskTier.HIGH,
    });

    const result = await controller.getProjectTimelineRisk('proj-1', mockUser);

    expect(result).toBeDefined();
    expect(mockLevelingService.getProjectTimelineRisk).toHaveBeenCalledWith('proj-1', mockUser.tenantId);
  });

  it('should generate recommendations', async () => {
    mockLevelingService.generateRecommendations.mockResolvedValue([
      { id: 'rec-1', status: RecommendationStatus.GENERATED },
    ]);

    const result = await controller.generateRecommendations(
      { projectId: 'proj-1' },
      mockUser,
    );

    expect(result).toBeDefined();
    expect(mockLevelingService.generateRecommendations).toHaveBeenCalledWith(
      { projectId: 'proj-1' },
      mockUser.tenantId,
      mockUser.email,
    );
  });

  it('should apply recommendation', async () => {
    mockLevelingService.applyRecommendation.mockResolvedValue({
      id: 'rec-1',
      status: RecommendationStatus.APPLIED,
    });

    const result = await controller.applyRecommendation(
      'rec-1',
      { confirmExecution: true },
      mockUser,
    );

    expect(result).toBeDefined();
    expect(mockLevelingService.applyRecommendation).toHaveBeenCalledWith(
      'rec-1',
      { confirmExecution: true },
      mockUser.tenantId,
      mockUser.email,
    );
  });
});
