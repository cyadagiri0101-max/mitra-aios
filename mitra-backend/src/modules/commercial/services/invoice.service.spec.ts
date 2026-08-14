import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceLine } from '../entities/invoice-line.entity';
import { SalesOrder, SalesOrderStatus } from '../entities/sales-order.entity';
import { SalesOrderLine } from '../entities/sales-order-line.entity';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let repo: jest.Mocked<Repository<Invoice>>;
  let lineRepo: jest.Mocked<Repository<InvoiceLine>>;
  let salesOrderRepo: jest.Mocked<Repository<SalesOrder>>;
  let salesOrderLineRepo: jest.Mocked<Repository<SalesOrderLine>>;
  let audit: jest.Mocked<AuditService>;

  const tenant = 'tenant-a';
  const user = 'user-a';

  const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    quotationId: 'qtn-1',
    salesOrderId: 'so-1',
    projectId: 'proj-1',
    customerId: 'cust-1',
    customerName: 'Acme',
    invoiceDate: new Date(),
    dueDate: null,
    subtotal: 1000,
    taxAmount: 180,
    totalAmount: 1180,
    paidAmount: 0,
    balanceAmount: 1180,
    currency: 'INR',
    status: InvoiceStatus.DRAFT,
    paymentTerms: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: user,
    updatedBy: null,
    tenantId: tenant,
    ...overrides,
  });

  const salesOrder = (overrides: Partial<SalesOrder> = {}): SalesOrder => ({
    id: 'so-1',
    salesOrderNumber: 'SO-2026-0001',
    quotationId: 'qtn-1',
    projectId: 'proj-1',
    customerId: 'cust-1',
    customerName: 'Acme',
    orderDate: new Date(),
    deliveryDate: null,
    subtotal: 1000,
    taxAmount: 180,
    totalAmount: 1180,
    currency: 'INR',
    paymentTerms: '50/50',
    deliveryTerms: null,
    cancelledReason: null,
    cancelledAt: null,
    status: SalesOrderStatus.CONFIRMED,
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getRepositoryToken(Invoice), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), findAndCount: jest.fn(), createQueryBuilder: jest.fn(), count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(InvoiceLine), useValue: { create: jest.fn((e) => e), save: jest.fn(), find: jest.fn() } },
        { provide: getRepositoryToken(SalesOrder), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(SalesOrderLine), useValue: { find: jest.fn() } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
        { provide: CommercialEventPublisherService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(InvoiceService);
    repo = module.get(getRepositoryToken(Invoice));
    lineRepo = module.get(getRepositoryToken(InvoiceLine));
    salesOrderRepo = module.get(getRepositoryToken(SalesOrder));
    salesOrderLineRepo = module.get(getRepositoryToken(SalesOrderLine));
    audit = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  it('creates an invoice from a confirmed sales order, inheriting totals and links', async () => {
    salesOrderRepo.findOne.mockResolvedValue(salesOrder());
    salesOrderLineRepo.find.mockResolvedValue([{
      id: 'sol-1', salesOrderId: 'so-1', quotationItemId: null, lineNumber: 1,
      itemCode: null, description: 'Mold', itemCategory: 'MOLD', quantity: 1, unit: 'NOS',
      unitPrice: 1000, taxPct: 18, lineTotal: 1000, deliveryDate: null, remarks: null,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      createdBy: user, updatedBy: null, tenantId: tenant,
    }]);
    repo.save.mockResolvedValue(invoice());
    repo.findOne.mockResolvedValue(invoice());
    lineRepo.find.mockResolvedValue([]);

    const result = await service.createInvoice({ salesOrderId: 'so-1', invoiceDate: '2026-08-01' }, user, tenant);

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      invoiceNumber: 'INV-2026-0001',
      quotationId: 'qtn-1',
      salesOrderId: 'so-1',
      projectId: 'proj-1',
      customerName: 'Acme',
      totalAmount: 1180,
      balanceAmount: 1180,
      status: InvoiceStatus.DRAFT,
    }));
    expect(audit.logBusinessEvent).toHaveBeenCalledWith('invoice.created', 'Invoice', 'inv-1', user, expect.anything());
  });

  it('rejects invoices against a cancelled sales order', async () => {
    salesOrderRepo.findOne.mockResolvedValue(salesOrder({ status: SalesOrderStatus.CANCELLED }));
    await expect(service.createInvoice({ salesOrderId: 'so-1', invoiceDate: '2026-08-01' }, user, tenant))
      .rejects.toThrow(BadRequestException);
  });

  it('hides sales orders from other tenants (404, no leak)', async () => {
    salesOrderRepo.findOne.mockResolvedValue(salesOrder({ tenantId: 'tenant-b' }));
    await expect(service.createInvoice({ salesOrderId: 'so-1', invoiceDate: '2026-08-01' }, user, tenant))
      .rejects.toThrow(NotFoundException);
  });

  it('issues only a DRAFT invoice', async () => {
    repo.findOne.mockResolvedValue(invoice());
    repo.save.mockResolvedValue(invoice({ status: InvoiceStatus.ISSUED }));
    lineRepo.find.mockResolvedValue([]);
    const result = await service.issueInvoice('inv-1', user, tenant);
    expect(result.status).toBe(InvoiceStatus.ISSUED);
    expect(audit.logBusinessEvent).toHaveBeenCalledWith('invoice.issued', 'Invoice', 'inv-1', user, expect.anything());
  });

  it('rejects issuing an already-issued invoice', async () => {
    repo.findOne.mockResolvedValue(invoice({ status: InvoiceStatus.ISSUED }));
    await expect(service.issueInvoice('inv-1', user, tenant)).rejects.toThrow(BadRequestException);
  });

  it('rejects cancelling an invoice that has received payments', async () => {
    repo.findOne.mockResolvedValue(invoice({ status: InvoiceStatus.PARTIALLY_PAID, paidAmount: 500 }));
    await expect(service.cancelInvoice('inv-1', { reason: 'duplicate' }, user, tenant))
      .rejects.toThrow(BadRequestException);
  });

  it('allocation drives PARTIALLY_PAID then PAID and blocks overpayment', async () => {
    repo.findOne.mockResolvedValueOnce(invoice({ status: InvoiceStatus.ISSUED }))
      .mockResolvedValueOnce(invoice({ status: InvoiceStatus.PARTIALLY_PAID, paidAmount: 500, balanceAmount: 680 }));
    repo.save.mockImplementation(async (e: any) => e);

    await service.applyPaymentAllocation('inv-1', 500, 'INR', user, tenant);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      status: InvoiceStatus.PARTIALLY_PAID,
      paidAmount: 500,
      balanceAmount: 680,
    }));

    await service.applyPaymentAllocation('inv-1', 680, 'INR', user, tenant);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      status: InvoiceStatus.PAID,
      paidAmount: 1180,
      balanceAmount: 0,
    }));

    repo.findOne.mockResolvedValue(invoice({ status: InvoiceStatus.PAID, paidAmount: 1180, balanceAmount: 0 }));
    await expect(service.applyPaymentAllocation('inv-1', 1, 'INR', user, tenant))
      .rejects.toThrow(BadRequestException);
  });

  it('rejects currency-mismatched allocation', async () => {
    repo.findOne.mockResolvedValue(invoice({ status: InvoiceStatus.ISSUED }));
    await expect(service.applyPaymentAllocation('inv-1', 100, 'USD', user, tenant))
      .rejects.toThrow(BadRequestException);
  });
});
