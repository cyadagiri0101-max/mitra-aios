import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceLifecycleExpansion1700000000023 implements MigrationInterface {
  name = 'ServiceLifecycleExpansion1700000000023';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_installations" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "installation_number" VARCHAR(30) NOT NULL UNIQUE,
        "service_request_id" UUID,
        "dispatch_id" UUID,
        "project_id" UUID,
        "customer_id" UUID,
        "site_readiness" TEXT,
        "installation_date" DATE,
        "completion_date" DATE,
        "checklist" JSONB,
        "installation_report" TEXT,
        "site_photos" JSONB,
        "customer_signoff" BOOLEAN NOT NULL DEFAULT false,
        "signoff_by" VARCHAR(100),
        "status" VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
        CONSTRAINT "PK_service_installations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_warranties" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "warranty_number" VARCHAR(30) NOT NULL UNIQUE,
        "project_id" UUID,
        "customer_id" UUID,
        "mold_id" UUID,
        "dispatch_id" UUID,
        "work_order_id" UUID,
        "warranty_start_date" DATE,
        "warranty_end_date" DATE,
        "coverage_months" INTEGER,
        "coverage_terms" TEXT,
        "eligibility_rule" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "claim_limit" NUMERIC(12,2),
        "extension_notes" TEXT,
        CONSTRAINT "PK_service_warranties" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_warranty_claims" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "claim_number" VARCHAR(30) NOT NULL UNIQUE,
        "warranty_id" UUID,
        "service_request_id" UUID,
        "project_id" UUID,
        "claim_date" DATE,
        "issue_summary" TEXT,
        "eligibility_reason" TEXT,
        "approved_by" UUID,
        "approval_notes" TEXT,
        "resolved_date" DATE,
        "status" VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
        CONSTRAINT "PK_service_warranty_claims" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_amc_contracts" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "contract_number" VARCHAR(30) NOT NULL UNIQUE,
        "project_id" UUID,
        "customer_id" UUID,
        "coverage_type" VARCHAR(50),
        "contract_value" NUMERIC(12,2),
        "start_date" DATE,
        "end_date" DATE,
        "renewal_date" DATE,
        "billing_schedule" JSONB,
        "visit_schedule" JSONB,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        CONSTRAINT "PK_service_amc_contracts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_visits" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "visit_number" VARCHAR(30) NOT NULL UNIQUE,
        "service_request_id" UUID,
        "project_id" UUID,
        "customer_id" UUID,
        "visit_date" DATE,
        "technician_id" UUID,
        "service_type" VARCHAR(50),
        "work_performed" TEXT,
        "parts_used" JSONB,
        "status" VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
        CONSTRAINT "PK_service_visits" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_service_installations_request"
        ON "service_installations" ("service_request_id", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_service_warranty_project"
        ON "service_warranties" ("project_id", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_service_claim_warranty"
        ON "service_warranty_claims" ("warranty_id", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_service_amc_project"
        ON "service_amc_contracts" ("project_id", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_service_visits_request"
        ON "service_visits" ("service_request_id", "deleted_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "service_visits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_amc_contracts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_warranty_claims"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_warranties"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_installations"`);
  }
}
