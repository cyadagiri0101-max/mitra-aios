# Release Notes v3.9 — AI Platform & Orchestration (Sprint 2.8.2)

## Highlights
- **Model Router**: provider-agnostic AI model invocation with an `AiModelProvider` interface, an adapter around the existing Ollama provider, a deterministic mock provider, and configurable fallback chains (`AI_PROVIDER_CHAIN`).
- **Prompt Registry**: DB-backed, versioned, localized prompt catalogue with an approval lifecycle (DRAFT → PUBLISHED → ARCHIVED), seeded from a single source of truth shared with the legacy prompt service.
- **Tool Registry**: 14 read-only, role-permissioned domain tools that reuse exported Engineering, Planning, Quality, Manufacturing, Service, Commercial, Project, Analytics, and Knowledge services — no new repositories, no recalculation.
- **AI Orchestrator**: staged platform pipeline with injection detection (flagged requests never reach a model), citation validation, deterministic confidence scoring, and graceful no-evidence fallbacks.
- **AI Security & Audit**: centralized injection/redaction/citation/confidence service plus an append-only `ai_audit_logs` trail for every orchestrated request and tool execution.
- **Conversation Manager**: pin/unpin with retention exemption, JSON metadata, and explicit expiry reporting.
- **New platform APIs**: `/ai/platform/chat`, `/ai/context`, `/ai/prompts` (CRUD + publish), `/ai/tools`, `/ai/models`, `/ai/conversations` (+ pin), `/ai/audit` — all with RBAC + fine-grained permissions; existing `/ai/chat`, `/ai/analyze`, and `/ai/copilot/*` endpoints are unchanged.

## Validation
- Backend build verified successfully.
- AI module tests: 115 passed (13 suites), including all legacy 2.8.1 suites untouched.

## Notes
This release establishes the governed AI platform foundation for the Enterprise AI Operating System program, preserving the MITRA constitution of reuse, traceability, and domain ownership. Live migration execution against PostgreSQL remains a release-readiness step.
