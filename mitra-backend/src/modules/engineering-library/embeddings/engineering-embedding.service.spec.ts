import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EngineeringEmbeddingService } from './engineering-embedding.service';
import { KnowledgeChunk, ChunkEmbeddingStatus } from '../entities/knowledge-chunk.entity';
import { KnowledgeEmbedding } from '../../ai/entities/knowledge-embedding.entity';
import { EmbeddingService } from '../../ai/services/embedding.service';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

describe('EngineeringEmbeddingService (M7.2 Semantic Vector Indexing)', () => {
  let service: EngineeringEmbeddingService;

  let mockChunks: KnowledgeChunk[] = [];
  let mockEmbeddings: KnowledgeEmbedding[] = [];

  const mockChunkRepo = {
    save: jest.fn(async (entity) => {
      const idx = mockChunks.findIndex((c) => c.id === entity.id);
      if (idx >= 0) mockChunks[idx] = entity;
      else mockChunks.push(entity);
      return entity;
    }),
    find: jest.fn(async ({ where }) => {
      return mockChunks.filter((c) => {
        return Object.entries(where).every(([k, v]) => (c as any)[k] === v);
      });
    }),
  };

  const mockEmbeddingRepo = {
    create: jest.fn((dto) => ({ id: `emb-${Math.random().toString(36).substring(2, 9)}`, ...dto })),
    save: jest.fn(async (entity) => {
      const idx = mockEmbeddings.findIndex((e) => e.entityId === entity.entityId && e.tenantId === entity.tenantId);
      if (idx >= 0) mockEmbeddings[idx] = entity;
      else mockEmbeddings.push(entity);
      return entity;
    }),
    findOne: jest.fn(async ({ where }) => {
      return mockEmbeddings.find((e) => {
        return Object.entries(where).every(([k, v]) => (e as any)[k] === v);
      }) || null;
    }),
  };

  const mockEmbeddingService = {
    generateEmbedding: jest.fn().mockImplementation(async (text: string) => {
      // Return a simulated 768-dimensional normalized embedding vector
      const vec = new Array(768).fill(0.01);
      return vec;
    }),
  };

  beforeEach(async () => {
    mockChunks = [];
    mockEmbeddings = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringEmbeddingService,
        { provide: getRepositoryToken(KnowledgeChunk), useValue: mockChunkRepo },
        { provide: getRepositoryToken(KnowledgeEmbedding), useValue: mockEmbeddingRepo },
        { provide: DataSource, useValue: {} },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
      ],
    }).compile();

    service = module.get<EngineeringEmbeddingService>(EngineeringEmbeddingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('embeds pending chunks and stores 768-dimensional vectors', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    mockChunks.push({
      id: 'chunk-1',
      tenantId,
      sourceId: 'src-1',
      sourceType: 'MEKB_DATABASE',
      entityType: 'PROJECT',
      entityId: 'proj-1',
      chunkType: 'PROJECT_CONTEXT',
      chunkOrdinal: 0,
      projectNumber: 'BM454',
      projectPrefix: 'BM',
      customer: 'Veedol',
      machine: 'SEB101',
      material: 'HDPE',
      revision: 'RevA',
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'project_master',
      sourceRow: 1,
      sourcePage: null,
      contentHash: 'hash-chunk-1',
      chunkText: 'Engineering Project Profile for BM454 Veedol 600ml Mold.',
      structuredMetadata: { project_number: 'BM454' },
      embeddingStatus: ChunkEmbeddingStatus.PENDING,
      embeddingModel: 'nomic-embed-text',
      embeddedAt: null,
      errorReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
    });

    const result = await service.embedPendingChunks(tenantId);
    expect(result.embeddedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.dimension).toBe(768);

    expect(mockEmbeddings.length).toBe(1);
    expect(mockEmbeddings[0].entityId).toBe('chunk-1');
    expect(mockEmbeddings[0].modelName).toBe('nomic-embed-text');

    expect(mockChunks[0].embeddingStatus).toBe(ChunkEmbeddingStatus.EMBEDDED);
    expect(mockChunks[0].embeddedAt).toBeDefined();
  });

  it('handles embedding provider failure gracefully without crashing', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    mockChunks.push({
      id: 'chunk-fail',
      tenantId,
      sourceId: 'src-1',
      sourceType: 'MEKB_DATABASE',
      entityType: 'PROJECT',
      entityId: 'proj-1',
      chunkType: 'PROJECT_CONTEXT',
      chunkOrdinal: 0,
      projectNumber: 'BM454',
      projectPrefix: 'BM',
      customer: 'Veedol',
      machine: 'SEB101',
      material: 'HDPE',
      revision: 'RevA',
      authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
      relativePath: 'database/mekb.sqlite',
      sourceFile: 'mekb.sqlite',
      sourceSheet: 'project_master',
      sourceRow: 1,
      sourcePage: null,
      contentHash: 'hash-chunk-fail',
      chunkText: 'Text to fail.',
      structuredMetadata: {},
      embeddingStatus: ChunkEmbeddingStatus.PENDING,
      embeddingModel: 'nomic-embed-text',
      embeddedAt: null,
      errorReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
    });

    mockEmbeddingService.generateEmbedding.mockRejectedValueOnce(new Error('Ollama service timeout'));

    const result = await service.embedPendingChunks(tenantId);
    expect(result.embeddedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(mockChunks[0].embeddingStatus).toBe(ChunkEmbeddingStatus.FAILED);
    expect(mockChunks[0].errorReason).toContain('Ollama service timeout');
  });
});
