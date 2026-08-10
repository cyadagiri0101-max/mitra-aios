/**
 * Sprint 2.8.2 Phase 1 — Model Router provider abstraction.
 *
 * Every model backend (Ollama today; cloud or mock providers later)
 * implements AiModelProvider. ModelRouterService routes generation
 * requests across registered providers with availability checks and
 * fallback ordering. Providers must be read-only advisory services:
 * they never mutate domain state.
 */

export type AiModelCapability = 'chat' | 'embed';

export interface AiModelInfo {
  /** Globally unique model id: `<provider>:<model>` (e.g. `ollama:phi3`). */
  id: string;
  /** Provider identifier (e.g. `ollama`, `mock`). */
  provider: string;
  /** Provider-local model name. */
  name: string;
  capabilities: AiModelCapability[];
  /** Configuration-level availability (does not probe the network). */
  configured: boolean;
}

export interface AiGenerateRequest {
  prompt: string;
  /** Optional full model id (`provider:model`) to pin the provider. */
  model?: string;
  /** Optional task hint for provider-side tuning / audit. */
  task?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiGenerateResult {
  response: string;
  /** Provider-local model name that produced the response. */
  model: string;
  /** Provider identifier that produced the response. */
  provider: string;
  /** Full model id (`provider:model`). */
  modelId: string;
  done: boolean;
  durationMs: number;
  /** True when the router fell back to a non-preferred provider. */
  fallbackUsed: boolean;
}

export interface AiModelProvider {
  readonly providerId: string;
  /** Live availability probe (may hit the network). */
  isAvailable(): Promise<boolean>;
  /** Enumerate models exposed by this provider. */
  listModels(): Promise<AiModelInfo[]>;
  /** Generate a completion. Must reject on hard failures so the router can fall back. */
  generate(request: AiGenerateRequest): Promise<AiGenerateResult>;
}
