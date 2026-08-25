# MITRA M12.5 SPRINT 3 — IMPLEMENTATION SEQUENCE PLAN

**MILESTONE:** MITRA M12.5 — Enterprise Engineering Orchestration  
**WORKSTREAM:** M12.5-P1 Sprint 3 — Real-Time Portfolio Intelligence  

---

## 1. Ordered Implementation Phases

```
Phase 1: Event Definitions & Outbox Integration
  ├── Define PortfolioDomainEventType in engineering.events.ts
  └── Inject OutboxService into PortfolioSnapshotService (append on mutations)

Phase 2: Event Relay & Bus Subscription
  ├── Extend EngineeringOutboxRelayService to recognize portfolio event types
  └── Verify relay dispatch and failure re-arm lifecycle

Phase 3: Real-Time Streaming Gateway / Endpoint
  ├── Create PortfolioEventsController / Gateway with @Sse stream
  ├── Apply JwtAuthGuard, RolesGuard, and ThrottlerGuard
  └── Filter stream emissions by req.user.tenantId

Phase 4: Frontend Real-Time Invalidation Hook
  ├── Create usePortfolioRealtimeSync in mitra-frontend/src/hooks/
  ├── Connect to /api/engineering/portfolio/events
  └── Trigger targeted queryClient.invalidateQueries(portfolioQueryKeys.all)

Phase 5: Automated Testing & Failure Injection
  ├── Implement unit and integration specs
  ├── Implement master E2E certification suite
  └── Run full regression suite and production builds

Phase 6: Final Security Audit & Sprint 3 Certification
  ├── Execute deep security scan and tenant isolation audit
  └── Issue M12.5_S3_FINAL_CERTIFICATION and release closure
```

---

## 2. Strict Governance Constraints

- **DO NOT START** until explicit user authorization is provided.
- **DO NOT** modify core mathematical models in `PortfolioDemandService`, `PortfolioCapacityService`, `PortfolioBalancingService`, or `PortfolioScenarioService`.
- **PRESERVE** 100% backward compatibility of all existing REST endpoints.
