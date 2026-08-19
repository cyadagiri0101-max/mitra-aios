import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScheduleBaselineService } from './schedule-baseline.service';
import { ScheduleBaseline, BaselineStatus } from '../entities/schedule-baseline.entity';
import { ScheduleBaselineItem, BaselineItemType } from '../entities/schedule-baseline-item.entity';
import { Project } from '../entities/project.entity';
import { ProjectMilestone } from '../entities/projectmilestone.entity';
import { ProjectTask } from '../entities/projecttask.entity';
import { ProjectDesignLoad } from '../../design-load/entities/project-design-load.entity';
import { AuditService } from '../../audit/services/audit.service';
import { OutboxService } from '../../platform/services/outbox.service';

describe('ScheduleBaselineService', () => {
  let service: ScheduleBaselineService;
  let baselineRepo: any;
  let itemRepo: any;
  let projectRepo: any;
  let milestoneRepo: any;
  let taskRepo: any;
  let designLoadRepo: any;
  let auditService: any;
  let outboxService: any;
  let queryRunner: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const projectId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn().mockImplementation((entity) => {
          if (Array.isArray(entity)) return Promise.resolve(entity);
          return Promise.resolve({ id: 'base-1', ...entity });
        }),
        findOne: jest.fn().mockResolvedValue(null),
      },
    };

    const dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    baselineRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((dto) => ({ id: 'base-1', ...dto })),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    itemRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'item-1', ...dto })),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    projectRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: projectId,
        tenantId,
        startDate: new Date('2026-09-01'),
        plannedEndDate: new Date('2026-09-30'),
      }),
    };

    milestoneRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'ms-1',
          milestoneName: 'Design Complete',
          milestoneStage: 'DESIGN',
          sequenceNumber: 1,
          plannedDate: new Date('2026-09-10'),
          isCriticalPath: true,
        },
      ]),
    };

    taskRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'task-1',
          title: 'Mold Designing',
          startDate: new Date('2026-09-01'),
          dueDate: new Date('2026-09-05'),
          estimatedHours: 40,
          status: 'TODO',
        },
        {
          id: 'task-2',
          title: 'Mold Detailing',
          startDate: new Date('2026-09-06'),
          dueDate: new Date('2026-09-09'),
          estimatedHours: 32,
          status: 'TODO',
        },
      ]),
    };

    designLoadRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    auditService = {
      logBusinessEvent: jest.fn().mockResolvedValue(undefined),
    };

    outboxService = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleBaselineService,
        { provide: getRepositoryToken(ScheduleBaseline), useValue: baselineRepo },
        { provide: getRepositoryToken(ScheduleBaselineItem), useValue: itemRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(ProjectTask), useValue: taskRepo },
        { provide: getRepositoryToken(ProjectDesignLoad), useValue: designLoadRepo },
        { provide: AuditService, useValue: auditService },
        { provide: OutboxService, useValue: outboxService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ScheduleBaselineService>(ScheduleBaselineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBaseline', () => {
    it('should create a frozen baseline snapshot with milestones and tasks', async () => {
      baselineRepo.findOne.mockResolvedValue({
        id: 'base-1',
        baselineNumber: 'BL-0001',
        version: 1,
        status: BaselineStatus.DRAFT,
        items: [
          { itemType: BaselineItemType.MILESTONE, title: 'Design Complete' },
          { itemType: BaselineItemType.TASK, title: 'Mold Designing' },
        ],
      });

      const result = await service.createBaseline(
        projectId,
        { name: 'Initial Contract Baseline', description: 'Kickoff snapshot' },
        userId,
        tenantId,
      );

      expect(result).toBeDefined();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'baseline.created',
        'schedule_baseline',
        'base-1',
        userId,
        expect.any(Object),
        undefined,
        projectId,
        tenantId,
      );
    });
  });

  describe('activateBaseline', () => {
    it('should activate the baseline and supersede any previously active baseline', async () => {
      const baseline = {
        id: 'base-2',
        projectId,
        tenantId,
        baselineNumber: 'BL-0002',
        version: 2,
        status: BaselineStatus.DRAFT,
        items: [],
      };
      baselineRepo.findOne.mockResolvedValue(baseline);

      const prevActive = {
        id: 'base-1',
        projectId,
        tenantId,
        baselineNumber: 'BL-0001',
        version: 1,
        status: BaselineStatus.ACTIVE,
      };
      queryRunner.manager.findOne.mockResolvedValue(prevActive);

      const result = await service.activateBaseline('base-2', userId, tenantId);

      expect(prevActive.status).toBe(BaselineStatus.SUPERSEDED);
      expect(result.status).toBe(BaselineStatus.ACTIVE);
      expect(result.isLocked).toBe(true);
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'baseline.activated',
        'schedule_baseline',
        'base-2',
        userId,
        expect.any(Object),
        undefined,
        projectId,
        tenantId,
      );
    });
  });

  describe('calculateVariance', () => {
    it('should calculate deterministic schedule and workload variance', async () => {
      const baseline = {
        id: 'base-1',
        projectId,
        tenantId,
        baselineNumber: 'BL-0001',
        name: 'Initial Baseline',
        version: 1,
        status: BaselineStatus.ACTIVE,
        totalPlannedDurationDays: 8,
        items: [
          {
            id: 'bi-1',
            itemType: BaselineItemType.TASK,
            title: 'Mold Designing',
            durationDays: 4,
            plannedHours: 40,
            plannedStartDate: new Date('2026-09-01'),
            plannedFinishDate: new Date('2026-09-05'),
          },
        ],
      };
      baselineRepo.findOne.mockResolvedValue(baseline);

      // Live task changed to 5 days (2026-09-01 -> 2026-09-06) and 50 hours
      taskRepo.find.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Mold Designing',
          startDate: new Date('2026-09-01'),
          dueDate: new Date('2026-09-06'),
          estimatedHours: 50,
          status: 'IN_PROGRESS',
        },
      ]);

      const report = await service.calculateVariance(projectId, 'base-1', tenantId);

      expect(report).toBeDefined();
      expect(report.taskVariances[0].durationVarianceDays).toBe(1); // 5 - 4 = +1 day
      expect(report.taskVariances[0].hoursVariance).toBe(10); // 50 - 40 = +10h
      expect(report.isBehindSchedule).toBe(true);
      expect(report.explanation).toContain('BL-0001');
    });
  });
});
