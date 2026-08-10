import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PpapApqpRecord } from '../entities/ppap-apqp.entity';
import { QualityBaseService } from './quality-base.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

@Injectable()
export class PpapApqpService extends QualityBaseService<PpapApqpRecord> {
  constructor(
    @InjectRepository(PpapApqpRecord) repo: Repository<PpapApqpRecord>,
    private readonly outboxService: OutboxService,
  ) {
    super(repo);
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    const saved = await super.create({ ...dto, recordNumber: dto.recordNumber ?? this.nextNumber('PPAP') }, userId, tenantId);
    await this.outboxService.append(EngineeringDomainEventType.PPAP_APQP_CREATED, 'ppap_apqp', saved.id, { entityId: saved.id, recordNumber: saved.recordNumber, projectId: saved.projectId, recordType: saved.recordType }, { tenantId, actorId: userId });
    return saved;
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }

}
