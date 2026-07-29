# Project Module Specification

## Business Objectives
- Provide the central lifecycle backbone that links every domain.
- Enable complete project planning, execution tracking, and delivery management.
- Serve as the single source of truth for every mold project.

## Actors
| Actor | Role | Responsibilities |
|-------|------|------------------|
| Project Lead | project_lead | Create projects, assign teams, manage milestones |
| Engineer | engineer | View project timeline, update task status |
| Manager | manager | Oversee project portfolio, reallocate resources |
| Admin | admin | Full project configuration |

## Business Rules
- A project is always created from an accepted quotation.
- Project `name` must be unique within a financial year.
- Milestones must be created in sequence order.
- A milestone cannot be completed if its predecessor is not completed.
- A task can only be assigned to a user who is a member of the project team.
- Project status transitions are linear (no skipping stages).

## State Machine
```
planning ──► engineering ──► manufacturing ──► trial ──► dispatch ──► completed
   │              │                │            │           │
   └──► on_hold   └──► design_review └──► rework └──► quality_hold └──► service
```

See WORKFLOW_ENGINE.md for full transition table.

## Entities
- **Project** — id, quotation_id, customer_id, name, status, priority, start_date, delivery_date
- **Milestone** — id, project_id, name, sequence, target_date, actual_date, status
- **Task** — id, project_id, milestone_id, title, description, assigned_to, status, due_date
- **Team** — id, project_id, name
- **TeamMember** — id, team_id, user_id, role

## APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/project/projects | List projects (paginated, filterable) |
| POST | /api/v1/project/projects | Create project from quotation |
| GET | /api/v1/project/projects/{id} | Get project with timeline |
| PUT | /api/v1/project/projects/{id} | Update project metadata |
| POST | /api/v1/project/projects/{id}/transition | State transition |
| GET | /api/v1/project/projects/{id}/milestones | List milestones |
| POST | /api/v1/project/projects/{id}/milestones | Create milestone |
| PUT | /api/v1/project/milestones/{id} | Update milestone |
| POST | /api/v1/project/milestones/{id}/complete | Mark milestone complete |
| GET | /api/v1/project/projects/{id}/tasks | List tasks |
| POST | /api/v1/project/projects/{id}/tasks | Create task |
| PUT | /api/v1/project/tasks/{id} | Update task |
| POST | /api/v1/project/tasks/{id}/transition | Task status transition |
| GET | /api/v1/project/projects/{id}/teams | List teams |
| POST | /api/v1/project/projects/{id}/teams | Create team |
| POST | /api/v1/project/teams/{id}/members | Add team member |
| DELETE | /api/v1/project/teams/{id}/members/{userId} | Remove team member |

## Events
| Event | When | Payload |
|-------|------|---------|
| ProjectCreated | New project created | projectId, quotationId, customerId, name, deliveryDate |
| MilestoneReached | Milestone completed | projectId, milestoneId, name, sequence, reachedAt |
| TaskCreated | Task added | taskId, projectId, milestoneId, title, assignedTo |
| TaskCompleted | Task marked done | taskId, projectId, completedBy, notes |
| TimelineUpdated | Schedule changed | projectId, baselineDate, updatedDate, reason |

## Permissions
See PERMISSION_MODEL.md — Project domain matrix.

## Reports
- Project Status Report — current status, milestone progress, team composition
- Milestone Tracking — planned vs actual dates per milestone
- Task Completion — tasks by status, assignee workload
- Timeline Variance — schedule drift analysis

## Dashboards
- **Project Portfolio** — all projects with status indicators (RAG)
- **Project Detail** — Gantt timeline, milestone progress, task board
- **Team Workload** — task assignment distribution across team members

## AI Capabilities
- **Schedule Risk Prediction** (future) — Flag projects at risk of delay based on patterns.
- **Resource Recommendation** (future) — Suggest optimal team composition for project type.

## Integration Points
- **Commercial Domain** — Consumes QuotationAccepted to create projects
- **All Domains** — Project lifecycle events consumed by every domain
- **Knowledge Domain** — ProjectCompleted triggers knowledge extraction

## Future Enhancements
- Gantt chart with drag-and-drop rescheduling.
- Critical path analysis and automated delay alerts.
- Resource leveling across multiple projects.
- Customer-facing project portal.
