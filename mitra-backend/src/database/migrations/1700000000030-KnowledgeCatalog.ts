import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeCatalog1700000000030 implements MigrationInterface {
  name = 'KnowledgeCatalog1700000000030';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_catalog" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_id" UUID NOT NULL,
        "title" VARCHAR(300) NOT NULL,
        "summary" TEXT,
        "source_domain" VARCHAR(80) NOT NULL,
        "source_ref" JSONB,
        "tags" JSONB,
        "search_text" TEXT,
        "last_indexed_at" TIMESTAMPTZ,
        "index_version" VARCHAR(40) NOT NULL DEFAULT '1',
        CONSTRAINT "PK_knowledge_catalog" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_catalog_tenant_entity" ON "knowledge_catalog" ("tenant_id", "entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_catalog_source_domain" ON "knowledge_catalog" ("source_domain", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_catalog_entity_id" ON "knowledge_catalog" ("entity_id")`);


    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_graph_edges" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "source_type" VARCHAR(80) NOT NULL,
        "source_id" UUID NOT NULL,
        "target_type" VARCHAR(80) NOT NULL,
        "target_id" UUID NOT NULL,
        "relationship_type" VARCHAR(80) NOT NULL,
        "metadata" JSONB,
        CONSTRAINT "PK_knowledge_graph_edges" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_graph_source" ON "knowledge_graph_edges" ("tenant_id", "source_type", "source_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_graph_target" ON "knowledge_graph_edges" ("tenant_id", "target_type", "target_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_graph_relationship" ON "knowledge_graph_edges" ("relationship_type", "deleted_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_graph_edges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_catalog"`);
  }
}
