import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactService } from './contact.service';
import { Contact } from '../entities/contact.entity';
import { Customer } from '../entities/customer.entity';
import { AuditService } from '../../audit/services/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ContactService', () => {
  let service: ContactService;
  let repo: jest.Mocked<Repository<Contact>>;
  let customerRepo: jest.Mocked<Repository<Customer>>;
  let auditService: jest.Mocked<AuditService>;

  const mockContact = (overrides: Partial<Contact> = {}): Contact => ({
    id: 'ctc-001',
    customerId: 'cust-001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@acme.com',
    phone: null,
    mobile: null,
    role: null,
    designation: 'Procurement Manager',
    department: 'Purchase',
    communicationPreferences: null,
    isPrimary: true,
    notes: null,
    version: 1,
    customer: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'user-001',
    updatedBy: null,
    tenantId: 'tenant-001',
    ...overrides,
  });

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockCustomerRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: getRepositoryToken(Contact), useValue: mockRepo },
        { provide: getRepositoryToken(Customer), useValue: mockCustomerRepo },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
    repo = module.get(getRepositoryToken(Contact));
    customerRepo = module.get(getRepositoryToken(Customer));
    auditService = module.get(AuditService);
  });

  describe('createContact', () => {
    it('should require a customerId', async () => {
      await expect(
        service.createContact({ firstName: 'Jane', lastName: 'Doe' } as any, 'user-001', 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if the customer does not exist', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createContact({ customerId: 'nope', firstName: 'Jane', lastName: 'Doe' }, 'user-001', 'tenant-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create the contact and clear previous primary when needed', async () => {
      customerRepo.findOne.mockResolvedValue({ id: 'cust-001' } as Customer);
      repo.create.mockReturnValue(mockContact());
      repo.save.mockResolvedValue(mockContact());

      const result = await service.createContact(
        { customerId: 'cust-001', firstName: 'John', lastName: 'Smith', email: 'john@acme.com', isPrimary: true },
        'user-001',
        'tenant-001',
      );

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cust-001', isPrimary: true }),
        { isPrimary: false },
      );
      expect(customerRepo.update).toHaveBeenCalledWith({ id: 'cust-001' }, { primaryContactId: 'ctc-001' });
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'contact.created', 'Contact', 'ctc-001', 'user-001', expect.anything(),
      );
      expect(result.isPrimary).toBe(true);
    });
  });

  describe('setDefault', () => {
    it('should promote contact to primary and update the customer', async () => {
      repo.findOne.mockResolvedValue(mockContact({ isPrimary: false }));
      repo.save.mockResolvedValue(mockContact({ isPrimary: true }));

      const result = await service.setDefault('ctc-001', 'user-001', 'tenant-001');

      expect(result.isPrimary).toBe(true);
      expect(customerRepo.update).toHaveBeenCalledWith({ id: 'cust-001' }, { primaryContactId: 'ctc-001' });
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'contact.set-default', 'Contact', 'ctc-001', 'user-001', expect.anything(),
      );
    });
  });

  describe('removeContact', () => {
    it('should soft-delete and clear primary contact on the customer', async () => {
      repo.findOne.mockResolvedValue(mockContact());
      repo.save.mockResolvedValue(mockContact());

      const result = await service.removeContact('ctc-001', 'user-001', 'tenant-001');

      expect(result).toEqual({ deleted: true, id: 'ctc-001' });
      expect(customerRepo.update).toHaveBeenCalledWith({ id: 'cust-001' }, { primaryContactId: null });
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'contact.deleted', 'Contact', 'ctc-001', 'user-001', expect.anything(),
      );
    });

    it('should throw when contact not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.removeContact('nope', 'user-001', 'tenant-001')).rejects.toThrow(NotFoundException);
    });
  });
});
