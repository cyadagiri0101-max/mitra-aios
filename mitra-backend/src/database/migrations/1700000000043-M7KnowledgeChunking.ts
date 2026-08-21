import { MigrationInterface, QueryRunner } from 'typeorm';

export class M7KnowledgeChunking1700000000043 implements MigrationInterface {
  name = 'M7KnowledgeChunking1700000000043';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "source_id" UUID,
        "source_type" VARCHAR(50) NOT NULL DEFAULT 'DATABASE_RECORD',
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_id" VARCHAR(100) NOT NULL,
        "chunk_type" VARCHAR(50) NOT NULL,
        "chunk_ordinal" INT NOT NULL DEFAULT 0,
        "project_number" VARCHAR(50),
        "project_prefix" VARCHAR(20),
        "customer" VARCHAR(200),
        "machine" VARCHAR(100),
        "material" VARCHAR(100),
        "revision" VARCHAR(30),
        "authority_status" VARCHAR(50) NOT NULL DEFAULT 'AUTHORITATIVE_RELEASE',
        "relative_path" VARCHAR(500),
        "source_file" VARCHAR(300),
        "source_sheet" VARCHAR(100),
        "source_row" INT,
        "source_page" INT,
        "content_hash" VARCHAR(64) NOT NULL,
        "chunk_text" TEXT NOT NULL,
        "structured_metadata" JSONB,
        "embedding_status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        "embedding_model" VARCHAR(100) NOT NULL DEFAULT 'nomic-embed-text',
        "embedded_at" TIMESTAMPTZ,
        "error_reason" TEXT,
        CONSTRAINT "PK_knowledge_chunks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_knowledge_chunks_source" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_knowledge_chunks_tenant_content_hash" ON "knowledge_chunks" ("tenant_id", "content_hash")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_knowledge_chunks_tenant_entity_ordinal" ON "knowledge_chunks" ("tenant_id", "entity_id", "chunk_type", "chunk_ordinal")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_chunks_tenant_project" ON "knowledge_chunks" ("tenant_id", "project_number")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_chunks_tenant_entity_type" ON "knowledge_chunks" ("tenant_id", "entity_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_chunks_tenant_embedding_status" ON "knowledge_chunks" ("tenant_id", "embedding_status")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_chunks"`);
  }
}
