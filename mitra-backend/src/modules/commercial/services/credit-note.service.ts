import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { CreditNote, CreditNoteStatus } from '../entities/creditnote.entity';
import { Invoice } from '../entities/invoice.entity';
import { Customer } from '../entities/customer.entity';
import {
  CreateCreditNoteDto, ApplyCreditNoteDto, CancelCreditNoteDto, CreditNoteFilterDto,
} from '../dto/credit-note.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { CommercialEventType } from '../events/commercial.events';

@Injectable()
export class CreditNoteService extends TenantAwareService<CreditNote> {
  constructor(
    @InjectRepository(CreditNote)
    repo: Repository<CreditNote>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly auditService: AuditService,
    private readonly events: CommercialEventPublisherService,
  ) {
    super(repo, 'Credit Note');
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async createCreditNote(
    dto: CreateCreditNoteDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CreditNote> {
    let customerId = dto.customerId ?? null;
    if (dto.invoiceId) {
      const invoice = await this.invoiceRepo.findOne({
        where: { id: dto.invoiceId, deletedAt: IsNull() },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (tenantId && invoice.tenantId && invoice.tenantId !== tenantId) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.status === 'CANCELLED') {
        throw new BadRequestException('Cannot create a credit note against a cancelled invoice');
      }
      customerId = invoice.customerId ?? customerId;
    }
    if (customerId && tenantId) {
      const customer = await this.customerRepo.findOne({
        where: { id: customerId, deletedAt: IsNull() },
      });
      if (!customer) throw new NotFoundException('Customer not found');
      if (customer.tenantId && customer.tenantId !== tenantId) {
        throw new NotFoundException('Customer not found');
      }
    }

    const number = await this.generateCreditNoteNumber(tenantId);
    const entity = this.repo.create({
      creditNoteNumber: number,
      invoiceId: dto.invoiceId ?? null,
      customerId,
      salesOrderId: dto.salesOrderId ?? null,
      creditDate: new Date(dto.creditDate),
      amount: Number(dto.amount.toFixed(2)),
      currency: dto.currency ?? 'INR',
      reason: dto.reason,
      status: CreditNoteStatus.OPEN,
      notes: dto.notes ?? null,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as CreditNote);

    const saved = await this.repo.save(entity);

    await this.auditService.logBusinessEvent(
      'credit-note.created', 'CreditNote', saved.id, userId ?? 'system',
      {
        creditNoteNumber: number, invoiceId: saved.invoiceId, customerId,
        amount: saved.amount, currency: saved.currency, tenantId,
      },
    );

    await this.events.publish({
      eventType: CommercialEventType.CREDIT_NOTE_CREATED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        creditNoteId: saved.id,
        creditNoteNumber: number,
        invoiceId: saved.invoiceId ?? null,
        customerId: customerId ?? null,
        amount: saved.amount,
      },
    });

    return saved;
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  async findAllFiltered(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    filters: CreditNoteFilterDto = {},
  ) {
    const qb = this.repo.createQueryBuilder('cn')
      .where('cn.deleted_at IS NULL')
      .orderBy('cn.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (tenantId) qb.andWhere('cn.tenant_id = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('cn.status = :status', { status: filters.status });
    if (filters.invoiceId) qb.andWhere('cn.invoice_id = :invoiceId', { invoiceId: filters.invoiceId });
    if (filters.customerId) qb.andWhere('cn.customer_id = :customerId', { customerId: filters.customerId });
    if (search) {
      qb.andWhere(
        '(cn.credit_note_number ILIKE :s OR cn.reason ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  /**
   * Applies an OPEN credit note to an invoice.
   *
   * This marks the credit note APPLIED and links it to the invoice. It does
   * NOT silently mutate the invoice balance: MITRA's invoice balance is only
   * driven by recorded payments, so a credit note adjustment requires an
   * explicit follow-up (e.g. a payment record or a manual credit in the
   * accounting system of record) rather than an invisible bookkeeping change.
   */
  async applyCreditNote(
    id: string,
    dto: ApplyCreditNoteDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CreditNote> {
    const note = await this.findOne(id, tenantId);
    if (note.status !== CreditNoteStatus.OPEN) {
      throw new BadRequestException(`Credit note cannot be applied from status ${note.status}`);
    }
    const invoice = await this.invoiceRepo.findOne({
      where: { id: dto.invoiceId, deletedAt: IsNull() },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (tenantId && invoice.tenantId && invoice.tenantId !== tenantId) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cannot apply a credit note to a cancelled invoice');
    }
    if (note.customerId && invoice.customerId && note.customerId !== invoice.customerId) {
      throw new BadRequestException(
        'Credit note customer does not match the invoice customer',
      );
    }
    if (note.currency !== (invoice.currency ?? 'INR')) {
      throw new BadRequestException('Credit note currency does not match the invoice currency');
    }

    note.invoiceId = invoice.id;
    note.status = CreditNoteStatus.APPLIED;
    note.appliedAt = new Date();
    note.appliedBy = userId ?? null;
    if (userId) note.updatedBy = userId;
    await this.repo.save(note);

    await this.auditService.logBusinessEvent(
      'credit-note.applied', 'CreditNote', note.id, userId ?? 'system',
      {
        creditNoteNumber: note.creditNoteNumber, invoiceId: invoice.id,
        amount: note.amount, tenantId,
      },
    );

    await this.events.publish({
      eventType: CommercialEventType.CREDIT_NOTE_APPLIED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        creditNoteId: note.id,
        creditNoteNumber: note.creditNoteNumber,
        invoiceId: invoice.id,
        amount: note.amount,
      },
    });

    return note;
  }

  async cancelCreditNote(
    id: string,
    dto: CancelCreditNoteDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CreditNote> {
    const note = await this.findOne(id, tenantId);
    if (note.status !== CreditNoteStatus.OPEN) {
      throw new BadRequestException(`Credit note cannot be cancelled from status ${note.status}`);
    }
    note.status = CreditNoteStatus.CANCELLED;
    note.cancelledReason = dto.reason;
    note.cancelledAt = new Date();
    if (userId) note.updatedBy = userId;
    await this.repo.save(note);

    await this.auditService.logBusinessEvent(
      'credit-note.cancelled', 'CreditNote', note.id, userId ?? 'system',
      { creditNoteNumber: note.creditNoteNumber, reason: dto.reason, tenantId },
    );

    await this.events.publish({
      eventType: CommercialEventType.CREDIT_NOTE_CANCELLED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        creditNoteId: note.id,
        creditNoteNumber: note.creditNoteNumber,
        reason: dto.reason,
      },
    });

    return note;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private async generateCreditNoteNumber(_tenantId?: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CN-${year}-`;
    // credit_note_number is globally unique, so numbering counts across all
    // tenants; per-tenant counting would collide across tenants.
    const where: any = { creditNoteNumber: Like(`${prefix}%`), deletedAt: IsNull() };
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}
