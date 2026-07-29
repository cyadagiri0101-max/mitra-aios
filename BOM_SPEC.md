# BOM Module Specification

## Business Objectives
- Manage the complete Bill of Materials for mold projects.
- Support multi-level BOM structures (assemblies, sub-assemblies, components).
- Ensure BOM accuracy through versioning and release control.

## Actors
| Actor | Role | Responsibilities |
|-------|------|------------------|
| Engineer | engineer | Create BOM from design, manage items, release BOM |
| Production Planner | production_planner | Review BOM for manufacturing feasibility |
| Manager | manager | Approve BOM revisions |
| Admin | admin | Manage material master data |

## Business Rules
- A BOM is always created from a design or as a standalone project artifact.
- BOM items can be organized hierarchically (parent-child via `parent_item_id`).
- BOM version increments when released BOM is revised.
- Released BOMs cannot be edited — revisions create a new version.
- Material codes reference a shared material master list.
- Duplicate part numbers within a single BOM are not permitted.
- BOM items can reference standard parts from the data library.

## State Machine
```
draft ──► released ──► revised ──► superseded
```

## Entities
- **BOM** — id, project_id, design_id, version, status
- **BOMItem** — id, bom_id, parent_item_id, part_number, description, quantity, unit, material, specification
- **Material** — id, code, name, category, specification (shared reference data)

## APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/engineering/boms | List BOMs (filterable by project, design) |
| POST | /api/v1/engineering/boms | Create BOM from design |
| GET | /api/v1/engineering/boms/{id} | Get BOM with items (tree structure) |
| POST | /api/v1/engineering/boms/{id}/release | Release BOM |
| POST | /api/v1/engineering/boms/{id}/revise | Create new version |
| GET | /api/v1/engineering/boms/{id}/versions | List BOM versions |
| GET | /api/v1/engineering/boms/{id}/items | List BOM items |
| POST | /api/v1/engineering/boms/{id}/items | Add BOM item |
| PUT | /api/v1/engineering/bom-items/{itemId} | Update BOM item |
| DELETE | /api/v1/engineering/bom-items/{itemId} | Remove BOM item |
| GET | /api/v1/engineering/boms/{id}/compare?versionA=1&versionB=2 | Compare BOM versions |

## Events
| Event | When | Payload |
|-------|------|---------|
| BOMCreated | BOM created from design | bomId, projectId, designId, items[] |
| BOMReleased | BOM approved and released | bomId, projectId, version |
| BOMRevised | New BOM version created | bomId, projectId, oldVersion, newVersion |

## Permissions
| Resource | admin | manager | engineer | viewer |
|----------|-------|---------|----------|--------|
| bom | CRUD | CRUD | CRUD | R |
| bom_item | CRUD | CRUD | CRUD | R |
| release bom | - | A | A | - |

## Reports
- BOM Comparison — side-by-side diff between BOM versions
- Material Usage — materials used across projects, total quantities
- BOM Cost Estimate — item costs rolled up to BOM total
- Standard Part Usage — usage frequency of standard components

## Dashboards
- **BOM Status** — draft vs released BOMs per project
- **Material Usage Trends** — most-used materials, suppliers

## AI Capabilities
- **Material Recommendation** — Suggest materials based on design parameters and past BOMs.
- **BOM Auto-Population** (future) — Generate BOM items from CAD feature recognition.
- **Cost Estimation** (future) — Predict BOM cost from historical similar items.

## Integration Points
- **Engineering (Design)** — BOM originates from design approval.
- **Manufacturing** — BOMReleased triggers production plan creation.
- **Quality** — BOM items referenced in inspection plans.
- **Service** — BOM items used as spare parts reference.
- **Knowledge** — BOM structures indexed for similarity search.

## Future Enhancements
- Supplier integration for automated pricing.
- Make-vs-buy analysis based on BOM items.
- BOM import from CAD tools (STEP, SolidWorks API).
- Engineering BOM (EBOM) to Manufacturing BOM (MBOM) transformation.
