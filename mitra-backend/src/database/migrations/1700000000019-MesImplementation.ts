import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// MITRA v3.5 — Sprint 2.4: Manufacturing Execution System (MES)
//
// Extends the existing Engineering domain — no duplicated engineering data.
// Manufacturing consumes released Engineering artifacts (drawings, BOMs,
// routings, process plans) exclusively.
//
//   • ALTER work_orders  : status CHECK extended (PAUSED/REWORK/SCRAPPED),
//                          release snapshot jsonb + cost baseline + qty cols
//   • ALTER job_cards    : status CHECK extended, qty/time/hold capture cols
//   • ALTER operation_logs: job_card_id + operation_id links, rework/scrap/setup
//   • NEW inspection_checkpoints : auto-generated at WO release from routing
//                          quality checkpoints (Phase 9)
//   • NEW material_reservations : planned/reserved/issued vs released BOM items
//                          (Phase 6)
//   • NEW ncr_records    : non-conformance from production (Phase 9)
//   • SEED workflows     : manufacturing_work_order (9 states / 14 transitions)
//                          + manufacturing_job (8 states / 9 transitions) in the
//                          existing DB-driven workflow engine (Phase 3)
//   • SEED permissions   : manufacturing:* + quality:ncr grants (Phases 10/12)
// ─────────────────────────────────────────────────────────────────────────────

export class MesImplementation1700000000019 implements MigrationInterface {
  name = 'MesImplementation1700000000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════════════════
    // work_orders — execution package (Phase 2)
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "work_orders_status_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "work_orders"
        ADD CONSTRAINT "work_orders_status_check"
        CHECK ("status" IN ('DRAFT','RELEASED','IN_PROGRESS','PAUSED','ON_HOLD','REWORK','COMPLETED','CANCELLED','SCRAPPED') OR "status" IS NULL)
    `);
    await queryRunner.query(`
      ALTER TABLE "work_orders"
        ADD COLUMN IF NOT EXISTS "snapshot" JSONB,
        ADD COLUMN IF NOT EXISTS "cost_baseline" NUMERIC(18,2),
        ADD COLUMN IF NOT EXISTS "rework_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "scrap_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "released_by" UUID,
        ADD COLUMN IF NOT EXISTS "released_at" TIMESTAMPTZ
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // job_cards — shop floor execution packages (Phase 3/5)
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "job_cards" DROP CONSTRAINT IF EXISTS "job_cards_status_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "job_cards"
        ADD CONSTRAINT "job_cards_status_check"
        CHECK ("status" IN ('OPEN','IN_PROGRESS','PAUSED','ON_HOLD','REWORK','COMPLETED','CANCELLED','SCRAPPED') OR "status" IS NULL)
    `);
    await queryRunner.query(`
      ALTER TABLE "job_cards"
        ADD COLUMN IF NOT EXISTS "operation_number" INT,
        ADD COLUMN IF NOT EXISTS "operation_code" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "produced_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "rejected_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "rework_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "scrap_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "setup_time_minutes" INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "downtime_minutes" INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "hold_reason" TEXT
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jc_op_number" ON "job_cards" ("operation_number", "deleted_at")
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // operation_logs — shop floor capture (Phase 3/5)
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "operation_logs"
        ADD COLUMN IF NOT EXISTS "job_card_id" UUID,
        ADD COLUMN IF NOT EXISTS "operation_id" UUID,
        ADD COLUMN IF NOT EXISTS "rework_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "scrap_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "setup_time_minutes" INT NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ol_job_card" ON "operation_logs" ("job_card_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ol_operation" ON "operation_logs" ("operation_id", "deleted_at")`);

    // ═══════════════════════════════════════════════════════════════════════
    // inspection_checkpoints — auto-generated from routing quality checkpoints
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inspection_checkpoints" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "checkpoint_number" VARCHAR(20) NOT NULL,
        "work_order_id" UUID NOT NULL,
        "operation_id" UUID,
        "operation_number" INT,
        "operation_code" VARCHAR(20),
        "checkpoint_name" VARCHAR(200),
        "description" TEXT,
        "dimension" VARCHAR(100),
        "tolerance" VARCHAR(100),
        "instrument" VARCHAR(100),
        "method" VARCHAR(100),
        "is_critical" BOOLEAN NOT NULL DEFAULT false,
        "status" VARCHAR(20) CHECK ("status" IN ('PENDING','PASS','FAIL','SKIP','NA') OR "status" IS NULL) NOT NULL DEFAULT 'PENDING',
        "measured_value" VARCHAR(100),
        "inspected_by" UUID,
        "inspected_at" TIMESTAMPTZ,
        "inspection_report_id" UUID,
        "remarks" TEXT,
        CONSTRAINT "PK_inspection_checkpoints" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_icp_wo" ON "inspection_checkpoints" ("work_order_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_icp_status" ON "inspection_checkpoints" ("status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_icp_report" ON "inspection_checkpoints" ("inspection_report_id", "deleted_at")`);

    // ═══════════════════════════════════════════════════════════════════════
    // material_reservations — Phase 6
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_reservations" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "reservation_number" VARCHAR(30) NOT NULL UNIQUE,
        "work_order_id" UUID NOT NULL,
        "bom_item_id" UUID,
        "part_number" VARCHAR(100),
        "part_name" VARCHAR(200),
        "uom" VARCHAR(20) NOT NULL DEFAULT 'KG',
        "planned_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        "reserved_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        "issued_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
        "status" VARCHAR(20) CHECK ("status" IN ('RESERVED','PARTIALLY_ISSUED','ISSUED','RELEASED','CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'RESERVED',
        "batch_id" UUID,
        "store_location" VARCHAR(50),
        "remarks" TEXT,
        CONSTRAINT "PK_material_reservations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mr_wo" ON "material_reservations" ("work_order_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mr_item" ON "material_reservations" ("bom_item_id", "deleted_at")`);

    // ═══════════════════════════════════════════════════════════════════════
    // ncr_records — non-conformance from production (Phase 9)
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ncr_records" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "ncr_number" VARCHAR(30) NOT NULL UNIQUE,
        "project_id" UUID,
        "work_order_id" UUID,
        "operation_id" UUID,
        "inspection_report_id" UUID,
        "part_id" UUID,
        "drawing_id" UUID,
        "bom_item_id" UUID,
        "machine_id" UUID,
        "operator_id" UUID,
        "ncr_type" VARCHAR(20) CHECK ("ncr_type" IN ('INTERNAL','CUSTOMER','SUPPLIER') OR "ncr_type" IS NULL) NOT NULL DEFAULT 'INTERNAL',
        "severity" VARCHAR(20) CHECK ("severity" IN ('MINOR','MAJOR','CRITICAL') OR "severity" IS NULL) NOT NULL DEFAULT 'MAJOR',
        "description" TEXT NOT NULL,
        "detected_qty" NUMERIC(10,3),
        "rejected_qty" NUMERIC(10,3),
        "root_cause" TEXT,
        "disposition" VARCHAR(30) CHECK ("disposition" IN ('USE_AS_IS','REWORK','SCRAP','RETURN','REJECT','OTHER') OR "disposition" IS NULL),
        "status" VARCHAR(20) CHECK ("status" IN ('OPEN','INVESTIGATION','ACTION','VERIFIED','CLOSED') OR "status" IS NULL) NOT NULL DEFAULT 'OPEN',
        "closed_at" TIMESTAMPTZ,
        CONSTRAINT "PK_ncr_records" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ncr_wo" ON "ncr_records" ("work_order_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ncr_status" ON "ncr_records" ("status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ncr_project" ON "ncr_records" ("project_id", "deleted_at")`);

    // ═══════════════════════════════════════════════════════════════════════
    // manufacturing_work_order workflow (Phase 3 — database-driven)
    // DRAFT → RELEASED → IN_PROGRESS ⇄ PAUSED / ON_HOLD / REWORK
    //                    → COMPLETED | CANCELLED | SCRAPPED
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "workflow_states" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "name", "state_code", "description", "category", "workflow_type", "is_initial", "is_final", "sort_order", "color", "icon")
      VALUES
        ('a1000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Draft', 'DRAFT', 'Work order drafted', 'MANUFACTURING', 'manufacturing_work_order', TRUE, FALSE, 1, '#6B7280', NULL),
        ('a1000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Released', 'RELEASED', 'Work order released — immutable execution package', 'MANUFACTURING', 'manufacturing_work_order', FALSE, FALSE, 2, '#10B981', NULL),
        ('a1000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'In Progress', 'IN_PROGRESS', 'Execution in progress', 'MANUFACTURING', 'manufacturing_work_order', FALSE, FALSE, 3, '#3B82F6', NULL),
        ('a1000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Paused', 'PAUSED', 'Execution paused', 'MANUFACTURING', 'manufacturing_work_order', FALSE, FALSE, 4, '#F59E0B', NULL),
        ('a1000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'On Hold', 'ON_HOLD', 'Work order on hold', 'MANUFACTURING', 'manufacturing_work_order', FALSE, FALSE, 5, '#F97316', NULL),
        ('a1000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Rework', 'REWORK', 'Rework required', 'MANUFACTURING', 'manufacturing_work_order', FALSE, FALSE, 6, '#A855F7', NULL),
        ('a1000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Completed', 'COMPLETED', 'Work order completed', 'MANUFACTURING', 'manufacturing_work_order', FALSE, TRUE, 7, '#10B981', NULL),
        ('a1000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Cancelled', 'CANCELLED', 'Work order cancelled', 'MANUFACTURING', 'manufacturing_work_order', FALSE, TRUE, 8, '#EF4444', NULL),
        ('a1000000-0000-4000-8000-000000000009', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Scrapped', 'SCRAPPED', 'Work order scrapped', 'MANUFACTURING', 'manufacturing_work_order', FALSE, TRUE, 9, '#9CA3AF', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "workflow_transitions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "from_state_id", "to_state_id", "name", "description", "workflow_type", "required_roles", "required_permissions", "conditions", "requires_approval", "approval_roles", "is_active")
      VALUES
        ('b2000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'Release Work Order', 'Snapshot artifacts — freeze execution package', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:release'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'Start Work Order', 'Start execution', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:start'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004', 'Pause Work Order', 'Pause execution', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:pause'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003', 'Resume Work Order', 'Resume execution', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:resume'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000005', 'Hold Work Order', 'Place on hold', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:hold'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000003', 'Resume from Hold', 'Resume from hold', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:resume'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000006', 'Request Rework', 'Rework required', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:rework'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000006', 'Rework from Hold', 'Rework from hold', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:rework'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000009', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000007', 'Complete Work Order', 'Complete execution', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:complete'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000010', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000007', 'Complete after Rework', 'Complete after rework', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:complete'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000011', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000008', 'Cancel Work Order', 'Cancel draft', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:cancel'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000012', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000008', 'Cancel Released Work Order', 'Cancel released work order', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:cancel'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000013', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000009', 'Scrap Work Order', 'Scrap work order', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:scrap'], NULL, FALSE, NULL, TRUE),
        ('b2000000-0000-4000-8000-000000000014', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'a1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000009', 'Scrap after Rework', 'Scrap after rework', 'manufacturing_work_order', NULL, ARRAY['manufacturing:work_order:scrap'], NULL, FALSE, NULL, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // manufacturing_job workflow (Phase 3)
    // OPEN → IN_PROGRESS ⇄ PAUSED / ON_HOLD / REWORK
    //      → COMPLETED | CANCELLED | SCRAPPED
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "workflow_states" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "name", "state_code", "description", "category", "workflow_type", "is_initial", "is_final", "sort_order", "color", "icon")
      VALUES
        ('c3000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Open', 'OPEN', 'Job card open', 'MANUFACTURING', 'manufacturing_job', TRUE, FALSE, 1, '#6B7280', NULL),
        ('c3000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'In Progress', 'IN_PROGRESS', 'Job in progress', 'MANUFACTURING', 'manufacturing_job', FALSE, FALSE, 2, '#3B82F6', NULL),
        ('c3000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Paused', 'PAUSED', 'Job paused', 'MANUFACTURING', 'manufacturing_job', FALSE, FALSE, 3, '#F59E0B', NULL),
        ('c3000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'On Hold', 'ON_HOLD', 'Job on hold', 'MANUFACTURING', 'manufacturing_job', FALSE, FALSE, 4, '#F97316', NULL),
        ('c3000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Rework', 'REWORK', 'Job rework', 'MANUFACTURING', 'manufacturing_job', FALSE, FALSE, 5, '#A855F7', NULL),
        ('c3000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Completed', 'COMPLETED', 'Job completed', 'MANUFACTURING', 'manufacturing_job', FALSE, TRUE, 6, '#10B981', NULL),
        ('c3000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Cancelled', 'CANCELLED', 'Job cancelled', 'MANUFACTURING', 'manufacturing_job', FALSE, TRUE, 7, '#EF4444', NULL),
        ('c3000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'Scrapped', 'SCRAPPED', 'Job scrapped', 'MANUFACTURING', 'manufacturing_job', FALSE, TRUE, 8, '#9CA3AF', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "workflow_transitions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "from_state_id", "to_state_id", "name", "description", "workflow_type", "required_roles", "required_permissions", "conditions", "requires_approval", "approval_roles", "is_active")
      VALUES
        ('d4000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000002', 'Start Job', 'Start job execution', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:start'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000003', 'Pause Job', 'Pause job', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:pause'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000003', 'c3000000-0000-4000-8000-000000000002', 'Resume Job', 'Resume job', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:resume'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000004', 'Hold Job', 'Place job on hold', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:hold'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000004', 'c3000000-0000-4000-8000-000000000002', 'Resume Job from Hold', 'Resume job from hold', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:resume'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000005', 'Request Job Rework', 'Job rework required', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:rework'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000005', 'c3000000-0000-4000-8000-000000000002', 'Resume Rework Job', 'Resume rework job', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:resume'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000006', 'Complete Job', 'Complete job', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:complete'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000009', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000007', 'Cancel Job', 'Cancel open job', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:cancel'], NULL, FALSE, NULL, TRUE),
        ('d4000000-0000-4000-8000-000000000010', now(), now(), NULL, NULL, NULL, (SELECT id FROM tenants WHERE code = 'DEFAULT' LIMIT 1), 'c3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000008', 'Scrap Job', 'Scrap job', 'manufacturing_job', NULL, ARRAY['manufacturing:job_card:scrap'], NULL, FALSE, NULL, TRUE)
      ON CONFLICT ("id") DO NOTHING
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // RBAC: permissions + role grants (Phases 10/12)
    // ═══════════════════════════════════════════════════════════════════════
    const permissions: { resource: string; action: string }[] = [
      { resource: 'manufacturing:work_order', action: 'snapshot' },
      { resource: 'manufacturing:work_order', action: 'release' },
      { resource: 'manufacturing:work_order', action: 'start' },
      { resource: 'manufacturing:work_order', action: 'pause' },
      { resource: 'manufacturing:work_order', action: 'resume' },
      { resource: 'manufacturing:work_order', action: 'hold' },
      { resource: 'manufacturing:work_order', action: 'rework' },
      { resource: 'manufacturing:work_order', action: 'complete' },
      { resource: 'manufacturing:work_order', action: 'cancel' },
      { resource: 'manufacturing:work_order', action: 'scrap' },
      { resource: 'manufacturing:job_card', action: 'create' },
      { resource: 'manufacturing:job_card', action: 'read' },
      { resource: 'manufacturing:job_card', action: 'update' },
      { resource: 'manufacturing:job_card', action: 'delete' },
      { resource: 'manufacturing:job_card', action: 'start' },
      { resource: 'manufacturing:job_card', action: 'pause' },
      { resource: 'manufacturing:job_card', action: 'resume' },
      { resource: 'manufacturing:job_card', action: 'hold' },
      { resource: 'manufacturing:job_card', action: 'complete' },
      { resource: 'manufacturing:job_card', action: 'cancel' },
      { resource: 'manufacturing:job_card', action: 'rework' },
      { resource: 'manufacturing:job_card', action: 'scrap' },
      { resource: 'manufacturing:machine', action: 'create' },
      { resource: 'manufacturing:machine', action: 'read' },
      { resource: 'manufacturing:machine', action: 'update' },
      { resource: 'manufacturing:machine', action: 'delete' },
      { resource: 'manufacturing:machine', action: 'maintain' },
      { resource: 'manufacturing:machine', action: 'calendar' },
      { resource: 'manufacturing:machine', action: 'queue' },
      { resource: 'manufacturing:schedule', action: 'read' },
      { resource: 'manufacturing:schedule', action: 'write' },
      { resource: 'manufacturing:schedule', action: 'book' },
      { resource: 'manufacturing:schedule', action: 'assign' },
      { resource: 'manufacturing:material', action: 'read' },
      { resource: 'manufacturing:material', action: 'reserve' },
      { resource: 'manufacturing:material', action: 'issue' },
      { resource: 'manufacturing:material', action: 'consume' },
      { resource: 'manufacturing:material', action: 'variance' },
      { resource: 'manufacturing:production', action: 'read' },
      { resource: 'manufacturing:production', action: 'track' },
      { resource: 'manufacturing:inspection', action: 'read' },
      { resource: 'manufacturing:inspection', action: 'record' },
      { resource: 'manufacturing:event', action: 'read' },
      { resource: 'manufacturing:event', action: 'relay' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [p.resource, p.action],
      );
    }

    const wo = (a: string) => `manufacturing:work_order:${a}`;
    const jc = (a: string) => `manufacturing:job_card:${a}`;
    const mc = (a: string) => `manufacturing:machine:${a}`;
    const sc = (a: string) => `manufacturing:schedule:${a}`;
    const mt = (a: string) => `manufacturing:material:${a}`;
    const pr = (a: string) => `manufacturing:production:${a}`;
    const ins = (a: string) => `manufacturing:inspection:${a}`;
    const ev = (a: string) => `manufacturing:event:${a}`;

    const FULL_P = [
      wo('snapshot'), wo('release'), wo('start'), wo('pause'), wo('resume'), wo('hold'),
      wo('rework'), wo('complete'), wo('cancel'), wo('scrap'),
      jc('create'), jc('read'), jc('update'), jc('delete'), jc('start'), jc('pause'),
      jc('resume'), jc('hold'), jc('complete'), jc('cancel'), jc('rework'), jc('scrap'),
      mc('create'), mc('read'), mc('update'), mc('delete'), mc('maintain'), mc('calendar'), mc('queue'),
      sc('read'), sc('write'), sc('book'), sc('assign'),
      mt('read'), mt('reserve'), mt('issue'), mt('consume'), mt('variance'),
      pr('read'), pr('track'), ins('read'), ins('record'), ev('read'), ev('relay'),
    ];
    const READ_P = [
      wo('read'), jc('read'), mc('read'), sc('read'), mt('read'), pr('read'), ins('read'), ev('read'),
    ];
    const PLANNING_P = [
      wo('create'), wo('update'), wo('read'), wo('snapshot'), wo('release'), wo('cancel'),
      jc('create'), jc('read'), jc('update'), jc('delete'),
      mc('read'), mc('calendar'), mc('queue'),
      sc('read'), sc('write'), sc('book'), sc('assign'),
      mt('read'), mt('reserve'), pr('read'), ins('read'), ev('read'),
    ];
    const PRODUCTION_P = [
      wo('read'), wo('start'), wo('pause'), wo('resume'), wo('hold'), wo('rework'),
      wo('complete'), wo('cancel'), wo('scrap'),
      jc('read'), jc('update'), jc('start'), jc('pause'), jc('resume'), jc('hold'),
      jc('complete'), jc('cancel'), jc('rework'), jc('scrap'),
      mc('read'), mc('queue'), sc('read'),
      mt('read'), mt('issue'), mt('consume'), mt('variance'),
      pr('read'), pr('track'), ins('read'), ins('record'), ev('read'),
    ];
    const QUALITY_P = [
      wo('read'), jc('read'), mc('read'), sc('read'), mt('read'), mt('variance'),
      pr('read'), ins('read'), ins('record'), ev('read'),
    ];
    const CUSTOMER_P = [
      wo('read'), jc('read'), mc('read'), sc('read'), mt('read'), pr('read'), ins('read'), ev('read'),
    ];

    const upperMatrix: Record<string, string[]> = {
      ADMIN: [...FULL_P, ...QUALITY_P],
      MANAGEMENT: [...FULL_P, ...QUALITY_P],
      SALES: [...READ_P],
      DESIGN: [...READ_P],
      PLANNING: [...PLANNING_P, ...READ_P],
      PRODUCTION: [...PRODUCTION_P, ...READ_P],
      QUALITY: [...QUALITY_P, ...READ_P],
      CUSTOMER: [...CUSTOMER_P],
    };
    const lowerMatrix: Record<string, string[]> = {
      admin: [...FULL_P, ...QUALITY_P],
      manager: [...FULL_P, ...QUALITY_P],
      sales_rep: [...READ_P],
      project_lead: [...PLANNING_P, ...READ_P],
      engineer: [...READ_P],
      production_planner: [...PLANNING_P, ...READ_P],
      operator: [...PRODUCTION_P, ...READ_P],
      qa_inspector: [...QUALITY_P, ...READ_P],
      qa_engineer: [...QUALITY_P, ...READ_P],
      service_tech: [...PRODUCTION_P, ...READ_P],
      viewer: [...CUSTOMER_P],
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
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ncr_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "material_reservations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inspection_checkpoints"`);

    await queryRunner.query(`
      ALTER TABLE "operation_logs"
        DROP COLUMN IF EXISTS "job_card_id", DROP COLUMN IF EXISTS "operation_id",
        DROP COLUMN IF EXISTS "rework_qty", DROP COLUMN IF EXISTS "scrap_qty",
        DROP COLUMN IF EXISTS "setup_time_minutes"
    `);
    await queryRunner.query(`
      ALTER TABLE "job_cards"
        DROP COLUMN IF EXISTS "operation_number", DROP COLUMN IF EXISTS "operation_code",
        DROP COLUMN IF EXISTS "produced_qty", DROP COLUMN IF EXISTS "rejected_qty",
        DROP COLUMN IF EXISTS "rework_qty", DROP COLUMN IF EXISTS "scrap_qty",
        DROP COLUMN IF EXISTS "setup_time_minutes", DROP COLUMN IF EXISTS "downtime_minutes",
        DROP COLUMN IF EXISTS "started_at", DROP COLUMN IF EXISTS "completed_at",
        DROP COLUMN IF EXISTS "hold_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE "work_orders"
        DROP COLUMN IF EXISTS "snapshot", DROP COLUMN IF EXISTS "cost_baseline",
        DROP COLUMN IF EXISTS "rework_qty", DROP COLUMN IF EXISTS "scrap_qty",
        DROP COLUMN IF EXISTS "released_by", DROP COLUMN IF EXISTS "released_at"
    `);

    const newPerms: { resource: string; action: string }[] = [
      { resource: 'manufacturing:work_order', action: 'snapshot' },
      { resource: 'manufacturing:work_order', action: 'release' },
      { resource: 'manufacturing:work_order', action: 'start' },
      { resource: 'manufacturing:work_order', action: 'pause' },
      { resource: 'manufacturing:work_order', action: 'resume' },
      { resource: 'manufacturing:work_order', action: 'hold' },
      { resource: 'manufacturing:work_order', action: 'rework' },
      { resource: 'manufacturing:work_order', action: 'complete' },
      { resource: 'manufacturing:work_order', action: 'cancel' },
      { resource: 'manufacturing:work_order', action: 'scrap' },
      { resource: 'manufacturing:job_card', action: 'create' },
      { resource: 'manufacturing:job_card', action: 'read' },
      { resource: 'manufacturing:job_card', action: 'update' },
      { resource: 'manufacturing:job_card', action: 'delete' },
      { resource: 'manufacturing:job_card', action: 'start' },
      { resource: 'manufacturing:job_card', action: 'pause' },
      { resource: 'manufacturing:job_card', action: 'resume' },
      { resource: 'manufacturing:job_card', action: 'hold' },
      { resource: 'manufacturing:job_card', action: 'complete' },
      { resource: 'manufacturing:job_card', action: 'cancel' },
      { resource: 'manufacturing:job_card', action: 'rework' },
      { resource: 'manufacturing:job_card', action: 'scrap' },
      { resource: 'manufacturing:machine', action: 'create' },
      { resource: 'manufacturing:machine', action: 'read' },
      { resource: 'manufacturing:machine', action: 'update' },
      { resource: 'manufacturing:machine', action: 'delete' },
      { resource: 'manufacturing:machine', action: 'maintain' },
      { resource: 'manufacturing:machine', action: 'calendar' },
      { resource: 'manufacturing:machine', action: 'queue' },
      { resource: 'manufacturing:schedule', action: 'read' },
      { resource: 'manufacturing:schedule', action: 'write' },
      { resource: 'manufacturing:schedule', action: 'book' },
      { resource: 'manufacturing:schedule', action: 'assign' },
      { resource: 'manufacturing:material', action: 'read' },
      { resource: 'manufacturing:material', action: 'reserve' },
      { resource: 'manufacturing:material', action: 'issue' },
      { resource: 'manufacturing:material', action: 'consume' },
      { resource: 'manufacturing:material', action: 'variance' },
      { resource: 'manufacturing:production', action: 'read' },
      { resource: 'manufacturing:production', action: 'track' },
      { resource: 'manufacturing:inspection', action: 'read' },
      { resource: 'manufacturing:inspection', action: 'record' },
      { resource: 'manufacturing:event', action: 'read' },
      { resource: 'manufacturing:event', action: 'relay' },
    ];
    for (const p of newPerms) {
      await queryRunner.query(
        `DELETE FROM "role_permissions"
         WHERE "permission_id" IN (SELECT id FROM permissions WHERE resource = $1 AND action = $2)`,
        [p.resource, p.action],
      );
      await queryRunner.query(
        `DELETE FROM "permissions" WHERE resource = $1 AND action = $2`,
        [p.resource, p.action],
      );
    }
  }
}
