import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceVisit } from '../entities/servicevisit.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class VisitService extends TenantAwareService<ServiceVisit> {
  constructor(
    @InjectRepository(ServiceVisit)
    repo: Repository<ServiceVisit>,
  ) {
    super(repo, 'ServiceVisit');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const visitNumber = (data.visitNumber as string) ?? this.generateVisitNumber();
    return super.create({ ...data, visitNumber }, userId, tenantId);
  }

  private generateVisitNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 900 + 100);
    return `VST-${ts}-${rand}`;
  }
}
