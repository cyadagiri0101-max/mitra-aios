import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MITRA v2 — Initial Schema
 *
 * Run:    npm run migration:run
 * Revert: npm run migration:revert
 *
 * Covers: tenants, roles, permissions, users, workflow (states/transitions/instances),
 *         projects, audit_logs, and all domain tables.
 *
 * Note: autoLoadEntities handles the remaining tables.
 * This migration creates the foundational tables required by the seed script.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ── Tenants ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id"          UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ,
        "created_by"  UUID,
        "updated_by"  UUID,
        "tenant_id"   UUID,
        "name"        VARCHAR(255) NOT NULL,
        "code"        VARCHAR(50),
        "description" TEXT,
        "domain"      VARCHAR(255),
        "subdomain"   VARCHAR(255),
        "is_active"   BOOLEAN      NOT NULL DEFAULT true,
        CONSTRAINT "pk_tenants" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenants_code" ON "tenants" ("code") WHERE "deleted_at" IS NULL AND "code" IS NOT NULL`);

    // ── Roles ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id"          UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ,
        "created_by"  UUID,
        "updated_by"  UUID,
        "tenant_id"   UUID,
        "name"        VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_system"   BOOLEAN      NOT NULL DEFAULT false,
        CONSTRAINT "pk_roles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_roles_name" UNIQUE ("name")
      )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_roles_tenant" ON "roles" ("tenant_id") WHERE "deleted_at" IS NULL`);

    // ── Permissions ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id"          UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ,
        "created_by"  UUID,
        "updated_by"  UUID,
        "tenant_id"   UUID,
        "resource"    VARCHAR(100) NOT NULL,
        "action"      VARCHAR(50)  NOT NULL,
        "description" TEXT,
        CONSTRAINT "pk_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_permissions_resource_action" UNIQUE ("resource", "action")
      )`);

    // ── Role Permissions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id"            UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMPTZ,
        "created_by"    UUID,
        "updated_by"    UUID,
        "tenant_id"     UUID,
        "role_id"       UUID        NOT NULL,
        "permission_id" UUID        NOT NULL,
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_role_permission" UNIQUE ("role_id", "permission_id")
      )`);

    // ── Users ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                     UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"             TIMESTAMPTZ,
        "created_by"             UUID,
        "updated_by"             UUID,
        "tenant_id"              UUID,
        "email"                  VARCHAR(255) NOT NULL,
        "password_hash"          VARCHAR(255) NOT NULL,
        "first_name"             VARCHAR(100) NOT NULL,
        "last_name"              VARCHAR(100) NOT NULL,
        "phone"                  VARCHAR(20),
        "avatar_url"             VARCHAR(500),
        "status"                 VARCHAR(20)  NOT NULL DEFAULT 'active',
        "failed_login_attempts"  INT          NOT NULL DEFAULT 0,
        "locked_until"           TIMESTAMPTZ,
        "last_login_at"          TIMESTAMPTZ,
        "mfa_enabled"            BOOLEAN      NOT NULL DEFAULT false,
        "mfa_secret"             VARCHAR(255),
        "role_id"                UUID,
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_email_tenant" ON "users" ("email", "tenant_id") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_tenant" ON "users" ("tenant_id") WHERE "deleted_at" IS NULL`);

    // ── Workflow States ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_states" (
        "id"          UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ,
        "created_by"  UUID,
        "updated_by"  UUID,
        "tenant_id"   UUID,
        "name"          VARCHAR(100) NOT NULL,
        "state_code"    VARCHAR(50)  NOT NULL DEFAULT '',
        "description"   TEXT,
        "category"      VARCHAR(50),
        "workflow_type" VARCHAR(50)  NOT NULL DEFAULT 'default',
        "is_initial"    BOOLEAN      NOT NULL DEFAULT false,
        "is_final"      BOOLEAN      NOT NULL DEFAULT false,
        "sort_order"    INT          NOT NULL DEFAULT 0,
        "color"         VARCHAR(20),
        "icon"          VARCHAR(50),
        CONSTRAINT "pk_workflow_states" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_workflow_states_code" ON "workflow_states" ("state_code", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_workflow_states_type" ON "workflow_states" ("workflow_type", "is_initial", "deleted_at")`);

    // ── Workflow Transitions ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_transitions" (
        "id"              UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"      TIMESTAMPTZ,
        "created_by"      UUID,
        "updated_by"      UUID,
        "tenant_id"       UUID,
        "from_state_id"   UUID         NOT NULL,
        "to_state_id"     UUID         NOT NULL,
        "name"            VARCHAR(100) NOT NULL,
        "description"     TEXT,
        "workflow_type"   VARCHAR(50)  NOT NULL DEFAULT 'default',
        "required_roles"  TEXT[],
        "required_permissions" TEXT[],
        "conditions"      JSONB,
        "requires_approval" BOOLEAN    NOT NULL DEFAULT false,
        "approval_roles"  TEXT[],
        "is_active"       BOOLEAN      NOT NULL DEFAULT true,
        CONSTRAINT "pk_workflow_transitions" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_workflow_transitions_from" ON "workflow_transitions" ("from_state_id", "deleted_at")`);

    // ── Workflow Instances ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_instances" (
        "id"                UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMPTZ,
        "created_by"        UUID,
        "updated_by"        UUID,
        "tenant_id"         UUID,
        "workflow_type"     VARCHAR(50)  NOT NULL DEFAULT 'default',
        "entity_type"       VARCHAR(100) NOT NULL,
        "entity_id"         VARCHAR(100) NOT NULL,
        "current_state_id"  UUID         NOT NULL,
        "state_entered_at"  TIMESTAMPTZ,
        "history"           JSONB        NOT NULL DEFAULT '[]',
        "context"           JSONB,
        "status"            VARCHAR(20)  NOT NULL DEFAULT 'active',
        CONSTRAINT "pk_workflow_instances" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_workflow_entity" ON "workflow_instances" ("entity_type", "entity_id") WHERE "deleted_at" IS NULL`);

    // ── Projects ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id"                   UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"           TIMESTAMPTZ,
        "created_by"           UUID,
        "updated_by"           UUID,
        "tenant_id"            UUID,
        "project_number"       VARCHAR(50)  NOT NULL,
        "name"                 VARCHAR(200) NOT NULL,
        "description"          TEXT,
        "customer_name"        VARCHAR(200),
        "product_name"         VARCHAR(200) NOT NULL,
        "mold_type"            VARCHAR(50),
        "cavitation"           INT,
        "material_type"        VARCHAR(100),
        "part_weight_grams"    DECIMAL(10,3),
        "shot_weight_grams"    DECIMAL(10,3),
        "target_delivery_date" DATE,
        "enquiry_date"         DATE,
        "project_value"        DECIMAL(15,2),
        "currency"             VARCHAR(10)  NOT NULL DEFAULT 'INR',
        "health_status"        VARCHAR(30)  NOT NULL DEFAULT 'GREEN',
        "stage"                VARCHAR(100) NOT NULL DEFAULT 'ENQUIRY',
        "priority"             INT          NOT NULL DEFAULT 5,
        "rfq_number"           VARCHAR(100),
        "po_number"            VARCHAR(100),
        "project_manager_id"   UUID,
        "design_lead_id"       UUID,
        "customer_id"          UUID,
        "stage_entered_at"     TIMESTAMPTZ,
        "dispatched_at"        TIMESTAMPTZ,
        "days_overdue"         INT          NOT NULL DEFAULT 0,
        "tags"                 TEXT[],
        "metadata"             JSONB,
        CONSTRAINT "pk_projects" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_projects_number_tenant" ON "projects" ("project_number", "tenant_id") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_projects_stage_tenant" ON "projects" ("stage", "tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_projects_customer" ON "projects" ("customer_id") WHERE "deleted_at" IS NULL`);

    // ── Audit Logs ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id"            UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "tenant_id"     UUID,
        "user_id"       UUID,
        "user_email"    VARCHAR(255),
        "action"        VARCHAR(50)  NOT NULL,
        "entity_type"   VARCHAR(50)  NOT NULL,
        "entity_id"     VARCHAR(100) NOT NULL,
        "before_state"  JSONB,
        "after_state"   JSONB,
        "reason"        TEXT,
        "ip_address"    VARCHAR(50),
        "user_agent"    TEXT,
        "metadata"      JSONB,
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_entity" ON "audit_logs" ("entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_user" ON "audit_logs" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "audit_logs" ("action", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_tenant_date" ON "audit_logs" ("tenant_id", "created_at" DESC)`);

    // ── TypeORM migrations table ───────────────────────────────────────────────
    // (Created automatically by TypeORM — included here for documentation)

    console.log('✅ MITRA v2 InitialSchema migration complete');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_instances" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_transitions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_states" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants" CASCADE`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pg_trgm"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
