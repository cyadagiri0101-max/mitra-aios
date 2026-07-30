import { MigrationInterface, QueryRunner } from 'typeorm';

export class PermissionSeed1700000000010 implements MigrationInterface {
  name = 'PermissionSeed1700000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Seed roles ──────────────────────────────────────────────────────────
    const roles: { name: string; description: string }[] = [
      { name: 'admin', description: 'Full system access' },
      { name: 'manager', description: 'Operational management' },
      { name: 'sales_rep', description: 'Commercial domain: customers, RFQs, quotations' },
      { name: 'project_lead', description: 'Project domain: create and manage projects' },
      { name: 'engineer', description: 'Engineering domain: designs, BOM, process plans' },
      { name: 'production_planner', description: 'Manufacturing domain: production plans' },
      { name: 'operator', description: 'Manufacturing execution: work orders, production runs' },
      { name: 'qa_inspector', description: 'Quality domain: inspections, NCRs' },
      { name: 'qa_engineer', description: 'Quality domain: CAPA, advanced quality workflows' },
      { name: 'service_tech', description: 'Service domain: dispatch, installation, maintenance' },
      { name: 'viewer', description: 'Read-only access across all domains' },
    ];

    for (const r of roles) {
      await queryRunner.query(
        `INSERT INTO roles (name, description, is_system) VALUES ($1, $2, TRUE) ON CONFLICT (name) DO NOTHING`,
        [r.name, r.description],
      );
    }

    // ── Seed permissions ────────────────────────────────────────────────────
    const permissions: { resource: string; action: string }[] = [
      // Commercial
      { resource: 'commercial:customer', action: 'create' },
      { resource: 'commercial:customer', action: 'read' },
      { resource: 'commercial:customer', action: 'update' },
      { resource: 'commercial:customer', action: 'delete' },
      { resource: 'commercial:contact', action: 'create' },
      { resource: 'commercial:contact', action: 'read' },
      { resource: 'commercial:contact', action: 'update' },
      { resource: 'commercial:contact', action: 'delete' },
      { resource: 'commercial:rfq', action: 'create' },
      { resource: 'commercial:rfq', action: 'read' },
      { resource: 'commercial:rfq', action: 'update' },
      { resource: 'commercial:rfq', action: 'delete' },
      { resource: 'commercial:quotation', action: 'create' },
      { resource: 'commercial:quotation', action: 'read' },
      { resource: 'commercial:quotation', action: 'update' },
      { resource: 'commercial:quotation', action: 'delete' },
      { resource: 'commercial:quotation', action: 'approve' },
      // Project
      { resource: 'project:project', action: 'create' },
      { resource: 'project:project', action: 'read' },
      { resource: 'project:project', action: 'update' },
      { resource: 'project:project', action: 'delete' },
      { resource: 'project:milestone', action: 'create' },
      { resource: 'project:milestone', action: 'read' },
      { resource: 'project:milestone', action: 'update' },
      { resource: 'project:milestone', action: 'delete' },
      { resource: 'project:task', action: 'create' },
      { resource: 'project:task', action: 'read' },
      { resource: 'project:task', action: 'update' },
      { resource: 'project:task', action: 'delete' },
      { resource: 'project:team', action: 'create' },
      { resource: 'project:team', action: 'read' },
      { resource: 'project:team', action: 'update' },
      { resource: 'project:team', action: 'delete' },
      { resource: 'project:timeline', action: 'create' },
      { resource: 'project:timeline', action: 'read' },
      { resource: 'project:timeline', action: 'update' },
      { resource: 'project:timeline', action: 'delete' },
      // Engineering
      { resource: 'engineering:design', action: 'create' },
      { resource: 'engineering:design', action: 'read' },
      { resource: 'engineering:design', action: 'update' },
      { resource: 'engineering:design', action: 'delete' },
      { resource: 'engineering:drawing_revision', action: 'create' },
      { resource: 'engineering:drawing_revision', action: 'read' },
      { resource: 'engineering:drawing_revision', action: 'update' },
      { resource: 'engineering:drawing_revision', action: 'delete' },
      { resource: 'engineering:bom', action: 'create' },
      { resource: 'engineering:bom', action: 'read' },
      { resource: 'engineering:bom', action: 'update' },
      { resource: 'engineering:bom', action: 'delete' },
      { resource: 'engineering:process_plan', action: 'create' },
      { resource: 'engineering:process_plan', action: 'read' },
      { resource: 'engineering:process_plan', action: 'update' },
      { resource: 'engineering:process_plan', action: 'delete' },
      { resource: 'engineering:engineering_change', action: 'create' },
      { resource: 'engineering:engineering_change', action: 'read' },
      { resource: 'engineering:engineering_change', action: 'update' },
      { resource: 'engineering:engineering_change', action: 'delete' },
      // Manufacturing
      { resource: 'manufacturing:production_plan', action: 'create' },
      { resource: 'manufacturing:production_plan', action: 'read' },
      { resource: 'manufacturing:production_plan', action: 'update' },
      { resource: 'manufacturing:production_plan', action: 'delete' },
      { resource: 'manufacturing:machine', action: 'create' },
      { resource: 'manufacturing:machine', action: 'read' },
      { resource: 'manufacturing:machine', action: 'update' },
      { resource: 'manufacturing:machine', action: 'delete' },
      { resource: 'manufacturing:work_order', action: 'create' },
      { resource: 'manufacturing:work_order', action: 'read' },
      { resource: 'manufacturing:work_order', action: 'update' },
      { resource: 'manufacturing:work_order', action: 'delete' },
      { resource: 'manufacturing:production_run', action: 'create' },
      { resource: 'manufacturing:production_run', action: 'read' },
      { resource: 'manufacturing:production_run', action: 'update' },
      { resource: 'manufacturing:production_run', action: 'delete' },
      { resource: 'manufacturing:trial', action: 'create' },
      { resource: 'manufacturing:trial', action: 'read' },
      { resource: 'manufacturing:trial', action: 'update' },
      { resource: 'manufacturing:trial', action: 'delete' },
      // Quality
      { resource: 'quality:inspection_plan', action: 'create' },
      { resource: 'quality:inspection_plan', action: 'read' },
      { resource: 'quality:inspection_plan', action: 'update' },
      { resource: 'quality:inspection_plan', action: 'delete' },
      { resource: 'quality:inspection_result', action: 'create' },
      { resource: 'quality:inspection_result', action: 'read' },
      { resource: 'quality:inspection_result', action: 'update' },
      { resource: 'quality:inspection_result', action: 'delete' },
      { resource: 'quality:ncr', action: 'create' },
      { resource: 'quality:ncr', action: 'read' },
      { resource: 'quality:ncr', action: 'update' },
      { resource: 'quality:ncr', action: 'delete' },
      { resource: 'quality:capa', action: 'create' },
      { resource: 'quality:capa', action: 'read' },
      { resource: 'quality:capa', action: 'update' },
      { resource: 'quality:capa', action: 'delete' },
      // Service
      { resource: 'service:dispatch', action: 'create' },
      { resource: 'service:dispatch', action: 'read' },
      { resource: 'service:dispatch', action: 'update' },
      { resource: 'service:dispatch', action: 'delete' },
      { resource: 'service:installation', action: 'create' },
      { resource: 'service:installation', action: 'read' },
      { resource: 'service:installation', action: 'update' },
      { resource: 'service:installation', action: 'delete' },
      { resource: 'service:maintenance', action: 'create' },
      { resource: 'service:maintenance', action: 'read' },
      { resource: 'service:maintenance', action: 'update' },
      { resource: 'service:maintenance', action: 'delete' },
      { resource: 'service:service_request', action: 'create' },
      { resource: 'service:service_request', action: 'read' },
      { resource: 'service:service_request', action: 'update' },
      { resource: 'service:service_request', action: 'delete' },
      { resource: 'service:warranty', action: 'create' },
      { resource: 'service:warranty', action: 'read' },
      { resource: 'service:warranty', action: 'update' },
      { resource: 'service:warranty', action: 'delete' },
      // Security / System
      { resource: 'system:user', action: 'create' },
      { resource: 'system:user', action: 'read' },
      { resource: 'system:user', action: 'update' },
      { resource: 'system:user', action: 'delete' },
      { resource: 'system:role', action: 'create' },
      { resource: 'system:role', action: 'read' },
      { resource: 'system:role', action: 'update' },
      { resource: 'system:role', action: 'delete' },
      { resource: 'system:permission', action: 'create' },
      { resource: 'system:permission', action: 'read' },
      { resource: 'system:permission', action: 'update' },
      { resource: 'system:permission', action: 'delete' },
      { resource: 'system:audit_log', action: 'read' },
    ];

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [p.resource, p.action],
      );
    }

    // ── Assign permissions to roles ─────────────────────────────────────────
    const rolePerms: Record<string, string[]> = {
      admin: permissions.map((p) => `${p.resource}:${p.action}`),
      manager: [
        'commercial:customer:create', 'commercial:customer:read', 'commercial:customer:update', 'commercial:customer:delete',
        'commercial:contact:create', 'commercial:contact:read', 'commercial:contact:update', 'commercial:contact:delete',
        'commercial:rfq:create', 'commercial:rfq:read', 'commercial:rfq:update', 'commercial:rfq:delete',
        'commercial:quotation:create', 'commercial:quotation:read', 'commercial:quotation:update', 'commercial:quotation:delete', 'commercial:quotation:approve',
        'project:project:create', 'project:project:read', 'project:project:update', 'project:project:delete',
        'project:milestone:create', 'project:milestone:read', 'project:milestone:update', 'project:milestone:delete',
        'project:task:create', 'project:task:read', 'project:task:update', 'project:task:delete',
        'project:team:create', 'project:team:read', 'project:team:update', 'project:team:delete',
        'project:timeline:create', 'project:timeline:read', 'project:timeline:update', 'project:timeline:delete',
        'engineering:design:create', 'engineering:design:read', 'engineering:design:update', 'engineering:design:delete',
        'engineering:drawing_revision:create', 'engineering:drawing_revision:read', 'engineering:drawing_revision:update', 'engineering:drawing_revision:delete',
        'engineering:bom:create', 'engineering:bom:read', 'engineering:bom:update', 'engineering:bom:delete',
        'engineering:process_plan:create', 'engineering:process_plan:read', 'engineering:process_plan:update', 'engineering:process_plan:delete',
        'engineering:engineering_change:create', 'engineering:engineering_change:read', 'engineering:engineering_change:update', 'engineering:engineering_change:delete',
        'manufacturing:production_plan:create', 'manufacturing:production_plan:read', 'manufacturing:production_plan:update', 'manufacturing:production_plan:delete',
        'manufacturing:machine:create', 'manufacturing:machine:read', 'manufacturing:machine:update', 'manufacturing:machine:delete',
        'manufacturing:work_order:create', 'manufacturing:work_order:read', 'manufacturing:work_order:update', 'manufacturing:work_order:delete',
        'manufacturing:production_run:create', 'manufacturing:production_run:read', 'manufacturing:production_run:update', 'manufacturing:production_run:delete',
        'manufacturing:trial:create', 'manufacturing:trial:read', 'manufacturing:trial:update', 'manufacturing:trial:delete',
        'quality:inspection_plan:create', 'quality:inspection_plan:read', 'quality:inspection_plan:update', 'quality:inspection_plan:delete',
        'quality:inspection_result:create', 'quality:inspection_result:read', 'quality:inspection_result:update', 'quality:inspection_result:delete',
        'quality:ncr:create', 'quality:ncr:read', 'quality:ncr:update', 'quality:ncr:delete',
        'quality:capa:create', 'quality:capa:read', 'quality:capa:update', 'quality:capa:delete',
        'service:dispatch:create', 'service:dispatch:read', 'service:dispatch:update', 'service:dispatch:delete',
        'service:installation:create', 'service:installation:read', 'service:installation:update', 'service:installation:delete',
        'service:maintenance:create', 'service:maintenance:read', 'service:maintenance:update', 'service:maintenance:delete',
        'service:service_request:create', 'service:service_request:read', 'service:service_request:update', 'service:service_request:delete',
        'service:warranty:create', 'service:warranty:read', 'service:warranty:update', 'service:warranty:delete',
        'system:user:read', 'system:role:read', 'system:permission:read', 'system:audit_log:read',
      ],
      sales_rep: [
        'commercial:customer:create', 'commercial:customer:read', 'commercial:customer:update',
        'commercial:contact:create', 'commercial:contact:read', 'commercial:contact:update',
        'commercial:rfq:create', 'commercial:rfq:read', 'commercial:rfq:update', 'commercial:rfq:delete',
        'commercial:quotation:create', 'commercial:quotation:read', 'commercial:quotation:update', 'commercial:quotation:delete',
      ],
      project_lead: [
        'commercial:customer:read', 'commercial:contact:read', 'commercial:rfq:read', 'commercial:quotation:read',
        'project:project:create', 'project:project:read', 'project:project:update', 'project:project:delete',
        'project:milestone:create', 'project:milestone:read', 'project:milestone:update', 'project:milestone:delete',
        'project:task:create', 'project:task:read', 'project:task:update', 'project:task:delete',
        'project:team:create', 'project:team:read', 'project:team:update', 'project:team:delete',
        'project:timeline:create', 'project:timeline:read', 'project:timeline:update', 'project:timeline:delete',
        'engineering:design:read', 'engineering:engineering_change:create', 'engineering:engineering_change:read', 'engineering:engineering_change:update',
      ],
      engineer: [
        'commercial:customer:read', 'commercial:contact:read', 'commercial:rfq:read', 'commercial:quotation:read',
        'project:project:read', 'project:milestone:read', 'project:task:read', 'project:task:create', 'project:task:update',
        'project:team:read', 'project:timeline:read',
        'engineering:design:create', 'engineering:design:read', 'engineering:design:update', 'engineering:design:delete',
        'engineering:drawing_revision:create', 'engineering:drawing_revision:read', 'engineering:drawing_revision:update',
        'engineering:bom:create', 'engineering:bom:read', 'engineering:bom:update',
        'engineering:process_plan:create', 'engineering:process_plan:read', 'engineering:process_plan:update',
        'engineering:engineering_change:create', 'engineering:engineering_change:read', 'engineering:engineering_change:update',
      ],
      production_planner: [
        'project:project:read', 'project:milestone:read', 'project:task:read', 'project:timeline:read',
        'manufacturing:production_plan:create', 'manufacturing:production_plan:read', 'manufacturing:production_plan:update', 'manufacturing:production_plan:delete',
        'manufacturing:machine:create', 'manufacturing:machine:read', 'manufacturing:machine:update',
        'manufacturing:work_order:create', 'manufacturing:work_order:read', 'manufacturing:work_order:update',
        'manufacturing:production_run:read',
        'manufacturing:trial:create', 'manufacturing:trial:read', 'manufacturing:trial:update',
      ],
      operator: [
        'project:project:read',
        'manufacturing:machine:read', 'manufacturing:work_order:read', 'manufacturing:work_order:update',
        'manufacturing:production_run:create', 'manufacturing:production_run:read', 'manufacturing:production_run:update',
        'manufacturing:trial:create', 'manufacturing:trial:read', 'manufacturing:trial:update',
      ],
      qa_inspector: [
        'project:project:read',
        'quality:inspection_plan:read', 'quality:inspection_result:create', 'quality:inspection_result:read', 'quality:inspection_result:update',
        'quality:ncr:create', 'quality:ncr:read', 'quality:ncr:update',
      ],
      qa_engineer: [
        'project:project:read', 'engineering:design:read',
        'quality:inspection_plan:create', 'quality:inspection_plan:read', 'quality:inspection_plan:update', 'quality:inspection_plan:delete',
        'quality:inspection_result:create', 'quality:inspection_result:read', 'quality:inspection_result:update',
        'quality:ncr:create', 'quality:ncr:read', 'quality:ncr:update', 'quality:ncr:delete',
        'quality:capa:create', 'quality:capa:read', 'quality:capa:update', 'quality:capa:delete',
      ],
      service_tech: [
        'commercial:customer:read', 'commercial:contact:read', 'commercial:quotation:read',
        'project:project:read',
        'service:dispatch:create', 'service:dispatch:read', 'service:dispatch:update',
        'service:installation:create', 'service:installation:read', 'service:installation:update',
        'service:maintenance:create', 'service:maintenance:read', 'service:maintenance:update',
        'service:service_request:create', 'service:service_request:read', 'service:service_request:update', 'service:service_request:delete',
        'service:warranty:read',
      ],
      viewer: [
        'commercial:customer:read', 'commercial:contact:read', 'commercial:rfq:read', 'commercial:quotation:read',
        'project:project:read', 'project:milestone:read', 'project:task:read', 'project:team:read', 'project:timeline:read',
        'engineering:design:read', 'engineering:drawing_revision:read', 'engineering:bom:read', 'engineering:process_plan:read', 'engineering:engineering_change:read',
        'manufacturing:production_plan:read', 'manufacturing:machine:read', 'manufacturing:work_order:read', 'manufacturing:production_run:read', 'manufacturing:trial:read',
        'quality:inspection_plan:read', 'quality:inspection_result:read', 'quality:ncr:read', 'quality:capa:read',
        'service:dispatch:read', 'service:installation:read', 'service:maintenance:read', 'service:service_request:read', 'service:warranty:read',
        'system:audit_log:read',
      ],
    };

    for (const [roleName, permKeys] of Object.entries(rolePerms)) {
      for (const permKey of permKeys) {
        const [resource, action] = permKey.split(':');
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id
           FROM roles r, permissions p
           WHERE r.name = $1 AND p.resource = $2 AND p.action = $3
           ON CONFLICT DO NOTHING`,
          [roleName, resource, action],
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all seeded permissions
    for (const [roleName] of Object.entries({
      admin: [], manager: [], sales_rep: [], project_lead: [],
      engineer: [], production_planner: [], operator: [],
      qa_inspector: [], qa_engineer: [], service_tech: [], viewer: [],
    })) {
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = $1)`,
        [roleName],
      );
    }
    await queryRunner.query(`DELETE FROM permissions`);
    await queryRunner.query(`DELETE FROM roles WHERE is_system = TRUE`);
  }
}
