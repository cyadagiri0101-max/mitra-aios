import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M121BDesignComponentOperationsRevisionDelivery1700000000059 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Design Components Table
    await queryRunner.createTable(
      new Table({
        name: 'design_components',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'package_id', type: 'uuid', isNullable: true },
          { name: 'component_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'component_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'variant_bp_code', type: 'varchar', length: '50', isNullable: true },
          { name: 'active_revision', type: 'varchar', length: '50', default: "'Rev 0'" },
          { name: 'responsible_engineer_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'reviewer_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'status', type: 'varchar', length: '50', default: "'IN_DESIGN'" },
          { name: 'planned_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'actual_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'rework_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'completion_percentage', type: 'decimal', precision: 6, scale: 2, default: '0.00' },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_components',
      new TableIndex({ name: 'IDX_DESIGN_COMPONENT_TENANT_PROJ_CODE', columnNames: ['tenant_id', 'project_id', 'component_code'] }),
    );

    // 2. Design Component Revisions Table
    await queryRunner.createTable(
      new Table({
        name: 'design_component_revisions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'component_id', type: 'uuid', isNullable: false },
          { name: 'revision_code', type: 'varchar', length: '50', isNullable: false },
          { name: 'revision_reason', type: 'varchar', length: '100', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'incremental_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'rework_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'engineer_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'reviewer_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'status', type: 'varchar', length: '50', default: "'PENDING_REVIEW'" },
          { name: 'approved_at', type: 'timestamptz', isNullable: true },
          { name: 'review_notes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_component_revisions',
      new TableIndex({ name: 'IDX_COMP_REV_TENANT_COMP', columnNames: ['tenant_id', 'component_id'] }),
    );

    // 3. Design Component Deliverables Table
    await queryRunner.createTable(
      new Table({
        name: 'design_component_deliverables',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'component_id', type: 'uuid', isNullable: false },
          { name: 'deliverable_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'planned_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'actual_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'responsible_engineer_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'status', type: 'varchar', length: '50', default: "'NOT_STARTED'" },
          { name: 'completion_timestamp', type: 'timestamptz', isNullable: true },
          { name: 'evidence_reference', type: 'varchar', length: '255', isNullable: true },
          { name: 'reviewer_notes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_component_deliverables',
      new TableIndex({ name: 'IDX_COMP_DELIV_TENANT_COMP', columnNames: ['tenant_id', 'component_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('design_component_deliverables', true);
    await queryRunner.dropTable('design_component_revisions', true);
    await queryRunner.dropTable('design_components', true);
  }
}
