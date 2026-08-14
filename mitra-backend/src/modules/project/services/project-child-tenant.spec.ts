import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskService } from './risk.service';
import { MilestoneService } from './milestone.service';
import { TimelineService } from './timeline.service';
import { ProjectActivityService } from './project-activity.service';
import { ProjectWorkflowService } from './project-workflow.service';

import { ProjectRisk } from '../entities/projectrisk.entity';
import { ProjectMilestone } from '../entities/projectmilestone.entity';
import { ProjectTask } from '../entities/projecttask.entity';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { MilestoneTemplateItem } from '../entities/milestone-template-item.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { Project } from '../entities/project.entity';
import { TaskDependency } from '../entities/taskdependency.entity';

import { DomainEventBus } from './domain-event-bus.service';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../platform/services/notification.service';
import { DataSource } from 'typeorm';

const makeRepo = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((d: any) => ({ ...d, id: 'mock-id' })),
  save: jest.fn((e: any) => Promise.resolve({ id: 'saved-id', ...e })),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  }),
});

describe('Project Child Services — Tenant Isolation', () => {
  let riskService: RiskService;
  let milestoneService: MilestoneService;
  let timelineService: TimelineService;
  let activityService: ProjectActivityService;
  let workflowService: ProjectWorkflowService;

  let riskRepo: ReturnType<typeof makeRepo>;
  let milestoneRepo: ReturnType<typeof makeRepo>;
  let projectRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    riskRepo = makeRepo();
    milestoneRepo = makeRepo();
    projectRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskService,
        MilestoneService,
        TimelineService,
        ProjectActivityService,
        ProjectWorkflowService,

        { provide: getRepositoryToken(ProjectRisk), useValue: riskRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(ProjectTask), useValue: makeRepo() },
        { provide: getRepositoryToken(MilestoneTemplate), useValue: makeRepo() },
        { provide: getRepositoryToken(MilestoneTemplateItem), useValue: makeRepo() },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: makeRepo() },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(TaskDependency), useValue: makeRepo() },

        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        { provide: WorkflowService, useValue: { findInstanceByEntity: jest.fn(), createInstance: jest.fn() } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) } },
        { provide: NotificationService, useValue: { enqueue: jest.fn() } },
        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb({ getRepository: () => makeRepo(), save: jest.fn() })) } },
      ],
    }).compile();

    riskService = module.get<RiskService>(RiskService);
    milestoneService = module.get<MilestoneService>(MilestoneService);
    timelineService = module.get<TimelineService>(TimelineService);
    activityService = module.get<ProjectActivityService>(ProjectActivityService);
    workflowService = module.get<ProjectWorkflowService>(ProjectWorkflowService);
  });

  describe('RiskService', () => {
    it('rejects tenantless requests with 403', async () => {
      await expect(riskService.findByProject('p-1', {}, '')).rejects.toThrow(ForbiddenException);
      await expect(riskService.findOne('r-1', null)).rejects.toThrow(ForbiddenException);
      await expect(riskService.dashboard('p-1', undefined)).rejects.toThrow(ForbiddenException);
    });

    it('scopes findOne to caller tenant', async () => {
      riskRepo.findOne.mockResolvedValue(null);
      await expect(riskService.findOne('r-1', 'tenant-a')).rejects.toThrow(NotFoundException);
      expect(riskRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'r-1', tenantId: 'tenant-a' }),
      });
    });
  });

  describe('MilestoneService & TimelineService & ActivityService', () => {
    it('rejects tenantless operations with 403', async () => {
      await expect(milestoneService.findByProject('p-1', '')).rejects.toThrow(ForbiddenException);
      await expect(timelineService.build('p-1', {}, null)).rejects.toThrow(ForbiddenException);
      await expect(activityService.findByProject('p-1', undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ProjectWorkflowService', () => {
    it('rejects tenantless workflow calls with 403', async () => {
      await expect(workflowService.getWorkflow('p-1', { userId: 'u-1', userRole: [], userPermissions: [], tenantId: '' })).rejects.toThrow(ForbiddenException);
    });
  });
});
