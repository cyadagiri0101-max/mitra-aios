import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EngineeringChunkerService } from './engineering-chunker.service';
import { KnowledgeChunk, ChunkEmbeddingStatus } from '../entities/knowledge-chunk.entity';
import { NormalizedEngineeringRecord } from '../normalization/engineering-normalizer.service';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

describe('EngineeringChunkerService (M7.2 Chunking & Idempotency)', () => {
  let service: EngineeringChunkerService;

  let mockChunks: KnowledgeChunk[] = [];

  const mockChunkRepo = {
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (entity) => {
      const idx = mockChunks.findIndex((c) => c.tenantId === entity.tenantId && c.contentHash === entity.contentHash);
      if (idx >= 0) {
        mockChunks[idx] = entity;
      } else {
        mockChunks.push(entity);
      }
      return entity;
    }),
    findOne: jest.fn(async ({ where }) => {
      return mockChunks.find((c) => {
        return Object.entries(where).every(([k, v]) => (c as any)[k] === v);
      }) || null;
    }),
    find: jest.fn(async ({ where }) => {
      return mockChunks.filter((c) => {
        return Object.entries(where).every(([k, v]) => (c as any)[k] === v);
      });
    }),
  };

  beforeEach(async () => {
    mockChunks = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringChunkerService,
        { provide: getRepositoryToken(KnowledgeChunk), useValue: mockChunkRepo },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<EngineeringChunkerService>(EngineeringChunkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates deterministic chunk IDs and persists chunks on First Run', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const records: NormalizedEngineeringRecord[] = [
      {
        tenantId,
        sourceId: 'src-1',
        sourceType: 'MEKB_DATABASE',
        entityType: 'PROJECT',
        entityId: 'proj-1',
        chunkType: 'PROJECT_CONTEXT',
        title: 'Project BM454',
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
        normalizedText: 'Engineering Project Profile for BM454 Veedol 600ml Mold.',
        structuredMetadata: { project_number: 'BM454' },
      },
    ];

    const result = await service.chunkAndPersist(tenantId, records);
    expect(result.chunksCreated).toBe(1);
    expect(result.chunksSkipped).toBe(0);
    expect(mockChunks.length).toBe(1);

    const chunk = mockChunks[0];
    expect(chunk.tenantId).toBe(tenantId);
    expect(chunk.projectNumber).toBe('BM454');
    expect(chunk.embeddingStatus).toBe(ChunkEmbeddingStatus.PENDING);
    expect(chunk.id).toBeDefined();
  });

  it('guarantees IDEMPOTENCY on Second Run (0 created, 0 updated, all skipped)', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const records: NormalizedEngineeringRecord[] = [
      {
        tenantId,
        sourceId: 'src-1',
        sourceType: 'MEKB_DATABASE',
        entityType: 'PROJECT',
        entityId: 'proj-1',
        chunkType: 'PROJECT_CONTEXT',
        title: 'Project BM454',
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
        normalizedText: 'Engineering Project Profile for BM454 Veedol 600ml Mold.',
        structuredMetadata: { project_number: 'BM454' },
      },
    ];

    const run1 = await service.chunkAndPersist(tenantId, records);
    expect(run1.chunksCreated).toBe(1);

    const run2 = await service.chunkAndPersist(tenantId, records);
    expect(run2.chunksCreated).toBe(0);
    expect(run2.chunksUpdated).toBe(0);
    expect(run2.chunksSkipped).toBe(1);
    expect(mockChunks.length).toBe(1); // No uncontrolled duplicate growth
  });

  it('enforces multi-tenant isolation (Tenant A vs Tenant B chunks)', async () => {
    const tenantA = '11111111-1111-1111-1111-111111111111';
    const tenantB = '22222222-2222-2222-2222-222222222222';

    const recordA: NormalizedEngineeringRecord = {
      tenantId: tenantA,
      sourceId: 'src-1',
      sourceType: 'MEKB_DATABASE',
      entityType: 'PROJECT',
      entityId: 'proj-1',
      chunkType: 'PROJECT_CONTEXT',
      title: 'Project BM454',
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
      normalizedText: 'Engineering Project Profile for BM454 Veedol 600ml Mold.',
      structuredMetadata: { project_number: 'BM454' },
    };

    const recordB = { ...recordA, tenantId: tenantB };

    await service.chunkAndPersist(tenantA, [recordA]);
    await service.chunkAndPersist(tenantB, [recordB]);

    const tenantAChunks = mockChunks.filter((c) => c.tenantId === tenantA);
    const tenantBChunks = mockChunks.filter((c) => c.tenantId === tenantB);

    expect(tenantAChunks.length).toBe(1);
    expect(tenantBChunks.length).toBe(1);
    expect(tenantAChunks[0].id).not.toBe(tenantBChunks[0].id);
    expect(tenantAChunks[0].contentHash).not.toBe(tenantBChunks[0].contentHash);
  });
});
