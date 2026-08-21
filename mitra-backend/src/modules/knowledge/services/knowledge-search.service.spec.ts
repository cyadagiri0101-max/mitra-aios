import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { KnowledgeSearchService } from './knowledge-search.service';
import { KnowledgeCatalogEntry } from '../entities/knowledge-catalog.entity';
import { KnowledgeArticle, ArticleStatus, ArticleType } from '../entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../entities/knowledge-article-evidence.entity';
import { EngineeringDocument, EngineeringDocType } from '../../engineering/entities/engineering-document.entity';
import { VectorSearchService } from '@modules/ai/services/vector-search.service';

describe('KnowledgeSearchService', () => {
  let service: KnowledgeSearchService;
  let articleRepo: jest.Mocked<Repository<KnowledgeArticle>>;
  let evidenceRepo: jest.Mocked<Repository<KnowledgeArticleEvidence>>;
  let documentRepo: jest.Mocked<Repository<EngineeringDocument>>;
  let catalogRepo: jest.Mocked<Repository<KnowledgeCatalogEntry>>;
  let vectorSearch: jest.Mocked<VectorSearchService>;
  let dataSource: jest.Mocked<DataSource>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  let mockArticleQb: any;

  beforeEach(async () => {
    mockArticleQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'art-1',
          title: 'Blow Mold Cooling Channel Design Guidelines for PET Containers',
          slug: 'pet-blow-mold-cooling-guidelines',
          articleType: ArticleType.BEST_PRACTICE,
          version: 1,
          isLatest: true,
          summary: 'Baffle and bubbler cooling circuit layout in PET blow molds.',
          content: 'Full guideline on mold cooling for PET preforms and blow cavities.',
          tags: ['PET', 'Cooling', 'Blow Molding'],
          status: ArticleStatus.PUBLISHED,
          relatedModules: ['engineering', 'manufacturing'],
          tenantId,
          createdAt: new Date('2026-08-17T00:00:00Z'),
          updatedAt: new Date('2026-08-17T06:00:00Z'),
        },
      ]),
    };

    const mockDocumentQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'doc-1',
          documentNumber: 'EDOC-2026-0001',
          title: '500 mL PET Bottle Blow Mold Technical Specification',
          docType: EngineeringDocType.SPECIFICATION,
          description: 'Detailed technical specification for PET bottle tooling.',
          projectId: '1ca60868-3292-4ecd-ae6c-a893548929b2',
          status: 'RELEASED',
          metadata: { tags: ['PET', 'Specification'] },
          tenantId,
          createdAt: new Date('2026-08-17T00:00:00Z'),
          updatedAt: new Date('2026-08-17T05:00:00Z'),
        },
      ]),
    };

    const mockCatalogQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeSearchService,
        {
          provide: getRepositoryToken(KnowledgeArticle),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockArticleQb),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KnowledgeArticleEvidence),
          useValue: {
            find: jest.fn().mockResolvedValue([
              {
                id: 'ev-1',
                citationLabel: '[REF-1]',
                sourceFile: 'MOL-001.xlsx',
                sourceCoordinate: 'MOL-001.xlsx#Sheet1:R14',
                authorityStatus: 'AUTHORITATIVE_RELEASE',
                contentHash: 'hash-abc',
                sequenceNumber: 1,
              },
            ]),
          },
        },
        {
          provide: getRepositoryToken(EngineeringDocument),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockDocumentQb),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KnowledgeCatalogEntry),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockCatalogQb),
            findOne: jest.fn(),
          },
        },
        {
          provide: VectorSearchService,
          useValue: {
            search: jest.fn().mockResolvedValue([
              { entityId: 'art-1', similarity: 0.92 },
              { entityId: 'doc-1', similarity: 0.88 },
            ]),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn().mockResolvedValue([
              {
                id: '1ca60868-3292-4ecd-ae6c-a893548929b2',
                project_number: 'PRJ-2026-0002',
                name: '500ml PET Water Bottle Blow Mold',
              },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get<KnowledgeSearchService>(KnowledgeSearchService);
    articleRepo = module.get(getRepositoryToken(KnowledgeArticle));
    evidenceRepo = module.get(getRepositoryToken(KnowledgeArticleEvidence));
    documentRepo = module.get(getRepositoryToken(EngineeringDocument));
    catalogRepo = module.get(getRepositoryToken(KnowledgeCatalogEntry));
    vectorSearch = module.get(VectorSearchService);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Tenant isolation and security', () => {
    it('throws ForbiddenException when tenantId is missing', async () => {
      await expect(service.search({ tenantId: '' })).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when tenantId is null', async () => {
      await expect(service.search({ tenantId: null as any })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Default Governed Search Filtering (M8.5)', () => {
    it('defaults to searching only PUBLISHED and latest articles with evidence enrichment', async () => {
      const results = await service.search({
        tenantId,
        query: 'PET blow mold cooling',
        domain: 'ENGINEERING',
      });

      expect(results).toBeDefined();
      expect(results.data.length).toBeGreaterThan(0);

      // Verify default predicate applied to query builder
      expect(mockArticleQb.andWhere).toHaveBeenCalledWith('a.status = :publishedStatus', {
        publishedStatus: ArticleStatus.PUBLISHED,
      });
      expect(mockArticleQb.andWhere).toHaveBeenCalledWith('a.is_latest = :isLatest', {
        isLatest: true,
      });

      const articleResult = results.data.find((r) => r.entityType === 'KNOWLEDGE_ARTICLE');
      expect(articleResult).toBeDefined();
      expect(articleResult?.evidence).toBeDefined();
      expect(articleResult?.evidence?.[0].citationLabel).toBe('[REF-1]');
    });

    it('applies projectId and decisionId filters when supplied', async () => {
      await service.search({
        tenantId,
        projectId: 'proj-123',
        decisionId: 'dec-456',
        domain: 'ALL',
      });

      expect(mockArticleQb.andWhere).toHaveBeenCalledWith('a.project_id = :projectId', {
        projectId: 'proj-123',
      });
      expect(mockArticleQb.andWhere).toHaveBeenCalledWith('a.decision_id = :decisionId', {
        decisionId: 'dec-456',
      });
    });
  });
});
