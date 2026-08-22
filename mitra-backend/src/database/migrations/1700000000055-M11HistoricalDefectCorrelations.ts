import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M11HistoricalDefectCorrelations1700000000055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'historical_defect_correlations',
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
            name: 'feature_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'finding_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'defect_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'correlation_strength',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'MODERATE_ASSOCIATION'",
          },
          {
            name: 'confidence_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
            default: 0.85,
          },
          {
            name: 'historical_evidence_count',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'related_defect_count',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'matched_material',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'ABS'",
          },
          {
            name: 'matched_process',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'INJECTION_MOLDING'",
          },
          {
            name: 'similarity_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
            default: 0.9,
          },
          {
            name: 'correlation_version',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'1.0'",
          },
          {
            name: 'evidence_references',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'provenance_context',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('historical_defect_correlations', [
      new TableIndex({
        name: 'IDX_hist_correlations_tenant_finding',
        columnNames: ['tenant_id', 'finding_id'],
      }),
      new TableIndex({
        name: 'IDX_hist_correlations_tenant_drawing',
        columnNames: ['tenant_id', 'drawing_id', 'drawing_revision'],
      }),
      new TableIndex({
        name: 'IDX_hist_correlations_tenant_defect',
        columnNames: ['tenant_id', 'defect_type'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('historical_defect_correlations', true);
  }
}
