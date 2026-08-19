import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────
// MITRA M1 — Sprint 1: People master (Vision-100 M2 foundation)
//
// Adds the Employee/Engineer/Resource master (employees), the Skill master
// (skills), the employee–skill matrix (employee_skills) and the resource
// availability foundation (resource_availability) — the data backbone for
// future capacity planning. Also seeds the RBAC permissions for the new
// capabilities (additive; no data destroyed).
// ─────────────────────────────────────────────────────────────────────────

export class M1PeopleMaster1700000000035 implements MigrationInterface {
  name = 'M1PeopleMaster1700000000035';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── employees ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employees" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "employee_code" VARCHAR(30) NOT NULL,
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "email" VARCHAR(255),
        "phone" VARCHAR(30),
        "department" VARCHAR(100),
        "designation" VARCHAR(100),
        "status" VARCHAR(30) CHECK ("status" IN ('ACTIVE', 'INACTIVE') OR "status" IS NULL) NOT NULL DEFAULT 'ACTIVE',
        "user_id" UUID,
        CONSTRAINT "pk_employees" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_employees_code_tenant" ON "employees" ("employee_code", "tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_employees_status_tenant" ON "employees" ("status", "tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_employees_user" ON "employees" ("user_id")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_employees_code_tenant_active"
      ON "employees" ("employee_code", "tenant_id")
      WHERE "deleted_at" IS NULL
    `);

    // ── skills ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "skills" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "category" VARCHAR(100),
        "status" VARCHAR(30) CHECK ("status" IN ('ACTIVE', 'INACTIVE') OR "status" IS NULL) NOT NULL DEFAULT 'ACTIVE',
        CONSTRAINT "pk_skills" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_skills_code_tenant" ON "skills" ("code", "tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_skills_category_tenant" ON "skills" ("category", "tenant_id", "deleted_at")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_skills_code_tenant_active"
      ON "skills" ("code", "tenant_id")
      WHERE "deleted_at" IS NULL
    `);

    // ── employee_skills ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employee_skills" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "employee_id" UUID NOT NULL,
        "skill_id" UUID NOT NULL,
        "proficiency_level" VARCHAR(30) CHECK ("proficiency_level" IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT') OR "proficiency_level" IS NULL) NOT NULL DEFAULT 'BEGINNER',
        "certification" VARCHAR(255),
        "effective_date" DATE,
        "expires_at" DATE,
        "status" VARCHAR(30) CHECK ("status" IN ('ACTIVE', 'INACTIVE') OR "status" IS NULL) NOT NULL DEFAULT 'ACTIVE',
        "notes" TEXT,
        CONSTRAINT "pk_employee_skills" PRIMARY KEY ("id"),
        CONSTRAINT "fk_employee_skills_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id"),
        CONSTRAINT "fk_employee_skills_skill" FOREIGN KEY ("skill_id") REFERENCES "skills"("id"),
        CONSTRAINT "uq_employee_skills_employee_skill_tenant" UNIQUE ("employee_id", "skill_id", "tenant_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_employee_skills_skill_tenant" ON "employee_skills" ("skill_id", "tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_employee_skills_status_tenant" ON "employee_skills" ("status", "tenant_id", "deleted_at")`);

    // ── resource_availability ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resource_availability" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "employee_id" UUID NOT NULL,
        "work_date" DATE NOT NULL,
        "availability_type" VARCHAR(30) CHECK ("availability_type" IN ('AVAILABLE', 'PLANNED', 'UNAVAILABLE') OR "availability_type" IS NULL) NOT NULL DEFAULT 'AVAILABLE',
        "available_hours" NUMERIC(5,2),
        "notes" TEXT,
        CONSTRAINT "pk_resource_availability" PRIMARY KEY ("id"),
        CONSTRAINT "fk_resource_availability_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id"),
        CONSTRAINT "uq_resource_availability_employee_date_tenant" UNIQUE ("employee_id", "work_date", "tenant_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_resource_availability_employee_date" ON "resource_availability" ("employee_id", "work_date", "tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_resource_availability_type_date" ON "resource_availability" ("availability_type", "work_date", "tenant_id")`);

    // ── RBAC permissions for the new capabilities ───────────────────────────
    const permissions: Array<[string, string]> = [
      ['employee', 'read'],
      ['employee', 'create'],
      ['employee', 'update'],
      ['employee', 'delete'],
      ['skill', 'read'],
      ['skill', 'create'],
      ['skill', 'update'],
      ['skill', 'delete'],
      ['employee_skill', 'read'],
      ['employee_skill', 'assign'],
      ['employee_skill', 'update'],
      ['employee_skill', 'remove'],
      ['availability', 'read'],
      ['availability', 'create'],
      ['availability', 'update'],
      ['availability', 'delete'],
    ];
    for (const [resource, action] of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [resource, action],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "resource_availability"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employee_skills"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "skills"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employees"`);
    await queryRunner.query(
      `DELETE FROM permissions WHERE resource IN ('employee', 'skill', 'employee_skill', 'availability')`,
    );
  }
}