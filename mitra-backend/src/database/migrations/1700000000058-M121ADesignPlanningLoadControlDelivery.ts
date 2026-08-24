import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class M121ADesignPlanningLoadControlDelivery1700000000058 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Design Project Complexities Table
    await queryRunner.createTable(
      new Table({
        name: 'design_project_complexities',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'mold_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'cavity_count', type: 'integer', default: 1 },
          { name: 'mold_size_class', type: 'varchar', length: '50', default: "'MEDIUM'" },
          { name: 'slider_count', type: 'integer', default: 0 },
          { name: 'lifter_count', type: 'integer', default: 0 },
          { name: 'insert_count', type: 'integer', default: 0 },
          { name: 'cooling_complexity_level', type: 'varchar', length: '50', default: "'STANDARD'" },
          { name: 'gating_complexity_level', type: 'varchar', length: '50', default: "'STANDARD'" },
          { name: 'tolerance_class', type: 'varchar', length: '50', default: "'STANDARD'" },
          { name: 'surface_finish_class', type: 'varchar', length: '50', default: "'COMMERCIAL'" },
          { name: 'special_material_factors', type: 'jsonb', default: "'{}'" },
          { name: 'calculated_complexity_score', type: 'decimal', precision: 6, scale: 2, default: '1.00' },
          { name: 'workload_multiplier', type: 'decimal', precision: 6, scale: 2, default: '1.00' },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_project_complexities',
      new TableIndex({ name: 'IDX_DESIGN_COMPLEXITY_TENANT_PROJ', columnNames: ['tenant_id', 'project_id'] }),
    );

    // 2. Design Checklists Table
    await queryRunner.createTable(
      new Table({
        name: 'design_checklists',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'package_id', type: 'uuid', isNullable: true },
          { name: 'stage', type: 'varchar', length: '100', isNullable: false },
          { name: 'checklist_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'status', type: 'varchar', length: '50', default: "'PENDING'" },
          { name: 'mandatory_items_total', type: 'integer', default: 0 },
          { name: 'mandatory_items_completed', type: 'integer', default: 0 },
          { name: 'all_mandatory_passed', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_checklists',
      new TableIndex({ name: 'IDX_DESIGN_CHECKLIST_TENANT_PKG_STAGE', columnNames: ['tenant_id', 'package_id', 'stage'] }),
    );

    // 3. Design Checklist Items Table
    await queryRunner.createTable(
      new Table({
        name: 'design_checklist_items',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'checklist_id', type: 'uuid', isNullable: false },
          { name: 'item_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'is_mandatory', type: 'boolean', default: true },
          { name: 'owner_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'owner_role', type: 'varchar', length: '100', default: "'ENGINEER'" },
          { name: 'status', type: 'varchar', length: '50', default: "'PENDING'" },
          { name: 'completion_timestamp', type: 'timestamptz', isNullable: true },
          { name: 'evidence_reference', type: 'varchar', length: '255', isNullable: true },
          { name: 'reviewer_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'review_notes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'design_checklist_items',
      new TableIndex({ name: 'IDX_CHECKLIST_ITEM_TENANT_CHK', columnNames: ['tenant_id', 'checklist_id'] }),
    );

    // 4. Design Dependencies Table
    await queryRunner.createTable(
      new Table({
        name: 'design_dependencies',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'source_stage', type: 'varchar', length: '100', isNullable: false },
          { name: 'target_stage', type: 'varchar', length: '100', isNullable: false },
          { name: 'category', type: 'varchar', length: '50', default: "'ENGINEERING'" },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'is_blocking', type: 'boolean', default: true },
          { name: 'status', type: 'varchar', length: '50', default: "'ACTIVE'" },
          { name: 'resolved_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // 5. Design Blockers Table
    await queryRunner.createTable(
      new Table({
        name: 'design_blockers',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'package_id', type: 'uuid', isNullable: true },
          { name: 'stage', type: 'varchar', length: '100', isNullable: false },
          { name: 'blocker_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'category', type: 'varchar', length: '50', default: "'ENGINEERING'" },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'impact_severity', type: 'varchar', length: '50', default: "'HIGH'" },
          { name: 'status', type: 'varchar', length: '50', default: "'ACTIVE'" },
          { name: 'resolution_notes', type: 'text', isNullable: true },
          { name: 'evidence_reference', type: 'varchar', length: '255', isNullable: true },
          { name: 'resolved_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // 6. Design Historical Workloads Table
    await queryRunner.createTable(
      new Table({
        name: 'design_historical_workloads',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'mold_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'stage', type: 'varchar', length: '100', isNullable: false },
          { name: 'template_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'engineer_id', type: 'uuid', isNullable: true },
          { name: 'required_skill', type: 'varchar', length: '100', isNullable: false },
          { name: 'planned_duration_days', type: 'decimal', precision: 6, scale: 2, default: '0.00' },
          { name: 'actual_duration_days', type: 'decimal', precision: 6, scale: 2, default: '0.00' },
          { name: 'planned_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'actual_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'variance_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'variance_percentage', type: 'decimal', precision: 6, scale: 2, default: '0.00' },
          { name: 'root_cause_category', type: 'varchar', length: '100', isNullable: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // 7. Design Replan Requests Table
    await queryRunner.createTable(
      new Table({
        name: 'design_replan_requests',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'project_id', type: 'varchar', length: '100', isNullable: false },
          { name: 'package_id', type: 'uuid', isNullable: false },
          { name: 'replan_code', type: 'varchar', length: '100', isNullable: false },
          { name: 'trigger_reason', type: 'text', isNullable: false },
          { name: 'variance_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
          { name: 'delivery_risk_level', type: 'varchar', length: '50', default: "'HIGH'" },
          { name: 'status', type: 'varchar', length: '50', default: "'PENDING_REVIEW'" },
          { name: 'recommended_action', type: 'text', isNullable: false },
          { name: 'reviewed_by', type: 'varchar', length: '100', isNullable: true },
          { name: 'review_notes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('design_replan_requests', true);
    await queryRunner.dropTable('design_historical_workloads', true);
    await queryRunner.dropTable('design_blockers', true);
    await queryRunner.dropTable('design_dependencies', true);
    await queryRunner.dropTable('design_checklist_items', true);
    await queryRunner.dropTable('design_checklists', true);
    await queryRunner.dropTable('design_project_complexities', true);
  }
}
