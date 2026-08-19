import { MigrationInterface, QueryRunner } from 'typeorm';

export class M5ServiceLifecycleGovernance1700000000041 implements MigrationInterface {
  name = 'M5ServiceLifecycleGovernance1700000000041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // W3 — Warranty cycle governance (default 12-month / 500,000-cycle coverage)
    await queryRunner.query(`
      ALTER TABLE "service_warranties"
      ADD COLUMN IF NOT EXISTS "max_cycles" INTEGER NULL,
      ADD COLUMN IF NOT EXISTS "current_cycles" INTEGER NULL;
    `);

    // W5 — Claim financial data for adjudication (approved amount recording)
    await queryRunner.query(`
      ALTER TABLE "service_warranty_claims"
      ADD COLUMN IF NOT EXISTS "claim_amount" NUMERIC(18,2) NULL,
      ADD COLUMN IF NOT EXISTS "approved_amount" NUMERIC(18,2) NULL;
    `);

    // W4 — Service visit labor capture (travel hours / service hours)
    await queryRunner.query(`
      ALTER TABLE "service_visits"
      ADD COLUMN IF NOT EXISTS "travel_hours" DOUBLE PRECISION NULL,
      ADD COLUMN IF NOT EXISTS "service_hours" DOUBLE PRECISION NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service_visits" DROP COLUMN IF EXISTS "service_hours";`);
    await queryRunner.query(`ALTER TABLE "service_visits" DROP COLUMN IF EXISTS "travel_hours";`);
    await queryRunner.query(`ALTER TABLE "service_warranty_claims" DROP COLUMN IF EXISTS "approved_amount";`);
    await queryRunner.query(`ALTER TABLE "service_warranty_claims" DROP COLUMN IF EXISTS "claim_amount";`);
    await queryRunner.query(`ALTER TABLE "service_warranties" DROP COLUMN IF EXISTS "current_cycles";`);
    await queryRunner.query(`ALTER TABLE "service_warranties" DROP COLUMN IF EXISTS "max_cycles";`);
  }
}