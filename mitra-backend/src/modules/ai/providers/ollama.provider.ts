import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OllamaRequest {
  model:   string;
  prompt:  string;
  stream:  boolean;
  options?: { temperature?: number; num_predict?: number; top_p?: number };
}

export interface OllamaResponse {
  response:         string;
  done:             boolean;
  total_duration?:  number;
  model:            string;
}

@Injectable()
export class OllamaProvider implements OnModuleInit {
  private readonly logger  = new Logger(OllamaProvider.name);
  readonly enabled:   boolean;
  readonly model:     string;
  readonly url:       string;
  readonly timeoutMs: number;

  constructor(private readonly cfg: ConfigService) {
    this.enabled   = cfg.get<string>('AI_ENABLED', 'false') === 'true';
    this.model     = cfg.get<string>('OLLAMA_MODEL', 'phi3');
    this.url       = cfg.get<string>('OLLAMA_URL', 'http://localhost:11434');
    this.timeoutMs = parseInt(cfg.get<string>('OLLAMA_TIMEOUT_MS', '45000'));
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('AI module disabled (AI_ENABLED=false). Set AI_ENABLED=true and configure OLLAMA_URL to enable.');
      return;
    }
    const health = await this.ping();
    if (health.available) {
      this.logger.log(`✓ Ollama online — model: ${this.model} — version: ${health.version ?? 'unknown'}`);
    } else {
      this.logger.warn(`Ollama not reachable at ${this.url} — AI features will return disabled stubs`);
    }
  }

  async ping(): Promise<{ available: boolean; version?: string }> {
    try {
      const ctrl = new AbortController();
      const id   = setTimeout(() => ctrl.abort(), 5000);
      const res  = await fetch(`${this.url}/api/version`, { signal: ctrl.signal });
      clearTimeout(id);
      if (!res.ok) return { available: false };
      const data = await res.json() as { version?: string };
      return { available: true, version: data.version };
    } catch {
      return { available: false };
    }
  }

  /**
   * Call the Ollama /api/generate endpoint for text completions.
   */
  async generate(prompt: string): Promise<OllamaResponse> {
    if (!this.enabled) {
      return {
        response: '[AI_DISABLED] Set AI_ENABLED=true and configure OLLAMA_URL to enable.',
        done: false,
        model: this.model,
      };
    }

    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.url}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:  this.model,
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 1024, top_p: 0.9 },
        } as OllamaRequest),
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        this.logger.error(`Ollama HTTP ${res.status}: ${res.statusText}`);
        throw new Error(`Ollama error: ${res.status}`);
      }

      return res.json() as Promise<OllamaResponse>;

    } catch (err: any) {
      clearTimeout(timer);
      this.logger.error('Ollama call failed', err.message);
      return {
        response: 'AI service is temporarily unavailable. Please try again in a moment.',
        done: false,
        model: this.model,
      };
    }
  }

  /**
   * Call the Ollama /api/embeddings endpoint to generate a vector embedding.
   * Returns null when AI is disabled or Ollama is unreachable (EmbeddingService
   * will fall back to deterministic pseudo-vectors or skip embedding silently).
   */
  async embed(text: string, model?: string): Promise<number[] | null> {
    if (!this.enabled) return null;

    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.url}/api/embeddings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model ?? this.model, prompt: text }),
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        this.logger.warn(`Ollama embed HTTP ${res.status}`);
        return null;
      }

      const data = await res.json() as { embedding?: number[] };
      return data.embedding ?? null;

    } catch (err: any) {
      clearTimeout(timer);
      this.logger.warn(`Embed call failed: ${err.message}`);
      return null;
    }
  }
}
