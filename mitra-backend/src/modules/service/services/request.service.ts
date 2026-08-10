import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from '../entities/servicerequest.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { OutboxService } from '../../platform/services/outbox.service';

@Injectable()
export class ServiceRequestService extends TenantAwareService<ServiceRequest> {
  constructor(
    @InjectRepository(ServiceRequest)
    repo: Repository<ServiceRequest>,
    private readonly outboxService: OutboxService,
  ) {
    super(repo, 'ServiceRequest');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const withNumber = { ...data, srNumber: data.srNumber ?? this.nextSrNumber() };
    const entity = await super.create(withNumber, userId, tenantId);
    await this.outboxService.append('service.request.created', 'service_request', entity.id, {
      serviceRequestId: entity.id,
      projectId: entity.projectId,
      customerId: entity.customerId,
      issueDescription: entity.issueDescription,
      priority: entity.priority,
    }, { tenantId: tenantId ?? undefined, actorId: userId ?? undefined });
    return entity;
  }

  private nextSrNumber(): string {
    return `SR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }

  async update(id: string, data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const entity = await super.update(id, data, userId, tenantId);
    if (data.status) {
      await this.outboxService.append('service.request.updated', 'service_request', entity.id, {
        serviceRequestId: entity.id,
        status: entity.status,
      }, { tenantId: tenantId ?? undefined, actorId: userId ?? undefined });
    }
    return entity;
  }
}