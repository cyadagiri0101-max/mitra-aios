import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RfqService, WorkflowActorContext } from './rfq.service';
import { Rfq, RfqStatus, RfqApprovalStatus, RfqWorkflowState, RfqPriority } from '../entities/rfq.entity';
import { RfqProduct } from '../entities/rfq-product.entity';
import { RfqRevision } from '../entities/rfq-revision.entity';
import { Customer } from '../entities/customer.entity';
import { Quotation } from '../entities/quotation.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialAiService } from './commercial-ai.service';
import { NotificationService } from '../../platform/services/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RfqService', () => {
  let service: RfqService;
  let repo: jest.Mocked<Repository<Rfq>>;
  let productRepo: jest.Mocked<Repository<RfqProduct>>;
  let revisionRepo: jest.Mocked<Repository<RfqRevision>>;
  let customerRepo: jest.Mocked<Repository<Customer>>;
  let quotationRepo: jest.Mocked<Repository<Quotation>>;
  let workflowService: jest.Mocked<WorkflowService>;
  let auditService: jest.Mocked<AuditService>;
  let aiService: jest.Mocked<CommercialAiService>;
  let notificationService: jest.Mocked<NotificationService>;
  let mockEm: any;

  const actor: WorkflowActorContext = {
    userId: 'user-001',
    userRole: 'SALES',
    userPermissions: ['rfq:create', 'rfq:update', 'rfq:transition'],
    tenantId: 'tenant-001',
  };

  const mockRfq = (overrides: Partial<Rfq> = {}): Rfq => ({
    id: 'rfq-001',
    rfqNumber: 'RFQ-2026-0001',
    enquiryId: null,
    customerId: 'cust-001',
    contactId: null,
    customerName: 'Acme Corp',
    moldType: 'INJECTION' as Rfq['moldType'],
    targetQuantity: 100000,
    annualVolume: 500000,
    material: 'ABS',
    machineDetails: null,
    dueDate: null,
    priority: RfqPriority.HIGH,
    technicalNotes: null,
    attachments: null,
    revisionNumber: 1,
    approvalStatus: RfqApprovalStatus.PENDING,
    workflowState: RfqWorkflowState.DRAFT,
    status: RfqStatus.OPEN,
    version: 1,
    products: [],
    revisions: [],
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
    const mockProductRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockRevisionRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockCustomerRepo = {
      findOne: jest.fn(),
    };
    const mockQuotationRepo = {
      find: jest.fn(),
    };
    mockEm = {
      getRepository: jest.fn((entity: any) => {
        if (entity === Rfq) return mockRepo;
        if (entity === RfqProduct) return mockProductRepo;
        if (entity === RfqRevision) return mockRevisionRepo;
        return undefined;
      }),
    };
    const mockDataSource = {
      transaction: jest.fn((cb: any) => cb(mockEm)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfqService,
        { provide: getRepositoryToken(Rfq), useValue: mockRepo },
        { provide: getRepositoryToken(RfqProduct), useValue: mockProductRepo },
        { provide: getRepositoryToken(RfqRevision), useValue: mockRevisionRepo },
        { provide: getRepositoryToken(Customer), useValue: mockCustomerRepo },
        { provide: getRepositoryToken(Quotation), useValue: mockQuotationRepo },
        {
          provide: WorkflowService,
          useValue: {
            createInstance: jest.fn().mockResolvedValue({}),
            findInstanceByEntity: jest.fn(),
            executeTransition: jest.fn(),
            findTransitionsForState: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) } },
        { provide: CommercialAiService, useValue: { syncEntityContext: jest.fn().mockResolvedValue({}) } },
        { provide: NotificationService, useValue: { enqueue: jest.fn().mockResolvedValue({}) } },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<RfqService>(RfqService);
    repo = module.get(getRepositoryToken(Rfq));
    productRepo = module.get(getRepositoryToken(RfqProduct));
    revisionRepo = module.get(getRepositoryToken(RfqRevision));
    customerRepo = module.get(getRepositoryToken(Customer));
    quotationRepo = module.get(getRepositoryToken(Quotation));
    workflowService = module.get(WorkflowService);
    notificationService = module.get(NotificationService);
    auditService = module.get(AuditService);
    aiService = module.get(CommercialAiService);
  });

  describe('createRfq', () => {
    it('should create RFQ in DRAFT and register a workflow instance', async () => {
      customerRepo.findOne.mockResolvedValue({ id: 'cust-001', name: 'Acme Corp' } as Customer);
      repo.count.mockResolvedValue(0);
      repo.create.mockReturnValue(mockRfq());
      repo.save.mockResolvedValue(mockRfq());
      repo.findOne.mockResolvedValue(mockRfq());
      productRepo.find.mockResolvedValue([]);
      revisionRepo.find.mockResolvedValue([]);
      quotationRepo.find.mockResolvedValue([]);
      workflowService.findInstanceByEntity.mockResolvedValue({
        currentState: { stateCode: RfqWorkflowState.DRAFT },
        history: [],
      } as any);

      const result = await service.createRfq({
        customerId: 'cust-001',
        customerName: 'Acme Corp',
        moldType: 'INJECTION',
        material: 'ABS',
        priority: RfqPriority.HIGH,
      } as any, actor);

      expect(result.rfqNumber).toBe('RFQ-2026-0001');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        workflowState: RfqWorkflowState.DRAFT,
        approvalStatus: RfqApprovalStatus.PENDING,
        status: RfqStatus.OPEN,
        revisionNumber: 1,
      }));
      expect(workflowService.createInstance).toHaveBeenCalledWith(
        'rfq', 'rfq', 'rfq-001', expect.objectContaining({ userId: 'user-001' }),
      );
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'rfq.created', 'Rfq', 'rfq-001', 'user-001', expect.anything(),
      );
    });

    it('should throw if the linked customer does not exist', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createRfq({ customerId: 'nope', customerName: 'X' } as any, actor),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneWithDetails', () => {
    it('should return RFQ with products, revisions, workflow and quotations', async () => {
      repo.findOne.mockResolvedValue(mockRfq());
      productRepo.find.mockResolvedValue([{ id: 'prod-1', productName: 'Mold' } as RfqProduct]);
      revisionRepo.find.mockResolvedValue([{ id: 'rev-1', revisionNumber: 1 } as RfqRevision]);
      quotationRepo.find.mockResolvedValue([{ id: 'qtn-1' } as Quotation]);
      workflowService.findInstanceByEntity.mockResolvedValue({
        currentState: { stateCode: RfqWorkflowState.APPROVED },
        history: [{ toState: 'APPROVED' }],
      } as any);

      const result = await service.findOneWithDetails('rfq-001', 'tenant-001') as any;
      expect(result.products).toHaveLength(1);
      expect(result.revisions).toHaveLength(1);
      expect(result.quotations).toHaveLength(1);
      expect(result.workflow.state).toBe(RfqWorkflowState.APPROVED);
    });
  });

  describe('updateRfq', () => {
    it('should capture a revision when material fields change', async () => {
      repo.findOne.mockResolvedValue(mockRfq());
      repo.save.mockResolvedValue(mockRfq({ material: 'PC/ABS', version: 1 }));
      revisionRepo.create.mockReturnValue({ id: 'rev-2' } as any);
      revisionRepo.save.mockResolvedValue({ id: 'rev-2' } as any);
      productRepo.find.mockResolvedValue([]);
      revisionRepo.find.mockResolvedValue([]);
      quotationRepo.find.mockResolvedValue([]);
      workflowService.findInstanceByEntity.mockResolvedValue({
        currentState: { stateCode: RfqWorkflowState.SUBMITTED },
        history: [],
      } as any);

      const result = await service.updateRfq(
        'rfq-001', { material: 'PC/ABS' } as any, actor,
      ) as any;

      expect(revisionRepo.save).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }));
      expect(result.material).toBe('PC/ABS');
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'rfq.updated', 'Rfq', 'rfq-001', 'user-001', expect.anything(),
      );
    });

    it('should reject updates on cancelled RFQs', async () => {
      repo.findOne.mockResolvedValue(mockRfq({ workflowState: RfqWorkflowState.CANCELLED }));
      await expect(
        service.updateRfq('rfq-001', { material: 'PC' } as any, actor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('executeTransition', () => {
    it('should apply the configurable transition and map state side-effects', async () => {
      repo.findOne.mockResolvedValue(mockRfq());
      workflowService.findInstanceByEntity.mockResolvedValue({
        id: 'wf-inst-1',
        currentState: { stateCode: RfqWorkflowState.COMMERCIAL_REVIEW },
      } as any);
      workflowService.executeTransition.mockResolvedValue({
        currentState: { stateCode: RfqWorkflowState.APPROVED },
      } as any);
      repo.save.mockResolvedValue(mockRfq({
        workflowState: RfqWorkflowState.APPROVED,
        approvalStatus: RfqApprovalStatus.APPROVED,
        version: 1,
      }));
      productRepo.find.mockResolvedValue([]);
      revisionRepo.find.mockResolvedValue([]);
      quotationRepo.find.mockResolvedValue([]);

      const result = await service.executeTransition(
        'rfq-001', { transitionId: 'tr-1', remarks: 'Approved by mgmt' }, actor,
      ) as any;

      expect(workflowService.executeTransition).toHaveBeenCalledWith(
        'wf-inst-1', 'tr-1', expect.objectContaining({
          remarks: 'Approved by mgmt',
          userId: 'user-001',
          tenantId: 'tenant-001',
          userRole: ['SALES'],
          userPermissions: ['rfq:create', 'rfq:update', 'rfq:transition'],
        }),
        mockEm,
      );
      expect(notificationService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining('APPROVED') }),
        mockEm,
      );
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
        workflowState: RfqWorkflowState.APPROVED,
        approvalStatus: RfqApprovalStatus.APPROVED,
      }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'rfq.transition', 'Rfq', 'rfq-001', 'user-001', expect.objectContaining({
          from: RfqWorkflowState.COMMERCIAL_REVIEW,
          to: RfqWorkflowState.APPROVED,
        }),
        mockEm,
      );
      expect(result.workflowState).toBe(RfqWorkflowState.APPROVED);
    });

    it('should close the RFQ when rejected', async () => {
      repo.findOne.mockResolvedValue(mockRfq());
      workflowService.findInstanceByEntity.mockResolvedValue({
        id: 'wf-inst-1',
        currentState: { stateCode: RfqWorkflowState.COMMERCIAL_REVIEW },
      } as any);
      workflowService.executeTransition.mockResolvedValue({
        currentState: { stateCode: RfqWorkflowState.REJECTED },
      } as any);
      repo.save.mockResolvedValue(mockRfq({
        workflowState: RfqWorkflowState.REJECTED,
        approvalStatus: RfqApprovalStatus.REJECTED,
        status: RfqStatus.CLOSED,
      }));
      productRepo.find.mockResolvedValue([]);
      revisionRepo.find.mockResolvedValue([]);
      quotationRepo.find.mockResolvedValue([]);

      await service.executeTransition('rfq-001', { transitionId: 'tr-2' }, actor);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
        workflowState: RfqWorkflowState.REJECTED,
        status: RfqStatus.CLOSED,
        approvalStatus: RfqApprovalStatus.REJECTED,
      }));
    });

    it('should throw when no workflow instance exists', async () => {
      repo.findOne.mockResolvedValue(mockRfq());
      workflowService.findInstanceByEntity.mockResolvedValue(null);
      await expect(
        service.executeTransition('rfq-001', { transitionId: 'tr-1' }, actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should roll back the whole transition when the audit write fails inside the transaction', async () => {
      repo.findOne.mockResolvedValue(mockRfq());
      workflowService.findInstanceByEntity.mockResolvedValue({
        id: 'wf-inst-1',
        currentState: { stateCode: RfqWorkflowState.COMMERCIAL_REVIEW },
      } as any);
      workflowService.executeTransition.mockResolvedValue({
        currentState: { stateCode: RfqWorkflowState.APPROVED },
      } as any);
      repo.save.mockResolvedValue(mockRfq({ workflowState: RfqWorkflowState.APPROVED }));
      (auditService.logBusinessEvent as jest.Mock).mockRejectedValueOnce(new Error('audit db down'));

      await expect(
        service.executeTransition('rfq-001', { transitionId: 'tr-1' }, actor),
      ).rejects.toThrow('audit db down');

      // Nothing after the failed audit write may execute: no notification, no AI sync
      expect(notificationService.enqueue).not.toHaveBeenCalled();
      expect(aiService.syncEntityContext).not.toHaveBeenCalled();
    });

    it('should roll back the whole transition when notification enqueue fails inside the transaction', async () => {
      repo.findOne.mockResolvedValue(mockRfq());
      workflowService.findInstanceByEntity.mockResolvedValue({
        id: 'wf-inst-1',
        currentState: { stateCode: RfqWorkflowState.COMMERCIAL_REVIEW },
      } as any);
      workflowService.executeTransition.mockResolvedValue({
        currentState: { stateCode: RfqWorkflowState.APPROVED },
      } as any);
      repo.save.mockResolvedValue(mockRfq({ workflowState: RfqWorkflowState.APPROVED }));
      (notificationService.enqueue as jest.Mock).mockRejectedValueOnce(new Error('queue down'));

      await expect(
        service.executeTransition('rfq-001', { transitionId: 'tr-1' }, actor),
      ).rejects.toThrow('queue down');

      // AI sync is post-commit only and must not run for a rolled-back transition
      expect(aiService.syncEntityContext).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableTransitions', () => {
    it('should delegate to the workflow service for the rfq workflow type', async () => {
      workflowService.findInstanceByEntity.mockResolvedValue({
        currentStateId: 'state-1',
      } as any);
      workflowService.findTransitionsForState.mockResolvedValue([
        { id: 'tr-1', name: 'Submit RFQ' },
      ] as any);

      const result = await service.getAvailableTransitions('rfq-001', actor);
      expect(workflowService.findTransitionsForState).toHaveBeenCalledWith(
        'state-1', 'tenant-001', 'rfq',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('createRevision', () => {
    it('should create a manual revision and bump the RFQ revision number', async () => {
      repo.findOne.mockResolvedValue(mockRfq());
      revisionRepo.create.mockReturnValue({ id: 'rev-3', revisionNumber: 2 } as any);
      revisionRepo.save.mockResolvedValue({ id: 'rev-3', revisionNumber: 2 } as any);
      repo.save.mockResolvedValue(mockRfq({ revisionNumber: 2 }));

      const result = await service.createRevision(
        'rfq-001', { changeSummary: 'Revised target price' }, 'user-001', 'tenant-001',
      );
      expect(result.revisionNumber).toBe(2);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ revisionNumber: 2 }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'rfq.revised', 'Rfq', 'rfq-001', 'user-001', expect.anything(),
      );
    });
  });
});
