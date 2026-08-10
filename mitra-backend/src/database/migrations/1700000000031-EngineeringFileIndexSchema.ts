import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Engineering file index foundation table.
 *
 * The runtime entity `EngineeringFileIndex` targets `engineering_file_index`
 * and relies on the indexer service to store file/folder scan records keyed
 * by tool number, relative path, and UNC path. This migration makes the
 * live DB contract match the entity definition used by the module.
 */
export class EngineeringFileIndexSchema1700000000031 implements MigrationInterface {
  name = 'EngineeringFileIndexSchema1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_file_index" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid,
        "updated_by" uuid,
        "tenant_id" uuid,
        "tool_no" varchar(50) NOT NULL,
        "item_type" varchar(20) NOT NULL DEFAULT 'file',
        "folder_name" varchar(255) NOT NULL,
        "folder_path" varchar(1000) NOT NULL,
        "relative_path" varchar(2000) NOT NULL,
        "parent_relative_path" varchar(2000),
        "unc_path" varchar(4000) NOT NULL UNIQUE,
        "file_name" varchar(255) NOT NULL,
        "extension" varchar(50),
        "size_bytes" bigint NOT NULL,
        "last_modified_at" timestamptz NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_eng_file_index_tenant_deleted"
      ON "engineering_file_index" ("tenant_id", "deleted_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_eng_file_index_tool_deleted"
      ON "engineering_file_index" ("tool_no", "deleted_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_eng_file_index_tool_relpath_deleted"
      ON "engineering_file_index" ("tool_no", "relative_path", "deleted_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_file_index" CASCADE`);
  }
}
