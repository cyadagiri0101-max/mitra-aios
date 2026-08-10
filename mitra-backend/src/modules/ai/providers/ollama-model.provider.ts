import { Injectable } from '@nestjs/common';
import { OllamaProvider } from './ollama.provider';
import {
  AiGenerateRequest, AiGenerateResult, AiModelInfo, AiModelProvider,
} from './model-provider.interface';

/**
 * Adapter exposing the legacy OllamaProvider through the AiModelProvider
 * contract. The underlying OllamaProvider (2.8.1 surface) is wrapped,
 * never modified.
 *
 * OllamaProvider.generate() resolves with `done: false` stubs when Ollama
 * is unreachable; the adapter converts those into rejections so the
 * ModelRouterService can fall back to the next provider in the chain.
 */
@Injectable()
export class OllamaModelProvider implements AiModelProvider {
  readonly providerId = 'ollama';

  constructor(private readonly ollama: OllamaProvider) {}

  get modelName(): string {
    return this.ollama.model;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.ollama.enabled) return false;
    const ping = await this.ollama.ping();
    return ping.available;
  }

  async listModels(): Promise<AiModelInfo[]> {
    return [{
      id: `${this.providerId}:${this.ollama.model}`,
      provider: this.providerId,
      name: this.ollama.model,
      capabilities: ['chat', 'embed'],
      configured: this.ollama.enabled,
    }];
  }

  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    if (!this.ollama.enabled) {
      throw new Error('Ollama provider is disabled (AI_ENABLED=false)');
    }
    const started = Date.now();
    const result = await this.ollama.generate(request.prompt);
    if (!result.done) {
      throw new Error('Ollama generation did not complete (service unavailable or disabled)');
    }
    return {
      response: result.response,
      model: result.model ?? this.ollama.model,
      provider: this.providerId,
      modelId: `${this.providerId}:${result.model ?? this.ollama.model}`,
      done: true,
      durationMs: Date.now() - started,
      fallbackUsed: false,
    };
  }
}
