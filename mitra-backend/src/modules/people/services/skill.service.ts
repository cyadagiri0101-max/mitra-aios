import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { Skill, SkillStatus } from '../entities/skill.entity';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class SkillService extends TenantAwareService<Skill> {
  constructor(
    @InjectRepository(Skill) repo: Repository<Skill>,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'Skill');
  }

  async findAll(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    category?: string,
    status?: string,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere('s.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (search?.trim()) {
      qb.andWhere('(s.code ILIKE :search OR s.name ILIKE :search)', { search: `%${search.trim()}%` });
    }
    if (category?.trim()) {
      qb.andWhere('s.category = :category', { category: category.trim() });
    }
    if (status) {
      qb.andWhere('s.status = :status', { status });
    }

    qb.orderBy('s.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(Math.min(limit, 100));

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Skill> {
    const scopeTenant = this.requireTenant(tenantId);
    const code = String(dto.code ?? '').trim();
    if (!code) throw new BadRequestException('code is required');

    const duplicate = await this.repo.findOne({
      where: { code, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (duplicate) {
      throw new BadRequestException(`Skill code already exists: ${code}`);
    }

    const skill = this.repo.create({
      ...this.extractAllowedFields(dto),
      code,
      status: (dto.status as SkillStatus) ?? SkillStatus.ACTIVE,
      tenantId: scopeTenant,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    } as unknown as Skill);

    const saved = await this.repo.save(skill);
    await this.auditService.logBusinessEvent(
      'skill.created',
      'Skill',
      saved.id,
      userId ?? 'system',
      { code: saved.code, name: saved.name, tenantId: scopeTenant },
    );
    return saved;
  }

  async update(
    id: string,
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Skill> {
    const scopeTenant = this.requireTenant(tenantId);
    const skill = await this.findOne(id, scopeTenant);

    if (dto.code !== undefined && String(dto.code).trim() !== skill.code) {
      const duplicate = await this.repo.findOne({
        where: { code: String(dto.code).trim(), tenantId: scopeTenant, deletedAt: IsNull() } as any,
      });
      if (duplicate) {
        throw new BadRequestException(`Skill code already exists: ${dto.code}`);
      }
    }

    const allowed = this.extractAllowedFields(dto);
    Object.assign(skill, allowed, { updatedBy: userId ?? null });
    const saved = await this.repo.save(skill);
    await this.auditService.logBusinessEvent(
      'skill.updated',
      'Skill',
      saved.id,
      userId ?? 'system',
      { code: saved.code, changedFields: Object.keys(allowed), tenantId: scopeTenant },
    );
    return saved;
  }

  async remove(
    id: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ deleted: true; id: string }> {
    const scopeTenant = this.requireTenant(tenantId);
    const skill = await this.findOne(id, scopeTenant);
    skill.deletedAt = new Date();
    skill.updatedBy = userId ?? null;
    await this.repo.save(skill);
    await this.auditService.logBusinessEvent(
      'skill.deleted',
      'Skill',
      id,
      userId ?? 'system',
      { code: skill.code, tenantId: scopeTenant },
    );
    return { deleted: true, id };
  }

  /** Active skill catalog (for dropdowns / planning UI). */
  async findActive(tenantId?: string | null): Promise<Skill[]> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.repo.find({
      where: { tenantId: scopeTenant, deletedAt: IsNull(), status: SkillStatus.ACTIVE } as any,
      order: { name: 'ASC' } as any,
      take: 1000,
    });
  }
}