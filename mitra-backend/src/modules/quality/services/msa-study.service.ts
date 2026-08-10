import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MsaStudy } from '../entities/msa-study.entity';
import { QualityBaseService } from './quality-base.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

@Injectable()
export class MsaStudyService extends QualityBaseService<MsaStudy> {
  constructor(
    @InjectRepository(MsaStudy) repo: Repository<MsaStudy>,
    private readonly outboxService: OutboxService,
  ) {
    super(repo);
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    const saved = await super.create({ ...dto, studyNumber: dto.studyNumber ?? this.nextNumber('MSA') }, userId, tenantId);
    await this.outboxService.append(EngineeringDomainEventType.MSA_STUDY_CREATED, 'msa_study', saved.id, { entityId: saved.id, studyNumber: saved.studyNumber, projectId: saved.projectId, gaugeId: saved.gaugeId }, { tenantId, actorId: userId });
    return saved;
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }

}
