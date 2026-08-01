import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { QuotationItem } from '../entities/quotationitem.entity';
import { PricedItem } from './quotation-pricing.service';

@Injectable()
export class QuotationItemService {
  constructor(
    @InjectRepository(QuotationItem)
    private readonly itemRepo: Repository<QuotationItem>,
  ) {}

  async replaceItems(
    quotationId: string,
    items: Array<Partial<PricedItem>>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    await this.itemRepo.update({ quotationId, deletedAt: IsNull() }, { deletedAt: new Date() });
    for (const item of items) {
      await this.itemRepo.save(this.itemRepo.create({
        quotationId,
        lineNumber: item.lineNumber ?? 0,
        itemCode: item.itemCode ?? null,
        description: item.description ?? '',
        itemCategory: item.itemCategory ?? null,
        quantity: item.quantity ?? 1,
        unit: item.unit ?? 'NOS',
        unitPrice: item.unitPrice ?? 0,
        estimatedCost: item.estimatedCost ?? 0,
        sellingPrice: item.sellingPrice ?? 0,
        marginAmount: item.marginAmount ?? 0,
        marginPct: item.marginPct ?? 0,
        discountPct: item.discountPct ?? 0,
        lineTotal: item.lineTotal ?? 0,
        leadTimeWeeks: item.leadTimeWeeks ?? null,
        hsnCode: item.hsnCode ?? null,
        remarks: item.remarks ?? null,
        ...(tenantId ? { tenantId } : {}),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      } as unknown as QuotationItem));
    }
  }

  async findItems(quotationId: string) {
    return this.itemRepo.find({
      where: { quotationId, deletedAt: IsNull() },
      order: { lineNumber: 'ASC' },
    });
  }
}
