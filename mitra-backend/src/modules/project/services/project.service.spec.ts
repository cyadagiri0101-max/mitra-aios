import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMilestone } from '../entities/projectmilestone.entity';
import { ProjectBudget } from '../entities/projectbudget.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { DomainEventBus } from './domain-event-bus.service';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProjectDomainEventType } from '../events/project.events';

const makeRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  save: jest.fn(),
  create: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  update: jest.fn().mockResolvedValue({ affected: 0 }),
});

const mockWorkflowService = {
  getValidTransitions: jest.fn().mockResolvedValue([]),
  executeTransition: jest.fn(),
  createInstance: jest.fn().mockResolvedValue(undefined),
  validateMoldTransition: jest.fn(),
};

const mockProject = {
  id: 'project-uuid-1',
  projectNumber: 'MITRA-24-0001',
  name: 'Test Mold Project',
  customerName: 'ACME Corp',
  productName: 'Housing Part',
  stage: 'ENQUIRY',
  healthStatus: 'ON_TRACK',
  deletedAt: null,
};

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepo: ReturnType<typeof makeRepo>;
  let milestoneRepo: ReturnType<typeof makeRepo>;
  let budgetRepo: ReturnType<typeof makeRepo>;
  let activityRepo: any;
  let auditService: any;
  let eventBus: any;
  let dataSource: any;

  beforeEach(async () => {
    projectRepo = makeRepo();
    milestoneRepo = makeRepo();
    budgetRepo = makeRepo();
    activityRepo = { create: jest.fn((a) => ({ ...a })), save: jest.fn((a) => Promise.resolve(a)) };
    auditService = { logBusinessEvent: jest.fn().mockResolvedValue({}) };
    eventBus = { publish: jest.fn() };
    dataSource = {
      transaction: jest.fn((cb: any) =>
        cb({
          getRepository: () => ({
            ...makeRepo(),
            find: jest.fn().mockResolvedValue([]),
          }),
          save: jest.fn(),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(ProjectBudget), useValue: budgetRepo },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: activityRepo },
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: auditService },
        { provide: DomainEventBus, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne()', () => {
    it('returns project when found', async () => {
      projectRepo.findOne.mockResolvedValue(mockProject);
      const result = await service.findOne('project-uuid-1', 'tenant-1');
      expect(result).toEqual(mockProject);
      expect(projectRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when not found', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    const baseDto = {
      name: 'New Mold Project',
      customerName: 'ACME Corp',
      productName: 'Housing Part',
    };

    it('generates a sequential PRJ-{year}-{seq} project number and creates a workflow instance', async () => {
      projectRepo.count.mockResolvedValue(0);
      projectRepo.create.mockImplementation((input: any) => input);
      projectRepo.save.mockImplementation(async (input: any) => ({ id: 'new-project-id', ...input }));

      const result = await service.create(baseDto, 'user-1', 'tenant-1');

      const year = new Date().getFullYear();
      expect(result.projectNumber).toBe(`PRJ-${year}-0001`);
      expect(result.stage).toBe('ENQUIRY');
      expect(result.healthStatus).toBe('GREEN');
      expect(result.createdBy).toBe('user-1');
      expect(result.updatedBy).toBe('user-1');
      expect(projectRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) }),
      );
      expect(mockWorkflowService.createInstance).toHaveBeenCalledWith(
        'mold_project', 'project', 'new-project-id',
        expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-1' }),
      );
    });

    it('continues numbering from the existing per-tenant count', async () => {
      projectRepo.count.mockResolvedValue(7);
      projectRepo.create.mockImplementation((input: any) => input);
      projectRepo.save.mockImplementation(async (input: any) => ({ id: 'new-project-id', ...input }));

      const result = await service.create(baseDto, 'user-1', 'tenant-1');

      const year = new Date().getFullYear();
      expect(result.projectNumber).toBe(`PRJ-${year}-0008`);
    });

    it('retries with the next number on a unique-violation (23505) and succeeds', async () => {
      projectRepo.count.mockResolvedValue(0);
      projectRepo.create.mockImplementation((input: any) => input);

      const conflict: any = new Error('duplicate key value violates unique constraint');
      conflict.code = '23505';

      projectRepo.save
        .mockRejectedValueOnce(conflict)
        .mockImplementationOnce(async (input: any) => ({ id: 'new-project-id', ...input }));

      const result = await service.create(baseDto, 'user-1', 'tenant-1');

      const year = new Date().getFullYear();
      expect(result.projectNumber).toBe(`PRJ-${year}-0002`); // attempt 1 -> seq = count+1+attempt = 0+1+1
      expect(projectRepo.save).toHaveBeenCalledTimes(2);
    });

    it('rethrows non-unique-violation errors immediately without retrying', async () => {
      projectRepo.count.mockResolvedValue(0);
      projectRepo.create.mockImplementation((input: any) => input);

      const dbError: any = new Error('connection terminated');
      dbError.code = '57P01';
      projectRepo.save.mockRejectedValue(dbError);

      await expect(service.create(baseDto, 'user-1', 'tenant-1')).rejects.toThrow('connection terminated');
      expect(projectRepo.save).toHaveBeenCalledTimes(1);
    });

    it('does not fail creation when workflow instance creation throws', async () => {
      projectRepo.count.mockResolvedValue(0);
      projectRepo.create.mockImplementation((input: any) => input);
      projectRepo.save.mockImplementation(async (input: any) => ({ id: 'new-project-id', ...input }));
      mockWorkflowService.createInstance.mockRejectedValueOnce(new Error('workflow states not seeded yet'));

      const result = await service.create(baseDto, 'user-1', 'tenant-1');
      expect(result.id).toBe('new-project-id');
    });

    it('logs activity + audit and publishes PROJECT_CREATED', async () => {
      projectRepo.count.mockResolvedValue(0);
      projectRepo.create.mockImplementation((input: any) => input);
      projectRepo.save.mockImplementation(async (input: any) => ({ id: 'new-project-id', ...input }));

      await service.create(baseDto, 'user-1', 'tenant-1');
      expect(activityRepo.save).toHaveBeenCalledWith(expect.objectContaining({ activityType: 'project.created' }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith('project.created', 'Project', 'new-project-id', 'user-1', expect.any(Object));
      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ eventType: ProjectDomainEventType.PROJECT_CREATED }));
    });
  });

  describe('findAll()', () => {
    it('calls repository to find projects', async () => {
      projectRepo.findAndCount.mockResolvedValue([[mockProject], 1]);
      await service.findAll('tenant-1');
      expect(projectRepo.findAndCount).toHaveBeenCalled();
    });

    it('filters by tenantId when provided', async () => {
      projectRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll('tenant-123');
      expect(projectRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-123' }),
        }),
      );
    });
  });

  describe('transitionStage()', () => {
    it('validates, saves, and emits activity + audit + PROJECT_STATUS_CHANGED', async () => {
      projectRepo.findOne.mockResolvedValue({ ...mockProject, tenantId: 't-1' });
      projectRepo.save.mockImplementation(async (p: any) => ({ ...p }));

      const result = await service.transitionStage('project-uuid-1', 'PLANNING', 'user-1', 't-1', 'moving on');
      expect(mockWorkflowService.validateMoldTransition).toHaveBeenCalledWith('ENQUIRY', 'PLANNING');
      expect(result.project.stage).toBe('PLANNING');
      expect(result.project.stageEnteredAt).toBeInstanceOf(Date);
      expect(activityRepo.save).toHaveBeenCalledWith(expect.objectContaining({ activityType: 'project.stage_changed' }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith('project.stage_changed', 'Project', 'project-uuid-1', 'user-1', expect.any(Object));
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ProjectDomainEventType.PROJECT_STATUS_CHANGED, payload: expect.objectContaining({ from: 'ENQUIRY', to: 'PLANNING' }) }),
      );
    });
  });

  describe('remove()', () => {
    it('soft-deletes the project and cascades to all children in one transaction', async () => {
      projectRepo.findOne.mockResolvedValue({ ...mockProject, tenantId: 't-1' });
      const emSave = jest.fn((x: any) => Promise.resolve(x));
      const updates: any[] = [];
      const fakeEm = {
        getRepository: () => ({
          save: emSave,
          create: jest.fn((a: any) => ({ ...a })),
          find: jest.fn().mockResolvedValue([{ id: 'doc-1' }]),
          update: jest.fn((where: any) => {
            updates.push(where);
            return Promise.resolve({ affected: 1 });
          }),
        }),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(fakeEm));

      const result = await service.remove('project-uuid-1', 'user-1', 't-1');
      expect(result.deleted).toBe(true);
      expect(emSave).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.any(Date) }));
      expect(updates.length).toBeGreaterThanOrEqual(8);
      expect(updates.filter((u) => u.projectId !== undefined).every((u) => u.projectId === 'project-uuid-1')).toBe(true);
      expect(updates.some((u) => u.documentId !== undefined)).toBe(true);
    });

    it('logs deletion activity inside the transaction + audit outside it', async () => {
      projectRepo.findOne.mockResolvedValue({ ...mockProject, tenantId: 't-1' });
      const emSave = jest.fn((x: any) => Promise.resolve(x));
      const fakeEm = {
        getRepository: () => ({
          save: emSave,
          create: jest.fn((a: any) => ({ ...a })),
          find: jest.fn().mockResolvedValue([{ id: 'doc-1' }]),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(fakeEm));

      await service.remove('project-uuid-1', 'user-1', 't-1');
      expect(emSave).toHaveBeenCalledWith(expect.objectContaining({ activityType: 'project.deleted' }));
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith('project.deleted', 'Project', 'project-uuid-1', 'user-1', expect.any(Object));
    });

    it('throws NotFoundException when the project is missing', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('nope', 'u-1', 't-1')).rejects.toThrow(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
