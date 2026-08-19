import { MigrationInterface, QueryRunner } from 'typeorm';

export class M2Sprint2BaselinesCapacity1700000000039 implements MigrationInterface {
  name = 'M2Sprint2BaselinesCapacity1700000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Table: schedule_baselines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedule_baselines" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "baseline_number" VARCHAR(50) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "version" INT NOT NULL DEFAULT 1,
        "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        "reason" TEXT,
        "effective_date" DATE,
        "total_planned_duration_days" NUMERIC(6,2) NOT NULL DEFAULT 0.00,
        "total_planned_hours" NUMERIC(8,2) NOT NULL DEFAULT 0.00,
        "planned_start_date" DATE,
        "planned_finish_date" DATE,
        "is_locked" BOOLEAN NOT NULL DEFAULT false,
        "activated_at" TIMESTAMP WITH TIME ZONE,
        "activated_by" UUID,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" UUID,
        "updated_by" UUID
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_schedule_baselines_num_tenant"
      ON "schedule_baselines" ("project_id", "baseline_number", "tenant_id")
      WHERE "deleted_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_schedule_baselines_proj_status"
      ON "schedule_baselines" ("project_id", "status", "tenant_id");
    `);

    // 2. Table: schedule_baseline_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedule_baseline_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "baseline_id" UUID NOT NULL REFERENCES "schedule_baselines"("id") ON DELETE CASCADE,
        "project_id" UUID NOT NULL,
        "item_type" VARCHAR(30) NOT NULL DEFAULT 'TASK',
        "source_id" UUID,
        "title" VARCHAR(300) NOT NULL,
        "stage_code" VARCHAR(50),
        "sequence" INT NOT NULL DEFAULT 1,
        "planned_start_date" DATE,
        "planned_finish_date" DATE,
        "duration_days" NUMERIC(6,2) NOT NULL DEFAULT 0.00,
        "planned_hours" NUMERIC(8,2) NOT NULL DEFAULT 0.00,
        "assigned_resource_id" UUID,
        "assigned_resource_name" VARCHAR(200),
        "is_critical_path" BOOLEAN NOT NULL DEFAULT false,
        "dependencies" JSONB,
        "metadata" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" UUID,
        "updated_by" UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_schedule_baseline_items_base_seq"
      ON "schedule_baseline_items" ("baseline_id", "sequence");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_schedule_baseline_items_proj_type"
      ON "schedule_baseline_items" ("project_id", "item_type", "tenant_id");
    `);

    // 3. Permissions
    const permissions = [
      { resource: 'baseline', action: 'read', description: 'Read schedule baselines' },
      { resource: 'baseline', action: 'create', description: 'Create schedule baselines' },
      { resource: 'baseline', action: 'update', description: 'Update schedule baselines' },
      { resource: 'baseline', action: 'activate', description: 'Activate schedule baselines' },
      { resource: 'baseline', action: 'compare', description: 'Compare baseline variance' },
      { resource: 'baseline', action: 'delete', description: 'Delete schedule baselines' },
      { resource: 'capacity', action: 'read', description: 'Read capacity intelligence' },
      { resource: 'capacity', action: 'simulate', description: 'Run what-if capacity simulations' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("resource", "action", "description")
         VALUES ($1, $2, $3)
         ON CONFLICT ("resource", "action") DO NOTHING;`,
        [p.resource, p.action, p.description],
      );
    }

    // Map permissions to ADMIN, MANAGEMENT, DESIGN, PLANNING
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('ADMIN', 'MANAGEMENT')
        AND p.resource IN ('baseline', 'capacity')
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('DESIGN', 'PLANNING')
        AND p.resource IN ('baseline', 'capacity')
        AND p.action IN ('read', 'create', 'update', 'activate', 'compare', 'simulate')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule_baseline_items" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule_baselines" CASCADE;`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "resource" IN ('baseline', 'capacity');`);
  }
}
