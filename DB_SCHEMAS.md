# Database Schemas — Implementation Reference

## Purpose

This document provides the implementation-ready database schema reference for MITRA. Use this as the authoritative source for creating TypeORM entities, writing migrations, and understanding column-level details.

---

## Schema: commercial

### customers
```sql
CREATE SCHEMA IF NOT EXISTS commercial;

CREATE TABLE commercial.customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID,
    name            VARCHAR(200) NOT NULL,
    industry        VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    attributes      JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_customers_name ON commercial.customers USING btree (name);
CREATE INDEX idx_customers_status ON commercial.customers USING btree (status);
```

### contacts
```sql
CREATE TABLE commercial.contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES commercial.customers(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(200),
    phone           VARCHAR(50),
    role            VARCHAR(100),
    is_primary      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contacts_customer ON commercial.contacts USING btree (customer_id);
CREATE UNIQUE INDEX uq_contacts_primary ON commercial.contacts (customer_id) WHERE is_primary = TRUE;
```

### rfqs
```sql
CREATE TABLE commercial.rfqs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES commercial.customers(id),
    project_id      UUID,
    reference_number VARCHAR(50) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    specifications  JSONB DEFAULT '{}',
    received_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_rfqs_ref ON commercial.rfqs (reference_number);
CREATE INDEX idx_rfqs_status ON commercial.rfqs USING btree (status);
```

### quotations
```sql
CREATE TABLE commercial.quotations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id          UUID NOT NULL REFERENCES commercial.rfqs(id),
    customer_id     UUID NOT NULL REFERENCES commercial.customers(id),
    project_id      UUID,
    version         INT NOT NULL DEFAULT 1,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    amount          DECIMAL(15,2),
    terms           JSONB DEFAULT '{}',
    valid_until     DATE,
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quotations_rfq ON commercial.quotations USING btree (rfq_id);
CREATE INDEX idx_quotations_status ON commercial.quotations USING btree (status);
```

---

## Schema: project

### projects
```sql
CREATE SCHEMA IF NOT EXISTS project;

CREATE TABLE project.projects (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id      UUID,
    customer_id       UUID,
    name              VARCHAR(200) NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'planning',
    priority          VARCHAR(20) NOT NULL DEFAULT 'normal',
    start_date        DATE,
    delivery_date     DATE,
    actual_completion DATE,
    attributes        JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_status ON project.projects USING btree (status);
CREATE INDEX idx_projects_customer ON project.projects USING btree (customer_id);
```

### milestones, tasks, teams
```sql
CREATE TABLE project.milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES project.projects(id),
    name            VARCHAR(200) NOT NULL,
    sequence        INT NOT NULL,
    target_date     DATE,
    actual_date     DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_milestones_project ON project.milestones USING btree (project_id, sequence);

CREATE TABLE project.tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES project.projects(id),
    milestone_id    UUID REFERENCES project.milestones(id),
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    assigned_to     UUID,
    status          VARCHAR(30) NOT NULL DEFAULT 'todo',
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_project ON project.tasks USING btree (project_id);
CREATE INDEX idx_tasks_assigned ON project.tasks USING btree (assigned_to);

CREATE TABLE project.teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES project.projects(id),
    name            VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project.team_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES project.teams(id),
    user_id         UUID NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'viewer',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
```

---

## Schema: engineering

### designs
```sql
CREATE SCHEMA IF NOT EXISTS engineering;

CREATE TABLE engineering.designs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    design_number   VARCHAR(50) NOT NULL,
    revision        INT NOT NULL DEFAULT 1,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    cad_file_ref    TEXT,
    metadata        JSONB DEFAULT '{}',
    approved_by     UUID,
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_designs_number ON engineering.designs (design_number);
CREATE INDEX idx_designs_project ON engineering.designs USING btree (project_id, status);

CREATE TABLE engineering.drawing_revisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id       UUID NOT NULL REFERENCES engineering.designs(id),
    project_id      UUID NOT NULL,
    revision_number INT NOT NULL,
    file_ref        TEXT NOT NULL,
    changes         TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    approved_by     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_drawing_revisions_design ON engineering.drawing_revisions USING btree (design_id);
```

### boms, bom_items
```sql
CREATE TABLE engineering.boms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    design_id       UUID REFERENCES engineering.designs(id),
    version         INT NOT NULL DEFAULT 1,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_boms_project ON engineering.boms USING btree (project_id);

CREATE TABLE engineering.bom_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id          UUID NOT NULL REFERENCES engineering.boms(id),
    project_id      UUID NOT NULL,
    parent_item_id  UUID REFERENCES engineering.bom_items(id),
    part_number     VARCHAR(100) NOT NULL,
    description     TEXT,
    quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit            VARCHAR(20) NOT NULL DEFAULT 'pcs',
    material        VARCHAR(100),
    specification   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bom_items_bom ON engineering.bom_items USING btree (bom_id);
```

### process_plans, process_operations
```sql
CREATE TABLE engineering.process_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    bom_id          UUID REFERENCES engineering.boms(id),
    version         INT NOT NULL DEFAULT 1,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE engineering.process_operations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_plan_id UUID NOT NULL REFERENCES engineering.process_plans(id),
    sequence        INT NOT NULL,
    operation_name  VARCHAR(200) NOT NULL,
    machine_type    VARCHAR(100),
    estimated_time  INT,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_process_ops_plan ON engineering.process_operations USING btree (process_plan_id, sequence);
```

### engineering_changes
```sql
CREATE TABLE engineering.engineering_changes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL,
    change_number     VARCHAR(50) NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'requested',
    reason            TEXT NOT NULL,
    affected_entities JSONB DEFAULT '[]',
    requested_by      UUID,
    approved_by       UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_ec_number ON engineering.engineering_changes (change_number);
```

### engineering_decisions
```sql
CREATE TABLE engineering.engineering_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    decision        TEXT NOT NULL,
    rationale       TEXT,
    previous_value  JSONB,
    new_value       JSONB,
    changed_by      UUID NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by     UUID
);
CREATE INDEX idx_eng_decisions_project ON engineering.engineering_decisions USING btree (project_id);
CREATE INDEX idx_eng_decisions_entity ON engineering.engineering_decisions USING btree (entity_type, entity_id);
```

---

## Schema: manufacturing

### machines
```sql
CREATE SCHEMA IF NOT EXISTS manufacturing;

CREATE TABLE manufacturing.machines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_code    VARCHAR(50) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(100),
    specifications  JSONB DEFAULT '{}',
    status          VARCHAR(30) NOT NULL DEFAULT 'available',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_machines_code ON manufacturing.machines (machine_code);
```

### production_plans, work_orders, production_runs
```sql
CREATE TABLE manufacturing.production_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    scheduled_start TIMESTAMPTZ,
    scheduled_end   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE manufacturing.work_orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL,
    production_plan_id UUID REFERENCES manufacturing.production_plans(id),
    bom_item_id       UUID,
    machine_id        UUID REFERENCES manufacturing.machines(id),
    work_order_number VARCHAR(50) NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'pending',
    quantity_planned  INT NOT NULL,
    quantity_produced INT DEFAULT 0,
    quantity_scrapped INT DEFAULT 0,
    scheduled_start   TIMESTAMPTZ,
    scheduled_end     TIMESTAMPTZ,
    actual_start      TIMESTAMPTZ,
    actual_end        TIMESTAMPTZ,
    assigned_operator UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_wo_number ON manufacturing.work_orders (work_order_number);
CREATE INDEX idx_wo_status ON manufacturing.work_orders USING btree (status);
CREATE INDEX idx_wo_machine ON manufacturing.work_orders USING btree (machine_id);

CREATE TABLE manufacturing.production_runs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL,
    work_order_id     UUID NOT NULL REFERENCES manufacturing.work_orders(id),
    start_time        TIMESTAMPTZ NOT NULL,
    end_time          TIMESTAMPTZ,
    quantity_produced INT DEFAULT 0,
    quantity_scrapped INT DEFAULT 0,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_runs_wo ON manufacturing.production_runs USING btree (work_order_id);
```

### trials
```sql
CREATE TABLE manufacturing.trials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    trial_number    INT NOT NULL,
    trial_date      DATE,
    parameters      JSONB DEFAULT '{}',
    result          VARCHAR(30),
    notes           TEXT,
    conducted_by    UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_trials_project ON manufacturing.trials USING btree (project_id);
```

---

## Schema: quality

```sql
CREATE SCHEMA IF NOT EXISTS quality;

CREATE TABLE quality.inspection_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    name            VARCHAR(200) NOT NULL,
    checkpoints     JSONB DEFAULT '[]',
    status          VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quality.inspection_results (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL,
    inspection_plan_id UUID NOT NULL REFERENCES quality.inspection_plans(id),
    work_order_id     UUID,
    measurements      JSONB DEFAULT '[]',
    overall_result    VARCHAR(20) NOT NULL,
    inspector_id      UUID NOT NULL,
    inspected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inspection_results_plan ON quality.inspection_results USING btree (inspection_plan_id);

CREATE TABLE quality.ncrs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL,
    ncr_number          VARCHAR(50) NOT NULL,
    inspection_result_id UUID REFERENCES quality.inspection_results(id),
    defect_type         VARCHAR(100) NOT NULL,
    severity            VARCHAR(20) NOT NULL,
    description         TEXT NOT NULL,
    disposition         VARCHAR(50),
    status              VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_ncr_number ON quality.ncrs (ncr_number);
CREATE INDEX idx_ncrs_severity ON quality.ncrs USING btree (severity);
CREATE INDEX idx_ncrs_status ON quality.ncrs USING btree (status);

CREATE TABLE quality.capas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID NOT NULL,
    capa_number             VARCHAR(50) NOT NULL,
    ncr_id                  UUID REFERENCES quality.ncrs(id),
    root_cause              TEXT NOT NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'initiated',
    effectiveness_verified  BOOLEAN,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_capa_number ON quality.capas (capa_number);

CREATE TABLE quality.capa_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_id         UUID NOT NULL REFERENCES quality.capas(id),
    description     TEXT NOT NULL,
    action_type     VARCHAR(20) NOT NULL DEFAULT 'corrective',
    assigned_to     UUID,
    due_date        DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_capa_actions_capa ON quality.capa_actions USING btree (capa_id);
```

---

## Schema: service

```sql
CREATE SCHEMA IF NOT EXISTS service;

CREATE TABLE service.dispatch_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    dispatch_date   DATE NOT NULL,
    carrier         VARCHAR(100),
    tracking_number VARCHAR(100),
    status          VARCHAR(30) NOT NULL DEFAULT 'prepared',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service.installations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL,
    dispatch_id         UUID REFERENCES service.dispatch_records(id),
    installation_date   DATE,
    checklist           JSONB DEFAULT '[]',
    customer_acceptance BOOLEAN,
    notes               TEXT,
    completed_by        UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service.maintenance_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    maintenance_date DATE NOT NULL,
    type            VARCHAR(30) NOT NULL,
    description     TEXT,
    performed_by    UUID,
    spare_parts_used JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service.service_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    request_number  VARCHAR(50) NOT NULL,
    issue           TEXT NOT NULL,
    priority        VARCHAR(20) NOT NULL DEFAULT 'medium',
    status          VARCHAR(30) NOT NULL DEFAULT 'open',
    resolution      TEXT,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_sr_number ON service.service_requests (request_number);

CREATE TABLE service.warranties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL,
    terms           JSONB DEFAULT '{}',
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service.warranty_claims (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warranty_id     UUID NOT NULL REFERENCES service.warranties(id),
    project_id      UUID NOT NULL,
    description     TEXT NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'submitted',
    decision        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service.spare_parts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_item_id       UUID,
    part_number       VARCHAR(100) NOT NULL,
    description       TEXT,
    quantity_on_hand  INT NOT NULL DEFAULT 0,
    min_stock_level   INT NOT NULL DEFAULT 0,
    unit_price        DECIMAL(10,2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Schema: knowledge & audit

See also: KNOWLEDGE_GRAPH.md and SECURITY_ARCHITECTURE.md for full schemas.

### documents
```sql
CREATE SCHEMA IF NOT EXISTS knowledge;

CREATE TABLE knowledge.documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID,
    domain          VARCHAR(50),
    name            VARCHAR(300) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    file_ref        TEXT NOT NULL,
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    metadata        JSONB DEFAULT '{}',
    version         INT DEFAULT 1,
    status          VARCHAR(30) DEFAULT 'uploaded',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_project ON knowledge.documents USING btree (project_id);
```

### state_transitions (workflow history)
```sql
CREATE TABLE audit.state_transitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    from_state      VARCHAR(50),
    to_state        VARCHAR(50) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    actor_id        UUID NOT NULL,
    reason          TEXT,
    metadata        JSONB DEFAULT '{}',
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_st_domain ON audit.state_transitions USING btree (domain, entity_type, entity_id);
CREATE INDEX idx_st_actor ON audit.state_transitions USING btree (actor_id);
```

---

## TypeORM Entity Decorator Template

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ schema: 'engineering', name: 'designs' })
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @Column({ name: 'design_number', length: 50 })
  designNumber: string;

  @Column({ default: 1 })
  revision: number;

  @Column({ length: 30, default: 'draft' })
  status: string;

  @Column({ name: 'cad_file_ref', type: 'text', nullable: true })
  cadFileRef: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```
