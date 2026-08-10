import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// MITRA v3.4 — Sprint 2.3: Engineering Domain
//
// Implements the complete Engineering Domain bridging Projects → Manufacturing:
//   • Engineering drawings + versioned revisions (check-in/check-out, CAD
//     metadata, approval) with DB-driven `engineering_drawing` workflow
//   • Multi-level BOMs + items + immutable revision snapshots with DB-driven
//     `engineering_bom` workflow (effective dates, substitutes/alternates)
//   • Process Planning: routings, operations (cycle/setup/standard time,
//     tool + material requirements), work centers (machines referenced from
//     machine_masters) with DB-driven `engineering_routing` workflow
//   • Material Library (grades, standards, density, cost, suppliers,
//     mechanical/thermal properties)
//   • Component Library (standard/purchased/manufactured, vendor mapping,
//     alternates)
//   • Engineering Reviews (assignments, comments, markups, decisions)
//   • Versioned Engineering Documents (CAD, PDF, specs, standards,
//     calculations, images, simulation results)
//   • Engineering Change Management extension (ECR/ECO workflow columns,
//     ECN + impact analysis) with DB-driven `engineering_change` workflow
//   • AI-readiness hook registry (no inference — prepared integration points)
//   • RBAC permissions for every engineering capability
// ─────────────────────────────────────────────────────────────────────────────

export class EngineeringDomain1700000000017 implements MigrationInterface {
  name = 'EngineeringDomain1700000000017';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── engineering_work_centers ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_work_centers" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "description" VARCHAR(500),
        "location" VARCHAR(100),
        "work_center_type" VARCHAR(30) NOT NULL DEFAULT 'MACHINING',
        "cost_per_hour" NUMERIC(10,2),
        "capacity_hours_per_day" NUMERIC(8,2) NOT NULL DEFAULT 8,
        "machine_ids" JSONB,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "notes" TEXT,
        CONSTRAINT "PK_engineering_work_centers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_work_centers_code" ON "engineering_work_centers" ("code", "deleted_at")`);

    // ── engineering_materials ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_materials" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "material_code" VARCHAR(50) NOT NULL,
        "material_name" VARCHAR(200) NOT NULL,
        "category" VARCHAR(50) NOT NULL DEFAULT 'STEEL',
        "grade" VARCHAR(100),
        "standard" VARCHAR(100),
        "density" NUMERIC(10,4),
        "unit_cost" NUMERIC(18,4),
        "cost_currency" VARCHAR(10),
        "supplier_ids" JSONB,
        "preferred_supplier_id" UUID,
        "preferred_supplier_name" VARCHAR(200),
        "mechanical_properties" JSONB,
        "thermal_properties" JSONB,
        "available_sizes" JSONB,
        "lead_time_days" INT,
        "moq" INT,
        "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        "notes" TEXT,
        CONSTRAINT "PK_engineering_materials" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_materials_code" ON "engineering_materials" ("material_code", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_materials_category" ON "engineering_materials" ("category", "deleted_at")`);

    // ── engineering_components ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_components" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "component_code" VARCHAR(50) NOT NULL,
        "component_name" VARCHAR(200) NOT NULL,
        "component_type" VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
        "category" VARCHAR(100),
        "manufacturer" VARCHAR(200),
        "model_number" VARCHAR(100),
        "unit_of_measure" VARCHAR(20) NOT NULL DEFAULT 'EA',
        "unit_cost" NUMERIC(18,4),
        "cost_currency" VARCHAR(10),
        "vendor_mapping" JSONB,
        "drawing_ids" JSONB,
        "specification" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "notes" TEXT,
        CONSTRAINT "PK_engineering_components" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_components_code" ON "engineering_components" ("component_code", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_components_type" ON "engineering_components" ("component_type", "deleted_at")`);

    // ── engineering_component_alternates ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_component_alternates" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "component_id" UUID NOT NULL,
        "alternate_component_id" UUID NOT NULL,
        "relation_type" VARCHAR(20) NOT NULL DEFAULT 'SUBSTITUTE',
        "notes" TEXT,
        CONSTRAINT "PK_engineering_component_alternates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_alt_component" FOREIGN KEY ("component_id")
          REFERENCES "engineering_components" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_eng_alt_alternate" FOREIGN KEY ("alternate_component_id")
          REFERENCES "engineering_components" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_eng_alt_pair" UNIQUE ("component_id", "alternate_component_id", "relation_type")
      )
    `);

    // ── engineering_drawings ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_drawings" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "drawing_number" VARCHAR(30) NOT NULL,
        "title" VARCHAR(300) NOT NULL,
        "drawing_type" VARCHAR(30) NOT NULL DEFAULT 'PART',
        "project_id" UUID NOT NULL,
        "bom_id" UUID,
        "part_id" UUID,
        "part_number" VARCHAR(50),
        "current_revision" VARCHAR(10) NOT NULL DEFAULT 'A',
        "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        "workflow_instance_id" UUID,
        "checked_out_by" UUID,
        "checked_out_by_name" VARCHAR(200),
        "checked_out_at" TIMESTAMPTZ,
        "cad_file_type" VARCHAR(30),
        "cad_app_name" VARCHAR(100),
        "cad_app_version" VARCHAR(50),
        "file_size_bytes" BIGINT NOT NULL DEFAULT 0,
        "last_file_checksum" VARCHAR(64),
        "length_mm" NUMERIC(10,2),
        "width_mm" NUMERIC(10,2),
        "height_mm" NUMERIC(10,2),
        "drawing_scale" VARCHAR(20),
        "sheet_number" VARCHAR(20),
        "sheet_size" VARCHAR(20),
        "weight_kg" NUMERIC(12,4),
        "approved_by" UUID,
        "approved_at" TIMESTAMPTZ,
        "released_by" UUID,
        "released_at" TIMESTAMPTZ,
        "revision_notes" TEXT,
        "description" TEXT,
        "tags" TEXT[],
        "metadata" JSONB,
        CONSTRAINT "PK_engineering_drawings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_drawings_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_drawings_number" ON "engineering_drawings" ("drawing_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_drawings_project" ON "engineering_drawings" ("project_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_drawings_project_status" ON "engineering_drawings" ("project_id", "status", "deleted_at")`);

    // ── engineering_drawing_revisions ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_drawing_revisions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "drawing_id" UUID NOT NULL,
        "revision" VARCHAR(10) NOT NULL,
        "version_number" INT NOT NULL DEFAULT 1,
        "file_name" VARCHAR(300),
        "file_path" VARCHAR(500),
        "mime_type" VARCHAR(100),
        "file_size" BIGINT NOT NULL DEFAULT 0,
        "checksum" VARCHAR(64),
        "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        "change_summary" TEXT,
        "checked_in_by" UUID,
        "checked_in_by_name" VARCHAR(200),
        "checked_in_at" TIMESTAMPTZ,
        "released_by" UUID,
        "released_at" TIMESTAMPTZ,
        CONSTRAINT "PK_engineering_drawing_revisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_drawing_revs_drawing" FOREIGN KEY ("drawing_id")
          REFERENCES "engineering_drawings" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_eng_drawing_revs_key" UNIQUE ("drawing_id", "revision", "version_number")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_drawing_revs_drawing" ON "engineering_drawing_revisions" ("drawing_id", "deleted_at")`);

    // ── engineering_boms ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_boms" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "bom_number" VARCHAR(30) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "project_id" UUID NOT NULL,
        "drawing_id" UUID,
        "revision" VARCHAR(10) NOT NULL DEFAULT 'A',
        "version_number" INT NOT NULL DEFAULT 1,
        "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        "workflow_instance_id" UUID,
        "effective_from" DATE,
        "effective_to" DATE,
        "total_cost" NUMERIC(18,2),
        "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
        "is_current" BOOLEAN NOT NULL DEFAULT true,
        "released_by" UUID,
        "released_at" TIMESTAMPTZ,
        "notes" TEXT,
        "metadata" JSONB,
        CONSTRAINT "PK_engineering_boms" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_boms_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_eng_boms_drawing" FOREIGN KEY ("drawing_id")
          REFERENCES "engineering_drawings" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_boms_number" ON "engineering_boms" ("bom_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_boms_project" ON "engineering_boms" ("project_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_boms_project_status" ON "engineering_boms" ("project_id", "status", "deleted_at")`);

    // ── engineering_bom_items ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_bom_items" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "bom_id" UUID NOT NULL,
        "parent_item_id" UUID,
        "line_number" VARCHAR(20),
        "part_number" VARCHAR(50),
        "part_name" VARCHAR(200) NOT NULL,
        "item_type" VARCHAR(30) NOT NULL DEFAULT 'PART',
        "source_type" VARCHAR(20) NOT NULL DEFAULT 'MAKE',
        "drawing_id" UUID,
        "material_id" UUID,
        "component_id" UUID,
        "quantity_per" NUMERIC(12,4) NOT NULL DEFAULT 1,
        "quantity" NUMERIC(12,4) NOT NULL DEFAULT 1,
        "uom" VARCHAR(20) NOT NULL DEFAULT 'EA',
        "base_uom" VARCHAR(20),
        "conversion_factor" NUMERIC(12,4) NOT NULL DEFAULT 1,
        "unit_cost" NUMERIC(18,4),
        "extended_cost" NUMERIC(18,4),
        "cost_currency" VARCHAR(10),
        "lead_time_days" INT,
        "reference" VARCHAR(50),
        "supplier_id" UUID,
        "supplier_name" VARCHAR(200),
        "sort_order" INT NOT NULL DEFAULT 0,
        "make_or_buy_notes" TEXT,
        "notes" TEXT,
        "metadata" JSONB,
        CONSTRAINT "PK_engineering_bom_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_bom_items_bom" FOREIGN KEY ("bom_id")
          REFERENCES "engineering_boms" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_eng_bom_items_parent" FOREIGN KEY ("parent_item_id")
          REFERENCES "engineering_bom_items" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_bom_items_bom" ON "engineering_bom_items" ("bom_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_bom_items_parent" ON "engineering_bom_items" ("parent_item_id", "deleted_at")`);

    // ── engineering_bom_revisions ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_bom_revisions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "bom_id" UUID NOT NULL,
        "revision" VARCHAR(10) NOT NULL,
        "version_number" INT NOT NULL DEFAULT 1,
        "snapshot" JSONB NOT NULL,
        "total_cost" NUMERIC(18,2),
        "change_summary" TEXT,
        "released_by" UUID,
        "released_at" TIMESTAMPTZ,
        CONSTRAINT "PK_engineering_bom_revisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_bom_revs_bom" FOREIGN KEY ("bom_id")
          REFERENCES "engineering_boms" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_eng_bom_revs_key" UNIQUE ("bom_id", "revision", "version_number")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_bom_revs_bom" ON "engineering_bom_revisions" ("bom_id", "deleted_at")`);

    // ── engineering_routings ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_routings" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "routing_number" VARCHAR(30) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "project_id" UUID NOT NULL,
        "part_id" UUID,
        "drawing_id" UUID,
        "bom_id" UUID,
        "version" INT NOT NULL DEFAULT 1,
        "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        "workflow_instance_id" UUID,
        "total_setup_hours" NUMERIC(10,2),
        "total_cycle_hours" NUMERIC(10,2),
        "total_standard_hours" NUMERIC(10,2),
        "total_cost" NUMERIC(18,2),
        "approved_by" UUID,
        "approved_at" TIMESTAMPTZ,
        "released_by" UUID,
        "released_at" TIMESTAMPTZ,
        "notes" TEXT,
        CONSTRAINT "PK_engineering_routings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_routings_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_routings_number" ON "engineering_routings" ("routing_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_routings_project" ON "engineering_routings" ("project_id", "deleted_at")`);

    // ── engineering_operations ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_operations" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "routing_id" UUID NOT NULL,
        "operation_number" INT NOT NULL,
        "operation_code" VARCHAR(20),
        "description" VARCHAR(300) NOT NULL,
        "work_center_id" UUID,
        "machine_id" UUID,
        "setup_time_minutes" NUMERIC(8,2) NOT NULL DEFAULT 0,
        "cycle_time_minutes" NUMERIC(8,2) NOT NULL DEFAULT 0,
        "standard_time_minutes" NUMERIC(8,2) NOT NULL DEFAULT 0,
        "quantity_per_cycle" NUMERIC(12,4) NOT NULL DEFAULT 1,
        "cost_per_hour" NUMERIC(10,2),
        "operation_cost" NUMERIC(18,2),
        "tool_requirements" JSONB,
        "material_requirements" JSONB,
        "inspection_required" BOOLEAN NOT NULL DEFAULT false,
        "quality_checkpoints" JSONB,
        "predecessor_operation_id" UUID,
        "notes" TEXT,
        CONSTRAINT "PK_engineering_operations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_operations_routing" FOREIGN KEY ("routing_id")
          REFERENCES "engineering_routings" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_eng_operations_workcenter" FOREIGN KEY ("work_center_id")
          REFERENCES "engineering_work_centers" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_operations_routing" ON "engineering_operations" ("routing_id", "deleted_at")`);

    // ── engineering_review_requests ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_review_requests" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "review_number" VARCHAR(30) NOT NULL,
        "project_id" UUID NOT NULL,
        "entity_type" VARCHAR(30) NOT NULL,
        "entity_id" UUID NOT NULL,
        "title" VARCHAR(300) NOT NULL,
        "description" TEXT,
        "review_type" VARCHAR(30) NOT NULL DEFAULT 'PEER',
        "requested_by" UUID,
        "requested_by_name" VARCHAR(200),
        "reviewer_id" UUID,
        "reviewer_name" VARCHAR(200),
        "due_date" DATE,
        "completed_at" TIMESTAMPTZ,
        "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "decision" VARCHAR(30),
        "decision_comments" TEXT,
        "markups" JSONB,
        "attachments" JSONB,
        CONSTRAINT "PK_engineering_review_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_reviews_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_reviews_number" ON "engineering_review_requests" ("review_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_reviews_project" ON "engineering_review_requests" ("project_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_reviews_entity" ON "engineering_review_requests" ("entity_type", "entity_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_reviews_reviewer" ON "engineering_review_requests" ("reviewer_id", "status", "deleted_at")`);

    // ── engineering_review_comments ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_review_comments" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "review_request_id" UUID NOT NULL,
        "author_id" UUID,
        "author_name" VARCHAR(200),
        "body" TEXT NOT NULL,
        "markup_data" JSONB,
        "is_resolved" BOOLEAN NOT NULL DEFAULT false,
        "resolved_by" UUID,
        "resolved_at" TIMESTAMPTZ,
        CONSTRAINT "PK_engineering_review_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_review_comments_request" FOREIGN KEY ("review_request_id")
          REFERENCES "engineering_review_requests" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_review_comments_request" ON "engineering_review_comments" ("review_request_id", "deleted_at")`);

    // ── engineering_documents ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_documents" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "document_number" VARCHAR(30) NOT NULL,
        "project_id" UUID NOT NULL,
        "doc_type" VARCHAR(30) NOT NULL DEFAULT 'PDF',
        "title" VARCHAR(300) NOT NULL,
        "description" TEXT,
        "file_name" VARCHAR(300),
        "mime_type" VARCHAR(100),
        "file_size" BIGINT NOT NULL DEFAULT 0,
        "current_version" INT NOT NULL DEFAULT 1,
        "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        "drawing_id" UUID,
        "bom_id" UUID,
        "released_by" UUID,
        "released_at" TIMESTAMPTZ,
        "metadata" JSONB,
        CONSTRAINT "PK_engineering_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_documents_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_documents_number" ON "engineering_documents" ("document_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_documents_project" ON "engineering_documents" ("project_id", "deleted_at")`);

    // ── engineering_document_versions ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_document_versions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "document_id" UUID NOT NULL,
        "version_number" INT NOT NULL,
        "file_name" VARCHAR(300) NOT NULL,
        "file_path" VARCHAR(500),
        "mime_type" VARCHAR(100),
        "file_size" BIGINT NOT NULL DEFAULT 0,
        "checksum" VARCHAR(64),
        "uploaded_by" UUID,
        "uploaded_by_name" VARCHAR(200),
        "notes" TEXT,
        CONSTRAINT "PK_engineering_document_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_doc_versions_document" FOREIGN KEY ("document_id")
          REFERENCES "engineering_documents" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_eng_doc_versions_key" UNIQUE ("document_id", "version_number")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_doc_versions_document" ON "engineering_document_versions" ("document_id", "deleted_at")`);

    // ── engineering_ai_hooks (AI readiness registry) ───────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_ai_hooks" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "hook_code" VARCHAR(50) NOT NULL,
        "hook_name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "event_type" VARCHAR(100),
        "is_enabled" BOOLEAN NOT NULL DEFAULT false,
        "config" JSONB,
        "last_invoked_at" TIMESTAMPTZ,
        "last_error" TEXT,
        "invocation_count" INT NOT NULL DEFAULT 0,
        "notes" TEXT,
        CONSTRAINT "PK_engineering_ai_hooks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_eng_ai_hooks_code" UNIQUE ("hook_code")
      )
    `);

    // ── Engineering Change Management extension ────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "engineering_change_requests"
        ADD COLUMN IF NOT EXISTS "workflow_instance_id" UUID,
        ADD COLUMN IF NOT EXISTS "drawing_id" UUID,
        ADD COLUMN IF NOT EXISTS "bom_id" UUID,
        ADD COLUMN IF NOT EXISTS "work_order_id" UUID,
        ADD COLUMN IF NOT EXISTS "routing_id" UUID
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ecr_workflow" ON "engineering_change_requests" ("workflow_instance_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ecr_drawing" ON "engineering_change_requests" ("drawing_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ecr_bom" ON "engineering_change_requests" ("bom_id")`);

    await queryRunner.query(`
      ALTER TABLE "engineering_change_orders"
        ADD COLUMN IF NOT EXISTS "workflow_instance_id" UUID,
        ADD COLUMN IF NOT EXISTS "project_id" UUID,
        ADD COLUMN IF NOT EXISTS "drawing_id" UUID,
        ADD COLUMN IF NOT EXISTS "bom_id" UUID
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eco_workflow" ON "engineering_change_orders" ("workflow_instance_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eco_project" ON "engineering_change_orders" ("project_id")`);

    // ── engineering_change_notices (ECN) ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_change_notices" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "ecn_number" VARCHAR(30) NOT NULL,
        "eco_id" UUID NOT NULL,
        "ecr_id" UUID,
        "project_id" UUID NOT NULL,
        "title" VARCHAR(300) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
        "issued_by" UUID,
        "issued_at" TIMESTAMPTZ,
        "effective_date" DATE,
        "notified_to" JSONB,
        "affected_manufacturing_orders" JSONB,
        "notes" TEXT,
        CONSTRAINT "PK_engineering_change_notices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_eng_ecn_number" UNIQUE ("ecn_number"),
        CONSTRAINT "FK_eng_ecn_eco" FOREIGN KEY ("eco_id")
          REFERENCES "engineering_change_orders" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_eng_ecn_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_ecn_number" ON "engineering_change_notices" ("ecn_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_ecn_eco" ON "engineering_change_notices" ("eco_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_ecn_project" ON "engineering_change_notices" ("project_id", "deleted_at")`);

    // ── engineering_change_impacts ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_change_impacts" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "ecr_id" UUID NOT NULL,
        "impact_type" VARCHAR(30) NOT NULL,
        "entity_id" UUID NOT NULL,
        "entity_number" VARCHAR(100),
        "impact_description" TEXT,
        "severity" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        "disposition" VARCHAR(30) NOT NULL DEFAULT 'RETAIN',
        "is_resolved" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_engineering_change_impacts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_impacts_ecr" FOREIGN KEY ("ecr_id")
          REFERENCES "engineering_change_requests" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_impacts_ecr" ON "engineering_change_impacts" ("ecr_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_impacts_entity" ON "engineering_change_impacts" ("impact_type", "entity_id", "deleted_at")`);

    // ═══════════════════════════════════════════════════════════════════════
    // WORKFLOW SEEDS (database-driven — no hardcoded transitions in code)
    // ═══════════════════════════════════════════════════════════════════════

    // ── engineering_drawing: DRAFT → IN_DESIGN → PEER_REVIEW → LEAD_APPROVAL
    //    → RELEASED ⇄ REVISION_REQUIRED → OBSOLETE ─────────────────────────
    await queryRunner.query(`
      INSERT INTO "workflow_states" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "name", "state_code", "description", "category", "workflow_type", "is_initial", "is_final", "sort_order", "color", "icon")
      VALUES
        ('e1000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Draft', 'DRAFT', 'Drawing drafted', 'DRAWING', 'engineering_drawing', TRUE, FALSE, 1, '#6B7280', NULL),
        ('e1000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'In Design', 'IN_DESIGN', 'Drawing being designed', 'DRAWING', 'engineering_drawing', FALSE, FALSE, 2, '#3B82F6', NULL),
        ('e1000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Peer Review', 'PEER_REVIEW', 'Peer review in progress', 'REVIEW', 'engineering_drawing', FALSE, FALSE, 3, '#8B5CF6', NULL),
        ('e1000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Lead Approval', 'LEAD_APPROVAL', 'Lead engineer approval', 'REVIEW', 'engineering_drawing', FALSE, FALSE, 4, '#F59E0B', NULL),
        ('e1000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Released', 'RELEASED', 'Drawing released', 'DRAWING', 'engineering_drawing', FALSE, FALSE, 5, '#10B981', NULL),
        ('e1000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Revision Required', 'REVISION_REQUIRED', 'Revision required', 'DRAWING', 'engineering_drawing', FALSE, FALSE, 6, '#F97316', NULL),
        ('e1000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Obsolete', 'OBSOLETE', 'Drawing obsolete', 'CLOSED', 'engineering_drawing', FALSE, TRUE, 7, '#9CA3AF', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "workflow_transitions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "from_state_id", "to_state_id", "name", "description", "workflow_type", "required_roles", "required_permissions", "conditions", "requires_approval", "approval_roles", "is_active")
      VALUES
        ('e2000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', 'Start Design', 'Move drawing into design', 'engineering_drawing', NULL, ARRAY['engineering:drawing:update'], NULL, FALSE, NULL, TRUE),
        ('e2000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000003', 'Submit for Peer Review', 'Send drawing for peer review', 'engineering_drawing', NULL, ARRAY['engineering:drawing:update'], NULL, FALSE, NULL, TRUE),
        ('e2000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000004', 'Approve in Peer Review', 'Peer review passed', 'engineering_drawing', NULL, ARRAY['engineering:review:approve'], NULL, FALSE, NULL, TRUE),
        ('e2000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', 'Rework after Peer Review', 'Peer review requested changes', 'engineering_drawing', NULL, ARRAY['engineering:drawing:update'], NULL, FALSE, NULL, TRUE),
        ('e2000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000005', 'Release Drawing', 'Lead approval — release drawing', 'engineering_drawing', NULL, ARRAY['engineering:drawing:release'], NULL, TRUE, ARRAY['MANAGEMENT','DESIGN'], TRUE),
        ('e2000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000002', 'Send Back to Design', 'Lead requested changes', 'engineering_drawing', NULL, ARRAY['engineering:drawing:update'], NULL, FALSE, NULL, TRUE),
        ('e2000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000006', 'Require Revision', 'Released drawing requires revision', 'engineering_drawing', NULL, ARRAY['engineering:drawing:update'], NULL, FALSE, NULL, TRUE),
        ('e2000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000002', 'Revise Drawing', 'Start revision work', 'engineering_drawing', NULL, ARRAY['engineering:drawing:update'], NULL, FALSE, NULL, TRUE),
        ('e2000000-0000-4000-8000-000000000009', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e1000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000007', 'Mark Obsolete', 'Drawing declared obsolete', 'engineering_drawing', NULL, ARRAY['engineering:drawing:update'], NULL, FALSE, NULL, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ── engineering_change: REQUEST → REVIEW → APPROVAL → IMPLEMENTATION
    //    → VERIFICATION → RELEASE (REJECTED terminal) ──────────────────────
    await queryRunner.query(`
      INSERT INTO "workflow_states" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "name", "state_code", "description", "category", "workflow_type", "is_initial", "is_final", "sort_order", "color", "icon")
      VALUES
        ('e3000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Request', 'REQUEST', 'Change requested', 'CHANGE', 'engineering_change', TRUE, FALSE, 1, '#6B7280', NULL),
        ('e3000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Review', 'REVIEW', 'Change under review', 'CHANGE', 'engineering_change', FALSE, FALSE, 2, '#3B82F6', NULL),
        ('e3000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Approval', 'APPROVAL', 'Change approval gate', 'CHANGE', 'engineering_change', FALSE, FALSE, 3, '#F59E0B', NULL),
        ('e3000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Implementation', 'IMPLEMENTATION', 'Change implementation', 'CHANGE', 'engineering_change', FALSE, FALSE, 4, '#8B5CF6', NULL),
        ('e3000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Verification', 'VERIFICATION', 'Change verification', 'CHANGE', 'engineering_change', FALSE, FALSE, 5, '#14B8A6', NULL),
        ('e3000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Release', 'RELEASE', 'Change released', 'CHANGE', 'engineering_change', FALSE, TRUE, 6, '#10B981', NULL),
        ('e3000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Rejected', 'REJECTED', 'Change rejected', 'CHANGE', 'engineering_change', FALSE, TRUE, 7, '#EF4444', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "workflow_transitions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "from_state_id", "to_state_id", "name", "description", "workflow_type", "required_roles", "required_permissions", "conditions", "requires_approval", "approval_roles", "is_active")
      VALUES
        ('e4000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e3000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000002', 'Submit for Review', 'Submit change for review', 'engineering_change', NULL, ARRAY['engineering:change:update'], NULL, FALSE, NULL, TRUE),
        ('e4000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e3000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000003', 'Proceed to Approval', 'Review completed', 'engineering_change', NULL, ARRAY['engineering:change:approve'], NULL, FALSE, NULL, TRUE),
        ('e4000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e3000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000007', 'Reject Change', 'Reject during review', 'engineering_change', NULL, ARRAY['engineering:change:approve'], NULL, FALSE, NULL, TRUE),
        ('e4000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e3000000-0000-4000-8000-000000000003', 'e3000000-0000-4000-8000-000000000004', 'Approve & Implement', 'Approved — start implementation', 'engineering_change', NULL, ARRAY['engineering:change:approve'], NULL, TRUE, ARRAY['MANAGEMENT','DESIGN'], TRUE),
        ('e4000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e3000000-0000-4000-8000-000000000003', 'e3000000-0000-4000-8000-000000000007', 'Reject at Approval', 'Reject at approval gate', 'engineering_change', NULL, ARRAY['engineering:change:approve'], NULL, FALSE, NULL, TRUE),
        ('e4000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e3000000-0000-4000-8000-000000000004', 'e3000000-0000-4000-8000-000000000005', 'Request Verification', 'Implementation complete', 'engineering_change', NULL, ARRAY['engineering:change:implement'], NULL, FALSE, NULL, TRUE),
        ('e4000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e3000000-0000-4000-8000-000000000005', 'e3000000-0000-4000-8000-000000000006', 'Release Change', 'Verified — release change', 'engineering_change', NULL, ARRAY['engineering:change:release'], NULL, FALSE, NULL, TRUE),
        ('e4000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e3000000-0000-4000-8000-000000000005', 'e3000000-0000-4000-8000-000000000004', 'Rework Implementation', 'Verification failed — rework', 'engineering_change', NULL, ARRAY['engineering:change:implement'], NULL, FALSE, NULL, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ── engineering_bom: DRAFT → UNDER_REVIEW → APPROVED → RELEASED
    //    → OBSOLETE (revision loop back to DRAFT) ──────────────────────────
    await queryRunner.query(`
      INSERT INTO "workflow_states" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "name", "state_code", "description", "category", "workflow_type", "is_initial", "is_final", "sort_order", "color", "icon")
      VALUES
        ('e5000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Draft', 'DRAFT', 'BOM drafted', 'BOM', 'engineering_bom', TRUE, FALSE, 1, '#6B7280', NULL),
        ('e5000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Under Review', 'UNDER_REVIEW', 'BOM under review', 'BOM', 'engineering_bom', FALSE, FALSE, 2, '#3B82F6', NULL),
        ('e5000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Approved', 'APPROVED', 'BOM approved', 'BOM', 'engineering_bom', FALSE, FALSE, 3, '#F59E0B', NULL),
        ('e5000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Released', 'RELEASED', 'BOM released', 'BOM', 'engineering_bom', FALSE, FALSE, 4, '#10B981', NULL),
        ('e5000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Obsolete', 'OBSOLETE', 'BOM obsolete', 'BOM', 'engineering_bom', FALSE, TRUE, 5, '#9CA3AF', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "workflow_transitions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "from_state_id", "to_state_id", "name", "description", "workflow_type", "required_roles", "required_permissions", "conditions", "requires_approval", "approval_roles", "is_active")
      VALUES
        ('e6000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e5000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000002', 'Submit for Review', 'BOM under review', 'engineering_bom', NULL, ARRAY['engineering:bom:update'], NULL, FALSE, NULL, TRUE),
        ('e6000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e5000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000003', 'Approve BOM', 'BOM approved', 'engineering_bom', NULL, ARRAY['engineering:review:approve'], NULL, FALSE, NULL, TRUE),
        ('e6000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e5000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000001', 'Request BOM Changes', 'BOM back to draft', 'engineering_bom', NULL, ARRAY['engineering:bom:update'], NULL, FALSE, NULL, TRUE),
        ('e6000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e5000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000004', 'Release BOM', 'BOM released', 'engineering_bom', NULL, ARRAY['engineering:bom:release'], NULL, TRUE, ARRAY['MANAGEMENT','DESIGN'], TRUE),
        ('e6000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e5000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000001', 'Send BOM Back', 'BOM back to draft after approval', 'engineering_bom', NULL, ARRAY['engineering:bom:update'], NULL, FALSE, NULL, TRUE),
        ('e6000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e5000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000005', 'Mark BOM Obsolete', 'BOM obsolete', 'engineering_bom', NULL, ARRAY['engineering:bom:update'], NULL, FALSE, NULL, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ── engineering_routing: DRAFT → APPROVED → RELEASED → OBSOLETE ───────
    await queryRunner.query(`
      INSERT INTO "workflow_states" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "name", "state_code", "description", "category", "workflow_type", "is_initial", "is_final", "sort_order", "color", "icon")
      VALUES
        ('e7000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Draft', 'DRAFT', 'Routing drafted', 'PLANNING', 'engineering_routing', TRUE, FALSE, 1, '#6B7280', NULL),
        ('e7000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Approved', 'APPROVED', 'Routing approved', 'PLANNING', 'engineering_routing', FALSE, FALSE, 2, '#F59E0B', NULL),
        ('e7000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Released', 'RELEASED', 'Routing released', 'PLANNING', 'engineering_routing', FALSE, FALSE, 3, '#10B981', NULL),
        ('e7000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Obsolete', 'OBSOLETE', 'Routing obsolete', 'PLANNING', 'engineering_routing', FALSE, TRUE, 4, '#9CA3AF', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "workflow_transitions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "from_state_id", "to_state_id", "name", "description", "workflow_type", "required_roles", "required_permissions", "conditions", "requires_approval", "approval_roles", "is_active")
      VALUES
        ('e8000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e7000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000002', 'Approve Routing', 'Routing approved', 'engineering_routing', NULL, ARRAY['engineering:routing:update'], NULL, FALSE, NULL, TRUE),
        ('e8000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e7000000-0000-4000-8000-000000000002', 'e7000000-0000-4000-8000-000000000003', 'Release Routing', 'Routing released', 'engineering_routing', NULL, ARRAY['engineering:routing:update'], NULL, FALSE, NULL, TRUE),
        ('e8000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'e7000000-0000-4000-8000-000000000003', 'e7000000-0000-4000-8000-000000000004', 'Mark Routing Obsolete', 'Routing obsolete', 'engineering_routing', NULL, ARRAY['engineering:routing:update'], NULL, FALSE, NULL, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // RBAC: engineering permissions + role grants
    // ═══════════════════════════════════════════════════════════════════════
    const permissions: { resource: string; action: string }[] = [
      { resource: 'engineering:dashboard', action: 'read' },
      { resource: 'engineering:drawing', action: 'create' },
      { resource: 'engineering:drawing', action: 'read' },
      { resource: 'engineering:drawing', action: 'update' },
      { resource: 'engineering:drawing', action: 'delete' },
      { resource: 'engineering:drawing', action: 'checkout' },
      { resource: 'engineering:drawing', action: 'checkin' },
      { resource: 'engineering:drawing', action: 'release' },
      { resource: 'engineering:drawing', action: 'compare' },
      { resource: 'engineering:bom', action: 'create' },
      { resource: 'engineering:bom', action: 'read' },
      { resource: 'engineering:bom', action: 'update' },
      { resource: 'engineering:bom', action: 'delete' },
      { resource: 'engineering:bom', action: 'rollup' },
      { resource: 'engineering:bom', action: 'compare' },
      { resource: 'engineering:bom', action: 'import' },
      { resource: 'engineering:bom', action: 'export' },
      { resource: 'engineering:bom', action: 'release' },
      { resource: 'engineering:change', action: 'create' },
      { resource: 'engineering:change', action: 'read' },
      { resource: 'engineering:change', action: 'update' },
      { resource: 'engineering:change', action: 'delete' },
      { resource: 'engineering:change', action: 'approve' },
      { resource: 'engineering:change', action: 'implement' },
      { resource: 'engineering:change', action: 'verify' },
      { resource: 'engineering:change', action: 'release' },
      { resource: 'engineering:routing', action: 'create' },
      { resource: 'engineering:routing', action: 'read' },
      { resource: 'engineering:routing', action: 'update' },
      { resource: 'engineering:routing', action: 'delete' },
      { resource: 'engineering:workcenter', action: 'create' },
      { resource: 'engineering:workcenter', action: 'read' },
      { resource: 'engineering:workcenter', action: 'update' },
      { resource: 'engineering:workcenter', action: 'delete' },
      { resource: 'engineering:material', action: 'create' },
      { resource: 'engineering:material', action: 'read' },
      { resource: 'engineering:material', action: 'update' },
      { resource: 'engineering:material', action: 'delete' },
      { resource: 'engineering:component', action: 'create' },
      { resource: 'engineering:component', action: 'read' },
      { resource: 'engineering:component', action: 'update' },
      { resource: 'engineering:component', action: 'delete' },
      { resource: 'engineering:review', action: 'create' },
      { resource: 'engineering:review', action: 'read' },
      { resource: 'engineering:review', action: 'update' },
      { resource: 'engineering:review', action: 'approve' },
      { resource: 'engineering:document', action: 'create' },
      { resource: 'engineering:document', action: 'read' },
      { resource: 'engineering:document', action: 'update' },
      { resource: 'engineering:document', action: 'delete' },
      { resource: 'engineering:document', action: 'version' },
      { resource: 'engineering:traceability', action: 'read' },
      { resource: 'engineering:aihook', action: 'read' },
      { resource: 'engineering:aihook', action: 'update' },
      { resource: 'engineering:workflow', action: 'read' },
      { resource: 'engineering:workflow', action: 'write' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [p.resource, p.action],
      );
    }

    const eng = (a: string) => `engineering:${a}`;
    const ADMIN_P = [
      eng('dashboard:read'), eng('drawing:create'), eng('drawing:read'), eng('drawing:update'), eng('drawing:delete'),
      eng('drawing:checkout'), eng('drawing:checkin'), eng('drawing:release'), eng('drawing:compare'),
      eng('bom:create'), eng('bom:read'), eng('bom:update'), eng('bom:delete'), eng('bom:rollup'), eng('bom:compare'),
      eng('bom:import'), eng('bom:export'), eng('bom:release'),
      eng('change:create'), eng('change:read'), eng('change:update'), eng('change:delete'), eng('change:approve'),
      eng('change:implement'), eng('change:verify'), eng('change:release'),
      eng('routing:create'), eng('routing:read'), eng('routing:update'), eng('routing:delete'),
      eng('workcenter:create'), eng('workcenter:read'), eng('workcenter:update'), eng('workcenter:delete'),
      eng('material:create'), eng('material:read'), eng('material:update'), eng('material:delete'),
      eng('component:create'), eng('component:read'), eng('component:update'), eng('component:delete'),
      eng('review:create'), eng('review:read'), eng('review:update'), eng('review:approve'),
      eng('document:create'), eng('document:read'), eng('document:update'), eng('document:delete'), eng('document:version'),
      eng('traceability:read'), eng('aihook:read'), eng('aihook:update'),
      eng('workflow:read'), eng('workflow:write'),
    ];
    const MANAGEMENT_P = [...ADMIN_P].filter((p) => !p.includes(':delete'));
    const DESIGN_P = [
      eng('dashboard:read'), eng('drawing:create'), eng('drawing:read'), eng('drawing:update'), eng('drawing:delete'),
      eng('drawing:checkout'), eng('drawing:checkin'), eng('drawing:release'), eng('drawing:compare'),
      eng('bom:create'), eng('bom:read'), eng('bom:update'), eng('bom:delete'), eng('bom:rollup'), eng('bom:compare'),
      eng('bom:import'), eng('bom:export'), eng('bom:release'),
      eng('change:create'), eng('change:read'), eng('change:update'), eng('change:approve'), eng('change:implement'),
      eng('change:verify'), eng('change:release'),
      eng('routing:create'), eng('routing:read'), eng('routing:update'), eng('routing:delete'),
      eng('workcenter:read'),
      eng('material:create'), eng('material:read'), eng('material:update'), eng('material:delete'),
      eng('component:create'), eng('component:read'), eng('component:update'), eng('component:delete'),
      eng('review:create'), eng('review:read'), eng('review:update'), eng('review:approve'),
      eng('document:create'), eng('document:read'), eng('document:update'), eng('document:delete'), eng('document:version'),
      eng('traceability:read'), eng('aihook:read'),
      eng('workflow:read'), eng('workflow:write'),
    ];
    const PLANNING_P = [
      eng('dashboard:read'), eng('drawing:read'), eng('bom:read'), eng('bom:update'), eng('bom:rollup'),
      eng('bom:compare'), eng('bom:import'), eng('bom:export'),
      eng('change:read'), eng('change:update'), eng('change:implement'),
      eng('routing:create'), eng('routing:read'), eng('routing:update'), eng('routing:delete'),
      eng('workcenter:create'), eng('workcenter:read'), eng('workcenter:update'),
      eng('material:read'), eng('material:update'), eng('component:read'), eng('component:update'),
      eng('review:create'), eng('review:read'),
      eng('document:read'), eng('traceability:read'), eng('aihook:read'),
      eng('workflow:read'), eng('workflow:write'),
    ];
    const PRODUCTION_P = [
      eng('dashboard:read'), eng('drawing:read'), eng('bom:read'), eng('change:read'), eng('routing:read'),
      eng('workcenter:read'), eng('material:read'), eng('component:read'), eng('review:create'), eng('review:read'),
      eng('document:read'), eng('traceability:read'), eng('workflow:read'),
    ];
    const QUALITY_P = [
      ...PRODUCTION_P, eng('review:approve'), eng('document:create'), eng('document:update'), eng('document:version'),
    ];
    const CUSTOMER_P = [
      eng('dashboard:read'), eng('drawing:read'), eng('bom:read'), eng('document:read'), eng('review:read'),
      eng('traceability:read'), eng('workflow:read'),
    ];

    const upperMatrix: Record<string, string[]> = {
      ADMIN: ADMIN_P,
      MANAGEMENT: MANAGEMENT_P,
      SALES: [...CUSTOMER_P, eng('change:read'), eng('change:create')],
      DESIGN: DESIGN_P,
      PLANNING: PLANNING_P,
      PRODUCTION: PRODUCTION_P,
      QUALITY: QUALITY_P,
      CUSTOMER: CUSTOMER_P,
    };
    const lowerMatrix: Record<string, string[]> = {
      admin: ADMIN_P,
      manager: MANAGEMENT_P,
      sales_rep: [...CUSTOMER_P, eng('change:read'), eng('change:create')],
      project_lead: MANAGEMENT_P,
      engineer: DESIGN_P,
      production_planner: PLANNING_P,
      operator: PRODUCTION_P,
      qa_inspector: QUALITY_P,
      qa_engineer: QUALITY_P,
      service_tech: [...PRODUCTION_P],
      viewer: CUSTOMER_P,
    };

    const grant = async (roleName: string, permKeys: string[]) => {
      for (const permKey of permKeys) {
        const idx = permKey.lastIndexOf(':');
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

    // ═══════════════════════════════════════════════════════════════════════
    // AI readiness hook registry (prepared, disabled — no inference)
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "engineering_ai_hooks" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "hook_code", "hook_name", "description", "event_type", "is_enabled", "config", "notes")
      VALUES
        ('f0000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, NULL,
          'SIMILAR_DRAWING_SEARCH', 'Similar Drawing Search',
          'Embedding-based retrieval of drawings with similar geometry, dimensions and CAD metadata.', 'engineering.drawing.revision_uploaded', FALSE, '{"embedding_field":"metadata.embedding","index":"drawing_vector","distance":"cosine"}', 'Prepared integration point. No inference executed by the platform.'),
        ('f0000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, NULL,
          'BOM_RECOMMENDATION', 'BOM Recommendation',
          'Suggests line items and components based on historical BOMs and part similarity.', 'engineering.bom.created', FALSE, '{"recommender":"bom-similarity-v1","top_k":10}', 'Prepared integration point.'),
        ('f0000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, NULL,
          'MATERIAL_SUGGESTION', 'Material Suggestion',
          'Suggests candidate material grades from design intent and load case.', 'engineering.drawing.created', FALSE, '{"knowledge_base":"material-library","top_k":5}', 'Prepared integration point.'),
        ('f0000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, NULL,
          'DESIGN_RULE_VALIDATION', 'Design Rule Validation',
          'Checks drawings against company design rules (draft angles, radii, wall thickness).', 'engineering.drawing.revision_uploaded', FALSE, '{"ruleset":"mitra-design-rules-v1"}', 'Prepared integration point.'),
        ('f0000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, NULL,
          'ENGINEERING_KNOWLEDGE_EXTRACTION', 'Engineering Knowledge Extraction',
          'Extracts structured engineering knowledge from documents and drawings.', 'engineering.document.uploaded', FALSE, '{"extractor":"doc-knowledge-v1"}', 'Prepared integration point.'),
        ('f0000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, NULL,
          'ENGINEERING_DOCUMENT_INDEXING', 'Engineering Document Indexing',
          'Indexes engineering documents for semantic search and RAG.', 'engineering.document.uploaded', FALSE, '{"index":"engineering-docs","chunk_size":512}', 'Prepared integration point.'),
        ('f0000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, NULL,
          'EMBEDDING_GENERATION', 'Embedding Generation',
          'Generates embeddings for engineering artifacts to enable vector search.', 'engineering.document.versioned', FALSE, '{"model":"text-embedding-3-small","dimensions":1536}', 'Prepared integration point.'),
        ('f0000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, NULL,
          'KNOWLEDGE_GRAPH_UPDATE', 'Knowledge Graph Update',
          'Synchronizes engineering artifact relationships into the knowledge graph.', 'engineering.bom.revisioned', FALSE, '{"graph":"mitra-kg","sync_mode":"incremental"}', 'Prepared integration point.')
      ON CONFLICT ("hook_code") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_change_impacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_change_notices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_document_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_review_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_review_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_operations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_routings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_bom_revisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_bom_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_boms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_drawing_revisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_drawings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_component_alternates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_components"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_materials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_work_centers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_ai_hooks"`);

    await queryRunner.query(`
      ALTER TABLE "engineering_change_orders"
        DROP COLUMN IF EXISTS "workflow_instance_id", DROP COLUMN IF EXISTS "project_id",
        DROP COLUMN IF EXISTS "drawing_id", DROP COLUMN IF EXISTS "bom_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "engineering_change_requests"
        DROP COLUMN IF EXISTS "workflow_instance_id", DROP COLUMN IF EXISTS "drawing_id",
        DROP COLUMN IF EXISTS "bom_id", DROP COLUMN IF EXISTS "work_order_id", DROP COLUMN IF EXISTS "routing_id"
    `);

    await queryRunner.query(`DELETE FROM "workflow_transitions" WHERE "workflow_type" IN ('engineering_drawing','engineering_change','engineering_bom','engineering_routing')`);
    await queryRunner.query(`DELETE FROM "workflow_states" WHERE "workflow_type" IN ('engineering_drawing','engineering_change','engineering_bom','engineering_routing')`);
  }
}
