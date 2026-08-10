import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ProjectFactoryService } from './project-factory.service';
import { Project } from '../entities/project.entity';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

const emRepo = (repo: any) => ({
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
});

describe('ProjectFactoryService', () => {
  let service: ProjectFactoryService;
  let dataSource: any;
  let projectRepo: any;
  let templateRepo: any;
  let em: any;
  let eventBus: DomainEventBus;
  let auditService: any;
  let workflowService: any;

  const snapshot = {
    quotationId: 'q-1',
    quotationNumber: 'QTN-2026-001',
    customerId: 'c-1',
    customerName: 'ACME Corp',
    productName: 'Bottle Mold',
    projectName: 'ACME Bottle Mold Project',
    projectValue: 100000,
    targetDeliveryDate: new Date('2026-12-31'),
    rfqId: null,
    currency: 'INR',
  };

  beforeEach(async () => {
    projectRepo = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn((p) => Promise.resolve({ ...p, id: 'proj-1' })),
      create: jest.fn((p) => ({ ...p })),
    };
    templateRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    em = {
      getRepository: jest.fn((entity: any) => {
        if (entity === MilestoneTemplate) return templateRepo;
        if (entity === Project) return projectRepo;
        return emRepo(undefined);
      }),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(em)),
    };
    workflowService = {
      createInstance: jest.fn().mockResolvedValue({
        id: 'wf-1',
        currentState: { stateCode: 'DRAFT' },
      }),
    };
    auditService = {
      logBusinessEvent: jest.fn().mockResolvedValue({}),
    };
    eventBus = new DomainEventBus();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectFactoryService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(MilestoneTemplate), useValue: templateRepo },
        { provide: WorkflowService, useValue: workflowService },
        { provide: AuditService, useValue: auditService },
        { provide: DomainEventBus, useValue: eventBus },
      ],
    }).compile();

    service = module.get(ProjectFactoryService);
    jest.spyOn(eventBus, 'publish').mockImplementation(() => undefined);
  });

  it('rejects project names shorter than 3 chars', async () => {
    await expect(
      service.createFromQuotation({ ...snapshot, projectName: 'AB' }, 'u-1', 't-1'),
    ).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects blank customer or product names before creating anything', async () => {
    await expect(
      service.createFromQuotation({ ...snapshot, customerName: '   ', productName: '   ' }, 'u-1', 't-1'),
    ).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates project with generated PRJ number inside a single transaction', async () => {
    projectRepo.save.mockImplementation((p: any) => Promise.resolve({ ...p, id: 'proj-1' }));
    projectRepo.count.mockResolvedValue(0);

    const result = await service.createFromQuotation(snapshot, 'u-1', 't-1');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(projectRepo.save).toHaveBeenCalled();
    expect(result.project.projectNumber).toMatch(/^PRJ-\d{4}-0001$/);
    expect(result.project.quotationNumber).toBe('QTN-2026-001');
    expect(result.project.status).toBe('DRAFT');
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
      'project.created.from_quotation',
      'Project',
      'proj-1',
      'u-1',
      expect.objectContaining({ quotationNumber: 'QTN-2026-001' }),
      em,
    );
  });

  it('creates milestones from the DEFAULT_MOLD template with offset dates', async () => {
    const template = {
      id: 'tpl-1',
      code: 'DEFAULT_MOLD',
      items: [
        { id: 'i-1', milestoneName: 'Kickoff', milestoneStage: 'KICKOFF', sequenceNumber: 1, plannedDaysOffset: 0, isCriticalPath: true, requiresApproval: false, dependsOnSequence: null },
        { id: 'i-2', milestoneName: 'Design Complete', milestoneStage: 'DESIGN', sequenceNumber: 2, plannedDaysOffset: 14, isCriticalPath: true, requiresApproval: false, dependsOnSequence: 1 },
      ],
    };
    templateRepo.findOne.mockResolvedValue(template);
    const milestoneRepo = emRepo(undefined);
    milestoneRepo.create.mockImplementation((m: any) => ({ ...m }));
    milestoneRepo.save.mockImplementation((arr: any) => {
      const savedArr = Array.isArray(arr) ? arr : [arr];
      const withIds = savedArr.map((m: any, i: number) => ({ ...m, id: m.id ?? `ms-${i}` }));
      return Promise.resolve(Array.isArray(arr) ? withIds : withIds[0]);
    });
    em.getRepository.mockImplementation((entity: any) => {
      if (entity === MilestoneTemplate) return templateRepo;
      if (entity === Project) return projectRepo;
      if (entity.name === 'ProjectMilestone') return milestoneRepo;
      return emRepo(undefined);
    });

    const result = await service.createFromQuotation(snapshot, 'u-1', 't-1');

    expect(result.milestones).toHaveLength(2);
    const kickoff = result.milestones.find((m) => m.milestoneName === 'Kickoff');
    expect(kickoff?.templateItemId).toBe('i-1');
    const design = result.milestones.find((m) => m.milestoneName === 'Design Complete');
    expect(design?.dependsOnMilestoneId).toBeDefined();
  });

  it('skips milestone generation when no template exists (with warning, still creates project)', async () => {
    templateRepo.findOne.mockResolvedValue(null);
    const result = await service.createFromQuotation(snapshot, 'u-1', 't-1');
    expect(result.project).toBeDefined();
    expect(result.milestones).toEqual([]);
  });

  it('retries project number generation on unique-violation race', async () => {
    projectRepo.count.mockResolvedValue(0);
    projectRepo.save
      .mockRejectedValueOnce({ code: '23505' })
      .mockImplementationOnce((p: any) => Promise.resolve({ ...p, id: 'proj-1' }));
    const result = await service.createFromQuotation(snapshot, 'u-1', 't-1');
    expect(result.project.projectNumber).toBe('PRJ-2026-0002');
  });

  it('propagates non-unique errors (rollback)', async () => {
    projectRepo.save.mockRejectedValue(new Error('disk full'));
    await expect(service.createFromQuotation(snapshot, 'u-1', 't-1')).rejects.toThrow('disk full');
  });

  it('creates the default folder structure', async () => {
    const folderRepo = emRepo(undefined);
    folderRepo.create.mockImplementation((f: any) => ({ ...f }));
    folderRepo.save.mockImplementation((arr: any) => Promise.resolve(arr));
    em.getRepository.mockImplementation((entity: any) => {
      if (entity.name === 'ProjectFolder') return folderRepo;
      if (entity === MilestoneTemplate) return templateRepo;
      if (entity === Project) return projectRepo;
      return emRepo(undefined);
    });

    const result = await service.createFromQuotation(snapshot, 'u-1', 't-1');
    expect(result.folders.length).toBeGreaterThanOrEqual(7);
    expect(result.folders.map((f) => f.folderName)).toContain('Drawings');
  });

  it('initializes the project_management workflow and syncs status', async () => {
    const result = await service.createFromQuotation(snapshot, 'u-1', 't-1');
    expect(workflowService.createInstance).toHaveBeenCalledWith(
      'project_management', 'project', 'proj-1',
      expect.objectContaining({ userId: 'u-1' }),
      em,
    );
    expect(result.workflow?.instanceId).toBe('wf-1');
    expect(result.workflow?.state).toBe('DRAFT');
  });

  it('tolerates missing workflow seed (project still created)', async () => {
    workflowService.createInstance.mockRejectedValue(new Error('No initial state for workflow'));
    const result = await service.createFromQuotation(snapshot, 'u-1', 't-1');
    expect(result.project.id).toBeDefined();
    expect(result.workflow).toBeNull();
  });

  it('publishes a PROJECT_CREATED domain event after commit', async () => {
    const publish = jest.spyOn(eventBus, 'publish');
    const result = await service.createFromQuotation(snapshot, 'u-1', 't-1');
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ProjectDomainEventType.PROJECT_CREATED,
        projectId: result.project.id,
        payload: expect.objectContaining({ quotationNumber: 'QTN-2026-001' }),
      }),
    );
  });
});
