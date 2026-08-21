import { MigrationInterface, QueryRunner } from 'typeorm';

export class M7KnowledgeIngestion1700000000042 implements MigrationInterface {
  name = 'M7KnowledgeIngestion1700000000042';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_sources" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "source_type" VARCHAR(50) NOT NULL DEFAULT 'TECHNICAL_DOCUMENT',
        "source_file" VARCHAR(300) NOT NULL,
        "relative_path" VARCHAR(500) NOT NULL,
        "sha256" VARCHAR(64) NOT NULL,
        "file_size" BIGINT NOT NULL DEFAULT 0,
        "last_modified" TIMESTAMPTZ,
        "classification" VARCHAR(50) NOT NULL DEFAULT 'ENGINEERING_DATA',
        "authority_status" VARCHAR(50) NOT NULL DEFAULT 'AUTHORITATIVE_RELEASE',
        "authority_reason" TEXT,
        "project_number" VARCHAR(50),
        "project_prefix" VARCHAR(20),
        "customer" VARCHAR(200),
        "document_type" VARCHAR(80),
        "machine" VARCHAR(100),
        "material" VARCHAR(100),
        "component_type" VARCHAR(100),
        "revision" VARCHAR(30),
        "scanner_version" VARCHAR(50),
        "scan_batch_id" VARCHAR(100),
        "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "current_status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        "metadata" JSONB,
        CONSTRAINT "PK_knowledge_sources" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_knowledge_sources_tenant_sha_relpath" ON "knowledge_sources" ("tenant_id", "sha256", "relative_path")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_sources_tenant_project" ON "knowledge_sources" ("tenant_id", "project_number")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_sources_tenant_type_status" ON "knowledge_sources" ("tenant_id", "source_type", "current_status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_ingestion_batches" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "scan_batch_id" VARCHAR(100),
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMPTZ,
        "status" VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
        "total_candidates" INT NOT NULL DEFAULT 0,
        "processed" INT NOT NULL DEFAULT 0,
        "succeeded" INT NOT NULL DEFAULT 0,
        "failed" INT NOT NULL DEFAULT 0,
        "skipped" INT NOT NULL DEFAULT 0,
        "records_created" INT NOT NULL DEFAULT 0,
        "records_updated" INT NOT NULL DEFAULT 0,
        "error_summary" TEXT,
        "metadata" JSONB,
        CONSTRAINT "PK_knowledge_ingestion_batches" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_ingestion_batches_tenant_status" ON "knowledge_ingestion_batches" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_ingestion_batches_tenant_started" ON "knowledge_ingestion_batches" ("tenant_id", "started_at")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_ingestion_items" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "batch_id" UUID NOT NULL,
        "source_id" UUID,
        "source_identifier" VARCHAR(300) NOT NULL,
        "source_type" VARCHAR(50) NOT NULL DEFAULT 'DATABASE_TABLE',
        "status" VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
        "attempt_count" INT NOT NULL DEFAULT 1,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMPTZ,
        "records_created" INT NOT NULL DEFAULT 0,
        "records_updated" INT NOT NULL DEFAULT 0,
        "records_skipped" INT NOT NULL DEFAULT 0,
        "error_code" VARCHAR(100),
        "error_message" TEXT,
        "metadata" JSONB,
        CONSTRAINT "PK_knowledge_ingestion_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_knowledge_ingestion_items_batch" FOREIGN KEY ("batch_id") REFERENCES "knowledge_ingestion_batches"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_ingestion_items_tenant_batch_status" ON "knowledge_ingestion_items" ("tenant_id", "batch_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_ingestion_items_tenant_source" ON "knowledge_ingestion_items" ("tenant_id", "source_identifier")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_ingestion_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_ingestion_batches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_sources"`);
  }
}
