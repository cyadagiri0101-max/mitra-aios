import { MigrationInterface, QueryRunner } from 'typeorm';

export class M9ModelRegistryGovernance1700000000049 implements MigrationInterface {
  name = 'M9ModelRegistryGovernance1700000000049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create g14_model_registry table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "g14_model_registry" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "model_family" VARCHAR(50) NOT NULL DEFAULT 'G14_PREDICTIVE',
        "capability" VARCHAR(50) NOT NULL,
        "model_version" VARCHAR(100) NOT NULL,
        "feature_version" VARCHAR(50) NOT NULL,
        "model_type" VARCHAR(50) NOT NULL,
        "algorithm" VARCHAR(50) NOT NULL DEFAULT 'RIDGE_REGRESSION',
        "weights" JSONB NOT NULL,
        "intercept" NUMERIC(10, 4) NOT NULL DEFAULT 0,
        "residual_std_dev" NUMERIC(10, 4) NOT NULL DEFAULT 0,
        "hyperparameters" JSONB NULL,
        "evaluation_metrics" JSONB NOT NULL,
        "uncertainty_method" VARCHAR(50) NOT NULL DEFAULT 'RESIDUAL_PREDICTION_INTERVAL',
        "status" VARCHAR(30) NOT NULL DEFAULT 'TRAINED',
        "provenance_hash" VARCHAR(64) NOT NULL,
        "training_dataset_hash" VARCHAR(64) NULL,
        "artifact_hash" VARCHAR(64) NOT NULL,
        "training_sample_count" INTEGER NOT NULL DEFAULT 0,
        "validation_sample_count" INTEGER NOT NULL DEFAULT 0,
        "test_sample_count" INTEGER NOT NULL DEFAULT 0,
        "training_window_start" TIMESTAMPTZ NULL,
        "training_window_end" TIMESTAMPTZ NULL,
        "approved_by" VARCHAR(100) NULL,
        "approval_notes" TEXT NULL,
        "activated_at" TIMESTAMPTZ NULL,
        "retired_at" TIMESTAMPTZ NULL,
        "rolled_back_at" TIMESTAMPTZ NULL,
        "rollback_reason" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        "created_by" VARCHAR(100) NULL,
        "updated_by" VARCHAR(100) NULL,
        CONSTRAINT "PK_g14_model_registry" PRIMARY KEY ("id")
      );
    `);

    // 2. Create Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_g14_model_registry_tenant"
      ON "g14_model_registry" ("tenant_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_model_registry_version"
      ON "g14_model_registry" ("tenant_id", "model_version");

      CREATE INDEX IF NOT EXISTS "IX_g14_model_registry_capability"
      ON "g14_model_registry" ("tenant_id", "capability", "status");

      -- Enforces exactly one ACTIVE model per tenant + capability
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_g14_model_registry_active_champion"
      ON "g14_model_registry" ("tenant_id", "capability")
      WHERE "status" = 'ACTIVE' AND "deleted_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "g14_model_registry";
    `);
  }
}
