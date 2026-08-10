import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'user@acme.com',
  passwordHash: '$2b$12$hash',
  roleId: null,
  firstName: 'First',
  lastName: 'Last',
  phone: null,
  avatarUrl: null,
  status: 'active',
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  mfaEnabled: false,
  mfaSecret: null,
  refreshTokenHash: null,
  createdBy: null,
  updatedBy: null,
  tenantId: null,
  deletedAt: null,
  role: null as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

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

const dto = (roleId?: string) => ({
  email: 'new@acme.com',
  password: 'Str0ng!Pass',
  firstName: 'New',
  lastName: 'User',
  roleId,
});

describe('UserService (role validation: own tenant OR global)', () => {
  let service: UserService;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleRepo: jest.Mocked<Repository<Role>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn(), findAndCount: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UserService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
    userRepo.findOne.mockResolvedValue(null as any);
    userRepo.create.mockImplementation((data: any) => mockUser(data));
    userRepo.save.mockImplementation(async (u: any) => u);
  });

  it('TEST 4 — Creates a user with a GLOBAL role (tenantId null)', async () => {
    roleRepo.findOne.mockResolvedValueOnce(mockRole({ id: 'r-sales', name: 'SALES', tenantId: null }));
    const result = await service.create(dto('r-sales'), 'admin-1', 'tenant-001');
    expect(result.roleId).toBe('r-sales');
    const where: any[] = (roleRepo.findOne.mock.calls[0]?.[0]?.where as any) ?? [];
    expect(where).toHaveLength(2);
    expect(where[0].tenantId).toBe('tenant-001');
    expect(where[1].tenantId?._type).toBe('isNull');
  });

  it('Creates a user with a role owned by the caller tenant', async () => {
    roleRepo.findOne.mockResolvedValueOnce(mockRole({ id: 'r-t', name: 'DESIGN', tenantId: 'tenant-001' }));
    const result = await service.create(dto('r-t'), 'admin-1', 'tenant-001');
    expect(result.roleId).toBe('r-t');
  });

  it('TEST 6 — Rejects a role belonging to another tenant', async () => {
    roleRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.create(dto('r-foreign'), 'admin-1', 'tenant-001')).rejects.toThrow(
      BadRequestException,
    );
    const where: any[] = (roleRepo.findOne.mock.calls[0]?.[0]?.where as any) ?? [];
    expect(where.every((c) => c.tenantId === 'tenant-001' || c.tenantId?._type === 'isNull')).toBe(true);
  });

  it('Global-only actor (no tenant) resolves the role without tenant filter', async () => {
    roleRepo.findOne.mockResolvedValueOnce(mockRole({ id: 'r-sales', name: 'SALES', tenantId: null }));
    const result = await service.create(dto('r-sales'), 'admin-1', null);
    expect(result.roleId).toBe('r-sales');
    const where: any = (roleRepo.findOne.mock.calls[0]?.[0]?.where as any) ?? {};
    expect(Array.isArray(where)).toBe(false);
    expect(where.tenantId).toBeUndefined();
  });
});