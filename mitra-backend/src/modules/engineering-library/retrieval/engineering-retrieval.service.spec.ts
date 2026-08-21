import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringRetrievalService } from './engineering-retrieval.service';
import { EngineeringQueryNormalizerService } from './engineering-query-normalizer.service';
import { EngineeringSynonymService } from './engineering-synonym.service';
import { EngineeringLexicalSearchService } from './engineering-lexical-search.service';
import { EngineeringVectorSearchService } from './engineering-vector-search.service';
import { EngineeringHybridFusionService } from './engineering-hybrid-fusion.service';
import { EngineeringRerankerService } from './engineering-reranker.service';
import { EngineeringDiversityService } from './engineering-diversity.service';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

describe('EngineeringRetrievalService (M7.3 Hybrid Retrieval Orchestration)', () => {
  let service: EngineeringRetrievalService;

  const mockChunk = {
    id: 'chunk-1',
    tenantId: 'tenant-1',
    entityType: 'BOM_PART',
    entityId: 'part-1',
    chunkType: 'BOM_TABLE',
    title: 'BOM Part: BODY INSERT',
    projectNumber: 'BM454',
    projectPrefix: 'BM',
    customer: 'Veedol',
    machine: 'SEB101',
    material: 'ALUMINIUM',
    revision: 'RevA',
    authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
    chunkText: '=== ENGINEERING BILL OF MATERIALS (BOM) PART: BODY INSERT- B & P ===\n| Project | Item | Description | Material |\n| BM454 | 1 | BODY INSERT | ALUMINIUM |',
    contentHash: 'hash-1',
    sourceId: 'src-1',
    sourceType: 'MEKB_DATABASE',
    relativePath: 'database/mekb.sqlite',
    sourceFile: 'mekb.sqlite',
    sourceSheet: 'part_list',
    sourceRow: 1,
    sourcePage: null,
    structuredMetadata: { description: 'BODY INSERT' },
  } as unknown as KnowledgeChunk;

  const mockLexical = {
    searchLexical: jest.fn().mockResolvedValue([
      { chunk: mockChunk, lexicalScore: 0.95, matchedTokens: ['bm454', 'insert'] },
    ]),
  };

  const mockVector = {
    searchVector: jest.fn().mockResolvedValue({
      candidates: [{ chunk: mockChunk, vectorScore: 0.88 }],
      degraded: false,
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringRetrievalService,
        EngineeringQueryNormalizerService,
        EngineeringSynonymService,
        { provide: EngineeringLexicalSearchService, useValue: mockLexical },
        { provide: EngineeringVectorSearchService, useValue: mockVector },
        EngineeringHybridFusionService,
        EngineeringRerankerService,
        EngineeringDiversityService,
      ],
    }).compile();

    service = module.get<EngineeringRetrievalService>(EngineeringRetrievalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('retrieves knowledge with full provenance and telemetry', async () => {
    const response = await service.retrieve('tenant-1', {
      query: 'What is the BM454 body insert material?',
      topK: 5,
    });

    expect(response.query).toBe('What is the BM454 body insert material?');
    expect(response.normalizedQuery).toBeDefined();
    expect(response.results.length).toBe(1);

    const res = response.results[0];
    expect(res.chunkId).toBe('chunk-1');
    expect(res.projectNumber).toBe('BM454');
    expect(res.material).toBe('ALUMINIUM');
    expect(res.provenance.sourceFile).toBe('mekb.sqlite');
    expect(res.provenance.sourceSheet).toBe('part_list');
    expect(res.provenance.sourceRow).toBe(1);

    expect(response.telemetry.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(response.telemetry.degradedMode).toBe(false);
  });

  it('handles vector service degradation gracefully', async () => {
    mockVector.searchVector.mockResolvedValueOnce({
      candidates: [],
      degraded: true,
      error: 'Ollama service offline',
    });

    const response = await service.retrieve('tenant-1', {
      query: 'BM454 body insert',
      topK: 5,
    });

    expect(response.telemetry.degradedMode).toBe(true);
    expect(response.telemetry.degradedReason).toContain('Ollama service offline');
    expect(response.results.length).toBe(1); // Lexical candidates still returned
  });
});
