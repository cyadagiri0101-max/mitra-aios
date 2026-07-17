import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MITRA v3.2 Schema Fixes
 * Adds missing tables for v3.2 modules:
 *   - drawing_analyses
 *   - ai_usage_records
 *   - machine_status
 *   - machine_telemetry
 *   - bom_analyses
 *   - bom_items
 *
 * Also ensures JSONB columns are used consistently (aligns entity definitions
 * with PostgreSQL migrations from earlier schema versions).
 */

export class SchemaFixes1700000000004 implements MigrationInterface {
  name = 'SchemaFixes1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── drawing_analyses ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS drawing_analyses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL,
        tenant_id uuid,
        file_name varchar(255) NOT NULL,
        file_type varchar(20) NOT NULL CHECK (file_type IN ('STEP','IGES','PDF','DWG')),
        file_url varchar(512) NOT NULL,
        part_complexity varchar(20),
        suggested_machining_time decimal(8,2),
        risk_areas jsonb,
        confidence decimal(5,2),
        extracted_features jsonb,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_drawing_analyses_project_id ON drawing_analyses(project_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_drawing_analyses_tenant_id ON drawing_analyses(tenant_id) WHERE deleted_at IS NULL;`);

    // ── ai_usage_records ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        tenant_id uuid,
        prompt text NOT NULL,
        model_name varchar(100) NOT NULL,
        response_time_ms int,
        token_estimate int,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON ai_usage_records(user_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_usage_model_created ON ai_usage_records(model_name, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_id ON ai_usage_records(tenant_id) WHERE deleted_at IS NULL;`);

    // ── machine_status ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS machine_status (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        machine_id varchar(50) UNIQUE NOT NULL,
        current_status varchar(20) NOT NULL CHECK (current_status IN ('RUNNING','IDLE','ALARM','SETUP','OFFLINE')),
        last_telemetry_at timestamptz,
        total_runtime_today decimal(8,2),
        utilization_percent decimal(5,2),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_machine_status_machine_id ON machine_status(machine_id);`);

    // ── machine_telemetry ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS machine_telemetry (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        machine_id varchar(50) NOT NULL,
        machine_name varchar(100) NOT NULL,
        status varchar(20) NOT NULL CHECK (status IN ('RUNNING','IDLE','ALARM','SETUP','OFFLINE')),
        spindle_load decimal(5,2),
        feed_rate decimal(8,2),
        coolant_temp decimal(5,2),
        alarm_code varchar(50),
        cycle_count int,
        recorded_at timestamptz NOT NULL,
        utilization_percent decimal(5,2),
        tenant_id uuid,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_machine_telemetry_machine_recorded ON machine_telemetry(machine_id, recorded_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_machine_telemetry_tenant_id ON machine_telemetry(tenant_id) WHERE deleted_at IS NULL;`);

    // ── bom_analyses ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bom_analyses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL,
        tenant_id uuid,
        bom_data jsonb NOT NULL,
        complexity_score decimal(4,2),
        risk_areas jsonb,
        confidence decimal(5,2),
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bom_analyses_project_id ON bom_analyses(project_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bom_analyses_tenant_id ON bom_analyses(tenant_id) WHERE deleted_at IS NULL;`);

    // ── bom_items ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bom_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id uuid NOT NULL,
        tenant_id uuid,
        part_number varchar(100) NOT NULL,
        quantity int,
        material varchar(100),
        vendor varchar(255),
        lead_time int,
        risk_level varchar(20),
        substitute_suggestions jsonb,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bom_items_analysis_id ON bom_items(analysis_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bom_items_tenant_id ON bom_items(tenant_id) WHERE deleted_at IS NULL;`);

    // ── Foreign keys (optional — add if you want strict referential integrity) ─
    // await queryRunner.query(`ALTER TABLE bom_items ADD CONSTRAINT fk_bom_items_analysis FOREIGN KEY (analysis_id) REFERENCES bom_analyses(id) ON DELETE CASCADE;`);
    // Note: TypeORM handles onDelete: 'CASCADE' in entity; FK is managed at application level.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bom_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bom_analyses CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS machine_telemetry CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS machine_status CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_usage_records CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS drawing_analyses CASCADE;`);
  }
}
