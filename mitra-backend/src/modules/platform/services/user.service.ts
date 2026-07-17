import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';


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

  async create(dto: any, userId: string) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (existing) throw new BadRequestException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      roleId: dto.roleId ?? null,
      status: dto.status ?? 'active',
      tenantId: dto.tenantId ?? null,
      failedLoginAttempts: 0,
      createdBy: userId,
      updatedBy: userId,
    });
    return this.userRepository.save(user);
  }

  async update(id: string, dto: any, userId: string, tenantId?: string | null) {
    const user = await this.findOne(id, tenantId);
    // Password changes must go through AuthService.changePassword only
    if (dto.firstName  !== undefined) user.firstName  = dto.firstName;
    if (dto.lastName   !== undefined) user.lastName   = dto.lastName;
    if (dto.phone      !== undefined) user.phone      = dto.phone ?? null;
    if (dto.roleId     !== undefined) user.roleId     = dto.roleId ?? null;
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
