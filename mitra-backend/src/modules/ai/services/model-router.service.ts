import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockModelProvider } from '../providers/mock-model.provider';
import { OllamaModelProvider } from '../providers/ollama-model.provider';
import {
  AiGenerateRequest, AiGenerateResult, AiModelInfo, AiModelProvider,
} from '../providers/model-provider.interface';

/**
 * Sprint 2.8.2 Phase 1 — Model Router.
 *
 * Routes generation requests across registered AiModelProviders using a
 * configured fallback chain (AI_PROVIDER_CHAIN, default `ollama,mock`).
 * The mock provider is always kept as the terminal fallback so advisory
 * AI APIs degrade gracefully instead of hard-failing.
 */
@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);
  private readonly providers = new Map<string, AiModelProvider>();
  private readonly chain: string[];

  constructor(
    ollamaProvider: OllamaModelProvider,
    mockProvider: MockModelProvider,
    config: ConfigService,
  ) {
    this.register(ollamaProvider);
    this.register(mockProvider);

    const configured = (config.get<string>('AI_PROVIDER_CHAIN', 'ollama,mock') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    this.chain = configured.filter((id) => this.providers.has(id));
    if (!this.chain.includes(mockProvider.providerId)) {
      this.chain.push(mockProvider.providerId);
    }
    this.logger.log(`Model router ready — provider chain: ${this.chain.join(' → ')}`);
  }

  register(provider: AiModelProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  getProvider(providerId: string): AiModelProvider | undefined {
    return this.providers.get(providerId);
  }

  providerIds(): string[] {
    return [...this.providers.keys()];
  }

  chainOrder(): string[] {
    return [...this.chain];
  }

  async listModels(): Promise<AiModelInfo[]> {
    const models: AiModelInfo[] = [];
    for (const provider of this.providers.values()) {
      try {
        models.push(...await provider.listModels());
      } catch (err: any) {
        this.logger.warn(`Provider ${provider.providerId} failed to list models: ${err.message}`);
      }
    }
    return models.sort((a, b) => a.id.localeCompare(b.id));
  }

  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const candidates = this.resolveCandidates(request.model);
    const errors: string[] = [];

    for (let index = 0; index < candidates.length; index += 1) {
      const providerId = candidates[index];
      const provider = this.providers.get(providerId);
      if (!provider) continue;

      try {
        if (!await provider.isAvailable()) continue;
        const result = await provider.generate(request);
        return { ...result, fallbackUsed: index > 0 };
      } catch (err: any) {
        errors.push(`${providerId}: ${err.message}`);
        this.logger.warn(`Provider ${providerId} failed generation: ${err.message}`);
      }
    }

    throw new ServiceUnavailableException(
      `No AI model provider could serve the request (${errors.join('; ') || 'no providers registered'})`,
    );
  }

  private resolveCandidates(pinnedModel?: string): string[] {
    if (!pinnedModel) return [...this.chain];

    const pinnedProvider = pinnedModel.includes(':')
      ? pinnedModel.split(':')[0]
      : this.findProviderByModelName(pinnedModel);

    if (!pinnedProvider || !this.providers.has(pinnedProvider)) {
      return [...this.chain];
    }
    return [pinnedProvider, ...this.chain.filter((id) => id !== pinnedProvider)];
  }

  private findProviderByModelName(modelName: string): string | undefined {
    for (const provider of this.providers.values()) {
      if (provider instanceof OllamaModelProvider && provider.modelName === modelName) {
        return provider.providerId;
      }
    }
    return undefined;
  }
}
