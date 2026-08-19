import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────
// MITRA M1 — Sprint 1: Engineering Decision Log (Vision-100 governance)
//
// Adds the engineering_decisions table — the durable, queryable, auditable
// project decision record mandated by TRACEABILITY_MODEL.md — with a
// controlled lifecycle (DRAFT → SUBMITTED → APPROVED | REJECTED →
// SUPERSEDED; CANCELLED) and supersession links. Also seeds the RBAC
// permissions for the decision capabilities (additive).
// ─────────────────────────────────────────────────────────────────────────

export class M1EngineeringDecisions1700000000036 implements MigrationInterface {
  name = 'M1EngineeringDecisions1700000000036';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_decisions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "decision_number" VARCHAR(30) NOT NULL,
        "project_id" UUID,
        "title" VARCHAR(200) NOT NULL,
        "decision_type" VARCHAR(50) CHECK ("decision_type" IN ('DESIGN', 'MATERIAL_SELECTION', 'PROCESS', 'ENGINEERING_CHANGE', 'QUALITY', 'TRIAL', 'RELEASE', 'COST', 'SCHEDULE', 'OTHER') OR "decision_type" IS NULL) NOT NULL DEFAULT 'OTHER',
        "description" TEXT,
        "context" TEXT,
        "options_considered" TEXT,
        "selected_option" TEXT,
        "rationale" TEXT,
        "decision" TEXT,
        "status" VARCHAR(30) CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
        "decision_date" DATE,
        "decision_owner_id" UUID,
        "approved_by" UUID,
        "approved_at" TIMESTAMPTZ,
        "rejected_by" UUID,
        "rejected_at" TIMESTAMPTZ,
        "rejection_reason" TEXT,
        "related_entity_type" VARCHAR(50),
        "related_entity_id" UUID,
        "supersedes_decision_id" UUID,
        "superseded_by_decision_id" UUID,
        CONSTRAINT "pk_engineering_decisions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_engineering_decisions_supersedes" FOREIGN KEY ("supersedes_decision_id") REFERENCES "engineering_decisions"("id"),
        CONSTRAINT "fk_engineering_decisions_superseded_by" FOREIGN KEY ("superseded_by_decision_id") REFERENCES "engineering_decisions"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_engineering_decisions_number_tenant" ON "engineering_decisions" ("decision_number", "tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_engineering_decisions_project_status" ON "engineering_decisions" ("project_id", "status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_engineering_decisions_status_date" ON "engineering_decisions" ("status", "decision_date", "tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_engineering_decisions_type_tenant" ON "engineering_decisions" ("decision_type", "tenant_id", "deleted_at")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_engineering_decisions_number_tenant"
      ON "engineering_decisions" ("decision_number", "tenant_id")
      WHERE "deleted_at" IS NULL
    `);

    // ── RBAC permissions for the decision capabilities ──────────────────────
    const permissions: Array<[string, string]> = [
      ['engineering_decision', 'read'],
      ['engineering_decision', 'create'],
      ['engineering_decision', 'update'],
      ['engineering_decision', 'submit'],
      ['engineering_decision', 'approve'],
      ['engineering_decision', 'reject'],
      ['engineering_decision', 'cancel'],
      ['engineering_decision', 'supersede'],
    ];
    for (const [resource, action] of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [resource, action],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_decisions"`);
    await queryRunner.query(
      `DELETE FROM permissions WHERE resource = 'engineering_decision'`,
    );
  }
}