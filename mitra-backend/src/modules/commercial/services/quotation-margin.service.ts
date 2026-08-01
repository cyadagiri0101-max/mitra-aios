import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class QuotationMarginService extends TenantAwareService<Quotation> {
  constructor(
    @InjectRepository(Quotation)
    repo: Repository<Quotation>,
  ) {
    super(repo, 'Quotation');
  }

  async getMarginSummary(tenantId?: string | null, from?: string, to?: string) {
    const qb = this.repo.createQueryBuilder('q')
      .where('q.deletedAt IS NULL')
      .andWhere('q.status IN (:...statuses)', {
        statuses: [QuotationStatus.SENT, QuotationStatus.APPROVED, QuotationStatus.ACCEPTED, QuotationStatus.PROJECT_CREATED, QuotationStatus.WON],
      });

    if (tenantId) qb.andWhere('q.tenantId = :tenantId', { tenantId });
    if (from) qb.andWhere('q.quotationDate >= :from', { from });
    if (to) qb.andWhere('q.quotationDate <= :to', { to });

    const rows = await qb.select([
      'AVG(q.marginPct) AS avg_margin_pct',
      'SUM(q.totalAmount) AS total_value',
      'SUM(q.estimatedCost) AS total_cost',
      'COUNT(*) AS count',
    ]).getRawOne();

    return {
      count: Number(rows?.count ?? 0),
      totalValue: Number(rows?.total_value ?? 0),
      totalCost: Number(rows?.total_cost ?? 0),
      totalMargin: Number(rows?.total_value ?? 0) - Number(rows?.total_cost ?? 0),
      avgMarginPct: Math.round(Number(rows?.avg_margin_pct ?? 0) * 100) / 100,
    };
  }
}
