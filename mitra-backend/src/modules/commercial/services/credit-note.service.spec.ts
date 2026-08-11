import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreditNoteService } from './credit-note.service';
import { CreditNote, CreditNoteStatus } from '../entities/creditnote.entity';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { Customer } from '../entities/customer.entity';
import { AuditService } from '../../audit/services/audit.service';

describe('CreditNoteService', () => {
  let service: CreditNoteService;
  let repo: jest.Mocked<Repository<CreditNote>>;
  let invoiceRepo: jest.Mocked<Repository<Invoice>>;
  let customerRepo: jest.Mocked<Repository<Customer>>;
  let audit: jest.Mocked<AuditService>;

  const tenant = 'tenant-a';
  const user = 'user-a';

  const note = (overrides: Partial<CreditNote> = {}): CreditNote => ({
    id: 'cn-1',
    creditNoteNumber: 'CN-2026-0001',
    invoiceId: 'inv-1',
    customerId: 'cust-1',
    salesOrderId: null,
    creditDate: new Date(),
    amount: 200,
    currency: 'INR',
    reason: 'Damaged goods',
    status: CreditNoteStatus.OPEN,
    appliedAt: null,
    appliedBy: null,
    cancelledReason: null,
    cancelledAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: user,
    updatedBy: null,
    tenantId: tenant,
    ...overrides,
  });

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditNoteService,
        { provide: getRepositoryToken(CreditNote), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn(), count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(Invoice), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Customer), useValue: { findOne: jest.fn() } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(CreditNoteService);
    repo = module.get(getRepositoryToken(CreditNote));
    invoiceRepo = module.get(getRepositoryToken(Invoice));
    customerRepo = module.get(getRepositoryToken(Customer));
    audit = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  it('creates an OPEN credit note linked to an invoice and customer', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice());
    customerRepo.findOne.mockResolvedValue({ id: 'cust-1', tenantId: tenant } as Customer);
    repo.save.mockResolvedValue(note());

    const result = await service.createCreditNote(
      { invoiceId: 'inv-1', customerId: 'cust-1', creditDate: '2026-08-01', amount: 200, reason: 'Damaged goods' },
      user,
      tenant,
    );

    expect(result.creditNoteNumber).toBe('CN-2026-0001');
    expect(result.status).toBe(CreditNoteStatus.OPEN);
    expect(audit.logBusinessEvent).toHaveBeenCalledWith('credit-note.created', 'CreditNote', 'cn-1', user, expect.anything());
  });

  it('rejects credit notes against a cancelled invoice', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice({ status: InvoiceStatus.CANCELLED }));
    await expect(service.createCreditNote(
      { invoiceId: 'inv-1', creditDate: '2026-08-01', amount: 200, reason: 'x' }, user, tenant,
    )).rejects.toThrow(BadRequestException);
  });

  it('hides invoices from other tenants (404, no leak)', async () => {
    invoiceRepo.findOne.mockResolvedValue(invoice({ tenantId: 'tenant-b' }));
    await expect(service.createCreditNote(
      { invoiceId: 'inv-1', creditDate: '2026-08-01', amount: 200, reason: 'x' }, user, tenant,
    )).rejects.toThrow(NotFoundException);
  });

  it('applies an OPEN credit note to a matching invoice', async () => {
    repo.findOne.mockResolvedValue(note());
    invoiceRepo.findOne.mockResolvedValue(invoice());
    repo.save.mockImplementation(async (e: any) => e);

    const result = await service.applyCreditNote('cn-1', { invoiceId: 'inv-1' }, user, tenant);
    expect(result.status).toBe(CreditNoteStatus.APPLIED);
    expect(result.appliedBy).toBe(user);
    expect(audit.logBusinessEvent).toHaveBeenCalledWith('credit-note.applied', 'CreditNote', 'cn-1', user, expect.anything());
  });

  it('rejects applying to an invoice of a different customer', async () => {
    repo.findOne.mockResolvedValue(note({ customerId: 'cust-1' }));
    invoiceRepo.findOne.mockResolvedValue(invoice({ customerId: 'cust-2' }));
    await expect(service.applyCreditNote('cn-1', { invoiceId: 'inv-1' }, user, tenant))
      .rejects.toThrow(BadRequestException);
  });

  it('rejects applying a non-OPEN credit note', async () => {
    repo.findOne.mockResolvedValue(note({ status: CreditNoteStatus.APPLIED }));
    await expect(service.applyCreditNote('cn-1', { invoiceId: 'inv-1' }, user, tenant))
      .rejects.toThrow(BadRequestException);
  });

  it('cancels only an OPEN credit note with a reason', async () => {
    repo.findOne.mockResolvedValue(note());
    repo.save.mockImplementation(async (e: any) => e);
    const result = await service.cancelCreditNote('cn-1', { reason: 'issued in error' }, user, tenant);
    expect(result.status).toBe(CreditNoteStatus.CANCELLED);
    expect(result.cancelledReason).toBe('issued in error');

    repo.findOne.mockResolvedValue(note({ status: CreditNoteStatus.APPLIED }));
    await expect(service.cancelCreditNote('cn-1', { reason: 'x' }, user, tenant))
      .rejects.toThrow(BadRequestException);
  });
});
