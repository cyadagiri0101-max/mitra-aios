import { MigrationInterface, QueryRunner } from 'typeorm';

export class M9PredictiveModelArtifacts1700000000047 implements MigrationInterface {
  name = 'M9PredictiveModelArtifacts1700000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create g14_model_artifacts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "g14_model_artifacts" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "model_version" VARCHAR(50) NOT NULL,
        "feature_version" VARCHAR(50) NOT NULL DEFAULT 'G14_FEATURES_V1',
        "model_type" VARCHAR(50) NOT NULL DEFAULT 'RIDGE_CALIBRATED_REGRESSION',
        "weights" JSONB NOT NULL,
        "intercept" NUMERIC(10, 4) NOT NULL DEFAULT 0,
        "residual_std_dev" NUMERIC(10, 4) NOT NULL DEFAULT 0,
        "evaluation_metrics" JSONB NOT NULL,
        "sample_count" INTEGER NOT NULL DEFAULT 0,
        "training_window_start" TIMESTAMPTZ NULL,
        "training_window_end" TIMESTAMPTZ NULL,
        "provenance_hash" VARCHAR(64) NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        "created_by" VARCHAR(100) NULL,
        "updated_by" VARCHAR(100) NULL,
        CONSTRAINT "PK_g14_model_artifacts" PRIMARY KEY ("id")
      );
    `);

    // 2. Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_g14_model_artifacts_tenant"
      ON "g14_model_artifacts" ("tenant_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_model_artifacts_version"
      ON "g14_model_artifacts" ("tenant_id", "model_version");

      CREATE INDEX IF NOT EXISTS "IX_g14_model_artifacts_active"
      ON "g14_model_artifacts" ("tenant_id", "is_active")
      WHERE "deleted_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "g14_model_artifacts";
    `);
  }
}
