# MITRA M12.5 SPRINT 3 — TRANSACTIONAL OUTBOX DESIGN

**MILESTONE:** MITRA M12.5 — Enterprise Engineering Orchestration  
**WORKSTREAM:** M12.5-P1 Sprint 3 — Real-Time Portfolio Intelligence  

---

## 1. The Dual-Write Hazard & Outbox Solution

### The Dual-Write Problem
When an application mutates a database entity and immediately invokes an external network push (e.g. WebSocket emit or Redis publish), two critical failure modes arise:
1. **Network failure after DB commit:** The database transaction succeeds, but the real-time event is lost forever. Connected clients remain stale.
2. **DB rollback after network push:** The event is emitted, but the database transaction rolls back. Connected clients receive phantom event updates.

### The Transactional Outbox Pattern
MITRA resolves this by appending the domain event to the `domain_outbox` table within the same database transaction:
```sql
BEGIN TRANSACTION;
  -- 1. Mutate business entity
  INSERT INTO cross_project_allocations (...) VALUES (...);
  -- 2. Append outbox message
  INSERT INTO domain_outbox (event_type, aggregate_type, aggregate_id, payload, tenant_id, status)
  VALUES ('engineering.portfolio.allocation_created', 'cross_project_allocation', ..., ..., ..., 'PENDING');
COMMIT;
```

---

## 2. Relay Mechanism & At-Least-Once Delivery

1. **Outbox Relay (`EngineeringOutboxRelayService`):**
   - Polls rows where `status = 'PENDING'` ordered by `created_at ASC`.
   - Dispatches each message to the in-process `EngineeringEventBus`.
   - Upon successful dispatch, marks `status = 'PUBLISHED'` and sets `published_at = NOW()`.
   - On error, increments `attempt_count`, marks `status = 'FAILED'`, and sets `error_message`.
2. **Retry Scheduler (`EngineeringOutboxRelayScheduler`):**
   - Automatically re-arms `FAILED` records with exponential backoff / retry interval (default 30s).
   - Guards against overlapping relay cycles with concurrency lock.
3. **Idempotency & Deduplication:**
   - `EngineeringEventBus` deduplicates incoming events using composite key: `${eventType}:${entityId}:${timestamp}`.
   - Frontend clients treat events as idempotent query invalidation triggers.
