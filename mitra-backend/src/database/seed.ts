import { DataSource } from 'typeorm';
import { Role } from '../modules/platform/entities/role.entity';
import { Permission } from '../modules/platform/entities/permission.entity';
import { RolePermission } from '../modules/platform/entities/role-permission.entity';
import { Tenant } from '../modules/platform/entities/tenant.entity';
import { User } from '../modules/platform/entities/user.entity';
import { Supplier, SupplierStatus } from '../modules/supplier/entities/supplier.entity';
import { Product, ProductStatus } from '../modules/product/entities/product.entity';
import { WorkflowState } from '../modules/workflow/entities/workflow-state.entity';
import { WorkflowTransition } from '../modules/workflow/entities/workflow-transition.entity';
import { MilestoneTemplate } from '../modules/project/entities/milestone-template.entity';
import { MilestoneTemplateItem } from '../modules/project/entities/milestone-template-item.entity';
import { Department } from '../modules/project/entities/department.entity';
const bcrypt = require('bcryptjs');

/** Run: npx ts-node src/database/seed.ts */
async function seed(dataSource: DataSource) {
  console.log('🌱 Seeding MITRA database...');

  // ─── Roles ──────────────────────────────────────────────────────────────
  const rolesData = [
    { name: 'ADMIN',       description: 'System administrator with full access' },
    { name: 'MANAGEMENT',  description: 'Management-level user, can approve everything' },
    { name: 'SALES',       description: 'Handles enquiries and quotations' },
    { name: 'DESIGN',      description: 'Mold design engineers' },
    { name: 'PLANNING',    description: 'Process and machine planning team' },
    { name: 'PRODUCTION',  description: 'Shop floor and manufacturing team' },
    { name: 'QUALITY',     description: 'Quality and inspection team' },
    { name: 'CUSTOMER',    description: 'External customer portal access' },
  ];

  const roleRepo = dataSource.getRepository(Role);
  const savedRoles: Record<string, any> = {};

  for (const r of rolesData) {
    let role = await roleRepo.findOne({ where: { name: r.name } });
    if (!role) {
      role = await roleRepo.save(roleRepo.create({ name: r.name, description: r.description }));
      console.log(`  ✓ Role: ${r.name}`);
    }
    savedRoles[r.name] = role;
  }

  // ─── Permissions ────────────────────────────────────────────────────────
  const permissionsData = [
    // Project permissions
    { resource: 'project', action: 'read' },
    { resource: 'project', action: 'create' },
    { resource: 'project', action: 'update' },
    { resource: 'project', action: 'delete' },
    { resource: 'project', action: 'transition' },
    // Design permissions
    { resource: 'design', action: 'read' },
    { resource: 'design', action: 'create' },
    { resource: 'design', action: 'approve' },
    { resource: 'design', action: 'release' },
    { resource: 'design', action: 'delete' },
    // Quality permissions
    { resource: 'quality', action: 'read' },
    { resource: 'quality', action: 'create' },
    { resource: 'quality', action: 'close' },
    { resource: 'quality', action: 'delete' },
    // Document permissions
    { resource: 'document', action: 'read' },
    { resource: 'document', action: 'upload' },
    { resource: 'document', action: 'download' },
    { resource: 'document', action: 'checkout' },
    { resource: 'document', action: 'delete' },
    // Workflow permissions
    { resource: 'workflow', action: 'read' },
    { resource: 'workflow', action: 'transition' },
    { resource: 'workflow', action: 'approve' },
    // Service permissions
    { resource: 'service', action: 'read' },
    { resource: 'service', action: 'create' },
    { resource: 'service', action: 'update' },
    { resource: 'service', action: 'delete' },
    // User/admin permissions
    { resource: 'user', action: 'read' },
    { resource: 'user', action: 'create' },
    { resource: 'user', action: 'update' },
    { resource: 'user', action: 'delete' },
    { resource: 'user', action: 'assign_role' }, // C-1: ADMIN-only role assignment
    { resource: 'role', action: 'read' },
    { resource: 'role', action: 'manage' },
    { resource: 'audit', action: 'read' },
    // Commercial permissions (Sprint 2.1)
    { resource: 'customer', action: 'read' },
    { resource: 'customer', action: 'create' },
    { resource: 'customer', action: 'update' },
    { resource: 'customer', action: 'delete' },
    { resource: 'customer', action: 'import' },
    { resource: 'customer', action: 'export' },
    { resource: 'contact', action: 'read' },
    { resource: 'contact', action: 'create' },
    { resource: 'contact', action: 'update' },
    { resource: 'contact', action: 'delete' },
    { resource: 'lead', action: 'read' },
    { resource: 'lead', action: 'create' },
    { resource: 'lead', action: 'update' },
    { resource: 'lead', action: 'delete' },
    { resource: 'lead', action: 'convert' },
    { resource: 'rfq', action: 'read' },
    { resource: 'rfq', action: 'create' },
    { resource: 'rfq', action: 'update' },
    { resource: 'rfq', action: 'delete' },
    { resource: 'rfq', action: 'transition' },
    { resource: 'quotation', action: 'read' },
    { resource: 'quotation', action: 'create' },
    { resource: 'quotation', action: 'update' },
    { resource: 'quotation', action: 'delete' },
    { resource: 'quotation', action: 'approve' },
    // Project management permissions (Sprint 2.2)
    { resource: 'project:milestone', action: 'read' },
    { resource: 'project:milestone', action: 'create' },
    { resource: 'project:milestone', action: 'update' },
    { resource: 'project:milestone', action: 'delete' },
    { resource: 'project:milestone', action: 'approve' },
    { resource: 'project:task', action: 'read' },
    { resource: 'project:task', action: 'create' },
    { resource: 'project:task', action: 'update' },
    { resource: 'project:task', action: 'delete' },
    { resource: 'project:team', action: 'read' },
    { resource: 'project:team', action: 'create' },
    { resource: 'project:team', action: 'update' },
    { resource: 'project:team', action: 'delete' },
    { resource: 'project:timeline', action: 'read' },
    { resource: 'project:risk', action: 'read' },
    { resource: 'project:risk', action: 'create' },
    { resource: 'project:risk', action: 'update' },
    { resource: 'project:risk', action: 'close' },
    { resource: 'project:risk', action: 'delete' },
    { resource: 'project:document', action: 'read' },
    { resource: 'project:document', action: 'create' },
    { resource: 'project:document', action: 'update' },
    { resource: 'project:document', action: 'delete' },
    { resource: 'project:activity', action: 'read' },
    // Analytics permissions (required by the analytics controller)
    { resource: 'analytics', action: 'read' },
    { resource: 'analytics', action: 'report:read' },
    // Commercial lifecycle permissions (sales orders, invoices, payments, credit notes)
    { resource: 'salesOrder', action: 'read' },
    { resource: 'salesOrder', action: 'create' },
    { resource: 'salesOrder', action: 'update' },
    { resource: 'salesOrder', action: 'delete' },
    { resource: 'salesOrder', action: 'approve' },
    { resource: 'invoice', action: 'read' },
    { resource: 'invoice', action: 'create' },
    { resource: 'invoice', action: 'update' },
    { resource: 'invoice', action: 'delete' },
    { resource: 'invoice', action: 'approve' },
    { resource: 'payment', action: 'read' },
    { resource: 'payment', action: 'create' },
    { resource: 'payment', action: 'verify' },
    { resource: 'creditNote', action: 'read' },
    { resource: 'creditNote', action: 'create' },
    { resource: 'creditNote', action: 'apply' },
    { resource: 'creditNote', action: 'cancel' },
    // M1 Sprint 1 — People master (employees, skills, matrix, availability)
    { resource: 'employee', action: 'read' },
    { resource: 'employee', action: 'create' },
    { resource: 'employee', action: 'update' },
    { resource: 'employee', action: 'delete' },
    { resource: 'skill', action: 'read' },
    { resource: 'skill', action: 'create' },
    { resource: 'skill', action: 'update' },
    { resource: 'skill', action: 'delete' },
    { resource: 'employee_skill', action: 'read' },
    { resource: 'employee_skill', action: 'assign' },
    { resource: 'employee_skill', action: 'update' },
    { resource: 'employee_skill', action: 'remove' },
    { resource: 'availability', action: 'read' },
    { resource: 'availability', action: 'create' },
    { resource: 'availability', action: 'update' },
    { resource: 'availability', action: 'delete' },
    // M1 Sprint 1 — Engineering Decision Log
    { resource: 'engineering_decision', action: 'read' },
    { resource: 'engineering_decision', action: 'create' },
    { resource: 'engineering_decision', action: 'update' },
    { resource: 'engineering_decision', action: 'submit' },
    { resource: 'engineering_decision', action: 'approve' },
    { resource: 'engineering_decision', action: 'reject' },
    { resource: 'engineering_decision', action: 'cancel' },
    { resource: 'engineering_decision', action: 'supersede' },
    // M2 Sprint 1 — Design Load Foundation
    { resource: 'design_standard', action: 'read' },
    { resource: 'design_standard', action: 'create' },
    { resource: 'design_standard', action: 'update' },
    { resource: 'design_standard', action: 'delete' },
    { resource: 'design_load', action: 'read' },
    { resource: 'design_load', action: 'create' },
    { resource: 'design_load', action: 'update' },
    { resource: 'design_load', action: 'delete' },
    { resource: 'design_load', action: 'estimate' },
    { resource: 'design_system', action: 'read' },
    { resource: 'design_system', action: 'create' },
    { resource: 'design_system', action: 'update' },
    { resource: 'design_system', action: 'delete' },
    // M2 Sprint 2 — Schedule Baselines & Capacity Intelligence
    { resource: 'baseline', action: 'read' },
    { resource: 'baseline', action: 'create' },
    { resource: 'baseline', action: 'update' },
    { resource: 'baseline', action: 'activate' },
    { resource: 'baseline', action: 'compare' },
    { resource: 'baseline', action: 'delete' },
    { resource: 'capacity', action: 'read' },
    { resource: 'capacity', action: 'simulate' },
  ];

  const permRepo = dataSource.getRepository(Permission);
  const savedPermissions: Record<string, any> = {};
  for (const p of permissionsData) {
    let perm = await permRepo.findOne({ where: { resource: p.resource, action: p.action } });
    if (!perm) {
      perm = await permRepo.save(permRepo.create(p));
    }
    savedPermissions[`${p.resource}:${p.action}`] = perm;
  }
  console.log(`  ✓ ${permissionsData.length} permissions seeded`);

  // ─── Role ↔ Permission assignments ─────────────────────────────────────
  // Without this, every user's JWT `permissions` claim and /auth/me response
  // is an empty array regardless of role (Role.permissions relation has no
  // rows), which silently disables every permission-gated check in the app
  // (e.g. WorkflowService transition guards) even for ADMIN.
  const rolePermissionsMatrix: Record<string, string[]> = {
    ADMIN: Object.keys(savedPermissions), // full access
    MANAGEMENT: [
      'project:read', 'project:create', 'project:update', 'project:delete', 'project:transition',
      'project:milestone:read', 'project:milestone:create', 'project:milestone:update', 'project:milestone:delete', 'project:milestone:approve',
      'project:task:read', 'project:task:create', 'project:task:update', 'project:task:delete',
      'project:team:read', 'project:team:create', 'project:team:update', 'project:team:delete',
      'project:timeline:read',
      'project:risk:read', 'project:risk:create', 'project:risk:update', 'project:risk:close', 'project:risk:delete',
      'project:document:read', 'project:document:create', 'project:document:update', 'project:document:delete',
      'project:activity:read',
      'design:read', 'design:create', 'design:approve', 'design:release', 'design:delete',
      'quality:read', 'quality:create', 'quality:close', 'quality:delete',
      'document:read', 'document:upload', 'document:download', 'document:checkout', 'document:delete',
      'workflow:read', 'workflow:transition', 'workflow:approve',
      'service:read', 'service:create', 'service:update', 'service:delete',
      'user:read', 'role:read', 'audit:read',
      'customer:read', 'customer:create', 'customer:update', 'customer:delete', 'customer:import', 'customer:export',
      'contact:read', 'contact:create', 'contact:update', 'contact:delete',
      'lead:read', 'lead:create', 'lead:update', 'lead:delete', 'lead:convert',
      'rfq:read', 'rfq:create', 'rfq:update', 'rfq:delete', 'rfq:transition',
      'quotation:read', 'quotation:create', 'quotation:update', 'quotation:delete', 'quotation:approve',
      'salesOrder:read', 'salesOrder:create', 'salesOrder:update', 'salesOrder:delete', 'salesOrder:approve',
      'invoice:read', 'invoice:create', 'invoice:update', 'invoice:delete', 'invoice:approve',
      'payment:read', 'payment:create', 'payment:verify',
      'creditNote:read', 'creditNote:create', 'creditNote:apply', 'creditNote:cancel',
      // M1 Sprint 1 — people master + decision log (full operational access)
      'employee:read', 'employee:create', 'employee:update', 'employee:delete',
      'skill:read', 'skill:create', 'skill:update', 'skill:delete',
      'employee_skill:read', 'employee_skill:assign', 'employee_skill:update', 'employee_skill:remove',
      'availability:read', 'availability:create', 'availability:update', 'availability:delete',
      'engineering_decision:read', 'engineering_decision:create', 'engineering_decision:update',
      'engineering_decision:submit', 'engineering_decision:approve', 'engineering_decision:reject',
      'engineering_decision:cancel', 'engineering_decision:supersede',
      // M2 Sprint 1 — design standards & load
      'design_standard:read', 'design_standard:create', 'design_standard:update', 'design_standard:delete',
      'design_load:read', 'design_load:create', 'design_load:update', 'design_load:delete', 'design_load:estimate',
      'design_system:read', 'design_system:create', 'design_system:update', 'design_system:delete',
    ],
    SALES: [
      'project:read', 'project:create', 'project:update', 'project:transition',
      'project:milestone:read', 'project:task:read', 'project:timeline:read',
      'project:risk:read',
      'project:document:read', 'project:document:create',
      'project:activity:read',
      'document:read', 'document:upload', 'document:download',
      'workflow:read',
      'service:read', 'service:create', 'service:update',
      'customer:read', 'customer:create', 'customer:update', 'customer:import', 'customer:export',
      'contact:read', 'contact:create', 'contact:update',
      'lead:read', 'lead:create', 'lead:update', 'lead:convert',
      'rfq:read', 'rfq:create', 'rfq:update', 'rfq:transition',
      'quotation:read', 'quotation:create', 'quotation:update',
      'salesOrder:read', 'salesOrder:create', 'salesOrder:update',
      'invoice:read', 'invoice:create',
      'payment:read', 'payment:create',
      'creditNote:read', 'creditNote:create',
      // M1 Sprint 1 — people + decisions (read-only)
      'employee:read', 'skill:read', 'employee_skill:read', 'availability:read',
      'engineering_decision:read',
    ],
    DESIGN: [
      'project:read', 'project:update',
      'project:milestone:read', 'project:milestone:update',
      'project:task:read', 'project:task:create', 'project:task:update',
      'project:team:read',
      'project:timeline:read',
      'project:risk:read', 'project:risk:create', 'project:risk:update',
      'project:document:read', 'project:document:create', 'project:document:update',
      'project:activity:read',
      'design:read', 'design:create', 'design:approve', 'design:release', 'design:delete',
      'document:read', 'document:upload', 'document:download', 'document:checkout',
      'workflow:read', 'workflow:transition',
      'service:read', 'service:update',
      'customer:read', 'contact:read', 'lead:read',
      'rfq:read', 'rfq:update',
      'quotation:read',
      // M1 Sprint 1 — people + decisions
      'employee:read', 'skill:read', 'employee_skill:read', 'employee_skill:assign', 'employee_skill:update',
      'availability:read',
      'engineering_decision:read', 'engineering_decision:create', 'engineering_decision:update',
      'engineering_decision:submit', 'engineering_decision:supersede',
      // M2 Sprint 1 — design standards & load
      'design_standard:read', 'design_standard:create', 'design_standard:update',
      'design_load:read', 'design_load:create', 'design_load:update', 'design_load:estimate',
      'design_system:read',
      // M2 Sprint 2 — Baselines & Capacity
      'baseline:read', 'baseline:create', 'baseline:update', 'baseline:activate', 'baseline:compare',
      'capacity:read', 'capacity:simulate',
    ],
    PLANNING: [
      'project:read', 'project:update', 'project:transition',
      'project:milestone:read', 'project:milestone:update',
      'project:task:read', 'project:task:create', 'project:task:update',
      'project:team:read',
      'project:timeline:read',
      'project:risk:read', 'project:risk:create', 'project:risk:update',
      'project:document:read', 'project:document:create', 'project:document:update',
      'project:activity:read',
      'document:read', 'document:upload', 'document:download',
      'workflow:read', 'workflow:transition', 'workflow:approve',
      'service:read', 'service:update',
      'customer:read', 'contact:read', 'lead:read',
      'rfq:read', 'rfq:update',
      'quotation:read',
      // M1 Sprint 1 — people + decisions (planning owns availability data)
      'employee:read', 'skill:read', 'employee_skill:read',
      'availability:read', 'availability:create', 'availability:update',
      'engineering_decision:read',
      // M2 Sprint 1 — design standards & load
      'design_standard:read', 'design_load:read', 'design_load:create', 'design_load:update', 'design_load:estimate',
      'design_system:read', 'design_system:create', 'design_system:update',
      // M2 Sprint 2 — Baselines & Capacity
      'baseline:read', 'baseline:create', 'baseline:update', 'baseline:activate', 'baseline:compare', 'baseline:delete',
      'capacity:read', 'capacity:simulate',
    ],
    PRODUCTION: [
      'project:read',
      'project:milestone:read', 'project:milestone:update',
      'project:task:read', 'project:task:create', 'project:task:update',
      'project:team:read',
      'project:timeline:read',
      'project:risk:read', 'project:risk:create', 'project:risk:update',
      'project:document:read',
      'project:activity:read',
      'quality:read', 'quality:create', 'quality:close',
      'document:read', 'document:upload', 'document:download',
      'workflow:read', 'workflow:transition',
      'service:read', 'service:update',
      'customer:read', 'contact:read', 'lead:read',
      'rfq:read',
      'quotation:read',
      // M1 Sprint 1 — people + decisions (read)
      'employee:read', 'skill:read', 'employee_skill:read', 'availability:read',
      'engineering_decision:read',
    ],
    QUALITY: [
      'project:read',
      'project:milestone:read', 'project:milestone:update',
      'project:task:read', 'project:task:update',
      'project:team:read',
      'project:timeline:read',
      'project:risk:read', 'project:risk:create', 'project:risk:update',
      'project:document:read', 'project:document:create',
      'project:activity:read',
      'design:read',
      'quality:read', 'quality:create', 'quality:close', 'quality:delete',
      'document:read', 'document:upload', 'document:download', 'document:checkout',
      'workflow:read', 'workflow:transition', 'workflow:approve',
      'service:read', 'service:update', 'service:delete',
      'customer:read', 'contact:read', 'lead:read',
      'rfq:read', 'rfq:update',
      'quotation:read',
      // M1 Sprint 1 — people + decisions (read; quality authors decisions)
      'employee:read', 'skill:read', 'employee_skill:read', 'availability:read',
      'engineering_decision:read', 'engineering_decision:create', 'engineering_decision:update',
      'engineering_decision:submit',
    ],
    CUSTOMER: [
      'project:read',
      'project:milestone:read',
      'project:task:read',
      'project:risk:read',
      'project:document:read',
      'project:activity:read',
      'quality:read',
      'document:read', 'document:download',
      'service:read',
      'customer:read', 'contact:read', 'lead:read',
      'rfq:read',
      'quotation:read',
    ],
  };

  const rolePermRepo = dataSource.getRepository(RolePermission);
  let rolePermCount = 0;
  for (const [roleName, permKeys] of Object.entries(rolePermissionsMatrix)) {
    const role = savedRoles[roleName];
    if (!role) continue;
    for (const key of permKeys) {
      const permission = savedPermissions[key];
      if (!permission) continue;
      const exists = await rolePermRepo.findOne({
        where: { roleId: role.id, permissionId: permission.id },
      });
      if (!exists) {
        await rolePermRepo.save(
          rolePermRepo.create({ roleId: role.id, permissionId: permission.id }),
        );
        rolePermCount++;
      }
    }
  }
  console.log(`  ✓ ${rolePermCount} role↔permission assignments seeded`);

  // ─── ADMIN Full-Access Reconciliation ───────────────────────────────────
  // Migrations run before the seed, so engineering/analytics/quality
  // permissions created by migrations (e.g. 0017) are granted to roles that
  // exist at migration time. The seed's ADMIN matrix only covers its own
  // permission list; reconcile ADMIN against EVERY permission in the DB so
  // the platform admin always has full access regardless of migration order.
  const adminRole = savedRoles['ADMIN'];
  const allPermissions = await dataSource
    .getRepository(Permission)
    .find({ select: ['id'] });
  if (adminRole) {
    let adminGrantCount = 0;
    for (const permission of allPermissions) {
      const exists = await rolePermRepo.findOne({
        where: { roleId: adminRole.id, permissionId: permission.id },
      });
      if (!exists) {
        await rolePermRepo.save(
          rolePermRepo.create({ roleId: adminRole.id, permissionId: permission.id }),
        );
        adminGrantCount++;
      }
    }
    console.log(`  ✓ ADMIN full-access reconciliation: ${adminGrantCount} additional assignments`);
  }

  // ─── Default Tenant ──────────────────────────────────────────────────────
  const tenantRepo = dataSource.getRepository(Tenant);
  let defaultTenant = await tenantRepo.findOne({ where: { code: 'DEFAULT' } });
  if (!defaultTenant) {
    defaultTenant = await tenantRepo.save(
      tenantRepo.create({
        name: 'MITRA Default',
        code: 'DEFAULT',
        domain: 'localhost',
        subdomain: 'default',
        isActive: true,
      }),
    );
    console.log('  ✓ Default tenant created');
  }

  // ─── Admin User ──────────────────────────────────────────────────────────
  const userRepo = dataSource.getRepository(User);
  const _seedPass = process.env.SEED_ADMIN_PASSWORD;
  if (!_seedPass) {
    console.error('[SEED] SEED_ADMIN_PASSWORD env var is required. Set it in .env before seeding.');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && !_seedPass) {
    console.error('[SEED] Set SEED_ADMIN_PASSWORD env var before seeding in production');
    process.exit(1);
  }

  let adminUser = await userRepo.findOne({ where: { email: 'admin@mitra.local' } });
  const passwordHash = await bcrypt.hash(_seedPass, 12);

  if (!adminUser) {
    adminUser = await userRepo.save(
      userRepo.create({
        email: 'admin@mitra.local',
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        roleId: savedRoles['ADMIN']?.id,
        status: 'active',
        tenantId: defaultTenant.id,
        failedLoginAttempts: 0,
      }),
    );
    console.log('  ✓ Admin user: admin@mitra.local (password: SEED_ADMIN_PASSWORD)');
  } else {
    adminUser.passwordHash = passwordHash;
    adminUser.roleId = savedRoles['ADMIN']?.id;
    adminUser.tenantId = defaultTenant.id;
    adminUser.status = 'active';
    adminUser.failedLoginAttempts = 0;
    adminUser.lockedUntil = null;
    adminUser.refreshTokenHash = null;
    await userRepo.save(adminUser);
    console.log('  ✓ Admin user password refreshed to the current SEED_ADMIN_PASSWORD');
  }

  // ─── Supplier & Product Master Data ──────────────────────────────────────
  const supplierRepo = dataSource.getRepository(Supplier);
  const productRepo = dataSource.getRepository(Product);

  const supplierSeed = [
    {
      supplierCode: 'SUPP001',
      name: 'Vikas Industrial Supplies',
      contactPerson: 'Mr. Ramesh Kumar',
      email: 'contact@vikasind.com',
      phone: '+91 98765 43210',
      website: 'https://vikasind.com',
      address: 'Plot 12, Industrial Estate, Pune',
      status: SupplierStatus.ACTIVE,
      rating: 4,
    },
    {
      supplierCode: 'SUPP002',
      name: 'Neelam Precision Components',
      contactPerson: 'Ms. Sonia Singh',
      email: 'sales@neelamprecision.com',
      phone: '+91 81234 56789',
      website: 'https://neelamprecision.com',
      address: 'Sector 4, Midc, Aurangabad',
      status: SupplierStatus.ACTIVE,
      rating: 5,
    },
  ];

  const savedSuppliers: Record<string, any> = {};
  for (const supplier of supplierSeed) {
    let existing = await supplierRepo.findOne({ where: { supplierCode: supplier.supplierCode, tenantId: defaultTenant.id } });
    if (!existing) {
      existing = await supplierRepo.save(
        supplierRepo.create({ ...supplier, tenantId: defaultTenant.id }),
      );
      console.log(`  ✓ Supplier seeded: ${supplier.supplierCode}`);
    }
    savedSuppliers[supplier.supplierCode] = existing;
  }

  const productSeed = [
    {
      productCode: 'PROD001',
      name: 'Precision Mold Plate',
      category: 'Mold Base',
      supplierId: savedSuppliers['SUPP001']?.id,
      supplierName: savedSuppliers['SUPP001']?.name,
      unitPrice: 12000.0,
      status: ProductStatus.ACTIVE,
      description: 'High-tolerance mold plate for injection molding fixtures.',
    },
    {
      productCode: 'PROD002',
      name: 'Hydraulic Ejector Pin Set',
      category: 'Ejector Parts',
      supplierId: savedSuppliers['SUPP002']?.id,
      supplierName: savedSuppliers['SUPP002']?.name,
      unitPrice: 4500.0,
      status: ProductStatus.ACTIVE,
      description: 'Heat-treated ejector pin set for large mold assemblies.',
    },
  ];

  for (const product of productSeed) {
    let existing = await productRepo.findOne({ where: { productCode: product.productCode, tenantId: defaultTenant.id } });
    if (!existing) {
      await productRepo.save(productRepo.create({ ...product, tenantId: defaultTenant.id }));
      console.log(`  ✓ Product seeded: ${product.productCode}`);
    }
  }

  // ─── Workflow States for mold_project ────────────────────────────────────
  const stateRepo = dataSource.getRepository(WorkflowState);
  const moldStages = [
    { stateCode: 'ENQUIRY',          name: 'Enquiry',           sortOrder: 1,  isInitial: true,  color: '#6B7280' },
    { stateCode: 'QUOTATION',        name: 'Quotation',         sortOrder: 2,  color: '#3B82F6' },
    { stateCode: 'APPROVAL',         name: 'Approval',          sortOrder: 3,  color: '#F59E0B' },
    { stateCode: 'PROJECT_CREATED',  name: 'Project Created',   sortOrder: 4,  color: '#10B981' },
    { stateCode: 'DESIGN_INITIATED', name: 'Design Initiated',  sortOrder: 5,  color: '#8B5CF6' },
    { stateCode: 'CPS_APPROVED',     name: 'CPS Approved',      sortOrder: 6,  color: '#6366F1' },
    { stateCode: 'DESIGN_RELEASED',  name: 'Design Released',   sortOrder: 7,  color: '#0EA5E9' },
    { stateCode: 'PROCESS_PLANNING', name: 'Process Planning',  sortOrder: 8,  color: '#14B8A6' },
    { stateCode: 'MACHINE_PLANNING', name: 'Machine Planning',  sortOrder: 9,  color: '#22C55E' },
    { stateCode: 'MANUFACTURING',    name: 'Manufacturing',     sortOrder: 10, color: '#EAB308' },
    { stateCode: 'INTERNAL_TRIAL',   name: 'Internal Trial',    sortOrder: 11, color: '#F97316' },
    { stateCode: 'CUSTOMER_TRIAL',   name: 'Customer Trial',    sortOrder: 12, color: '#EF4444' },
    { stateCode: 'CAPA',             name: 'CAPA',              sortOrder: 13, color: '#DC2626' },
    { stateCode: 'RETRIAL',          name: 'Re-Trial',          sortOrder: 14, color: '#B45309' },
    { stateCode: 'CUSTOMER_APPROVAL',name: 'Customer Approval', sortOrder: 15, color: '#7C3AED' },
    { stateCode: 'DISPATCH',         name: 'Dispatch',          sortOrder: 16, color: '#059669' },
    { stateCode: 'SERVICE',          name: 'Service',           sortOrder: 17, isFinal: true, color: '#1F2937' },
  ];

  const savedStates: Record<string, any> = {};
  for (const s of moldStages) {
    let state = await stateRepo.findOne({ where: { stateCode: s.stateCode, workflowType: 'mold_project' } });
    if (!state) {
      state = await stateRepo.save(
        stateRepo.create({
          ...s,
          workflowType: 'mold_project',
          isInitial: s.isInitial ?? false,
          isFinal: s.isFinal ?? false,
          tenantId: defaultTenant.id,
        }),
      );
    }
    savedStates[s.stateCode] = state;
  }
  console.log('  ✓ 17 MITRA workflow states seeded');

  // ─── Workflow Transitions ─────────────────────────────────────────────────
  const transitionRepo = dataSource.getRepository(WorkflowTransition);
  const transitions = [
    ['ENQUIRY','QUOTATION','Submit for Quotation'],
    ['QUOTATION','APPROVAL','Submit for Approval'],
    ['APPROVAL','PROJECT_CREATED','Approve & Create Project'],
    ['PROJECT_CREATED','DESIGN_INITIATED','Initiate Design'],
    ['DESIGN_INITIATED','CPS_APPROVED','Approve CPS'],
    ['CPS_APPROVED','DESIGN_RELEASED','Release Design'],
    ['DESIGN_RELEASED','PROCESS_PLANNING','Start Process Planning'],
    ['PROCESS_PLANNING','MACHINE_PLANNING','Start Machine Planning'],
    ['MACHINE_PLANNING','MANUFACTURING','Start Manufacturing'],
    ['MANUFACTURING','INTERNAL_TRIAL','Start Internal Trial'],
    ['INTERNAL_TRIAL','CUSTOMER_TRIAL','Start Customer Trial'],
    ['CUSTOMER_TRIAL','CAPA','Raise CAPA'],
    ['CAPA','RETRIAL','Schedule Re-Trial'],
    ['RETRIAL','CUSTOMER_APPROVAL','Submit for Customer Approval'],
    ['CUSTOMER_APPROVAL','DISPATCH','Dispatch Mold'],
    ['DISPATCH','SERVICE','Move to Service'],
  ];

  for (const [from, to, name] of transitions) {
    const fromState = savedStates[from];
    const toState = savedStates[to];
    if (!fromState || !toState) continue;

    const exists = await transitionRepo.findOne({
      where: { fromStateId: fromState.id, toStateId: toState.id, workflowType: 'mold_project' },
    });
    if (!exists) {
      await transitionRepo.save(
        transitionRepo.create({
          fromStateId: fromState.id, toStateId: toState.id,
          name, workflowType: 'mold_project',
          isActive: true, requiresApproval: false,
          tenantId: defaultTenant.id,
        }),
      );
    }
  }
  console.log('  ✓ 16 lifecycle transitions seeded');

  // ─── Workflow States for rfq (Sprint 2.1) ─────────────────────────────────
  const rfqStages = [
    { stateCode: 'DRAFT',             name: 'Draft',             sortOrder: 1,  isInitial: true,  color: '#6B7280' },
    { stateCode: 'SUBMITTED',         name: 'Submitted',         sortOrder: 2,  color: '#3B82F6' },
    { stateCode: 'TECHNICAL_REVIEW',  name: 'Technical Review',  sortOrder: 3,  color: '#8B5CF6' },
    { stateCode: 'COMMERCIAL_REVIEW', name: 'Commercial Review', sortOrder: 4,  color: '#F59E0B' },
    { stateCode: 'APPROVED',          name: 'Approved',          sortOrder: 5,  color: '#10B981' },
    { stateCode: 'QUOTED',            name: 'Quoted',            sortOrder: 6,  color: '#0EA5E9' },
    { stateCode: 'ACCEPTED',          name: 'Accepted',          sortOrder: 7,  color: '#22C55E' },
    { stateCode: 'PROJECT_READY',     name: 'Project Ready',     sortOrder: 8,  isFinal: true,   color: '#059669' },
    { stateCode: 'REJECTED',          name: 'Rejected',          sortOrder: 9,  isFinal: true,   color: '#DC2626' },
    { stateCode: 'CANCELLED',         name: 'Cancelled',         sortOrder: 10, isFinal: true,   color: '#9CA3AF' },
  ];

  const savedRfqStates: Record<string, any> = {};
  for (const s of rfqStages) {
    let state = await stateRepo.findOne({ where: { stateCode: s.stateCode, workflowType: 'rfq' } });
    if (!state) {
      state = await stateRepo.save(
        stateRepo.create({
          ...s,
          workflowType: 'rfq',
          isInitial: s.isInitial ?? false,
          isFinal: s.isFinal ?? false,
          tenantId: defaultTenant.id,
        }),
      );
    }
    savedRfqStates[s.stateCode] = state;
  }
  console.log('  ✓ 10 RFQ workflow states seeded');

  // ─── RFQ Workflow Transitions (config-driven, NOT hardcoded) ───────────────
  const rfqTransitions: Array<[string, string, string, string[]?]> = [
    ['DRAFT', 'SUBMITTED', 'Submit RFQ', ['rfq:transition']],
    ['DRAFT', 'CANCELLED', 'Cancel RFQ', ['rfq:transition']],
    ['SUBMITTED', 'TECHNICAL_REVIEW', 'Start Technical Review', ['rfq:transition']],
    ['SUBMITTED', 'REJECTED', 'Reject RFQ', ['rfq:transition']],
    ['TECHNICAL_REVIEW', 'COMMERCIAL_REVIEW', 'Start Commercial Review', ['rfq:transition']],
    ['TECHNICAL_REVIEW', 'SUBMITTED', 'Return to Submitter', ['rfq:transition']],
    ['COMMERCIAL_REVIEW', 'APPROVED', 'Approve RFQ', ['rfq:transition']],
    ['COMMERCIAL_REVIEW', 'REJECTED', 'Reject RFQ', ['rfq:transition']],
    ['COMMERCIAL_REVIEW', 'SUBMITTED', 'Return to Submitter', ['rfq:transition']],
    ['APPROVED', 'QUOTED', 'Create Quotation', ['rfq:transition']],
    ['QUOTED', 'ACCEPTED', 'Accept Quotation', ['rfq:transition']],
    ['QUOTED', 'REJECTED', 'Reject Quotation', ['rfq:transition']],
    ['ACCEPTED', 'PROJECT_READY', 'Create Project', ['rfq:transition']],
  ];

  for (const [from, to, name, perms] of rfqTransitions) {
    const fromState = savedRfqStates[from];
    const toState = savedRfqStates[to];
    if (!fromState || !toState) continue;

    const exists = await transitionRepo.findOne({
      where: { fromStateId: fromState.id, toStateId: toState.id, workflowType: 'rfq' },
    });
    if (!exists) {
      await transitionRepo.save(
        transitionRepo.create({
          fromStateId: fromState.id, toStateId: toState.id,
          name, workflowType: 'rfq',
          requiredPermissions: perms,
          isActive: true, requiresApproval: false,
          tenantId: defaultTenant.id,
        }),
      );
    }
  }
  console.log('  ✓ 13 RFQ workflow transitions seeded');

  // ─── Workflow States for project_management (Sprint 2.2) ──────────────────
  const pmStages = [
    { stateCode: 'DRAFT',           name: 'Draft',            sortOrder: 1,  isInitial: true,  color: '#6B7280' },
    { stateCode: 'KICKOFF',         name: 'Kickoff',          sortOrder: 2,  color: '#3B82F6' },
    { stateCode: 'DESIGN',          name: 'Design',           sortOrder: 3,  color: '#8B5CF6' },
    { stateCode: 'PLANNING',        name: 'Planning',         sortOrder: 4,  color: '#14B8A6' },
    { stateCode: 'EXECUTION',       name: 'Execution',        sortOrder: 5,  color: '#F59E0B' },
    { stateCode: 'MONITORING',      name: 'Monitoring',       sortOrder: 6,  color: '#0EA5E9' },
    { stateCode: 'CLOSING',         name: 'Closing',          sortOrder: 7,  color: '#6366F1' },
    { stateCode: 'COMPLETED',       name: 'Completed',        sortOrder: 8,  isFinal: true,   color: '#10B981' },
    { stateCode: 'ARCHIVED',        name: 'Archived',         sortOrder: 9,  isFinal: true,   color: '#9CA3AF' },
  ];

  const savedPmStates: Record<string, any> = {};
  for (const s of pmStages) {
    let state = await stateRepo.findOne({ where: { stateCode: s.stateCode, workflowType: 'project_management' } });
    if (!state) {
      state = await stateRepo.save(
        stateRepo.create({
          ...s,
          workflowType: 'project_management',
          isInitial: s.isInitial ?? false,
          isFinal: s.isFinal ?? false,
          tenantId: defaultTenant.id,
        }),
      );
    }
    savedPmStates[s.stateCode] = state;
  }
  console.log('  ✓ 9 project_management workflow states seeded');

  // ─── Project Management Workflow Transitions ──────────────────────────────
  const pmTransitions: Array<[string, string, string, string[]?]> = [
    ['DRAFT', 'KICKOFF', 'Start Kickoff', ['project:transition']],
    ['KICKOFF', 'DESIGN', 'Proceed to Design', ['project:transition']],
    ['DESIGN', 'PLANNING', 'Proceed to Planning', ['project:transition']],
    ['PLANNING', 'EXECUTION', 'Start Execution', ['project:transition']],
    ['EXECUTION', 'MONITORING', 'Move to Monitoring', ['project:transition']],
    ['MONITORING', 'CLOSING', 'Start Closing', ['project:transition']],
    ['CLOSING', 'COMPLETED', 'Complete Project', ['project:transition']],
    ['COMPLETED', 'ARCHIVED', 'Archive Project', ['project:transition']],
  ];

  for (const [from, to, name, perms] of pmTransitions) {
    const fromState = savedPmStates[from];
    const toState = savedPmStates[to];
    if (!fromState || !toState) continue;

    const exists = await transitionRepo.findOne({
      where: { fromStateId: fromState.id, toStateId: toState.id, workflowType: 'project_management' },
    });
    if (!exists) {
      await transitionRepo.save(
        transitionRepo.create({
          fromStateId: fromState.id, toStateId: toState.id,
          name, workflowType: 'project_management',
          requiredPermissions: perms,
          isActive: true, requiresApproval: false,
          tenantId: defaultTenant.id,
        }),
      );
    }
  }
  console.log('  ✓ 8 project_management workflow transitions seeded');

  // ─── Engineering workflows (Sprint 2.3: drawing/change/bom/routing) ─────────
  // Tenant-scoped like mold_project/rfq. Skip-if-exists per tenant so the
  // migration (which seeds the DEFAULT tenant) and a fresh-DB seed never clash.
  const engineeringWorkflows: Array<{
    workflowType: string;
    stages: Array<{ stateCode: string; name: string; sortOrder: number; isInitial?: boolean; isFinal?: boolean; color: string }>;
    transitions: Array<[string, string, string, string[]?, boolean?, string[]?]>;
  }> = [
    {
      workflowType: 'engineering_drawing',
      stages: [
        { stateCode: 'DRAFT',            name: 'Draft',            sortOrder: 1,  isInitial: true, color: '#6B7280' },
        { stateCode: 'IN_DESIGN',        name: 'In Design',        sortOrder: 2,  color: '#3B82F6' },
        { stateCode: 'PEER_REVIEW',      name: 'Peer Review',      sortOrder: 3,  color: '#8B5CF6' },
        { stateCode: 'LEAD_APPROVAL',    name: 'Lead Approval',    sortOrder: 4,  color: '#F59E0B' },
        { stateCode: 'RELEASED',         name: 'Released',         sortOrder: 5,  color: '#10B981' },
        { stateCode: 'REVISION_REQUIRED', name: 'Revision Required', sortOrder: 6, color: '#F97316' },
        { stateCode: 'OBSOLETE',         name: 'Obsolete',         sortOrder: 7,  isFinal: true, color: '#9CA3AF' },
      ],
      transitions: [
        ['DRAFT', 'IN_DESIGN', 'Start Design', ['engineering:drawing:update']],
        ['IN_DESIGN', 'PEER_REVIEW', 'Submit for Peer Review', ['engineering:drawing:update']],
        ['PEER_REVIEW', 'LEAD_APPROVAL', 'Approve in Peer Review', ['engineering:review:approve']],
        ['PEER_REVIEW', 'IN_DESIGN', 'Rework after Peer Review', ['engineering:drawing:update']],
        ['LEAD_APPROVAL', 'RELEASED', 'Release Drawing', ['engineering:drawing:release'], true, ['MANAGEMENT', 'DESIGN']],
        ['LEAD_APPROVAL', 'IN_DESIGN', 'Send Back to Design', ['engineering:drawing:update']],
        ['RELEASED', 'REVISION_REQUIRED', 'Require Revision', ['engineering:drawing:update']],
        ['REVISION_REQUIRED', 'IN_DESIGN', 'Revise Drawing', ['engineering:drawing:update']],
        ['RELEASED', 'OBSOLETE', 'Mark Obsolete', ['engineering:drawing:update']],
      ],
    },
    {
      workflowType: 'engineering_change',
      stages: [
        { stateCode: 'REQUEST',         name: 'Request',         sortOrder: 1, isInitial: true, color: '#6B7280' },
        { stateCode: 'REVIEW',          name: 'Review',          sortOrder: 2, color: '#3B82F6' },
        { stateCode: 'APPROVAL',        name: 'Approval',        sortOrder: 3, color: '#F59E0B' },
        { stateCode: 'IMPLEMENTATION',  name: 'Implementation',  sortOrder: 4, color: '#8B5CF6' },
        { stateCode: 'VERIFICATION',    name: 'Verification',    sortOrder: 5, color: '#14B8A6' },
        { stateCode: 'RELEASE',         name: 'Release',         sortOrder: 6, isFinal: true, color: '#10B981' },
        { stateCode: 'REJECTED',        name: 'Rejected',        sortOrder: 7, isFinal: true, color: '#EF4444' },
      ],
      transitions: [
        ['REQUEST', 'REVIEW', 'Submit for Review', ['engineering:change:update']],
        ['REVIEW', 'APPROVAL', 'Proceed to Approval', ['engineering:change:approve']],
        ['REVIEW', 'REJECTED', 'Reject Change', ['engineering:change:approve']],
        ['APPROVAL', 'IMPLEMENTATION', 'Approve & Implement', ['engineering:change:approve'], true, ['MANAGEMENT', 'DESIGN']],
        ['APPROVAL', 'REJECTED', 'Reject at Approval', ['engineering:change:approve']],
        ['IMPLEMENTATION', 'VERIFICATION', 'Request Verification', ['engineering:change:implement']],
        ['VERIFICATION', 'RELEASE', 'Release Change', ['engineering:change:release']],
        ['VERIFICATION', 'IMPLEMENTATION', 'Rework Implementation', ['engineering:change:implement']],
      ],
    },
    {
      workflowType: 'engineering_bom',
      stages: [
        { stateCode: 'DRAFT',        name: 'Draft',        sortOrder: 1, isInitial: true, color: '#6B7280' },
        { stateCode: 'UNDER_REVIEW', name: 'Under Review', sortOrder: 2, color: '#3B82F6' },
        { stateCode: 'APPROVED',     name: 'Approved',     sortOrder: 3, color: '#F59E0B' },
        { stateCode: 'RELEASED',     name: 'Released',     sortOrder: 4, color: '#10B981' },
        { stateCode: 'OBSOLETE',     name: 'Obsolete',     sortOrder: 5, isFinal: true, color: '#9CA3AF' },
      ],
      transitions: [
        ['DRAFT', 'UNDER_REVIEW', 'Submit for Review', ['engineering:bom:update']],
        ['UNDER_REVIEW', 'APPROVED', 'Approve BOM', ['engineering:review:approve']],
        ['UNDER_REVIEW', 'DRAFT', 'Request BOM Changes', ['engineering:bom:update']],
        ['APPROVED', 'RELEASED', 'Release BOM', ['engineering:bom:release'], true, ['MANAGEMENT', 'DESIGN']],
        ['APPROVED', 'DRAFT', 'Send BOM Back', ['engineering:bom:update']],
        ['RELEASED', 'OBSOLETE', 'Mark BOM Obsolete', ['engineering:bom:update']],
      ],
    },
    {
      workflowType: 'engineering_routing',
      stages: [
        { stateCode: 'DRAFT',    name: 'Draft',    sortOrder: 1, isInitial: true, color: '#6B7280' },
        { stateCode: 'APPROVED', name: 'Approved', sortOrder: 2, color: '#F59E0B' },
        { stateCode: 'RELEASED', name: 'Released', sortOrder: 3, color: '#10B981' },
        { stateCode: 'OBSOLETE', name: 'Obsolete', sortOrder: 4, isFinal: true, color: '#9CA3AF' },
      ],
      transitions: [
        ['DRAFT', 'APPROVED', 'Approve Routing', ['engineering:routing:update']],
        ['APPROVED', 'RELEASED', 'Release Routing', ['engineering:routing:update']],
        ['RELEASED', 'OBSOLETE', 'Mark Routing Obsolete', ['engineering:routing:update']],
      ],
    },
  ];

  for (const wf of engineeringWorkflows) {
    const savedEngStates: Record<string, any> = {};
    for (const s of wf.stages) {
      let state = await stateRepo.findOne({
        where: { stateCode: s.stateCode, workflowType: wf.workflowType, tenantId: defaultTenant.id },
      });
      if (!state) {
        state = await stateRepo.save(
          stateRepo.create({
            ...s,
            workflowType: wf.workflowType,
            isInitial: s.isInitial ?? false,
            isFinal: s.isFinal ?? false,
            tenantId: defaultTenant.id,
          }),
        );
      }
      savedEngStates[s.stateCode] = state;
    }
    for (const [from, to, name, perms, requiresApproval, approvalRoles] of wf.transitions) {
      const fromState = savedEngStates[from];
      const toState = savedEngStates[to];
      if (!fromState || !toState) continue;
      const exists = await transitionRepo.findOne({
        where: {
          fromStateId: fromState.id, toStateId: toState.id,
          workflowType: wf.workflowType, tenantId: defaultTenant.id,
        },
      });
      if (!exists) {
        await transitionRepo.save(
          transitionRepo.create({
            fromStateId: fromState.id, toStateId: toState.id,
            name, workflowType: wf.workflowType,
            requiredPermissions: perms,
            requiresApproval: requiresApproval ?? false,
            approvalRoles,
            isActive: true,
            tenantId: defaultTenant.id,
          }),
        );
      }
    }
    console.log(`  ✓ ${wf.stages.length} ${wf.workflowType} states + ${wf.transitions.length} transitions seeded`);
  }

  // ─── Default Milestone Template (Sprint 2.2) ───────────────────────────────
  const milestoneTemplateRepo = dataSource.getRepository(MilestoneTemplate);
  const milestoneItemRepo = dataSource.getRepository(MilestoneTemplateItem);

  let defaultTemplate = await milestoneTemplateRepo.findOne({ where: { code: 'DEFAULT_MOLD' } });
  if (!defaultTemplate) {
    defaultTemplate = await milestoneTemplateRepo.save(
      milestoneTemplateRepo.create({
        code: 'DEFAULT_MOLD',
        name: 'Default Mold Project Milestones',
        description: 'Standard mold development milestone plan',
        isDefault: true,
        tenantId: defaultTenant.id,
      }),
    );
    const templateItems = [
      { milestoneName: 'Kickoff',              milestoneStage: 'KICKOFF',     plannedDaysOffset: 0,  isCriticalPath: true,  requiresApproval: false, dependsOnSequence: null },
      { milestoneName: 'Design Complete',      milestoneStage: 'DESIGN',      plannedDaysOffset: 14, isCriticalPath: true,  requiresApproval: false, dependsOnSequence: 1 },
      { milestoneName: 'BOM Finalized',        milestoneStage: 'DESIGN',      plannedDaysOffset: 20, isCriticalPath: false, requiresApproval: false, dependsOnSequence: 2 },
      { milestoneName: 'Procurement Started',  milestoneStage: 'PLANNING',    plannedDaysOffset: 30, isCriticalPath: false, requiresApproval: false, dependsOnSequence: 3 },
      { milestoneName: 'Manufacturing Start',  milestoneStage: 'EXECUTION',   plannedDaysOffset: 45, isCriticalPath: true,  requiresApproval: false, dependsOnSequence: 4 },
      { milestoneName: 'Assembly Complete',    milestoneStage: 'EXECUTION',   plannedDaysOffset: 60, isCriticalPath: true,  requiresApproval: false, dependsOnSequence: 5 },
      { milestoneName: 'Internal Trial',       milestoneStage: 'MONITORING',  plannedDaysOffset: 75, isCriticalPath: true,  requiresApproval: false, dependsOnSequence: 6 },
      { milestoneName: 'Inspection Done',      milestoneStage: 'MONITORING',  plannedDaysOffset: 85, isCriticalPath: false, requiresApproval: true,  dependsOnSequence: 7 },
      { milestoneName: 'Dispatch Ready',       milestoneStage: 'CLOSING',     plannedDaysOffset: 95, isCriticalPath: false, requiresApproval: false, dependsOnSequence: 8 },
      { milestoneName: 'Customer Acceptance',  milestoneStage: 'COMPLETED',   plannedDaysOffset: 110, isCriticalPath: true, requiresApproval: true,  dependsOnSequence: 9 },
    ];
    for (const [idx, item] of templateItems.entries()) {
      await milestoneItemRepo.save(
        milestoneItemRepo.create({
          templateId: defaultTemplate.id,
          milestoneName: item.milestoneName,
          milestoneStage: item.milestoneStage,
          sequenceNumber: idx + 1,
          plannedDaysOffset: item.plannedDaysOffset,
          isCriticalPath: item.isCriticalPath,
          requiresApproval: item.requiresApproval,
          dependsOnSequence: item.dependsOnSequence,
          tenantId: defaultTenant.id,
        }),
      );
    }
    console.log('  ✓ DEFAULT_MOLD milestone template seeded (10 items)');
  }

  // ─── Departments (Sprint 2.2) ──────────────────────────────────────────────
  const departmentRepo = dataSource.getRepository(Department);
  const departmentsData = [
    { code: 'MANAGEMENT',  name: 'Management',           description: 'Management and leadership' },
    { code: 'SALES',       name: 'Sales',                description: 'Sales and customer acquisition' },
    { code: 'DESIGN',      name: 'Design Engineering',   description: 'Mold design and engineering' },
    { code: 'PLANNING',    name: 'Process Planning',     description: 'Process and machine planning' },
    { code: 'PROCUREMENT', name: 'Procurement',          description: 'Material and vendor procurement' },
    { code: 'PRODUCTION',  name: 'Production',           description: 'Manufacturing and assembly' },
    { code: 'QUALITY',     name: 'Quality',              description: 'Inspection and quality assurance' },
    { code: 'SERVICE',     name: 'Service',              description: 'Installation and after-sales service' },
  ];
  for (const d of departmentsData) {
    const exists = await departmentRepo.findOne({ where: { code: d.code } });
    if (!exists) {
      await departmentRepo.save(
        departmentRepo.create({ ...d, tenantId: defaultTenant.id }),
      );
    }
  }
  console.log('  ✓ 8 departments seeded');

  console.log('\n🎉 Seed complete!');
  console.log('  Login: admin@mitra.local (password set via SEED_ADMIN_PASSWORD)');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '../../.env') });

import { DataSource as DS } from 'typeorm';

const AppDataSource = new DS({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'mitra_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'mitra_v2',
  synchronize: false,  // NEVER true in production
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
});

AppDataSource.initialize()
  .then(() => seed(AppDataSource))
  .then(() => AppDataSource.destroy())
  .catch((err) => { console.error('Seed failed:', err); process.exit(1); });
