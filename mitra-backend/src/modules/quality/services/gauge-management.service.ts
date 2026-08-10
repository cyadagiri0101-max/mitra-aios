import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GaugeManagement } from '../entities/gauge-management.entity';
import { QualityBaseService } from './quality-base.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

@Injectable()
export class GaugeManagementService extends QualityBaseService<GaugeManagement> {
  constructor(
    @InjectRepository(GaugeManagement) repo: Repository<GaugeManagement>,
    private readonly outboxService: OutboxService,
  ) {
    super(repo);
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    const saved = await super.create({ ...dto, gaugeNumber: dto.gaugeNumber ?? this.nextNumber('GAGE') }, userId, tenantId);
    await this.outboxService.append(EngineeringDomainEventType.GAUGE_CREATED, 'gauge', saved.id, { entityId: saved.id, gaugeNumber: saved.gaugeNumber, projectId: saved.projectId, calibrationDueDate: saved.calibrationDueDate }, { tenantId, actorId: userId });
    return saved;
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }

}
