import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingService } from './embedding.service';
import { OllamaProvider } from '../providers/ollama.provider';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KnowledgeEmbedding, EmbeddingEntityType } from '../entities/knowledge-embedding.entity';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const makeOllama = (enabled = true, vector: number[] | null = null) => ({
  enabled,
  embed: jest.fn().mockResolvedValue(vector ?? Array(768).fill(0.01)),
});

const makeRepo = (existing: Partial<KnowledgeEmbedding> | null = null) => ({
  findOne: jest.fn().mockResolvedValue(existing),
  create:  jest.fn((d: any) => ({ ...d })),
  save:    jest.fn((e: any) => Promise.resolve({ id: 'embed-uuid', ...e })),
});

// ── Suite ─────────────────────────────────────────────────────────────────────
describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let ollama: ReturnType<typeof makeOllama>;
  let repo: ReturnType<typeof makeRepo>;

  const build = async (ollamaEnabled = true, existing: any = null) => {
    ollama = makeOllama(ollamaEnabled);
    repo   = makeRepo(existing);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: OllamaProvider, useValue: ollama },
        { provide: getRepositoryToken(KnowledgeEmbedding), useValue: repo },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  };

  // ── generateEmbedding ────────────────────────────────────────────────────

  describe('generateEmbedding()', () => {
    it('returns a vector from ollama when enabled', async () => {
      await build(true);
      const vec = await service.generateEmbedding('flash defect');
      expect(Array.isArray(vec)).toBe(true);
      expect(vec!.length).toBe(768);
    });

    it('returns a deterministic pseudo-vector when ollama is disabled', async () => {
      await build(false);
      const vec = await service.generateEmbedding('same text');
      expect(Array.isArray(vec)).toBe(true);
      expect(vec!.length).toBe(768);
      // Deterministic — same input yields same output
      const vec2 = await service.generateEmbedding('same text');
      expect(vec).toEqual(vec2);
    });

    it('pseudo-vector is unit-normalised', async () => {
      await build(false);
      const vec = await service.generateEmbedding('test') as number[];
      const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      expect(mag).toBeCloseTo(1.0, 5);
    });

    it('returns null when ollama is enabled but throws', async () => {
      await build(true);
      ollama.embed.mockRejectedValueOnce(new Error('connection refused'));
      const vec = await service.generateEmbedding('query');
      expect(vec).toBeNull();
    });
  });

  // ── upsertEmbedding ──────────────────────────────────────────────────────

  describe('upsertEmbedding()', () => {
    const input = {
      entityType: EmbeddingEntityType.TRIAL,
      entityId:   'trial-uuid-1',
      content:    'observations about the flash defect on parting line',
      tenantId:   'tenant-uuid-1',
      metadata:   { result: 'FAIL' },
    };

    it('creates a new embedding record when none exists', async () => {
      await build(false, null);
      const record = await service.upsertEmbedding(input);
      expect(repo.save).toHaveBeenCalled();
      expect(record.entityType).toBe(EmbeddingEntityType.TRIAL);
    });

    it('skips re-embedding when content hash is unchanged (idempotent)', async () => {
      const { createHash } = await import('crypto');
      const hash = createHash('sha256').update(input.content).digest('hex');
      const existing = { ...input, contentHash: hash, embedding: '[0.1,0.2]' } as any;

      await build(false, existing);
      const result = await service.upsertEmbedding(input);

      // save should NOT have been called again
      expect(repo.save).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('re-embeds when content hash changes', async () => {
      const existing = { ...input, contentHash: 'old-hash-different', embedding: null } as any;
      await build(false, existing);

      await service.upsertEmbedding({ ...input, content: 'new different content text' });

      expect(repo.save).toHaveBeenCalled();
    });

    it('stores embedding as pgvector literal string [x,y,z]', async () => {
      await build(false, null);
      await service.upsertEmbedding(input);

      const saved = repo.save.mock.calls[0][0];
      expect(typeof saved.embedding).toBe('string');
      expect(saved.embedding).toMatch(/^\[.+\]$/);
    });

    it('caps content_text at 2000 characters', async () => {
      await build(false, null);
      const longContent = 'x'.repeat(5000);
      await service.upsertEmbedding({ ...input, content: longContent });

      const saved = repo.save.mock.calls[0][0];
      expect(saved.contentText.length).toBeLessThanOrEqual(2000);
    });

    it('stores null embedding when vector generation fails', async () => {
      await build(true);
      ollama.embed.mockRejectedValueOnce(new Error('timeout'));
      await service.upsertEmbedding(input);

      const saved = repo.save.mock.calls[0][0];
      expect(saved.embedding).toBeNull();
    });
  });
});
