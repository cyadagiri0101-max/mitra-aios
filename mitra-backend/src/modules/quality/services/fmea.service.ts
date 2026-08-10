import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fmea } from '../entities/fmea.entity';
import { QualityBaseService } from './quality-base.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

@Injectable()
export class FmeaService extends QualityBaseService<Fmea> {
  constructor(
    @InjectRepository(Fmea) repo: Repository<Fmea>,
    private readonly outboxService: OutboxService,
  ) {
    super(repo);
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    const saved = await super.create({ ...dto, fmeaNumber: dto.fmeaNumber ?? this.nextNumber('FMEA') }, userId, tenantId);
    await this.outboxService.append(EngineeringDomainEventType.FMEA_CREATED, 'fmea', saved.id, { entityId: saved.id, fmeaNumber: saved.fmeaNumber, projectId: saved.projectId, rpn: saved.rpn }, { tenantId, actorId: userId });
    return saved;
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }

}
