import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { ReviseQuotationDto } from '../dto/quotation.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { QuotationPricingService, PricedItem } from './quotation-pricing.service';
import { QuotationItemService } from './quotation-item.service';

@Injectable()
export class QuotationRevisionService extends TenantAwareService<Quotation> {
  constructor(
    @InjectRepository(Quotation)
    repo: Repository<Quotation>,
    private readonly pricingService: QuotationPricingService,
    private readonly itemService: QuotationItemService,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'Quotation');
  }

  async reviseQuotation(
    id: string,
    dto: ReviseQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    const nextRevision = quotation.revisionNumber + 1;
    const previous = {
      subtotal: quotation.subtotal,
      totalAmount: quotation.totalAmount,
      marginPct: quotation.marginPct,
      status: quotation.status,
    };

    if (dto.items && dto.items.length > 0) {
      const discountPct = Number(quotation.discountPct ?? 0);
      const taxPct = Number(quotation.taxPct ?? 18);
      const pricing = this.pricingService.reprice(dto.items as Array<Partial<PricedItem>>, discountPct, taxPct);
      quotation.subtotal = pricing.subtotal;
      quotation.estimatedCost = pricing.estimatedCost;
      quotation.sellingPrice = pricing.subtotal;
      quotation.marginAmount = pricing.marginAmount;
      quotation.marginPct = pricing.marginPct;
      quotation.taxAmount = pricing.taxAmount;
      quotation.totalAmount = pricing.totalAmount;
      await this.itemService.replaceItems(id, pricing.items, userId, tenantId);
    }

    quotation.revisionNumber = nextRevision;
    quotation.status = QuotationStatus.REVISED;
    quotation.updatedBy = userId ?? null;

    const saved = await this.repo.save(quotation);

    await this.auditService.logBusinessEvent(
      'quotation.revised', 'Quotation', id, userId ?? 'system',
      {
        quotationNumber: saved.quotationNumber,
        revisionNumber: nextRevision,
        changeSummary: dto.changeSummary ?? null,
        before: previous,
        tenantId,
      },
    );

    const items = await this.itemService.findItems(id);
    (saved as unknown as Record<string, unknown>)['items'] = items;
    return saved;
  }
}
