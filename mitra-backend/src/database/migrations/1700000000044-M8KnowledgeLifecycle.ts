import { MigrationInterface, QueryRunner } from 'typeorm';

export class M8KnowledgeLifecycle1700000000044 implements MigrationInterface {
  name = 'M8KnowledgeLifecycle1700000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add M8 lifecycle, revision, and domain linkage columns to knowledge_articles
    await queryRunner.query(`
      ALTER TABLE "knowledge_articles"
      ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "is_latest" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "parent_article_id" UUID NULL,
      ADD COLUMN IF NOT EXISTS "superseded_by_id" UUID NULL,
      ADD COLUMN IF NOT EXISTS "project_id" UUID NULL,
      ADD COLUMN IF NOT EXISTS "decision_id" UUID NULL,
      ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "expires_at" DATE NULL;
    `);

    // 2. Expand status check constraint to include REJECTED, SUPERSEDED, and EXPIRED
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "knowledge_articles" DROP CONSTRAINT IF EXISTS "knowledge_articles_status_check";
        ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_status_check"
          CHECK ("status" IN ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'REJECTED', 'SUPERSEDED', 'EXPIRED', 'ARCHIVED') OR "status" IS NULL);
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);

    // 3. Add foreign key constraints safely
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_knowledge_articles_parent') THEN
          ALTER TABLE "knowledge_articles"
          ADD CONSTRAINT "FK_knowledge_articles_parent"
          FOREIGN KEY ("parent_article_id") REFERENCES "knowledge_articles"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_knowledge_articles_superseded_by') THEN
          ALTER TABLE "knowledge_articles"
          ADD CONSTRAINT "FK_knowledge_articles_superseded_by"
          FOREIGN KEY ("superseded_by_id") REFERENCES "knowledge_articles"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_knowledge_articles_project') THEN
          ALTER TABLE "knowledge_articles"
          ADD CONSTRAINT "FK_knowledge_articles_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_knowledge_articles_decision') THEN
          ALTER TABLE "knowledge_articles"
          ADD CONSTRAINT "FK_knowledge_articles_decision"
          FOREIGN KEY ("decision_id") REFERENCES "engineering_decisions"("id") ON DELETE SET NULL;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);

    // 4. Create performance and lifecycle query indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_articles_tnt_status" ON "knowledge_articles" ("tenant_id", "status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_articles_tnt_is_latest" ON "knowledge_articles" ("tenant_id", "is_latest", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_articles_tnt_project" ON "knowledge_articles" ("tenant_id", "project_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_articles_tnt_decision" ON "knowledge_articles" ("tenant_id", "decision_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_articles_parent" ON "knowledge_articles" ("parent_article_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_articles_superseded_by" ON "knowledge_articles" ("superseded_by_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_articles_superseded_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_articles_parent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_articles_tnt_decision"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_articles_tnt_project"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_articles_tnt_is_latest"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_articles_tnt_status"`);

    // 2. Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "knowledge_articles"
      DROP CONSTRAINT IF EXISTS "FK_knowledge_articles_decision",
      DROP CONSTRAINT IF EXISTS "FK_knowledge_articles_project",
      DROP CONSTRAINT IF EXISTS "FK_knowledge_articles_superseded_by",
      DROP CONSTRAINT IF EXISTS "FK_knowledge_articles_parent";
    `);

    // 3. Revert check constraint to original values
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "knowledge_articles" DROP CONSTRAINT IF EXISTS "knowledge_articles_status_check";
        ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_status_check"
          CHECK ("status" IN ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED') OR "status" IS NULL);
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);

    // 4. Drop added columns
    await queryRunner.query(`
      ALTER TABLE "knowledge_articles"
      DROP COLUMN IF EXISTS "expires_at",
      DROP COLUMN IF EXISTS "rejection_reason",
      DROP COLUMN IF EXISTS "decision_id",
      DROP COLUMN IF EXISTS "project_id",
      DROP COLUMN IF EXISTS "superseded_by_id",
      DROP COLUMN IF EXISTS "parent_article_id",
      DROP COLUMN IF EXISTS "is_latest",
      DROP COLUMN IF EXISTS "version";
    `);
  }
}
