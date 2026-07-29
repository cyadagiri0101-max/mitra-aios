# Design Module Specification

## Business Objectives
- Manage mold designs with full version control and traceability.
- Store and index CAD files with metadata extraction.
- Enable collaborative design review and approval workflows.

## Actors
| Actor | Role | Responsibilities |
|-------|------|------------------|
| Engineer | engineer | Create designs, upload CAD files, submit for review |
| Design Lead | engineer | Review and approve designs, manage revisions |
| QA Engineer | qa_engineer | Review designs for manufacturability |
| Manager | manager | Oversee design progress, resolve disputes |

## Business Rules
- Design `design_number` is auto-generated with prefix `DSN-{project}-{sequence}`.
- A new revision increments `revision` counter; previous revision is marked `superseded`.
- CAD file must be uploaded before a design can be submitted for review.
- A design can only be approved by a user who is not the designer.
- Approved designs cannot be edited — changes require a new revision.
- Design metadata (CAD format, version, author) is extracted on upload.

## State Machine
```
draft ──► under_review ──► approved ──► superseded
              │
              └──► changes_requested ──► draft
```

## Entities
- **Design** — id, project_id, design_number, revision, status, cad_file_ref, metadata, approved_by
- **DrawingRevision** — id, design_id, revision_number, file_ref, changes, status
- **EngineeringDecision** — id, project_id, entity_id, decision, rationale, previous_value, new_value (see TRACEABILITY_MODEL.md)

## APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/engineering/designs | List designs (filterable by project, status) |
| POST | /api/v1/engineering/designs | Create design |
| GET | /api/v1/engineering/designs/{id} | Get design with revisions |
| PUT | /api/v1/engineering/designs/{id} | Update design metadata |
| POST | /api/v1/engineering/designs/{id}/upload | Upload CAD file |
| POST | /api/v1/engineering/designs/{id}/submit | Submit for review |
| POST | /api/v1/engineering/designs/{id}/approve | Approve design |
| POST | /api/v1/engineering/designs/{id}/request-changes | Request design changes |
| GET | /api/v1/engineering/designs/{id}/revisions | List revisions |
| POST | /api/v1/engineering/designs/{id}/revisions | Create revision |
| GET | /api/v1/engineering/designs/{id}/history | Design decision history |

## Events
| Event | When | Payload |
|-------|------|---------|
| DesignCreated | New design created | designId, projectId, revision |
| DesignSubmitted | Design submitted for review | designId, projectId, submittedBy |
| DesignApproved | Design approved | designId, projectId, revision, approvedBy |
| DesignChangesRequested | Review requested changes | designId, projectId, comments |

## Permissions
| Resource | admin | manager | engineer | project_lead | qa_engineer | viewer |
|----------|-------|---------|----------|--------------|-------------|--------|
| design | CRUD | CRUD | CRUD | R | R | R |
| drawing_revision | CRUD | CRUD | CRU | R | R | R |
| approve design | A | A | - | - | A | - |

## Reports
- Design Status — designs by status per project
- Revision History — all revisions with approvers and dates
- Approval Cycle Time — time from submission to approval
- Design Decision Log — complete history with rationales

## Dashboards
- **Design Overview** — design count by project, status distribution
- **Review Pipeline** — designs awaiting review, aging analysis

## AI Capabilities
- **Design Similarity Search** — Find similar designs across projects using vector embeddings.
- **CAD Metadata Extraction** — Auto-extract material, dimensions, tolerances from CAD files.
- **Design Rule Check** (future) — Validate against engineering best practices from knowledge base.

## Integration Points
- **Manufacturing Domain** — DesignApproved triggers production planning and BOM release.
- **Quality Domain** — Design data feeds inspection plan creation.
- **Knowledge Domain** — Design decisions stored as knowledge entries.

## Future Enhancements
- 3D model viewer in browser (WebGL/Three.js).
- Automated interference detection between components.
- Parametric design templates for standard mold components.
- Direct CAD tool integration via API/plugin.
