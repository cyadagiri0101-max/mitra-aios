# MITRA M12.5 SPRINT 3 — ARCHITECTURE & COMPATIBILITY AUDIT

**MILESTONE:** MITRA M12.5 — Enterprise Engineering Orchestration  
**WORKSTREAM:** M12.5-P1 Sprint 3 — Real-Time Portfolio Intelligence  
**AUDIT ROLE:** Principal Software Architect  

---

## 1. Architectural Overview

MITRA's existing enterprise architecture leverages a clean separation between transactional persistence, asynchronous domain outbox processing, in-process event distribution, and client query caching. Sprint 3 builds upon these established components without introducing conflicting paradigms.

```mermaid
sequenceDiagram
    autonumber
    participant UI as Control Tower UI (React)
    participant Hook as usePortfolioData (React Query)
    participant API as Portfolio Controller
    participant Svc as Portfolio Snapshot Service
    participant DB as Postgres (Allocations & Snapshots)
    participant OB as Postgres (domain_outbox)
    participant Relay as Outbox Relay Scheduler
    participant Bus as EngineeringEventBus
    participant Stream as Real-Time Event Stream (SSE/WS)

    Note over UI,API: 1. Mutation Flow with Transactional Outbox
    UI->>Hook: User creates allocation / updates status
    Hook->>API: POST /api/engineering/portfolio/allocation
    API->>Svc: createAllocation(tenantId, dto, actorId)
    Svc->>DB: Save CrossProjectAllocation
    Svc->>OB: Append DomainOutboxMessage (PENDING)
    Svc-->>API: Return Created Allocation
    API-->>Hook: HTTP 201 Created
    Hook-->>UI: Immediate Local UI Update

    Note over Relay,Stream: 2. Asynchronous Event Relay & Push
    Relay->>OB: Poll PENDING outbox messages
    OB-->>Relay: Return portfolio events
    Relay->>Bus: publish(EngineeringDomainEvent)
    Relay->>OB: Mark PUBLISHED
    Bus->>Stream: Dispatch event to matching tenant stream
    Stream-->>UI: Real-Time Signal (eventType, entityId, tenantId)
    UI->>Hook: Invalidate ['portfolio'] queries
    Hook->>API: Re-fetch stale queries (Demand, Capacity, Bottlenecks)
```

---

## 2. Component Assessment & Reuse Matrix

| Architectural Layer | Existing MITRA Pattern | Sprint 3 Implementation Plan | Compatibility Rating |
|---|---|---|---|
| **Transactional Outbox** | `OutboxService` (`src/modules/platform/services/outbox.service.ts`) | Reuse existing `append()` to write outbox rows alongside portfolio entity saves. | **100% Native** |
| **Outbox Storage** | `DomainOutboxMessage` (`domain_outbox` table) | Reuse existing `domain_outbox` schema. Zero migration needed. | **100% Native** |
| **Relay Scheduler** | `EngineeringOutboxRelayScheduler` (30s interval + on-demand) | Reuse existing scheduler and relay mechanisms. | **100% Native** |
| **In-Process Bus** | `EngineeringEventBus` (`events.EventEmitter`) | Extend subscriber registry to route events to the real-time stream. | **100% Native** |
| **Real-Time Gateway** | SSE (`@Sse`) / WebSocket with JWT Authentication | Expose `/api/engineering/portfolio/events` endpoint guarded by `JwtAuthGuard`. | **100% Native** |
| **Client Invalidation** | TanStack React Query v5 | Hook `usePortfolioRealtimeSync` listens to stream and invalidates `portfolioQueryKeys.all`. | **100% Native** |

---

## 3. Real-Time Stream Design: Server-Sent Events vs WebSocket

1. **Protocol Selection:**
   - For portfolio synchronization, the communication pattern is predominantly **Server-to-Client push of invalidation signals**.
   - Server-Sent Events (SSE) via NestJS `@Sse` provides native HTTP/2 multiplexing, standard JWT bearer header authorization, automatic reconnection, and zero additional runtime dependencies.
   - If bi-directional socket communication is required, standard NestJS WebSocket Gateway with JWT connection handshake can be utilized.
2. **Signal Pattern vs Data Payload:**
   - **Recommended Pattern:** The real-time stream delivers **signals** (metadata: `eventType`, `tenantId`, `entityId`, `timestamp`), NOT heavy domain models.
   - The frontend React Query cache handles authoritative data fetching upon signal receipt.
   - This eliminates out-of-order race conditions and preserves server-side query authorization.
