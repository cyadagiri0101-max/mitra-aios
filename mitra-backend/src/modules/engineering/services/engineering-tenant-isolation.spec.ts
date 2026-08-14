/**
 * Engineering Services — Tenant Isolation Behavioral Specs
 *
 * Verifies fail-closed tenant scoping, tenantless 403 rejection,
 * cross-tenant 404 isolation, and tenant persistence for Engineering Services:
 * - EngineeringReviewService
 * - EngineeringProcessPlanningService
 * - EngineeringUomConversionService
 * - EngineeringDocumentService
 * - EngineeringMaterialService
 * - EngineeringComponentService
 * - EngineeringAiHooksService
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EngineeringReviewService } from './engineering-review.service';
import { EngineeringProcessPlanningService } from './engineering-process-planning.service';
import { EngineeringUomConversionService } from './engineering-uom-conversion.service';
import { EngineeringDocumentService } from './engineering-document.service';
import { EngineeringMaterialService } from './engineering-material.service';
import { EngineeringComponentService } from './engineering-component.service';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';

import { EngineeringReviewRequest } from '../entities/engineering-review-request.entity';
import { EngineeringReviewComment } from '../entities/engineering-review-comment.entity';
import { EngineeringReviewAssignment } from '../entities/engineering-review-assignment.entity';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { EngineeringOperation } from '../entities/engineering-operation.entity';
import { EngineeringWorkCenter } from '../entities/engineering-work-center.entity';
import { EngineeringRoutingRevision } from '../entities/engineering-routing-revision.entity';
import { EngineeringUomConversion } from '../entities/engineering-uom-conversion.entity';
import { EngineeringDocument } from '../entities/engineering-document.entity';
import { EngineeringDocumentVersion } from '../entities/engineering-document-version.entity';
import { EngineeringMaterial } from '../entities/engineering-material.entity';
import { EngineeringComponent } from '../entities/engineering-component.entity';
import { EngineeringComponentAlternate } from '../entities/engineering-component-alternate.entity';
import { EngineeringAiHook } from '../entities/engineering-ai-hook.entity';

import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../platform/services/notification.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { WorkflowService } from '../../workflow/services/workflow.service';

const makeRepo = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((d: any) => ({ ...d, id: 'mock-id' })),
  save: jest.fn((e: any) => Promise.resolve({ id: 'saved-id', ...e })),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
  }),
});

describe('Engineering Services — Tenant Isolation', () => {
  let reviewService: EngineeringReviewService;
  let processService: EngineeringProcessPlanningService;
  let uomService: EngineeringUomConversionService;
  let docService: EngineeringDocumentService;
  let materialService: EngineeringMaterialService;
  let componentService: EngineeringComponentService;
  let aiHooksService: EngineeringAiHooksService;

  let reviewRepo: ReturnType<typeof makeRepo>;
  let routingRepo: ReturnType<typeof makeRepo>;
  let uomRepo: ReturnType<typeof makeRepo>;
  let docRepo: ReturnType<typeof makeRepo>;
  let materialRepo: ReturnType<typeof makeRepo>;
  let componentRepo: ReturnType<typeof makeRepo>;
  let aiHookRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    reviewRepo = makeRepo();
    routingRepo = makeRepo();
    uomRepo = makeRepo();
    docRepo = makeRepo();
    materialRepo = makeRepo();
    componentRepo = makeRepo();
    aiHookRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringReviewService,
        EngineeringProcessPlanningService,
        EngineeringUomConversionService,
        EngineeringDocumentService,
        EngineeringMaterialService,
        EngineeringComponentService,
        EngineeringAiHooksService,

        { provide: getRepositoryToken(EngineeringReviewRequest), useValue: reviewRepo },
        { provide: getRepositoryToken(EngineeringReviewComment), useValue: makeRepo() },
        { provide: getRepositoryToken(EngineeringReviewAssignment), useValue: makeRepo() },

        { provide: getRepositoryToken(EngineeringRouting), useValue: routingRepo },
        { provide: getRepositoryToken(EngineeringOperation), useValue: makeRepo() },
        { provide: getRepositoryToken(EngineeringWorkCenter), useValue: makeRepo() },
        { provide: getRepositoryToken(EngineeringRoutingRevision), useValue: makeRepo() },

        { provide: getRepositoryToken(EngineeringUomConversion), useValue: uomRepo },

        { provide: getRepositoryToken(EngineeringDocument), useValue: docRepo },
        { provide: getRepositoryToken(EngineeringDocumentVersion), useValue: makeRepo() },

        { provide: getRepositoryToken(EngineeringMaterial), useValue: materialRepo },

        { provide: getRepositoryToken(EngineeringComponent), useValue: componentRepo },
        { provide: getRepositoryToken(EngineeringComponentAlternate), useValue: makeRepo() },

        { provide: getRepositoryToken(EngineeringAiHook), useValue: aiHookRepo },

        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb({ getRepository: () => makeRepo(), save: jest.fn() })) } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) } },
        { provide: NotificationService, useValue: { enqueue: jest.fn() } },
        { provide: EngineeringEventBus, useValue: { publish: jest.fn() } },
        { provide: OutboxService, useValue: { append: jest.fn() } },
        { provide: WorkflowService, useValue: { createInstance: jest.fn().mockResolvedValue({ id: 'wf-1' }) } },
      ],
    }).compile();

    reviewService = module.get<EngineeringReviewService>(EngineeringReviewService);
    processService = module.get<EngineeringProcessPlanningService>(EngineeringProcessPlanningService);
    uomService = module.get<EngineeringUomConversionService>(EngineeringUomConversionService);
    docService = module.get<EngineeringDocumentService>(EngineeringDocumentService);
    materialService = module.get<EngineeringMaterialService>(EngineeringMaterialService);
    componentService = module.get<EngineeringComponentService>(EngineeringComponentService);
    aiHooksService = module.get<EngineeringAiHooksService>(EngineeringAiHooksService);
  });

  describe('EngineeringReviewService', () => {
    it('rejects tenantless requests with 403 ForbiddenException', async () => {
      await expect(reviewService.findAllAdvanced(undefined)).rejects.toThrow(ForbiddenException);
      await expect(reviewService.findOne('r-1', null)).rejects.toThrow(ForbiddenException);
      await expect(reviewService.create({ projectId: 'p-1', entityType: 'BOM', entityId: 'b-1' }, 'u-1', '')).rejects.toThrow(ForbiddenException);
    });

    it('scopes findOne to caller tenant and throws 404 when cross-tenant access occurs', async () => {
      reviewRepo.findOne.mockResolvedValue(null);
      await expect(reviewService.findOne('r-tenant-b', 'tenant-a')).rejects.toThrow(NotFoundException);
      expect(reviewRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'r-tenant-b', tenantId: 'tenant-a' }),
      });
    });

    it('persists tenantId on create', async () => {
      const result = await reviewService.create(
        { projectId: 'p-1', entityType: 'BOM', entityId: 'b-1', title: 'Review A' },
        'u-1',
        'tenant-a',
      );
      expect(result.tenantId).toBe('tenant-a');
    });
  });

  describe('EngineeringProcessPlanningService', () => {
    it('rejects tenantless findOne and recomputeTotals', async () => {
      await expect(processService.findOne('rtg-1', '')).rejects.toThrow(ForbiddenException);
      await expect(processService.recomputeTotals('rtg-1', null)).rejects.toThrow(ForbiddenException);
    });

    it('persists tenantId on routing create', async () => {
      const routing = await processService.create({ projectId: 'p-1', name: 'Routing 1' }, 'u-1', 'tenant-a');
      expect(routing.tenantId).toBe('tenant-a');
    });
  });

  describe('EngineeringUomConversionService', () => {
    it('rejects tenantless findAll and findOne', async () => {
      await expect(uomService.findAll(null)).rejects.toThrow(ForbiddenException);
      await expect(uomService.findOne('u-1', '')).rejects.toThrow(ForbiddenException);
    });

    it('falls back to global seed (tenantId IS NULL) when tenant-specific conversion is missing', async () => {
      uomRepo.findOne
        .mockResolvedValueOnce(null) // Tenant specific check
        .mockResolvedValueOnce({ id: 'global-1', fromUom: 'KG', toUom: 'G', conversionFactor: 1000 }); // Global seed

      const converted = await uomService.convert(2, 'KG', 'G', 'tenant-a');
      expect(converted).toBe(2000);
    });
  });

  describe('EngineeringDocumentService, MaterialService, ComponentService', () => {
    it('rejects tenantless document operations', async () => {
      await expect(docService.findAllAdvanced(null)).rejects.toThrow(ForbiddenException);
      await expect(materialService.findAll('')).rejects.toThrow(ForbiddenException);
      await expect(componentService.findAll(undefined)).rejects.toThrow(ForbiddenException);
    });

    it('scopes material findByIds to caller tenant', async () => {
      await materialService.findByIds(['m-1', 'm-2'], 'tenant-a');
      expect(materialRepo.find).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      });
    });
  });
});
