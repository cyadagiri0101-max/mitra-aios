import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// MITRA v3.3 — Sprint 2.2 Hardening: Workflow graph alignment + priority type
//
// 1. Realigns the system-default (tenant = NULL) `project_management` workflow
//    rows seeded by migration 0015 to the canonical 9-state graph
//    (DRAFT → KICKOFF → DESIGN → PLANNING → EXECUTION → MONITORING → CLOSING
//    → COMPLETED → ARCHIVED). The fixed UUIDs are UPDATEd in place so any
//    workflow instances created against the earlier ENGINEERING-based graph
//    keep their foreign keys intact.
// 2. Converts `projects.priority` from INT to VARCHAR(10) enum
//    (LOW/MEDIUM/HIGH/URGENT) to match the ProjectPriority enum used by the
//    CreateProjectDto / ProjectQueryDto layers (mismatch previously rejected
//    valid enum payloads against the INT column).
// ─────────────────────────────────────────────────────────────────────────────

export class ProjectManagementHardening1700000000016 implements MigrationInterface {
  name = 'ProjectManagementHardening1700000000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Realign system-default project_management states ────────────────
    const stateMap: Array<[string, string, string, string, string, boolean, number, string]> = [
      ['a0000000-0000-4000-8000-000000000001', 'DRAFT', 'Draft', 'PLANNING', '#6B7280', false, 1, 'Project drafted'],
      ['a0000000-0000-4000-8000-000000000002', 'KICKOFF', 'Kickoff', 'PLANNING', '#3B82F6', false, 2, 'Project kickoff'],
      ['a0000000-0000-4000-8000-000000000003', 'DESIGN', 'Design', 'DESIGN', '#8B5CF6', false, 3, 'Design phase'],
      ['a0000000-0000-4000-8000-000000000004', 'PLANNING', 'Planning', 'PLANNING', '#14B8A6', false, 4, 'Planning phase'],
      ['a0000000-0000-4000-8000-000000000005', 'EXECUTION', 'Execution', 'EXECUTION', '#F59E0B', false, 5, 'Execution phase'],
      ['a0000000-0000-4000-8000-000000000006', 'MONITORING', 'Monitoring', 'MONITORING', '#0EA5E9', false, 6, 'Monitoring phase'],
      ['a0000000-0000-4000-8000-000000000007', 'CLOSING', 'Closing', 'CLOSING', '#6366F1', false, 7, 'Closing phase'],
      ['a0000000-0000-4000-8000-000000000008', 'COMPLETED', 'Completed', 'CLOSED', '#10B981', true, 8, 'Project completed'],
      ['a0000000-0000-4000-8000-000000000009', 'ARCHIVED', 'Archived', 'CLOSED', '#9CA3AF', true, 9, 'Project archived'],
    ];

    for (const [id, stateCode, name, category, color, isFinal, sortOrder, description] of stateMap) {
      await queryRunner.query(
        `UPDATE "workflow_states"
         SET "state_code" = $1, "name" = $2, "category" = $3, "color" = $4,
             "is_final" = $5, "sort_order" = $6, "description" = $7, "updated_at" = now()
         WHERE "id" = $8 AND "workflow_type" = 'project_management' AND "tenant_id" IS NULL`,
        [stateCode, name, category, color, isFinal, sortOrder, description, id],
      );
    }

    // ── 2. Realign the transitions (references stay valid via fixed UUIDs) ──
    const transitionMap: Array<[string, string, string, string]> = [
      ['b0000000-0000-4000-8000-000000000001', 'Start Kickoff', 'Move project into kickoff', 'DRAFT'],
      ['b0000000-0000-4000-8000-000000000002', 'Proceed to Design', 'Move project into design', 'KICKOFF'],
      ['b0000000-0000-4000-8000-000000000003', 'Proceed to Planning', 'Move project into planning', 'DESIGN'],
      ['b0000000-0000-4000-8000-000000000004', 'Start Execution', 'Move project into execution', 'PLANNING'],
      ['b0000000-0000-4000-8000-000000000005', 'Move to Monitoring', 'Move project into monitoring', 'EXECUTION'],
      ['b0000000-0000-4000-8000-000000000006', 'Start Closing', 'Move project into closing', 'MONITORING'],
      ['b0000000-0000-4000-8000-000000000007', 'Complete Project', 'Mark project as completed', 'CLOSING'],
      ['b0000000-0000-4000-8000-000000000008', 'Archive Project', 'Archive completed project', 'COMPLETED'],
    ];

    for (const [id, name, description, fromCode] of transitionMap) {
      await queryRunner.query(
        `UPDATE "workflow_transitions" AS t
         SET "name" = $1, "description" = $2, "updated_at" = now()
         FROM "workflow_states" AS s
         WHERE t."id" = $3 AND t."workflow_type" = 'project_management' AND t."tenant_id" IS NULL
           AND s."id" = t."from_state_id" AND s."state_code" = $4`,
        [name, description, id, fromCode],
      );
    }

    // ── 3. projects.priority INT → VARCHAR(10) enum ─────────────────────────
    // Legacy INT semantics (default 5) mapped conservatively onto the enum:
    //   1-2 → LOW, 3 → MEDIUM, 4 → HIGH, >= 5 → URGENT.
    await queryRunner.query(`
      ALTER TABLE "projects"
        ALTER COLUMN "priority" TYPE VARCHAR(10)
        USING CASE "priority" WHEN 1 THEN 'LOW' WHEN 2 THEN 'LOW' WHEN 3 THEN 'MEDIUM'
                              WHEN 4 THEN 'HIGH' ELSE 'URGENT' END
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the pre-hardening priority column (enum strings collapse to 5).
    await queryRunner.query(`
      ALTER TABLE "projects"
        ALTER COLUMN "priority" TYPE INT
        USING CASE "priority" WHEN 'LOW' THEN 2 WHEN 'MEDIUM' THEN 3
                              WHEN 'HIGH' THEN 4 ELSE 5 END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "priority" SET DEFAULT 5`);
  }
}
