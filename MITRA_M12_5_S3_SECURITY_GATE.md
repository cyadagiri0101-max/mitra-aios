# MITRA M12.5 SPRINT 3 — SECURITY & MULTI-TENANT GATE SPECIFICATION

**MILESTONE:** MITRA M12.5 — Enterprise Engineering Orchestration  
**WORKSTREAM:** M12.5-P1 Sprint 3 — Real-Time Portfolio Intelligence  

---

## 1. Security Principles for Real-Time Streaming

1. **Server-Owned Tenant Context:**
   - The client MUST NEVER specify or override the `tenantId` in connection handshakes or channel subscription requests.
   - The server extracts `tenantId` exclusively from the cryptographically verified JWT payload (`req.user.tenantId`).
2. **Channel & Room Isolation:**
   - Real-time streams/connections are partitioned into tenant-specific channels (`tenant:${tenantId}`).
   - An authenticated user for Tenant A can only receive events published for Tenant A.
   - Cross-tenant event leakage is strictly prevented at the gateway/controller dispatch layer.
3. **Authentication Lifecycle & Token Expiry:**
   - SSE / WebSocket connections require a valid, non-expired JWT.
   - Connections must terminate or refresh when access tokens expire.
4. **Data Minimization & XSS Defense:**
   - Signals contain lightweight identifiers (`allocationId`, `projectId`, `eventType`).
   - No untrusted strings are evaluated or injected into the DOM without standard React JSX escaping.

---

## 2. Security Threat & Mitigation Matrix

| Threat Scenario | Attack Vector | MITRA S3 Mitigation | Security Status |
|---|---|---|---|
| **Cross-Tenant Event Snooping** | Tenant A attempts to listen to Tenant B portfolio events | Gateway extracts `tenantId` from JWT; rejects foreign channel subscriptions | **PREVENTED** |
| **Forged Event Injection** | Attacker calls internal event emitter directly | Event emission is restricted to server-side outbox relay; no public push API | **PREVENTED** |
| **Connection Flood / DoS** | Malicious client opens hundreds of streams | Throttle guards (`ThrottlerGuard`) enforce connection rate limits | **PREVENTED** |
| **Dual-Write State Desync** | Database commit fails but event is delivered | Transactional outbox commits event atomically with DB change | **PREVENTED** |
| **Phantom Allocation Updates** | Stale event applied after newer status update | React Query invalidation re-fetches authoritative DB state | **PREVENTED** |
