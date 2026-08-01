import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { Project } from '../entities/project.entity';
import { ProjectTask, TaskStatus } from '../entities/projecttask.entity';
import { ProjectMilestone, MilestoneStatus } from '../entities/projectmilestone.entity';
import { TaskDependency } from '../entities/taskdependency.entity';

describe('TimelineService', () => {
  let service: TimelineService;
  let projectRepo: any;
  let taskRepo: any;
  let milestoneRepo: any;
  let dependencyRepo: any;

  const project = {
    id: 'p-1', projectNumber: 'PRJ-2026-0001', name: 'Mold', tenantId: 't-1',
    startDate: new Date('2026-08-01'), plannedEndDate: new Date('2026-12-01'),
  };

  const taskA = {
    id: 't-a', projectId: 'p-1', title: 'A', status: TaskStatus.TODO, progressPct: 0,
    startDate: new Date('2026-08-01'), dueDate: new Date('2026-08-05'), parentTaskId: null, assigneeName: null, sortOrder: 1,
  };
  const taskB = {
    id: 't-b', projectId: 'p-1', title: 'B', status: TaskStatus.DONE, progressPct: 100,
    startDate: new Date('2026-08-06'), dueDate: new Date('2026-08-06'), parentTaskId: null, assigneeName: 'Sam', sortOrder: 2,
  };

  beforeEach(async () => {
    projectRepo = { findOne: jest.fn() };
    taskRepo = { find: jest.fn() };
    milestoneRepo = { find: jest.fn() };
    dependencyRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectTask), useValue: taskRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(TaskDependency), useValue: dependencyRepo },
      ],
    }).compile();

    service = module.get(TimelineService);
  });

  it('throws NotFoundException for missing project', async () => {
    projectRepo.findOne.mockResolvedValue(null);
    await expect(service.build('nope', {}, 't-1')).rejects.toThrow(NotFoundException);
  });

  it('builds Gantt rows, links and summary from tasks + milestones', async () => {
    projectRepo.findOne.mockResolvedValue(project);
    taskRepo.find.mockResolvedValue([taskA, taskB]);
    milestoneRepo.find.mockResolvedValue([
      {
        id: 'm-1', milestoneName: 'Kickoff', milestoneStage: 'KICKOFF', sequenceNumber: 1, isCriticalPath: true,
        plannedDate: new Date('2026-08-01'), actualDate: null, revisedDate: null, completionPct: 100,
        status: MilestoneStatus.COMPLETED, dependsOnMilestoneId: null,
      },
    ]);
    dependencyRepo.find.mockResolvedValue([
      { taskId: 't-b', dependsOnTaskId: 't-a', dependencyType: 'FINISH_TO_START' },
    ]);

    const result = await service.build('p-1', {}, 't-1');
    expect(result.rows).toHaveLength(3);
    expect(result.links).toEqual([{ from: 't-a', to: 't-b', type: 'FINISH_TO_START' }]);
    expect(result.summary.tasks).toBe(2);
    expect(result.summary.completedTasks).toBe(1);
    expect(result.summary.openTasks).toBe(1);
    expect(result.summary.delayedMilestones).toBe(0);
    expect(result.criticalPath).toEqual(['t-a', 't-b']);
    expect(result.criticalPathDurationDays).toBe(6);
    expect(result.range.start).toBe('2026-08-01');
    expect(result.range.end).toBe('2026-12-01');
  });

  it('computes critical path only through zero-float tasks', async () => {
    projectRepo.findOne.mockResolvedValue(project);
    // t-a → t-b → t-c; t-d is parallel and short (float > 0)
    const taskC = {
      ...taskA, id: 't-c', title: 'C', startDate: new Date('2026-08-06'), dueDate: new Date('2026-08-06'), sortOrder: 3,
    };
    const taskD = {
      ...taskA, id: 't-d', title: 'D (short)', startDate: new Date('2026-08-06'), dueDate: new Date('2026-08-06'), sortOrder: 4,
    };
    taskRepo.find.mockResolvedValue([taskA, taskB, taskC, taskD]);
    milestoneRepo.find.mockResolvedValue([]);
    dependencyRepo.find.mockResolvedValue([
      { taskId: 't-b', dependsOnTaskId: 't-a', dependencyType: 'FINISH_TO_START' },
      { taskId: 't-c', dependsOnTaskId: 't-b', dependencyType: 'FINISH_TO_START' },
    ]);

    const result = await service.build('p-1', {}, 't-1');
    expect(result.criticalPath).toEqual(['t-a', 't-b', 't-c']);
    expect(result.criticalPath).not.toContain('t-d');
    const rowD = result.rows.find((r) => r.id === 't-d');
    expect(rowD?.isCritical).toBe(false);
  });

  it('handles milestone-only timelines', async () => {
    projectRepo.findOne.mockResolvedValue(project);
    taskRepo.find.mockResolvedValue([]);
    milestoneRepo.find.mockResolvedValue([
      {
        id: 'm-1', milestoneName: 'Kickoff', milestoneStage: 'KICKOFF', sequenceNumber: 1, isCriticalPath: true,
        plannedDate: new Date('2026-08-01'), actualDate: null, revisedDate: null, completionPct: 0,
        status: MilestoneStatus.PENDING, dependsOnMilestoneId: null,
      },
    ]);
    dependencyRepo.find.mockResolvedValue([]);
    const result = await service.build('p-1', {}, 't-1');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].type).toBe('milestone');
    expect(result.criticalPath).toEqual([]);
    expect(result.criticalPathDurationDays).toBeNull();
  });

  it('respects criticalPathOnly and includeMilestones flags', async () => {
    projectRepo.findOne.mockResolvedValue(project);
    taskRepo.find.mockResolvedValue([taskA]);
    milestoneRepo.find.mockResolvedValue([]);
    dependencyRepo.find.mockResolvedValue([]);
    const result = await service.build('p-1', { criticalPathOnly: true, includeMilestones: false }, 't-1');
    expect(result.rows).toHaveLength(1);
    expect(result.summary.milestones).toBe(0);
  });
});
