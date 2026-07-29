# Database Architecture

## Purpose

This document defines the database architecture for MITRA — schema design, entity relationships, indexing, partitioning, versioning, and migration strategy.

---

## Architecture Principles

1. **Schema-per-domain.** Each bounded context owns its PostgreSQL schema. No cross-schema foreign keys.
2. **UUIDs everywhere.** All primary keys are UUID v4. No auto-increment IDs exposed externally.
3. **Project ID on every row.** Every entity that belongs to a domain carries `project_id` for universal traceability.
4. **Immutable audit trail.** Audit and event tables are append-only. No updates, no deletes.
5. **Soft deletes preferred.** Entity records use `deleted_at` rather than physical deletion.
6. **JSONB for flexibility.** Domain-specific attributes use JSONB columns where the schema may evolve.

---

## Schema Map

```
Database: mitra
├── commercial
├── project
├── engineering
├── manufacturing
├── quality
├── service
├── knowledge
├── security
└── audit
```

---

## Schema: commercial

Owns: CRM, RFQ, Quotation.

```
customers
├── id                  UUID PK
├── project_id          UUID        -- set when quotation is won
├── name                VARCHAR(200)
├── industry            VARCHAR(100)
├── status              VARCHAR(20)  -- active, inactive, lead
├── attributes          JSONB        -- flexible customer attributes
├── created_at          TIMESTAMP
├── updated_at          TIMESTAMP
├── deleted_at          TIMESTAMP    -- soft delete

contacts
├── id                  UUID PK
├── customer_id         UUID FK → customers.id
├── first_name          VARCHAR(100)
├── last_name           VARCHAR(100)
├── email               VARCHAR(200)
├── phone               VARCHAR(50)
├── role                VARCHAR(100)
├── created_at          TIMESTAMP

rfqs
├── id                  UUID PK
├── customer_id         UUID FK → customers.id
├── project_id          UUID        -- set when quotation is won
├── reference_number    VARCHAR(50) UNIQUE
├── status              VARCHAR(30)  -- draft, submitted, under_review, quoted, won, lost
├── specifications      JSONB
├── received_at         TIMESTAMP
├── created_at          TIMESTAMP

quotations
├── id                  UUID PK
├── rfq_id              UUID FK → rfqs.id
├── customer_id         UUID FK → customers.id
├── project_id          UUID        -- set when accepted → project created
├── version             INT
├── status              VARCHAR(30)  -- draft, sent, accepted, rejected, expired
├── amount              DECIMAL(15,2)
├── terms               JSONB
├── valid_until         DATE
├── accepted_at         TIMESTAMP
├── created_at          TIMESTAMP
```

---

## Schema: project

Owns: Projects, Milestones, Tasks, Teams, Timeline.

```
projects
├── id                  UUID PK
├── quotation_id        UUID
├── customer_id         UUID
├── name                VARCHAR(200)
├── status              VARCHAR(30)  -- planning, engineering, manufacturing, trial, dispatch, completed
├── priority            VARCHAR(20)
├── start_date          DATE
├── delivery_date       DATE
├── actual_completion   DATE
├── attributes          JSONB
├── created_at          TIMESTAMP

milestones
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── name                VARCHAR(200)
├── sequence            INT
├── target_date         DATE
├── actual_date         DATE
├── status              VARCHAR(30)  -- pending, in_progress, completed
├── created_at          TIMESTAMP

tasks
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── milestone_id        UUID FK → milestones.id
├── title               VARCHAR(300)
├── description         TEXT
├── assigned_to         UUID
├── status              VARCHAR(30)  -- todo, in_progress, review, done
├── due_date            DATE
├── completed_at        TIMESTAMP
├── created_at          TIMESTAMP

teams
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── name                VARCHAR(100)
├── created_at          TIMESTAMP

team_members
├── id                  UUID PK
├── team_id             UUID FK → teams.id
├── user_id             UUID FK → security.users.id
├── role                VARCHAR(50)  -- lead, engineer, technician, viewer
├── created_at          TIMESTAMP
```

---

## Schema: engineering

Owns: Designs, Drawing Revisions, BOM, Process Plans, Engineering Changes.

```
designs
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── design_number       VARCHAR(50) UNIQUE
├── revision            INT DEFAULT 1
├── status              VARCHAR(30)  -- draft, under_review, approved, superseded
├── cad_file_ref        TEXT         -- MinIO object key
├── metadata            JSONB        -- CAD metadata (format, version, author, etc.)
├── approved_by         UUID
├── approved_at         TIMESTAMP
├── created_at          TIMESTAMP

drawing_revisions
├── id                  UUID PK
├── design_id           UUID FK → designs.id
├── project_id          UUID FK → projects.id
├── revision_number     INT
├── file_ref            TEXT         -- MinIO object key
├── changes             TEXT
├── status              VARCHAR(30)  -- draft, approved, superseded
├── approved_by         UUID
├── created_at          TIMESTAMP

boms
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── design_id           UUID FK → designs.id
├── version             INT
├── status              VARCHAR(30)  -- draft, released, revised
├── created_at          TIMESTAMP

bom_items
├── id                  UUID PK
├── bom_id              UUID FK → boms.id
├── project_id          UUID FK → projects.id
├── parent_item_id      UUID        -- for multi-level BOM
├── part_number         VARCHAR(100)
├── description         TEXT
├── quantity            DECIMAL(10,2)
├── unit                VARCHAR(20)
├── material            VARCHAR(100)
├── specification       JSONB
├── created_at          TIMESTAMP

process_plans
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── bom_id              UUID FK → boms.id
├── version             INT
├── status              VARCHAR(30)
├── created_at          TIMESTAMP

process_operations
├── id                  UUID PK
├── process_plan_id     UUID FK → process_plans.id
├── sequence            INT
├── operation_name      VARCHAR(200)
├── machine_type        VARCHAR(100)
├── estimated_time      INT         -- minutes
├── description         TEXT
├── created_at          TIMESTAMP

engineering_changes
├── id                  UUID PK
├── project_id          UUID FK → projects.id
├── change_number       VARCHAR(50) UNIQUE
├── status              VARCHAR(30)  -- requested, under_review, approved, implemented
├── reason              TEXT
├── affected_entities   JSONB        -- [{type, id, description}]
├── requested_by        UUID
├── approved_by         UUID
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
