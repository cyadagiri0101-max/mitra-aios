# AI Knowledge Infrastructure Gap Analysis

## Objective
Reuse the existing local-first AI foundation and close only the missing knowledge infrastructure pieces required for future enterprise AI workflows.

## Existing Foundations Already Present
- AI module and controller are already wired in the backend root application.
- Ollama provider exposes local availability, model health, text generation, and embedding calls.
- Embedding service already upserts `knowledge_embeddings` rows with idempotent hash-based indexing.
- Vector search service already implements semantic search and fallback text search over stored embeddings.
- AI context service already gathers tenant-scoped operational context for projects, trials, CAPAs, work orders, service requests, workflow, and knowledge articles.
- Domain outbox and engineering event bus already exist as the durable event backbone for asynchronous integration.
- Knowledge article repository and document/indexing services already exist for structured and unstructured enterprise content.

## Confirmed Gaps
1. No reusable cross-domain `knowledge_catalog` abstraction that maps source entities to catalog entries without duplicating transactional data.
2. No outbox-driven async indexing pipeline that converts domain events into knowledge catalog / embedding refresh actions.
3. No semantic search API surface focused on knowledge catalog entries and cross-domain relationships.
4. No knowledge graph relationship model or context builder for graph traversal and future Retrieval-Augmented Generation flows.
5. The knowledge module currently exposes only CRUD for articles; it does not expose a cross-domain catalog contract or search entrypoint.

## Reuse Strategy
Implement only the missing orchestration and catalog layer on top of the existing entities and services:
- Keep source-of-truth data in the original domain tables.
- Add `knowledge_catalog` entries as lightweight metadata records pointing to those entities.
- Trigger embedding refreshes through the existing outbox/event bus rather than introducing a parallel event stream.
- Reuse `knowledge_embeddings` and `vector-search.service.ts` for semantic retrieval.
- Reuse engineering file indexing and document metadata modules for file/document content enrichment.

## Recommended Implementation Order
1. Add `knowledge_catalog` entity and service.
2. Add knowledge catalog controller and tenant-safe list/search API.
3. Add async catalog/upsert indexing bridge from outbox messages.
4. Extend vector search to return catalog-aware results.
5. Add a lightweight knowledge relationship graph entity for future AI context assembly.

## Non-Goals
- No chatbot UI.
- No AI recommendations.
- No agent workflows.
- No duplication of commercial, project, manufacturing, quality, or service transactional data.
