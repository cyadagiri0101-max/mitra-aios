import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 003 — Dispatch Plans
 *
 * Creates the dispatch_plans table for tracking mold dispatch & logistics.
 * Follows the same soft-delete pattern as all other MITRA tables.
 */
export class DispatchPlans1700000000003 implements MigrationInterface {
  name = 'DispatchPlans1700000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dispatch_plans" (
        "id"               UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"       TIMESTAMPTZ,
        "tenant_id"        UUID,
        "created_by"       UUID,
        "updated_by"       UUID,
        "dispatch_number"  VARCHAR(30)  NOT NULL,
        "project_id"       UUID,
        "customer_name"    VARCHAR(200) NOT NULL,
        "status"           VARCHAR(20)  NOT NULL DEFAULT 'PLANNING',
        "carrier"          VARCHAR(200),
        "tracking_number"  VARCHAR(100),
        "planned_date"     DATE,
        "shipped_date"     DATE,
        "delivered_date"   DATE,
        "packing_list"     JSONB,
        "notes"            TEXT,
        CONSTRAINT "PK_dispatch_plans"         PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dispatch_number"        UNIQUE ("dispatch_number"),
        CONSTRAINT "CHK_dispatch_status" CHECK (
          "status" IN ('PLANNING','PACKED','SHIPPED','DELIVERED','CANCELLED')
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dp_tenant_del"
        ON "dispatch_plans" ("tenant_id", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dp_project_del"
        ON "dispatch_plans" ("project_id", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dp_status"
        ON "dispatch_plans" ("status") WHERE "deleted_at" IS NULL
    `);

    console.info('[Migration003] ✅ dispatch_plans table created');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dispatch_plans"`);
  }
}
