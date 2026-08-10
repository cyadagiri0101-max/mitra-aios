# AI Orchestration Pipeline — Sprint 2.8.2 Phase 4

## Overview

`AiOrchestratorService` is the platform pipeline serving the new
`POST /ai/platform/chat` endpoint. It composes the Phase 1–6 services into a
staged, auditable flow. The legacy `AiCopilotOrchestratorService` (2.8.1) is
untouched and continues to serve `/ai/copilot/*`.

## Stages

| # | Stage | Component |
|---|-------|-----------|
| 1 | RBAC domain access | AiSecurityService.assertDomainAccess |
| 2 | Sanitize + injection detect | AiSecurityService.sanitize / detectInjection |
| 3 | Task mapping | AiDomainCopilotService.mapTask (reused) |
| 4 | Entity context | KnowledgeContextBuilder (reused) |
| 5 | Semantic search | KnowledgeSearch (reused) |
| 6 | Knowledge graph | KnowledgeGraph (reused) |
| 7 | Tool execution | ToolRegistryService |
| 8 | Prompt rendering | PromptRegistryService |
| 9 | Model routing + generation | ModelRouterService |
| 10 | Response format + citations | AiSecurityService.validateCitations |
| 11 | Confidence calculation | AiSecurityService.calculateConfidence |
| 12 | Audit logging | AiAuditService |
| 13 | Conversation save | AiCopilotMemoryService (reused) |

## Key Behaviours

- **Injection-flagged requests never reach a model.** They return a refusal
  message, confidence `0.1`, and are audited with `injection_flagged = true`.
- **No authorized references → no generation.** The pipeline returns an
  advisory "no source records" fallback with confidence `0.35` rather than
  hallucinating.
- **Tool failures are non-fatal.** A failing tool records its error into the
  prompt context and the pipeline continues.
- **Secrets are redacted** in the user message before prompting and before the
  turn is persisted.
- **Provider/model are recorded** on the assistant turn as `provider:model`.

## Response Shape

```
answer, domain, task, promptTemplate, promptVersion, provider, modelUsed,
confidence, references[], toolsExecuted[], injectionFlagged, injectionReasons[],
fallbackUsed, contextSummary, conversationId, processingMs
```

`retrieveContext()` offers the same RBAC + citation validation for pure context
fetches (used by `POST /ai/context`).
