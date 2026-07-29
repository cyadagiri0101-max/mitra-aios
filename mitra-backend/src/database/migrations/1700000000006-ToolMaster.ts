import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MITRA v3.2 — Tool Master
 * ========================
 * Foundational engineering master table. Every historical/engineering
 * record (Blow Mold, Injection Mold, Job Work, Commercial Mold, ALPLA
 * Standard Parts, etc.) is normalized into this single table so that
 * Projects, BOMs, Drawings, Manufacturing, Costing and AI can all
 * reference one source of truth via `tool_number`.
 */
export class ToolMaster1700000000006 implements MigrationInterface {
  name = 'ToolMaster1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tool_master" (
        "id"                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at"        timestamptz  NOT NULL DEFAULT now(),
        "updated_at"        timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"        timestamptz,
        "created_by"        uuid,
        "updated_by"        uuid,
        "tenant_id"         uuid,
        "tool_number"       varchar(30)  NOT NULL UNIQUE,
        "legacy_tool_number" varchar(50),
        "tool_type"         varchar(30)  NOT NULL DEFAULT 'BLOW_MOLD'
          CHECK ("tool_type" IN ('BLOW_MOLD','INJECTION_MOLD','JOB_WORK','COMMERCIAL_MOLD','ALPLA_STD_PART')),
        "description"       text,
        "project_id"        uuid,
        "customer_name"     varchar(200),
        "machine"           varchar(100),
        "cavity"            varchar(50),
        "volume"            varchar(50),
        "neck_type"         varchar(50),
        "neck_material"     varchar(100),
        "body_material"     varchar(100),
        "base_material"     varchar(100),
        "inserts_cost"      numeric(18,2),
        "mask_parts_cost"   numeric(18,2),
        "mold_base_cost"    numeric(18,2),
        "std_part_cost"     numeric(18,2),
        "fasteners_cost"    numeric(18,2),
        "elec_cost"         numeric(18,2),
        "alpla_std_parts_cost" numeric(18,2),
        "wooden_box_cost"   numeric(18,2),
        "total_cost"        numeric(18,2),
        "status"            varchar(50),
        "dispatch_date"     date,
        "source_file"       varchar(255),
        "source_sheet"      varchar(100),
        "metadata"          jsonb
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_master_tenant_id" ON "tool_master" ("tenant_id") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_master_tool_type" ON "tool_master" ("tool_type") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_master_project_id" ON "tool_master" ("project_id") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_master_customer_name" ON "tool_master" ("customer_name") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_master_legacy_tool_number" ON "tool_master" ("legacy_tool_number") WHERE "deleted_at" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tool_master" CASCADE`);
  }
}
