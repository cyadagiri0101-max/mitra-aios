import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EkosKnowledgeLineageService } from './ekos-knowledge-lineage.service';
import { EkosGraphService } from './ekos-graph.service';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import {
  EkosGraphEdge,
  EkosRelationType,
  EkosProvenanceType,
} from '../entities/ekos-graph-edge.entity';
import { KnowledgeArticle } from '../../knowledge/entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../../knowledge/entities/knowledge-article-evidence.entity';
import { G14LevelingRecommendation } from '../../predictive/entities/g14-leveling-recommendation.entity';
import { AuditService } from '../../audit/services/audit.service';

describe('EkosKnowledgeLineageService', () => {
  let service: EkosKnowledgeLineageService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockArticleId = '22222222-2222-2222-2222-222222222222';
  const mockNcrId = '33333333-3333-3333-3333-333333333333';
  const mockRecId = '44444444-4444-4444-4444-444444444444';

  const mockNodeRepo = {
    findOne: jest.fn(),
  };

  const mockEdgeRepo = {
    find: jest.fn(),
  };

  const mockArticleRepo = {
    findOne: jest.fn(),
  };

  const mockEvidenceRepo = {
    find: jest.fn(),
  };

  const mockRecommendationRepo = {
    findOne: jest.fn(),
  };

  const mockGraphService = {
    registerNode: jest.fn(),
    recordEdge: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EkosKnowledgeLineageService,
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: getRepositoryToken(KnowledgeArticle), useValue: mockArticleRepo },
        { provide: getRepositoryToken(KnowledgeArticleEvidence), useValue: mockEvidenceRepo },
        { provide: getRepositoryToken(G14LevelingRecommendation), useValue: mockRecommendationRepo },
        { provide: EkosGraphService, useValue: mockGraphService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<EkosKnowledgeLineageService>(EkosKnowledgeLineageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.getKnowledgeArticleLineage(mockArticleId, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should trace complete upstream sources and evidence for a Knowledge Article', async () => {
    mockArticleRepo.findOne.mockResolvedValue({
      id: mockArticleId,
      tenantId: mockTenantId,
      title: 'Runner Gate Sizing Standard',
      status: 'PUBLISHED',
    });

    mockGraphService.registerNode.mockResolvedValue({
      id: 'node-art-1',
      tenantId: mockTenantId,
      entityType: EkosEntityType.KNOWLEDGE_ARTICLE,
      entityId: mockArticleId,
      label: 'Runner Gate Sizing Standard',
    });

    mockEdgeRepo.find
      .mockResolvedValueOnce([
        {
          id: 'edge-1',
          relationType: EkosRelationType.CITED_BY,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          isSuperseded: false,
          sourceNode: {
            id: 'node-ncr-1',
            entityType: EkosEntityType.NCR,
            entityId: mockNcrId,
            label: 'NCR-2026-088: Gate Flash Defect',
          },
        },
      ])
      .mockResolvedValueOnce([]); // Outgoing usages

    mockEvidenceRepo.find.mockResolvedValue([
      {
        id: 'ev-1',
        chunkId: 'chunk-101',
        sourceFile: 'Die_Design_Rules_v3.pdf',
        citationLabel: 'DDR-4.2',
        authorityStatus: 'APPROVED',
      },
    ]);

    const result = await service.getKnowledgeArticleLineage(mockArticleId, mockTenantId);

    expect(result.article.id).toBe(mockArticleId);
    expect(result.upstreamSources.length).toBe(1);
    expect(result.upstreamSources[0].entityType).toBe(EkosEntityType.NCR);
    expect(result.supportingEvidence.length).toBe(1);
    expect(result.supportingEvidence[0].citationLabel).toBe('DDR-4.2');
  });

  it('should find all knowledge articles associated with a domain entity', async () => {
    mockNodeRepo.findOne.mockResolvedValue({
      id: 'node-ncr-1',
      tenantId: mockTenantId,
      entityType: EkosEntityType.NCR,
      entityId: mockNcrId,
      label: 'NCR-2026-088',
    });

    mockEdgeRepo.find.mockResolvedValue([
      {
        id: 'edge-1',
        relationType: EkosRelationType.RESOLVED_BY,
        provenanceType: EkosProvenanceType.EXPLICIT_HUMAN,
        isSuperseded: false,
        validFrom: new Date(),
        targetNode: {
          id: 'node-art-1',
          entityType: EkosEntityType.KNOWLEDGE_ARTICLE,
          entityId: mockArticleId,
          label: 'Root Cause Resolution Standard',
        },
      },
    ]);

    const result = await service.getEntityKnowledgeLineage(
      EkosEntityType.NCR,
      mockNcrId,
      mockTenantId,
    );

    expect(result.knowledgeArticlesCount).toBe(1);
    expect(result.knowledgeArticles[0].articleId).toBe(mockArticleId);
    expect(result.knowledgeArticles[0].relationType).toBe(EkosRelationType.RESOLVED_BY);
  });

  it('should trace upstream evidence for a G14 predictive leveling recommendation', async () => {
    mockRecommendationRepo.findOne.mockResolvedValue({
      id: mockRecId,
      tenantId: mockTenantId,
      recommendationType: 'ADJUST_MILESTONE_DATE',
      status: 'UNDER_REVIEW',
      riskTier: 'HIGH',
      modelVersion: 'G14_DELAY_RIDGE_V1',
      projectId: 'proj-1',
    });

    mockGraphService.registerNode.mockResolvedValue({
      id: 'node-rec-1',
      tenantId: mockTenantId,
      entityType: EkosEntityType.LEVELING_RECOMMENDATION,
      entityId: mockRecId,
    });

    mockEdgeRepo.find.mockResolvedValue([
      {
        id: 'edge-pred-1',
        relationType: EkosRelationType.PREDICTED_FROM,
        provenanceType: EkosProvenanceType.AI_INFERRED,
        confidence: 0.88,
        sourceNode: {
          id: 'node-proj-1',
          entityType: EkosEntityType.PROJECT,
          entityId: 'proj-1',
          label: 'Tooling Rev B',
        },
      },
    ]);

    const result = await service.getRecommendationProvenance(mockRecId, mockTenantId);

    expect(result.recommendation.id).toBe(mockRecId);
    expect(result.isAiInferred).toBe(true);
    expect(result.humanReviewRequired).toBe(true);
    expect(result.upstreamEvidence.length).toBe(1);
    expect(result.upstreamEvidence[0].relationType).toBe(EkosRelationType.PREDICTED_FROM);
  });

  it('should explicitly link a knowledge article to a domain entity with audit logging', async () => {
    mockArticleRepo.findOne.mockResolvedValue({
      id: mockArticleId,
      tenantId: mockTenantId,
      title: 'Root Cause Standard',
    });

    mockGraphService.recordEdge.mockResolvedValue({
      id: 'edge-linked-1',
      relationType: EkosRelationType.CITED_BY,
      provenanceType: EkosProvenanceType.EXPLICIT_HUMAN,
    });

    const edge = await service.linkKnowledgeToSourceEntity(
      {
        articleId: mockArticleId,
        targetEntityType: EkosEntityType.NCR,
        targetEntityId: mockNcrId,
        relationType: EkosRelationType.CITED_BY,
      },
      mockTenantId,
      { id: 'user-1' },
    );

    expect(edge).toBeDefined();
    expect(mockGraphService.recordEdge).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EKOS_KNOWLEDGE_LINKED' }),
    );
  });
});
