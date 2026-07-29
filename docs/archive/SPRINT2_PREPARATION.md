# Sprint 2 — Preparation

**Theme:** Project Management — Lifecycle, Milestones, Tasks, Teams, Scheduling

**Target:** After Sprint 1 is closed

---

## Sprint Goal

Build the Project Management module to plan, track, and manage mold development projects through their full lifecycle, including milestones, tasks, team assignments, resource allocation, and scheduling.

---

## Scope

### Project Lifecycle (Enhance)
- [ ] Project CRUD enhancements (customerName, productName population from Commercial)
- [ ] Project stage gating with workflow validation
- [ ] Stage transition history tracking
- [ ] Project status dashboard

### Milestones
- [ ] Milestone CRUD (per project)
- [ ] Milestone status tracking (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)
- [ ] Milestone dependency graph
- [ ] Milestone health integration with project health engine

### Tasks
- [ ] Task CRUD (per milestone / per project)
- [ ] Task assignment to users
- [ ] Task status workflow (TODO → IN_PROGRESS → REVIEW → DONE)
- [ ] Task priority and due dates
- [ ] Task dependencies

### Teams
- [ ] Team CRUD
- [ ] Team membership management
- [ ] Role-based team assignments
- [ ] Team calendar

### Resource Allocation
- [ ] Resource CRUD (machines, tools, personnel)
- [ ] Resource availability calendar
- [ ] Resource booking against tasks/milestones
- [ ] Conflict detection

### Scheduling
- [ ] Gantt chart data generation
- [ ] Timeline visualization foundation
- [ ] Critical path analysis
- [ ] Schedule baseline vs actual tracking

---

## Technical Debt to Address

Carry over from Sprint 1 (see TECHNICAL_DEBT_REGISTER.md):

| Priority | Items | Effort |
|----------|-------|--------|
| P1 | TD-01 (Invoice/Payment services), TD-04 (customerName), TD-05 (productName), TD-06 (enquiryNumber auto-gen), TD-09 (test mock fix), TD-10 (test mock fix) | ~6 days |

---

## Pre-requisites

1. ✅ Existing `Project` entity with ENQUIRY→SERVICE stage machine
2. ✅ `ProjectService` with CRUD, stage transition, health engine
3. ✅ `WorkflowModule` with mold_project lifecycle transitions
4. ✅ Role/permission model (ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY)
5. ✅ Frontend projects page at `/projects`

## New Dependencies to Add

- `@nestjs/schedule` — for scheduled health refresh jobs
- `date-fns` — already available in frontend
- No new database dependencies required

---

## Database Migrations (Planned)

| Migration | Tables |
|-----------|--------|
| `S2-001-Milestones` | `milestone_dependencies` |
| `S2-002-Tasks` | `tasks`, `task_assignments`, `task_dependencies` |
| `S2-003-Teams` | `teams`, `team_members` |
| `S2-004-Resources` | `resource_calendar`, `resource_bookings` |

---

## Acceptance Criteria

1. Project module fully integrated with Commercial (customerName, productName populated)
2. Milestones can be created, updated, tracked with health impact
3. Tasks support full lifecycle with assignment
4. Teams can be formed with members
5. Resources can be allocated with conflict detection
6. Gantt foundation data available via API
7. All new endpoints covered by unit tests
8. Frontend pages for project details, milestones, tasks
9. Backend build + frontend build pass
10. Test suite passes (including fixed mock tests)

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep — full Gantt in one sprint | High | Medium | Defer interactive Gantt to Sprint 3; deliver data endpoints only |
| Resource conflict detection complexity | Medium | Low | Start with simple date-overlap check; enhance later |
| Team module overlapping with platform auth | Low | Low | Reuse existing Role/User entities |
| Frontend task board too ambitious | Medium | Medium | Deliver list view first; Kanban board in Sprint 3 |

---

## Estimated Capacity

| Role | Days | Notes |
|------|------|-------|
| Backend (NestJS) | 10 days | APIs, services, migrations, tests |
| Frontend (React) | 8 days | Pages, components, state |
| Integration/QA | 3 days | E2E validation, bug fixes |
| **Total** | **21 days** | ~3 weeks with 1 developer |

---

## Roadmap Reference

```
Sprint 1 ✅ ──► Sprint 2 (THIS) ──► Sprint 3 (Engineering)
  Commercial        Project Mgmt        BOM, CAD, Drawings, ECR/ECO
                                      ──► Sprint 4 (Manufacturing)
                                        Planning, Routing, Production
                                      ──► Sprint 5 (Quality)
                                        Inspection, CAPA, NCR, PPAP, FAI
                                      ──► Sprint 6 (Service)
                                        Installation, Warranty, AMC
                                      ──► Sprint 7 (AI)
                                        Copilot, RAG, Knowledge Graph
```
