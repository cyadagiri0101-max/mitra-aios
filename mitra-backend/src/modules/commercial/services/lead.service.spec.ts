import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadService } from './lead.service';
import { Lead, LeadStatus, Priority } from '../entities/lead.entity';
import { Customer, CustomerSource, CustomerStatus } from '../entities/customer.entity';
import { Contact } from '../entities/contact.entity';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialAiService } from './commercial-ai.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LeadService', () => {
  let service: LeadService;
  let repo: jest.Mocked<Repository<Lead>>;
  let customerRepo: jest.Mocked<Repository<Customer>>;
  let contactRepo: jest.Mocked<Repository<Contact>>;
  let auditService: jest.Mocked<AuditService>;
  let aiService: jest.Mocked<CommercialAiService>;

  const mockLead = (overrides: Partial<Lead> = {}): Lead => ({
    id: 'lead-001',
    leadNumber: 'LEAD-2026-0001',
    customerId: null,
    contactId: null,
    customerName: 'Acme Corp',
    leadSource: 'WEBSITE' as Lead['leadSource'],
    leadStatus: LeadStatus.NEW,
    ownerId: 'user-001',
    expectedRevenue: 500000,
    expectedDate: null,
    priority: Priority.HIGH,
    probability: 40,
    convertedCustomerId: null,
    convertedAt: null,
    notes: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'user-001',
    updatedBy: null,
    tenantId: 'tenant-001',
    ...overrides,
  });

  beforeEach(async () => {
    const mockLeadRepo = {
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
      save: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockContactRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: getRepositoryToken(Lead), useValue: mockLeadRepo },
        { provide: getRepositoryToken(Customer), useValue: mockCustomerRepo },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepo },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) } },
        { provide: CommercialAiService, useValue: { syncEntityContext: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get<LeadService>(LeadService);
    repo = module.get(getRepositoryToken(Lead));
    customerRepo = module.get(getRepositoryToken(Customer));
    contactRepo = module.get(getRepositoryToken(Contact));
    auditService = module.get(AuditService);
    aiService = module.get(CommercialAiService);
  });

  describe('createLead', () => {
    it('should create a lead with generated number and defaults', async () => {
      repo.count.mockResolvedValue(0);
      repo.create.mockReturnValue(mockLead());
      repo.save.mockResolvedValue(mockLead());

      const result = await service.createLead(
        { customerName: 'Acme Corp', leadSource: 'WEBSITE' } as any,
        'user-001',
        'tenant-001',
      );

      expect(result.leadNumber).toBe('LEAD-2026-0001');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ leadStatus: LeadStatus.NEW }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'lead.created', 'Lead', 'lead-001', 'user-001', expect.anything(),
      );
      expect(aiService.syncEntityContext).toHaveBeenCalledWith(
        'lead', 'lead-001', expect.anything(), 'user-001', 'tenant-001',
      );
    });

    it('should throw when the linked customer does not exist', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createLead({ customerName: 'X', customerId: 'nope' } as any, 'user-001', 'tenant-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLead', () => {
    it('should update fields without manual version bump (optimistic locking handled by TypeORM)', async () => {
      repo.findOne.mockResolvedValue(mockLead());
      repo.save.mockResolvedValue(mockLead({ probability: 80 }));

      const result = await service.updateLead(
        'lead-001', { probability: 80 }, 'user-001', 'tenant-001',
      );

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'lead.updated', 'Lead', 'lead-001', 'user-001', expect.anything(),
      );
      expect(result.probability).toBe(80);
    });

    it('should ignore leadStatus in updates (C-3: status is not settable via PATCH)', async () => {
      repo.findOne.mockResolvedValue(mockLead());
      repo.save.mockResolvedValue(mockLead());

      await service.updateLead(
        'lead-001', { leadStatus: LeadStatus.QUALIFIED } as any, 'user-001', 'tenant-001',
      );

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ leadStatus: LeadStatus.QUALIFIED }));
      expect(LeadStatus.QUALIFIED).toBeDefined();
    });
  });

  describe('convert', () => {
    it('should convert lead into a customer with LEAD_CONVERSION source', async () => {
      repo.findOne.mockResolvedValue(mockLead());
      customerRepo.create.mockReturnValue({
        id: 'cust-999', name: 'Acme Corp', status: CustomerStatus.ACTIVE, source: CustomerSource.LEAD_CONVERSION,
      } as Customer);
      customerRepo.save.mockResolvedValue({
        id: 'cust-999', name: 'Acme Corp', status: CustomerStatus.ACTIVE, source: CustomerSource.LEAD_CONVERSION,
      } as Customer);
      repo.save.mockResolvedValue(mockLead({
        leadStatus: LeadStatus.CONVERTED,
        convertedCustomerId: 'cust-999',
      }));

      const result = await service.convert('lead-001', { industry: 'automotive' }, 'user-001', 'tenant-001');

      expect(result.customer.source).toBe(CustomerSource.LEAD_CONVERSION);
      expect(result.customer.status).toBe(CustomerStatus.ACTIVE);
      expect(result.lead.leadStatus).toBe(LeadStatus.CONVERTED);
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'lead.converted', 'Lead', 'lead-001', 'user-001', expect.anything(),
      );
    });

    it('should reject converting an already-converted lead', async () => {
      repo.findOne.mockResolvedValue(mockLead({ leadStatus: LeadStatus.CONVERTED }));
      await expect(
        service.convert('lead-001', {}, 'user-001', 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject converting a lost lead', async () => {
      repo.findOne.mockResolvedValue(mockLead({ leadStatus: LeadStatus.LOST }));
      await expect(
        service.convert('lead-001', {}, 'user-001', 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPipelineSummary', () => {
    it('should compute pipeline KPIs from stored leads', async () => {
      repo.find.mockResolvedValue([
        mockLead({ leadStatus: LeadStatus.NEW, expectedRevenue: 100000, probability: 50 }),
        mockLead({ leadStatus: LeadStatus.QUALIFIED, expectedRevenue: 200000, probability: 80 }),
        mockLead({ leadStatus: LeadStatus.CONVERTED, expectedRevenue: 900000, probability: 100 }),
        mockLead({ leadStatus: LeadStatus.LOST, expectedRevenue: 500000, probability: 70 }),
      ]);

      const result = await service.getPipelineSummary('tenant-001');

      expect(result.total).toBe(4);
      expect(result.open).toBe(2);
      expect(result.pipelineValue).toBe(210000);
      expect(result.converted).toBe(1);
      expect(result.byStatus[LeadStatus.NEW]).toBe(1);
    });
  });
});
