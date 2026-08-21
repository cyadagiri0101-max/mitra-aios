import { MigrationInterface, QueryRunner } from 'typeorm';

export class M9LevelingRecommendations1700000000050 implements MigrationInterface {
  name = 'M9LevelingRecommendations1700000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create g14_leveling_recommendations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "g14_leveling_recommendations" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "recommendation_type" VARCHAR(50) NOT NULL,
        "capability" VARCHAR(50) NOT NULL DEFAULT 'TIMELINE_LEVELING',
        "project_id" UUID NULL,
        "milestone_id" UUID NULL,
        "task_id" UUID NULL,
        "work_order_id" UUID NULL,
        "machine_id" UUID NULL,
        "source_prediction_id" VARCHAR(100) NULL,
        "model_id" UUID NULL,
        "model_version" VARCHAR(100) NOT NULL,
        "risk_tier" VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
        "current_state" JSONB NOT NULL,
        "proposed_state" JSONB NOT NULL,
        "expected_benefit" VARCHAR(255) NOT NULL,
        "predicted_risk_before" JSONB NOT NULL,
        "predicted_risk_after" JSONB NOT NULL,
        "confidence" NUMERIC(6, 4) NOT NULL DEFAULT 0.85,
        "uncertainty_lower" NUMERIC(10, 4) NOT NULL DEFAULT 0,
        "uncertainty_upper" NUMERIC(10, 4) NOT NULL DEFAULT 0,
        "explanation" JSONB NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'GENERATED',
        "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMPTZ NOT NULL,
        "reviewed_by" VARCHAR(100) NULL,
        "reviewed_at" TIMESTAMPTZ NULL,
        "applied_by" VARCHAR(100) NULL,
        "applied_at" TIMESTAMPTZ NULL,
        "rejection_reason" TEXT NULL,
        "modification_reason" TEXT NULL,
        "cancellation_reason" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        "created_by" VARCHAR(100) NULL,
        "updated_by" VARCHAR(100) NULL,
        CONSTRAINT "PK_g14_leveling_recommendations" PRIMARY KEY ("id")
      );
    `);

    // 2. Create Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_g14_leveling_rec_tenant"
      ON "g14_leveling_recommendations" ("tenant_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_leveling_rec_project"
      ON "g14_leveling_recommendations" ("tenant_id", "project_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_leveling_rec_machine"
      ON "g14_leveling_recommendations" ("tenant_id", "machine_id");

      CREATE INDEX IF NOT EXISTS "IX_g14_leveling_rec_status"
      ON "g14_leveling_recommendations" ("tenant_id", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "g14_leveling_recommendations";
    `);
  }
}
