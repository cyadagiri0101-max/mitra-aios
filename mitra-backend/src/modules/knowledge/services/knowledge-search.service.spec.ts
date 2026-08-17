import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { KnowledgeSearchService } from './knowledge-search.service';
import { KnowledgeCatalogEntry } from '../entities/knowledge-catalog.entity';
import { KnowledgeArticle, ArticleStatus, ArticleType } from '../entities/knowledgearticle.entity';
import { EngineeringDocument, EngineeringDocType } from '../../engineering/entities/engineering-document.entity';
import { VectorSearchService } from '@modules/ai/services/vector-search.service';

describe('KnowledgeSearchService', () => {
  let service: KnowledgeSearchService;
  let articleRepo: jest.Mocked<Repository<KnowledgeArticle>>;
  let documentRepo: jest.Mocked<Repository<EngineeringDocument>>;
  let catalogRepo: jest.Mocked<Repository<KnowledgeCatalogEntry>>;
  let vectorSearch: jest.Mocked<VectorSearchService>;
  let dataSource: jest.Mocked<DataSource>;

  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    const mockArticleQb = {
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
              { entityId: 'art-1', similarity: 0.95 },
              { entityId: 'doc-1', similarity: 0.88 },
            ]),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn().mockImplementation((sql: string) => {
              if (sql.includes('projects')) {
                return Promise.resolve([
                  { id: '1ca60868-3292-4ecd-ae6c-a893548929b2', project_number: 'PRJ-2026-0002', name: 'ABC Bottle Blow Mold Project' },
                ]);
              }
              return Promise.resolve([]);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<KnowledgeSearchService>(KnowledgeSearchService);
    articleRepo = module.get(getRepositoryToken(KnowledgeArticle));
    documentRepo = module.get(getRepositoryToken(EngineeringDocument));
    catalogRepo = module.get(getRepositoryToken(KnowledgeCatalogEntry));
    vectorSearch = module.get(VectorSearchService);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail closed when tenantId is missing', async () => {
    await expect(service.search({ query: 'PET cooling', tenantId: '' })).rejects.toThrow(ForbiddenException);
    await expect(service.search({ query: 'PET cooling', tenantId: null as any })).rejects.toThrow(ForbiddenException);
  });

  it('should execute unified search across articles and engineering documents', async () => {
    const result = await service.search({
      query: 'PET cooling',
      tenantId,
      domain: 'ALL',
      page: 1,
      limit: 10,
    });

    expect(result.data).toBeDefined();
    expect(result.total).toBe(2);
    expect(result.data[0].id).toBe('art-1');
    expect(result.data[0].entityType).toBe('KNOWLEDGE_ARTICLE');
    expect(result.data[0].title).toContain('Cooling Channel Design');
    expect(result.data[0].sourceLinks?.projectNumber).toBe('PRJ-2026-0002');

    expect(result.data[1].id).toBe('doc-1');
    expect(result.data[1].entityType).toBe('ENGINEERING_DOCUMENT');
    expect(result.data[1].documentNumber).toBe('EDOC-2026-0001');
    expect(result.data[1].sourceLinks?.projectNumber).toBe('PRJ-2026-0002');
  });

  it('should filter search results by domain', async () => {
    const result = await service.search({
      query: 'PET',
      tenantId,
      domain: 'MANUFACTURING',
    });

    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should gracefully handle vector search failure / AI disabled', async () => {
    vectorSearch.search.mockRejectedValueOnce(new Error('AI disabled'));

    const result = await service.search({
      query: 'PET',
      tenantId,
    });

    expect(result.data).toBeDefined();
    expect(result.total).toBe(2);
    expect(result.data[0].similarity).toBeGreaterThan(0);
  });

  it('should resolve digital thread source links for canonical knowledge', async () => {
    const result = await service.search({
      query: 'cooling',
      tenantId,
    });

    const article = result.data.find((r) => r.id === 'art-1');
    expect(article).toBeDefined();
    expect(article?.sourceLinks).toBeDefined();
    expect(article?.sourceLinks?.projectNumber).toBe('PRJ-2026-0002');
    expect(article?.sourceLinks?.drawingNumber).toBe('DRW-2026-0001');
    expect(article?.sourceLinks?.bomNumber).toBe('BOM-2026-0001');
    expect(article?.sourceLinks?.routingNumber).toBe('RTG-2026-0001');
    expect(article?.sourceLinks?.workOrderNumber).toBe('WO-MSWQGIF0-78');
    expect(article?.sourceLinks?.inspectionPlanNumber).toBe('IP-2026-0001');
  });
});
