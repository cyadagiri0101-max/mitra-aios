import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M10ManufacturingTelemetryClosedLoop1700000000052 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create manufacturing_signals
    await queryRunner.createTable(
      new Table({
        name: 'manufacturing_signals',
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
            name: 'source_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'source_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'MACHINE_TELEMETRY'",
          },
          {
            name: 'signal_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'value',
            type: 'numeric',
            precision: 14,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'machine_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'work_order_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'operation_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'VALID'",
          },
          {
            name: 'event_timestamp',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'ingested_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'correlation_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'raw_payload',
            type: 'jsonb',
            default: "'{}'",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('manufacturing_signals', [
      new TableIndex({
        name: 'IDX_mfg_signals_tenant_machine_time',
        columnNames: ['tenant_id', 'machine_id', 'event_timestamp'],
      }),
      new TableIndex({
        name: 'IDX_mfg_signals_tenant_wo',
        columnNames: ['tenant_id', 'work_order_id'],
      }),
      new TableIndex({
        name: 'IDX_mfg_signals_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
    ]);

    // 2. Create manufacturing_observations
    await queryRunner.createTable(
      new Table({
        name: 'manufacturing_observations',
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
            name: 'observation_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'OPERATOR'",
          },
          {
            name: 'machine_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'work_order_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'operation_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'trial_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'MEDIUM'",
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metrics',
            type: 'jsonb',
            default: "'{}'",
            isNullable: false,
          },
          {
            name: 'is_quarantined',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
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

    await queryRunner.createIndices('manufacturing_observations', [
      new TableIndex({
        name: 'IDX_mfg_obs_tenant_machine',
        columnNames: ['tenant_id', 'machine_id'],
      }),
      new TableIndex({
        name: 'IDX_mfg_obs_tenant_wo',
        columnNames: ['tenant_id', 'work_order_id'],
      }),
      new TableIndex({
        name: 'IDX_mfg_obs_tenant_trial',
        columnNames: ['tenant_id', 'trial_id'],
      }),
    ]);

    // 3. Create operational_recommendations
    await queryRunner.createTable(
      new Table({
        name: 'operational_recommendations',
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
            name: 'recommendation_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'REVIEW'",
          },
          {
            name: 'machine_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'work_order_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'confidence',
            type: 'numeric',
            precision: 5,
            scale: 4,
            default: 0.85,
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'reasoning',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'evidence_context',
            type: 'jsonb',
            default: "'{}'",
            isNullable: false,
          },
          {
            name: 'human_reviewer_id',
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

    await queryRunner.createIndices('operational_recommendations', [
      new TableIndex({
        name: 'IDX_op_rec_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
      new TableIndex({
        name: 'IDX_op_rec_tenant_machine',
        columnNames: ['tenant_id', 'machine_id'],
      }),
      new TableIndex({
        name: 'IDX_op_rec_tenant_wo',
        columnNames: ['tenant_id', 'work_order_id'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('operational_recommendations', true);
    await queryRunner.dropTable('manufacturing_observations', true);
    await queryRunner.dropTable('manufacturing_signals', true);
  }
}
