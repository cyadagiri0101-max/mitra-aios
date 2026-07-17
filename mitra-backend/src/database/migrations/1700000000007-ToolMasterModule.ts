import { MigrationInterface, QueryRunner } from 'typeorm';

export class ToolMasterModule1700000000007 implements MigrationInterface {
  name = 'ToolMasterModule1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tool_master (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by uuid,
        updated_by uuid,
        tenant_id uuid,
        tool_no varchar(50) NOT NULL UNIQUE,
        tool_type varchar(20) NOT NULL,
        project_name varchar(200),
        customer_name varchar(200),
        product_name varchar(200),
        machine varchar(100),
        cavity varchar(50),
        status varchar(50),
        revision varchar(20),
        description text
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tool_master_tenant_id ON tool_master(tenant_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tool_master_tool_type ON tool_master(tool_type) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tool_master_project_name ON tool_master(project_name) WHERE deleted_at IS NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tool_master CASCADE;`);
  }
}
