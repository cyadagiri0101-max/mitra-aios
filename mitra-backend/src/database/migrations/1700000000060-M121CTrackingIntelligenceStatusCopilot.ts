import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M121CTrackingIntelligenceStatusCopilot1700000000060 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tracking Sheets Table
    await queryRunner.createTable(
      new Table({
        name: 'tracking_sheets',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'sheet_title', type: 'varchar', length: '255', isNullable: false },
          { name: 'sheet_type', type: 'varchar', length: '100', default: "'PROCESS_PLANNING'" },
          { name: 'source_file_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'source_file_hash', type: 'varchar', length: '100', isNullable: false },
          { name: 'active_revision', type: 'varchar', length: '50', default: "'Rev 0'" },
          { name: 'total_rows_count', type: 'int', default: 0 },
          { name: 'status', type: 'varchar', length: '50', default: "'ACTIVE'" },
          { name: 'uploaded_by', type: 'varchar', length: '100', isNullable: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tracking_sheets',
      new TableIndex({ name: 'IDX_TRACKING_SHEET_TENANT_PROJ', columnNames: ['tenant_id', 'project_id'] }),
    );

    // 2. Tracking Sheet Revisions Table
    await queryRunner.createTable(
      new Table({
        name: 'tracking_sheet_revisions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'tracking_sheet_id', type: 'uuid', isNullable: false },
          { name: 'revision_code', type: 'varchar', length: '50', isNullable: false },
          { name: 'source_hash', type: 'varchar', length: '100', isNullable: false },
          { name: 'change_summary', type: 'text', isNullable: true },
          { name: 'total_rows', type: 'int', default: 0 },
          { name: 'imported_by', type: 'varchar', length: '100', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tracking_sheet_revisions',
      new TableIndex({ name: 'IDX_SHEET_REV_TENANT_SHEET', columnNames: ['tenant_id', 'tracking_sheet_id'] }),
    );

    // 3. Tracking Sheet Rows Table
    await queryRunner.createTable(
      new Table({
        name: 'tracking_sheet_rows',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'tracking_sheet_id', type: 'uuid', isNullable: false },
          { name: 'sheet_tab_name', type: 'varchar', length: '100', default: "'Sheet1'" },
          { name: 'row_number', type: 'int', isNullable: false },
          { name: 'component_code', type: 'varchar', length: '100', isNullable: true },
          { name: 'component_name', type: 'varchar', length: '255', isNullable: true },
          { name: 'raw_deliverable_text', type: 'varchar', length: '255', isNullable: true },
          { name: 'normalized_deliverable_type', type: 'varchar', length: '100', isNullable: true },
          { name: 'recorded_status', type: 'varchar', length: '50', default: "'PENDING'" },
          { name: 'assigned_engineer', type: 'varchar', length: '100', isNullable: true },
          { name: 'planned_date', type: 'varchar', length: '50', isNullable: true },
          { name: 'actual_date', type: 'varchar', length: '50', isNullable: true },
          { name: 'remarks', type: 'text', isNullable: true },
          { name: 'cell_provenance', type: 'jsonb', default: "'{}'" },
          { name: 'raw_row_data', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tracking_sheet_rows',
      new TableIndex({ name: 'IDX_SHEET_ROW_TENANT_SHEET_NUM', columnNames: ['tenant_id', 'tracking_sheet_id', 'row_number'] }),
    );

    // 4. Tracking Sheet Reconciliations Table
    await queryRunner.createTable(
      new Table({
        name: 'tracking_sheet_reconciliations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'tracking_sheet_id', type: 'uuid', isNullable: false },
          { name: 'total_reconciled_items', type: 'int', default: 0 },
          { name: 'fully_verified_items_count', type: 'int', default: 0 },
          { name: 'missing_evidence_count', type: 'int', default: 0 },
          { name: 'unverified_completion_count', type: 'int', default: 0 },
          { name: 'status_mismatch_count', type: 'int', default: 0 },
          { name: 'reconciliation_status', type: 'varchar', length: '50', default: "'RECONCILED'" },
          { name: 'discrepancies', type: 'jsonb', default: "'[]'" },
          { name: 'reconciled_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tracking_sheet_reconciliations',
      new TableIndex({ name: 'IDX_SHEET_RECON_TENANT_PROJ', columnNames: ['tenant_id', 'project_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tracking_sheet_reconciliations', true);
    await queryRunner.dropTable('tracking_sheet_rows', true);
    await queryRunner.dropTable('tracking_sheet_revisions', true);
    await queryRunner.dropTable('tracking_sheets', true);
  }
}
