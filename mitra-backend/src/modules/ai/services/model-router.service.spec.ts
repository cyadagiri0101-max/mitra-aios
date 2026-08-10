import { ServiceUnavailableException } from '@nestjs/common';
import { ModelRouterService } from './model-router.service';
import { OllamaModelProvider } from '../providers/ollama-model.provider';
import { MockModelProvider, MOCK_MODEL_NAME } from '../providers/mock-model.provider';

const makeConfig = (chain?: string) => ({
  get: jest.fn((_key: string, fallback?: string) => chain ?? fallback),
});

const makeOllama = (available = true, failGenerate = false) => ({
  providerId: 'ollama',
  modelName: 'phi3',
  isAvailable: jest.fn(async () => available),
  listModels: jest.fn(async () => [{
    id: 'ollama:phi3', provider: 'ollama', name: 'phi3', capabilities: ['chat', 'embed'], configured: true,
  }]),
  generate: jest.fn(async () => {
    if (failGenerate) throw new Error('ollama exploded');
    return {
      response: 'real answer', model: 'phi3', provider: 'ollama',
      modelId: 'ollama:phi3', done: true, durationMs: 5, fallbackUsed: false,
    };
  }),
});

const buildRouter = (ollama: any, chain?: string) =>
  new ModelRouterService(ollama as any, new MockModelProvider(), makeConfig(chain) as any);

describe('ModelRouterService', () => {
  it('routes to the first available provider in the chain', async () => {
    const ollama = makeOllama(true);
    const router = buildRouter(ollama);
    const result = await router.generate({ prompt: 'hello' });
    expect(result.provider).toBe('ollama');
    expect(result.response).toBe('real answer');
    expect(result.fallbackUsed).toBe(false);
    expect(ollama.generate).toHaveBeenCalledTimes(1);
  });

  it('falls back to the mock provider when the primary is unavailable', async () => {
    const router = buildRouter(makeOllama(false));
    const result = await router.generate({ prompt: 'hello' });
    expect(result.provider).toBe('mock');
    expect(result.model).toBe(MOCK_MODEL_NAME);
    expect(result.fallbackUsed).toBe(true);
    expect(result.response).toContain('[mock:');
  });

  it('falls back to the mock provider when generation throws', async () => {
    const router = buildRouter(makeOllama(true, true));
    const result = await router.generate({ prompt: 'hello' });
    expect(result.provider).toBe('mock');
    expect(result.fallbackUsed).toBe(true);
  });

  it('honours a pinned provider model id', async () => {
    const ollama = makeOllama(true);
    const router = buildRouter(ollama);
    const result = await router.generate({ prompt: 'hello', model: 'mock:mitra-mock-1' });
    expect(result.provider).toBe('mock');
    expect(result.fallbackUsed).toBe(false);
    expect(ollama.generate).not.toHaveBeenCalled();
  });

  it('honours a pinned bare model name resolved to its provider', async () => {
    const ollama = makeOllama(true);
    const router = buildRouter(ollama);
    const result = await router.generate({ prompt: 'hello', model: 'phi3' });
    expect(result.provider).toBe('ollama');
  });

  it('aggregates models from every registered provider', async () => {
    const router = buildRouter(makeOllama(true));
    const models = await router.listModels();
    expect(models.map((model) => model.id)).toEqual(['mock:mitra-mock-1', 'ollama:phi3']);
  });

  it('respects AI_PROVIDER_CHAIN ordering', async () => {
    const router = buildRouter(makeOllama(true), 'mock,ollama');
    expect(router.chainOrder()[0]).toBe('mock');
    const result = await router.generate({ prompt: 'hello' });
    expect(result.provider).toBe('mock');
    expect(result.fallbackUsed).toBe(false);
  });

  it('always keeps mock as terminal fallback even when excluded from the chain', () => {
    const router = buildRouter(makeOllama(true), 'ollama');
    expect(router.chainOrder()).toContain('mock');
  });

  it('throws ServiceUnavailableException when no provider can serve', async () => {
    const router = buildRouter(makeOllama(false));
    const mock = router.getProvider('mock') as any;
    jest.spyOn(mock, 'isAvailable').mockResolvedValue(false);
    await expect(router.generate({ prompt: 'hello' })).rejects.toThrow(ServiceUnavailableException);
  });
});

describe('OllamaModelProvider adapter', () => {
  const legacyOllama = (enabled: boolean, done = true) => ({
    enabled,
    model: 'phi3',
    ping: jest.fn(async () => ({ available: true, version: '0.3' })),
    generate: jest.fn(async () => ({ response: 'ok', done, model: 'phi3' })),
  });

  it('reports unavailable when AI is disabled', async () => {
    const provider = new OllamaModelProvider(legacyOllama(false) as any);
    await expect(provider.isAvailable()).resolves.toBe(false);
  });

  it('reports available when enabled and pingable', async () => {
    const provider = new OllamaModelProvider(legacyOllama(true) as any);
    await expect(provider.isAvailable()).resolves.toBe(true);
  });

  it('lists the configured Ollama model', async () => {
    const provider = new OllamaModelProvider(legacyOllama(true) as any);
    const models = await provider.listModels();
    expect(models[0].id).toBe('ollama:phi3');
    expect(models[0].capabilities).toContain('embed');
  });

  it('rejects when disabled so the router can fall back', async () => {
    const provider = new OllamaModelProvider(legacyOllama(false) as any);
    await expect(provider.generate({ prompt: 'x' })).rejects.toThrow(/disabled/);
  });

  it('converts incomplete (done:false) stubs into rejections', async () => {
    const provider = new OllamaModelProvider(legacyOllama(true, false) as any);
    await expect(provider.generate({ prompt: 'x' })).rejects.toThrow(/did not complete/);
  });

  it('maps successful completions to AiGenerateResult', async () => {
    const provider = new OllamaModelProvider(legacyOllama(true) as any);
    const result = await provider.generate({ prompt: 'x' });
    expect(result.modelId).toBe('ollama:phi3');
    expect(result.done).toBe(true);
    expect(result.response).toBe('ok');
  });
});

describe('MockModelProvider', () => {
  it('is always available and deterministic', async () => {
    const provider = new MockModelProvider();
    await expect(provider.isAvailable()).resolves.toBe(true);
    const first = await provider.generate({ prompt: 'same prompt' });
    const second = await provider.generate({ prompt: 'same prompt' });
    expect(first.response).toBe(second.response);
    expect(first.response).toContain('Advisory stub response');
  });
});
