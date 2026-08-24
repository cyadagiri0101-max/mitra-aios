import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M123DigitalThreadGeometryVisualization1700000000062 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'digital_thread_geometry_assets',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'component_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'component_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'component_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'revision_code', type: 'varchar', length: '50', default: "'Rev 0'" },
          { name: 'deliverable_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'source_file_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'source_file_path', type: 'varchar', length: '500', isNullable: false },
          { name: 'source_file_hash', type: 'varchar', length: '64', isNullable: false },
          { name: 'cad_format', type: 'varchar', length: '50', default: "'STEP'" },
          { name: 'mesh_url', type: 'varchar', length: '500', isNullable: true },
          { name: 'mesh_hash', type: 'varchar', length: '64', isNullable: true },
          { name: 'bounding_box', type: 'jsonb', isNullable: true },
          { name: 'color_overlay', type: 'varchar', length: '50', default: "'GREEN'" },
          { name: 'overlay_reason', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '50', default: "'IN_PROGRESS'" },
          { name: 'responsible_engineer_id', type: 'varchar', length: '100', default: "'UNASSIGNED'" },
          { name: 'is_ambiguous', type: 'boolean', default: false },
          { name: 'binding_confidence', type: 'decimal', precision: 5, scale: 2, default: 1.0 },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'digital_thread_geometry_assets',
      new TableIndex({ name: 'IDX_GEOMETRY_ASSET_TENANT_PROJ', columnNames: ['tenant_id', 'project_id'] }),
    );

    await queryRunner.createIndex(
      'digital_thread_geometry_assets',
      new TableIndex({ name: 'IDX_GEOMETRY_ASSET_TENANT_COMP', columnNames: ['tenant_id', 'component_id'] }),
    );

    await queryRunner.createIndex(
      'digital_thread_geometry_assets',
      new TableIndex({ name: 'IDX_GEOMETRY_ASSET_TENANT_HASH', columnNames: ['tenant_id', 'source_file_hash'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('digital_thread_geometry_assets', true);
  }
}
