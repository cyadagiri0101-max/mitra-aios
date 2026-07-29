# Gap Analysis

> Generated: 2026-07-27
> Classification: Cross-reference of ALL specification documents vs. implementation

---

## Missing Features

### Commercial Domain
| Gap | Spec Reference | Impact |
|-----|---------------|--------|
| No Customer CRUD (controller, service, entity) | CRM_SPEC.md, DB_SCHEMAS.md | Cannot create/manage customer records |
| No Contact management | CRM_SPEC.md, DB_SCHEMAS.md | Cannot manage customer contacts |
| No RFQ→Quotation→Project pipeline | WORKFLOW_ENGINE.md | Quote-to-project flow is manual |
| No Quotation acceptance/rejection endpoints | API_CONTRACTS.md | Cannot transition quotes through lifecycle |
| No QuotationSent event | EVENT_CATALOG.md | Project domain can't auto-create from accepted quote |

### Project Domain
| Gap | Spec Reference | Impact |
|-----|---------------|--------|
| No Task management (controller, service, entity) | PROJECT_SPEC.md | Cannot manage project tasks |
| No Team management | PROJECT_SPEC.md, DB_SCHEMAS.md | Cannot assign teams to projects |
| No Timeline/Gantt service | PROJECT_SPEC.md | No project scheduling visualization |
| No Milestone action endpoints (complete) | API_CONTRACTS.md | Milestones can't be transitioned via API |
| No ProjectCreated event | EVENT_CATALOG.md | Other domains can't react to new projects |

### Engineering Domain
| Gap | Spec Reference | Impact |
|-----|---------------|--------|
| No dedicated BOM module (independent of design) | BOM_SPEC.md | BOM lifecycle not managed independently |
| No BOM release/revise workflow | WORKFLOW_ENGINE.md | BOM cannot transition through states |
| No Design submit/approve action endpoints | API_CONTRACTS.md | Design approval not exposed as API actions |
| No Engineering decision log table | TRACEABILITY_MODEL.md | No formal engineering decision capture |
| No BOM comparison between versions | BOM_SPEC.md, API_CONTRACTS.md | Cannot diff BOM versions |

### Manufacturing Domain
| Gap | Spec Reference | Impact |
|-----|---------------|--------|
| No Production Plan module | MANUFACTURING_SPEC.md | No high-level production scheduling |
| No Work Order state transitions (release, start, complete, report-issue) | WORKFLOW_ENGINE.md | Work orders are CRUD-only, no lifecycle |
| No Production Run recording | API_CONTRACTS.md | Cannot record actual production execution |
| No Trial schedule/record endpoints | API_CONTRACTS.md | Trial management is read-only CRUD |

### Quality Domain
| Gap | Spec Reference | Impact |
|-----|---------------|--------|
| No Inspection Plan module | QUALITY_SPEC.md, DB_SCHEMAS.md | Cannot define inspection criteria |
| No Inspection Result recording | API_CONTRACTS.md | Cannot record inspection outcomes |
| No NCR module (controller, service, entity) | QUALITY_SPEC.md, DB_SCHEMAS.md | Non-conformance not tracked |
| No CAPA state machine (initiated→in_progress→verification→closed) | WORKFLOW_ENGINE.md | CAPA is CRUD-only, no lifecycle enforcement |
| No CAPA Action entity | DB_SCHEMAS.md | CAPA actions not individually trackable |
| No NCR→CAPA link enforcement | QUALITY_SPEC.md | Business rule not implemented |
| No CAPA effectiveness verification | QUALITY_SPEC.md | Cannot verify and close CAPA |

### Service Domain
| Gap | Spec Reference | Impact |
|-----|---------------|--------|
| No Installation tracking | SERVICE_SPEC.md, DB_SCHEMAS.md | Cannot record on-site installation |
| No Maintenance logging | SERVICE_SPEC.md, DB_SCHEMAS.md | Cannot track mold maintenance history |
| No Warranty management | SERVICE_SPEC.md, DB_SCHEMAS.md | Warranty terms and claims not tracked |
| No Service Request state machine | WORKFLOW_ENGINE.md | Requests are CRUD-only, no lifecycle |
| No Dispatch status transitions | WORKFLOW_ENGINE.md | Dispatch prepared→shipped→delivered not tracked |

### Knowledge Domain
| Gap | Spec Reference | Impact |
|-----|---------------|--------|
| No Knowledge Graph (nodes, edges) | KNOWLEDGE_GRAPH.md | No entity relationship graph |
| No Graph construction from events | KNOWLEDGE_GRAPH.md | Graph not built automatically |
| No Graph traversal/impact analysis APIs | KNOWLEDGE_GRAPH.md | Cannot query entity relationships |
| No Graph visualization in frontend | UI_SPECIFICATIONS.md | Users can't explore knowledge graph |

### Cross-Cutting
| Gap | Spec Reference | Impact |
|-----|---------------|--------|
| No Event Bus implementation | EVENT_CATALOG.md | Zero domain events published — no async cross-domain communication |
| No event dispatcher/subscriber infrastructure | EVENT_DEFINITIONS.md | Event-driven architecture exists only on paper |
| CacheModule disabled | app.module.ts (commented out) | Redis caching not available |
| No materialized views for analytics | ANALYTICS_SPEC.md | KPIs not pre-computed for performance |

---

## Partially Implemented Features

| Feature | What Exists | What's Missing | Domain |
|---------|-------------|----------------|--------|
| Commercial Module | Enquiry CRUD, Quotation entity | Customer model, full RFQ lifecycle, quotation workflow | Commercial |
| Project Module | Project CRUD, health, stage transitions | Tasks, teams, timeline, milestones as independent resources | Project |
| Design Module | Design part CRUD, revisions, files, approvals | Submit/approve action endpoints, workflow engine integration | Engineering |
| BOM | DesignBOM entity linked to design | Independent BOM module, release/revise lifecycle | Engineering |
| Process Planning | Process plan CRUD with routings and steps | No workflow state machine integration | Engineering |
| Engineering Change | ECR/ECO CRUD | Approval/rejection action endpoints, workflow integration | Engineering |
| Work Orders | CRUD only | State transitions (release, start, complete, report-issue) | Manufacturing |
| CAPA | CRUD only | State machine, actions sub-entity, effectiveness verification | Quality |
| Dispatch | CRUD with "dispatch plans" | Status tracking, "dispatch records" naming | Service |
| Service Requests | CRUD only | Resolve/close endpoints, SLA tracking | Service |
| Spare Parts | Entity exists | No inventory management endpoints | Service |
| Documents | Version CRUD | Document lifecycle, indexing status, search integration | Knowledge |
| Analytics | Metrics interceptor, AI usage tracking | KPI materialized views, dashboard/report APIs | Analytics |
| Admin | User/role CRUD | Permission seeding per matrix, frontend permission hooks | Security |
| Audit | Full audit interceptor with entity | Frontend audit viewer | Security |

---

## Broken / Non-Compliant Features

| Issue | Location | Spec Violation | Severity |
|-------|----------|---------------|----------|
| Endpoint naming mismatch — "enquiries" not "rfqs" | `commercial/controllers/enquiry.controller.ts` | API_STANDARDS.md: resources should match domain model | Medium |
| Endpoint path — `/commercial/enquiries` vs spec `/commercial/rfqs` | Same controller | API_CONTRACTS.md endpoint naming | Medium |
| Missing PermissionsGuard on some GET endpoints | Several controllers | PERMISSION_MODEL.md: all endpoints should be guarded | High |
| Roles enum uses DIFFERENT names from spec | `@Roles('ADMIN', 'MANAGEMENT', 'SALES', ...)` — roles hardcoded as string enums | PERMISSION_MODEL.md defines: admin, manager, sales_rep, engineer, etc. | High |
| No task/team/timeline — project backbone incomplete | Missing entirely | DOMAIN_MODEL.md: Project domain should include milestones, tasks, teams, timeline | Critical |
| No event publishing — event-driven architecture not implemented | No EventDispatcher anywhere | EVENT_CATALOG.md: events are the "heart of the platform" | Critical |
| Knowledge graph not implemented — graph tables don't exist | No graph_nodes or graph_edges tables | KNOWLEDGE_GRAPH.md: "one of MITRA's biggest differentiators" | Critical |
| CAPA and NCR in same quality module but NCR entity missing | Quality module has CAPA only | QUALITY_SPEC.md: NCR and CAPA are separate entities | High |
| Frontend has ZERO tests | No `*.test.*` or `*.spec.*` in mitra-frontend | TEST_SPECIFICATIONS.md: minimum 80% coverage | Critical |
| No permission-based UI rendering | Frontend doesn't consume permission data | PERMISSION_MODEL.md: UI should show/hide based on role | High |

---

## Technical Debt

| Item | Location | Details | Priority |
|------|----------|---------|----------|
| Commented-out CacheModule | `app.module.ts` line 39, 108 | Redis caching disabled — impacts performance under load | High |
| Hardcoded role strings as decorator arguments | All controllers | `@Roles('ADMIN', 'MANAGEMENT', 'SALES', ...)` — brittle, not driven by database | High |
| `synchronize: true` in dev mode | `app.module.ts` line 64-66 | Risk of data loss if entity changes are made; should use migrations always | Medium |
| Enquiry used for both RFQ and CRM | `commercial/` module | Enquiry entity overloaded for multiple concerns; spec separates Customer, RFQ, Quotation | High |
| `dispatch_plans` vs `dispatch_records` entity naming | `dispatch/entities/dispatchplan.entity.ts` | Spec uses "dispatch records" — naming inconsistency | Low |
| Process planning in `planning` module but production planning missing | `planning/` vs spec | Spec separates Process Planning (engineering) from Production Planning (manufacturing) | Medium |
| Frontend routes don't match API paths | `frontend/App.tsx` routes vs backend controllers | `/quality` page exists but backend has `/capa` not `/quality/capa` | Medium |
| No pagination on dispatch endpoint | `dispatch.controller.ts` — no PaginationDto | API_STANDARDS.md: all list endpoints must support pagination | Medium |
| Frontend API layer in `utils/api.ts` not organized by domain | `frontend/src/utils/api.ts` | Single file mixing BOM, Drawing, Machine, AI, EKL APIs — should be per-domain services | Medium |
| 3 old/duplicate test utility files at root | `verify_*.js`, `probe_*.js`, etc. | Clutter from exploration/validation scripts | Low |

---

## Documentation Gaps

| Gap | Details | Priority |
|-----|---------|----------|
| No ADR directory | `docs/adr/` specified in DATA_LIBRARY_GUIDE.md doesn't exist | Low |
| No operations runbook | `OPERATIONS_RUNBOOK.md` referenced in DATA_LIBRARY_GUIDE.md doesn't exist | Medium |
| DB migration scripts manually generated with timestamp seeds | Migrations use fixed timestamps (1700000000xxx), not dates | Low |
| API documentation (Swagger) — no evidence of `@ApiOperation`, `@ApiResponse` on many controllers | Only Dispatch controller has Swagger decorators. Commercial, manufacturing, quality controllers don't. | Medium |
