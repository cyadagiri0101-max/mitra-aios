# AI Model Router — Sprint 2.8.2 Phase 1

## Provider Abstraction

Every model backend implements `AiModelProvider`
(`modules/ai/providers/model-provider.interface.ts`):

```ts
interface AiModelProvider {
  readonly providerId: string;
  isAvailable(): Promise<boolean>;
  listModels(): Promise<AiModelInfo[]>;
  generate(request: AiGenerateRequest): Promise<AiGenerateResult>;
}
```

Models are addressed as `provider:model` (e.g. `ollama:phi3`).

## Providers

- **`OllamaModelProvider`** — adapter around the legacy `OllamaProvider`
  (which is wrapped, never modified). Because `OllamaProvider.generate()`
  resolves with `done:false` stubs when Ollama is unreachable, the adapter
  converts incomplete results and disabled state into rejections so the router
  can fall back cleanly.
- **`MockModelProvider`** — deterministic, always-available stub that clearly
  labels its output `[mock:mitra-mock-1] Advisory stub response…`. Used for
  tests, local development, and as the terminal fallback so AI APIs degrade
  gracefully instead of hard-failing.

## Routing Semantics

`ModelRouterService` resolves a candidate chain per request:

1. If `request.model` pins a provider (`ollama:phi3` or a bare model name that
   resolves to one), that provider leads the chain.
2. Otherwise the configured `AI_PROVIDER_CHAIN` order is used (default
   `ollama,mock`). The mock provider is always appended as terminal fallback
   even if omitted from the chain.
3. The router walks the chain, skipping unavailable providers and catching
   generation errors, returning the first success with
   `fallbackUsed = index > 0`.
4. If nothing can serve the request it raises `ServiceUnavailableException`
   (unreachable in practice while the mock provider is registered).

## Endpoints

`GET /ai/models` returns `{ models, chain }` — the aggregated model catalogue
and the active fallback ordering.
