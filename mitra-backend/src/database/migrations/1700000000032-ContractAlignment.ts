import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Narrow contract alignment migration.
 *
 * The live schema already contains the broader folder-intelligence and
 * tool-master tables, but the runtime entity contracts still require a
 * small set of cross-domain columns that were introduced by the project
 * and QMS layers after the foundational migrations were applied. This
 * migration makes the database schema converge with the entity metadata
 * used by the service layer.
 */
export class ContractAlignment1700000000032 implements MigrationInterface {
  name = 'ContractAlignment1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tool_master"
        ADD COLUMN IF NOT EXISTS "project_number" varchar(50),
        ADD COLUMN IF NOT EXISTS "capacity" varchar(50),
        ADD COLUMN IF NOT EXISTS "material" varchar(50),
        ADD COLUMN IF NOT EXISTS "neck_type" varchar(50)
    `);

    await queryRunner.query(`
      ALTER TABLE "project_folders"
        ADD COLUMN IF NOT EXISTS "parent_folder_id" uuid,
        ADD COLUMN IF NOT EXISTS "sequence" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project_folders" DROP COLUMN IF EXISTS "parent_folder_id"`);
    await queryRunner.query(`ALTER TABLE "project_folders" DROP COLUMN IF EXISTS "sequence"`);
    await queryRunner.query(`ALTER TABLE "project_folders" DROP COLUMN IF EXISTS "is_default"`);

    await queryRunner.query(`ALTER TABLE "tool_master" DROP COLUMN IF EXISTS "project_number"`);
    await queryRunner.query(`ALTER TABLE "tool_master" DROP COLUMN IF EXISTS "capacity"`);
    await queryRunner.query(`ALTER TABLE "tool_master" DROP COLUMN IF EXISTS "material"`);
    await queryRunner.query(`ALTER TABLE "tool_master" DROP COLUMN IF EXISTS "neck_type"`);
  }
}
