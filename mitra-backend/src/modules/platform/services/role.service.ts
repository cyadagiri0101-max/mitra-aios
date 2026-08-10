import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async findAll(tenantId?: string) {
    // Tenant callers see their own tenant roles PLUS global/system roles
    // (tenantId IS NULL). Another tenant's roles are never visible.
    if (tenantId) {
      return this.roleRepository.find({
        where: [
          { deletedAt: IsNull(), tenantId },
          { deletedAt: IsNull(), tenantId: IsNull() },
        ],
        relations: ['permissions'],
        order: { name: 'ASC' },
        take: 500,
      });
    }
    return this.roleRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['permissions'],
      order: { name: 'ASC' },
      take: 500,
    });
  }

  async findOne(id: string, tenantId?: string) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const role = await this.roleRepository.findOne({ where, relations: ['permissions', 'users'] });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(data: Partial<Role>, userId: string, tenantId?: string) {
    const where: any = { name: data.name, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const existing = await this.roleRepository.findOne({ where });
    if (existing) throw new BadRequestException('Role with this name already exists');
    const role = this.roleRepository.create({
      ...data,
      tenantId: tenantId ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
    return this.roleRepository.save(role);
  }

  async update(id: string, data: Partial<Role>, userId: string, tenantId?: string) {
    const role = await this.findOne(id, tenantId);
    Object.assign(role, data, { updatedBy: userId });
    return this.roleRepository.save(role);
  }

  async remove(id: string, userId: string, tenantId?: string) {
    const role = await this.findOne(id, tenantId);
    role.deletedAt = new Date();
    role.updatedBy = userId;
    return this.roleRepository.save(role);
  }

  async findAllPermissions(tenantId?: string) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.permissionRepository.find({ where, take: 500 });
  }
}
