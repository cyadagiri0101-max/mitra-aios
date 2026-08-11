import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrderService } from './sales-order.service';
import { SalesOrder, SalesOrderStatus } from '../entities/sales-order.entity';
import { SalesOrderLine } from '../entities/sales-order-line.entity';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotationitem.entity';
import { AuditService } from '../../audit/services/audit.service';

describe('SalesOrderService', () => {
  let service: SalesOrderService;
  let repo: jest.Mocked<Repository<SalesOrder>>;
  let lineRepo: jest.Mocked<Repository<SalesOrderLine>>;
  let quotationRepo: jest.Mocked<Repository<Quotation>>;
  let itemRepo: jest.Mocked<Repository<QuotationItem>>;
  let audit: jest.Mocked<AuditService>;

  const tenant = 'tenant-a';
  const user = 'user-a';

  const order = (overrides: Partial<SalesOrder> = {}): SalesOrder => ({
    id: 'so-1',
    salesOrderNumber: 'SO-2026-0001',
    quotationId: 'qtn-1',
    projectId: null,
    customerId: 'cust-1',
    customerName: 'Acme',
    orderDate: new Date(),
    deliveryDate: null,
    subtotal: 1000,
    taxAmount: 180,
    totalAmount: 1180,
    currency: 'INR',
    paymentTerms: null,
    deliveryTerms: null,
    cancelledReason: null,
    cancelledAt: null,
    status: SalesOrderStatus.DRAFT,
    notes: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: user,
    updatedBy: null,
    tenantId: tenant,
    ...overrides,
  });

  const quotation = (overrides: Partial<Quotation> = {}): Quotation => ({
    id: 'qtn-1',
    quotationNumber: 'QTN-2026-0001',
    enquiryId: null,
    rfqId: null,
    revisionNumber: 1,
    quotationDate: new Date(),
    validUntil: null,
    customerId: 'cust-1',
    customerName: 'Acme',
    subtotal: 1000,
    estimatedCost: 800,
    sellingPrice: 1000,
    marginAmount: 200,
    marginPct: 20,
    discountPct: 0,
    discountAmount: 0,
    taxPct: 18,
    taxAmount: 180,
    totalAmount: 1180,
    currency: 'INR',
    deliveryWeeks: null,
    paymentTerms: '50/50',
    deliveryTerms: null,
    warrantyMonths: 12,
    status: QuotationStatus.ACCEPTED,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    termsAndConditions: null,
    projectId: 'proj-1',
    terms: null,
    notes: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: user,
    updatedBy: null,
    tenantId: tenant,
    ...overrides,
  });

  const item = (overrides: Partial<QuotationItem> = {}): QuotationItem => ({
    id: 'qi-1',
    quotationId: 'qtn-1',
    lineNumber: 1,
    itemCode: null,
    description: 'Mold',
    itemCategory: 'MOLD',
    quantity: 1,
    unit: 'NOS',
    unitPrice: 1000,
    estimatedCost: 800,
    sellingPrice: 1000,
    marginAmount: 200,
    marginPct: 20,
    discountPct: 0,
    lineTotal: 1000,
    leadTimeWeeks: null,
    hsnCode: null,
    remarks: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: user,
    updatedBy: null,
    tenantId: tenant,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrderService,
        { provide: getRepositoryToken(SalesOrder), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), find: jest.fn(), count: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(SalesOrderLine), useValue: { create: jest.fn((e) => e), save: jest.fn(), find: jest.fn(), softDelete: jest.fn() } },
        { provide: getRepositoryToken(Quotation), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(QuotationItem), useValue: { find: jest.fn() } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(SalesOrderService);
    repo = module.get(getRepositoryToken(SalesOrder));
    lineRepo = module.get(getRepositoryToken(SalesOrderLine));
    quotationRepo = module.get(getRepositoryToken(Quotation));
    itemRepo = module.get(getRepositoryToken(QuotationItem));
    audit = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  it('creates a sales order from an accepted quotation with lines and totals', async () => {
    quotationRepo.findOne.mockResolvedValue(quotation());
    itemRepo.find.mockResolvedValue([item()]);
    const saved = order();
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValue(saved);
    repo.count.mockResolvedValue(0);
    repo.save.mockResolvedValue(saved);
    lineRepo.find.mockResolvedValue([]);

    const result = await service.createSalesOrder(
      { quotationId: 'qtn-1' },
      user,
      tenant,
    );

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      salesOrderNumber: 'SO-2026-0001',
      quotationId: 'qtn-1',
      projectId: 'proj-1',
      customerName: 'Acme',
      subtotal: 1000,
      taxAmount: 180,
      totalAmount: 1180,
      currency: 'INR',
      status: SalesOrderStatus.DRAFT,
      tenantId: tenant,
      createdBy: user,
    }));
    expect(lineRepo.save).toHaveBeenCalledWith(expect.objectContaining({ description: 'Mold' }));
    expect(audit.logBusinessEvent).toHaveBeenCalledWith(
      'sales-order.created', 'SalesOrder', 'so-1', user, expect.objectContaining({ tenantId: tenant }),
    );
  });

  it('rejects creation from a quotation that is not accepted', async () => {
    quotationRepo.findOne.mockResolvedValue(quotation({ status: QuotationStatus.DRAFT }));
    await expect(service.createSalesOrder({ quotationId: 'qtn-1' }, user, tenant))
      .rejects.toThrow(BadRequestException);
  });

  it('rejects a second active sales order for the same quotation', async () => {
    quotationRepo.findOne.mockResolvedValue(quotation());
    repo.findOne.mockResolvedValue(order({ status: SalesOrderStatus.CONFIRMED }));
    await expect(service.createSalesOrder({ quotationId: 'qtn-1' }, user, tenant))
      .rejects.toThrow(BadRequestException);
  });

  it('hides quotations from other tenants (404, no leak)', async () => {
    quotationRepo.findOne.mockResolvedValue(quotation({ tenantId: 'tenant-b' }));
    await expect(service.createSalesOrder({ quotationId: 'qtn-1' }, user, tenant))
      .rejects.toThrow(NotFoundException);
  });

  it('confirms only a DRAFT sales order', async () => {
    repo.findOne.mockResolvedValue(order());
    repo.save.mockResolvedValue(order({ status: SalesOrderStatus.CONFIRMED }));
    lineRepo.find.mockResolvedValue([]);

    const result = await service.confirmSalesOrder('so-1', user, tenant);
    expect(result.status).toBe(SalesOrderStatus.CONFIRMED);
    expect(audit.logBusinessEvent).toHaveBeenCalledWith('sales-order.confirmed', 'SalesOrder', 'so-1', user, expect.anything());
  });

  it('rejects confirming a completed sales order', async () => {
    repo.findOne.mockResolvedValue(order({ status: SalesOrderStatus.COMPLETED }));
    await expect(service.confirmSalesOrder('so-1', user, tenant)).rejects.toThrow(BadRequestException);
  });

  it('cancels only from DRAFT/CONFIRMED with a reason', async () => {
    repo.findOne.mockResolvedValue(order());
    repo.save.mockResolvedValue(order({ status: SalesOrderStatus.CANCELLED, cancelledReason: 'buyer cancelled' }));
    lineRepo.find.mockResolvedValue([]);

    const result = await service.cancelSalesOrder('so-1', { reason: 'buyer cancelled' }, user, tenant);
    expect(result.status).toBe(SalesOrderStatus.CANCELLED);
    expect(audit.logBusinessEvent).toHaveBeenCalledWith('sales-order.cancelled', 'SalesOrder', 'so-1', user, expect.objectContaining({ reason: 'buyer cancelled' }));
  });

  it('never cancels a completed sales order', async () => {
    repo.findOne.mockResolvedValue(order({ status: SalesOrderStatus.COMPLETED }));
    await expect(service.cancelSalesOrder('so-1', { reason: 'x' }, user, tenant))
      .rejects.toThrow(BadRequestException);
  });
});
