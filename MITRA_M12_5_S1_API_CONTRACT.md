# MITRA M12.5 SPRINT 1 — API CONTRACT SPECIFICATION
**NAMESPACE:** `/api/engineering/portfolio`  
**SECURITY:** JWT Bearer + Server-Derived Tenant Isolation + Role-Based Access Control

---

## Endpoint Inventory

### 1. `GET /api/engineering/portfolio/snapshot`
- **Roles:** `ADMIN`, `ENGINEERING`, `PLANNING`, `EXECUTIVE`
- **Description:** Retrieves the latest authoritative portfolio snapshot for the tenant.

### 2. `POST /api/engineering/portfolio/snapshot`
- **Roles:** `ADMIN`, `ENGINEERING`, `PLANNING`
- **Request Body:** `{ snapshotName?: string, projectIds?: string[] }`
- **Response:** `201 Created` with full `EnterprisePortfolioSnapshot`.

### 3. `GET /api/engineering/portfolio/demand`
- **Query Params:** `projectIds?: string[]`, `timeframeDays?: number`
- **Description:** Returns cross-project demand breakdown with complexity multipliers.

### 4. `GET /api/engineering/portfolio/capacity`
- **Query Params:** `timeframeDays?: number`, `engineerRole?: string`
- **Description:** Returns engineer capacity, allocations, utilization, and skill matrices.

### 5. `GET /api/engineering/portfolio/bottlenecks`
- **Description:** Returns detected engineer overloads, skill shortages, and capacity deficits.

### 6. `GET /api/engineering/portfolio/balancing/recommendations`
- **Query Params:** `targetUtilizationCap?: number` (default 100.0)
- **Description:** Generates deterministic rebalancing recommendations (`isAutonomousDecision: false`).

### 7. `GET /api/engineering/portfolio/allocations`
- **Query Params:** `projectId?: string`, `engineerId?: string`
- **Description:** Returns cross-project allocations for the tenant.

### 8. `POST /api/engineering/portfolio/allocation`
- **Request Body:** `CreateCrossProjectAllocationDto`
- **Description:** Creates human-authorized cross-project resource allocation.

### 9. `POST /api/engineering/portfolio/allocation/:id/status`
- **Request Body:** `{ status: 'ACTIVE' | 'RELEASED' | 'OVERRIDDEN', rationale?: string }`
- **Description:** Updates allocation status with mandatory audit sign-off.

### 10. `POST /api/engineering/portfolio/scenario/simulate`
- **Request Body:** `SimulatePortfolioScenarioDto`
- **Description:** Executes in-memory non-mutating what-if simulation.
