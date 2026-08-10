import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleService } from './role.service';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';

const mockRole = (overrides: Partial<Role> = {}): Role => ({
  id: 'role-id',
  name: 'ROLE',
  description: null,
  isSystem: false,
  createdBy: null,
  updatedBy: null,
  tenantId: null,
  permissions: [],
  users: [],
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('RoleService (global + tenant role visibility)', () => {
  let service: RoleService;
  let roleRepo: jest.Mocked<Repository<Role>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(Role), useValue: { find: jest.fn(), findOne: jest.fn() } },
        { provide: getRepositoryToken(Permission), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(RolePermission), useValue: {} },
      ],
    }).compile();

    service = module.get(RoleService);
    roleRepo = module.get(getRepositoryToken(Role));
  });

  it('TEST 1 — Global roles are returned to a tenant caller', async () => {
    roleRepo.find.mockResolvedValue([
      mockRole({ id: 'r-global', name: 'SALES', tenantId: null }),
      mockRole({ id: 'r-tenant', name: 'DESIGN', tenantId: 'tenant-001' }),
    ]);
    const result = await service.findAll('tenant-001');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(expect.arrayContaining(['SALES', 'DESIGN']));
  });

  it('TEST 2 — Tenant roles are returned to their own tenant caller', async () => {
    roleRepo.find.mockResolvedValue([mockRole({ id: 'r-tenant', name: 'DESIGN', tenantId: 'tenant-001' })]);
    const result = await service.findAll('tenant-001');
    expect(result.map((r) => r.name)).toContain('DESIGN');
    const where: any[] = (roleRepo.find.mock.calls[0]?.[0]?.where as any) ?? [];
    expect(where).toHaveLength(2);
    expect(where[0].tenantId).toBe('tenant-001');
    expect(where[1].tenantId?._type).toBe('isNull');
  });

  it('TEST 3 — Another tenant role is never requested', async () => {
    roleRepo.find.mockResolvedValue([mockRole({ id: 'r-a', name: 'QUALITY', tenantId: 'tenant-002' })]);
    await service.findAll('tenant-001');
    const where: any[] = (roleRepo.find.mock.calls[0]?.[0]?.where as any) ?? [];
    expect(JSON.stringify(where)).not.toContain('tenant-002');
    expect(where.every((c) => c.tenantId === 'tenant-001' || c.tenantId?._type === 'isNull')).toBe(true);
  });

  it('Global-only caller (no tenant) sees all roles without tenant filter', async () => {
    roleRepo.find.mockResolvedValue([mockRole({ id: 'r-global', name: 'ADMIN', tenantId: null })]);
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    const payload = roleRepo.find.mock.calls[0]?.[0];
    expect(Array.isArray(payload?.where)).toBe(false);
  });
});