# Database Architecture

## Purpose
This document reflects the database architecture currently implemented for MITRA v3.2.1, including the workflow versioning and migration 0014 hardening that the release certification is validating.

## Architecture principles
1. Domain data remains organized around bounded contexts and is stored in PostgreSQL tables that align to the backend modules.
2. UUID-based identifiers are the default model for the transactional entities used by the backend.
3. Workflow state and instance versioning are explicit and support optimistic locking for concurrent transitions.
4. Audit data remains append-oriented and is not used for runtime state transitions.
5. Migration 0014 strengthens data integrity by enforcing partial uniqueness and null-safe foreign-key behavior where required.

## Current implementation view

### Commercial schema concerns
- Customers, contacts, RFQs, quotations, and acceptance history are modeled around the commercial workflow.
- Quotation acceptance links the accepted quotation to the created project.
- The workflow state and version are stored separately from the business record so transaction boundaries remain explicit.

### Workflow state and locking
- Workflow instances carry a version column that is incremented on successful transition.
- A version mismatch is surfaced as an optimistic-lock conflict and becomes an HTTP 409 response.
- The transaction commits the state change, workflow instance update, audit row, and notification row together.

### Migration 0014 posture
- Migration 0014 is part of the v3.2.1 hardening set.
- It applies data-integrity safeguards such as partial uniqueness and `ON DELETE SET NULL` handling in the affected master-data relationships.

## Database shape summary
```text
PostgreSQL
├── commercial
│   ├── customers
│   ├── contacts
│   ├── rfqs
│   └── quotations
├── project
│   ├── projects
│   ├── milestones
│   ├── tasks
│   └── teams
├── workflow
│   ├── workflow_instances
│   ├── workflow_states
│   └── workflow_transitions
├── audit
│   └── audit_events
└── platform
    └── notifications
```

## Key integrity rules
- Business state changes are not applied through ad-hoc updates; workflow methods own state transitions.
- Audit records are created in the same transaction as the workflow transition to prevent split-brain state.
- Notification rows are written transactionally so they are never emitted for a rolled-back transition.

## Validation checklist for release
- Schema: ready for runtime validation once the PostgreSQL environment is available
- Foreign keys: should be validated against the actual migration output in a live database
- Constraints and indexes: should be validated against the actual migration output in a live database
- Optimistic locking: validated by the workflow unit tests in the backend suite
- Rollback: validated by the workflow and migration regression tests in the backend suite

├── created_at          TIMESTAMP
```

---

## Schema: manufacturing

Owns: Production Plans, Machines, Work Orders, Production Runs, Trials.

```
machines
├── id                  UUID PK
├── project_id          UUID        -- optional, NULL for shared machines
├── machine_code        VARCHAR(50) UNIQUE
├── name                VARCHAR(200)
├── type                VARCHAR(100)
├── specifications      JSONB
├── status              VARCHAR(30)  -- available, busy, maintenance, offline
├── created_at          TIMESTAMP

production_plans
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── status              VARCHAR(30)  -- draft, released, in_progress, completed
├── scheduled_start     TIMESTAMP
├── scheduled_end       TIMESTAMP
├── created_at          TIMESTAMP

work_orders
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── production_plan_id  UUID FK → production_plans.id
├── bom_item_id         UUID
├── machine_id          UUID FK → machines.id
├── work_order_number   VARCHAR(50) UNIQUE
├── status              VARCHAR(30)  -- pending, released, in_progress, completed, cancelled
├── quantity_planned    INT
├── quantity_produced   INT DEFAULT 0
├── quantity_scrapped   INT DEFAULT 0
├── scheduled_start     TIMESTAMP
├── scheduled_end       TIMESTAMP
├── actual_start        TIMESTAMP
├── actual_end          TIMESTAMP
├── assigned_operator   UUID
├── created_at          TIMESTAMP

production_runs
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── work_order_id       UUID FK → work_orders.id
├── start_time          TIMESTAMP
├── end_time            TIMESTAMP
├── quantity_produced   INT
├── quantity_scrapped   INT
├── notes               TEXT
├── created_at          TIMESTAMP

trials
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── trial_number        INT
├── trial_date          DATE
├── parameters          JSONB
├── result              VARCHAR(30)  -- pass, conditional_pass, fail
├── notes               TEXT
├── conducted_by        UUID
├── created_at          TIMESTAMP
```

---

## Schema: quality

Owns: Inspection Plans, Inspection Results, NCRs, CAPAs.

```
inspection_plans
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── name                VARCHAR(200)
├── checkpoints         JSONB        -- [{sequence, parameter, tolerance, method}]
├── status              VARCHAR(30)
├── created_at          TIMESTAMP

inspection_results
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── inspection_plan_id  UUID FK → inspection_plans.id
├── work_order_id       UUID
├── measurements        JSONB        -- [{checkpoint, measuredValue, pass}]
├── overall_result      VARCHAR(20)  -- pass, fail
├── inspector_id        UUID
├── inspected_at        TIMESTAMP
├── created_at          TIMESTAMP

ncrs
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── ncr_number          VARCHAR(50) UNIQUE
├── inspection_result_id UUID FK → inspection_results.id
├── defect_type         VARCHAR(100)
├── severity            VARCHAR(20)  -- minor, major, critical
├── description         TEXT
├── disposition         VARCHAR(50)  -- rework, scrap, use_as_is, return_to_supplier
├── status              VARCHAR(30)  -- open, actioned, closed
├── created_at          TIMESTAMP

capas
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── capa_number         VARCHAR(50) UNIQUE
├── ncr_id              UUID FK → ncrs.id
├── root_cause          TEXT
├── status              VARCHAR(30)  -- initiated, in_progress, verification, closed
├── effectiveness_verified BOOLEAN
├── created_at          TIMESTAMP

capa_actions
├── id                  UUID PK
├── capa_id             UUID FK → capas.id
├── description         TEXT
├── assigned_to         UUID
├── due_date            DATE
├── status              VARCHAR(30)  -- pending, completed
├── completed_at        TIMESTAMP
├── created_at          TIMESTAMP
```

---

## Schema: service

Owns: Dispatch, Installation, Maintenance, Service Requests, Warranty.

```
dispatch_records
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── dispatch_date       DATE
├── carrier             VARCHAR(100)
├── tracking_number     VARCHAR(100)
├── status              VARCHAR(30)  -- prepared, shipped, delivered
├── created_at          TIMESTAMP

installations
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── dispatch_id         UUID FK → dispatch_records.id
├── installation_date   DATE
├── checklist           JSONB
├── customer_acceptance BOOLEAN
├── notes               TEXT
├── completed_by        UUID
├── created_at          TIMESTAMP

maintenance_logs
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── maintenance_date    DATE
├── type                VARCHAR(30)  -- scheduled, corrective, preventive
├── description         TEXT
├── performed_by        UUID
├── spare_parts_used    JSONB
├── created_at          TIMESTAMP

service_requests
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── request_number      VARCHAR(50) UNIQUE
├── issue               TEXT
├── priority            VARCHAR(20)  -- low, medium, high, critical
├── status              VARCHAR(30)  -- open, in_progress, resolved, closed
├── resolution          TEXT
├── resolved_at         TIMESTAMP
├── created_at          TIMESTAMP

warranties
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── terms               JSONB
├── start_date          DATE
├── end_date            DATE
├── created_at          TIMESTAMP

warranty_claims
├── id                  UUID PK
├── warranty_id         UUID FK → warranties.id
├── project_id          UUID FK → projects.id
├── description         TEXT
├── status              VARCHAR(30)  -- submitted, under_review, approved, rejected
├── decision            TEXT
├── created_at          TIMESTAMP
```

---

## Schema: knowledge

Owns: Documents, Knowledge Entries, Knowledge Graph.

```
documents
├── id                  UUID PK
├── project_id          UUID
├── domain              VARCHAR(50)  -- commercial, project, engineering, etc.
├── name                VARCHAR(300)
├── type                VARCHAR(50)  -- drawing, specification, report, photo, etc.
├── file_ref            TEXT         -- MinIO object key
├── file_size           BIGINT
├── mime_type           VARCHAR(100)
├── metadata            JSONB
├── version             INT
├── status              VARCHAR(30)  -- uploaded, indexed, archived
├── created_at          TIMESTAMP

knowledge_entries
├── id                  UUID PK
├── project_id          UUID
├── entry_type          VARCHAR(50)  -- lesson_learned, best_practice, design_rule, etc.
├── title               VARCHAR(300)
├── content             TEXT
├── embedding           VECTOR(1536) -- pgvector embedding
├── source_entity_type  VARCHAR(50)
├── source_entity_id    UUID
├── category            VARCHAR(100)
├── tags               TEXT[]
├── created_at          TIMESTAMP

graph_nodes
├── id                  UUID PK
├── node_type           VARCHAR(50)
├── domain              VARCHAR(50)
├── external_id         UUID         -- reference to source entity
├── label               VARCHAR(300)
├── attributes          JSONB
├── created_at          TIMESTAMP

graph_edges
├── id                  UUID PK
├── source_node_id      UUID FK → graph_nodes.id
├── target_node_id      UUID FK → graph_nodes.id
├── relation_type       VARCHAR(50)
├── weight              DECIMAL(5,2) DEFAULT 1.0
├── metadata            JSONB
├── created_at          TIMESTAMP
```

---

## Schema: security

Owns: Users, Roles, Permissions.

```
users
├── id                  UUID PK
├── email               VARCHAR(200) UNIQUE
├── password_hash       VARCHAR(300)
├── display_name        VARCHAR(200)
├── avatar_ref          TEXT
├── is_active           BOOLEAN DEFAULT TRUE
├── last_login          TIMESTAMP
├── created_at          TIMESTAMP

roles
├── id                  UUID PK
├── name                VARCHAR(50) UNIQUE
├── description         TEXT
├── is_system           BOOLEAN DEFAULT FALSE
├── created_at          TIMESTAMP

user_roles
├── id                  UUID PK
├── user_id             UUID FK → users.id
├── role_id             UUID FK → roles.id
├── scope_project_id    UUID         -- NULL = global, set = project-scoped
├── created_at          TIMESTAMP

permissions
├── id                  UUID PK
├── role_id             UUID FK → roles.id
├── resource            VARCHAR(100) -- e.g., 'project:design', 'quality:ncr'
├── action              VARCHAR(50)  -- create, read, update, delete, approve
├── conditions          JSONB        -- optional attribute-based conditions
├── created_at          TIMESTAMP
```

---

## Schema: audit

Owns: Audit Log (append-only).

```
audit_log
├── id                  UUID PK
├── event_id            UUID         -- reference to event catalog event
├── project_id          UUID
├── domain              VARCHAR(50)
├── entity_type         VARCHAR(50)
├── entity_id           UUID
├── action              VARCHAR(30)  -- CREATE, UPDATE, DELETE, APPROVE, REJECT
├── actor_id            UUID
├── timestamp           TIMESTAMP DEFAULT NOW()
├── ip_address          INET
├── user_agent          TEXT
├── previous_state      JSONB
├── new_state           JSONB
├── metadata            JSONB
```

---

## Indexing Strategy

### Mandatory Indexes (every table)
```sql
CREATE INDEX idx_{table}_project_id ON {schema}.{table} (project_id);
CREATE INDEX idx_{table}_created_at ON {schema}.{table} (created_at);
```

### Domain-Specific Indexes
```sql
-- commercial
CREATE INDEX idx_rfqs_customer_id ON commercial.rfqs (customer_id);
CREATE INDEX idx_rfqs_status ON commercial.rfqs (status);
CREATE INDEX idx_quotations_rfq_id ON commercial.quotations (rfq_id);
CREATE INDEX idx_quotations_status ON commercial.quotations (status);

-- project
CREATE INDEX idx_milestones_project_id ON project.milestones (project_id, sequence);
CREATE INDEX idx_tasks_assigned_to ON project.tasks (assigned_to);
CREATE INDEX idx_tasks_status ON project.tasks (status);

-- engineering
CREATE INDEX idx_designs_project_status ON engineering.designs (project_id, status);
CREATE INDEX idx_bom_items_bom_id ON engineering.bom_items (bom_id);
CREATE INDEX idx_process_operations_plan ON engineering.process_operations (process_plan_id, sequence);

-- manufacturing
CREATE INDEX idx_work_orders_status ON manufacturing.work_orders (status);
CREATE INDEX idx_work_orders_machine ON manufacturing.work_orders (machine_id);
CREATE INDEX idx_production_runs_work_order ON manufacturing.production_runs (work_order_id);

-- quality
CREATE INDEX idx_ncrs_severity ON quality.ncrs (severity);
CREATE INDEX idx_capas_status ON quality.capas (status);

-- service
CREATE INDEX idx_service_requests_status ON quality.service_requests (status);

-- knowledge
CREATE INDEX idx_knowledge_entries_category ON knowledge.knowledge_entries (category);
-- pgvector index for similarity search
CREATE INDEX idx_knowledge_entries_embedding ON knowledge.knowledge_entries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Partitioning Strategy

### audit_log — Time-based partitioning
```sql
CREATE TABLE audit.audit_log (
  id UUID, timestamp TIMESTAMP, ...
) PARTITION BY RANGE (timestamp);

-- Monthly partitions
CREATE TABLE audit.audit_log_2026_07
  PARTITION OF audit.audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

### knowledge_entries — Category-based partitioning
```sql
CREATE TABLE knowledge.knowledge_entries (
  id UUID, category VARCHAR, ...
) PARTITION BY LIST (category);

CREATE TABLE knowledge.knowledge_entries_design
  PARTITION OF knowledge.knowledge_entries
  FOR VALUES IN ('design_rule', 'design_pattern');
```

---

## Migration Strategy

- **Tool:** TypeORM migrations (NestJS integration).
- **Naming:** `{YYYYMMDDHHMMSS}_{description}.ts`
- **Per-schema migrations:** Each schema has its own migration directory.
- **Guidelines:**
  - Migrations are additive only (no destructive changes without a separate data migration).
  - Rollbacks are defined for every migration.
  - Data migrations are separate from schema migrations.
  - Migrations run in transaction blocks where possible.
  - Always backup before running migrations in production.

---

## v3.2.1 Addendum — Data Integrity Remediation (migration 0014)

Migration `1700000000014-DataIntegrityRemediation.ts` shipped in v3.2.1:

1. **`workflow_instances.version`** — integer `NOT NULL DEFAULT 1`, backing
   TypeORM `@VersionColumn` optimistic locking (ADR-002). Version conflicts
   surface as HTTP 409 via `OptimisticLockVersionMismatchErrorFilter`
   (`src/common/filters/`).
2. **Full UNIQUE → partial unique indexes** on soft-delete-aware business
   keys (`WHERE deleted_at IS NULL AND <col> IS NOT NULL`):

   | Table | Column | Index |
   |---|---|---|
   | `customers` | `code` | `uq_customers_code_active` |
   | `leads` | `lead_number` | `uq_leads_lead_number_active` |
   | `rfqs` | `rfq_number` | `uq_rfqs_rfq_number_active` |
   | `customer_types` | `code` | `uq_customer_types_code_active` |
   | `customer_categories` | `code` | `uq_customer_categories_code_active` |

3. **Referential integrity** — FK `ON DELETE SET NULL`:

   | Constraint | Table | Column → References |
   |---|---|---|
   | `fk_leads_contact` | `leads` | `contact_id` → `contacts(id)` |
   | `fk_leads_owner` | `leads` | `owner_id` → `users(id)` |
   | `fk_leads_converted_customer` | `leads` | `converted_customer_id` → `customers(id)` |
   | `fk_rfqs_enquiry` | `rfqs` | `enquiry_id` → `enquiries(id)` |
   | `fk_rfqs_contact` | `rfqs` | `contact_id` → `contacts(id)` |

4. **Query indexes**: `IDX_rfqs_enquiry` (`rfqs.enquiry_id`),
   `IDX_customer_activities_reference` (`customer_activities.reference_type,
   reference_id`).

Rollback: `down()` reverses everything (see
`docs/guides/Migration_0014_Guide.md`). Structural up/down behavior is tested
by `mitra-backend/src/test/migration-0014.spec.ts`.

### Integrity guarantees (v3.2.1)

- Active master-data keys are unique at the DB level (defense in depth behind
  service checks).
- Deleting a contact/owner/enquiry nulls dependent references instead of
  orphaning or failing.
- Workflow instance writes are conflict-detected (version) and transactional
  (state + audit + notification commit together, ADR-006).

## v3.3 Addendum — Project Management Domain (migration 0015)

Migration `1700000000015-ProjectManagementDomain.ts` shipped in v3.3
(Sprint 2.2, ADR-009):

### New tables (all VARCHAR enum fields, `IndustrialBaseEntity` tenant scoping)

| Table | Purpose |
|---|---|
| `project_teams` | Teams per project (name, department, description) |
| `project_team_members` | Member ↔ team link with role + capacity_pct |
| `project_milestones` | Template-derived milestones (planned/actual dates, delay days, approvals) |
| `project_tasks` | Tasks with status/priority/dates/hours/progress, assignee, milestone link |
| `project_task_dependencies` | Task dependency edges (soft-delete aware) |
| `project_task_activity` | Per-task comments/attachments/status notes |
| `project_risks` | Likelihood × impact → exposure score (clamped 1–25) |
| `project_documents` | Documents with status + current version link |
| `project_document_versions` | Immutable released versions (major.minor, checksum, release notes) |
| `project_activity_log` | Domain-wide business-event audit feed |

### Extended table
- `projects`: `planned_start_date`, `target_delivery_date`, `overall_progress`,
  `health_status`, `budget`, `priority`, `risk_level`, `business_unit`,
  `manager_id` (nullable FK), workflow-created columns for the
  `project_management` lifecycle.

### Seeds embedded in the migration
- `project_management` workflow: 9 states (`a0000000-…-0001..0009`: DRAFT,
  KICKOFF, DESIGN, PLANNING, EXECUTION, MONITORING, CLOSING, COMPLETED,
  ARCHIVED) and 8 transitions (`b0000000-…-0001..0008`).
- DEFAULT_MOLD milestone template: 10 items (`c0000000-…-100..110`, day
  offsets 0/14/30/45/60/75/85/90/95/110).
- 8 departments (`d0000000-…-0001..0008`): MANAGEMENT, SALES, DESIGN,
  PLANNING, PROCUREMENT, PRODUCTION, QUALITY, SERVICE.

### Notes
- `seed.ts` re-provisions the same workflow/template/departments by
  `(stateCode, workflowType)` / `code`, so migration-seeded fixed-UUID rows
  win on databases where both run.
- The factory reads the DEFAULT_MOLD template with a 3-condition fallback
  (`tenant_id IS NULL` / matching tenant / any) so tenant-seeded copies are
  always found.
- Rollback `down()` drops the new tables and restores `projects` columns.

## Sprint 2.5 QMS Schema Addendum

Migration `1700000000020-QmsFoundation` adds the Enterprise QMS persistence layer:

- `inspection_plans`
- `supplier_inspections`
- `quality_control_plans`
- `quality_fmeas`
- `quality_gauges`
- `quality_msa_studies`
- `quality_ppap_apqp`
- `quality_customer_complaints`

It also extends existing `capa_verifications` and `ncr_records` with nullable genealogy anchors. These columns reference Engineering and Manufacturing artifacts by UUID and do not duplicate artifact payloads.

