import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnquiryService } from './enquiry.service';
import { Enquiry, EnquiryStatus } from '../entities/enquiry.entity';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EnquiryService', () => {
  let service: EnquiryService;
  let repo: jest.Mocked<Repository<Enquiry>>;

  const mockEnquiry = (overrides: Partial<Enquiry> = {}): Enquiry => ({
    id: 'enq-001',
    enquiryNumber: 'RFQ-2026-0001',
    customerId: 'cust-001',
    customerName: 'Test Corp',
    customerContact: null,
    customerEmail: null,
    customerPhone: null,
    productName: 'Test Mold',
    productDescription: null,
    moldType: 'INJECTION',
    cavitation: 1,
    annualVolume: null,
    materialType: null,
    partWeightGrams: null,
    targetPrice: null,
    targetDeliveryWeeks: null,
    enquiryDate: new Date(),
    rfqReference: null,
    status: EnquiryStatus.DRAFT,
    source: 'EMAIL' as any,
    assignedTo: null,
    followUpDate: null,
    remarks: null,
    lostReason: null,
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnquiryService,
        { provide: getRepositoryToken(Enquiry), useValue: mockRepo },
        { provide: CommercialEventPublisherService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<EnquiryService>(EnquiryService);
    repo = module.get(getRepositoryToken(Enquiry));
  });

  describe('submit', () => {
    it('should transition DRAFT → SUBMITTED', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.DRAFT });
      repo.findOne.mockResolvedValue(enquiry);
      repo.save.mockResolvedValue({ ...enquiry, status: EnquiryStatus.SUBMITTED });

      const result = await service.submit('enq-001', 'user-001', 'tenant-001');
      expect(result.status).toBe(EnquiryStatus.SUBMITTED);
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw if not DRAFT', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(enquiry);
      await expect(service.submit('enq-001', 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('review', () => {
    it('should transition SUBMITTED → UNDER_REVIEW', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(enquiry);
      repo.save.mockResolvedValue({ ...enquiry, status: EnquiryStatus.UNDER_REVIEW });

      const result = await service.review('enq-001', 'user-001', 'tenant-001');
      expect(result.status).toBe(EnquiryStatus.UNDER_REVIEW);
    });
  });

  describe('cancel', () => {
    it('should cancel a draft enquiry', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.DRAFT });
      repo.findOne.mockResolvedValue(enquiry);
      repo.save.mockResolvedValue({ ...enquiry, status: EnquiryStatus.CANCELLED });

      const result = await service.cancel('enq-001', 'user-001', 'tenant-001');
      expect(result.status).toBe(EnquiryStatus.CANCELLED);
    });

    it('should throw if converted', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.CONVERTED });
      repo.findOne.mockResolvedValue(enquiry);
      await expect(service.cancel('enq-001', 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markLost', () => {
    it('should mark as lost with reason from UNDER_REVIEW', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.UNDER_REVIEW });
      repo.findOne.mockResolvedValue(enquiry);
      repo.save.mockResolvedValue({ ...enquiry, status: EnquiryStatus.LOST, lostReason: 'Out of budget' });

      const result = await service.markLost('enq-001', 'Out of budget', 'user-001', 'tenant-001');
      expect(result.status).toBe(EnquiryStatus.LOST);
      expect(result.lostReason).toBe('Out of budget');
    });

    it('should mark as lost from SUBMITTED', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(enquiry);
      repo.save.mockResolvedValue({ ...enquiry, status: EnquiryStatus.LOST });

      const result = await service.markLost('enq-001', undefined, 'user-001', 'tenant-001');
      expect(result.status).toBe(EnquiryStatus.LOST);
    });

    it('should throw if DRAFT', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.DRAFT });
      repo.findOne.mockResolvedValue(enquiry);
      await expect(service.markLost('enq-001', 'reason', 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });

    it('should throw if CONVERTED', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.CONVERTED });
      repo.findOne.mockResolvedValue(enquiry);
      await expect(service.markLost('enq-001', 'reason', 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel additional transitions', () => {
    it('should cancel from SUBMITTED', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(enquiry);
      repo.save.mockResolvedValue({ ...enquiry, status: EnquiryStatus.CANCELLED });
      const result = await service.cancel('enq-001', 'user-001', 'tenant-001');
      expect(result.status).toBe(EnquiryStatus.CANCELLED);
    });

    it('should cancel from UNDER_REVIEW', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.UNDER_REVIEW });
      repo.findOne.mockResolvedValue(enquiry);
      repo.save.mockResolvedValue({ ...enquiry, status: EnquiryStatus.CANCELLED });
      const result = await service.cancel('enq-001', 'user-001', 'tenant-001');
      expect(result.status).toBe(EnquiryStatus.CANCELLED);
    });

    it('should throw if cancelling LOST enquiry', async () => {
      const enquiry = mockEnquiry({ status: EnquiryStatus.LOST });
      repo.findOne.mockResolvedValue(enquiry);
      await expect(service.cancel('enq-001', 'user-001', 'tenant-001')).rejects.toThrow(BadRequestException);
    });
  });
});
