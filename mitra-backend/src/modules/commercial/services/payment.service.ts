import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { Payment, PaymentMethod } from '../entities/payment.entity';
import { Invoice } from '../entities/invoice.entity';
import { CreatePaymentDto, VerifyPaymentDto, PaymentFilterDto } from '../dto/payment.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { InvoiceService } from './invoice.service';

@Injectable()
export class PaymentService extends TenantAwareService<Payment> {
  constructor(
    @InjectRepository(Payment)
    repo: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly invoiceService: InvoiceService,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'Payment');
  }

  // ── Create with allocation ────────────────────────────────────────────────
  async recordPayment(
    dto: CreatePaymentDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Payment> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: dto.invoiceId, deletedAt: IsNull() },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (tenantId && invoice.tenantId && invoice.tenantId !== tenantId) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cannot record a payment against a cancelled invoice');
    }
    if (invoice.status === 'DRAFT') {
      throw new BadRequestException('Cannot record a payment against a draft (unissued) invoice');
    }
    const currency = dto.currency ?? invoice.currency ?? 'INR';
    if (currency !== invoice.currency) {
      throw new BadRequestException(
        `Payment currency ${currency} does not match invoice currency ${invoice.currency}`,
      );
    }
    const balance = Number(invoice.balanceAmount);
    if (dto.amount > balance + 0.001) {
      throw new BadRequestException(
        `Payment amount exceeds invoice balance (balance: ${balance.toFixed(2)})`,
      );
    }

    const number = await this.generatePaymentNumber(tenantId);
    const entity = this.repo.create({
      paymentNumber: number,
      invoiceId: invoice.id,
      customerId: invoice.customerId ?? null,
      paymentDate: new Date(dto.paymentDate),
      amount: Number(dto.amount.toFixed(2)),
      currency,
      method: (dto.method as PaymentMethod) ?? PaymentMethod.BANK_TRANSFER,
      referenceNumber: dto.referenceNumber ?? null,
      bankName: dto.bankName ?? null,
      remarks: dto.remarks ?? null,
      isVerified: false,
      verifiedBy: null,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Payment);

    const saved = await this.repo.save(entity);
    await this.invoiceService.applyPaymentAllocation(
      invoice.id, saved.amount, currency, userId, tenantId,
    );

    await this.auditService.logBusinessEvent(
      'payment.recorded', 'Payment', saved.id, userId ?? 'system',
      {
        paymentNumber: number, invoiceId: invoice.id, amount: saved.amount,
        currency, method: saved.method, tenantId,
      },
    );

    return saved;
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  async findAllFiltered(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    filters: PaymentFilterDto = {},
  ) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    if (filters.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters.customerId) where.customerId = filters.customerId;
    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneWithInvoice(id: string, tenantId?: string | null): Promise<Payment> {
    const payment = await this.findOne(id, tenantId);
    const invoice = payment.invoiceId
      ? await this.invoiceRepo.findOne({ where: { id: payment.invoiceId, deletedAt: IsNull() } })
      : null;
    return { ...payment, invoice } as unknown as Payment;
  }

  // ── Verification ──────────────────────────────────────────────────────────
  async verifyPayment(
    id: string,
    _dto: VerifyPaymentDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Payment> {
    const payment = await this.findOne(id, tenantId);
    if (payment.isVerified) {
      throw new BadRequestException('Payment is already verified');
    }
    payment.isVerified = true;
    payment.verifiedBy = userId ?? null;
    if (userId) payment.updatedBy = userId;
    await this.repo.save(payment);
    await this.auditService.logBusinessEvent(
      'payment.verified', 'Payment', payment.id, userId ?? 'system',
      { paymentNumber: payment.paymentNumber, invoiceId: payment.invoiceId, tenantId },
    );
    return payment;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private async generatePaymentNumber(_tenantId?: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;
    // payment_number is globally unique, so numbering counts across all
    // tenants; per-tenant counting would collide across tenants.
    const where: any = { paymentNumber: Like(`${prefix}%`), deletedAt: IsNull() };
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}
