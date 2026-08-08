import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// MITRA v3.3 — Sprint 2.2: Project Management Domain
//
// Extends `projects` and adds the full PM data model:
//   • Milestone templates (configurable, default 10-milestone template)
//   • Tasks + dependencies + comments + attachments (Gantt-ready)
//   • Teams + members + departments (capacity/availability)
//   • Risk register
//   • Versioned project documents + default folder structure
//   • Activity log
//   • Database-driven `project_management` workflow (DRAFT → … → ARCHIVED)
//   • RBAC permissions for risk / document / activity / milestone approval
// ─────────────────────────────────────────────────────────────────────────────

export class ProjectManagementDomain1700000000015 implements MigrationInterface {
  name = 'ProjectManagementDomain1700000000015';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extend projects ────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "project_type" VARCHAR(50) NOT NULL DEFAULT 'NEW_DEVELOPMENT',
        ADD COLUMN IF NOT EXISTS "business_unit" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "start_date" DATE,
        ADD COLUMN IF NOT EXISTS "planned_end_date" DATE,
        ADD COLUMN IF NOT EXISTS "actual_end_date" DATE,
        ADD COLUMN IF NOT EXISTS "budget" NUMERIC(18,2),
        ADD COLUMN IF NOT EXISTS "risk_level" VARCHAR(20) NOT NULL DEFAULT 'LOW',
        ADD COLUMN IF NOT EXISTS "quotation_id" UUID,
        ADD COLUMN IF NOT EXISTS "quotation_number" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        ADD COLUMN IF NOT EXISTS "workflow_instance_id" UUID
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_projects_status" ON "projects" ("status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_projects_quotation_id" ON "projects" ("quotation_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_projects_planned_end" ON "projects" ("planned_end_date", "deleted_at")`);

    // ── Extend project_milestones ──────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "project_milestones"
        ADD COLUMN IF NOT EXISTS "template_item_id" UUID,
        ADD COLUMN IF NOT EXISTS "depends_on_milestone_id" UUID,
        ADD COLUMN IF NOT EXISTS "requires_approval" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "approved_by" UUID,
        ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "delay_days" INT NOT NULL DEFAULT 0
    `);

    // ── milestone_templates ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "milestone_templates" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_milestone_templates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_milestone_templates_code_tenant" UNIQUE ("code", "tenant_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_milestone_templates_code" ON "milestone_templates" ("code", "deleted_at")`);

    // ── milestone_template_items ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "milestone_template_items" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "template_id" UUID NOT NULL,
        "milestone_name" VARCHAR(200) NOT NULL,
        "milestone_stage" VARCHAR(50) NOT NULL,
        "sequence_number" INT NOT NULL DEFAULT 1,
        "planned_days_offset" INT NOT NULL DEFAULT 0,
        "depends_on_sequence" INT,
        "is_critical_path" BOOLEAN NOT NULL DEFAULT false,
        "default_owner_role" VARCHAR(50),
        "requires_approval" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_milestone_template_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_milestone_template_items_template" FOREIGN KEY ("template_id")
          REFERENCES "milestone_templates" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mti_template_seq" ON "milestone_template_items" ("template_id", "sequence_number")`);

    // ── project_risks ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_risks" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "project_id" UUID NOT NULL,
        "title" VARCHAR(300) NOT NULL,
        "description" TEXT,
        "category" VARCHAR(50) NOT NULL DEFAULT 'OTHER',
        "impact" INT NOT NULL DEFAULT 1,
        "probability" INT NOT NULL DEFAULT 1,
        "exposure" INT NOT NULL DEFAULT 1,
        "mitigation" TEXT,
        "contingency" TEXT,
        "owner_id" UUID,
        "owner_name" VARCHAR(200),
        "review_date" DATE,
        "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        "raised_by" UUID,
        "raised_by_name" VARCHAR(200),
        "closed_at" TIMESTAMPTZ,
        CONSTRAINT "PK_project_risks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_risks_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_risks_project" ON "project_risks" ("project_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_risks_status" ON "project_risks" ("status", "deleted_at")`);

    // ── project_tasks ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_tasks" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "project_id" UUID NOT NULL,
        "parent_task_id" UUID,
        "milestone_id" UUID,
        "title" VARCHAR(300) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(20) NOT NULL DEFAULT 'TODO',
        "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        "assignee_id" UUID,
        "assignee_name" VARCHAR(200),
        "start_date" DATE,
        "due_date" DATE,
        "estimated_hours" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "actual_hours" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "progress_pct" INT NOT NULL DEFAULT 0,
        "sort_order" INT NOT NULL DEFAULT 0,
        "completed_at" TIMESTAMPTZ,
        CONSTRAINT "PK_project_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_tasks_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_tasks_project" ON "project_tasks" ("project_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_tasks_assignee" ON "project_tasks" ("assignee_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_tasks_status" ON "project_tasks" ("status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_tasks_milestone" ON "project_tasks" ("milestone_id")`);

    // ── task_dependencies ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_dependencies" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "task_id" UUID NOT NULL,
        "depends_on_task_id" UUID NOT NULL,
        "dependency_type" VARCHAR(20) NOT NULL DEFAULT 'FINISH_TO_START',
        CONSTRAINT "PK_task_dependencies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_dependencies_task" FOREIGN KEY ("task_id")
          REFERENCES "project_tasks" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_dependencies_depends" FOREIGN KEY ("depends_on_task_id")
          REFERENCES "project_tasks" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_task_dependencies_pair" UNIQUE ("task_id", "depends_on_task_id", "dependency_type")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_dependencies_task" ON "task_dependencies" ("task_id", "deleted_at")`);

    // ── task_comments ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_comments" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "task_id" UUID NOT NULL,
        "author_id" UUID,
        "author_name" VARCHAR(200),
        "body" TEXT NOT NULL,
        CONSTRAINT "PK_task_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_comments_task" FOREIGN KEY ("task_id")
          REFERENCES "project_tasks" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_comments_task" ON "task_comments" ("task_id", "deleted_at")`);

    // ── task_attachments ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_attachments" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "task_id" UUID NOT NULL,
        "file_name" VARCHAR(300) NOT NULL,
        "file_path" VARCHAR(500) NOT NULL,
        "mime_type" VARCHAR(100),
        "file_size" INT NOT NULL DEFAULT 0,
        "uploaded_by" UUID,
        "uploaded_by_name" VARCHAR(200),
        CONSTRAINT "PK_task_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_attachments_task" FOREIGN KEY ("task_id")
          REFERENCES "project_tasks" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_attachments_task" ON "task_attachments" ("task_id", "deleted_at")`);

    // ── departments ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_departments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_departments_code_tenant" UNIQUE ("code", "tenant_id")
      )
    `);

    // ── project_teams ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_teams" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "project_id" UUID NOT NULL,
        "team_name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "lead_user_id" UUID,
        "lead_user_name" VARCHAR(200),
        CONSTRAINT "PK_project_teams" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_teams_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_teams_project" ON "project_teams" ("project_id", "deleted_at")`);

    // ── project_team_members ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_team_members" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "team_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "user_id" UUID,
        "user_name" VARCHAR(200) NOT NULL,
        "role" VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
        "department" VARCHAR(50),
        "department_name" VARCHAR(200),
        "skills" JSONB,
        "capacity_pct" INT NOT NULL DEFAULT 100,
        "start_date" DATE,
        "end_date" DATE,
        "is_lead" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_project_team_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_team_members_team" FOREIGN KEY ("team_id")
          REFERENCES "project_teams" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_team_members_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_team_members_team" ON "project_team_members" ("team_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_team_members_user" ON "project_team_members" ("user_id", "deleted_at")`);

    // ── project_folders (default folder structure per project) ─────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_folders" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "project_id" UUID NOT NULL,
        "parent_folder_id" UUID,
        "folder_name" VARCHAR(200) NOT NULL,
        "folder_path" VARCHAR(500) NOT NULL,
        "sequence" INT NOT NULL DEFAULT 0,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_project_folders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_folders_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_folders_project" ON "project_folders" ("project_id", "deleted_at")`);

    // ── project_documents ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_documents" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "project_id" UUID NOT NULL,
        "folder_id" UUID,
        "document_type" VARCHAR(30) NOT NULL DEFAULT 'OTHER',
        "title" VARCHAR(300) NOT NULL,
        "description" TEXT,
        "file_name" VARCHAR(300) NOT NULL,
        "mime_type" VARCHAR(100),
        "file_size" INT NOT NULL DEFAULT 0,
        "current_version" INT NOT NULL DEFAULT 1,
        "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        "is_latest" BOOLEAN NOT NULL DEFAULT true,
        "released_by" UUID,
        "released_at" TIMESTAMPTZ,
        CONSTRAINT "PK_project_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_documents_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_documents_folder" FOREIGN KEY ("folder_id")
          REFERENCES "project_folders" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_documents_project" ON "project_documents" ("project_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_documents_folder" ON "project_documents" ("folder_id", "deleted_at")`);

    // ── project_document_versions ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_document_versions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "document_id" UUID NOT NULL,
        "version_number" INT NOT NULL,
        "file_name" VARCHAR(300) NOT NULL,
        "file_path" VARCHAR(500) NOT NULL,
        "mime_type" VARCHAR(100),
        "file_size" INT NOT NULL DEFAULT 0,
        "uploaded_by" UUID,
        "notes" TEXT,
        "checksum" VARCHAR(64),
        CONSTRAINT "PK_project_document_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pdv_document" FOREIGN KEY ("document_id")
          REFERENCES "project_documents" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_pdv_document_version" UNIQUE ("document_id", "version_number")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pdv_document" ON "project_document_versions" ("document_id", "deleted_at")`);

    // ── project_activity_logs ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_activity_logs" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "project_id" UUID NOT NULL,
        "activity_type" VARCHAR(50) NOT NULL,
        "title" VARCHAR(300) NOT NULL,
        "description" TEXT,
        "actor_id" UUID,
        "actor_name" VARCHAR(200),
        "metadata" JSONB,
        "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_activity_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_activity_logs_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_activity_logs_project" ON "project_activity_logs" ("project_id", "occurred_at")`);

    // ── Seed: project_management workflow (system default, tenant = NULL) ──
    // Canonical 9-state graph (DRAFT → KICKOFF → DESIGN → PLANNING → EXECUTION
    // → MONITORING → CLOSING → COMPLETED → ARCHIVED), matching seed.ts and
    // ADR-009. Migration 0016 realigns databases that already applied an
    // earlier (ENGINEERING-based) draft of this graph.
    await queryRunner.query(`
      INSERT INTO "workflow_states" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "name", "state_code", "description", "category", "workflow_type", "is_initial", "is_final", "sort_order", "color", "icon")
      VALUES
        ('a0000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, NULL, 'Draft', 'DRAFT', 'Project drafted', 'PLANNING', 'project_management', TRUE, FALSE, 1, '#6B7280', NULL),
        ('a0000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, NULL, 'Kickoff', 'KICKOFF', 'Project kickoff', 'PLANNING', 'project_management', FALSE, FALSE, 2, '#3B82F6', NULL),
        ('a0000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, NULL, 'Design', 'DESIGN', 'Design phase', 'DESIGN', 'project_management', FALSE, FALSE, 3, '#8B5CF6', NULL),
        ('a0000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, NULL, 'Planning', 'PLANNING', 'Planning phase', 'PLANNING', 'project_management', FALSE, FALSE, 4, '#14B8A6', NULL),
        ('a0000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, NULL, 'Execution', 'EXECUTION', 'Execution phase', 'EXECUTION', 'project_management', FALSE, FALSE, 5, '#F59E0B', NULL),
        ('a0000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, NULL, 'Monitoring', 'MONITORING', 'Monitoring phase', 'MONITORING', 'project_management', FALSE, FALSE, 6, '#0EA5E9', NULL),
        ('a0000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, NULL, 'Closing', 'CLOSING', 'Closing phase', 'CLOSING', 'project_management', FALSE, FALSE, 7, '#6366F1', NULL),
        ('a0000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, NULL, 'Completed', 'COMPLETED', 'Project completed', 'CLOSED', 'project_management', FALSE, TRUE, 8, '#10B981', NULL),
        ('a0000000-0000-4000-8000-000000000009', now(), now(), NULL, NULL, NULL, NULL, 'Archived', 'ARCHIVED', 'Project archived', 'CLOSED', 'project_management', FALSE, TRUE, 9, '#9CA3AF', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "workflow_transitions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "from_state_id", "to_state_id", "name", "description", "workflow_type", "required_roles", "required_permissions", "conditions", "requires_approval", "approval_roles", "is_active")
      VALUES
        ('b0000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, NULL, 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Start Kickoff', 'Move project into kickoff', 'project_management', NULL, ARRAY['project:transition'], NULL, FALSE, NULL, TRUE),
        ('b0000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, NULL, 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'Proceed to Design', 'Move project into design', 'project_management', NULL, ARRAY['project:transition'], NULL, FALSE, NULL, TRUE),
        ('b0000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, NULL, 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'Proceed to Planning', 'Move project into planning', 'project_management', NULL, ARRAY['project:transition'], NULL, FALSE, NULL, TRUE),
        ('b0000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, NULL, 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', 'Start Execution', 'Move project into execution', 'project_management', NULL, ARRAY['project:transition'], NULL, FALSE, NULL, TRUE),
        ('b0000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, NULL, 'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006', 'Move to Monitoring', 'Move project into monitoring', 'project_management', NULL, ARRAY['project:transition'], NULL, FALSE, NULL, TRUE),
        ('b0000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, NULL, 'a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007', 'Start Closing', 'Move project into closing', 'project_management', NULL, ARRAY['project:transition'], NULL, FALSE, NULL, TRUE),
        ('b0000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, NULL, 'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000008', 'Complete Project', 'Mark project as completed', 'project_management', NULL, ARRAY['project:transition'], NULL, FALSE, NULL, TRUE),
        ('b0000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, NULL, 'a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000009', 'Archive Project', 'Archive completed project', 'project_management', NULL, ARRAY['project:transition'], NULL, FALSE, NULL, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ── Seed: default milestone template (10 milestones) ───────────────────
    await queryRunner.query(`
      INSERT INTO "milestone_templates" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "code", "name", "description", "is_active", "is_default")
      VALUES ('c0000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, NULL,
        'DEFAULT_MOLD', 'Default Mold Development', 'Standard 10-milestone mold development lifecycle', TRUE, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "milestone_template_items" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "template_id", "milestone_name", "milestone_stage", "sequence_number", "planned_days_offset", "depends_on_sequence", "is_critical_path", "default_owner_role", "requires_approval")
      VALUES
        ('c0000000-0000-4000-8000-000000000101', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Kickoff',              'KICKOFF',              1,  0,  NULL, TRUE,  'MANAGEMENT', FALSE),
        ('c0000000-0000-4000-8000-000000000102', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Design',               'DESIGN',               2, 14,  1, TRUE,  'DESIGN',     FALSE),
        ('c0000000-0000-4000-8000-000000000103', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'BOM',                  'BOM',                  3, 30,  2, TRUE,  'DESIGN',     FALSE),
        ('c0000000-0000-4000-8000-000000000104', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Procurement',          'PROCUREMENT',          4, 45,  3, TRUE,  'PRODUCTION', FALSE),
        ('c0000000-0000-4000-8000-000000000105', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Manufacturing',        'MANUFACTURING',        5, 60,  4, TRUE,  'PRODUCTION', FALSE),
        ('c0000000-0000-4000-8000-000000000106', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Assembly',             'ASSEMBLY',             6, 75,  5, TRUE,  'PRODUCTION', FALSE),
        ('c0000000-0000-4000-8000-000000000107', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Trial',                'TRIAL',                7, 85,  6, TRUE,  'QUALITY',    FALSE),
        ('c0000000-0000-4000-8000-000000000108', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Inspection',           'INSPECTION',           8, 90,  7, TRUE,  'QUALITY',    FALSE),
        ('c0000000-0000-4000-8000-000000000109', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Dispatch',             'DISPATCH',             9, 95,  8, TRUE,  'MANAGEMENT', FALSE),
        ('c0000000-0000-4000-8000-000000000110', now(), now(), NULL, NULL, NULL, NULL, 'c0000000-0000-4000-8000-000000000001', 'Customer Acceptance',  'CUSTOMER_ACCEPTANCE', 10, 110, 9, TRUE,  'MANAGEMENT', TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ── Seed: departments ──────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "departments" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "code", "name", "description", "is_active")
      VALUES
        ('d0000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, NULL, 'MANAGEMENT', 'Management', 'Project and portfolio management', TRUE),
        ('d0000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, NULL, 'SALES',      'Sales', 'Commercial and sales', TRUE),
        ('d0000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, NULL, 'DESIGN',     'Design Engineering', 'Mold design and engineering', TRUE),
        ('d0000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, NULL, 'PLANNING',   'Process Planning', 'Process and machine planning', TRUE),
        ('d0000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, NULL, 'PROCUREMENT','Procurement', 'Material and vendor procurement', TRUE),
        ('d0000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, NULL, 'PRODUCTION', 'Production', 'Manufacturing and assembly', TRUE),
        ('d0000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, NULL, 'QUALITY',    'Quality', 'Inspection and quality assurance', TRUE),
        ('d0000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, NULL, 'SERVICE',    'Service', 'Installation and after-sales service', TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ── RBAC: permissions for risk / document / activity / milestone ──────
    const permissions: { resource: string; action: string }[] = [
      { resource: 'project:risk', action: 'create' },
      { resource: 'project:risk', action: 'read' },
      { resource: 'project:risk', action: 'update' },
      { resource: 'project:risk', action: 'delete' },
      { resource: 'project:document', action: 'create' },
      { resource: 'project:document', action: 'read' },
      { resource: 'project:document', action: 'update' },
      { resource: 'project:document', action: 'delete' },
      { resource: 'project:activity', action: 'read' },
      { resource: 'project:milestone', action: 'approve' },
      { resource: 'project:risk', action: 'close' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [p.resource, p.action],
      );
    }

    // Grant to uppercase runtime roles (seeded by seed.ts)
    const upperMatrix: Record<string, string[]> = {
      ADMIN: [
        'project:risk:create', 'project:risk:read', 'project:risk:update', 'project:risk:delete', 'project:risk:close',
        'project:document:create', 'project:document:read', 'project:document:update', 'project:document:delete',
        'project:activity:read', 'project:milestone:approve',
      ],
      MANAGEMENT: [
        'project:risk:create', 'project:risk:read', 'project:risk:update', 'project:risk:delete', 'project:risk:close',
        'project:document:create', 'project:document:read', 'project:document:update', 'project:document:delete',
        'project:activity:read', 'project:milestone:approve',
      ],
      SALES: ['project:risk:read', 'project:document:create', 'project:document:read', 'project:activity:read'],
      DESIGN: ['project:risk:create', 'project:risk:read', 'project:risk:update', 'project:document:create', 'project:document:read', 'project:activity:read'],
      PLANNING: ['project:risk:create', 'project:risk:read', 'project:risk:update', 'project:document:create', 'project:document:read', 'project:activity:read'],
      PRODUCTION: ['project:risk:create', 'project:risk:read', 'project:risk:update', 'project:document:read', 'project:activity:read'],
      QUALITY: ['project:risk:create', 'project:risk:read', 'project:risk:update', 'project:document:create', 'project:document:read', 'project:activity:read'],
      CUSTOMER: ['project:risk:read', 'project:document:read', 'project:activity:read'],
    };

    // Grant to lowercase system roles (seeded by migration 0010)
    const lowerMatrix: Record<string, string[]> = {
      admin: upperMatrix.ADMIN,
      manager: upperMatrix.MANAGEMENT,
      sales_rep: upperMatrix.SALES,
      project_lead: upperMatrix.MANAGEMENT,
      engineer: upperMatrix.DESIGN,
      production_planner: upperMatrix.PLANNING,
      operator: ['project:risk:read', 'project:activity:read'],
      qa_inspector: ['project:risk:read', 'project:activity:read'],
      qa_engineer: upperMatrix.QUALITY,
      service_tech: ['project:risk:read', 'project:activity:read'],
      viewer: ['project:risk:read', 'project:document:read', 'project:activity:read'],
    };

    const grant = async (roleName: string, permKeys: string[]) => {
      for (const permKey of permKeys) {
        const idx = permKey.indexOf(':');
        const resource = permKey.slice(0, idx);
        const action = permKey.slice(idx + 1);
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id
           FROM roles r, permissions p
           WHERE r.name = $1 AND p.resource = $2 AND p.action = $3
           ON CONFLICT DO NOTHING`,
          [roleName, resource, action],
        );
      }
    };

    for (const [roleName, permKeys] of Object.entries(upperMatrix)) {
      await grant(roleName, permKeys);
    }
    for (const [roleName, permKeys] of Object.entries(lowerMatrix)) {
      await grant(roleName, permKeys);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_activity_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_document_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_folders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_team_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_teams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_dependencies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_tasks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_risks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "milestone_template_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "milestone_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_transitions" WHERE "workflow_type" = 'project_management'`);
    await queryRunner.query(`DELETE FROM "workflow_states" WHERE "workflow_type" = 'project_management'`);
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN IF EXISTS "project_type", DROP COLUMN IF EXISTS "business_unit",
        DROP COLUMN IF EXISTS "start_date", DROP COLUMN IF EXISTS "planned_end_date",
        DROP COLUMN IF EXISTS "actual_end_date", DROP COLUMN IF EXISTS "budget",
        DROP COLUMN IF EXISTS "risk_level", DROP COLUMN IF EXISTS "quotation_id",
        DROP COLUMN IF EXISTS "quotation_number", DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "workflow_instance_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "project_milestones"
        DROP COLUMN IF EXISTS "template_item_id", DROP COLUMN IF EXISTS "depends_on_milestone_id",
        DROP COLUMN IF EXISTS "requires_approval", DROP COLUMN IF EXISTS "approved_by",
        DROP COLUMN IF EXISTS "approved_at", DROP COLUMN IF EXISTS "delay_days"
    `);
  }
}
