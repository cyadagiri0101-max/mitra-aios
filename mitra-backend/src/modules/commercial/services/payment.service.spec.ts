import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Payment, PaymentMethod } from '../entities/payment.entity';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { AuditService } from '../../audit/services/audit.service';
import { InvoiceService } from './invoice.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let repo: jest.Mocked<Repository<Payment>>;
  let invoiceRepo: jest.Mocked<Repository<Invoice>>;
  let invoiceService: jest.Mocked<InvoiceService>;
  let audit: jest.Mocked<AuditService>;

  const tenant = 'tenant-a';
  const user = 'user-a';

  const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    quotationId: null,
    salesOrderId: null,
    projectId: null,
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
    status: InvoiceStatus.ISSUED,
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

  const payment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'pay-1',
    paymentNumber: 'PAY-2026-0001',
    invoiceId: 'inv-1',
    customerId: 'cust-1',
    paymentDate: new Date(),
    amount: 500,
    currency: 'INR',
    method: PaymentMethod.BANK_TRANSFER,
    referenceNumber: null,
    bankName: null,
    remarks: null,
    isVerified: false,
    verifiedBy: null,
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
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), findAndCount: jest.fn(), count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(Invoice), useValue: { findOne: jest.fn() } },
        { provide: InvoiceService, useValue: { applyPaymentAllocation: jest.fn() } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(PaymentService);
    repo = module.get(getRepositoryToken(Payment));
    invoiceRepo = module.get(getRepositoryToken(Invoice));
    invoiceService = module.get(InvoiceService);
    audit = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  it('records a payment and allocates it to the invoice', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice());
    repo.save.mockResolvedValue(payment());

    const result = await service.recordPayment(
      { invoiceId: 'inv-1', paymentDate: '2026-08-01', amount: 500 },
      user,
      tenant,
    );

    expect(result.paymentNumber).toBe('PAY-2026-0001');
    expect(invoiceService.applyPaymentAllocation).toHaveBeenCalledWith('inv-1', 500, 'INR', user, tenant);
    expect(audit.logBusinessEvent).toHaveBeenCalledWith('payment.recorded', 'Payment', 'pay-1', user, expect.anything());
  });

  it('rejects payments exceeding the invoice balance', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice({ balanceAmount: 100 }));
    await expect(service.recordPayment(
      { invoiceId: 'inv-1', paymentDate: '2026-08-01', amount: 500 }, user, tenant,
    )).rejects.toThrow(BadRequestException);
  });

  it('rejects payments against a cancelled invoice', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice({ status: InvoiceStatus.CANCELLED }));
    await expect(service.recordPayment(
      { invoiceId: 'inv-1', paymentDate: '2026-08-01', amount: 100 }, user, tenant,
    )).rejects.toThrow(BadRequestException);
  });

  it('rejects payments against a draft (unissued) invoice', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice({ status: InvoiceStatus.DRAFT }));
    await expect(service.recordPayment(
      { invoiceId: 'inv-1', paymentDate: '2026-08-01', amount: 100 }, user, tenant,
    )).rejects.toThrow(BadRequestException);
  });

  it('hides invoices from other tenants (404, no leak)', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice({ tenantId: 'tenant-b' }));
    await expect(service.recordPayment(
      { invoiceId: 'inv-1', paymentDate: '2026-08-01', amount: 100 }, user, tenant,
    )).rejects.toThrow(NotFoundException);
  });

  it('rejects currency-mismatched payments', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice({ currency: 'INR' }));
    await expect(service.recordPayment(
      { invoiceId: 'inv-1', paymentDate: '2026-08-01', amount: 100, currency: 'USD' }, user, tenant,
    )).rejects.toThrow(BadRequestException);
  });

  it('verifies a payment exactly once', async () => {
    repo.findOne.mockResolvedValue(payment());
    repo.save.mockImplementation(async (e: any) => e);
    const result = await service.verifyPayment('pay-1', {}, user, tenant);
    expect(result.isVerified).toBe(true);
    expect(result.verifiedBy).toBe(user);

    repo.findOne.mockResolvedValue(payment({ isVerified: true }));
    await expect(service.verifyPayment('pay-1', {}, user, tenant)).rejects.toThrow(BadRequestException);
  });
});
