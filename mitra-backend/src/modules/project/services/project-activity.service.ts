import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';

/**
 * Activity timeline for a project — the traceability feed. Every domain
 * action (creation, transitions, milestone/risk/document events) appends
 * an entry; this service serves the feed to the UI.
 */
@Injectable()
export class ProjectActivityService {
  constructor(
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
  ) {}

  async findByProject(projectId: string, tenantId?: string | null, page = 1, limit = 50) {
    const where: any = { projectId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const [data, total] = await this.activityRepo.findAndCount({
      where,
      order: { occurredAt: 'DESC' } as any,
      skip: (page - 1) * limit,
      take: Math.min(limit, 200),
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const entry = await this.activityRepo.findOne({ where });
    if (!entry) throw new NotFoundException('Activity entry not found');
    return entry;
  }
}
