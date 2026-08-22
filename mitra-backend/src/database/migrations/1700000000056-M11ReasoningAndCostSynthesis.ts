import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M11ReasoningAndCostSynthesis1700000000056 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. engineering_cost_configurations table
    await queryRunner.createTable(
      new Table({
        name: 'engineering_cost_configurations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'rate_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'rate_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'work_center_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'machine_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'material_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'operation_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'rate_value',
            type: 'decimal',
            precision: 18,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            isNullable: false,
            default: "'INR'",
          },
          {
            name: 'uom',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'HOUR'",
          },
          {
            name: 'effective_from',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'effective_to',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'source_reference',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'ACTIVE'",
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('engineering_cost_configurations', [
      new TableIndex({
        name: 'IDX_cost_configs_tenant_rate_type',
        columnNames: ['tenant_id', 'rate_type', 'status'],
      }),
      new TableIndex({
        name: 'IDX_cost_configs_tenant_work_center',
        columnNames: ['tenant_id', 'work_center_id'],
      }),
      new TableIndex({
        name: 'IDX_cost_configs_tenant_machine',
        columnNames: ['tenant_id', 'machine_id'],
      }),
      new TableIndex({
        name: 'IDX_cost_configs_tenant_material',
        columnNames: ['tenant_id', 'material_id'],
      }),
      new TableIndex({
        name: 'IDX_cost_configs_tenant_operation',
        columnNames: ['tenant_id', 'operation_id'],
      }),
    ]);

    // 2. engineering_reasoning_results table
    await queryRunner.createTable(
      new Table({
        name: 'engineering_reasoning_results',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'drawing_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'drawing_revision',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'Rev A'",
          },
          {
            name: 'source_finding_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reasoning_version',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'1.0'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'GENERATED'",
          },
          {
            name: 'evidence_hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'steps',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'evidence',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'assumptions',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'constraints',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'contradictions',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'impacts',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'cost_summary',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'recommendation',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'confidence_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
            default: 0.0,
          },
          {
            name: 'confidence_factors',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'provenance',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'reviewed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'decision_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('engineering_reasoning_results', [
      new TableIndex({
        name: 'IDX_reasoning_results_tenant_project',
        columnNames: ['tenant_id', 'project_id'],
      }),
      new TableIndex({
        name: 'IDX_reasoning_results_tenant_drawing',
        columnNames: ['tenant_id', 'drawing_id', 'drawing_revision'],
      }),
      new TableIndex({
        name: 'IDX_reasoning_results_tenant_finding',
        columnNames: ['tenant_id', 'source_finding_id'],
      }),
      new TableIndex({
        name: 'IDX_reasoning_results_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('engineering_reasoning_results', true);
    await queryRunner.dropTable('engineering_cost_configurations', true);
  }
}
