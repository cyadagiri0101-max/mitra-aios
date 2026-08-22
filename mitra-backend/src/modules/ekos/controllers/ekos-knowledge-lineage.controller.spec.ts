import { Test, TestingModule } from '@nestjs/testing';
import { EkosKnowledgeLineageController } from './ekos-knowledge-lineage.controller';
import { EkosKnowledgeLineageService } from '../services/ekos-knowledge-lineage.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosRelationType } from '../entities/ekos-graph-edge.entity';

describe('EkosKnowledgeLineageController', () => {
  let controller: EkosKnowledgeLineageController;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'engineer@mitra.ai',
    tenantId: mockTenantId,
    role: 'ADMIN',
    permissions: [],
  };

  const mockKnowledgeLineageService = {
    getKnowledgeArticleLineage: jest.fn(),
    getEntityKnowledgeLineage: jest.fn(),
    getRecommendationProvenance: jest.fn(),
    linkKnowledgeToSourceEntity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EkosKnowledgeLineageController],
      providers: [
        { provide: EkosKnowledgeLineageService, useValue: mockKnowledgeLineageService },
      ],
    }).compile();

    controller = module.get<EkosKnowledgeLineageController>(EkosKnowledgeLineageController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return knowledge article lineage via GET /knowledge/:articleId', async () => {
    mockKnowledgeLineageService.getKnowledgeArticleLineage.mockResolvedValue({
      article: { id: 'art-1' },
    });

    const res = await controller.getKnowledgeArticleLineage('art-1', mockUser);

    expect(res).toEqual({ article: { id: 'art-1' } });
    expect(mockKnowledgeLineageService.getKnowledgeArticleLineage).toHaveBeenCalledWith(
      'art-1',
      mockTenantId,
    );
  });

  it('should return entity knowledge lineage via GET /entity/:entityType/:entityId/knowledge', async () => {
    mockKnowledgeLineageService.getEntityKnowledgeLineage.mockResolvedValue({
      knowledgeArticlesCount: 1,
    });

    const res = await controller.getEntityKnowledgeLineage(
      EkosEntityType.NCR,
      'ncr-1',
      mockUser,
    );

    expect(res).toEqual({ knowledgeArticlesCount: 1 });
  });

  it('should return recommendation provenance via GET /recommendation/:id/provenance', async () => {
    mockKnowledgeLineageService.getRecommendationProvenance.mockResolvedValue({
      isAiInferred: true,
    });

    const res = await controller.getRecommendationProvenance('rec-1', mockUser);

    expect(res.isAiInferred).toBe(true);
  });

  it('should link knowledge to entity via POST /knowledge/link', async () => {
    mockKnowledgeLineageService.linkKnowledgeToSourceEntity.mockResolvedValue({
      id: 'edge-1',
    });

    const res = await controller.linkKnowledgeToEntity(
      {
        articleId: 'art-1',
        targetEntityType: EkosEntityType.NCR,
        targetEntityId: 'ncr-1',
        relationType: EkosRelationType.CITED_BY,
      },
      mockUser,
    );

    expect(res).toEqual({ id: 'edge-1' });
  });
});
