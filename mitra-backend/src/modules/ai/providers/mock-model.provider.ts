import { Injectable } from '@nestjs/common';
import {
  AiGenerateRequest, AiGenerateResult, AiModelInfo, AiModelProvider,
} from './model-provider.interface';

export const MOCK_MODEL_NAME = 'mitra-mock-1';

/**
 * Deterministic mock provider. Always available; used for e2e tests,
 * local development without Ollama, and as the terminal fallback of the
 * router chain so AI APIs never hard-fail when no real provider is up.
 *
 * Responses are clearly marked advisory stubs and echo a short, safe
 * digest of the prompt — they never claim real analysis.
 */
@Injectable()
export class MockModelProvider implements AiModelProvider {
  readonly providerId = 'mock';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async listModels(): Promise<AiModelInfo[]> {
    return [{
      id: `${this.providerId}:${MOCK_MODEL_NAME}`,
      provider: this.providerId,
      name: MOCK_MODEL_NAME,
      capabilities: ['chat'],
      configured: true,
    }];
  }

  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const digest = this.digest(request.prompt);
    return {
      response: `[mock:${MOCK_MODEL_NAME}] Advisory stub response (no model invoked). Prompt digest ${digest}, ${request.prompt.length} chars.`,
      model: MOCK_MODEL_NAME,
      provider: this.providerId,
      modelId: `${this.providerId}:${MOCK_MODEL_NAME}`,
      done: true,
      durationMs: 0,
      fallbackUsed: false,
    };
  }

  private digest(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
  }
}
