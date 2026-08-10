import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// MITRA v3.4 — Sprint 2.3.1: Engineering Completion & Manufacturing/Quality
// Integration
//
// Implements the Sprint 2.3.0 gap list (G-1 … G-13 as scoped in the
// Engineering Completion Report):
//   • G-1  Artifact traceability: UUID link columns on work_orders
//         (drawing/bom/bom_item/routing/process_plan), trial_observations,
//         inspection_reports, retrials (part/drawing/bom_item/routing) and
//         process_plans (drawing/bom) + generic engineering_trace_edges graph
//   • G-2  BOM effective dates: item-level effective_from/effective_to
//         (header-level already present)
//   • G-3  BOM substitutions: engineering_bom_substitutions (effectivity,
//         priority, approval status)
//   • G-4  Routing revisions: engineering_routing_revisions (immutable
//         snapshots — predecessor sequencing column already exists on
//         engineering_operations)
//   • G-5  Multi-reviewer reviews: engineering_review_assignments
//   • G-8  Unit conversion: uom_conversions catalog + seed
//   • G-13 Transactional outbox: domain_outbox (audit + relay in code)
//   • RBAC permissions + role grants for every new capability
// ─────────────────────────────────────────────────────────────────────────────

export class EngineeringCompletion1700000000018 implements MigrationInterface {
  name = 'EngineeringCompletion1700000000018';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── engineering_bom_substitutions (G-3) ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_bom_substitutions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "bom_id" UUID NOT NULL,
        "bom_item_id" UUID NOT NULL,
        "substitute_item_id" UUID NOT NULL,
        "substitution_type" VARCHAR(20) NOT NULL DEFAULT 'SUBSTITUTE',
        "priority" INT NOT NULL DEFAULT 1,
        "effective_from" DATE,
        "effective_to" DATE,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "approved_by" UUID,
        "approved_at" TIMESTAMPTZ,
        "restriction_notes" TEXT,
        CONSTRAINT "PK_engineering_bom_substitutions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_bom_subs_bom" FOREIGN KEY ("bom_id")
          REFERENCES "engineering_boms" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_eng_bom_subs_item" FOREIGN KEY ("bom_item_id")
          REFERENCES "engineering_bom_items" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_eng_bom_subs_substitute" FOREIGN KEY ("substitute_item_id")
          REFERENCES "engineering_bom_items" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_eng_bom_subs_pair" UNIQUE ("bom_item_id", "substitute_item_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_bom_subs_bom" ON "engineering_bom_substitutions" ("bom_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_bom_subs_status" ON "engineering_bom_substitutions" ("bom_item_id", "status", "deleted_at")`);

    // ── engineering_routing_revisions (G-4) ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_routing_revisions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "routing_id" UUID NOT NULL,
        "version" INT NOT NULL DEFAULT 1,
        "snapshot" JSONB NOT NULL,
        "change_summary" TEXT,
        "released_by" UUID,
        "released_at" TIMESTAMPTZ,
        CONSTRAINT "PK_engineering_routing_revisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_routing_revs_routing" FOREIGN KEY ("routing_id")
          REFERENCES "engineering_routings" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_eng_routing_revs_key" UNIQUE ("routing_id", "version")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_routing_revs_routing" ON "engineering_routing_revisions" ("routing_id", "deleted_at")`);

    // ── engineering_review_assignments (G-5) ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_review_assignments" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "review_request_id" UUID NOT NULL,
        "assignee_id" UUID NOT NULL,
        "assignee_name" VARCHAR(200),
        "review_role" VARCHAR(30) NOT NULL DEFAULT 'REVIEWER',
        "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "decision" VARCHAR(30),
        "decision_comments" TEXT,
        "decided_at" TIMESTAMPTZ,
        CONSTRAINT "PK_engineering_review_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_eng_review_assigns_request" FOREIGN KEY ("review_request_id")
          REFERENCES "engineering_review_requests" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_eng_review_assigns_key" UNIQUE ("review_request_id", "assignee_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_review_assigns_request" ON "engineering_review_assignments" ("review_request_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_review_assigns_assignee" ON "engineering_review_assignments" ("assignee_id", "status", "deleted_at")`);

    // ── uom_conversions (G-8) ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "uom_conversions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "from_uom" VARCHAR(20) NOT NULL,
        "to_uom" VARCHAR(20) NOT NULL,
        "conversion_factor" NUMERIC(18,9) NOT NULL,
        "conversion_type" VARCHAR(20) NOT NULL DEFAULT 'EXACT',
        "source" VARCHAR(100),
        "notes" TEXT,
        CONSTRAINT "PK_uom_conversions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_uom_conversions_key" UNIQUE ("from_uom", "to_uom")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_uom_conversions_from" ON "uom_conversions" ("from_uom", "deleted_at")`);

    // ── domain_outbox (G-13) ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "domain_outbox" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "event_type" VARCHAR(100) NOT NULL,
        "aggregate_type" VARCHAR(50) NOT NULL,
        "aggregate_id" UUID,
        "payload" JSONB NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        "attempt_count" INT NOT NULL DEFAULT 0,
        "last_attempt_at" TIMESTAMPTZ,
        "published_at" TIMESTAMPTZ,
        "error_message" TEXT,
        "available_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_domain_outbox" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_outbox_status" ON "domain_outbox" ("status", "available_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_outbox_aggregate" ON "domain_outbox" ("aggregate_type", "aggregate_id")`);

    // ── engineering_trace_edges (G-1 generic cross-artifact graph) ──────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_trace_edges" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "tenant_id" UUID,
        "project_id" UUID,
        "source_entity_type" VARCHAR(50) NOT NULL,
        "source_entity_id" UUID NOT NULL,
        "target_entity_type" VARCHAR(50) NOT NULL,
        "target_entity_id" UUID NOT NULL,
        "relation_type" VARCHAR(30) NOT NULL,
        "notes" TEXT,
        CONSTRAINT "PK_engineering_trace_edges" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_trace_source" ON "engineering_trace_edges" ("source_entity_type", "source_entity_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_trace_target" ON "engineering_trace_edges" ("target_entity_type", "target_entity_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eng_trace_project" ON "engineering_trace_edges" ("project_id", "deleted_at")`);

    // ═══════════════════════════════════════════════════════════════════════
    // G-1: Artifact traceability link columns (FK-style UUID + index, no
    //      relations — follows the cross-boundary convention)
    // ═══════════════════════════════════════════════════════════════════════

    // ── work_orders (Manufacturing) ─────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "work_orders"
        ADD COLUMN IF NOT EXISTS "drawing_id" UUID,
        ADD COLUMN IF NOT EXISTS "bom_id" UUID,
        ADD COLUMN IF NOT EXISTS "bom_item_id" UUID,
        ADD COLUMN IF NOT EXISTS "routing_id" UUID,
        ADD COLUMN IF NOT EXISTS "process_plan_id" UUID
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_drawing" ON "work_orders" ("drawing_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_bom" ON "work_orders" ("bom_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_bom_item" ON "work_orders" ("bom_item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_routing" ON "work_orders" ("routing_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_process_plan" ON "work_orders" ("process_plan_id")`);

    // ── trial_observations (Quality) ────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "trial_observations"
        ADD COLUMN IF NOT EXISTS "part_id" UUID,
        ADD COLUMN IF NOT EXISTS "drawing_id" UUID,
        ADD COLUMN IF NOT EXISTS "bom_item_id" UUID,
        ADD COLUMN IF NOT EXISTS "routing_id" UUID
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trial_part" ON "trial_observations" ("part_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trial_drawing" ON "trial_observations" ("drawing_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trial_bom_item" ON "trial_observations" ("bom_item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trial_routing" ON "trial_observations" ("routing_id")`);

    // ── inspection_reports (Quality) ────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "inspection_reports"
        ADD COLUMN IF NOT EXISTS "part_id" UUID,
        ADD COLUMN IF NOT EXISTS "drawing_id" UUID,
        ADD COLUMN IF NOT EXISTS "bom_item_id" UUID,
        ADD COLUMN IF NOT EXISTS "routing_id" UUID
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_insp_part" ON "inspection_reports" ("part_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_insp_drawing" ON "inspection_reports" ("drawing_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_insp_bom_item" ON "inspection_reports" ("bom_item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_insp_routing" ON "inspection_reports" ("routing_id")`);

    // ── retrials (Quality) ──────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "retrials"
        ADD COLUMN IF NOT EXISTS "part_id" UUID,
        ADD COLUMN IF NOT EXISTS "drawing_id" UUID,
        ADD COLUMN IF NOT EXISTS "bom_item_id" UUID,
        ADD COLUMN IF NOT EXISTS "routing_id" UUID
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retrial_part" ON "retrials" ("part_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retrial_drawing" ON "retrials" ("drawing_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retrial_bom_item" ON "retrials" ("bom_item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retrial_routing" ON "retrials" ("routing_id")`);

    // ── process_plans (Planning) ────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "process_plans"
        ADD COLUMN IF NOT EXISTS "drawing_id" UUID,
        ADD COLUMN IF NOT EXISTS "bom_id" UUID
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_plan_drawing" ON "process_plans" ("drawing_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_plan_bom" ON "process_plans" ("bom_id")`);

    // ── engineering_bom_items: item-level effectivity (G-2/G-3) ────────────
    await queryRunner.query(`
      ALTER TABLE "engineering_bom_items"
        ADD COLUMN IF NOT EXISTS "effective_from" DATE,
        ADD COLUMN IF NOT EXISTS "effective_to" DATE
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // UoM conversion seed (G-8) — common engineering conversions
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "uom_conversions" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "from_uom", "to_uom", "conversion_factor", "conversion_type", "source", "notes")
      VALUES
        ('f2000000-0000-4000-8000-000000000001', now(), now(), NULL, NULL, NULL, NULL, 'KG', 'G', 1000, 'EXACT', 'SI', 'Kilogram to gram'),
        ('f2000000-0000-4000-8000-000000000002', now(), now(), NULL, NULL, NULL, NULL, 'G', 'KG', 0.001, 'EXACT', 'SI', 'Gram to kilogram'),
        ('f2000000-0000-4000-8000-000000000003', now(), now(), NULL, NULL, NULL, NULL, 'TON', 'KG', 1000, 'EXACT', 'SI', 'Metric ton to kilogram'),
        ('f2000000-0000-4000-8000-000000000004', now(), now(), NULL, NULL, NULL, NULL, 'KG', 'TON', 0.001, 'EXACT', 'SI', 'Kilogram to metric ton'),
        ('f2000000-0000-4000-8000-000000000005', now(), now(), NULL, NULL, NULL, NULL, 'M', 'MM', 1000, 'EXACT', 'SI', 'Meter to millimeter'),
        ('f2000000-0000-4000-8000-000000000006', now(), now(), NULL, NULL, NULL, NULL, 'MM', 'M', 0.001, 'EXACT', 'SI', 'Millimeter to meter'),
        ('f2000000-0000-4000-8000-000000000007', now(), now(), NULL, NULL, NULL, NULL, 'CM', 'MM', 10, 'EXACT', 'SI', 'Centimeter to millimeter'),
        ('f2000000-0000-4000-8000-000000000008', now(), now(), NULL, NULL, NULL, NULL, 'MM', 'CM', 0.1, 'EXACT', 'SI', 'Millimeter to centimeter'),
        ('f2000000-0000-4000-8000-000000000009', now(), now(), NULL, NULL, NULL, NULL, 'M2', 'MM2', 1000000, 'EXACT', 'SI', 'Square meter to square millimeter'),
        ('f2000000-0000-4000-8000-000000000010', now(), now(), NULL, NULL, NULL, NULL, 'MM2', 'M2', 0.000001, 'EXACT', 'SI', 'Square millimeter to square meter'),
        ('f2000000-0000-4000-8000-000000000011', now(), now(), NULL, NULL, NULL, NULL, 'L', 'ML', 1000, 'EXACT', 'SI', 'Liter to milliliter'),
        ('f2000000-0000-4000-8000-000000000012', now(), now(), NULL, NULL, NULL, NULL, 'ML', 'L', 0.001, 'EXACT', 'SI', 'Milliliter to liter'),
        ('f2000000-0000-4000-8000-000000000013', now(), now(), NULL, NULL, NULL, NULL, 'H', 'MIN', 60, 'EXACT', 'SI', 'Hour to minute'),
        ('f2000000-0000-4000-8000-000000000014', now(), now(), NULL, NULL, NULL, NULL, 'MIN', 'H', 0.016666667, 'EXACT', 'SI', 'Minute to hour'),
        ('f2000000-0000-4000-8000-000000000015', now(), now(), NULL, NULL, NULL, NULL, 'EA', 'EA', 1, 'EXACT', 'SI', 'Identity — each to each'),
        ('f2000000-0000-4000-8000-000000000016', now(), now(), NULL, NULL, NULL, NULL, 'PCS', 'EA', 1, 'EXACT', 'MITRA', 'Pieces to each (1:1 for engineering BOMs)')
      ON CONFLICT ("from_uom", "to_uom") DO NOTHING
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // RBAC: new permissions + role grants for Sprint 2.3.1 capabilities
    // ═══════════════════════════════════════════════════════════════════════
    const permissions: { resource: string; action: string }[] = [
      { resource: 'engineering:bom', action: 'substitute' },
      { resource: 'engineering:routing', action: 'version' },
      { resource: 'engineering:review', action: 'assign' },
      { resource: 'engineering:uom', action: 'read' },
      { resource: 'engineering:uom', action: 'update' },
      { resource: 'engineering:traceability', action: 'write' },
      { resource: 'engineering:outbox', action: 'read' },
      { resource: 'engineering:outbox', action: 'retry' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [p.resource, p.action],
      );
    }

    const eng = (a: string) => `engineering:${a}`;
    const ADMIN_P = [
      eng('bom:substitute'), eng('routing:version'), eng('review:assign'),
      eng('uom:read'), eng('uom:update'),
      eng('traceability:write'), eng('outbox:read'), eng('outbox:retry'),
    ];
    const MANAGEMENT_P = [...ADMIN_P];
    const DESIGN_P = [
      eng('bom:substitute'), eng('routing:version'), eng('review:assign'),
      eng('uom:read'), eng('uom:update'), eng('traceability:write'),
    ];
    const PLANNING_P = [
      eng('bom:substitute'), eng('routing:version'), eng('review:assign'),
      eng('uom:read'), eng('uom:update'), eng('traceability:write'),
    ];
    const PRODUCTION_P = [eng('uom:read')];
    const QUALITY_P = [eng('uom:read'), eng('review:assign')];
    const CUSTOMER_P = [eng('uom:read')];

    const upperMatrix: Record<string, string[]> = {
      ADMIN: ADMIN_P,
      MANAGEMENT: MANAGEMENT_P,
      SALES: [...CUSTOMER_P],
      DESIGN: DESIGN_P,
      PLANNING: PLANNING_P,
      PRODUCTION: PRODUCTION_P,
      QUALITY: QUALITY_P,
      CUSTOMER: CUSTOMER_P,
    };
    const lowerMatrix: Record<string, string[]> = {
      admin: ADMIN_P,
      manager: MANAGEMENT_P,
      sales_rep: [...CUSTOMER_P],
      project_lead: MANAGEMENT_P,
      engineer: DESIGN_P,
      production_planner: PLANNING_P,
      operator: PRODUCTION_P,
      qa_inspector: QUALITY_P,
      qa_engineer: QUALITY_P,
      service_tech: [...PRODUCTION_P],
      viewer: CUSTOMER_P,
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

    // ═══════════════════════════════════════════════════════════════════════
    // AI readiness hooks for Sprint 2.3.1 events (prepared, disabled)
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "engineering_ai_hooks" ("id", "created_at", "updated_at", "deleted_at", "created_by", "updated_by", "tenant_id",
        "hook_code", "hook_name", "description", "event_type", "is_enabled", "config", "notes")
      VALUES
        ('f0000000-0000-4000-8000-000000000009', now(), now(), NULL, NULL, NULL, NULL,
          'SUBSTITUTE_SUGGESTION', 'Substitute Suggestion',
          'Suggests substitute/alternate BOM items from material and component libraries when a substitution is registered.', 'engineering.bom.substitution_changed', FALSE, '{"recommender":"substitute-similarity-v1","top_k":5}', 'Prepared integration point.'),
        ('f0000000-0000-4000-8000-000000000010', now(), now(), NULL, NULL, NULL, NULL,
          'ROUTING_COMPARISON', 'Routing Version Comparison',
          'Summarizes routing operation changes between versioned snapshots for release notes.', 'engineering.routing.versioned', FALSE, '{"summarizer":"routing-diff-v1"}', 'Prepared integration point.'),
        ('f0000000-0000-4000-8000-000000000011', now(), now(), NULL, NULL, NULL, NULL,
          'REVIEW_CAPACITY_BALANCING', 'Review Capacity Balancing',
          'Balances review workloads across assignees and suggests due dates.', 'engineering.review.assigned', FALSE, '{"model":"workload-balancer-v1"}', 'Prepared integration point.')
      ON CONFLICT ("hook_code") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_trace_edges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "domain_outbox"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uom_conversions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_review_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_routing_revisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_bom_substitutions"`);

    await queryRunner.query(`
      ALTER TABLE "engineering_bom_items"
        DROP COLUMN IF EXISTS "effective_from", DROP COLUMN IF EXISTS "effective_to"
    `);
    await queryRunner.query(`
      ALTER TABLE "process_plans"
        DROP COLUMN IF EXISTS "drawing_id", DROP COLUMN IF EXISTS "bom_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "retrials"
        DROP COLUMN IF EXISTS "part_id", DROP COLUMN IF EXISTS "drawing_id",
        DROP COLUMN IF EXISTS "bom_item_id", DROP COLUMN IF EXISTS "routing_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "inspection_reports"
        DROP COLUMN IF EXISTS "part_id", DROP COLUMN IF EXISTS "drawing_id",
        DROP COLUMN IF EXISTS "bom_item_id", DROP COLUMN IF EXISTS "routing_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "trial_observations"
        DROP COLUMN IF EXISTS "part_id", DROP COLUMN IF EXISTS "drawing_id",
        DROP COLUMN IF EXISTS "bom_item_id", DROP COLUMN IF EXISTS "routing_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "work_orders"
        DROP COLUMN IF EXISTS "drawing_id", DROP COLUMN IF EXISTS "bom_id",
        DROP COLUMN IF EXISTS "bom_item_id", DROP COLUMN IF EXISTS "routing_id",
        DROP COLUMN IF EXISTS "process_plan_id"
    `);

    const newPerms: { resource: string; action: string }[] = [
      { resource: 'engineering:bom', action: 'substitute' },
      { resource: 'engineering:routing', action: 'version' },
      { resource: 'engineering:review', action: 'assign' },
      { resource: 'engineering:uom', action: 'read' },
      { resource: 'engineering:uom', action: 'update' },
      { resource: 'engineering:traceability', action: 'write' },
      { resource: 'engineering:outbox', action: 'read' },
      { resource: 'engineering:outbox', action: 'retry' },
    ];
    for (const p of newPerms) {
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
