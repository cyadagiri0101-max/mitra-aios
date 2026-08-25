import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M125EnterprisePortfolioOrchestration1700000000063 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create engineering_portfolio_snapshots table
    await queryRunner.createTable(
      new Table({
        name: 'engineering_portfolio_snapshots',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'snapshot_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'snapshot_type', type: 'varchar', length: '50', default: "'SCHEDULED'" },
          { name: 'included_project_ids', type: 'jsonb', isNullable: false },
          { name: 'demand_summary', type: 'jsonb', isNullable: false },
          { name: 'capacity_summary', type: 'jsonb', isNullable: false },
          { name: 'bottlenecks', type: 'jsonb', isNullable: false },
          { name: 'recommendations', type: 'jsonb', isNullable: false },
          { name: 'is_autonomous_decision', type: 'boolean', default: false },
          { name: 'generated_by', type: 'varchar', length: '100', default: "'SYSTEM'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'engineering_portfolio_snapshots',
      new TableIndex({ name: 'IDX_PORTFOLIO_SNAP_TENANT_TYPE', columnNames: ['tenant_id', 'snapshot_type'] }),
    );

    await queryRunner.createIndex(
      'engineering_portfolio_snapshots',
      new TableIndex({ name: 'IDX_PORTFOLIO_SNAP_TENANT_DATE', columnNames: ['tenant_id', 'created_at'] }),
    );

    // 2. Create cross_project_allocations table
    await queryRunner.createTable(
      new Table({
        name: 'cross_project_allocations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'work_package_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'deliverable_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'engineer_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'engineer_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'allocation_role', type: 'varchar', length: '100', default: "'TOOLING_ENGINEER'" },
          { name: 'allocated_hours_per_week', type: 'decimal', precision: 6, scale: 2, default: 0.0 },
          { name: 'allocated_workload_units', type: 'decimal', precision: 6, scale: 2, default: 0.0 },
          { name: 'start_date', type: 'timestamptz', isNullable: false },
          { name: 'end_date', type: 'timestamptz', isNullable: false },
          { name: 'allocation_status', type: 'varchar', length: '50', default: "'ACTIVE'" },
          { name: 'skill_fit_score', type: 'decimal', precision: 5, scale: 2, default: 100.0 },
          { name: 'source', type: 'varchar', length: '50', default: "'MANUAL_ASSIGNMENT'" },
          { name: 'reviewed_by', type: 'varchar', length: '100', isNullable: true },
          { name: 'review_rationale', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'cross_project_allocations',
      new TableIndex({ name: 'IDX_ALLOC_TENANT_PROJ', columnNames: ['tenant_id', 'project_id'] }),
    );

    await queryRunner.createIndex(
      'cross_project_allocations',
      new TableIndex({ name: 'IDX_ALLOC_TENANT_ENG', columnNames: ['tenant_id', 'engineer_id'] }),
    );

    await queryRunner.createIndex(
      'cross_project_allocations',
      new TableIndex({ name: 'IDX_ALLOC_TENANT_STATUS', columnNames: ['tenant_id', 'allocation_status'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cross_project_allocations', true);
    await queryRunner.dropTable('engineering_portfolio_snapshots', true);
  }
}
