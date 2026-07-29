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
    { resource: 'role', action: 'read' },
    { resource: 'role', action: 'manage' },
    { resource: 'audit', action: 'read' },
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
      'design:read', 'design:create', 'design:approve', 'design:release', 'design:delete',
      'quality:read', 'quality:create', 'quality:close', 'quality:delete',
      'document:read', 'document:upload', 'document:download', 'document:checkout', 'document:delete',
      'workflow:read', 'workflow:transition', 'workflow:approve',
      'service:read', 'service:create', 'service:update', 'service:delete',
      'user:read', 'role:read', 'audit:read',
    ],
    SALES: [
      'project:read', 'project:create', 'project:update', 'project:transition',
      'document:read', 'document:upload', 'document:download',
      'workflow:read',
      'service:read', 'service:create', 'service:update',
    ],
    DESIGN: [
      'project:read', 'project:update',
      'design:read', 'design:create', 'design:approve', 'design:release', 'design:delete',
      'document:read', 'document:upload', 'document:download', 'document:checkout',
      'workflow:read', 'workflow:transition',
      'service:read', 'service:update',
    ],
    PLANNING: [
      'project:read', 'project:update', 'project:transition',
      'document:read', 'document:upload', 'document:download',
      'workflow:read', 'workflow:transition', 'workflow:approve',
      'service:read', 'service:update',
    ],
    PRODUCTION: [
      'project:read',
      'quality:read', 'quality:create', 'quality:close',
      'document:read', 'document:upload', 'document:download',
      'workflow:read', 'workflow:transition',
      'service:read', 'service:update',
    ],
    QUALITY: [
      'project:read',
      'design:read',
      'quality:read', 'quality:create', 'quality:close', 'quality:delete',
      'document:read', 'document:upload', 'document:download', 'document:checkout',
      'workflow:read', 'workflow:transition', 'workflow:approve',
      'service:read', 'service:update', 'service:delete',
    ],
    CUSTOMER: [
      'project:read',
      'quality:read',
      'document:read', 'document:download',
      'service:read',
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
