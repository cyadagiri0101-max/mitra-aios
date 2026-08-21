import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringRerankerService } from './engineering-reranker.service';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { AuthorityStatus } from '../types/engineering-library-scan.types';
import { FusedCandidate } from './engineering-hybrid-fusion.service';

describe('EngineeringRerankerService (M7.3 Engineering Feature Reranker)', () => {
  let service: EngineeringRerankerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngineeringRerankerService],
    }).compile();

    service = module.get<EngineeringRerankerService>(EngineeringRerankerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('strongly boosts exact project number matches', () => {
    const chunkMatching = {
      id: 'c1',
      projectNumber: 'BM454',
      chunkText: 'BOM for BM454 Veedol 600ml Mold.',
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      structuredMetadata: {},
    } as KnowledgeChunk;

    const chunkOther = {
      id: 'c2',
      projectNumber: 'BM377',
      chunkText: 'BOM for BM377 Mold.',
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      structuredMetadata: {},
    } as KnowledgeChunk;

    const candidates: FusedCandidate[] = [
      { chunk: chunkOther, fusionScore: 0.8, lexicalScore: 0.8, vectorScore: 0.8, lexicalRank: 1, vectorRank: 1, matchedTokens: [] },
      { chunk: chunkMatching, fusionScore: 0.75, lexicalScore: 0.75, vectorScore: 0.75, lexicalRank: 2, vectorRank: 2, matchedTokens: [] },
    ];

    const reranked = service.rerank(candidates, 'BM454 BOM insert', { projectNumber: 'BM454' });
    expect(reranked[0].chunk.id).toBe('c1');
    expect(reranked[0].boostBreakdown.projectBoost).toBe(0.35);
  });

  it('penalizes superseded authority status', () => {
    const chunkCurrent = {
      id: 'c-curr',
      projectNumber: 'BM454',
      chunkText: 'Current BOM',
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      structuredMetadata: {},
    } as KnowledgeChunk;

    const chunkSuperseded = {
      id: 'c-old',
      projectNumber: 'BM454',
      chunkText: 'Old Superseded BOM',
      authorityStatus: AuthorityStatus.SUPERSEDED,
      structuredMetadata: {},
    } as KnowledgeChunk;

    const candidates: FusedCandidate[] = [
      { chunk: chunkSuperseded, fusionScore: 0.9, lexicalScore: 0.9, vectorScore: 0.9, lexicalRank: 1, vectorRank: 1, matchedTokens: [] },
      { chunk: chunkCurrent, fusionScore: 0.85, lexicalScore: 0.85, vectorScore: 0.85, lexicalRank: 2, vectorRank: 2, matchedTokens: [] },
    ];

    const reranked = service.rerank(candidates, 'BM454 BOM', { projectNumber: 'BM454' });
    expect(reranked[0].chunk.id).toBe('c-curr');
    expect(reranked[1].boostBreakdown.authorityFactor).toBe(0.3);
  });
});
