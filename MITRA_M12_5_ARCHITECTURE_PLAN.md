# MITRA M12.5 — TECHNICAL ARCHITECTURE PLAN
**MILESTONE:** M12.5  
**STATUS:** PLANNING ONLY (NO IMPLEMENTATION AUTHORIZED)

---

## 1. Enterprise System Architecture

```
+---------------------------------------------------------------------------------------------------------------+
| MITRA M12.5 ENTERPRISE ORCHESTRATION & EVENT ARCHITECTURE                                                     |
+---------------------------------------------------------------------------------------------------------------+
       FRONTEND CLIENTS (React / TanStack Query)
       ├── Portfolio Control Tower Workspace
       ├── Real-Time Event Subscriber Hook (`useEngineeringEventStream`)
       └── CMM Metrology Variance Inspector
               │
               ▼ (HTTPS REST / WSS WebSocket with In-Memory JWT)
       NESTJS ENTERPRISE BACKEND GATEWAY
       ├── PortfolioOrchestrationController (`/api/engineering/portfolio/*`)
       ├── EngineeringOutboxGateway (WebSocket Server / `@WebSocketGateway`)
       └── MetrologyInspectionController (`/api/engineering/metrology/*`)
               │
               ├── Domain Services & TypeORM Entities
               │   ├── PortfolioOrchestrationService
               │   ├── EngineeringOutboxPublisherService
               │   └── CmmMetrologyAnalysisService
               │
               ├── Database Tier (PostgreSQL / SQLite with Strict Tenant ID)
               │   ├── `engineering_portfolio_snapshots`
               │   ├── `engineering_outbox_events`
               │   └── `physical_cmm_measurements`
               │
               └── Read-Only Vault Registry (`MitraEngineeringLibrary` - 19,402 Files)
                   └── Cryptographically verified CAD & CMM inspection source files
```

## 2. Real-Time Event Flow & Outbox Pattern
1. Domain service mutates state within database transaction and writes record to `engineering_outbox_events`.
2. Outbox Relay worker polls/dispatches pending events to `EngineeringEventPublisher`.
3. WebSocket Gateway transmits tenant-scoped message to authenticated frontend clients.
4. TanStack Query selectively invalidates matching query keys (e.g., `['engineering', 'deliverables', projectId]`).

## 3. CMM Metrology Inspection Pipeline
- **Ingestion & Cryptographic Fingerprinting:** Compute SHA-256 hash upon file upload.
- **Format Normalization:** Standardize report coordinates, datum references, and GD&T tolerance flags.
- **CAD Entity Binding:** Link physical measurement point to digital thread feature ID.
