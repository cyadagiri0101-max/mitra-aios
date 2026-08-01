import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { CustomerService } from './customer.service';
import { Customer, CustomerStatus } from '../entities/customer.entity';
import { Contact } from '../entities/contact.entity';
import { CustomerAddress, AddressType } from '../entities/customer-address.entity';
import { CustomerNote } from '../entities/customer-note.entity';
import { CustomerAttachment } from '../entities/customer-attachment.entity';
import { CustomerActivity } from '../entities/customer-activity.entity';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialAiService } from './commercial-ai.service';
import { CustomerActivityService } from './customer-activity.service';
import { CustomerContactService } from './customer-contact.service';
import { CustomerAddressService } from './customer-address.service';
import { CustomerNoteService } from './customer-note.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepo: jest.Mocked<Repository<Customer>>;
  let contactRepo: jest.Mocked<Repository<Contact>>;
  let addressRepo: jest.Mocked<Repository<CustomerAddress>>;
  let noteRepo: jest.Mocked<Repository<CustomerNote>>;
  let activityRepo: jest.Mocked<Repository<CustomerActivity>>;
  let auditService: jest.Mocked<AuditService>;
  let aiService: jest.Mocked<CommercialAiService>;

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
    status: CustomerStatus.ACTIVE,
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

  const mockContact = (overrides: Partial<Contact> = {}): Contact => ({
    id: 'ctc-001',
    customerId: 'cust-001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@acme.com',
    phone: '+91 12345 67890',
    mobile: null,
    role: 'procurement',
    designation: 'Procurement Manager',
    department: null,
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
      findAndCount: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockContactRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockAddressRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockNoteRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockAttachmentRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockActivityRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        CustomerActivityService,
        CustomerContactService,
        CustomerAddressService,
        CustomerNoteService,
        { provide: getRepositoryToken(Customer), useValue: mockRepo },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepo },
        { provide: getRepositoryToken(CustomerAddress), useValue: mockAddressRepo },
        { provide: getRepositoryToken(CustomerNote), useValue: mockNoteRepo },
        { provide: getRepositoryToken(CustomerAttachment), useValue: mockAttachmentRepo },
        { provide: getRepositoryToken(CustomerActivity), useValue: mockActivityRepo },
        {
          provide: AuditService,
          useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: CommercialAiService,
          useValue: { syncEntityContext: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    customerRepo = module.get(getRepositoryToken(Customer));
    contactRepo = module.get(getRepositoryToken(Contact));
    addressRepo = module.get(getRepositoryToken(CustomerAddress));
    noteRepo = module.get(getRepositoryToken(CustomerNote));
    activityRepo = module.get(getRepositoryToken(CustomerActivity));
    auditService = module.get(AuditService);
    aiService = module.get(CommercialAiService);
  });

  describe('createWithDetails', () => {
    it('should create customer with generated code, nested contacts and addresses', async () => {
      customerRepo.count.mockResolvedValue(0);
      customerRepo.create.mockReturnValue(mockCustomer());
      customerRepo.save.mockResolvedValue(mockCustomer());
      customerRepo.findOne.mockResolvedValue(mockCustomer());
      contactRepo.create.mockReturnValue(mockContact());
      contactRepo.save.mockResolvedValue(mockContact());
      addressRepo.create.mockReturnValue({ id: 'addr-001' } as any);
      addressRepo.save.mockResolvedValue({ id: 'addr-001' } as any);
      activityRepo.create.mockReturnValue({ id: 'act-001' } as any);
      activityRepo.save.mockResolvedValue({ id: 'act-001' } as any);
      activityRepo.find.mockResolvedValue([]);

      const dto: any = {
        name: 'Acme Corp',
        industry: 'automotive',
        contacts: [{ firstName: 'John', lastName: 'Smith', email: 'john@acme.com', isPrimary: true }],
        addresses: [{ addressType: AddressType.BILLING, line1: 'MG Road', city: 'Pune', state: 'MH' }],
      };

      const result = await service.createWithDetails(dto, 'user-001', 'tenant-001');
      expect(result.code).toBe('CUS-2026-0001');
      expect(customerRepo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'CUS-2026-0001' }));
      expect(contactRepo.save).toHaveBeenCalled();
      expect(addressRepo.save).toHaveBeenCalled();
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'customer.created', 'Customer', 'cust-001', 'user-001', expect.anything(),
      );
      expect(aiService.syncEntityContext).toHaveBeenCalledWith(
        'customer', 'cust-001', expect.anything(), 'user-001', 'tenant-001',
      );
    });
  });

  describe('findOneWithDetails', () => {
    it('should return customer with activities timeline', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer({ contacts: [mockContact()] }));
      activityRepo.find.mockResolvedValue([{ id: 'act-001', description: 'Customer created' } as CustomerActivity]);

      const result = await service.findOneWithDetails('cust-001', 'tenant-001');
      expect(result.id).toBe('cust-001');
      expect((result as any).activities).toHaveLength(1);
    });

    it('should throw if not found', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneWithDetails('nope', 'tenant-001')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCustomer', () => {
    it('should update allowed fields without manual version bump (optimistic locking handled by TypeORM)', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer());
      activityRepo.find.mockResolvedValue([]);
      activityRepo.create.mockReturnValue({} as any);
      activityRepo.save.mockResolvedValue({} as any);
      customerRepo.save.mockResolvedValue(mockCustomer({ industry: 'plastics' }));

      const result = await service.updateCustomer(
        'cust-001', { industry: 'plastics' }, 'user-001', 'tenant-001',
      );
      expect(customerRepo.save).toHaveBeenCalledWith(expect.objectContaining({ industry: 'plastics', version: 1 }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'customer.updated', 'Customer', 'cust-001', 'user-001', expect.anything(),
      );
    });

    it('surfaces OptimisticLockVersionMismatchError (→409 filter) instead of overwriting a concurrent change', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer());
      activityRepo.find.mockResolvedValue([]);
      activityRepo.create.mockReturnValue({} as any);
      activityRepo.save.mockResolvedValue({} as any);
      // Two overlapping saves: the second client still holds version 1 while
      // the first already persisted version 2 — TypeORM must reject, not overwrite.
      customerRepo.save
        .mockResolvedValueOnce(mockCustomer({ industry: 'plastics' }))
        .mockRejectedValueOnce(new OptimisticLockVersionMismatchError('Customer', 1, 2));

      await service.updateCustomer('cust-001', { industry: 'plastics' }, 'user-001', 'tenant-001');

      await expect(
        service.updateCustomer('cust-001', { industry: 'plastics' }, 'user-001', 'tenant-001'),
      ).rejects.toThrow(OptimisticLockVersionMismatchError);
    });
  });

  describe('addContact', () => {
    it('should add a contact and log activity', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer());
      contactRepo.create.mockReturnValue(mockContact());
      contactRepo.save.mockResolvedValue(mockContact());
      activityRepo.create.mockReturnValue({} as any);
      activityRepo.save.mockResolvedValue({} as any);

      const result = await service.addContact(
        'cust-001',
        { firstName: 'Jane', lastName: 'Doe', email: 'jane@acme.com' },
        'user-001',
        'tenant-001',
      );
      expect(result.firstName).toBe('John');
      expect(contactRepo.save).toHaveBeenCalled();
    });

    it('should throw if customer missing', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addContact('nope', { firstName: 'Jane', lastName: 'Doe' }, 'user-001', 'tenant-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('status operations', () => {
    it('should deactivate an active customer', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer());
      customerRepo.save.mockResolvedValue(mockCustomer({ status: CustomerStatus.INACTIVE }));
      activityRepo.create.mockReturnValue({} as any);
      activityRepo.save.mockResolvedValue({} as any);

      const result = await service.deactivate('cust-001', 'user-001', 'tenant-001');
      expect(result.status).toBe(CustomerStatus.INACTIVE);
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'customer.deactivated', 'Customer', 'cust-001', 'user-001', expect.anything(),
      );
    });

    it('should reject double deactivation', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer({ status: CustomerStatus.INACTIVE }));
      await expect(service.deactivate('cust-001', 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });
});
