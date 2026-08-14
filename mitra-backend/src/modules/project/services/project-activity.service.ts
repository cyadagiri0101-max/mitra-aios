

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';

/**
 * Activity Stream service: append-only timeline of all project-level domain events
 * (risk raised, milestone completed, budget amended, document uploaded, stage gate moved).
 */
@Injectable()
export class ProjectActivityService {
  constructor(
    @InjectRepository(ProjectActivityLog)
    private readonly activityRepo: Repository<ProjectActivityLog>,
  ) { }

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async findByProject(projectId: string, tenantId?: string | null, page = 1, limit = 50) {
    const scopeTenant = this.requireTenant(tenantId);
    const [data, total] = await this.activityRepo.findAndCount({
      where: { projectId, deletedAt: IsNull(), tenantId: scopeTenant },
      order: { createdAt: 'DESC' } as any,
      skip: (page - 1) * limit,
      take: Math.min(limit, 200),
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const entry = await this.activityRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!entry) throw new NotFoundException('Activity entry not found');
    return entry;
  }

  async logActivity(
    projectId: string,
    activityType: string,
    title: string,
    actorId: string | null,
    tenantId?: string | null,
    metadata?: Record<string, any>,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const log = this.activityRepo.create({
      projectId,
      activityType,
      title,
      actorId: actorId ?? null,
      tenantId: scopeTenant,
      metadata: metadata ?? null,
    });
    return this.activityRepo.save(log);
  }

  async findRecentActivity(projectId: string, limit = 10, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    return this.activityRepo.find({
      where: { projectId, deletedAt: IsNull(), tenantId: scopeTenant },
      order: { createdAt: 'DESC' },
      take: Math.min(50, Math.max(1, limit)),
    });
  }
}
