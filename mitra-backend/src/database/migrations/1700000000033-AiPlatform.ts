import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// MITRA v3.9 — Sprint 2.8.2: AI Platform & Orchestration
//
// Schema for the additive AI platform layer built on top of the verified
// 2.8.1 knowledge infrastructure:
//   • ai_prompt_templates — DB-backed prompt registry (versioned, localized,
//     categorized, approval lifecycle)
//   • ai_audit_logs       — dedicated AI audit trail (every orchestrated
//     request: provider/model, tools, citations, confidence, injection flags)
//   • ai_conversations.metadata — conversation manager metadata (pin reason,
//     tags, expiry overrides)
//   • RBAC permissions + role grants for every new AI platform capability
// ─────────────────────────────────────────────────────────────────────────────

export class AiPlatform1700000000033 implements MigrationInterface {
  name = 'AiPlatform1700000000033';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── ai_prompt_templates (Phase 2 — Prompt Registry) ─────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_prompt_templates" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "key" VARCHAR(150) NOT NULL,
        "version" VARCHAR(20) NOT NULL DEFAULT 'v1',
        "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
        "category" VARCHAR(50) NOT NULL DEFAULT 'general',
        "task" VARCHAR(150),
        "description" TEXT,
        "template" TEXT NOT NULL,
        "variables" JSONB NOT NULL DEFAULT '[]',
        "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        "approved_by" UUID,
        "approved_at" TIMESTAMPTZ,
        "metadata" JSONB,
        CONSTRAINT "PK_ai_prompt_templates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ai_prompt_key_ver_locale" UNIQUE ("key", "version", "locale"),
        CONSTRAINT "CK_ai_prompt_status" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_prompt_category" ON "ai_prompt_templates" ("category", "status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_prompt_status" ON "ai_prompt_templates" ("status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_prompt_key" ON "ai_prompt_templates" ("key", "deleted_at")`);

    // ── ai_audit_logs (Phase 6 — AI Security / audit trail) ─────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "tenant_id" UUID,
        "user_id" UUID,
        "user_role" VARCHAR(50),
        "action" VARCHAR(50) NOT NULL,
        "domain" VARCHAR(50),
        "task" VARCHAR(150),
        "prompt_template" VARCHAR(150),
        "prompt_version" VARCHAR(20),
        "provider" VARCHAR(50),
        "model" VARCHAR(100),
        "tools_executed" JSONB NOT NULL DEFAULT '[]',
        "citation_count" INT NOT NULL DEFAULT 0,
        "confidence" NUMERIC(5,4),
        "input_hash" VARCHAR(64),
        "injection_flagged" BOOLEAN NOT NULL DEFAULT FALSE,
        "processing_ms" INT,
        "status" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
        "error" TEXT,
        CONSTRAINT "PK_ai_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_audit_tenant" ON "ai_audit_logs" ("tenant_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_audit_user" ON "ai_audit_logs" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ai_audit_action" ON "ai_audit_logs" ("action", "created_at")`);

    // ── ai_conversations.metadata (Phase 5 — Conversation Manager) ──────────
    await queryRunner.query(`
      ALTER TABLE "ai_conversations"
        ADD COLUMN IF NOT EXISTS "metadata" JSONB
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // RBAC: AI platform permissions + role grants (dual-matrix pattern)
    // ═══════════════════════════════════════════════════════════════════════
    const permissions: { resource: string; action: string }[] = [
      { resource: 'ai:prompt', action: 'read' },
      { resource: 'ai:prompt', action: 'write' },
      { resource: 'ai:prompt', action: 'approve' },
      { resource: 'ai:tool', action: 'read' },
      { resource: 'ai:tool', action: 'execute' },
      { resource: 'ai:model', action: 'read' },
      { resource: 'ai:conversation', action: 'read' },
      { resource: 'ai:conversation', action: 'pin' },
      { resource: 'ai:audit', action: 'read' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [p.resource, p.action],
      );
    }

    const ai = (a: string) => `ai:${a}`;
    const ADMIN_P = [
      ai('prompt:read'), ai('prompt:write'), ai('prompt:approve'),
      ai('tool:read'), ai('tool:execute'), ai('model:read'),
      ai('conversation:read'), ai('conversation:pin'), ai('audit:read'),
    ];
    const MANAGEMENT_P = [...ADMIN_P];
    const INTERNAL_P = [
      ai('prompt:read'), ai('tool:read'), ai('tool:execute'), ai('model:read'),
      ai('conversation:read'), ai('conversation:pin'),
    ];

    const upperMatrix: Record<string, string[]> = {
      ADMIN: ADMIN_P,
      MANAGEMENT: MANAGEMENT_P,
      SALES: INTERNAL_P,
      DESIGN: INTERNAL_P,
      PLANNING: INTERNAL_P,
      PRODUCTION: INTERNAL_P,
      QUALITY: INTERNAL_P,
      CUSTOMER: [],
    };
    const lowerMatrix: Record<string, string[]> = {
      admin: ADMIN_P,
      manager: MANAGEMENT_P,
      sales_rep: INTERNAL_P,
      project_lead: MANAGEMENT_P,
      engineer: INTERNAL_P,
      production_planner: INTERNAL_P,
      operator: INTERNAL_P,
      qa_inspector: INTERNAL_P,
      qa_engineer: INTERNAL_P,
      service_tech: INTERNAL_P,
      viewer: [],
    };

    const grant = async (roleName: string, permKeys: string[]) => {
      for (const permKey of permKeys) {
        const idx = permKey.lastIndexOf(':');
        const resource = permKey.slice(0, idx);
        const action = permKey.slice(idx + 1);
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id
           FROM roles r, permissions p
           WHERE r.name = $1 AND p.resource = $2 AND p.action = $3
           ON CONFLICT DO NOTHING`,
          [roleName, resource, action],
        );
      }
    };

    for (const [roleName, permKeys] of Object.entries(upperMatrix)) {
      await grant(roleName, permKeys);
    }
    for (const [roleName, permKeys] of Object.entries(lowerMatrix)) {
      await grant(roleName, permKeys);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "metadata"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_prompt_templates"`);

    const perms: { resource: string; action: string }[] = [
      { resource: 'ai:prompt', action: 'read' },
      { resource: 'ai:prompt', action: 'write' },
      { resource: 'ai:prompt', action: 'approve' },
      { resource: 'ai:tool', action: 'read' },
      { resource: 'ai:tool', action: 'execute' },
      { resource: 'ai:model', action: 'read' },
      { resource: 'ai:conversation', action: 'read' },
      { resource: 'ai:conversation', action: 'pin' },
      { resource: 'ai:audit', action: 'read' },
    ];
    for (const p of perms) {
      await queryRunner.query(
        `DELETE FROM "role_permissions"
         WHERE "permission_id" IN (SELECT id FROM permissions WHERE resource = $1 AND action = $2)`,
        [p.resource, p.action],
      );
      await queryRunner.query(
        `DELETE FROM "permissions" WHERE resource = $1 AND action = $2`,
        [p.resource, p.action],
      );
    }
  }
}
