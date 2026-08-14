import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like, LessThan, MoreThan } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceLine } from '../entities/invoice-line.entity';
import { SalesOrder, SalesOrderStatus } from '../entities/sales-order.entity';
import { SalesOrderLine } from '../entities/sales-order-line.entity';
import {
  CreateInvoiceDto, CancelInvoiceDto, InvoiceFilterDto,
} from '../dto/invoice.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { CommercialEventType } from '../events/commercial.events';

@Injectable()
export class InvoiceService extends TenantAwareService<Invoice> {
  constructor(
    @InjectRepository(Invoice)
    repo: Repository<Invoice>,
    @InjectRepository(InvoiceLine)
    private readonly lineRepo: Repository<InvoiceLine>,
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine)
    private readonly salesOrderLineRepo: Repository<SalesOrderLine>,
    private readonly auditService: AuditService,
    private readonly events: CommercialEventPublisherService,
  ) {
    super(repo, 'Invoice');
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async createInvoice(
    dto: CreateInvoiceDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Invoice> {
    let salesOrder: SalesOrder | null = null;
    let subtotal = 0;
    let taxPct = Number(dto.taxPct ?? 18);
    let taxAmount = 0;
    let totalAmount = 0;
    let lineSource: InvoiceLine[] = [];

    if (dto.salesOrderId) {
      salesOrder = await this.salesOrderRepo.findOne({
        where: { id: dto.salesOrderId, deletedAt: IsNull() },
      });
      if (!salesOrder) throw new NotFoundException('Sales order not found');
      if (tenantId && salesOrder.tenantId && salesOrder.tenantId !== tenantId) {
        throw new NotFoundException('Sales order not found');
      }
      if (salesOrder.status === SalesOrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot create an invoice for a cancelled sales order');
      }
      const lines = await this.salesOrderLineRepo.find({
        where: { salesOrderId: salesOrder.id, deletedAt: IsNull() },
        order: { lineNumber: 'ASC' },
      });
      subtotal = lines.reduce((s, l) => s + Number(l.lineTotal ?? 0), 0);
      if (subtotal <= 0) subtotal = Number(salesOrder.subtotal ?? 0);
      taxPct = Number(salesOrder.taxAmount > 0 ? (salesOrder.taxAmount / Math.max(salesOrder.subtotal, 1)) * 100 : dto.taxPct ?? 18);
      taxAmount = salesOrder.taxAmount ?? Number((subtotal * taxPct) / 100);
      totalAmount = salesOrder.totalAmount ?? Number((subtotal + taxAmount).toFixed(2));
      lineSource = lines.map((l) => ({
        salesOrderLineId: l.id,
        itemCode: l.itemCode,
        description: l.description,
        itemCategory: l.itemCategory,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        taxPct: l.taxPct,
        lineTotal: l.lineTotal,
      } as unknown as InvoiceLine));
    }

    if (dto.lines?.length) {
      subtotal = dto.lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0);
      taxPct = Number(dto.taxPct ?? 18);
      taxAmount = Number((subtotal * taxPct) / 100);
      totalAmount = Number((subtotal + taxAmount).toFixed(2));
      lineSource = dto.lines.map((l) => ({
        salesOrderLineId: null,
        itemCode: l.itemCode ?? null,
        description: l.description,
        itemCategory: l.itemCategory ?? null,
        quantity: l.quantity,
        unit: l.unit ?? 'NOS',
        unitPrice: l.unitPrice,
        taxPct: l.taxPct ?? taxPct,
        lineTotal: Number((l.quantity * l.unitPrice).toFixed(2)),
      } as unknown as InvoiceLine));
    }

    const customerName =
      dto.customerName ??
      salesOrder?.customerName ??
      'Unknown Customer';

    const number = await this.generateInvoiceNumber(tenantId);
    const entity = this.repo.create({
      invoiceNumber: number,
      quotationId: dto.quotationId ?? salesOrder?.quotationId ?? null,
      salesOrderId: salesOrder?.id ?? dto.salesOrderId ?? null,
      projectId: dto.projectId ?? salesOrder?.projectId ?? null,
      customerId: dto.customerId ?? salesOrder?.customerId ?? null,
      customerName,
      invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      paidAmount: 0,
      balanceAmount: Number(totalAmount.toFixed(2)),
      currency: dto.currency ?? salesOrder?.currency ?? 'INR',
      status: InvoiceStatus.DRAFT,
      paymentTerms: dto.paymentTerms ?? salesOrder?.paymentTerms ?? null,
      notes: dto.notes ?? null,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Invoice);

    const saved = await this.repo.save(entity);

    if (lineSource.length > 0) {
      for (let idx = 0; idx < lineSource.length; idx++) {
        const line = lineSource[idx];
        await this.lineRepo.save(this.lineRepo.create({
          ...line,
          invoiceId: saved.id,
          lineNumber: idx + 1,
          ...(tenantId ? { tenantId } : {}),
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        }));
      }
    }

    await this.auditService.logBusinessEvent(
      'invoice.created', 'Invoice', saved.id, userId ?? 'system',
      {
        invoiceNumber: number, salesOrderId: salesOrder?.id ?? null,
        quotationId: saved.quotationId, projectId: saved.projectId,
        customerId: saved.customerId, totalAmount: saved.totalAmount, tenantId,
      },
    );

    await this.events.publish({
      eventType: CommercialEventType.INVOICE_CREATED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        invoiceId: saved.id,
        invoiceNumber: number,
        salesOrderId: saved.salesOrderId ?? null,
        quotationId: saved.quotationId ?? null,
        projectId: saved.projectId ?? null,
        customerId: saved.customerId ?? null,
        totalAmount: saved.totalAmount,
      },
    });

    return this.findOneWithLines(saved.id, tenantId);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  async findAllFiltered(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    filters: InvoiceFilterDto = {},
  ) {
    const qb = this.repo.createQueryBuilder('i')
      .where('i.deleted_at IS NULL')
      .orderBy('i.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (tenantId) qb.andWhere('i.tenant_id = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('i.status = :status', { status: filters.status });
    if (filters.customerId) qb.andWhere('i.customer_id = :customerId', { customerId: filters.customerId });
    if (filters.projectId) qb.andWhere('i.project_id = :projectId', { projectId: filters.projectId });
    if (filters.salesOrderId) qb.andWhere('i.sales_order_id = :salesOrderId', { salesOrderId: filters.salesOrderId });
    if (search) {
      qb.andWhere(
        '(i.invoice_number ILIKE :s OR i.customer_name ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    const [data, total] = await qb.getManyAndCount();
    const withStatus = data.map((inv) => this.withComputedStatus(inv));
    return { data: withStatus, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneWithLines(id: string, tenantId?: string | null): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);
    const lines = await this.lineRepo.find({
      where: { invoiceId: invoice.id, deletedAt: IsNull() },
      order: { lineNumber: 'ASC' },
    });
    return this.withComputedStatus({ ...invoice, lines } as unknown as Invoice);
  }

  /** OVERDUE is derived: issued/partial invoices whose due date has passed. */
  private withComputedStatus(invoice: Invoice): Invoice {
    if (
      invoice.status !== InvoiceStatus.CANCELLED &&
      invoice.status !== InvoiceStatus.DRAFT &&
      invoice.status !== InvoiceStatus.PAID &&
      invoice.dueDate &&
      new Date(invoice.dueDate) < new Date() &&
      Number(invoice.balanceAmount) > 0
    ) {
      return { ...invoice, status: InvoiceStatus.OVERDUE };
    }
    return invoice;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async issueInvoice(id: string, userId?: string, tenantId?: string | null): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(`Invoice can only be issued from DRAFT (current: ${invoice.status})`);
    }
    invoice.status = InvoiceStatus.ISSUED;
    if (userId) invoice.updatedBy = userId;
    await this.repo.save(invoice);
    await this.auditService.logBusinessEvent(
      'invoice.issued', 'Invoice', invoice.id, userId ?? 'system',
      { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount, tenantId },
    );
    await this.events.publish({
      eventType: CommercialEventType.INVOICE_ISSUED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
      },
    });
    return this.findOneWithLines(invoice.id, tenantId);
  }

  async cancelInvoice(
    id: string,
    dto: CancelInvoiceDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);
    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(`Invoice cannot be cancelled from status ${invoice.status}`);
    }
    if (Number(invoice.paidAmount) > 0) {
      throw new BadRequestException('Cannot cancel an invoice that has received payments');
    }
    invoice.status = InvoiceStatus.CANCELLED;
    invoice.notes = dto.reason;
    if (userId) invoice.updatedBy = userId;
    await this.repo.save(invoice);
    await this.auditService.logBusinessEvent(
      'invoice.cancelled', 'Invoice', invoice.id, userId ?? 'system',
      { invoiceNumber: invoice.invoiceNumber, reason: dto.reason, tenantId },
    );
    await this.events.publish({
      eventType: CommercialEventType.INVOICE_CANCELLED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        reason: dto.reason,
      },
    });
    return this.findOneWithLines(invoice.id, tenantId);
  }

  /**
   * Applied by PaymentService after a payment is recorded: updates the paid
   * and balance amounts and derives the payment state (PARTIALLY_PAID/PAID).
   */
  async applyPaymentAllocation(
    id: string,
    amount: number,
    currency: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot allocate payment to a cancelled invoice');
    }
    if (invoice.currency !== currency) {
      throw new BadRequestException(
        `Payment currency ${currency} does not match invoice currency ${invoice.currency}`,
      );
    }
    const paid = Number(invoice.paidAmount) + amount;
    const total = Number(invoice.totalAmount);
    if (paid > total + 0.001) {
      throw new BadRequestException(
        `Payment amount exceeds invoice balance (balance: ${Number(invoice.balanceAmount).toFixed(2)})`,
      );
    }
    invoice.paidAmount = Number(paid.toFixed(2));
    invoice.balanceAmount = Number((total - paid).toFixed(2));
    invoice.status = total - paid <= 0.001
      ? InvoiceStatus.PAID
      : (paid > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED);
    if (userId) invoice.updatedBy = userId;
    await this.repo.save(invoice);
    return invoice;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private async generateInvoiceNumber(_tenantId?: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    // invoice_number is globally unique, so numbering counts across all
    // tenants; per-tenant counting would collide across tenants.
    const where: any = { invoiceNumber: Like(`${prefix}%`), deletedAt: IsNull() };
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}
