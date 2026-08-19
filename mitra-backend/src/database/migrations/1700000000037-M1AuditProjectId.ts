import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────
// MITRA M1 — Sprint 1: Audit project scope (Phase-0 finding A5)
//
// Adds audit_logs.project_id so every audit row can record the project in
// scope of the audited operation — required by TRACEABILITY_MODEL.md
// (project-level traceability) and the Engineering Decision Log, where
// decisions are project-scoped. Additive only.
// ─────────────────────────────────────────────────────────────────────────

export class M1AuditProjectId1700000000037 implements MigrationInterface {
  name = 'M1AuditProjectId1700000000037';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "project_id" UUID`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_project" ON "audit_logs" ("project_id", "created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "project_id"`);
  }
}