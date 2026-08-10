import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerComplaint } from '../entities/customer-complaint.entity';
import { QualityBaseService } from './quality-base.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

@Injectable()
export class CustomerComplaintService extends QualityBaseService<CustomerComplaint> {
  constructor(
    @InjectRepository(CustomerComplaint) repo: Repository<CustomerComplaint>,
    private readonly outboxService: OutboxService,
  ) {
    super(repo);
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    const saved = await super.create({ ...dto, complaintNumber: dto.complaintNumber ?? this.nextNumber('CC') }, userId, tenantId);
    await this.outboxService.append(EngineeringDomainEventType.CUSTOMER_COMPLAINT_OPENED, 'customer_complaint', saved.id, { entityId: saved.id, complaintNumber: saved.complaintNumber, projectId: saved.projectId }, { tenantId, actorId: userId });
    return saved;
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }

}
