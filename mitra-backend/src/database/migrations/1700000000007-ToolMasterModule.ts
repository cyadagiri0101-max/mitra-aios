import { MigrationInterface, QueryRunner } from 'typeorm';

export class ToolMasterModule1700000000007 implements MigrationInterface {
  name = 'ToolMasterModule1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tool_master" ADD COLUMN IF NOT EXISTS "tool_no" varchar(50)`);
    await queryRunner.query(`ALTER TABLE "tool_master" ADD COLUMN IF NOT EXISTS "project_name" varchar(200)`);
    await queryRunner.query(`ALTER TABLE "tool_master" ADD COLUMN IF NOT EXISTS "product_name" varchar(200)`);
    await queryRunner.query(`ALTER TABLE "tool_master" ADD COLUMN IF NOT EXISTS "revision" varchar(20)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_master_tenant_id" ON "tool_master" ("tenant_id") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_master_tool_type" ON "tool_master" ("tool_type") WHERE "deleted_at" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tool_master" DROP COLUMN IF EXISTS "tool_no"`);
    await queryRunner.query(`ALTER TABLE "tool_master" DROP COLUMN IF EXISTS "project_name"`);
    await queryRunner.query(`ALTER TABLE "tool_master" DROP COLUMN IF EXISTS "product_name"`);
    await queryRunner.query(`ALTER TABLE "tool_master" DROP COLUMN IF EXISTS "revision"`);
  }
}
