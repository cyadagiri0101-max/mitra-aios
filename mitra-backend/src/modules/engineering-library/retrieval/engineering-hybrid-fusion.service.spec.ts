import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringHybridFusionService } from './engineering-hybrid-fusion.service';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { LexicalCandidate } from './engineering-lexical-search.service';
import { VectorCandidate } from './engineering-vector-search.service';

describe('EngineeringHybridFusionService (M7.3 Reciprocal Rank Fusion)', () => {
  let service: EngineeringHybridFusionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngineeringHybridFusionService],
    }).compile();

    service = module.get<EngineeringHybridFusionService>(EngineeringHybridFusionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fuses lexical and vector candidates using RRF and prioritizes dual-matched items', () => {
    const chunkA = { id: 'chunk-A', chunkText: 'Chunk A' } as KnowledgeChunk;
    const chunkB = { id: 'chunk-B', chunkText: 'Chunk B' } as KnowledgeChunk;
    const chunkC = { id: 'chunk-C', chunkText: 'Chunk C' } as KnowledgeChunk;

    const lexicalCandidates: LexicalCandidate[] = [
      { chunk: chunkA, lexicalScore: 0.9, matchedTokens: ['bm454'] },
      { chunk: chunkB, lexicalScore: 0.5, matchedTokens: ['insert'] },
    ];

    const vectorCandidates: VectorCandidate[] = [
      { chunk: chunkA, vectorScore: 0.85 },
      { chunk: chunkC, vectorScore: 0.75 },
    ];

    const fused = service.fuseCandidates(lexicalCandidates, vectorCandidates, { rrfK: 60 });
    expect(fused.length).toBe(3);

    // Chunk A is present in both lexical and vector rankings at rank 1 -> highest score
    expect(fused[0].chunk.id).toBe('chunk-A');
    expect(fused[0].lexicalRank).toBe(1);
    expect(fused[0].vectorRank).toBe(1);
    expect(fused[0].fusionScore).toBe(1.0);
  });
});
