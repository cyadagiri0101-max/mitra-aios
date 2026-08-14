import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import { Enquiry, EnquiryStatus } from '../entities/enquiry.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { CommercialEventType } from '../events/commercial.events';

@Injectable()
export class EnquiryService extends TenantAwareService<Enquiry> {
  constructor(
    @InjectRepository(Enquiry)
    repo: Repository<Enquiry>,
    private readonly events: CommercialEventPublisherService,
  ) {
    super(repo, 'Enquiry');
  }

  async create(
    data: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Enquiry> {
    const scopeTenant = this.requireTenant(tenantId);
    let saved: Enquiry | undefined;
    let lastErr: any;

    for (let attempt = 0; attempt < 5; attempt++) {
      const enquiryNumber = await this.generateEnquiryNumber(scopeTenant, attempt);
      const entity = this.repo.create({
        ...data,
        enquiryNumber,
        status: EnquiryStatus.DRAFT,
        tenantId: scopeTenant,
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      } as unknown as Enquiry);
      try {
        saved = await this.repo.save(entity);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;
    return saved;
  }

  private async generateEnquiryNumber(tenantId: string, attempt = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RFQ-${year}-`;
    const where: any = { enquiryNumber: Like(`${prefix}%`), deletedAt: IsNull(), tenantId };
    const count = await this.repo.count({ where });
    const seq = count + 1 + attempt;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async submit(id: string, userId?: string, tenantId?: string | null): Promise<Enquiry> {
    const entity = await this.findOne(id, tenantId);
    if (entity.status !== EnquiryStatus.DRAFT) {
      throw new BadRequestException('Only draft enquiries can be submitted');
    }
    entity.status = EnquiryStatus.SUBMITTED;
    entity.updatedBy = userId ?? null;
    const saved = await this.repo.save(entity);
    await this.events.publish({
      eventType: CommercialEventType.RFQ_SUBMITTED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        enquiryId: saved.id,
        enquiryNumber: saved.enquiryNumber,
        customerName: saved.customerName ?? null,
        productName: saved.productName ?? null,
      },
    });
    return saved;
  }

  async review(id: string, userId?: string, tenantId?: string | null): Promise<Enquiry> {
    const entity = await this.findOne(id, tenantId);
    if (entity.status !== EnquiryStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted enquiries can be reviewed');
    }
    entity.status = EnquiryStatus.UNDER_REVIEW;
    entity.updatedBy = userId ?? null;
    const saved = await this.repo.save(entity);
    await this.events.publish({
      eventType: CommercialEventType.RFQ_UNDER_REVIEW,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: { enquiryId: saved.id, enquiryNumber: saved.enquiryNumber },
    });
    return saved;
  }

  async cancel(id: string, userId?: string, tenantId?: string | null): Promise<Enquiry> {
    const entity = await this.findOne(id, tenantId);
    if (entity.status === EnquiryStatus.CONVERTED || entity.status === EnquiryStatus.LOST) {
      throw new BadRequestException('Cannot cancel a converted or lost enquiry');
    }
    entity.status = EnquiryStatus.CANCELLED;
    entity.updatedBy = userId ?? null;
    const saved = await this.repo.save(entity);
    await this.events.publish({
      eventType: CommercialEventType.RFQ_CANCELLED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: { enquiryId: saved.id, enquiryNumber: saved.enquiryNumber, previousStatus: entity.status },
    });
    return saved;
  }

  async markLost(id: string, reason?: string, userId?: string, tenantId?: string | null): Promise<Enquiry> {
    const entity = await this.findOne(id, tenantId);
    if (entity.status !== EnquiryStatus.SUBMITTED && entity.status !== EnquiryStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only submitted or under-review enquiries can be marked as lost');
    }
    entity.status = EnquiryStatus.LOST;
    entity.lostReason = reason ?? null;
    entity.updatedBy = userId ?? null;
    const saved = await this.repo.save(entity);
    await this.events.publish({
      eventType: CommercialEventType.RFQ_LOST,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: { enquiryId: saved.id, enquiryNumber: saved.enquiryNumber, reason: reason ?? null },
    });
    return saved;
  }
}