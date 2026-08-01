# ADR-005: REST API DELETE 204 Policy

## Status
Accepted

## Context
REST semantics specify `204 No Content` for successful deletes, but most
DELETE handlers returned `200 OK`. Mixed conventions forced clients to accept
two response shapes and made API contracts ambiguous.

## Decision
1. All 33 DELETE handlers annotated `@HttpCode(200)` were switched to
   `@HttpCode(204)` (user and dispatch controllers already returned
   `HttpStatus.NO_CONTENT` — now 35/35 DELETE endpoints are uniform).
2. A route-shadowing scan confirmed no shadowed or duplicate DELETE routes
   across controllers.

## Consequences
- Uniform `204` semantics across the API surface; `204` responses carry no body.
- Frontend audit (`mitra-frontend/src/utils/api.ts`): the axios client resolves
  any 2xx and only branches on `>=500` and `401`; all 10 DELETE call sites use
  `useMutation` and never consume response bodies — no client changes required.
- No e2e assertions depend on DELETE response bodies.
