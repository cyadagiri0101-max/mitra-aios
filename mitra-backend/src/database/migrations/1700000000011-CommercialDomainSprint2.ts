import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommercialDomainSprint21700000000011 implements MigrationInterface {
  name = 'CommercialDomainSprint21700000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extend customers (Sprint 2 fields) ───────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "customers"
        ADD COLUMN IF NOT EXISTS "code" VARCHAR(30) UNIQUE,
        ADD COLUMN IF NOT EXISTS "customer_type_id" UUID,
        ADD COLUMN IF NOT EXISTS "category_id" UUID,
        ADD COLUMN IF NOT EXISTS "gst_number" VARCHAR(30),
        ADD COLUMN IF NOT EXISTS "tax_id" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "registration_number" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "website" VARCHAR(200),
        ADD COLUMN IF NOT EXISTS "phone" VARCHAR(30),
        ADD COLUMN IF NOT EXISTS "email" VARCHAR(200),
        ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
        ADD COLUMN IF NOT EXISTS "credit_limit" NUMERIC(18,2),
        ADD COLUMN IF NOT EXISTS "payment_terms" TEXT,
        ADD COLUMN IF NOT EXISTS "rating" SMALLINT,
        ADD COLUMN IF NOT EXISTS "primary_contact_id" UUID,
        ADD COLUMN IF NOT EXISTS "source" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
        ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "archived_by" UUID,
        ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customers_type" ON "customers" ("customer_type_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customers_category" ON "customers" ("category_id", "deleted_at")`);

    // ── Extend contacts ──────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD COLUMN IF NOT EXISTS "mobile" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "designation" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "department" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "communication_preferences" JSONB,
        ADD COLUMN IF NOT EXISTS "notes" TEXT,
        ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 1
    `);

    // ── Extend quotations ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "quotations"
        ADD COLUMN IF NOT EXISTS "rfq_id" UUID,
        ADD COLUMN IF NOT EXISTS "estimated_cost" NUMERIC(18,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "selling_price" NUMERIC(18,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "margin_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "margin_pct" NUMERIC(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "delivery_terms" TEXT,
        ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_quotations_rfq_id" ON "quotations" ("rfq_id")`);

    // ── Extend quotation_items ───────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "quotation_items"
        ADD COLUMN IF NOT EXISTS "estimated_cost" NUMERIC(18,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "selling_price" NUMERIC(18,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "margin_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "margin_pct" NUMERIC(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 1
    `);

    // ── customer_types ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_types" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_customer_types" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_types_code" ON "customer_types" ("code", "deleted_at")`);

    // ── customer_categories ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_categories" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_customer_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_categories_code" ON "customer_categories" ("code", "deleted_at")`);

    // ── customer_addresses ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_addresses" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "customer_id" UUID NOT NULL,
        "address_type" VARCHAR(20) NOT NULL DEFAULT 'BILLING',
        "line1" VARCHAR(200) NOT NULL,
        "line2" VARCHAR(200),
        "line3" VARCHAR(200),
        "city" VARCHAR(100) NOT NULL,
        "state" VARCHAR(100) NOT NULL,
        "postal_code" VARCHAR(20),
        "country" VARCHAR(100) NOT NULL DEFAULT 'India',
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_customer_addresses" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_addresses_customer" ON "customer_addresses" ("customer_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_addresses_type" ON "customer_addresses" ("address_type", "deleted_at")`);

    // ── customer_notes ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_notes" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "customer_id" UUID NOT NULL,
        "content" TEXT NOT NULL,
        "category" VARCHAR(50),
        "is_pinned" BOOLEAN NOT NULL DEFAULT false,
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_customer_notes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_notes_customer" ON "customer_notes" ("customer_id", "deleted_at")`);

    // ── customer_attachments ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_attachments" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "customer_id" UUID NOT NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "file_type" VARCHAR(100),
        "file_key" VARCHAR(500) NOT NULL,
        "file_url" TEXT,
        "size_bytes" BIGINT,
        "checksum_sha256" VARCHAR(64),
        "bucket" VARCHAR(100) NOT NULL DEFAULT 'mitra-customer',
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_customer_attachments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_attachments_customer" ON "customer_attachments" ("customer_id", "deleted_at")`);

    // ── customer_activities ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_activities" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "customer_id" UUID NOT NULL,
        "activity_type" VARCHAR(50) NOT NULL,
        "description" TEXT NOT NULL,
        "reference_type" VARCHAR(50),
        "reference_id" UUID,
        "metadata" JSONB,
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_customer_activities" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_activities_customer" ON "customer_activities" ("customer_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_activities_type" ON "customer_activities" ("activity_type", "deleted_at")`);

    // ── leads ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "lead_number" VARCHAR(30) NOT NULL UNIQUE,
        "customer_id" UUID,
        "contact_id" UUID,
        "customer_name" VARCHAR(200),
        "lead_source" VARCHAR(50) NOT NULL DEFAULT 'OTHER',
        "lead_status" VARCHAR(30) NOT NULL DEFAULT 'NEW',
        "owner_id" UUID,
        "expected_revenue" NUMERIC(18,2),
        "expected_date" DATE,
        "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        "probability" INT NOT NULL DEFAULT 10,
        "converted_customer_id" UUID,
        "converted_at" TIMESTAMPTZ,
        "notes" TEXT,
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_leads" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_number" ON "leads" ("lead_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_status" ON "leads" ("lead_status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_owner" ON "leads" ("owner_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_customer" ON "leads" ("customer_id", "deleted_at")`);

    // ── rfqs ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rfqs" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "rfq_number" VARCHAR(30) NOT NULL UNIQUE,
        "enquiry_id" UUID,
        "customer_id" UUID,
        "contact_id" UUID,
        "customer_name" VARCHAR(200) NOT NULL,
        "mold_type" VARCHAR(50),
        "target_quantity" INT,
        "annual_volume" INT,
        "material" VARCHAR(100),
        "machine_details" TEXT,
        "due_date" DATE,
        "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        "technical_notes" TEXT,
        "attachments" JSONB,
        "revision_number" INT NOT NULL DEFAULT 1,
        "approval_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "workflow_state" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_rfqs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rfqs_number" ON "rfqs" ("rfq_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rfqs_customer_status" ON "rfqs" ("customer_id", "status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rfqs_workflow" ON "rfqs" ("workflow_state", "deleted_at")`);

    // ── rfq_products ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rfq_products" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "rfq_id" UUID NOT NULL,
        "line_number" INT NOT NULL,
        "product_name" VARCHAR(200) NOT NULL,
        "product_code" VARCHAR(50),
        "description" TEXT,
        "quantity" NUMERIC(12,3) NOT NULL DEFAULT 1,
        "unit" VARCHAR(20) NOT NULL DEFAULT 'NOS',
        "material" VARCHAR(100),
        "target_price" NUMERIC(18,2),
        "delivery_weeks" INT,
        "notes" TEXT,
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_rfq_products" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rfq_products_rfq" ON "rfq_products" ("rfq_id", "deleted_at")`);

    // ── rfq_revisions ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rfq_revisions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "rfq_id" UUID NOT NULL,
        "revision_number" INT NOT NULL,
        "change_summary" TEXT,
        "payload" JSONB,
        "revised_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "revised_by" UUID,
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_rfq_revisions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rfq_revisions_rfq" ON "rfq_revisions" ("rfq_id", "revision_number", "deleted_at")`);

    // ── ai_document_metadata ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_document_metadata" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_id" UUID NOT NULL,
        "document_metadata" JSONB,
        "embedding_placeholder" JSONB,
        "knowledge_refs" JSONB,
        "customer_context" JSONB,
        "project_refs" JSONB,
        "synced_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "version" INT NOT NULL DEFAULT 1,
        CONSTRAINT "PK_ai_document_metadata" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_doc_entity" ON "ai_document_metadata" ("entity_type", "entity_id", "deleted_at")`);

    // ── Foreign keys ─────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_customer_addresses_customer') THEN
          ALTER TABLE "customer_addresses" ADD CONSTRAINT "FK_customer_addresses_customer"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_customer_notes_customer') THEN
          ALTER TABLE "customer_notes" ADD CONSTRAINT "FK_customer_notes_customer"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_customer_attachments_customer') THEN
          ALTER TABLE "customer_attachments" ADD CONSTRAINT "FK_customer_attachments_customer"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_customer_activities_customer') THEN
          ALTER TABLE "customer_activities" ADD CONSTRAINT "FK_customer_activities_customer"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_rfq_products_rfq') THEN
          ALTER TABLE "rfq_products" ADD CONSTRAINT "FK_rfq_products_rfq"
            FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_rfq_revisions_rfq') THEN
          ALTER TABLE "rfq_revisions" ADD CONSTRAINT "FK_rfq_revisions_rfq"
            FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_leads_customer') THEN
          ALTER TABLE "leads" ADD CONSTRAINT "FK_leads_customer"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quotations_rfq') THEN
          ALTER TABLE "quotations" ADD CONSTRAINT "FK_quotations_rfq"
            FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "FK_quotations_rfq"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_leads_customer"`);
    await queryRunner.query(`ALTER TABLE "rfq_revisions" DROP CONSTRAINT IF EXISTS "FK_rfq_revisions_rfq"`);
    await queryRunner.query(`ALTER TABLE "rfq_products" DROP CONSTRAINT IF EXISTS "FK_rfq_products_rfq"`);
    await queryRunner.query(`ALTER TABLE "customer_activities" DROP CONSTRAINT IF EXISTS "FK_customer_activities_customer"`);
    await queryRunner.query(`ALTER TABLE "customer_attachments" DROP CONSTRAINT IF EXISTS "FK_customer_attachments_customer"`);
    await queryRunner.query(`ALTER TABLE "customer_notes" DROP CONSTRAINT IF EXISTS "FK_customer_notes_customer"`);
    await queryRunner.query(`ALTER TABLE "customer_addresses" DROP CONSTRAINT IF EXISTS "FK_customer_addresses_customer"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "ai_document_metadata"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfq_revisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfq_products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfqs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_activities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_addresses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_types"`);

    await queryRunner.query(`ALTER TABLE "quotation_items"
      DROP COLUMN IF EXISTS "estimated_cost", DROP COLUMN IF EXISTS "selling_price",
      DROP COLUMN IF EXISTS "margin_amount", DROP COLUMN IF EXISTS "margin_pct", DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "quotations"
      DROP COLUMN IF EXISTS "rfq_id", DROP COLUMN IF EXISTS "estimated_cost",
      DROP COLUMN IF EXISTS "selling_price", DROP COLUMN IF EXISTS "margin_amount",
      DROP COLUMN IF EXISTS "margin_pct", DROP COLUMN IF EXISTS "delivery_terms", DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "contacts"
      DROP COLUMN IF EXISTS "mobile", DROP COLUMN IF EXISTS "designation",
      DROP COLUMN IF EXISTS "department", DROP COLUMN IF EXISTS "communication_preferences",
      DROP COLUMN IF EXISTS "notes", DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "code", DROP COLUMN IF EXISTS "customer_type_id",
      DROP COLUMN IF EXISTS "category_id", DROP COLUMN IF EXISTS "gst_number",
      DROP COLUMN IF EXISTS "tax_id", DROP COLUMN IF EXISTS "registration_number",
      DROP COLUMN IF EXISTS "website", DROP COLUMN IF EXISTS "phone", DROP COLUMN IF EXISTS "email",
      DROP COLUMN IF EXISTS "currency", DROP COLUMN IF EXISTS "credit_limit",
      DROP COLUMN IF EXISTS "payment_terms", DROP COLUMN IF EXISTS "rating",
      DROP COLUMN IF EXISTS "primary_contact_id", DROP COLUMN IF EXISTS "source",
      DROP COLUMN IF EXISTS "archived_at", DROP COLUMN IF EXISTS "archived_by", DROP COLUMN IF EXISTS "version"`);
  }
}
