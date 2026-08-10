import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MITRA v3.6 - Sprint 2.5 Enterprise QMS foundation.
 *
 * Extends the existing quality, engineering, manufacturing, workflow, audit,
 * and outbox architecture. QMS rows store UUID traceability anchors only; source
 * Engineering/MES/Supplier data remains owned by those domains.
 */
export class QmsFoundation1700000000021 implements MigrationInterface {
  name = 'QmsFoundation1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inspection_plans" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "plan_number" varchar(40) NOT NULL UNIQUE,
        "title" varchar(200) NOT NULL,
        "description" text,
        "project_id" uuid,
        "drawing_id" uuid,
        "bom_id" uuid,
        "routing_id" uuid,
        "part_id" uuid,
        "work_order_id" uuid,
        "job_card_id" uuid,
        "machine_id" uuid,
        "operator_id" uuid,
        "material_lot" varchar(80),
        "supplier_id" uuid,
        "inspection_type" varchar(30) NOT NULL DEFAULT 'INCOMING',
        "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
        "revision_number" integer NOT NULL DEFAULT 1,
        "source_artifact_type" varchar(50),
        "source_artifact_id" uuid,
        "released_at" timestamptz,
        "released_by" uuid,
        "characteristics" jsonb,
        "dimensions" jsonb,
        "tolerances" jsonb,
        "acceptance_criteria" jsonb,
        "inspection_frequency" varchar(80),
        "sampling_plan" jsonb,
        "inspection_methods" jsonb,
        "instruments" jsonb,
        "metadata" jsonb
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supplier_inspections" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "inspection_number" varchar(40) NOT NULL UNIQUE,
        "project_id" uuid,
        "supplier_id" uuid,
        "inspection_plan_id" uuid,
        "material_lot" varchar(80),
        "drawing_id" uuid,
        "bom_id" uuid,
        "routing_id" uuid,
        "work_order_id" uuid,
        "job_card_id" uuid,
        "machine_id" uuid,
        "operator_id" uuid,
        "material_certificate" varchar(200),
        "remarks" text,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "accepted_qty" integer NOT NULL DEFAULT 0,
        "rejected_qty" integer NOT NULL DEFAULT 0,
        "quarantine_qty" integer NOT NULL DEFAULT 0,
        "inspection_date" date,
        "inspected_by" uuid,
        "metadata" jsonb
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quality_control_plans" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "plan_number" varchar(40) NOT NULL UNIQUE,
        "project_id" uuid,
        "drawing_id" uuid,
        "bom_id" uuid,
        "routing_id" uuid,
        "work_order_id" uuid,
        "job_card_id" uuid,
        "machine_id" uuid,
        "operator_id" uuid,
        "inspection_plan_id" uuid,
        "material_lot" varchar(80),
        "supplier_id" uuid,
        "process_plan_id" uuid,
        "control_type" varchar(20) NOT NULL DEFAULT 'PRODUCT',
        "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
        "operation_mapping" jsonb,
        "inspection_mapping" jsonb,
        "reaction_plan" text,
        "description" text
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quality_fmeas" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "fmea_number" varchar(40) NOT NULL UNIQUE,
        "project_id" uuid,
        "drawing_id" uuid,
        "routing_id" uuid,
        "bom_id" uuid,
        "work_order_id" uuid,
        "job_card_id" uuid,
        "machine_id" uuid,
        "operator_id" uuid,
        "inspection_plan_id" uuid,
        "material_lot" varchar(80),
        "supplier_id" uuid,
        "fmea_type" varchar(20) NOT NULL DEFAULT 'DESIGN',
        "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
        "failure_mode" text,
        "effects" text,
        "causes" text,
        "severity" integer,
        "occurrence" integer,
        "detection" integer,
        "rpn" integer,
        "recommended_actions" text,
        "revision_number" integer NOT NULL DEFAULT 1
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quality_gauges" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "gauge_number" varchar(40) NOT NULL UNIQUE,
        "project_id" uuid,
        "drawing_id" uuid,
        "bom_id" uuid,
        "routing_id" uuid,
        "work_order_id" uuid,
        "job_card_id" uuid,
        "machine_id" uuid,
        "operator_id" uuid,
        "inspection_plan_id" uuid,
        "material_lot" varchar(80),
        "supplier_id" uuid,
        "description" varchar(80),
        "gauge_type" varchar(40),
        "status" varchar(40) NOT NULL DEFAULT 'ACTIVE',
        "calibration_due_date" date,
        "last_calibration_date" date,
        "calibration_schedule" varchar(60),
        "usage_count" integer NOT NULL DEFAULT 0,
        "history" jsonb
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quality_msa_studies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "study_number" varchar(40) NOT NULL UNIQUE,
        "project_id" uuid,
        "drawing_id" uuid,
        "bom_id" uuid,
        "routing_id" uuid,
        "work_order_id" uuid,
        "job_card_id" uuid,
        "machine_id" uuid,
        "operator_id" uuid,
        "inspection_plan_id" uuid,
        "material_lot" varchar(80),
        "supplier_id" uuid,
        "gauge_id" uuid,
        "study_type" varchar(30) NOT NULL DEFAULT 'GAGE_RR',
        "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
        "repeatability" numeric(8,3),
        "reproducibility" numeric(8,3),
        "bias" numeric(8,3),
        "linearity" numeric(8,3),
        "stability" numeric(8,3),
        "notes" text
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quality_ppap_apqp" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "record_number" varchar(40) NOT NULL UNIQUE,
        "project_id" uuid,
        "drawing_id" uuid,
        "bom_id" uuid,
        "routing_id" uuid,
        "work_order_id" uuid,
        "job_card_id" uuid,
        "machine_id" uuid,
        "operator_id" uuid,
        "inspection_plan_id" uuid,
        "material_lot" varchar(80),
        "supplier_id" uuid,
        "record_type" varchar(20) NOT NULL DEFAULT 'PPAP',
        "status" varchar(50) NOT NULL DEFAULT 'PLANNED',
        "deliverables" text,
        "milestones" text,
        "readiness_review" text,
        "submission_level" varchar(20),
        "documentation" text
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quality_customer_complaints" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "complaint_number" varchar(40) NOT NULL UNIQUE,
        "project_id" uuid,
        "customer_id" uuid,
        "work_order_id" uuid,
        "drawing_id" uuid,
        "bom_id" uuid,
        "routing_id" uuid,
        "job_card_id" uuid,
        "machine_id" uuid,
        "operator_id" uuid,
        "inspection_plan_id" uuid,
        "material_lot" varchar(80),
        "supplier_id" uuid,
        "description" text,
        "investigation" text,
        "root_cause" text,
        "corrective_action" text,
        "customer_response" text,
        "status" varchar(50) NOT NULL DEFAULT 'OPEN'
      )
    `);

    await this.addColumns(queryRunner, 'capa_verifications', [
      ['ncr_id', 'uuid'], ['drawing_id', 'uuid'], ['bom_id', 'uuid'], ['routing_id', 'uuid'],
      ['work_order_id', 'uuid'], ['job_card_id', 'uuid'], ['machine_id', 'uuid'], ['operator_id', 'uuid'],
      ['inspection_plan_id', 'uuid'], ['material_lot', 'varchar(80)'], ['supplier_id', 'uuid'],
    ]);
    await this.addColumns(queryRunner, 'ncr_records', [
      ['job_card_id', 'uuid'], ['bom_id', 'uuid'], ['routing_id', 'uuid'], ['inspection_plan_id', 'uuid'],
      ['material_lot', 'varchar(80)'], ['supplier_id', 'uuid'],
    ]);

    const indexStatements = [
      `CREATE INDEX IF NOT EXISTS "idx_qms_ip_project_status_deleted" ON "inspection_plans" ("project_id", "status", "deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_qms_ip_source" ON "inspection_plans" ("source_artifact_type", "source_artifact_id", "deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_qms_iqc_supplier_status_deleted" ON "supplier_inspections" ("supplier_id", "status", "deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_qms_control_project_status_deleted" ON "quality_control_plans" ("project_id", "status", "deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_qms_fmea_project_status_deleted" ON "quality_fmeas" ("project_id", "status", "deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_qms_gauge_project_status_deleted" ON "quality_gauges" ("project_id", "status", "deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_qms_msa_project_status_deleted" ON "quality_msa_studies" ("project_id", "status", "deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_qms_ppap_project_status_deleted" ON "quality_ppap_apqp" ("project_id", "status", "deleted_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_qms_complaint_project_status_deleted" ON "quality_customer_complaints" ("project_id", "status", "deleted_at")`,
    ];
    for (const statement of indexStatements) await queryRunner.query(statement);

    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id", "resource", "action", "description")
      VALUES
        (uuid_generate_v4(), now(), now(), NULL, NULL, NULL, NULL, 'quality', 'read', 'Read QMS records'),
        (uuid_generate_v4(), now(), now(), NULL, NULL, NULL, NULL, 'quality', 'create', 'Create QMS records'),
        (uuid_generate_v4(), now(), now(), NULL, NULL, NULL, NULL, 'quality', 'update', 'Update QMS records'),
        (uuid_generate_v4(), now(), now(), NULL, NULL, NULL, NULL, 'quality', 'approve', 'Approve and release QMS records'),
        (uuid_generate_v4(), now(), now(), NULL, NULL, NULL, NULL, 'quality', 'trace', 'View QMS genealogy and traceability')
      ON CONFLICT ("resource", "action") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "workflow_states" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id", "name", "state_code", "description", "category", "workflow_type", "is_initial", "is_final", "sort_order", "color", "icon")
      VALUES
        ('25000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Draft', 'DRAFT', 'Quality record drafted', 'QUALITY', 'quality_qms', TRUE, FALSE, 1, '#6B7280', NULL),
        ('25000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Review', 'REVIEW', 'Quality review in progress', 'QUALITY', 'quality_qms', FALSE, FALSE, 2, '#3B82F6', NULL),
        ('25000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Released', 'RELEASED', 'Quality record released', 'QUALITY', 'quality_qms', FALSE, FALSE, 3, '#10B981', NULL),
        ('25000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Closed', 'CLOSED', 'Quality record closed', 'QUALITY', 'quality_qms', FALSE, TRUE, 4, '#111827', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "workflow_transitions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id", "from_state_id", "to_state_id", "name", "description", "workflow_type", "required_roles", "required_permissions", "conditions", "requires_approval", "approval_roles", "is_active")
      VALUES
        ('25000000-0000-4000-9000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), '25000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000002', 'Submit Quality Record', 'Submit quality record for review', 'quality_qms', ARRAY['QUALITY','MANAGEMENT'], ARRAY['quality:update'], NULL, FALSE, NULL, TRUE),
        ('25000000-0000-4000-9000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), '25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000003', 'Release Quality Record', 'Approve and release quality record', 'quality_qms', ARRAY['QUALITY','MANAGEMENT'], ARRAY['quality:approve'], NULL, TRUE, ARRAY['QUALITY','MANAGEMENT'], TRUE),
        ('25000000-0000-4000-9000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), '25000000-0000-4000-8000-000000000003', '25000000-0000-4000-8000-000000000004', 'Close Quality Record', 'Close released quality record', 'quality_qms', ARRAY['QUALITY','MANAGEMENT'], ARRAY['quality:update'], NULL, FALSE, NULL, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "workflow_transitions" WHERE "workflow_type" = 'quality_qms'`);
    await queryRunner.query(`DELETE FROM "workflow_states" WHERE "workflow_type" = 'quality_qms'`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quality_customer_complaints"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quality_ppap_apqp"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quality_msa_studies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quality_gauges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quality_fmeas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quality_control_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_inspections"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inspection_plans"`);
  }

  private async addColumns(queryRunner: QueryRunner, tableName: string, columns: Array<[string, string]>): Promise<void> {
    for (const [name, type] of columns) {
      await queryRunner.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${name}" ${type}`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_${name}" ON "${tableName}" ("${name}") WHERE "deleted_at" IS NULL`);
    }
  }
}
