import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ControlPlan } from '../entities/control-plan.entity';
import { QualityBaseService } from './quality-base.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

@Injectable()
export class ControlPlanService extends QualityBaseService<ControlPlan> {
  constructor(
    @InjectRepository(ControlPlan) repo: Repository<ControlPlan>,
    private readonly outboxService: OutboxService,
  ) {
    super(repo);
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    const saved = await super.create({ ...dto, planNumber: dto.planNumber ?? this.nextNumber('QCP') }, userId, tenantId);
    await this.outboxService.append(EngineeringDomainEventType.CONTROL_PLAN_CREATED, 'control_plan', saved.id, { entityId: saved.id, planNumber: saved.planNumber, projectId: saved.projectId }, { tenantId, actorId: userId });
    return saved;
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }

}
