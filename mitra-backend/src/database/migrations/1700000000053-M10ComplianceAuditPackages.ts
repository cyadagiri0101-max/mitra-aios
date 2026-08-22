import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M10ComplianceAuditPackages1700000000053 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'compliance_packages',
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
            name: 'framework',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'ISO_9001'",
          },
          {
            name: 'scope',
            type: 'varchar',
            length: '100',
            isNullable: false,
            default: "'FULL_PROJECT_TRACEABILITY'",
          },
          {
            name: 'version',
            type: 'int',
            isNullable: false,
            default: 1,
          },
          {
            name: 'completeness_status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'COMPLETE'",
          },
          {
            name: 'package_hash',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'generator_version',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'MITRA_EKOS_COMPLIANCE_v5.0'",
          },
          {
            name: 'evidence_manifest',
            type: 'jsonb',
            default: "'[]'",
            isNullable: false,
          },
          {
            name: 'lineage_manifest',
            type: 'jsonb',
            default: "'[]'",
            isNullable: false,
          },
          {
            name: 'audit_manifest',
            type: 'jsonb',
            default: "'[]'",
            isNullable: false,
          },
          {
            name: 'gaps_and_warnings',
            type: 'jsonb',
            default: "'[]'",
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

    await queryRunner.createIndices('compliance_packages', [
      new TableIndex({
        name: 'IDX_compliance_packages_tenant_project',
        columnNames: ['tenant_id', 'project_id'],
      }),
      new TableIndex({
        name: 'IDX_compliance_packages_tenant_hash',
        columnNames: ['tenant_id', 'package_hash'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('compliance_packages', true);
  }
}
