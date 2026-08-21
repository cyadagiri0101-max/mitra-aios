import { MigrationInterface, QueryRunner } from 'typeorm';

export class M8KnowledgeEvidence1700000000045 implements MigrationInterface {
  name = 'M8KnowledgeEvidence1700000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create knowledge_article_evidence table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_article_evidence" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "article_id" UUID NOT NULL,
        "chunk_id" UUID NOT NULL,
        "sequence_number" INTEGER NOT NULL DEFAULT 1,
        "citation_label" VARCHAR(30) NOT NULL,
        "source_file" VARCHAR(300) NULL,
        "source_sheet" VARCHAR(100) NULL,
        "source_row" INTEGER NULL,
        "source_page" INTEGER NULL,
        "source_coordinate" VARCHAR(200) NULL,
        "authority_status" VARCHAR(50) NULL,
        "entity_type" VARCHAR(50) NULL,
        "project_number" VARCHAR(50) NULL,
        "content_hash" VARCHAR(64) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        "created_by" VARCHAR(100) NULL,
        "updated_by" VARCHAR(100) NULL,
        CONSTRAINT "PK_knowledge_article_evidence" PRIMARY KEY ("id")
      );
    `);

    // 2. Add Foreign Key constraints safely
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_knowledge_article_evidence_article') THEN
          ALTER TABLE "knowledge_article_evidence"
          ADD CONSTRAINT "FK_knowledge_article_evidence_article"
          FOREIGN KEY ("article_id") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_knowledge_article_evidence_chunk') THEN
          ALTER TABLE "knowledge_article_evidence"
          ADD CONSTRAINT "FK_knowledge_article_evidence_chunk"
          FOREIGN KEY ("chunk_id") REFERENCES "knowledge_chunks"("id") ON DELETE CASCADE;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);

    // 3. Create indexes and unique constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_knowledge_article_evidence_chunk"
      ON "knowledge_article_evidence" ("tenant_id", "article_id", "chunk_id")
      WHERE "deleted_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_knowledge_article_evidence_article"
      ON "knowledge_article_evidence" ("tenant_id", "article_id", "deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_knowledge_article_evidence_chunk"
      ON "knowledge_article_evidence" ("tenant_id", "chunk_id", "deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_article_evidence_chunk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_article_evidence_article"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_knowledge_article_evidence_chunk"`);
    await queryRunner.query(`
      ALTER TABLE "knowledge_article_evidence"
      DROP CONSTRAINT IF EXISTS "FK_knowledge_article_evidence_chunk",
      DROP CONSTRAINT IF EXISTS "FK_knowledge_article_evidence_article";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_article_evidence"`);
  }
}
