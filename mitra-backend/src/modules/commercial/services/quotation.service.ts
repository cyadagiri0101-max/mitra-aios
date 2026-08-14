import {
  Injectable, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { Enquiry, EnquiryStatus } from '../entities/enquiry.entity';
import { Rfq } from '../entities/rfq.entity';
import {
  CreateQuotationDto, UpdateQuotationDto, ApproveQuotationDto,
  AcceptQuotationDto, RejectQuotationDto, ReviseQuotationDto, QuotationFilterDto,
} from '../dto/quotation.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialAiService } from './commercial-ai.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { CommercialEventType } from '../events/commercial.events';
import { QuotationPricingService, PricedItem } from './quotation-pricing.service';
import { QuotationItemService } from './quotation-item.service';
import { QuotationMarginService } from './quotation-margin.service';
import { QuotationApprovalService } from './quotation-approval.service';
import { QuotationRevisionService } from './quotation-revision.service';

@Injectable()
export class QuotationService extends TenantAwareService<Quotation> {
  constructor(
    @InjectRepository(Quotation)
    repo: Repository<Quotation>,
    @InjectRepository(Enquiry)
    private readonly enquiryRepo: Repository<Enquiry>,
    @InjectRepository(Rfq)
    private readonly rfqRepo: Repository<Rfq>,
    private readonly auditService: AuditService,
    private readonly aiService: CommercialAiService,
    private readonly events: CommercialEventPublisherService,
    private readonly pricingService: QuotationPricingService,
    private readonly itemService: QuotationItemService,
    private readonly marginService: QuotationMarginService,
    private readonly approvalService: QuotationApprovalService,
    private readonly revisionService: QuotationRevisionService,
  ) {
    super(repo, 'Quotation');
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async createQuotation(
    dto: CreateQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotationNumber = await this.generateQuotationNumber(tenantId);
    const rfq = dto.rfqId
      ? await this.rfqRepo.findOne({ where: { id: dto.rfqId, deletedAt: IsNull() } })
      : null;
    const enquiry = !rfq && dto.enquiryId
      ? await this.enquiryRepo.findOne({ where: { id: dto.enquiryId, deletedAt: IsNull() } })
      : null;

    const customerName = dto.customerName ?? rfq?.customerName ?? enquiry?.customerName ?? 'Unknown Customer';
    const discountPct = Number(dto.discountPct ?? 0);
    const taxPct = Number(dto.taxPct ?? 18);

    const pricing = dto.items?.length
      ? this.pricingService.reprice(dto.items as Array<Partial<PricedItem>>, discountPct, taxPct)
      : { items: [], subtotal: 0, estimatedCost: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0, marginAmount: 0, marginPct: 0 };

    const entity = this.repo.create({
      quotationNumber,
      rfqId: rfq?.id ?? null,
      enquiryId: rfq ? null : (enquiry?.id ?? null),
      customerId: dto.customerId,
      customerName,
      status: QuotationStatus.DRAFT,
      quotationDate: new Date(),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      currency: dto.currency ?? 'INR',
      subtotal: pricing.subtotal,
      estimatedCost: pricing.estimatedCost,
      sellingPrice: pricing.subtotal,
      marginAmount: pricing.marginAmount,
      marginPct: pricing.marginPct,
      discountPct,
      discountAmount: pricing.discountAmount,
      taxPct,
      taxAmount: pricing.taxAmount,
      totalAmount: pricing.totalAmount,
      paymentTerms: dto.paymentTerms ?? null,
      deliveryTerms: dto.deliveryTerms ?? null,
      deliveryWeeks: dto.deliveryWeeks ?? null,
      warrantyMonths: dto.warrantyMonths ?? 12,
      termsAndConditions: dto.termsAndConditions ?? null,
      revisionNumber: 1,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Quotation);

    const saved = await this.repo.save(entity);

    if (pricing.items.length > 0) {
      await this.itemService.replaceItems(saved.id, pricing.items, userId, tenantId);
    }

    if (rfq?.enquiryId) {
      await this.enquiryRepo.update(
        { id: rfq.enquiryId, deletedAt: IsNull() },
        { status: EnquiryStatus.CONVERTED },
      ).catch(() => undefined);
    } else if (enquiry) {
      await this.enquiryRepo.update(
        { id: enquiry.id },
        { status: EnquiryStatus.CONVERTED },
      );
    }

    await this.auditService.logBusinessEvent(
      'quotation.created', 'Quotation', saved.id, userId ?? 'system', 
      { quotationNumber, customerId: dto.customerId, rfqId: rfq?.id ?? null, totalAmount: pricing.totalAmount, tenantId },
    );
    await this.aiService.syncEntityContext('quotation', saved.id, {
      quotationNumber,
      customerId: dto.customerId,
      customerName,
      rfqId: rfq?.id ?? null,
      currency: saved.currency,
      subtotal: saved.subtotal,
      estimatedCost: saved.estimatedCost,
      marginPct: saved.marginPct,
      totalAmount: saved.totalAmount,
      status: saved.status,
    }, userId, tenantId);

    await this.events.publish({
      eventType: CommercialEventType.QUOTATION_CREATED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        quotationId: saved.id,
        quotationNumber,
        enquiryId: rfq?.enquiryId ?? enquiry?.id ?? null,
        customerId: dto.customerId ?? null,
        totalAmount: saved.totalAmount,
      },
    });

    return this.findOneWithItems(saved.id, tenantId);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  async findAllFiltered(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    filters: QuotationFilterDto = {},
  ) {
    const qb = this.repo.createQueryBuilder('q')
      .where('q.deletedAt IS NULL')
      .orderBy('q.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tenantId) qb.andWhere('q.tenantId = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('q.status = :status', { status: filters.status });
    if (filters.customerId) qb.andWhere('q.customerId = :customerId', { customerId: filters.customerId });
    if (filters.rfqId) qb.andWhere('q.rfqId = :rfqId', { rfqId: filters.rfqId });
    if (filters.currency) qb.andWhere('q.currency = :currency', { currency: filters.currency });
    if (search) {
      qb.andWhere(
        '(q.quotationNumber ILIKE :search OR q.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllWithItems(tenantId?: string | null, page = 1, limit = 20) {
    return this.findAllFiltered(tenantId, page, limit);
  }

  async findOneWithItems(id: string, tenantId?: string | null) {
    const quotation = await this.findOne(id, tenantId);
    const items = await this.itemService.findItems(id);
    (quotation as unknown as Record<string, unknown>)['items'] = items;
    return quotation;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  async updateQuotation(
    id: string,
    dto: UpdateQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be edited');
    }

    const { items, ...data } = dto as unknown as Record<string, unknown>;
    const allowed = this.extractAllowedFields(data);

    if (items !== undefined && Array.isArray(items)) {
      const discountPct = Number(allowed.discountPct ?? quotation.discountPct ?? 0);
      const taxPct = Number(allowed.taxPct ?? quotation.taxPct ?? 18);
      const pricing = this.pricingService.reprice(items as Array<Partial<PricedItem>>, discountPct, taxPct);

      Object.assign(allowed, {
        subtotal: pricing.subtotal,
        estimatedCost: pricing.estimatedCost,
        sellingPrice: pricing.subtotal,
        marginAmount: pricing.marginAmount,
        marginPct: pricing.marginPct,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
      });
      await this.itemService.replaceItems(id, pricing.items, userId, tenantId);
    }

    Object.assign(quotation, allowed, userId ? { updatedBy: userId } : {});
    const saved = await this.repo.save(quotation);

    await this.auditService.logBusinessEvent(
      'quotation.updated', 'Quotation', id, userId ?? 'system', 
      { quotationNumber: saved.quotationNumber, fields: Object.keys(allowed), tenantId },
    );
    await this.aiService.syncEntityContext('quotation', id, {
      quotationNumber: saved.quotationNumber,
      subtotal: saved.subtotal,
      estimatedCost: saved.estimatedCost,
      marginPct: saved.marginPct,
      status: saved.status,
    }, userId, tenantId);

    return this.findOneWithItems(id, tenantId);
  }

  // ── Lifecycle (delegated) ─────────────────────────────────────────────────
  async sendQuotation(
    id: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be sent');
    }
    quotation.status = QuotationStatus.SENT;
    quotation.updatedBy = userId ?? null;

    const saved = await this.repo.save(quotation);
    await this.auditService.logBusinessEvent(
      'quotation.sent', 'Quotation', id, userId ?? 'system', 
      { quotationNumber: saved.quotationNumber, tenantId },
    );
    await this.events.publish({
      eventType: CommercialEventType.QUOTATION_SENT,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        quotationId: saved.id,
        quotationNumber: saved.quotationNumber,
        customerId: saved.customerId ?? null,
      },
    });
    return saved;
  }

  async approveQuotation(
    id: string,
    dto: ApproveQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    return this.approvalService.approveQuotation(id, dto, userId, tenantId);
  }

  async reviseQuotation(
    id: string,
    dto: ReviseQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    return this.revisionService.reviseQuotation(id, dto, userId, tenantId);
  }

  async acceptQuotation(
    id: string,
    dto: AcceptQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ quotation: Quotation; projectData: Record<string, unknown> }> {
    return this.approvalService.acceptQuotation(id, dto, userId, tenantId);
  }

  async rejectQuotation(
    id: string,
    dto: RejectQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    return this.approvalService.rejectQuotation(id, dto, userId, tenantId);
  }

  async linkProject(id: string, projectId: string, userId?: string, tenantId?: string | null): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    quotation.projectId = projectId;
    quotation.status = QuotationStatus.PROJECT_CREATED;
    quotation.updatedBy = userId ?? null;

    return this.repo.save(quotation);
  }

  async getMarginSummary(tenantId?: string | null, from?: string, to?: string) {
    return this.marginService.getMarginSummary(tenantId, from, to);
  }

  private async generateQuotationNumber(tenantId?: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QTN-${year}-`;
    const where: any = { quotationNumber: Like(`${prefix}%`), deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}
