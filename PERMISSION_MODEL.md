# Permission Model

## Purpose

This document defines the RBAC (Role-Based Access Control) model for MITRA — the roles, permissions, and access control rules that govern every operation in the platform.

---

## Architecture

```
User ──► Has Roles ──► Scoped to Projects or Global
          │
          ▼
    Role ──► Has Permissions
               │
               ▼
         Resource:Action pairs
               │
               ▼
    Enforced by NestJS Guards at the endpoint level
```

- **Users** are assigned one or more roles.
- **Roles** are collections of permissions (resource + action pairs).
- **Scope** — roles can be global (apply across all projects) or project-scoped (apply only to a specific project).
- **Enforcement** — NestJS `@Guard()` at the controller level checks permissions before any business logic executes.

---

## Predefined Roles

| Role | Domain | Description |
|------|--------|-------------|
| `admin` | System | Full system access. All domains, all actions. |
| `manager` | System | Operational management. Can configure domains but not system settings. |
| `sales_rep` | Commercial | Commercial domain: customers, RFQs, quotations. |
| `project_lead` | Project | Project domain: create and manage projects, milestones, teams. |
| `engineer` | Engineering | Engineering domain: designs, BOM, process plans. |
| `production_planner` | Manufacturing | Manufacturing domain: production plans, machine allocation. |
| `operator` | Manufacturing | Manufacturing execution: work orders, production runs. |
| `qa_inspector` | Quality | Quality domain: inspections, NCRs. |
| `qa_engineer` | Quality | Quality domain: CAPA, advanced quality workflows. |
| `service_tech` | Service | Service domain: dispatch, installation, maintenance. |
| `viewer` | Read-only | Read access across all domains (no mutations). |

---

## Permission Matrix

### Legend
- **C** — Create
- **R** — Read
- **U** — Update
- **D** — Delete
- **A** — Approve/Reject

### Commercial

| Resource | admin | manager | sales_rep | project_lead | engineer | viewer |
|----------|-------|---------|-----------|--------------|----------|--------|
| customer | CRUD | CRUD | CRU | R | R | R |
| contact | CRUD | CRUD | CRU | R | R | R |
| rfq | CRUD | CRUD | CRUD | R | - | R |
| quotation | CRUD | CRUD | CRUD | R | - | R |

### Project

| Resource | admin | manager | project_lead | engineer | viewer |
|----------|-------|---------|--------------|----------|--------|
| project | CRUD | CRUD | CRUD | R | R |
| milestone | CRUD | CRUD | CRUD | R | R |
| task | CRUD | CRUD | CRUD | CRU | R |
| team | CRUD | CRUD | CRU | R | R |
| timeline | CRUD | CRUD | CRUD | R | R |

### Engineering

| Resource | admin | manager | engineer | project_lead | qa_engineer | viewer |
|----------|-------|---------|----------|--------------|-------------|--------|
| design | CRUD | CRUD | CRUD | R | R | R |
| drawing_revision | CRUD | CRUD | CRU | R | R | R |
| bom | CRUD | CRUD | CRUD | R | R | R |
| process_plan | CRUD | CRUD | CRUD | R | R | R |
| engineering_change | CRUD | CRUD | CRU | CU | R | R |

### Manufacturing

| Resource | admin | manager | production_planner | operator | qa_inspector | viewer |
|----------|-------|---------|-------------------|----------|--------------|--------|
| production_plan | CRUD | CRUD | CRUD | R | R | R |
| machine | CRUD | CRUD | CRU | R | R | R |
| work_order | CRUD | CRUD | CRUD | RU | R | R |
| production_run | CRUD | CRUD | R | CRU | R | R |
| trial | CRUD | CRUD | CRU | CRU | R | R |

### Quality

| Resource | admin | manager | qa_inspector | qa_engineer | operator | viewer |
|----------|-------|---------|--------------|-------------|----------|--------|
| inspection_plan | CRUD | CRUD | R | CRUD | - | R |
| inspection_result | CRUD | CRUD | CRU | CRU | - | R |
| ncr | CRUD | CRUD | CRU | CRUD | R | R |
| capa | CRUD | CRUD | R | CRUD | - | R |

### Service

| Resource | admin | manager | service_tech | viewer |
|----------|-------|---------|-------------|--------|
| dispatch | CRUD | CRUD | CRU | R |
| installation | CRUD | CRUD | CRU | R |
| maintenance | CRUD | CRUD | CRU | R |
| service_request | CRUD | CRUD | CRUD | R |
| warranty | CRUD | CRUD | R | R |

### Security / System

| Resource | admin | manager | viewer |
|----------|-------|---------|--------|
| user | CRUD | R | - |
| role | CRUD | R | - |
| permission | CRUD | R | - |
| audit_log | R | R | R |

---

## Action Definitions

| Action | Effect |
|--------|--------|
| `create` | Can create new entities |
| `read` | Can view/read entities |
| `update` | Can modify existing entities |
| `delete` | Can soft-delete entities |
| `approve` | Can approve/reject workflows (quotations, designs, CAPAs) |

---

## Scope Model

### Global Scope
- Applied when `scope_project_id` is NULL in `user_roles`.
- User has the permission across all projects and entities.

### Project Scope
- Applied when `scope_project_id` is set.
- User's permissions are limited to entities belonging to that specific project.

### Example

```json
{
  "userId": "u_abc",
  "roles": [
    {
      "role": "engineer",
      "scope": null,                  // global — can see all engineering data
      "projectScope": null
    },
    {
      "role": "project_lead",
      "scope": "project",            // project-scoped
      "projectScope": "proj_xyz"    // only for project XYZ
    }
  ]
}
```

---

## Permission Enforcement

### Backend (NestJS)

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('engineering:design', 'create')
@Post('/designs')
async createDesign(@Body() dto: CreateDesignDto) {
  // Only users with engineering:design:create permission can access
}
```

### Frontend (React)

```typescript
const canCreateDesign = usePermission('engineering:design', 'create');

return (
  <>
    {canCreateDesign && <CreateDesignButton />}
  </>
);
```

---

## Permission Evaluation Flow

```
Request arrives
  │
  ▼
JwtAuthGuard — validate JWT, extract user + roles
  │
  ▼
PermissionsGuard — for each required permission:
  │
  ├── Does user have a role with resource:action?
  │     │
  │     ├── Yes → Is the role scoped to this project?
  │     │         ├── No scope (global) → ALLOW
  │     │         └── Scoped → Does entity.projectId match? → ALLOW or DENY
  │     │
  │     └── No → DENY (403)
  │
  ▼
Request proceeds to controller (if ALLOW)
```

---

## Data-Level Permissions

Beyond RBAC, certain fields are restricted based on role:

| Role | Restriction |
|------|-------------|
| Operator | Cannot see cost/pricing fields |
| Viewer | Cannot see rejection reasons or internal notes |
| Sales rep | Read-only access to engineering data |
| Engineer | Read-only access to commercial/pricing data |

These are enforced by **field-level serialization groups** in the response DTOs.

---

## Audit of Permission Changes

Every change to a user's role assignment is recorded in the audit log:

| Event | Audited Fields |
|-------|---------------|
| Role assigned | userId, roleId, scope, assignedBy |
| Role revoked | userId, roleId, scope, revokedBy |
| Permission modified | roleId, resource, action, modifiedBy |

---

## Predefined Role Seeds

```sql
-- admin: full access
INSERT INTO security.roles (name, description, is_system) VALUES ('admin', 'Full system access', TRUE);

-- viewer: read-only
INSERT INTO security.roles (name, description, is_system) VALUES ('viewer', 'Read-only access', TRUE);

-- Permissions are seeded per role-permission matrix above
-- e.g., for sales_rep:
INSERT INTO security.permissions (role_id, resource, action) VALUES
  ((SELECT id FROM security.roles WHERE name = 'sales_rep'), 'commercial:customer', 'create'),
  ((SELECT id FROM security.roles WHERE name = 'sales_rep'), 'commercial:customer', 'read'),
  ((SELECT id FROM security.roles WHERE name = 'sales_rep'), 'commercial:customer', 'update'),
  ((SELECT id FROM security.roles WHERE name = 'sales_rep'), 'commercial:rfq', 'create'),
  ...
```
