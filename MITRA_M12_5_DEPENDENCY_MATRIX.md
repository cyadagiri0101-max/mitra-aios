# MITRA M12.5 — DEPENDENCY & IMPACT MATRIX
**MILESTONE:** M12.5  
**STATUS:** PLANNING ONLY (NO IMPLEMENTATION AUTHORIZED)

---

## 1. Domain & Layer Dependency Breakdown

| Workstream | Backend Controllers / Services | Entities & DB Tables | Frontend Hooks & Workspaces | Upstream Dependencies |
|---|---|---|---|---|
| **M12.5-P1: Portfolio** | `PortfolioOrchestrationController`<br>`PortfolioOrchestrationService` | `portfolio_snapshots`<br>`cross_project_allocations` | `usePortfolioOverview()`<br>`PortfolioControlTower.tsx` | M12.4 Design Capacity & WBS |
| **M12.5-P2: Outbox & WS** | `EngineeringOutboxGateway`<br>`OutboxRelayScheduler` | `engineering_outbox_events`<br>(Transactional Outbox) | `useEngineeringEventStream()`<br>`QueryClient` Invalidation | M12.4 API Client & JWT Auth |
| **M12.5-P3: CMM Metrology** | `MetrologyInspectionController`<br>`CmmMetrologyService` | `cmm_inspection_reports`<br>`cmm_feature_measurements` | `useCmmInspection()`<br>`CmmMetrologyWorkspace.tsx` | M12.4 3D Digital Thread & EKOS |
| **M12.5-P4: Deviations** | `EngineeringDeviationService` | `tool_deviation_records` | `DeviationHeatmapPanel.tsx` | M12.5-P3 CMM Data & T0 Trials |

## 2. Platform Constraints
- **Zero Schema Collisions:** New tables must cleanly namespace under `engineering_*` prefix.
- **Backward Compatibility:** All existing 201 backend suites and 6 frontend suites must remain 100% green.
