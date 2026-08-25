# MITRA M12.5 — SCOPE SPECIFICATION & BOUNDARY DEFINITIONS
**MILESTONE:** M12.5  
**STATUS:** PLANNING ONLY (NO IMPLEMENTATION AUTHORIZED)

---

## 1. In-Scope Workstreams

### A. M12.5-P1: Multi-Project Portfolio Orchestration
- **Enterprise Project Aggregation:** Cross-project visibility of active tooling projects (e.g., BM289, BM331, Headlamp tooling).
- **Global Team Capacity Leveling:** Identification of overloaded senior tool designers across concurrent programs.
- **Cross-Project Dependency Management:** Shared tooling insert bottlenecks and shared machine slot allocations.
- **Portfolio What-If Simulation:** Advisory rebalancing recommendations with mandatory human decision authority.

### B. M12.5-P2: Real-Time Engineering Events (Outbox & WebSockets)
- **Transactional Outbox Integration:** Guaranteed at-least-once publishing of engineering domain events.
- **WebSocket Gateway:** Real-time push updates for deliverable status, blocker alerts, and trial progress.
- **Tenant-Scoped Broadcasts:** Events partitioned strictly by authenticated `tenantId`.

### C. M12.5-P3: Physical CMM Metrology Intelligence
- **Report Ingestion:** Secure upload and storage of inspection reports in read-only vault registries.
- **Metrology Normalization:** Parsing probe points, tolerance limits (upper/lower), and actual measured values.
- **CAD Nominal Comparison:** Automated variance calculation ($Delta = Actual - Nominal$).
- **Metrology Distinction:** Strict boundary separating non-certified virtual caliper estimates from certified physical CMM evidence.

---

## 2. Out-of-Scope & Prohibited Actions
- **No Autonomous AI Mutations:** AI cannot reassign engineers, alter project delivery dates, or approve tool trials.
- **No Direct Vault Writes:** `MitraEngineeringLibrary` remains strictly read-only.
- **No ERP Scope Creep:** Project remains the central operational aggregate; no generic enterprise ERP redesign.
- **Personal Artifact Exclusion:** `PL.xlsx` is strictly excluded from all M12.5 architecture and workflows.
