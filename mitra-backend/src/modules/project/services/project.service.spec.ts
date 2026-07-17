import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMilestone } from '../entities/projectmilestone.entity';
import { ProjectBudget } from '../entities/projectbudget.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { NotFoundException } from '@nestjs/common';

const makeRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  save: jest.fn(),
  create: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
});

const mockWorkflowService = {
  getValidTransitions: jest.fn().mockResolvedValue([]),
  executeTransition: jest.fn(),
  createInstance: jest.fn().mockResolvedValue(undefined),
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

  beforeEach(async () => {
    projectRepo = makeRepo();
    milestoneRepo = makeRepo();
    budgetRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(ProjectBudget), useValue: budgetRepo },
        { provide: WorkflowService, useValue: mockWorkflowService },
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
      const result = await service.findOne('project-uuid-1');
      expect(result).toEqual(mockProject);
      expect(projectRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when not found', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
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
  });

  describe('findAll()', () => {
    it('calls repository to find projects', async () => {
      projectRepo.findAndCount.mockResolvedValue([[mockProject], 1]);
      await service.findAll();
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
});
