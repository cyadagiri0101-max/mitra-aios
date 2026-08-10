import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';


export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(tenantId?: string, page = 1, limit = 20) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const [data, total] = await this.userRepository.findAndCount({
      where,
      relations: ['role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Fetch a user by id with optional tenant isolation.
   * When tenantId is provided, cross-tenant access returns 404 (not 403)
   * to avoid leaking that the user exists in another tenant.
   */
  async findOne(id: string, tenantId?: string | null) {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['role', 'role.permissions'],
    });
    if (!user) throw new NotFoundException('User not found');
    // Tenant isolation: system users (no tenantId on the record) are visible to all.
    if (
      tenantId !== null &&
      tenantId !== undefined &&
      user.tenantId !== null &&
      user.tenantId !== tenantId
    ) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string, tenantId?: string | null) {
    const where: any = { email, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.userRepository.findOne({ where, relations: ['role', 'role.permissions'] });
  }

  async create(dto: CreateUserDto, userId: string, tenantId?: string | null) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (existing) throw new BadRequestException('Email already registered');

    // Defense in depth: the role must exist in the caller's tenant
    // (or be a global/system role, tenantId IS NULL) — an ADMIN can never
    // assign a foreign-tenant role.
    if (dto.roleId) {
      const baseWhere: any = { id: dto.roleId, deletedAt: IsNull() };
      const role = tenantId
        ? await this.roleRepository.findOne({
            where: [
              { ...baseWhere, tenantId },
              { ...baseWhere, tenantId: IsNull() },
            ],
          })
        : await this.roleRepository.findOne({ where: baseWhere });
      if (!role) throw new BadRequestException('Role not found in this tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      roleId: dto.roleId ?? null,
      status: dto.status ?? 'active',
      // Tenant is ALWAYS taken from the caller's JWT (H-3 fix), never the body.
      tenantId: tenantId ?? null,
      failedLoginAttempts: 0,
      createdBy: userId,
      updatedBy: userId,
    });
    return this.userRepository.save(user);
  }

  /**
   * Profile update — roleId is deliberately NEVER applied here (C-1 fix).
   * Role changes are handled exclusively by RoleAssignmentService.
   */
  async update(id: string, dto: UpdateUserDto, userId: string, tenantId?: string | null) {
    const user = await this.findOne(id, tenantId);
    // Password changes must go through AuthService.changePassword only
    if (dto.firstName  !== undefined) user.firstName  = dto.firstName;
    if (dto.lastName   !== undefined) user.lastName   = dto.lastName;
    if (dto.phone      !== undefined) user.phone      = dto.phone ?? null;
    if (dto.status     !== undefined) user.status     = dto.status;
    if (dto.avatarUrl  !== undefined) user.avatarUrl  = dto.avatarUrl ?? null;
    user.updatedBy = userId;
    return this.userRepository.save(user);
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const user = await this.findOne(id, tenantId);
    user.deletedAt = new Date();
    user.updatedBy = userId;
    return this.userRepository.save(user);
  }
}
