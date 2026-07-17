import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { OllamaProvider } from '../providers/ollama.provider';
import { AiContextService } from './ai-context.service';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { AiIntent } from '../dto/ai.dto';

const makeOllama = (enabled = true) => ({
  enabled,
  model:    'llama3.2',
  url:      'http://localhost:11434',
  ping:     jest.fn().mockResolvedValue({ available: true, version: '0.3.0' }),
  generate: jest.fn().mockResolvedValue({ response: 'AI answer here.', model: 'llama3.2' }),
});

const makeContext = (intent: AiIntent = AiIntent.GENERAL) => ({
  buildContext: jest.fn().mockResolvedValue({
    intent,
    data:    { projects: [{ project_number: 'P001', status: 'ACTIVE' }] },
    summary: '1 project fetched',
  }),
});

const makeEm = () => ({
  query: jest.fn().mockResolvedValue([]),
});

describe('AiService', () => {
  let service: AiService;
  let ollama: ReturnType<typeof makeOllama>;
  let context: ReturnType<typeof makeContext>;
  let em: ReturnType<typeof makeEm>;

  const build = async (enabled = true) => {
    ollama  = makeOllama(enabled);
    context = makeContext();
    em      = makeEm();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: OllamaProvider, useValue: ollama },
        { provide: AiContextService, useValue: context },
        { provide: getEntityManagerToken(), useValue: em },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  };

  // ── health() ───────────────────────────────────────────────────────────────

  describe('health()', () => {
    it('returns enabled:false when AI is disabled', async () => {
      await build(false);
      const h = await service.health();
      expect(h.enabled).toBe(false);
      expect(h.available).toBe(false);
    });

    it('returns enabled:true and available:true when Ollama responds', async () => {
      await build(true);
      const h = await service.health();
      expect(h.enabled).toBe(true);
      expect(h.available).toBe(true);
    });

    it('returns available:false when Ollama is unreachable', async () => {
      await build(true);
      ollama.ping.mockResolvedValue({ available: false, version: undefined });
      const h = await service.health();
      expect(h.available).toBe(false);
      expect(h.reason).toBeDefined();
    });
  });

  // ── chat() ─────────────────────────────────────────────────────────────────

  describe('chat()', () => {
    const dto = { message: 'What are my overdue projects?', history: [] };

    it('returns answer and modelUsed', async () => {
      await build(true);
      const result = await service.chat(dto, 'tenant-1');
      expect(result.answer).toBeDefined();
      expect(result.modelUsed).toBe('llama3.2');
      expect(result.intent).toBeDefined();
    });

    it('calls buildContext with the detected intent', async () => {
      await build(true);
      await service.chat({ message: 'show trial results', history: [] }, 'tenant-1');
      expect(context.buildContext).toHaveBeenCalledWith(
        expect.stringMatching(/trial/i),
        'tenant-1',
      );
    });

    it('returns fallback answer when AI is disabled', async () => {
      await build(false);
      const result = await service.chat(dto, 'tenant-1');
      expect(result.aiEnabled).toBe(false);
      expect(typeof result.answer).toBe('string');
    });

    it('includes processingMs in the response', async () => {
      await build(true);
      const result = await service.chat(dto, 'tenant-1');
      expect(typeof result.processingMs).toBe('number');
      expect(result.processingMs).toBeGreaterThanOrEqual(0);
    });

    it('uses provided intent when dto.intent is set', async () => {
      await build(true);
      await service.chat({ message: 'any', intent: AiIntent.CAPA }, 'tenant-1');
      expect(context.buildContext).toHaveBeenCalledWith(AiIntent.CAPA, 'tenant-1');
    });
  });

  // ── analyzeEntity() ───────────────────────────────────────────────────────

  describe('analyzeEntity()', () => {
    it('returns not-found answer when entity missing', async () => {
      await build(true);
      em.query.mockResolvedValue([]); // no row
      const result = await service.analyzeEntity(
        { entityType: 'trial', entityId: 'ghost-id' },
        'tenant-1',
      );
      expect(result.answer).toContain('not found');
    });

    it('returns AI analysis when entity exists', async () => {
      await build(true);
      em.query.mockResolvedValue([{ id: 'trial-1', result: 'PASS', observations: 'ok' }]);
      const result = await service.analyzeEntity(
        { entityType: 'trial', entityId: 'trial-1' },
        'tenant-1',
      );
      expect(result.answer).toBe('AI answer here.');
    });

    it('returns raw JSON when AI is disabled', async () => {
      await build(false);
      em.query.mockResolvedValue([{ id: 'trial-1', result: 'FAIL' }]);
      const result = await service.analyzeEntity(
        { entityType: 'trial', entityId: 'trial-1', question: 'What went wrong?' },
        'tenant-1',
      );
      expect(result.aiEnabled).toBe(false);
      expect(result.answer).toContain('FAIL');
    });
  });
});
