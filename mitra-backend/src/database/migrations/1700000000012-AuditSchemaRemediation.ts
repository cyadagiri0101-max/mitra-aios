import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AuditSchemaRemediation — Sprint 2.1.1 (C-2 remediation)
 *
 * The AuditLog entity declares `event_type` (NOT NULL, default 'CRUD') but no
 * migration ever created the column. With synchronize:false every audit insert
 * fails at runtime. This forward-only migration:
 *   1. Creates the TypeORM-named enum type (audit_logs_event_type_enum).
 *   2. Adds the event_type column with a safe default for existing rows.
 *   3. Backfills existing rows with 'CRUD' (their actions predate the
 *      event-type taxonomy) and verifies no NULLs remain.
 */
export class AuditSchemaRemediation1700000000012 implements MigrationInterface {
  name = 'AuditSchemaRemediation1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enum type (idempotent — matches TypeORM naming: table_column_enum)
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "audit_logs_event_type_enum" AS ENUM ('CRUD', 'AUTH', 'AI', 'BUSINESS');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 2. Column — NOT NULL with default so existing rows are backfilled to 'CRUD'
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD COLUMN IF NOT EXISTS "event_type" "audit_logs_event_type_enum" NOT NULL DEFAULT 'CRUD'
    `);

    // 3. Validate existing data: no NULLs may remain (column is NOT NULL,
    //    but guard against any legacy rows that bypassed the default).
    await queryRunner.query(`
      UPDATE "audit_logs" SET "event_type" = 'CRUD' WHERE "event_type" IS NULL
    `);
    const bad = await queryRunner.query(`
      SELECT COUNT(*) AS cnt FROM "audit_logs" WHERE "event_type" IS NULL
    `);
    if (Number(bad?.[0]?.cnt ?? 0) > 0) {
      throw new Error('[MITRA] audit_logs.event_type contains NULLs — backfill failed');
    }

    // 4. Index for event-type scoped queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_event_type_date"
        ON "audit_logs" ("event_type", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_event_type_date"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "event_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_logs_event_type_enum"`);
  }
}
