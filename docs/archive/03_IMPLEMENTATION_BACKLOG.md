# Implementation Backlog

> Priority: P0 (blocker) → P1 (critical) → P2 (important) → P3 (nice-to-have)
> Total: 50 tasks

---

## P0 — Blockers (6 tasks)

### P0-1: Implement Event Bus and Domain Events
| Field | Value |
|-------|-------|
| **Description** | Create event dispatcher service, publish/subscribe infrastructure, and implement ALL domain events from EVENT_CATALOG.md. This is foundational — every domain depends on events for cross-domain communication. |
| **Affected Module** | Cross-cutting (all domains) |
| **Estimated Effort** | 3-4 weeks |
| **Dependencies** | Redis (CacheModule) |
| **Acceptance Criteria** | - EventDispatcher service exists with publish/subscribe methods<br>- QuotationAccepted → ProjectCreated flow works end-to-end<br>- All 40+ events from EVENT_CATALOG.md are published at correct lifecycle points<br>- Dead-letter queue captures failed events<br>- Events are persisted in audit_log |

### P0-2: Complete Commercial Domain (CRM + Customer + RFQ)
| Field | Value |
|-------|-------|
| **Description** | Implement Customer CRUD, Contact management, RFQ lifecycle, Quotation workflow per CRM_SPEC.md and DB_SCHEMAS.md. Replace generic "enquiry" model with proper Customer→RFQ→Quotation domain. |
| **Affected Module** | Commercial |
| **Estimated Effort** | 3-4 weeks |
| **Dependencies** | None |
| **Acceptance Criteria** | - Customer create/read/update/list endpoints work<br>- Contact management with primary contact enforcement<br>- RFQ lifecycle (draft→submitted→under_review→quoted→won/lost)<br>- Quotation lifecycle (draft→sent→accepted→project_created)<br>- Accepting quotation creates Project (via event)<br>- Commercial schema has customers, contacts, rfqs, quotations tables |

### P0-3: Implement NCR Module
| Field | Value |
|-------|-------|
| **Description** | Create NCR controller, service, entity, and state machine per QUALITY_SPEC.md. Non-conformance reporting is the trigger for CAPA — missing entirely. |
| **Affected Module** | Quality |
| **Estimated Effort** | 2 weeks |
| **Dependencies** | P0-1 (events), Inspection module |
| **Acceptance Criteria** | - NCR CRUD endpoints with auto-generated ncr_number<br>- State machine: open→under_investigation→actioned→closed<br>- NCR→CAPA link enforced for major/critical severity<br>- NCRCreated/NCRClosed events published |

### P0-4: Implement Task, Team, and Timeline Modules
| Field | Value |
|-------|-------|
| **Description** | Create task management, team assignment, and timeline/scheduling modules per PROJECT_SPEC.md. Without these, the "Project is the central aggregate" principle is violated. |
| **Affected Module** | Project |
| **Estimated Effort** | 3 weeks |
| **Dependencies** | None |
| **Acceptance Criteria** | - Task CRUD with milestone association<br>- Task state machine (todo→in_progress→review→done)<br>- Team creation with member management<br>- Timeline/Gantt data generation endpoint<br>- Milestone action endpoints (complete)<br>- TaskCompleted event published |

### P0-5: Implement Knowledge Graph
| Field | Value |
|-------|-------|
| **Description** | Create graph_nodes and graph_edges tables, graph builder from domain events, traversal/impact analysis APIs per KNOWLEDGE_GRAPH.md. This is MITRA's key differentiator. |
| **Affected Module** | Knowledge |
| **Estimated Effort** | 4 weeks |
| **Dependencies** | P0-1 (events to drive graph construction) |
| **Acceptance Criteria** | - graph_nodes and graph_edges tables created<br>- Event-driven graph builder populates nodes/edges<br>- Impact analysis query endpoint works<br>- Root cause trace query endpoint works<br>- Full-project-lifecycle trace endpoint works<br>- Graph visualization data API returns traversable structure |

### P0-6: Add Frontend Tests
| Field | Value |
|-------|-------|
| **Description** | Set up Vitest + React Testing Library in frontend. Write unit tests for hooks, components, and pages. E2E tests with Playwright for critical journeys. |
| **Affected Module** | Frontend (cross-cutting) |
| **Estimated Effort** | 3 weeks |
| **Dependencies** | None |
| **Acceptance Criteria** | - Vitest configured with coverage reporting<br>- Minimum 80% line coverage on utility functions and hooks<br>- Component tests for top 10 pages<br>- Playwright E2E for quote-to-project journey<br>- CI pipeline runs frontend tests |

---

## P1 — Critical (12 tasks)

### P1-1: Implement Production Plan Module
| Field | Value |
|-------|-------|
| **Description** | Create production plan controller, service, entity per MANUFACTURING_SPEC.md. High-level manufacturing scheduling. |
| **Effort** | 2 weeks | Dependencies: P0-1 |
| **Acceptance** | Production plan CRUD, scheduled dates, work order generation link |

### P1-2: Implement Work Order State Machine
| Field | Value |
|-------|-------|
| **Description** | Add release, start, complete, report-issue, cancel actions to work order controller per WORKFLOW_ENGINE.md. |
| **Effort** | 1 week | Dependencies: None |
| **Acceptance** | Work order lifecycle: pending→released→in_progress→completed→closed, events published at each transition |

### P1-3: Implement Production Run Recording
| Field | Value |
|-------|-------|
| **Description** | Create production_runs table and POST endpoint per API_CONTRACTS.md. Record actual production execution against work orders. |
| **Effort** | 1 week | Dependencies: P1-2 |
| **Acceptance** | ProductionRun entity created, record run endpoint, ProductionRunCompleted event |

### P1-4: Implement Inspection Plan Module
| Field | Value |
|-------|-------|
| **Description** | Create inspection plan and inspection result entities, controllers, APIs per QUALITY_SPEC.md. |
| **Effort** | 2 weeks | Dependencies: None |
| **Acceptance** | Inspection plan with checkpoints, result recording, pass/fail outcome, auto NCR creation on fail |

### P1-5: Implement CAPA State Machine
| Field | Value |
|-------|-------|
| **Description** | Add start, complete-actions, verify, close, hold action endpoints to CAPA controller per WORKFLOW_ENGINE.md. Create CAPA Action entity. |
| **Effort** | 1 week | Dependencies: P1-4 |
| **Acceptance** | CAPA lifecycle: initiated→in_progress→verification→closed, capa_actions table, effectiveness verification, events |

### P1-6: Implement Service Request State Machine
| Field | Value |
|-------|-------|
| **Description** | Add resolve, close, reopen action endpoints per WORKFLOW_ENGINE.md. Add SLA tracking. |
| **Effort** | 1 week | Dependencies: None |
| **Acceptance** | Service request: open→in_progress→resolved→closed, SLA fields, events |

### P1-7: Implement Dispatch Status Tracking
| Field | Value |
|-------|-------|
| **Description** | Rename dispatch_plans to dispatch_records, add status field and transition endpoints per SERVICE_SPEC.md. |
| **Effort** | 0.5 week | Dependencies: None |
| **Acceptance** | Dispatch: prepared→shipped→delivered, DispatchCreated event |

### P1-8: Implement Installation Module
| Field | Value |
|-------|-------|
| **Description** | Create installation entity and endpoints per SERVICE_SPEC.md. |
| **Effort** | 1 week | Dependencies: P1-7 |
| **Acceptance** | Installation recording, customer acceptance workflow, InstallationCompleted event |

### P1-9: Implement Warranty Module
| Field | Value |
|-------|-------|
| **Description** | Create warranty and warranty_claim entities and endpoints per SERVICE_SPEC.md. |
| **Effort** | 1 week | Dependencies: P1-7 |
| **Acceptance** | Warranty definition, claim submission/review/approval workflow |

### P1-10: Align Role Names with PERMISSION_MODEL.md
| Field | Value |
|-------|-------|
| **Description** | Update role names across backend controllers to match spec: ADMIN→admin, MANAGEMENT→manager, SALES→sales_rep, DESIGN→engineer, PLANNING→production_planner, PRODUCTION→operator, QUALITY→qa_inspector/qa_engineer. |
| **Effort** | 0.5 week | Dependencies: None |
| **Acceptance** | Roles in code match PERMISSION_MODEL.md, permission matrix seeded correctly |

### P1-11: Add Frontend Permission Hooks
| Field | Value |
|-------|-------|
| **Description** | Create `usePermission()` hook consuming user permissions from auth context. Add conditional rendering guards to all UI elements. |
| **Effort** | 1 week | Dependencies: P1-10 |
| **Acceptance** | UI elements hide/show based on user role, unauthorized actions disabled |

### P1-12: Add Analytics Materialized Views
| Field | Value |
|-------|-------|
| **Description** | Create `analytics` schema, materialized views for all KPIs from ANALYTICS_SPEC.md, dashboard/report endpoints. |
| **Effort** | 2 weeks | Dependencies: None |
| **Acceptance** | KPI materialized views created, dashboard endpoint returns real KPI data, report generation API works |

---

## P2 — Important (18 tasks)

| # | Task | Module | Effort | Dependencies |
|---|------|--------|--------|--------------|
| P2-1 | Add Swagger decorators to all controllers | All | 1 week | None |
| P2-2 | Add pagination to dispatch endpoint | Service | 0.25 week | None |
| P2-3 | Unify frontend routes with backend API paths | Frontend | 0.5 week | None |
| P2-4 | Refactor `utils/api.ts` into per-domain service files | Frontend | 1 week | None |
| P2-5 | Add maintenance logging module | Service | 1 week | P0-1 |
| P2-6 | Add spare parts inventory endpoints | Service | 0.5 week | None |
| P2-7 | Implement Design submit/approve action endpoints | Engineering | 1 week | P0-1 |
| P2-8 | Implement dedicated BOM module with release/revise lifecycle | Engineering | 2 weeks | P0-1 |
| P2-9 | Implement engineering decision log | Engineering | 1 week | None |
| P2-10 | Add BOM version comparison endpoint | Engineering | 0.5 week | P2-8 |
| P2-11 | Implement trial schedule/record endpoints | Manufacturing | 0.5 week | None |
| P2-12 | Enable CacheModule (Redis) | Infrastructure | 0.5 week | Redis |
| P2-13 | Add frontend audit log viewer | Admin | 1 week | None |
| P2-14 | Implement project health to emit events | Project | 0.5 week | P0-1 |
| P2-15 | Create ADR directory and seed first ADR | Documentation | 0.25 week | None |
| P2-16 | Add operations runbook | Documentation | 1 week | None |
| P2-17 | Add field-level encryption for sensitive data | Security | 2 weeks | None |
| P2-18 | Implement MinIO presigned URL for secure file access | Storage | 1 week | None |

---

## P3 — Nice-to-Have (14 tasks)

| # | Task | Module | Effort |
|---|------|--------|--------|
| P3-1 | Knowledge graph visualization in frontend | Knowledge | 3 weeks |
| P3-2 | AI copilot knowledge graph query integration | AI | 2 weeks |
| P3-3 | Predictive maintenance from production data | Manufacturing | 3 weeks |
| P3-4 | Customer portal for RFQ submission | Commercial | 4 weeks |
| P3-5 | Email integration for quotations | Commercial | 2 weeks |
| P3-6 | Mobile interface for operator data entry | Manufacturing | 4 weeks |
| P3-7 | IoT integration for machine monitoring | Manufacturing | 4 weeks |
| P3-8 | Statistical Process Control charting | Quality | 2 weeks |
| P3-9 | CMM data import for inspection | Quality | 3 weeks |
| P3-10 | Dashboard drill-down to entity detail | Analytics | 2 weeks |
| P3-11 | Scheduled report delivery via email | Analytics | 1 week |
| P3-12 | Clean up root-level JS scripts (verify_*.js) | Housekeeping | 0.25 week |
| P3-13 | Multi-language support setup | Infrastructure | 3 weeks |
| P3-14 | Dark mode UI theme | Frontend | 1 week |

---

## Sprint Recommendation

| Sprint | Focus | Tasks |
|--------|-------|-------|
| **Sprint 1** | Foundation | P0-1 (Event Bus) + P0-2 (Commercial Domain) |
| **Sprint 2** | Project Core | P0-4 (Tasks/Teams/Timeline) + P2-12 (Redis) |
| **Sprint 3** | Quality | P0-3 (NCR) + P1-4 (Inspection) + P1-5 (CAPA State Machine) |
| **Sprint 4** | Manufacturing | P1-1 (Production Plans) + P1-2 (Work Order State Machine) + P1-3 (Production Runs) |
| **Sprint 5** | Service + Knowledge Graph | P1-6 (Service Request) + P1-7 (Dispatch) + P1-8 (Installation) + P1-9 (Warranty) |
| **Sprint 6** | Knowledge Graph | P0-5 (Knowledge Graph) + P2-6 (Spare Parts) |
| **Sprint 7** | Testing + Security | P0-6 (Frontend Tests) + P1-10 (Roles) + P1-11 (Frontend Permissions) + P1-12 (Analytics) |
| **Sprint 8** | Integration + Polish | P2-1 through P2-18 + P3-1 through P3-14 |
