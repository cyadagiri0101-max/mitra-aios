import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M122MultiVariableEngineeringTradeoffSynthesis1700000000061 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Engineering Trade-off Studies Table
    await queryRunner.createTable(
      new Table({
        name: 'engineering_tradeoff_studies',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'study_number', type: 'varchar', length: '100', isNullable: false },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'decision_context', type: 'text', isNullable: false },
          { name: 'objectives', type: 'jsonb', default: "'[]'" },
          { name: 'hard_constraints', type: 'jsonb', default: "'{}'" },
          { name: 'candidates', type: 'jsonb', default: "'[]'" },
          { name: 'pareto_frontier', type: 'jsonb', default: "'[]'" },
          { name: 'recommended_candidate_id', type: 'varchar', length: '50', isNullable: true },
          { name: 'recommendation_rationale', type: 'text', isNullable: true },
          { name: 'feasibility_status', type: 'varchar', length: '50', default: "'FEASIBLE_CANDIDATES_FOUND'" },
          { name: 'human_decision_status', type: 'varchar', length: '50', default: "'PENDING_REVIEW'" },
          { name: 'accepted_candidate_id', type: 'varchar', length: '50', isNullable: true },
          { name: 'decision_notes', type: 'text', isNullable: true },
          { name: 'decided_by', type: 'varchar', length: '100', isNullable: true },
          { name: 'decided_at', type: 'timestamptz', isNullable: true },
          { name: 'input_snapshot', type: 'jsonb', default: "'{}'" },
          { name: 'audit_log_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'engineering_tradeoff_studies',
      new TableIndex({ name: 'IDX_TRADEOFF_STUDY_TENANT_NUM', columnNames: ['tenant_id', 'study_number'] }),
    );

    await queryRunner.createIndex(
      'engineering_tradeoff_studies',
      new TableIndex({ name: 'IDX_TRADEOFF_STUDY_TENANT_PROJ', columnNames: ['tenant_id', 'project_id'] }),
    );

    await queryRunner.createIndex(
      'engineering_tradeoff_studies',
      new TableIndex({ name: 'IDX_TRADEOFF_STUDY_TENANT_STATUS', columnNames: ['tenant_id', 'human_decision_status'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('engineering_tradeoff_studies', true);
  }
}
