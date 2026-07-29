import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuotationService } from './quotation.service';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotationitem.entity';
import { Enquiry, EnquiryStatus } from '../entities/enquiry.entity';
import { BadRequestException } from '@nestjs/common';

describe('QuotationService', () => {
  let service: QuotationService;
  let repo: jest.Mocked<Repository<Quotation>>;
  let itemRepo: jest.Mocked<Repository<QuotationItem>>;
  let enquiryRepo: jest.Mocked<Repository<Enquiry>>;

  const mockQuotation = (overrides: Partial<Quotation> = {}): Quotation => ({
    id: 'qtn-001',
    quotationNumber: 'QTN-2026-0001',
    enquiryId: 'enq-001',
    revisionNumber: 1,
    quotationDate: new Date(),
    validUntil: new Date('2026-09-27'),
    customerId: 'cust-001',
    customerName: 'Acme Corp',
    subtotal: 150000,
    discountPct: 0,
    discountAmount: 0,
    taxPct: 18,
    taxAmount: 27000,
    totalAmount: 177000,
    currency: 'INR',
    deliveryWeeks: 12,
    paymentTerms: null,
    warrantyMonths: 12,
    status: QuotationStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    termsAndConditions: null,
    projectId: null,
    terms: null,
    notes: null,
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
      findAndCount: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    };
    const mockItemRepo = {
      find: jest.fn(),
    };
    const mockEnquiryRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationService,
        { provide: getRepositoryToken(Quotation), useValue: mockRepo },
        { provide: getRepositoryToken(QuotationItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(Enquiry), useValue: mockEnquiryRepo },
      ],
    }).compile();

    service = module.get<QuotationService>(QuotationService);
    repo = module.get(getRepositoryToken(Quotation));
    itemRepo = module.get(getRepositoryToken(QuotationItem));
    enquiryRepo = module.get(getRepositoryToken(Enquiry));
  });

  describe('sendQuotation', () => {
    it('should transition DRAFT → SENT', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.DRAFT });
      repo.findOne.mockResolvedValue(quotation);
      repo.save.mockResolvedValue({ ...quotation, status: QuotationStatus.SENT });

      const result = await service.sendQuotation('qtn-001', 'user-001', 'tenant-001');
      expect(result.status).toBe(QuotationStatus.SENT);
    });

    it('should throw if not DRAFT', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.SENT });
      repo.findOne.mockResolvedValue(quotation);
      await expect(service.sendQuotation('qtn-001', 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptQuotation', () => {
    it('should transition SENT → ACCEPTED and return project data', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.SENT });
      repo.findOne.mockResolvedValue(quotation);
      repo.save.mockResolvedValue({ ...quotation, status: QuotationStatus.ACCEPTED, approvedAt: new Date() });

      const result = await service.acceptQuotation('qtn-001', { projectName: 'Acme Dashboard Panel' }, 'user-001', 'tenant-001');
      expect(result.quotation.status).toBe(QuotationStatus.ACCEPTED);
      expect(result.projectData.name).toBe('Acme Dashboard Panel');
      expect(result.projectData.projectValue).toBe(177000);
    });
  });

  describe('rejectQuotation', () => {
    it('should transition SENT → REJECTED with reason', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.SENT });
      repo.findOne.mockResolvedValue(quotation);
      repo.save.mockResolvedValue({ ...quotation, status: QuotationStatus.REJECTED, rejectionReason: 'Too expensive' });

      const result = await service.rejectQuotation('qtn-001', { reason: 'Too expensive' }, 'user-001', 'tenant-001');
      expect(result.status).toBe(QuotationStatus.REJECTED);
      expect(result.rejectionReason).toBe('Too expensive');
    });

    it('should throw if not SENT', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.DRAFT });
      repo.findOne.mockResolvedValue(quotation);
      await expect(service.rejectQuotation('qtn-001', { reason: 'No' }, 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createFromRfq', () => {
    it('should create quotation from RFQ with full DTO', async () => {
      repo.create.mockReturnValue(mockQuotation());
      repo.save.mockResolvedValue(mockQuotation());
      repo.count.mockResolvedValue(0);
      enquiryRepo.findOne.mockResolvedValue({ id: 'enq-001', customerName: 'Acme Corp', productName: 'Bottle blow mold' } as any);
      enquiryRepo.update.mockResolvedValue({ affected: 1 } as any);

      const dto = {
        rfqId: 'enq-001',
        customerId: 'cust-001',
        customerName: 'Acme Corp',
        productName: 'Bottle blow mold',
        amount: 177000,
        terms: { payment_terms: '50% advance' },
        validUntil: '2026-09-27',
      };
      const result = await service.createFromRfq(dto as any, 'user-001', 'tenant-001');
      expect(result.quotationNumber).toBeTruthy();
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        customerName: 'Acme Corp',
        customerId: 'cust-001',
      }));
      expect(enquiryRepo.update).toHaveBeenCalledWith({ id: 'enq-001' }, { status: EnquiryStatus.CONVERTED });
    });

    it('should derive customer context from the linked enquiry when the DTO omits it', async () => {
      repo.create.mockReturnValue(mockQuotation());
      repo.save.mockResolvedValue(mockQuotation());
      repo.count.mockResolvedValue(0);
      enquiryRepo.findOne.mockResolvedValue({ id: 'enq-001', customerName: 'Acme Corp', productName: 'Bottle blow mold' } as any);
      enquiryRepo.update.mockResolvedValue({ affected: 1 } as any);

      const dto = {
        rfqId: 'enq-001',
        customerId: 'cust-001',
        amount: 177000,
        terms: { payment_terms: '50% advance' },
        validUntil: '2026-09-27',
      };

      await service.createFromRfq(dto as any, 'user-001', 'tenant-001');

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        customerName: 'Acme Corp',
      }));
    });
  });

  describe('linkProject', () => {
    it('should link project and set PROJECT_CREATED status', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.ACCEPTED });
      repo.findOne.mockResolvedValue(quotation);
      repo.save.mockResolvedValue({ ...quotation, projectId: 'proj-001', status: QuotationStatus.PROJECT_CREATED });

      const result = await service.linkProject('qtn-001', 'proj-001', 'user-001', 'tenant-001');
      expect(result.projectId).toBe('proj-001');
      expect(result.status).toBe(QuotationStatus.PROJECT_CREATED);
    });
  });

  describe('findAllWithItems', () => {
    it('should return paginated results', async () => {
      const data = [mockQuotation()];
      repo.findAndCount.mockResolvedValue([data, 1]);

      const result = await service.findAllWithItems('tenant-001', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('findOneWithItems', () => {
    it('should return quotation with items', async () => {
      const quotation = mockQuotation();
      repo.findOne.mockResolvedValue(quotation);
      itemRepo.find.mockResolvedValue([{ id: 'item-001', lineNumber: 1, description: 'Test item' } as QuotationItem]);

      const result = await service.findOneWithItems('qtn-001', 'tenant-001');
      expect(result).toBeDefined();
      expect((result as any).items).toHaveLength(1);
    });
  });

  describe('acceptQuotation validation', () => {
    it('should throw if not SENT', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.DRAFT });
      repo.findOne.mockResolvedValue(quotation);
      await expect(service.acceptQuotation('qtn-001', { projectName: 'Test' }, 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });

    it('should throw if already ACCEPTED', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.ACCEPTED });
      repo.findOne.mockResolvedValue(quotation);
      await expect(service.acceptQuotation('qtn-001', { projectName: 'Test' }, 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });
});
