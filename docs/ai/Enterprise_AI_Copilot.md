# MITRA v4.0 — Enterprise AI Copilot

**Sprint 2.8.3 · Verified repository behavior**

---

## Overview

The Enterprise AI Copilot layer delivers seven domain copilots (Engineering,
Manufacturing, Quality, Commercial, Project, Service, Executive) on top of the
Sprint 2.8.2 AI platform pipeline. Each copilot is capability-aware: a single
HTTP endpoint accepts a natural-language message and resolves a capability
through a catalogue that is the single source of truth for prompts, tools,
suggested actions, and follow-up questions.

The system is **advisory only** — it never mutates domain state. All tools are
read-only, permission-checked adapters over exported domain services.

## Feature Summary

| Area | Verified capability |
|---|---|
| Copilot discovery | `GET /api/ai/copilots`, `GET /api/ai/copilots/:domain`, `GET /api/ai/copilots/:domain/suggestions` |
| Capability chat | `POST /api/ai/copilots/:domain/chat` — explicit key, intent detection, domain default |
| Prompt registry | 61 published templates, seeded idempotently, versioned, localized |
| Tool registry | 14 registered read-only tools, permission-checked, truncated output (8 KB default) |
| Model router | Ollama + Mock terminal fallback |
| Knowledge | Permission-aware context, semantic search, entity graph |
| Memory | Conversation creation, continuation, persistence, pinning |
| Security | RBAC per domain/tool, prompt-injection flagging, throttling |
| Audit | Every chat + every tool execution audited with metadata |
| Citations | References, confidence, suggested actions, follow-ups returned |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ai/health` | Public probe |
| GET | `/api/ai/copilots` | List copilots and capability counts |
| GET | `/api/ai/copilots/:domain` | Capabilities (prompt key, tools, actions) |
| GET | `/api/ai/copilots/:domain/suggestions` | Starter suggestions |
| POST | `/api/ai/copilots/:domain/chat` | Capability-aware chat |
| GET | `/api/ai/platform/health` | Provider chain + registry health |
| GET | `/api/ai/platform/models` | Model router availability |
| POST | `/api/ai/platform/chat` | Platform chat pipeline |
| GET | `/api/ai/prompts` | Prompt catalogue |
| GET | `/api/ai/tools` | Tool registry |
| POST | `/api/ai/tools/:name/execute` | Permission-checked tool execution |
| POST | `/api/ai/context` | Permission-aware context for an entity |
| GET | `/api/ai/conversations` | Scoped conversation history |

## Roles and Domains

| Domain | Roles allowed |
|---|---|
| engineering | ADMIN, MANAGEMENT, DESIGN, PLANNING, PRODUCTION, QUALITY |
| manufacturing | ADMIN, MANAGEMENT, PLANNING, PRODUCTION, QUALITY |
| quality | ADMIN, MANAGEMENT, QUALITY, PRODUCTION, PLANNING |
| commercial | ADMIN, MANAGEMENT, SALES |
| project | ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY |
| service | ADMIN, MANAGEMENT, SALES |
| executive | ADMIN, MANAGEMENT |

## Verified Behavior (evidence)

- `GET /api/ai/copilots` returns exactly 7 copilots (34/34 AI Platform E2E green).
- Explicit capability key `project.health.assessment` resolves without intent detection.
- Unknown capability keys fall back to intent detection; unmatched intents fall back to the domain default.
- SALES is denied EXECUTIVE (403) and allowed COMMERCIAL.
- Role-less users are rejected by the roles guard.
- Prompt-injection inputs are flagged and never forwarded to a model.
- Every platform chat is recorded in the audit trail with execution metadata.