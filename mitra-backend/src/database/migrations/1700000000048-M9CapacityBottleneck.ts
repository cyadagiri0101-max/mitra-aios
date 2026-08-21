import { MigrationInterface, QueryRunner } from 'typeorm';

export class M9CapacityBottleneck1700000000048 implements MigrationInterface {
  name = 'M9CapacityBottleneck1700000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create g14_capacity_snapshots table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "g14_capacity_snapshots" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "machine_id" UUID NOT NULL,
        "prediction_cutoff" TIMESTAMPTZ NOT NULL,
        "forecast_horizon_days" INTEGER NOT NULL DEFAULT 30,
        "feature_version" VARCHAR(50) NOT NULL DEFAULT 'G14_CAPACITY_V1',
        "feature_vector" JSONB NOT NULL,
        "feature_metadata" JSONB NOT NULL,
        "ground_truth_target" JSONB NULL,
        "source_records_hash" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        "created_by" VARCHAR(100) NULL,
        "updated_by" VARCHAR(100) NULL,
        CONSTRAINT "PK_g14_capacity_snapshots" PRIMARY KEY ("id")
      );
    `);

    // 2. Add Foreign Key to machine_masters safely
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_g14_capacity_snapshots_machine') THEN
          ALTER TABLE "g14_capacity_snapshots"
          ADD CONSTRAINT "FK_g14_capacity_snapshots_machine"
          FOREIGN KEY ("machine_id") REFERENCES "machine_masters"("id") ON DELETE CASCADE;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);

    // 3. Create g14_capacity_model_artifacts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "g14_capacity_model_artifacts" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "model_version" VARCHAR(50) NOT NULL,
        "feature_version" VARCHAR(50) NOT NULL DEFAULT 'G14_CAPACITY_V1',
        "model_type" VARCHAR(50) NOT NULL DEFAULT 'RIDGE_CAPACITY_DEFICIT_REGRESSION',
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
        CONSTRAINT "PK_g14_capacity_model_artifacts" PRIMARY KEY ("id")
      );
    `);

    // 4. Create Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_g14_capacity_snapshots_tenant"
      ON "g14_capacity_snapshots" ("tenant_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_capacity_snapshots_machine"
      ON "g14_capacity_snapshots" ("machine_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_capacity_snapshots_cutoff"
      ON "g14_capacity_snapshots" ("prediction_cutoff");

      CREATE INDEX IF NOT EXISTS "IX_g14_capacity_models_tenant"
      ON "g14_capacity_model_artifacts" ("tenant_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_capacity_models_active"
      ON "g14_capacity_model_artifacts" ("tenant_id", "is_active")
      WHERE "deleted_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "g14_capacity_model_artifacts";
      DROP TABLE IF EXISTS "g14_capacity_snapshots";
    `);
  }
}
