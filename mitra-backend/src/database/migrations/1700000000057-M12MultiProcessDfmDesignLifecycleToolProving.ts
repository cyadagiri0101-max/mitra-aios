import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M12MultiProcessDfmDesignLifecycleToolProving1700000000057 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Design Workload Templates Table
    await queryRunner.createTable(
      new Table({
        name: 'design_workload_templates',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'template_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'mold_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'estimated_total_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'estimated_calendar_duration_days', type: 'integer', default: 7 },
          { name: 'version', type: 'varchar', length: '50', default: "'1.0'" },
          { name: 'status', type: 'varchar', length: '50', default: "'ACTIVE'" },
          { name: 'stage_definitions', type: 'jsonb', default: "'[]'" },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_workload_templates',
      new TableIndex({ name: 'IDX_DESIGN_TEMPLATE_TENANT_CODE', columnNames: ['tenant_id', 'template_code'] }),
    );

    // 2. Design Work Packages Table (14-stage WBS)
    await queryRunner.createTable(
      new Table({
        name: 'design_work_packages',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'uuid', isNullable: false },
          { name: 'package_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'status', type: 'varchar', length: '50', default: "'PLANNING'" },
          { name: 'current_stage', type: 'varchar', length: '100', default: "'CUSTOMER_INPUTS'" },
          { name: 'template_id', type: 'uuid', isNullable: true },
          { name: 'lead_engineer_id', type: 'uuid', isNullable: true },
          { name: 'active_revision', type: 'varchar', length: '50', default: "'Rev A'" },
          { name: 'planned_start_date', type: 'timestamptz', isNullable: true },
          { name: 'planned_finish_date', type: 'timestamptz', isNullable: true },
          { name: 'actual_start_date', type: 'timestamptz', isNullable: true },
          { name: 'actual_finish_date', type: 'timestamptz', isNullable: true },
          { name: 'planned_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'actual_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'stages_state', type: 'jsonb', default: "'[]'" },
          { name: 'deliverables', type: 'jsonb', default: "'[]'" },
          { name: 'audit_trail', type: 'jsonb', default: "'[]'" },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_work_packages',
      new TableIndex({ name: 'IDX_DESIGN_WP_TENANT_PROJECT', columnNames: ['tenant_id', 'project_id'] }),
    );

    // 3. Design Engineer Profiles & Capacity Table
    await queryRunner.createTable(
      new Table({
        name: 'design_engineer_profiles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'engineer_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'email', type: 'varchar', length: '255', isNullable: false },
          { name: 'proficiency_level', type: 'varchar', length: '50', default: "'MID'" },
          { name: 'primary_skills', type: 'jsonb', default: "'[]'" },
          { name: 'weekly_capacity_hours', type: 'decimal', precision: 6, scale: 2, default: '40.00' },
          { name: 'current_utilization_percentage', type: 'decimal', precision: 6, scale: 2, default: '0.00' },
          { name: 'status', type: 'varchar', length: '50', default: "'AVAILABLE'" },
          { name: 'active_assignments', type: 'jsonb', default: "'[]'" },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_engineer_profiles',
      new TableIndex({ name: 'IDX_DESIGN_ENG_TENANT_CODE', columnNames: ['tenant_id', 'engineer_code'] }),
    );

    // 4. Tool Proving Cycles Table (T0-T1-T2)
    await queryRunner.createTable(
      new Table({
        name: 'tool_proving_cycles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'uuid', isNullable: false },
          { name: 'tool_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'cycle_code', type: 'varchar', length: '50', default: "'T0'" },
          { name: 'stage', type: 'varchar', length: '100', default: "'T0_PREPARATION'" },
          { name: 'trial_date', type: 'timestamptz', isNullable: true },
          { name: 'machine_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'status', type: 'varchar', length: '50', default: "'SCHEDULED'" },
          { name: 'observations_count', type: 'integer', default: 0 },
          { name: 'modifications_count', type: 'integer', default: 0 },
          { name: 'total_actual_modification_workload', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'trial_metrics', type: 'jsonb', default: "'{}'" },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tool_proving_cycles',
      new TableIndex({ name: 'IDX_TOOL_PROVING_TENANT_PROJECT', columnNames: ['tenant_id', 'project_id'] }),
    );

    // 5. Tool Modification Workload Table
    await queryRunner.createTable(
      new Table({
        name: 'tool_modification_workloads',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'uuid', isNullable: false },
          { name: 'tool_proving_cycle_id', type: 'uuid', isNullable: false },
          { name: 'modification_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'category', type: 'varchar', length: '100', isNullable: false },
          { name: 'root_cause', type: 'varchar', length: '100', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'estimated_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'actual_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'assigned_engineer_id', type: 'uuid', isNullable: true },
          { name: 'status', type: 'varchar', length: '50', default: "'PROPOSED'" },
          { name: 'approval_notes', type: 'text', isNullable: true },
          { name: 'approved_by', type: 'varchar', length: '255', isNullable: true },
          { name: 'approved_at', type: 'timestamptz', isNullable: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tool_modification_workloads',
      new TableIndex({ name: 'IDX_TOOL_MOD_TENANT_CYCLE', columnNames: ['tenant_id', 'tool_proving_cycle_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tool_modification_workloads');
    await queryRunner.dropTable('tool_proving_cycles');
    await queryRunner.dropTable('design_engineer_profiles');
    await queryRunner.dropTable('design_work_packages');
    await queryRunner.dropTable('design_workload_templates');
  }
}
