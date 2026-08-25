# MITRA M12.5 SPRINT 3 — PROPOSED TEST & FAILURE INJECTION MATRIX

**MILESTONE:** MITRA M12.5 — Enterprise Engineering Orchestration  
**WORKSTREAM:** M12.5-P1 Sprint 3 — Real-Time Portfolio Intelligence  

---

## 1. Unit & Integration Test Suites

| Target Area | Test Suite / Spec File | Verification Objective | Expected Count |
|---|---|---|---|
| **Backend Outbox Append** | `portfolio-outbox.spec.ts` | Verify outbox row insertion on allocation create, status update, and snapshot capture | ~8 tests |
| **Backend Outbox Relay** | `portfolio-relay.spec.ts` | Verify relay dispatch to `EngineeringEventBus` and state transitions (PENDING → PUBLISHED) | ~6 tests |
| **Backend Real-Time Stream** | `portfolio-events.controller.spec.ts` | Verify SSE/WebSocket streaming, JWT authentication, and tenant isolation | ~8 tests |
| **Backend Failure Injection** | `portfolio-failure-injection.spec.ts` | Verify DB rollback aborts outbox append; relay retry on error; duplicate event deduplication | ~8 tests |
| **Frontend Real-Time Hook** | `usePortfolioRealtimeSync.test.ts` | Verify stream connection, event parsing, and query cache invalidation | ~6 tests |
| **End-to-End Workflow** | `m12-5-realtime-portfolio.e2e.spec.ts` | Full E2E: Mutation → Outbox → Relay → Event Stream → Frontend Query Refetch | ~6 tests |

---

## 2. Failure Injection Scenarios

1. **Transaction Rollback:**
   - Inject error during allocation save.
   - Assert: Outbox record is NOT written, and NO event is emitted.
2. **Relay Transport Failure:**
   - Simulate downstream subscriber exception during relay.
   - Assert: Outbox row marked `FAILED`, attempt count incremented to 1, re-armed on next retry cycle.
3. **Cross-Tenant Event Filtering:**
   - Dispatch Tenant B event on bus.
   - Assert: Connected Tenant A client stream receives zero data packets.
4. **Network Disconnect & Reconnect:**
   - Disconnect frontend event listener and perform mutation in background.
   - Reconnect listener.
   - Assert: Client triggers full query refresh upon reconnect.
