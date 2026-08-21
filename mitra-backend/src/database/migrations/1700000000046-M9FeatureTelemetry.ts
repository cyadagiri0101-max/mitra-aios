import { MigrationInterface, QueryRunner } from 'typeorm';

export class M9FeatureTelemetry1700000000046 implements MigrationInterface {
  name = 'M9FeatureTelemetry1700000000046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create g14_feature_snapshots table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "g14_feature_snapshots" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "prediction_cutoff" TIMESTAMPTZ NOT NULL,
        "feature_version" VARCHAR(50) NOT NULL DEFAULT 'G14_FEATURES_V1',
        "feature_vector" JSONB NOT NULL,
        "feature_metadata" JSONB NOT NULL,
        "ground_truth_target" JSONB NULL,
        "source_records_hash" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        "created_by" VARCHAR(100) NULL,
        "updated_by" VARCHAR(100) NULL,
        CONSTRAINT "PK_g14_feature_snapshots" PRIMARY KEY ("id")
      );
    `);

    // 2. Add Foreign Key constraints safely
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_g14_feature_snapshots_project') THEN
          ALTER TABLE "g14_feature_snapshots"
          ADD CONSTRAINT "FK_g14_feature_snapshots_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);

    // 3. Create indexes and unique constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_g14_feature_snapshots_cutoff_version"
      ON "g14_feature_snapshots" ("tenant_id", "project_id", "prediction_cutoff", "feature_version")
      WHERE "deleted_at" IS NULL;

      CREATE INDEX IF NOT EXISTS "IX_g14_feature_snapshots_tenant"
      ON "g14_feature_snapshots" ("tenant_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_feature_snapshots_project"
      ON "g14_feature_snapshots" ("project_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_feature_snapshots_cutoff"
      ON "g14_feature_snapshots" ("prediction_cutoff");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "g14_feature_snapshots";
    `);
  }
}
