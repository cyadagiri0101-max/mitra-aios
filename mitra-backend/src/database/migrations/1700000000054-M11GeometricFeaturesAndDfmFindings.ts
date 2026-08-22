import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M11GeometricFeaturesAndDfmFindings1700000000054 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. geometric_features table
    await queryRunner.createTable(
      new Table({
        name: 'geometric_features',
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
            name: 'feature_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'geometry_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'measurements',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'mm'",
          },
          {
            name: 'normalized_unit',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'mm'",
          },
          {
            name: 'conversion_factor',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: false,
            default: 1.0,
          },
          {
            name: 'tolerance',
            type: 'decimal',
            precision: 8,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 1.0,
          },
          {
            name: 'extraction_method',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'CAD_GEOMETRY_PARSER'",
          },
          {
            name: 'extraction_status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'VALID'",
          },
          {
            name: 'source_hash',
            type: 'varchar',
            length: '64',
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

    await queryRunner.createIndices('geometric_features', [
      new TableIndex({
        name: 'IDX_geometric_features_tenant_drawing',
        columnNames: ['tenant_id', 'drawing_id', 'drawing_revision'],
      }),
      new TableIndex({
        name: 'IDX_geometric_features_tenant_project',
        columnNames: ['tenant_id', 'project_id'],
      }),
    ]);

    // 2. dfm_findings table
    await queryRunner.createTable(
      new Table({
        name: 'dfm_findings',
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
            name: 'rule_id',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'rule_version',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'1.0'",
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'WARNING'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'OPEN'",
          },
          {
            name: 'observed_value',
            type: 'decimal',
            precision: 12,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'expected_threshold',
            type: 'decimal',
            precision: 12,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'mm'",
          },
          {
            name: 'explanation',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'evidence_context',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
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

    await queryRunner.createIndices('dfm_findings', [
      new TableIndex({
        name: 'IDX_dfm_findings_tenant_drawing',
        columnNames: ['tenant_id', 'drawing_id', 'drawing_revision'],
      }),
      new TableIndex({
        name: 'IDX_dfm_findings_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dfm_findings', true);
    await queryRunner.dropTable('geometric_features', true);
  }
}
