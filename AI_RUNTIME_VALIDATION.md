AI Runtime Validation — MITRA v3.2

Date: 2026-06-24

Summary
-------
This document records runtime validation performed for the AI subsystem (Ollama + backend AI modules).

Overall status by feature:
- Ollama core service: Working
- LLM model (phi3) availability: Working
- Embedding model (nomic-embed-text): Failing (not installed)
- Backend AI health endpoint (`GET /api/ai/health`): Working (reports AI disabled)
- Backend AI chat/analyze endpoints: Partially Working (routes up, but protected and DB not migrated/seeded)
- Embedding generation via Ollama: Partially Working (Ollama running; specific embed model missing)
- Vector search / trial & CAPA intelligence: Partially Working / Failing (depends on embeddings + DB schema + indexed data)

Checks performed
----------------
1) Config (.env)
- AI_ENABLED: false (from .env)
- OLLAMA_URL: http://ollama:11434 (from .env)
- OLLAMA_MODEL: phi3 (from .env)

File: [.env](./.env)

2) Ollama container
- Podman listed running containers. Relevant entry observed:
  - Name: mitra30_ollama_1
  - Image: ollama/ollama:latest
  - Status: Up (healthy)

Command used:
- podman ps -a

3) Ollama HTTP API
- GET /api/version → returned:
  {"version":"0.24.0"}
  (OK)
- GET /api/tags → returned installed models. Summary:
  - openchat:latest
  - phi3:latest
  (phi3 present — OK)

4) Ollama generate
- POST /api/generate (model=phi3, prompt="Hello") → returned a valid textual response (OK).

5) Ollama embeddings
- POST /api/embeddings (model=nomic-embed-text) → returned error:
  {"error":"model \"nomic-embed-text\" not found, try pulling it first"}
  (Embedding model not installed)

6) Backend AI health
- GET http://localhost:3001/api/ai/health → returned:
  {
    "enabled": false,
    "available": false,
    "model": "phi3",
    "reason": "Set AI_ENABLED=true in .env"
  }
  - Health endpoint reachable (OK) but AI is disabled per configuration.

7) Backend protected endpoints
- Attempted to `POST /api/auth/login` and then `/api/ai/chat`.
- Login returned HTTP 500 (internal server error). Backend logs show:
  "relation \"users\" does not exist" — database tables/migrations not applied (DB not migrated/seeded).
- Because the DB schema is absent, protected AI endpoints cannot be exercised.

Conclusions & Status per feature
--------------------------------
- Ollama core service: Working
  - Container running and healthy; /api/version responded.
- LLM model (phi3): Working
  - phi3:latest present (listed by /api/tags); /api/generate works.
- Embedding model (nomic-embed-text): Failing
  - Ollama reports the embedding model is not installed. Embedding API fails for that model.
- Backend AI health endpoint: Working (reports AI disabled)
  - API reachable and returns expected structure; shows AI is disabled via env.
- Backend AI chat/analyze endpoints: Failing (authentication/schema blocker)
  - Routes are present, but DB tables do not exist; login fails with "relation \"users\" does not exist".
- Embedding generation (end-to-end): Partially Working
  - Ollama can generate text embeddings if a supported embedding model is installed. Current instance lacks that model.
- Vector search, Trial intelligence, CAPA intelligence: Partially Working / Failing
  - Codepaths exist and support pgvector fallback, but runtime requires:
    - DB migrations applied (knowledge_embeddings table)
    - Embedding model available or deterministic fallback (deterministic fallback exists but requires AI_ENABLED toggle decisions)
    - Indexed tenant data (indexTenantData)
  - Because the DB schema is missing and embedding model is not present, these features cannot be fully validated.

Recommended remediation steps
---------------------------
1) Enable AI in backend (if you intend to use Ollama):

- Edit `.env` and set:

  AI_ENABLED=true
  OLLAMA_URL=http://localhost:11434   # or keep container host as appropriate
  OLLAMA_MODEL=phi3

- Restart the backend container (or host process):

  podman compose -f podman-compose.yml restart backend

2) Install the embedding model in Ollama (example — runs inside the Ollama container):

- Pull the embedding model (this can be large — expect multiple GB downloads). Replace with the correct model name if different.

  podman exec -it mitra30_ollama_1 ollama pull nomic-embed-text:latest

- Verify via HTTP:

  curl http://localhost:11434/api/tags | jq

3) Apply DB migrations and seed the DB (so protected endpoints can be tested):

- Inside the backend container or developer host, run the migrations and seed script used by the project. Example (adjust if your environment differs):

  podman exec -it mitra30_backend_1 sh -c "npm run migration:run && node dist/database/seed.js"

  OR (if running locally without container):

  cd mitra-backend
  npm run typeorm:migration:run
  node dist/database/seed.js

- Confirm `users` table exists and admin user seeded (admin@mitra.local). Then login:

  curl -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@mitra.local","password":"<SEED_ADMIN_PASSWORD>"}'

4) Re-test protected endpoints
- After migrations & seeding + enabling AI, re-run:
  - `GET /api/ai/health` (should show enabled: true and available: true)
  - `POST /api/ai/chat` with a valid access token
  - `POST /api/ai/analyze` on an existing entity id
  - Embedding generation via backend `EmbeddingService.generateEmbedding()` (the backend will use Ollama embedding model)
  - Vector-search and trial/capa intelligence paths

Notes and caveats
-----------------
- Pulling embedding models can consume many GBs and take significant time and bandwidth.
- If you prefer not to install an embedding model, `EmbeddingService.generateEmbedding()` currently uses a deterministic pseudo-vector when `AI_ENABLED=false` or when Ollama embedding fails; this is intended only for offline dev/testing and is not suitable for production semantic search.
- The backend's `migration` and `seed` commands must be run with DB connectivity configured (check `.env` DB_HOST/credentials).

Full raw outputs (important snippets)
------------------------------------
- `GET /api/version` (Ollama):
  {"version":"0.24.0"}

- `GET /api/tags` (Ollama) — installed models (excerpt):
  - openchat:latest
  - phi3:latest

- `POST /api/embeddings` (nomic-embed-text):
  {"error":"model \"nomic-embed-text\" not found, try pulling it first"}

- `GET /api/ai/health` (backend):
  {"enabled":false,"available":false,"model":"phi3","reason":"Set AI_ENABLED=true in .env"}

- Backend logs (login failure):
  QueryFailedError: relation "users" does not exist

Status summary (Working / Partially Working / Failing)
-----------------------------------------------------
- Ollama service: Working
- LLM (phi3): Working
- Embedding model (nomic-embed-text): Failing
- Backend AI health endpoint: Working (AI disabled)
- Backend AI chat/analyze (end-to-end): Failing (DB schema/auth required)
- Embedding generation (end-to-end): Partially Working
- Vector search / trial & CAPA intelligence: Partially Working (schema + embeddings required)

If you want, I can now:
- Pull `nomic-embed-text` into the running Ollama container (will download many GBs), or
- Run DB migrations + seed (if you want me to do that inside the backend container), and then re-run the protected AI endpoint tests.

Which remediation step should I perform next?
