import { Test, TestingModule } from '@nestjs/testing';
import { CustomerImportService } from './customer-import.service';
import { CustomerService } from './customer.service';
import { Customer } from '../entities/customer.entity';
import { AddressType } from '../entities/customer-address.entity';

describe('CustomerImportService', () => {
  let service: CustomerImportService;
  let customerService: jest.Mocked<CustomerService>;

  const mockCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    id: 'cust-001',
    code: 'CUS-2026-0001',
    name: 'Acme Corp',
    industry: 'automotive',
    customerTypeId: null,
    categoryId: null,
    gstNumber: null,
    taxId: null,
    registrationNumber: null,
    website: null,
    phone: '+91 98765 43210',
    email: 'sales@acme.com',
    currency: 'INR',
    creditLimit: null,
    paymentTerms: null,
    rating: null,
    primaryContactId: null,
    status: 'ACTIVE' as Customer['status'],
    source: 'MANUAL' as Customer['source'],
    archivedAt: null,
    archivedBy: null,
    attributes: null,
    version: 1,
    contacts: [],
    addresses: [],
    notes: [],
    attachments: [],
    activities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'user-001',
    updatedBy: null,
    tenantId: 'tenant-001',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerImportService,
        {
          provide: CustomerService,
          useValue: { createWithDetails: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CustomerImportService);
    customerService = module.get(CustomerService);
  });

  describe('importCustomers', () => {
    it('should count created rows and collect per-row errors', async () => {
      customerService.createWithDetails
        .mockResolvedValueOnce(mockCustomer() as any)
        .mockRejectedValueOnce(new Error('Duplicate code'))
        .mockResolvedValueOnce(mockCustomer() as any);

      const result = await service.importCustomers(
        [{ name: 'A' } as any, { name: 'B' } as any, { name: 'C' } as any],
        'user-001',
        'tenant-001',
      );
      expect(result.created).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toEqual([{ index: 1, message: 'Duplicate code' }]);
      expect(customerService.createWithDetails).toHaveBeenCalledTimes(3);
    });
  });

  describe('CSV helpers', () => {
    it('should export CSV with header row and escaped values', () => {
      const csv = service.exportCsv([mockCustomer()]);
      expect(csv.split('\n')[0]).toBe('code,name,industry,status,email,phone,gst_number,tax_id,city,state,primary_contact_email');
      expect(csv).toContain('CUS-2026-0001');
      expect(csv).toContain('Acme Corp');
    });

    it('should parse CSV rows and map them to CreateCustomerDto', () => {
      const csv = 'name,industry,email,contact_email,contact_phone,city,state\nAcme,auto,sales@acme.com,john@acme.com,555,Pune,MH\n';
      const rows = service.parseCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Acme');

      const dtos = service.importCsvRows(rows);
      expect(dtos).toHaveLength(1);
      expect(dtos[0].name).toBe('Acme');
      expect(dtos[0].contacts?.[0]?.email).toBe('john@acme.com');
      expect(dtos[0].addresses?.[0]?.city).toBe('Pune');
      expect(dtos[0].addresses?.[0]?.addressType).toBe(AddressType.BILLING);
    });

    it('should drop rows without a name during import mapping', () => {
      const dtos = service.importCsvRows([{ industry: 'auto' } as any]);
      expect(dtos).toHaveLength(0);
    });
  });
});
