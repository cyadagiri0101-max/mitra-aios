import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like, In } from 'typeorm';
import { SalesOrder, SalesOrderStatus } from '../entities/sales-order.entity';
import { SalesOrderLine } from '../entities/sales-order-line.entity';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotationitem.entity';
import {
  CreateSalesOrderDto, UpdateSalesOrderDto, CancelSalesOrderDto,
  SalesOrderFilterDto,
} from '../dto/sales-order.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { CommercialEventType } from '../events/commercial.events';

@Injectable()
export class SalesOrderService extends TenantAwareService<SalesOrder> {
  constructor(
    @InjectRepository(SalesOrder)
    repo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine)
    private readonly lineRepo: Repository<SalesOrderLine>,
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly quotationItemRepo: Repository<QuotationItem>,
    private readonly auditService: AuditService,
    private readonly events: CommercialEventPublisherService,
  ) {
    super(repo, 'Sales Order');
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async createSalesOrder(
    dto: CreateSalesOrderDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<SalesOrder> {
    let quotation: Quotation | null = null;
    let projectId = dto.projectId ?? null;
    let customerId = dto.customerId ?? null;
    let customerName = dto.customerName ?? null;
    let currency = dto.currency ?? 'INR';
    let taxPct = Number(dto.taxPct ?? 18);
    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;
    let lineSource: SalesOrderLine[] = [];

    if (dto.quotationId) {
      quotation = await this.quotationRepo.findOne({
        where: { id: dto.quotationId, deletedAt: IsNull() },
      });
      if (!quotation) throw new NotFoundException('Quotation not found');
      if (tenantId && quotation.tenantId && quotation.tenantId !== tenantId) {
        throw new NotFoundException('Quotation not found');
      }
      if (![QuotationStatus.ACCEPTED, QuotationStatus.PROJECT_CREATED].includes(quotation.status)) {
        throw new BadRequestException(
          `Sales order can only be created from an accepted quotation (current: ${quotation.status})`,
        );
      }
      const existing = await this.repo.findOne({
        where: { quotationId: quotation.id, deletedAt: IsNull() },
      });
      if (existing && existing.status !== SalesOrderStatus.CANCELLED) {
        throw new BadRequestException('A sales order already exists for this quotation');
      }

      projectId = quotation.projectId ?? projectId;
      customerId = quotation.customerId ?? customerId;
      customerName = customerName ?? quotation.customerName ?? 'Unknown Customer';
      currency = dto.currency ?? quotation.currency ?? 'INR';

      const items = await this.quotationItemRepo.find({
        where: { quotationId: quotation.id, deletedAt: IsNull() },
        order: { lineNumber: 'ASC' },
      });
      if (items.length > 0) {
        subtotal = items.reduce((s, i) => s + Number(i.lineTotal ?? 0), 0);
        taxPct = Number(dto.taxPct ?? quotation.taxPct ?? 18);
        taxAmount = Number((subtotal * taxPct) / 100);
        totalAmount = Number((subtotal + taxAmount).toFixed(2));
        lineSource = items.map((i) => ({
          quotationItemId: i.id,
          itemCode: i.itemCode,
          description: i.description,
          itemCategory: i.itemCategory,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          taxPct: i.discountPct ? taxPct : taxPct,
          lineTotal: i.lineTotal,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        } as unknown as SalesOrderLine));
      }
    }

    if (dto.lines?.length) {
      subtotal = dto.lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0);
      taxPct = Number(dto.taxPct ?? taxPct);
      taxAmount = Number((subtotal * taxPct) / 100);
      totalAmount = Number((subtotal + taxAmount).toFixed(2));
      lineSource = dto.lines.map((l, idx) => ({
        quotationItemId: null,
        itemCode: l.itemCode ?? null,
        description: l.description,
        itemCategory: l.itemCategory ?? null,
        quantity: l.quantity,
        unit: l.unit ?? 'NOS',
        unitPrice: l.unitPrice,
        taxPct: l.taxPct ?? taxPct,
        lineTotal: Number((l.quantity * l.unitPrice).toFixed(2)),
        deliveryDate: l.deliveryDate ? new Date(l.deliveryDate) : null,
        remarks: l.remarks ?? null,
      } as unknown as SalesOrderLine));
    }

    if (!customerName) throw new BadRequestException('customerName is required');

    const number = await this.generateSalesOrderNumber(tenantId);
    const entity = this.repo.create({
      salesOrderNumber: number,
      quotationId: quotation?.id ?? null,
      projectId,
      customerId,
      customerName,
      orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
      deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount,
      currency,
      paymentTerms: dto.paymentTerms ?? quotation?.paymentTerms ?? null,
      deliveryTerms: dto.deliveryTerms ?? null,
      status: SalesOrderStatus.DRAFT,
      notes: dto.notes ?? null,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as SalesOrder);

    const saved = await this.repo.save(entity);

    if (lineSource.length > 0) {
      await this.replaceLines(saved.id, lineSource, userId, tenantId);
    }

    await this.auditService.logBusinessEvent(
      'sales-order.created', 'SalesOrder', saved.id, userId ?? 'system',
      {
        salesOrderNumber: number, quotationId: quotation?.id ?? null, projectId,
        customerId, totalAmount: saved.totalAmount, tenantId,
      },
    );

    await this.events.publish({
      eventType: CommercialEventType.SALES_ORDER_CREATED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        salesOrderId: saved.id,
        salesOrderNumber: number,
        quotationId: quotation?.id ?? null,
        projectId: projectId ?? null,
        customerId: customerId ?? null,
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
    filters: SalesOrderFilterDto = {},
  ) {
    const qb = this.repo.createQueryBuilder('so')
      .where('so.deleted_at IS NULL')
      .orderBy('so.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (tenantId) qb.andWhere('so.tenant_id = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('so.status = :status', { status: filters.status });
    if (filters.customerId) qb.andWhere('so.customer_id = :customerId', { customerId: filters.customerId });
    if (filters.quotationId) qb.andWhere('so.quotation_id = :quotationId', { quotationId: filters.quotationId });
    if (filters.projectId) qb.andWhere('so.project_id = :projectId', { projectId: filters.projectId });
    if (search) {
      qb.andWhere(
        '(so.sales_order_number ILIKE :s OR so.customer_name ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneWithLines(id: string, tenantId?: string | null): Promise<SalesOrder> {
    const order = await this.findOne(id, tenantId);
    const lines = await this.lineRepo.find({
      where: { salesOrderId: order.id, deletedAt: IsNull() },
      order: { lineNumber: 'ASC' },
    });
    return { ...order, lines } as unknown as SalesOrder;
  }

  // ── Lifecycle transitions ────────────────────────────────────────────────
  async confirmSalesOrder(id: string, userId?: string, tenantId?: string | null): Promise<SalesOrder> {
    const order = await this.findOne(id, tenantId);
    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(`Sales order cannot be confirmed from status ${order.status}`);
    }
    order.status = SalesOrderStatus.CONFIRMED;
    if (userId) order.updatedBy = userId;
    await this.repo.save(order);
    await this.auditService.logBusinessEvent(
      'sales-order.confirmed', 'SalesOrder', order.id, userId ?? 'system',
      { salesOrderNumber: order.salesOrderNumber, tenantId },
    );
    await this.events.publish({
      eventType: CommercialEventType.SALES_ORDER_CONFIRMED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        salesOrderId: order.id,
        salesOrderNumber: order.salesOrderNumber,
      },
    });
    return this.findOneWithLines(order.id, tenantId);
  }

  async completeSalesOrder(id: string, userId?: string, tenantId?: string | null): Promise<SalesOrder> {
    const order = await this.findOne(id, tenantId);
    if (order.status !== SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException(`Sales order cannot be completed from status ${order.status}`);
    }
    order.status = SalesOrderStatus.COMPLETED;
    if (userId) order.updatedBy = userId;
    await this.repo.save(order);
    await this.auditService.logBusinessEvent(
      'sales-order.completed', 'SalesOrder', order.id, userId ?? 'system',
      { salesOrderNumber: order.salesOrderNumber, tenantId },
    );
    return this.findOneWithLines(order.id, tenantId);
  }

  async cancelSalesOrder(
    id: string,
    dto: CancelSalesOrderDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<SalesOrder> {
    const order = await this.findOne(id, tenantId);
    if (order.status === SalesOrderStatus.COMPLETED || order.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestException(`Sales order cannot be cancelled from status ${order.status}`);
    }
    order.status = SalesOrderStatus.CANCELLED;
    order.cancelledReason = dto.reason;
    order.cancelledAt = new Date();
    if (userId) order.updatedBy = userId;
    await this.repo.save(order);
    await this.auditService.logBusinessEvent(
      'sales-order.cancelled', 'SalesOrder', order.id, userId ?? 'system',
      { salesOrderNumber: order.salesOrderNumber, reason: dto.reason, tenantId },
    );
    await this.events.publish({
      eventType: CommercialEventType.SALES_ORDER_CANCELLED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        salesOrderId: order.id,
        salesOrderNumber: order.salesOrderNumber,
        reason: dto.reason,
      },
    });
    return this.findOneWithLines(order.id, tenantId);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  async updateSalesOrder(
    id: string,
    dto: UpdateSalesOrderDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<SalesOrder> {
    const order = await this.findOne(id, tenantId);
    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft sales orders can be updated');
    }
    if (dto.deliveryDate !== undefined) order.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
    if (dto.paymentTerms !== undefined) order.paymentTerms = dto.paymentTerms ?? null;
    if (dto.deliveryTerms !== undefined) order.deliveryTerms = dto.deliveryTerms ?? null;
    if (dto.notes !== undefined) order.notes = dto.notes ?? null;
    if (userId) order.updatedBy = userId;
    await this.repo.save(order);

    if (dto.lines?.length) {
      const subtotal = dto.lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0);
      const taxPct = Number(order.taxAmount > 0 ? (order.taxAmount / order.subtotal) * 100 : 18);
      const taxAmount = Number((subtotal * taxPct) / 100);
      order.subtotal = Number(subtotal.toFixed(2));
      order.taxAmount = Number(taxAmount.toFixed(2));
      order.totalAmount = Number((subtotal + taxAmount).toFixed(2));
      await this.repo.save(order);
      await this.replaceLines(
        order.id,
        dto.lines.map((l, idx) => ({
          quotationItemId: null,
          itemCode: l.itemCode ?? null,
          description: l.description,
          itemCategory: l.itemCategory ?? null,
          quantity: l.quantity,
          unit: l.unit ?? 'NOS',
          unitPrice: l.unitPrice,
          taxPct: l.taxPct ?? taxPct,
          lineTotal: Number((l.quantity * l.unitPrice).toFixed(2)),
          deliveryDate: l.deliveryDate ? new Date(l.deliveryDate) : null,
          remarks: l.remarks ?? null,
        } as unknown as SalesOrderLine)),
        userId,
        tenantId,
      );
    }

    return this.findOneWithLines(order.id, tenantId);
  }

  // ── Lines ─────────────────────────────────────────────────────────────────
  private async replaceLines(
    salesOrderId: string,
    lines: SalesOrderLine[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    await this.lineRepo.softDelete({ salesOrderId });
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      await this.lineRepo.save(this.lineRepo.create({
        ...line,
        salesOrderId,
        lineNumber: idx + 1,
        ...(tenantId ? { tenantId } : {}),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      }));
    }
  }

  private async generateSalesOrderNumber(_tenantId?: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    // sales_order_number is globally unique, so numbering counts across all
    // tenants; per-tenant counting would make the first document of a second
    // tenant collide with the first document of the first tenant.
    const where: any = { salesOrderNumber: Like(`${prefix}%`), deletedAt: IsNull() };
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}
