import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerService } from './customer.service';
import { Customer, CustomerStatus } from '../entities/customer.entity';
import { Contact } from '../entities/contact.entity';
import { NotFoundException } from '@nestjs/common';

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepo: jest.Mocked<Repository<Customer>>;
  let contactRepo: jest.Mocked<Repository<Contact>>;

  const mockCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    id: 'cust-001',
    name: 'Acme Corp',
    industry: 'automotive',
    status: CustomerStatus.ACTIVE,
    attributes: null,
    contacts: [],
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
    phone: '+1-555-0100',
    role: 'procurement_manager',
    isPrimary: true,
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
    const mockCustomerRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
    };
    const mockContactRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Customer), useValue: mockCustomerRepo },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepo },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    customerRepo = module.get(getRepositoryToken(Customer));
    contactRepo = module.get(getRepositoryToken(Contact));
  });

  describe('findOneWithContacts', () => {
    it('should return customer with contacts', async () => {
      const customer = mockCustomer({ contacts: [mockContact()] });
      customerRepo.findOne.mockResolvedValue(customer);

      const result = await service.findOneWithContacts('cust-001', 'tenant-001');
      expect(result.id).toBe('cust-001');
      expect(result.contacts).toHaveLength(1);
    });

    it('should throw if not found', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneWithContacts('nonexistent', 'tenant-001')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addContact', () => {
    it('should add a contact to customer', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer());
      contactRepo.create.mockReturnValue(mockContact());
      contactRepo.save.mockResolvedValue(mockContact());

      const result = await service.addContact(
        'cust-001',
        { firstName: 'Jane', lastName: 'Doe', email: 'jane@acme.com' },
        'user-001',
        'tenant-001',
      );
      expect(result.firstName).toBe('John');
      expect(result.email).toBe('john@acme.com');
    });
  });
});
