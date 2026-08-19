import { MigrationInterface, QueryRunner } from 'typeorm';

export class M2DesignLoadFoundation1700000000038 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. design_load_standards
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_load_standards" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "project_type" VARCHAR(50),
        "mold_type" VARCHAR(50),
        "complexity_level" VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
        "total_standard_duration_days" NUMERIC(5,2) NOT NULL DEFAULT 10.00,
        "total_standard_hours" NUMERIC(7,2) NOT NULL DEFAULT 80.00,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "provenance_source" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
        "provenance_details" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" UUID,
        "updated_by" UUID
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_design_load_standards_code_tenant"
      ON "design_load_standards" ("code", "tenant_id")
      WHERE "deleted_at" IS NULL;
    `);

    // 2. design_load_standard_stages
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_load_standard_stages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "standard_id" UUID NOT NULL REFERENCES "design_load_standards"("id") ON DELETE CASCADE,
        "stage_code" VARCHAR(50) NOT NULL,
        "stage_name" VARCHAR(100) NOT NULL,
        "sequence" INT NOT NULL DEFAULT 1,
        "standard_duration_days" NUMERIC(5,2) NOT NULL DEFAULT 1.00,
        "standard_hours" NUMERIC(7,2) NOT NULL DEFAULT 8.00,
        "required_skill_id" UUID REFERENCES "skills"("id") ON DELETE SET NULL,
        "minimum_proficiency" VARCHAR(30) NOT NULL DEFAULT 'INTERMEDIATE',
        "description" TEXT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" UUID,
        "updated_by" UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_standard_stages_standard_seq"
      ON "design_load_standard_stages" ("standard_id", "sequence");
    `);

    // 3. design_systems
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_systems" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "system_code" VARCHAR(30) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "system_type" VARCHAR(50) NOT NULL DEFAULT 'CAD_WORKSTATION',
        "specifications" TEXT,
        "software_licenses" VARCHAR(255),
        "location" VARCHAR(100),
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "total_shifts_supported" INT NOT NULL DEFAULT 3,
        "shift_1_available" BOOLEAN NOT NULL DEFAULT true,
        "shift_2_available" BOOLEAN NOT NULL DEFAULT true,
        "shift_3_available" BOOLEAN NOT NULL DEFAULT true,
        "daily_capacity_hours" NUMERIC(5,2) NOT NULL DEFAULT 24.00,
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" UUID,
        "updated_by" UUID
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_design_systems_code_tenant"
      ON "design_systems" ("system_code", "tenant_id")
      WHERE "deleted_at" IS NULL;
    `);

    // 4. design_shifts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_shifts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "shift_code" VARCHAR(30) NOT NULL,
        "name" VARCHAR(50) NOT NULL,
        "start_time" VARCHAR(10) NOT NULL DEFAULT '06:00',
        "end_time" VARCHAR(10) NOT NULL DEFAULT '14:00',
        "duration_hours" NUMERIC(4,2) NOT NULL DEFAULT 8.00,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" UUID,
        "updated_by" UUID
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_design_shifts_code_tenant"
      ON "design_shifts" ("shift_code", "tenant_id")
      WHERE "deleted_at" IS NULL;
    `);

    // 5. project_design_loads
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_design_loads" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "load_number" VARCHAR(30) NOT NULL,
        "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "standard_id" UUID REFERENCES "design_load_standards"("id") ON DELETE SET NULL,
        "title" VARCHAR(200) NOT NULL,
        "project_type" VARCHAR(50),
        "mold_type" VARCHAR(50),
        "complexity_factor" NUMERIC(4,2) NOT NULL DEFAULT 1.00,
        "standard_duration_days" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        "standard_hours" NUMERIC(7,2) NOT NULL DEFAULT 0.00,
        "planned_duration_days" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        "planned_hours" NUMERIC(7,2) NOT NULL DEFAULT 0.00,
        "actual_duration_days" NUMERIC(5,2),
        "actual_hours" NUMERIC(7,2),
        "planned_start_date" DATE,
        "planned_finish_date" DATE,
        "actual_start_date" DATE,
        "actual_finish_date" DATE,
        "current_stage_code" VARCHAR(50) NOT NULL DEFAULT 'MOLD_DEVELOPMENT',
        "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        "explanation" TEXT,
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" UUID,
        "updated_by" UUID
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_project_design_loads_number_tenant"
      ON "project_design_loads" ("load_number", "tenant_id")
      WHERE "deleted_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_design_loads_project"
      ON "project_design_loads" ("project_id", "tenant_id");
    `);

    // 6. project_design_load_stages
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_design_load_stages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "design_load_id" UUID NOT NULL REFERENCES "project_design_loads"("id") ON DELETE CASCADE,
        "stage_code" VARCHAR(50) NOT NULL,
        "stage_name" VARCHAR(100) NOT NULL,
        "sequence" INT NOT NULL DEFAULT 1,
        "standard_duration_days" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        "standard_hours" NUMERIC(7,2) NOT NULL DEFAULT 0.00,
        "planned_duration_days" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        "planned_hours" NUMERIC(7,2) NOT NULL DEFAULT 0.00,
        "actual_duration_days" NUMERIC(5,2),
        "actual_hours" NUMERIC(7,2),
        "planned_start_date" DATE,
        "planned_finish_date" DATE,
        "actual_start_date" DATE,
        "actual_finish_date" DATE,
        "status" VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
        "required_skill_id" UUID REFERENCES "skills"("id") ON DELETE SET NULL,
        "minimum_proficiency" VARCHAR(30) NOT NULL DEFAULT 'INTERMEDIATE',
        "assigned_employee_id" UUID REFERENCES "employees"("id") ON DELETE SET NULL,
        "assigned_design_system_id" UUID REFERENCES "design_systems"("id") ON DELETE SET NULL,
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" UUID,
        "updated_by" UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_load_stages_load_seq"
      ON "project_design_load_stages" ("design_load_id", "sequence");
    `);

    // 7. Seed permissions
    const permissions = [
      { resource: 'design_standard', action: 'read', description: 'Read design load standards' },
      { resource: 'design_standard', action: 'create', description: 'Create design load standards' },
      { resource: 'design_standard', action: 'update', description: 'Update design load standards' },
      { resource: 'design_standard', action: 'delete', description: 'Delete design load standards' },

      { resource: 'design_load', action: 'read', description: 'Read project design loads' },
      { resource: 'design_load', action: 'create', description: 'Create project design loads' },
      { resource: 'design_load', action: 'update', description: 'Update project design loads' },
      { resource: 'design_load', action: 'delete', description: 'Delete project design loads' },
      { resource: 'design_load', action: 'estimate', description: 'Estimate project design loads' },

      { resource: 'design_system', action: 'read', description: 'Read design workstations & shifts' },
      { resource: 'design_system', action: 'create', description: 'Create design workstations' },
      { resource: 'design_system', action: 'update', description: 'Update design workstations' },
      { resource: 'design_system', action: 'delete', description: 'Delete design workstations' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("resource", "action", "description")
         VALUES ($1, $2, $3)
         ON CONFLICT ("resource", "action") DO NOTHING;`,
        [p.resource, p.action, p.description],
      );
    }

    // Map permissions to ADMIN, MANAGEMENT, DESIGN, PLANNING roles
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('ADMIN', 'MANAGEMENT')
        AND p.resource IN ('design_standard', 'design_load', 'design_system')
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('DESIGN', 'PLANNING')
        AND p.resource IN ('design_standard', 'design_load', 'design_system')
        AND p.action IN ('read', 'create', 'update', 'estimate')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_design_load_stages" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_design_loads" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_shifts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_systems" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_load_standard_stages" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_load_standards" CASCADE;`);
  }
}
