import { EngineeringHybridFusionService, GraphCandidate } from './engineering-hybrid-fusion.service';
import { LexicalCandidate } from './engineering-lexical-search.service';
import { VectorCandidate } from './engineering-vector-search.service';
import { KnowledgeChunk, ChunkEmbeddingStatus } from '../entities/knowledge-chunk.entity';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

describe('GraphRAG Hybrid Fusion (S4.3)', () => {
  let service: EngineeringHybridFusionService;

  const createMockChunk = (id: string, projectNumber: string, chunkText: string): KnowledgeChunk => ({
    id,
    tenantId: 'tenant-1',
    sourceId: 'src-1',
    sourceType: 'MEKB',
    entityType: 'PROJECT',
    entityId: id,
    chunkType: 'PROJECT_CONTEXT',
    chunkOrdinal: 0,
    projectNumber,
    projectPrefix: 'BM',
    customer: 'Veedol',
    machine: 'SEB101',
    material: 'P20',
    revision: 'RevA',
    authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
    relativePath: 'db.sqlite',
    sourceFile: 'db.sqlite',
    sourceSheet: 'project_master',
    sourceRow: 1,
    sourcePage: null,
    contentHash: `hash-${id}`,
    chunkText,
    structuredMetadata: {},
    embeddingStatus: ChunkEmbeddingStatus.EMBEDDED,
    embeddingModel: 'nomic-embed-text',
    embeddedAt: new Date(),
    errorReason: null,
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });


  beforeEach(() => {
    service = new EngineeringHybridFusionService();
  });

  it('should fuse lexical, vector, and graph lineage candidates using RRF', () => {
    const chunk1 = createMockChunk('c1', 'BM289', 'BM289 Tool Spec');
    const chunk2 = createMockChunk('c2', 'BM289', 'BM289 BOM Parts');
    const chunk3 = createMockChunk('c3', 'BM331', 'BM331 CAD Features');

    const lexicalCandidates: LexicalCandidate[] = [
      { chunk: chunk1, lexicalScore: 0.9, matchedTokens: ['bm289'] },
      { chunk: chunk2, lexicalScore: 0.7, matchedTokens: ['bm289'] },
    ];

    const vectorCandidates: VectorCandidate[] = [
      { chunk: chunk2, vectorScore: 0.85 },
      { chunk: chunk3, vectorScore: 0.65 },
    ];

    const graphCandidates: GraphCandidate[] = [
      { chunk: chunk1, graphScore: 0.95, relationType: 'REFERENCES', hopDistance: 1 },
    ];

    const fused = service.fuseCandidates(lexicalCandidates, vectorCandidates, graphCandidates, {
      rrfK: 60,
      lexicalWeight: 1.0,
      vectorWeight: 1.0,
      graphWeight: 0.8,
    });

    expect(fused.length).toBe(3);
    // chunk1 has lexical (rank 1) + graph (rank 1)
    // chunk2 has lexical (rank 2) + vector (rank 1)
    expect(fused[0].fusionScore).toBeGreaterThanOrEqual(fused[1].fusionScore);
    expect(fused[0].fusionScore).toBeGreaterThanOrEqual(fused[2].fusionScore);

    const c1Fused = fused.find((f) => f.chunk.id === 'c1');
    expect(c1Fused).toBeDefined();
    expect(c1Fused?.graphScore).toBe(0.95);
    expect(c1Fused?.graphRank).toBe(1);
    expect(c1Fused?.lexicalRank).toBe(1);
  });

  it('should work seamlessly without graph candidates (backward compatibility)', () => {
    const chunk1 = createMockChunk('c1', 'BM289', 'BM289 Tool Spec');
    const lexicalCandidates: LexicalCandidate[] = [
      { chunk: chunk1, lexicalScore: 0.9, matchedTokens: ['bm289'] },
    ];
    const vectorCandidates: VectorCandidate[] = [
      { chunk: chunk1, vectorScore: 0.85 },
    ];

    const fused = service.fuseCandidates(lexicalCandidates, vectorCandidates, []);
    expect(fused.length).toBe(1);
    expect(fused[0].fusionScore).toBe(1.0); // normalized single item
    expect(fused[0].graphRank).toBeNull();
  });
});

