# MITRA M12.5 SPRINT 2 — FRONTEND ARCHITECTURE & DISCOVERY AUDIT
**MODULE:** `mitra-frontend`  
**FOCUS:** Enterprise Portfolio Control Tower Integration Layer

---

## 1. Architectural Discovery
- **Frontend Root:** `D:\Mitra3.0\mitra-frontend`
- **Build Engine:** Vite 5.4.21 + React 18 + TypeScript + Tailwind CSS.
- **State & Server Cache:** TanStack React Query (`@tanstack/react-query` v5).
- **HTTP Client:** Axios instance (`src/utils/api.ts`) configured with request interceptors injecting JWT Bearer tokens and handling tenant headers.
- **Existing Workspaces:**
  - `DesignControlTowerWorkspace.tsx` (`src/components/Engineering/`): Project-centric control tower (WBS, Deliverables, Stage States).
  - `EngineeringPage.tsx` (`src/pages/`): Tabbed operations (BOMs, Routings, Reviews, Unit Conversions, Traceability, Outbox Relay).

## 2. Portfolio Workspace Strategy
- **Sprint 2 Strategy:** **Option A — Create New Dedicated Component (`PortfolioControlTowerWorkspace.tsx`)**.
- Does not modify or break `DesignControlTowerWorkspace.tsx` (which remains dedicated to single-project drilldowns).
- Connects to backend `/api/engineering/portfolio/*` endpoints to provide multi-project visibility across automotive programs (BM289, BM331, etc.).

## 3. UI Panel Architecture

```
PortfolioControlTowerWorkspace
├── PortfolioHeader (Snapshot Selector, Rebalance Trigger, Live Health Badge)
├── PortfolioDemandPanel (Cross-Project Workload Multipliers & Hour Totals)
├── GlobalCapacityPanel (Resource Utilization Gauges & Overload Indicators)
├── BottleneckAnalysisPanel (Engineer Overload, Capacity Deficit, Severity Badges)
├── RebalancingAdvisoryPanel (Deterministic Reallocation Cards - Advisory Only)
├── CrossProjectAllocationTable (Multi-Project Allocation Grid & Status Actions)
├── WhatIfSimulationModal (Timeline Delays, Program Injections, Capacity Scaling)
└── SnapshotHistoryModal (Reproducible Authoritative Portfolio Snapshots)
```
