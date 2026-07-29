import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommercialDomainSprint11700000000008 implements MigrationInterface {
  name = 'CommercialDomainSprint11700000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── customers ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id"  UUID,
        "name"       VARCHAR(200) NOT NULL,
        "industry"   VARCHAR(100),
        "status"     VARCHAR(20)  NOT NULL DEFAULT 'active',
        "attributes" JSONB,
        CONSTRAINT "PK_customers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customers_name" ON "customers" ("name", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customers_status" ON "customers" ("status", "deleted_at")`);

    // ── contacts ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contacts" (
        "id"          UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ,
        "created_by"  UUID,
        "updated_by"  UUID,
        "tenant_id"   UUID,
        "customer_id" UUID NOT NULL,
        "first_name"  VARCHAR(100) NOT NULL,
        "last_name"   VARCHAR(100) NOT NULL,
        "email"       VARCHAR(200),
        "phone"       VARCHAR(50),
        "role"        VARCHAR(100),
        "is_primary"  BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_contacts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_contacts_customer" ON "contacts" ("customer_id", "deleted_at")`);

    // ── Add project_id + terms columns to quotations ──────────────────
    await queryRunner.query(`
      ALTER TABLE "quotations"
        ADD COLUMN IF NOT EXISTS "project_id" UUID,
        ADD COLUMN IF NOT EXISTS "terms" JSONB
    `);

    // ── Update quotation status CHECK constraint to include new statuses ─
    await queryRunner.query(`
      ALTER TABLE "quotations"
        DROP CONSTRAINT IF EXISTS "quotations_status_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "quotations"
        ADD CONSTRAINT "quotations_status_check"
        CHECK ("status" IN ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','PROJECT_CREATED','SUBMITTED','UNDER_REVIEW','APPROVED','REVISED','WON','LOST') OR "status" IS NULL)
    `);

    // ── Update enquiry status CHECK to match spec ─────────────────────
    await queryRunner.query(`
      ALTER TABLE "enquiries"
        DROP CONSTRAINT IF EXISTS "enquiries_status_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "enquiries"
        ADD CONSTRAINT "enquiries_status_check"
        CHECK ("status" IN ('DRAFT','SUBMITTED','UNDER_REVIEW','CONVERTED','LOST','CANCELLED') OR "status" IS NULL)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
    await queryRunner.query(`ALTER TABLE "quotations" DROP COLUMN IF EXISTS "project_id"`);
    await queryRunner.query(`ALTER TABLE "quotations" DROP COLUMN IF EXISTS "terms"`);
    await queryRunner.query(`ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_status_check"`);
    await queryRunner.query(`ALTER TABLE "quotations" ADD CONSTRAINT "quotations_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','REVISED','WON','LOST') OR "status" IS NULL)`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "enquiries_status_check"`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','UNDER_REVIEW','CONVERTED','LOST','CANCELLED') OR "status" IS NULL)`);
  }
}
