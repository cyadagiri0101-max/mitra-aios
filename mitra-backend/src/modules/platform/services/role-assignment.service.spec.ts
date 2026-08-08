import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ForbiddenException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { RoleAssignmentService } from './role-assignment.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuditService } from '../../audit/services/audit.service';

const adminActor = {
  id: 'user-admin',
  email: 'admin@acme.com',
  role: 'ADMIN',
  permissions: ['user:assign_role', 'user:update'],
  tenantId: 'tenant-001',
};

const salesActor = {
  id: 'user-sales',
  email: 'sales@acme.com',
  role: 'SALES',
  permissions: ['rfq:create'],
  tenantId: 'tenant-001',
};

const adminWithoutPermission = {
  ...adminActor,
  permissions: ['user:update'],
};

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: 'target-001',
  email: 'target@acme.com',
  passwordHash: '$2b$12$hash',
  roleId: 'role-sales',
  firstName: 'Target',
  lastName: 'User',
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
  tenantId: 'tenant-001',
  deletedAt: null,
  role: null as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockRole = (overrides: Partial<Role> = {}): Role => ({
  id: 'role-admin',
  name: 'ADMIN',
  description: 'System administrator',
  isSystem: true,
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

describe('RoleAssignmentService (C-1 security regression)', () => {
  let service: RoleAssignmentService;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleRepo: jest.Mocked<Repository<Role>>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleAssignmentService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(RoleAssignmentService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
    auditService = module.get(AuditService);
  });

  it('rejects non-ADMIN actors even when they hold the permission', async () => {
    await expect(
      service.assignRole('target-001', 'role-admin', salesActor),
    ).rejects.toThrow(ForbiddenException);
    expect(userRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects ADMIN actors lacking the user:assign_role permission (defense in depth)', async () => {
    await expect(
      service.assignRole('target-001', 'role-admin', adminWithoutPermission),
    ).rejects.toThrow(ForbiddenException);
    expect(userRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects cross-tenant targets at the repository layer (tenant scoping)', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(
      service.assignRole('target-other-tenant', 'role-admin', adminActor),
    ).rejects.toThrow(NotFoundException);
    expect(userRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-001' }),
      }),
    );
  });

  it('rejects cross-tenant roles at the repository layer (only own tenant OR global)', async () => {
    userRepo.findOne.mockResolvedValue(mockUser());
    roleRepo.findOne.mockResolvedValue(null);
    await expect(
      service.assignRole('target-001', 'role-foreign', adminActor),
    ).rejects.toThrow(NotFoundException);
    const roleCall = roleRepo.findOne.mock.calls[0]?.[0];
    const where: any[] = ((roleCall?.where as any) ?? []) as any[];
    expect(where).toHaveLength(2);
    expect(where[0]).toEqual(expect.objectContaining({ id: 'role-foreign', tenantId: 'tenant-001' }));
    expect(where[1]).toEqual(expect.objectContaining({ id: 'role-foreign' }));
  });

  it('assigns a GLOBAL role (tenantId null) to a tenanted actor', async () => {
    userRepo.findOne
      .mockResolvedValueOnce(mockUser())
      .mockResolvedValueOnce(mockUser({ role: mockRole({ id: 'role-sales', name: 'SALES' }) }));
    roleRepo.findOne.mockResolvedValue(mockRole({ id: 'role-sales', name: 'SALES' }));
    userRepo.save.mockImplementation(async (u: any) => u);

    const result = await service.assignRole('target-001', 'role-sales', adminActor, 'Global role');

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'target-001', roleId: 'role-sales', updatedBy: adminActor.id }),
    );
    expect(result.role).toBeDefined();
  });

  it('prevents an administrator from demoting themselves', async () => {
    userRepo.findOne.mockResolvedValue(mockUser({ id: adminActor.id }));
    roleRepo.findOne.mockResolvedValue(mockRole({ id: 'role-sales', name: 'SALES' }));
    await expect(
      service.assignRole(adminActor.id, 'role-sales', adminActor),
    ).rejects.toThrow(BadRequestException);
  });

  it('assigns the role, persists it and writes an audit trail', async () => {
    userRepo.findOne
      .mockResolvedValueOnce(mockUser())
      .mockResolvedValueOnce(mockUser({ role: mockRole({ id: 'role-admin' }) }));
    roleRepo.findOne.mockResolvedValue(mockRole());
    userRepo.save.mockImplementation(async (u: any) => u);

    const result = await service.assignRole('target-001', 'role-admin', adminActor, 'Promoted');

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'target-001', roleId: 'role-admin', updatedBy: adminActor.id }),
    );
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
      'user.role_assigned', 'User', 'target-001', adminActor.id,
      expect.objectContaining({
        previousRoleId: 'role-sales',
        newRoleId: 'role-admin',
        newRoleName: 'ADMIN',
        reason: 'Promoted',
      }),
    );
    expect(result.role).toBeDefined();
  });
});
