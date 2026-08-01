import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuotationService } from './quotation.service';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotationitem.entity';
import { Enquiry, EnquiryStatus } from '../entities/enquiry.entity';
import { Rfq } from '../entities/rfq.entity';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialAiService } from './commercial-ai.service';
import { QuotationPricingService } from './quotation-pricing.service';
import { QuotationItemService } from './quotation-item.service';
import { QuotationMarginService } from './quotation-margin.service';
import { QuotationApprovalService } from './quotation-approval.service';
import { QuotationRevisionService } from './quotation-revision.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('QuotationService', () => {
  let service: QuotationService;
  let repo: jest.Mocked<Repository<Quotation>>;
  let itemRepo: jest.Mocked<Repository<QuotationItem>>;
  let enquiryRepo: jest.Mocked<Repository<Enquiry>>;
  let rfqRepo: jest.Mocked<Repository<Rfq>>;
  let auditService: jest.Mocked<AuditService>;
  let aiService: jest.Mocked<CommercialAiService>;

  const mockQuotation = (overrides: Partial<Quotation> = {}): Quotation => ({
    id: 'qtn-001',
    quotationNumber: 'QTN-2026-0001',
    enquiryId: 'enq-001',
    rfqId: null,
    revisionNumber: 1,
    quotationDate: new Date(),
    validUntil: new Date('2026-09-27'),
    customerId: 'cust-001',
    customerName: 'Acme Corp',
    subtotal: 150000,
    estimatedCost: 120000,
    sellingPrice: 150000,
    marginAmount: 30000,
    marginPct: 20,
    discountPct: 0,
    discountAmount: 0,
    taxPct: 18,
    taxAmount: 27000,
    totalAmount: 177000,
    currency: 'INR',
    deliveryWeeks: 12,
    paymentTerms: null,
    deliveryTerms: null,
    warrantyMonths: 12,
    status: QuotationStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    termsAndConditions: null,
    projectId: null,
    terms: null,
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
    const mockItemRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockEnquiryRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const mockRfqRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationService,
        QuotationPricingService,
        QuotationItemService,
        QuotationMarginService,
        QuotationApprovalService,
        QuotationRevisionService,
        { provide: getRepositoryToken(Quotation), useValue: mockRepo },
        { provide: getRepositoryToken(QuotationItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(Enquiry), useValue: mockEnquiryRepo },
        { provide: getRepositoryToken(Rfq), useValue: mockRfqRepo },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) } },
        { provide: CommercialAiService, useValue: { syncEntityContext: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get<QuotationService>(QuotationService);
    repo = module.get(getRepositoryToken(Quotation));
    itemRepo = module.get(getRepositoryToken(QuotationItem));
    enquiryRepo = module.get(getRepositoryToken(Enquiry));
    rfqRepo = module.get(getRepositoryToken(Rfq));
    auditService = module.get(AuditService);
    aiService = module.get(CommercialAiService);
  });

  describe('createQuotation', () => {
    it('should price items, compute margins and set DRAFT status', async () => {
      repo.count.mockResolvedValue(0);
      repo.create.mockReturnValue(mockQuotation());
      repo.save.mockResolvedValue(mockQuotation());
      repo.findOne.mockResolvedValue(mockQuotation());
      itemRepo.find.mockResolvedValue([]);
      itemRepo.update.mockResolvedValue({ affected: 1 } as any);
      itemRepo.create.mockReturnValue({} as any);
      itemRepo.save.mockResolvedValue({} as any);

      const dto: any = {
        customerId: 'cust-001',
        customerName: 'Acme Corp',
        items: [
          { description: 'Injection mold', quantity: 1, unitPrice: 150000, estimatedCost: 120000 },
        ],
        taxPct: 18,
        validUntil: '2026-09-27',
      };

      const result = await service.createQuotation(dto, 'user-001', 'tenant-001');

      expect(result.quotationNumber).toBe('QTN-2026-0001');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        subtotal: 150000,
        estimatedCost: 120000,
        marginAmount: 30000,
        marginPct: 20,
        taxAmount: 27000,
        totalAmount: 177000,
        status: QuotationStatus.DRAFT,
      }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'quotation.created', 'Quotation', 'qtn-001', 'user-001', expect.anything(),
      );
      expect(aiService.syncEntityContext).toHaveBeenCalledWith(
        'quotation', 'qtn-001', expect.anything(), 'user-001', 'tenant-001',
      );
    });

    it('should derive customer context from the linked enquiry', async () => {
      repo.count.mockResolvedValue(0);
      repo.create.mockReturnValue(mockQuotation());
      repo.save.mockResolvedValue(mockQuotation());
      repo.findOne.mockResolvedValue(mockQuotation());
      itemRepo.find.mockResolvedValue([]);
      enquiryRepo.findOne.mockResolvedValue({ id: 'enq-001', customerName: 'Acme Corp', productName: 'Bottle mold' } as any);
      enquiryRepo.update.mockResolvedValue({ affected: 1 } as any);

      await service.createQuotation(
        { enquiryId: 'enq-001', customerId: 'cust-001' } as any,
        'user-001',
        'tenant-001',
      );

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ customerName: 'Acme Corp' }));
      expect(enquiryRepo.update).toHaveBeenCalledWith(
        { id: 'enq-001' },
        { status: EnquiryStatus.CONVERTED },
      );
    });

    it('should mark the RFQ-linked enquiry converted via the RFQ enquiryId', async () => {
      repo.count.mockResolvedValue(0);
      repo.create.mockReturnValue(mockQuotation({ rfqId: 'rfq-001', enquiryId: null }));
      repo.save.mockResolvedValue(mockQuotation({ rfqId: 'rfq-001', enquiryId: null }));
      repo.findOne.mockResolvedValue(mockQuotation({ rfqId: 'rfq-001', enquiryId: null }));
      itemRepo.find.mockResolvedValue([]);
      rfqRepo.findOne.mockResolvedValue({ id: 'rfq-001', enquiryId: 'enq-007' } as Rfq);

      await service.createQuotation(
        { rfqId: 'rfq-001', customerId: 'cust-001', customerName: 'Acme Corp' } as any,
        'user-001',
        'tenant-001',
      );

      expect(enquiryRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'enq-007' }),
        { status: EnquiryStatus.CONVERTED },
      );
    });
  });

  describe('sendQuotation', () => {
    it('should transition DRAFT → SENT', async () => {
      repo.findOne.mockResolvedValue(mockQuotation());
      repo.save.mockResolvedValue(mockQuotation({ status: QuotationStatus.SENT }));

      const result = await service.sendQuotation('qtn-001', 'user-001', 'tenant-001');
      expect(result.status).toBe(QuotationStatus.SENT);
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'quotation.sent', 'Quotation', 'qtn-001', 'user-001', expect.anything(),
      );
    });

    it('should throw if not DRAFT', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.SENT }));
      await expect(service.sendQuotation('qtn-001', 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveQuotation', () => {
    it('should approve a SENT quotation and record approver', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.SENT }));
      repo.save.mockResolvedValue(mockQuotation({ status: QuotationStatus.APPROVED, approvedBy: 'user-001' }));

      const result = await service.approveQuotation('qtn-001', { remarks: 'OK' }, 'user-001', 'tenant-001');
      expect(result.status).toBe(QuotationStatus.APPROVED);
      expect(result.approvedBy).toBe('user-001');
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'quotation.approved', 'Quotation', 'qtn-001', 'user-001', expect.anything(),
      );
    });

    it('should approve a DRAFT quotation (internal gate)', async () => {
      repo.findOne.mockResolvedValue(mockQuotation());
      repo.save.mockResolvedValue(mockQuotation({ status: QuotationStatus.APPROVED }));

      const result = await service.approveQuotation('qtn-001', { remarks: 'OK' }, 'user-001', 'tenant-001');
      expect(result.status).toBe(QuotationStatus.APPROVED);
    });

    it('should reject approval of an accepted quotation', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.ACCEPTED }));
      await expect(
        service.approveQuotation('qtn-001', { remarks: 'OK' }, 'user-001', 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviseQuotation', () => {
    it('should bump revision number and set REVISED status', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.SENT }));
      repo.save.mockResolvedValue(mockQuotation({ status: QuotationStatus.REVISED, revisionNumber: 2 }));
      itemRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.reviseQuotation(
        'qtn-001', { reason: 'Customer requested changes' } as any, 'user-001', 'tenant-001',
      );
      expect(result.status).toBe(QuotationStatus.REVISED);
      expect(result.revisionNumber).toBe(2);
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'quotation.revised', 'Quotation', 'qtn-001', 'user-001', expect.anything(),
      );
    });
  });

  describe('acceptQuotation', () => {
    it('should transition SENT → ACCEPTED and return project data', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.SENT }));
      repo.save.mockResolvedValue(mockQuotation({ status: QuotationStatus.ACCEPTED, approvedAt: new Date() }));

      const result = await service.acceptQuotation(
        'qtn-001', { projectName: 'Acme Dashboard Panel' }, 'user-001', 'tenant-001',
      );
      expect(result.quotation.status).toBe(QuotationStatus.ACCEPTED);
      expect(result.projectData.name).toBe('Acme Dashboard Panel');
      expect(result.projectData.customerName).toBe('Acme Corp');
      expect(result.projectData.projectValue).toBe(177000);
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'quotation.accepted', 'Quotation', 'qtn-001', 'user-001', expect.anything(),
      );
    });

    it('should throw if already ACCEPTED', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.ACCEPTED }));
      await expect(
        service.acceptQuotation('qtn-001', { projectName: 'Test' }, 'user-001', 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectQuotation', () => {
    it('should transition SENT → REJECTED with reason', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.SENT }));
      repo.save.mockResolvedValue(mockQuotation({ status: QuotationStatus.REJECTED, rejectionReason: 'Too expensive' }));

      const result = await service.rejectQuotation('qtn-001', { reason: 'Too expensive' }, 'user-001', 'tenant-001');
      expect(result.status).toBe(QuotationStatus.REJECTED);
      expect(result.rejectionReason).toBe('Too expensive');
    });

    it('should throw if not SENT/APPROVED', async () => {
      repo.findOne.mockResolvedValue(mockQuotation());
      await expect(
        service.rejectQuotation('qtn-001', { reason: 'No' }, 'user-001', 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('linkProject', () => {
    it('should link project and set PROJECT_CREATED status', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.ACCEPTED }));
      repo.save.mockResolvedValue(mockQuotation({ projectId: 'proj-001', status: QuotationStatus.PROJECT_CREATED }));

      const result = await service.linkProject('qtn-001', 'proj-001', 'user-001', 'tenant-001');
      expect(result.projectId).toBe('proj-001');
      expect(result.status).toBe(QuotationStatus.PROJECT_CREATED);
    });
  });

  describe('updateQuotation', () => {
    it('should allow edits only on drafts', async () => {
      repo.findOne.mockResolvedValue(mockQuotation());
      repo.save.mockResolvedValue(mockQuotation({ paymentTerms: '50% advance' }));
      itemRepo.find.mockResolvedValue([]);

      await service.updateQuotation('qtn-001', { paymentTerms: '50% advance' } as any, 'user-001', 'tenant-001');
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ version: 1, paymentTerms: '50% advance' }));
    });

    it('should reject edits on sent quotations', async () => {
      repo.findOne.mockResolvedValue(mockQuotation({ status: QuotationStatus.SENT }));
      await expect(
        service.updateQuotation('qtn-001', { paymentTerms: '50%' } as any, 'user-001', 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneWithItems', () => {
    it('should return quotation with items', async () => {
      repo.findOne.mockResolvedValue(mockQuotation());
      itemRepo.find.mockResolvedValue([{ id: 'item-001', lineNumber: 1, description: 'Test item' } as QuotationItem]);

      const result = await service.findOneWithItems('qtn-001', 'tenant-001');
      expect((result as any).items).toHaveLength(1);
    });

    it('should throw when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOneWithItems('nope', 'tenant-001')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMarginSummary', () => {
    it('should aggregate margin KPIs', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          avg_margin_pct: '23.33',
          total_value: '300000',
          total_cost: '230000',
          count: '2',
        }),
      };
      (repo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

      const result = await service.getMarginSummary('tenant-001');
      expect(result.count).toBe(2);
      expect(result.totalValue).toBe(300000);
      expect(result.totalCost).toBe(230000);
      expect(result.totalMargin).toBe(70000);
      expect(result.avgMarginPct).toBeCloseTo(23.33, 1);
    });
  });
});
