import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EngineeringChangeService } from '../../ecr-eco/services/engineering-change.service';
import { EngineeringChangeRequest, ECRStatus } from '../../ecr-eco/entities/engineeringchangerequest.entity';
import { EngineeringChangeOrder } from '../../ecr-eco/entities/engineeringchangeorder.entity';
import { EngineeringChangeNotice, ECNStatus } from '../../ecr-eco/entities/engineering-change-notice.entity';
import { EngineeringChangeImpact } from '../../ecr-eco/entities/engineering-change-impact.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';

describe('EngineeringChangeService', () => {
  let service: EngineeringChangeService;
  let ecrRepo: any;
  let ecoRepo: any;
  let ecnRepo: any;
  let impactRepo: any;
  let dataSource: any;

  const ecr = {
    id: 'ecr-1', ecrNumber: 'ECR-2026-0001', title: 'Wall thickness change',
    projectId: 'p-1', status: ECRStatus.DRAFT, changeType: 'DESIGN', priority: 'MEDIUM',
    requestedBy: 'u-1', tenantId: 't-1', createdAt: new Date(), deletedAt: null,
  };

  const actor = { userId: 'u-1', userRole: ['DESIGN'], userPermissions: ['engineering.changes.write'], tenantId: 't-1' };

  beforeEach(async () => {
    ecrRepo = {
      findOne: jest.fn().mockResolvedValue({ ...ecr }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((e: any) => Promise.resolve({ ...e, id: e.id ?? 'ecr-9' })),
      create: jest.fn((e: any) => ({ ...e })),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[ecr], 1]),
      })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    ecoRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((e: any) => Promise.resolve({ ...e, id: e.id ?? 'eco-9' })),
      create: jest.fn((e: any) => ({ ...e })),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    ecnRepo = {
      findOne: jest.fn(),
      save: jest.fn((e: any) => Promise.resolve({ ...e, id: e.id ?? 'ecn-9' })),
      create: jest.fn((e: any) => ({ ...e })),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };
    impactRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((i: any) => Promise.resolve({ ...i, id: i.id ?? 'imp-9' })),
      create: jest.fn((i: any) => ({ ...i })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    dataSource = { transaction: jest.fn((cb: any) => cb({ getRepository: jest.fn(() => ecrRepo) })) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringChangeService,
        { provide: getRepositoryToken(EngineeringChangeRequest), useValue: ecrRepo },
        { provide: getRepositoryToken(EngineeringChangeOrder), useValue: ecoRepo },
        { provide: getRepositoryToken(EngineeringChangeNotice), useValue: ecnRepo },
        { provide: getRepositoryToken(EngineeringChangeImpact), useValue: impactRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: WorkflowService, useValue: { createInstance: jest.fn(), executeTransition: jest.fn(), findInstanceByEntity: jest.fn(), findTransitionsForState: jest.fn().mockResolvedValue([]), getInstanceHistory: jest.fn().mockResolvedValue([]) } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
        { provide: EngineeringEventBus, useValue: { publish: jest.fn() } },
        { provide: EngineeringAiHooksService, useValue: { dispatchEvent: jest.fn().mockResolvedValue({ dispatched: 0 }) } },
      ],
    }).compile();

    service = module.get(EngineeringChangeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an ECR with generated number and workflow instance', async () => {
    const result = await service.createECR({ projectId: 'p-1', title: 'Change' }, actor);
    expect(result.ecrNumber).toMatch(/^ECR-\d{4}-\d{4}$/);
    expect(result.status).toBe(ECRStatus.DRAFT);
  });

  it('rejects ECR creation without projectId (no orphans)', async () => {
    await expect(service.createECR({ title: 'Change' }, actor)).rejects.toThrow(BadRequestException);
  });

  it('adds impact entries to an ECR', async () => {
    const result = await service.addImpact('ecr-1', { impactType: 'DRAWING', entityId: 'd-1', severity: 'HIGH' }, actor);
    expect(result.ecrId).toBe('ecr-1');
    expect(result.entityId).toBe('d-1');
  });

  it('creates an ECO from an ECR and issues an ECN', async () => {
    const eco = await service.createECO({ ecrId: 'ecr-1', projectId: 'p-1' }, actor);
    expect(eco.ecoNumber).toMatch(/^ECO-\d{4}-\d{4}$/);
    expect(eco.ecrId).toBe('ecr-1');

    ecoRepo.findOne.mockResolvedValue({ ...eco, id: 'eco-9' });
    const ecn = await service.issueECN('eco-9', { title: 'Notify shop floor' }, actor);
    expect(ecn.ecnNumber).toMatch(/^ECN-\d{4}-\d{4}$/);
    expect(ecn.status).toBe(ECNStatus.ISSUED);
  });

  it('throws NotFound for unknown ECR', async () => {
    ecrRepo.findOne.mockResolvedValue(null);
    await expect(service.findECR('missing', 't-1')).rejects.toThrow(NotFoundException);
  });

  it('rejects updating a closed ECR', async () => {
    ecrRepo.findOne.mockResolvedValue({ ...ecr, status: ECRStatus.CLOSED });
    await expect(service.updateECR('ecr-1', { title: 'x' }, actor)).rejects.toThrow(BadRequestException);
  });
});
