# AI Prompt Registry — Sprint 2.8.2 Phase 2

## Overview

`PromptRegistryService` is the DB-backed, versioned, localized prompt catalogue
with an approval lifecycle. It is seeded from a single source of truth —
`prompt-seed.data.ts` — which the legacy `PromptTemplateService` also reads, so
prompt text can never drift between the legacy `/ai/copilot/*` path and the new
platform pipeline.

## Seed Catalogue

`prompt-seed.data.ts` exports:

- `SAFETY_PREAMBLE` — the advisory-only, anti-injection, no-secrets preamble.
- `PROMPT_SEED_DEFINITIONS` — 30 domain tasks across engineering,
  manufacturing, quality, service, executive, commercial, and project.
- `buildSeedTemplateText()` — renders the canonical template body with the five
  variables `message`, `memory`, `context`, `searchResults`, `graphContext`.

## Lifecycle

```
DRAFT ──publish──▶ PUBLISHED ──archive──▶ ARCHIVED
```

- `create()` always produces a **DRAFT**; duplicate `(key, version, locale)` is
  rejected.
- `publish()` archives any existing PUBLISHED version of the same
  `(key, locale)` and stamps `approved_by` / `approved_at`.
- Only DRAFTs can be edited; PUBLISHED/ARCHIVED prompts are immutable — change
  requires a new version.

## Validation

- Key must be dot-separated (`quality.ncr_explanation`).
- Template text required (min length).
- Declared `variables` must each appear as `{{var}}` in the template.

## Resilience

Seeding at startup is idempotent (`ON CONFLICT DO NOTHING` via `orIgnore`) and
wrapped in try/catch. If the database is unreachable, the registry serves the
same seed definitions from memory and reports `source: 'fallback'` so advisory
prompts keep working.

## Rendering & Redaction

`buildPrompt()` resolves the PUBLISHED template for `(key, locale)` (falling
back to `en`) and substitutes variables. All string values pass through secret
redaction (`password/secret/token/api_key/private_key → [redacted]`).

## Endpoints

- `GET /ai/prompts` — list/filter/paginate (`ai:prompt:read`)
- `POST /ai/prompts` — create draft (`ai:prompt:write`)
- `PATCH /ai/prompts/:id` — edit draft (`ai:prompt:write`)
- `POST /ai/prompts/:id/publish` — approve & publish (`ai:prompt:approve`)
