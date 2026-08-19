import { MigrationInterface, QueryRunner } from 'typeorm';

export class M3EngineeringKernel1700000000040 implements MigrationInterface {
  name = 'M3EngineeringKernel1700000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add decision_id to engineering_change_requests
    await queryRunner.query(`
      ALTER TABLE "engineering_change_requests"
      ADD COLUMN IF NOT EXISTS "decision_id" uuid NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ecr_decision_id"
      ON "engineering_change_requests" ("decision_id");
    `);

    // 2. Add decision_id to engineering_change_orders
    await queryRunner.query(`
      ALTER TABLE "engineering_change_orders"
      ADD COLUMN IF NOT EXISTS "decision_id" uuid NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eco_decision_id"
      ON "engineering_change_orders" ("decision_id");
    `);

    // 3. Seed M3 Permissions
    const permissions = [
      {
        resource: 'engineering',
        action: 'review_decide',
        description: 'Approve, reject, or request changes on engineering reviews',
      },
      {
        resource: 'engineering',
        action: 'release_freeze',
        description: 'Freeze engineering design artifacts before release',
      },
      {
        resource: 'engineering',
        action: 'release_approve',
        description: 'Formally release engineering drawings, BOMs, and process plans',
      },
      {
        resource: 'capacity',
        action: 'leveling_analyze',
        description: 'Analyze multi-project capacity bottlenecks and simulate leveling',
      },
      {
        resource: 'capacity',
        action: 'leveling_apply',
        description: 'Apply approved capacity leveling actions to production schedules',
      },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("resource", "action", "description")
         VALUES ($1, $2, $3)
         ON CONFLICT ("resource", "action") DO NOTHING;`,
        [p.resource, p.action, p.description],
      );
    }

    // Grant permissions to roles
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('ADMIN', 'MANAGEMENT')
        AND (
          (p.resource = 'engineering' AND p.action IN ('review_decide', 'release_freeze', 'release_approve'))
          OR (p.resource = 'capacity' AND p.action IN ('leveling_analyze', 'leveling_apply'))
        )
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'DESIGN'
        AND (
          (p.resource = 'engineering' AND p.action IN ('review_decide', 'release_freeze'))
          OR (p.resource = 'capacity' AND p.action = 'leveling_analyze')
        )
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'PLANNING'
        AND p.resource = 'capacity' AND p.action IN ('leveling_analyze', 'leveling_apply')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_eco_decision_id"`);
    await queryRunner.query(`ALTER TABLE "engineering_change_orders" DROP COLUMN IF EXISTS "decision_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ecr_decision_id"`);
    await queryRunner.query(`ALTER TABLE "engineering_change_requests" DROP COLUMN IF EXISTS "decision_id"`);
  }
}
