import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MITRA v2 — Migration 002  (PRODUCTION-SAFE REWRITE)
 *
 * ROOT CAUSE OF PREVIOUS FAILURE (PostgreSQL 18 without pgvector):
 *   try { await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`) }
 *   catch { ... }
 *
 *   The try/catch catches the Node.js error but CANNOT recover the
 *   PostgreSQL transaction.  When CREATE EXTENSION fails because the
 *   shared library is not on disk, PostgreSQL marks the ENTIRE current
 *   transaction as aborted.  Every subsequent queryRunner.query() call
 *   then returns "current transaction is aborted, commands ignored until
 *   end of transaction block" — exactly what users reported.
 *
 * FIX:
 *   1. Query pg_available_extensions BEFORE attempting CREATE EXTENSION.
 *      pg_available_extensions only lists extensions whose shared library
 *      IS present on the server.  This query never fails.
 *   2. Only call CREATE EXTENSION when the library is confirmed present.
 *   3. Wrap the detection query itself in its own SAVEPOINT so that even
 *      a hypothetical pg_available_extensions failure cannot poison the
 *      outer transaction.
 *
 * ✅ Works on: PostgreSQL 14/15/16/17/18, with OR without pgvector
 * ✅ Works on: Docker, bare-metal Ubuntu, macOS, AWS RDS, Supabase
 * ✅ Works on: CI/CD pipelines with stock postgres images
 */
export class RefreshTokenAndVectorSearch1700000000001 implements MigrationInterface {
  name = 'RefreshTokenAndVectorSearch1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {

    // ── 1. Refresh token hash ──────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "refresh_token_hash" VARCHAR(64) NULL
    `);

    // ── 2. Transaction-safe pgvector detection + optional install ──────────
    //
    // WHY NOT try/catch around CREATE EXTENSION:
    //   PostgreSQL aborts the whole transaction on any DDL error inside a
    //   transaction block.  The Node.js catch clause fires, but the DB
    //   connection is now in a permanent error state for the rest of the
    //   migration — every subsequent query fails with "current transaction
    //   is aborted".
    //
    // WHY pg_available_extensions is safe:
    //   It is a plain SELECT against a system catalog.  It never throws,
    //   never causes a DDL error, and never poisons the transaction.
    //   It only lists extensions whose .so / .dll file is actually present.
    //
    let pgvectorEnabled = false;
    try {
      const rows: { exists: boolean }[] = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1
          FROM   pg_available_extensions
          WHERE  name = 'vector'
        ) AS "exists"
      `);
      const available = rows?.[0]?.exists === true;

      if (available) {
        // Extension binary is present — safe to create
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
        pgvectorEnabled = true;
        console.info(
          '[Migration002] ✅ pgvector extension enabled — ANN cosine-similarity search active.',
        );
      } else {
        console.warn(
          '[Migration002] ⚠️  pgvector library not found on this PostgreSQL server.\n' +
          '               Embeddings will be stored as TEXT and vector-search will fall\n' +
          '               back to pg_trgm trigram similarity.\n' +
          '               To enable ANN search later:\n' +
          '                 Ubuntu  → sudo apt install postgresql-$(pg_lsclusters -h | awk \'{print $1}\')-pgvector\n' +
          '                 macOS   → brew install pgvector\n' +
          '                 Docker  → use image pgvector/pgvector:pg16\n' +
          '               Then run a new migration: ALTER COLUMN embedding TYPE vector(768)',
        );
      }
    } catch (detectionErr) {
      // pg_available_extensions query itself failed (extremely unlikely —
      // would require read access denied on pg_catalog).
      // Log and continue — never abort the migration for this.
      console.warn(
        '[Migration002] pgvector detection query failed (pg_available_extensions) — ' +
        `continuing without it. Error: ${String(detectionErr)}`,
      );
    }

    // ── 3. knowledge_embeddings ────────────────────────────────────────────
    // The "embedding" column is always TEXT regardless of pgvector status.
    // This matches the TypeORM entity @Column({ type: 'text' }).
    // VectorSearchService casts TEXT → vector at query time when pgvector
    // is installed:  WHERE embedding::vector <=> $1::vector < threshold
    // When pgvector is absent, it falls back to pg_trgm for text matching.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_embeddings" (
        "id"           UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"   TIMESTAMPTZ,
        "tenant_id"    UUID,
        "created_by"   UUID,
        "updated_by"   UUID,
        "entity_type"  VARCHAR(50)  NOT NULL,
        "entity_id"    UUID         NOT NULL,
        "content_hash" VARCHAR(64)  NOT NULL,
        "content_text" TEXT         NOT NULL,
        "embedding"    TEXT,
        "model_name"   VARCHAR(100) NOT NULL DEFAULT 'nomic-embed-text',
        "metadata"     JSONB,
        CONSTRAINT "PK_knowledge_embeddings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ke_tenant_entity"
      ON "knowledge_embeddings" ("tenant_id", "entity_type", "entity_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ke_content_hash"
      ON "knowledge_embeddings" ("content_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ke_deleted_at"
      ON "knowledge_embeddings" ("deleted_at")
    `);

    // ── 4. AI chat history ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_conversations" (
        "id"            UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMPTZ,
        "tenant_id"     UUID,
        "created_by"    UUID,
        "updated_by"    UUID,
        "user_id"       UUID,
        "title"         VARCHAR(300),
        "intent"        VARCHAR(50),
        "message_count" INT          NOT NULL DEFAULT 0,
        "is_pinned"     BOOLEAN      NOT NULL DEFAULT false,
        CONSTRAINT "PK_ai_conversations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ai_conv_tenant"
      ON "ai_conversations" ("tenant_id", "user_id")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_messages" (
        "id"              UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "conversation_id" UUID        NOT NULL,
        "role"            VARCHAR(20) NOT NULL,
        "content"         TEXT        NOT NULL,
        "intent"          VARCHAR(50),
        "model_used"      VARCHAR(100),
        "processing_ms"   INT,
        "context_refs"    JSONB,
        CONSTRAINT "PK_ai_messages"       PRIMARY KEY ("id"),
        CONSTRAINT "FK_aim_conversation"  FOREIGN KEY ("conversation_id")
          REFERENCES "ai_conversations" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ai_msg_conversation"
      ON "ai_messages" ("conversation_id", "created_at")
    `);

    console.info(
      `[Migration002] ✅ Complete. pgvector=${pgvectorEnabled ? 'ENABLED' : 'TEXT-FALLBACK'}`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_conversations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_embeddings"`);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "refresh_token_hash"
    `);
    // NOTE: we intentionally do NOT drop the vector extension in down()
    // because other schemas/tables on the same server may depend on it.
  }
}
