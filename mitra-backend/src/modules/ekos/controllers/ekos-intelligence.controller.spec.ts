import { Test, TestingModule } from '@nestjs/testing';
import { EkosIntelligenceController } from './ekos-intelligence.controller';
import { EkosIntelligenceService } from '../services/ekos-intelligence.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

describe('EkosIntelligenceController', () => {
  let controller: EkosIntelligenceController;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'planner@mitra.ai',
    tenantId: mockTenantId,
    role: 'PLANNING',
    permissions: [],
  };

  const mockIntelligenceService = {
    getProjectEnterpriseContext: jest.fn(),
    queryCrossDomainQuestion: jest.fn(),
    enterpriseSearch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EkosIntelligenceController],
      providers: [
        { provide: EkosIntelligenceService, useValue: mockIntelligenceService },
      ],
    }).compile();

    controller = module.get<EkosIntelligenceController>(EkosIntelligenceController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get project enterprise context via GET /project/:projectId', async () => {
    mockIntelligenceService.getProjectEnterpriseContext.mockResolvedValue({
      projectId: 'proj-1',
    });

    const res = await controller.getProjectEnterpriseContext('proj-1', mockUser);

    expect(res).toEqual({ projectId: 'proj-1' });
  });

  it('should answer question via POST /question', async () => {
    mockIntelligenceService.queryCrossDomainQuestion.mockResolvedValue({
      answer: 'Analysis complete',
    });

    const res = await controller.queryCrossDomainQuestion(
      { query: 'Status update?' },
      mockUser,
    );

    expect(res).toEqual({ answer: 'Analysis complete' });
  });
});
