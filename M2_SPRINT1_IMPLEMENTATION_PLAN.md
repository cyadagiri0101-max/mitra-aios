# M2 Sprint 1 — Implementation Plan: Design-Load & Workload Estimation Engine Foundation

**Baseline:** `71780dc0` (v4.2.0 baseline + verified M1 Sprint 1)
**Goal:** Implement the foundational Design Standard, Design Stage, Design Load, Design System (Workstation), and Shift integration model for MITRA Vision-100 Planning & Capacity Intelligence.

---

## 1. Existing Architecture Discovered

- **Backend Architecture:** NestJS modular monolith with TypeORM repositories, `IndustrialBaseEntity`, `TenantAwareService` fail-closed multi-tenancy, global `PermissionsGuard` enforcing `@Permissions(...)`, global `AuditInterceptor`, `AuditService` with `project_id` support (M1 A5 fix), and `OutboxService` for domain events.
- **Master Data (M1):** `PeopleModule` provides `Employee`, `Skill`, `EmployeeSkill` (proficiency `BEGINNER` to `EXPERT`), and `ResourceAvailability` (`AVAILABLE`, `PLANNED`, `UNAVAILABLE`).
- **Governance (M1):** `EngineeringDecisionsModule` provides the decision log (`DEC-{yyyy}-{NNNN}`) and project-scoped audit records.
- **Projects Domain:** `Project` entity (`projects` table) provides `projectType` (`NEW_DEVELOPMENT`, `REVAMP`, `REPAIR`, `RE_ENGINEERING`, `JOB_WORK`, `OTHER`) and `moldType` (`INJECTION`, `BLOW`, `THIN_WALL`, `IBM`, `MOLD_BASE`, `FIXTURE`, `PRODUCT_DESIGN`, `JOB_WORK`).
- **Manufacturing / Machines:** `MachineMaster` and `MachineCalendar` support machine planning and shift availability (`shift_1_available`, `shift_2_available`, `shift_3_available`).
- **External Engineering Knowledge (MEKB):** `D:\MitraEngineeringLibrary` is an external historical knowledge source (read-only reference; never mutated by MITRA operational code).

---

## 2. Relevant Modules to Reuse & Extend

| Module | Role |
|---|---|
| `people` | Consume `Skill`, `Employee`, `EmployeeSkill`, `ResourceAvailability` for candidate resource matching and skill requirements. |
| `project` | Consume `Project` entity and lifecycle for project-scoped design load associations. |
| `audit` | Capture all design standard and design load mutations with `projectId`. |
| `platform` | Emit outbox domain events (`design_standard.created`, `design_load.planned`, etc.). |
| `design` / `planning` | Register new `DesignLoadModule` (or under `planning`/`design-load`) cleanly without creating parallel duplicate resource systems. |

---

## 3. Proposed Domain Model

### 3.1 Design Standard Master (`DesignLoadStandard`)
- **Table:** `design_load_standards`
- **Fields:**
  - `id`: UUID (PK)
  - `tenantId`: UUID
  - `code`: VARCHAR(50) (e.g. `STD-TYPE-A`, `STD-TYPE-B`, `STD-BLOW-MOLD-01`)
  - `name`: VARCHAR(200)
  - `description`: TEXT
  - `projectType`: VARCHAR(50) (nullable or mapped to `ProjectType`)
  - `moldType`: VARCHAR(50) (nullable or mapped to `MoldType`)
  - `complexityLevel`: VARCHAR(30) (`STANDARD`, `MEDIUM`, `COMPLEX`)
  - `totalStandardDurationDays`: NUMERIC(5,2) (e.g. 5.0, 10.0 working days)
  - `totalStandardHours`: NUMERIC(7,2) (e.g. 40.0, 80.0 engineering hours)
  - `status`: VARCHAR(30) (`ACTIVE`, `INACTIVE`)
  - `provenanceSource`: VARCHAR(50) (`MANUAL`, `HISTORICAL_DATA`, `MEKB`, `ENGINEERING_ANALYSIS`)
  - `provenanceDetails`: JSONB / TEXT (provenance references, historical project codes like `BM454`, approver notes)
  - `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`

### 3.2 Design Standard Stage (`DesignLoadStandardStage`)
- **Table:** `design_load_standard_stages`
- **Fields:**
  - `id`: UUID (PK)
  - `tenantId`: UUID
  - `standardId`: UUID (FK → `design_load_standards.id`)
  - `stageCode`: VARCHAR(50) (`MOLD_DEVELOPMENT`, `DESIGNING`, `DETAILING`, `FILE_SUBMISSION`, or custom)
  - `stageName`: VARCHAR(100)
  - `sequence`: INT (1, 2, 3, 4)
  - `standardDurationDays`: NUMERIC(5,2)
  - `standardHours`: NUMERIC(7,2)
  - `requiredSkillId`: UUID (nullable FK → `skills.id`)
  - `minimumProficiency`: VARCHAR(30) (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`)
  - `description`: TEXT
  - `status`: VARCHAR(30) (`ACTIVE`, `INACTIVE`)

### 3.3 Project Design Load (`ProjectDesignLoad`)
- **Table:** `project_design_loads`
- **Fields:**
  - `id`: UUID (PK)
  - `tenantId`: UUID
  - `loadNumber`: VARCHAR(30) (e.g. `DLD-2026-0001` with retry on collision)
  - `projectId`: UUID (FK → `projects.id`)
  - `standardId`: UUID (FK → `design_load_standards.id`)
  - `title`: VARCHAR(200)
  - `projectType`: VARCHAR(50)
  - `moldType`: VARCHAR(50)
  - `complexityFactor`: NUMERIC(4,2) (default 1.0, e.g. 1.25 for high complexity)
  - `standardDurationDays`: NUMERIC(5,2)
  - `standardHours`: NUMERIC(7,2)
  - `plannedDurationDays`: NUMERIC(5,2)
  - `plannedHours`: NUMERIC(7,2)
  - `actualDurationDays`: NUMERIC(5,2) (nullable)
  - `actualHours`: NUMERIC(7,2) (nullable)
  - `plannedStartDate`: DATE
  - `plannedFinishDate`: DATE
  - `actualStartDate`: DATE (nullable)
  - `actualFinishDate`: DATE (nullable)
  - `currentStageCode`: VARCHAR(50)
  - `status`: VARCHAR(30) (`DRAFT`, `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`, `CANCELLED`)
  - `explanation`: TEXT (deterministic explanation breakdown)
  - `notes`: TEXT
  - `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`

### 3.4 Project Design Load Stage (`ProjectDesignLoadStage`)
- **Table:** `project_design_load_stages`
- **Fields:**
  - `id`: UUID (PK)
  - `tenantId`: UUID
  - `designLoadId`: UUID (FK → `project_design_loads.id`)
  - `stageCode`: VARCHAR(50)
  - `stageName`: VARCHAR(100)
  - `sequence`: INT
  - `standardDurationDays`: NUMERIC(5,2)
  - `standardHours`: NUMERIC(7,2)
  - `plannedDurationDays`: NUMERIC(5,2)
  - `plannedHours`: NUMERIC(7,2)
  - `actualDurationDays`: NUMERIC(5,2) (nullable)
  - `actualHours`: NUMERIC(7,2) (nullable)
  - `plannedStartDate`: DATE (nullable)
  - `plannedFinishDate`: DATE (nullable)
  - `actualStartDate`: DATE (nullable)
  - `actualFinishDate`: DATE (nullable)
  - `status`: VARCHAR(30) (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `CANCELLED`)
  - `requiredSkillId`: UUID (nullable FK → `skills.id`)
  - `minimumProficiency`: VARCHAR(30)
  - `assignedEmployeeId`: UUID (nullable FK → `employees.id`)
  - `assignedDesignSystemId`: UUID (nullable FK → `design_systems.id`)
  - `notes`: TEXT

### 3.5 Design Workstation / System Master (`DesignSystem`)
- **Table:** `design_systems`
- **Fields:**
  - `id`: UUID (PK)
  - `tenantId`: UUID
  - `systemCode`: VARCHAR(30) (e.g. `CAD-WS-01` through `CAD-WS-10`)
  - `name`: VARCHAR(100)
  - `systemType`: VARCHAR(50) (`CAD_WORKSTATION`, `CAM_WORKSTATION`, `SIMULATION_WORKSTATION`, `GENERAL_DESIGN`)
  - `specifications`: TEXT
  - `softwareLicenses`: VARCHAR(255) (e.g. `NX CAD, Moldflow, Mastercam`)
  - `location`: VARCHAR(100)
  - `status`: VARCHAR(30) (`ACTIVE`, `MAINTENANCE`, `OFFLINE`)
  - `totalShiftsSupported`: INT (default 3)
  - `shift1Available`: BOOLEAN (default true)
  - `shift2Available`: BOOLEAN (default true)
  - `shift3Available`: BOOLEAN (default true)
  - `dailyCapacityHours`: NUMERIC(5,2) (default 24.0)

### 3.6 Shift Configuration Master (`DesignShift`)
- **Table:** `design_shifts`
- **Fields:**
  - `id`: UUID (PK)
  - `tenantId`: UUID
  - `shiftCode`: VARCHAR(30) (`SHIFT_1`, `SHIFT_2`, `SHIFT_3`)
  - `name`: VARCHAR(50) (`Morning Shift`, `Evening Shift`, `Night Shift`)
  - `startTime`: VARCHAR(10) (`06:00`)
  - `endTime`: VARCHAR(10) (`14:00`)
  - `durationHours`: NUMERIC(4,2) (`8.0`)
  - `isActive`: BOOLEAN (default true)

---

## 4. Estimation & Explanation Engine

- **Estimation Logic:**
  - `Planned Duration = Base Standard Duration × Complexity Factor`
  - `Planned Hours = Base Standard Hours × Complexity Factor`
  - Stage-level durations and hours are scaled proportionally by `Complexity Factor`.
  - Transparent Explanation Output:
    `"Standard [TYPE_B_STD] (10 days, 80 hrs) adjusted by Complexity Factor 1.20 -> Planned 12.0 days (96.0 hrs) across 4 stages: Mold Development (2.4d), Designing (4.8d), Detailing (3.6d), File Submission (1.2d)."`
- **Candidate Resource Lookup:**
  - For each design load / stage requirement (`requiredSkillId` + `minimumProficiency`), lookup employees in `employee_skills` with matching skill and equal or higher proficiency (`BEGINNER < INTERMEDIATE < ADVANCED < EXPERT`), joined with their `resource_availability`.

---

## 5. Migrations Required

- `1700000000038-M2DesignLoadFoundation.ts`:
  - Creates `design_load_standards`, `design_load_standard_stages`, `project_design_loads`, `project_design_load_stages`, `design_systems`, and `design_shifts`.
  - Adds composite uniqueness, foreign keys, and indexes.
  - Seeds initial RBAC permissions for design standards, design loads, design systems, and shifts.

---

## 6. APIs & Permission Design

| HTTP Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/design-standards` | `design_standard:read` | List design standards |
| `GET` | `/api/design-standards/:id` | `design_standard:read` | Get design standard with stages |
| `POST` | `/api/design-standards` | `design_standard:create` | Create design standard |
| `PATCH` | `/api/design-standards/:id` | `design_standard:update` | Update standard |
| `DELETE` | `/api/design-standards/:id` | `design_standard:delete` | Soft delete standard |
| `GET` | `/api/design-standards/:id/stages` | `design_standard:read` | Get stages for a standard |
| `POST` | `/api/design-standards/:id/stages` | `design_standard:create` | Add stage to standard |
| `GET` | `/api/design-loads` | `design_load:read` | List project design loads |
| `GET` | `/api/design-loads/:id` | `design_load:read` | Get design load with stages |
| `POST` | `/api/design-loads` | `design_load:create` | Create design load |
| `PATCH` | `/api/design-loads/:id` | `design_load:update` | Update design load |
| `POST` | `/api/design-loads/:id/estimate` | `design_load:estimate` | Re-estimate / scale load |
| `GET` | `/api/design-loads/:id/candidates` | `design_load:read` | Find qualified candidate engineers |
| `GET` | `/api/design-systems` | `design_system:read` | List design workstations |
| `POST` | `/api/design-systems` | `design_system:create` | Register design workstation |
| `GET` | `/api/design-shifts` | `design_shift:read` | List configured shifts |

---

## 7. Frontend Surfaces

- **DesignLoadPage.tsx:**
  - Tab 1: **Project Design Loads** (Current Load, Planned Start/Finish, Current Stage, Standard vs Planned vs Actual duration variance, Explainable derivation breakdown, Candidates modal).
  - Tab 2: **Design Standards Master** (Configure Type A, Type B, custom standards with stage-level durations, hours, and skill requirements).
  - Tab 3: **Design Systems & Shifts** (Overview of 10 design workstations, 3-shift availability, and capacity totals).
- Integration in `Sidebar.tsx` and `App.tsx` under Planning & Engineering navigation.

---

## 8. Verification & Testing Plan

1. **Unit Tests:**
   - Standard CRUD, stage ordering, calculation logic (`Base × Factor`), explanation text generation.
   - Resource candidate ranking (filtering by skill and minimum proficiency).
   - Tenant isolation & fail-closed security.
2. **E2E Tests:**
   - Design standard creation with stages.
   - Project design load creation, estimation, candidate lookup, cross-tenant 404 isolation.
3. **Builds:**
   - Backend `nest build` (zero errors).
   - Frontend `tsc && vite build` (zero errors).
4. **Golden Scenarios & Matrix:**
   - Update G3 and Gap Matrix with M2 Sprint 1 evidence.

This plan file is a working artifact of M2 Sprint 1 and will not be auto-committed.
