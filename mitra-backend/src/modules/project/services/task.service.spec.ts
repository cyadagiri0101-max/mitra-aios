import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TaskService } from './task.service';
import { ProjectTask, TaskStatus, TaskPriority } from '../entities/projecttask.entity';
import { TaskDependency, DependencyType } from '../entities/taskdependency.entity';
import { TaskComment } from '../entities/taskcomment.entity';
import { TaskAttachment } from '../entities/taskattachment.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepo: any;
  let dependencyRepo: any;
  let commentRepo: any;
  let attachmentRepo: any;
  let activityRepo: any;
  let eventBus: any;

  const task = {
    id: 't-1', projectId: 'p-1', title: 'Design A', status: TaskStatus.TODO,
    progressPct: 0, parentTaskId: null, assigneeId: null, deletedAt: null,
  };

  const makeQb = (tasks: any[] = [], count = tasks.length) => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([tasks, count]),
    };
    return qb;
  };

  beforeEach(async () => {
    taskRepo = {
      createQueryBuilder: jest.fn(() => makeQb([task])),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((t) => Promise.resolve({ ...t, id: t.id ?? 'new-id' })),
      create: jest.fn((t) => ({ ...t })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    dependencyRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((d) => Promise.resolve({ ...d, id: 'dep-id' })),
      create: jest.fn((d) => ({ ...d })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    commentRepo = { create: jest.fn((c) => ({ ...c })), save: jest.fn((c) => Promise.resolve(c)), find: jest.fn().mockResolvedValue([]) };
    attachmentRepo = { create: jest.fn((a) => ({ ...a })), save: jest.fn((a) => Promise.resolve(a)), find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    activityRepo = { create: jest.fn((a) => ({ ...a })), save: jest.fn((a) => Promise.resolve(a)), findAndCount: jest.fn().mockResolvedValue([[], 0]) };
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: getRepositoryToken(ProjectTask), useValue: taskRepo },
        { provide: getRepositoryToken(TaskDependency), useValue: dependencyRepo },
        { provide: getRepositoryToken(TaskComment), useValue: commentRepo },
        { provide: getRepositoryToken(TaskAttachment), useValue: attachmentRepo },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: activityRepo },
        { provide: DomainEventBus, useValue: eventBus },
      ],
    }).compile();

    service = module.get(TaskService);
  });

  describe('logTime', () => {
    it('accumulates hours onto actualHours with an activity entry', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task, actualHours: 4 });
      const saved = await service.logTime('t-1', 2.5, 'machining', 'u-1', 't-1');
      expect(saved.actualHours).toBe(6.5);
      expect(activityRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ activityType: 'task.time_logged', metadata: expect.objectContaining({ hours: 2.5, note: 'machining' }) }),
      );
    });

    it('rejects non-positive hours', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task, actualHours: 0 });
      await expect(service.logTime('t-1', 0, null, 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('addDependency', () => {
    it('rejects dependency on a task from another project', async () => {
      dependencyRepo.findOne.mockResolvedValue(null);
      taskRepo.findOne.mockResolvedValueOnce({ ...task, id: 't-1' });
      taskRepo.findOne.mockResolvedValueOnce({ ...task, id: 't-2', projectId: 'other-project' });
      await expect(service.addDependency('t-1', 't-2', DependencyType.FINISH_TO_START, 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByProject', () => {
    it('returns paginated tasks with subtasks and dependencies', async () => {
      taskRepo.createQueryBuilder.mockReturnValue(makeQb([task]));
      dependencyRepo.find.mockResolvedValue([{ taskId: 't-1', dependsOnTaskId: 't-0' }]);
      taskRepo.find.mockResolvedValue([]);

      const result = await service.findByProject('p-1', { status: TaskStatus.TODO }, 't-1');
      expect(result.total).toBe(1);
      expect((result.data[0] as any).dependencies).toEqual(['t-0']);
      expect(result.data[0].subtasks).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a task with activity + domain event', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      taskRepo.save.mockImplementation((t: any) => Promise.resolve({ ...t, id: 't-9' }));
      const saved = await service.create('p-1', { title: 'New Task' }, 'u-1', 't-1');
      expect(saved.id).toBe('t-9');
      expect(saved.status).toBe(TaskStatus.TODO);
      expect(activityRepo.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ProjectDomainEventType.TASK_CREATED }),
      );
    });

    it('rejects parent task from another project', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task, id: 'parent-1', projectId: 'other-project' });
      await expect(
        service.create('p-1', { title: 'Child', parentTaskId: 'parent-1' }, 'u-1', 't-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update / changeStatus', () => {
    it('sets completedAt + 100% when moved to DONE', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      const saved = await service.update('t-1', { status: TaskStatus.DONE }, 'u-1', 't-1');
      expect(saved.completedAt).toBeInstanceOf(Date);
      expect(saved.progressPct).toBe(100);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ProjectDomainEventType.TASK_STATUS_CHANGED }),
      );
    });

    it('blocks DONE while open dependencies exist', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      dependencyRepo.find.mockResolvedValue([{ taskId: 't-1', dependsOnTaskId: 't-0' }]);
      taskRepo.find.mockResolvedValue([{ id: 't-0', status: TaskStatus.IN_PROGRESS, title: 'Blocking' }]);
      await expect(
        service.changeStatus('t-1', TaskStatus.DONE, null, 'u-1', 't-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dependencies', () => {
    it('adds a dependency edge', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      dependencyRepo.findOne.mockResolvedValue(null);
      const result = await service.addDependency('t-1', 't-0', DependencyType.FINISH_TO_START, 'u-1', 't-1');
      expect(result.added).toBe(true);
      expect(dependencyRepo.save).toHaveBeenCalled();
    });

    it('rejects self-dependency', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      await expect(service.addDependency('t-1', 't-1', DependencyType.FINISH_TO_START, 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects cycles via DFS', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      dependencyRepo.find.mockImplementation(async ({ where }: any) => {
        if (where.taskId === 't-0') return [{ taskId: 't-0', dependsOnTaskId: 't-1' }];
        return [];
      });
      await expect(service.addDependency('t-1', 't-0', DependencyType.FINISH_TO_START, 'u-1', 't-1')).rejects.toThrow(/cycle/i);
    });

    it('removes a dependency edge (soft delete)', async () => {
      const dep = { id: 'dep-1', taskId: 't-1', dependsOnTaskId: 't-0' };
      dependencyRepo.findOne.mockResolvedValue(dep);
      dependencyRepo.save.mockImplementation((d: any) => Promise.resolve(d));
      const result = await service.removeDependency('t-1', 't-0', 'u-1', 't-1');
      expect(result.removed).toBe(true);
      expect((dep as any).deletedAt).toBeInstanceOf(Date);
    });

    it('removeDependency tolerates missing edge', async () => {
      dependencyRepo.findOne.mockResolvedValue(null);
      const result = await service.removeDependency('t-1', 't-0', 'u-1', 't-1');
      expect(result.removed).toBe(true);
      expect(dependencyRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('blocks deletion when another task depends on it', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      dependencyRepo.findOne.mockResolvedValue({ taskId: 't-9', dependsOnTaskId: 't-1' });
      taskRepo.find.mockResolvedValue([{ id: 't-9', title: 'Depends' }]);
      await expect(service.remove('t-1', 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });

    it('soft-deletes a task', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      dependencyRepo.findOne.mockResolvedValue(null);
      const result = await service.remove('t-1', 'u-1', 't-1');
      expect(result.deleted).toBe(true);
    });

    it('detaches orphaned subtasks instead of deleting them', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      dependencyRepo.findOne.mockResolvedValue(null);
      const result = await service.remove('t-1', 'u-1', 't-1');
      expect(result.deleted).toBe(true);
      expect(taskRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ parentTaskId: 't-1' }),
        expect.objectContaining({ parentTaskId: null, updatedBy: 'u-1' }),
      );
    });
  });

  describe('parent hierarchy guards', () => {
    it('rejects moving a task under itself', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task, parentTaskId: null });
      await expect(
        service.update('t-1', { parentTaskId: 't-1' }, 'u-1', 't-1'),
      ).rejects.toThrow(/own parent/i);
    });

    it('rejects moving a task under its own descendant (cycle)', async () => {
      taskRepo.findOne.mockImplementation(async ({ where }: any) => {
        const id = where?.id ?? where;
        if (id === 't-1') return { ...task, parentTaskId: null };
        return { ...task, id, parentTaskId: 't-1', projectId: 'p-1' };
      });
      await expect(
        service.update('t-1', { parentTaskId: 't-2' }, 'u-1', 't-1'),
      ).rejects.toThrow(/cycle/i);
    });

    it('rejects moving a task into another project', async () => {
      taskRepo.findOne.mockImplementation(async ({ where }: any) => {
        const id = where?.id ?? where;
        if (id === 't-1') return { ...task, parentTaskId: null, projectId: 'p-1' };
        return { ...task, id, parentTaskId: null, projectId: 'p-2' };
      });
      await expect(
        service.update('t-1', { parentTaskId: 't-x' }, 'u-1', 't-1'),
      ).rejects.toThrow(/does not belong/i);
    });
  });

  describe('comments & attachments', () => {
    it('adds and lists comments', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      await service.addComment('t-1', 'hello', 'u-1', 'User', 't-1');
      expect(commentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ body: 'hello', authorName: 'User' }));
      commentRepo.find.mockResolvedValue([]);
      await expect(service.findComments('t-1', 't-1')).resolves.toEqual([]);
    });

    it('adds attachment and throws NotFound for missing task', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      const saved = await service.addAttachment('t-1', { fileName: 'a.pdf', filePath: '/x/a.pdf', mimeType: 'application/pdf', fileSize: 10 }, 'u-1', 'User', 't-1');
      expect(saved.fileName).toBe('a.pdf');
      taskRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addAttachment('nope', { fileName: 'a.pdf', filePath: '/x' }, 'u-1', null, 't-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes attachments', async () => {
      const att = { id: 'att-1', fileName: 'a.pdf' };
      attachmentRepo.findOne.mockResolvedValue(att);
      attachmentRepo.save.mockImplementation((a: any) => Promise.resolve(a));
      const saved = await service.removeAttachment('att-1', 'u-1', 't-1');
      expect(saved.deletedAt).toBeInstanceOf(Date);
      attachmentRepo.findOne.mockResolvedValue(null);
      await expect(service.removeAttachment('att-x', 'u-1', 't-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('tenant isolation', () => {
    it('rejects tenantless create (fail closed)', async () => {
      await expect(service.create('p-1', { title: 'X' }, 'u-1', null)).rejects.toThrow(ForbiddenException);
      expect(taskRepo.create).not.toHaveBeenCalled();
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('writes the caller tenant onto the created task', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      const saved = await service.create('p-1', { title: 'X' }, 'u-1', 't-1');
      expect(taskRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-1' }));
      expect(saved.tenantId).toBe('t-1');
    });

    it('rejects tenantless findByProject (fail closed)', async () => {
      await expect(service.findByProject('p-1', {}, null)).rejects.toThrow(ForbiddenException);
      expect(taskRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns 404 for another tenant\'s task and never mutates it', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.update('t-x', { status: TaskStatus.DONE }, 'u-1', 't-2')).rejects.toThrow(NotFoundException);
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('scopes the lookup to the caller tenant', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task });
      await service.findOne('t-1', 't-1');
      expect(taskRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 't-1', tenantId: 't-1' }) }),
      );
    });

    it('scopes dependency writes to the caller tenant', async () => {
      taskRepo.findOne.mockResolvedValue({ ...task, id: 't-1' });
      dependencyRepo.findOne.mockResolvedValue(null);
      await service.addDependency('t-1', 't-0', DependencyType.FINISH_TO_START, 'u-1', 't-1');
      expect(dependencyRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-1' }));
      const saved = await service.addComment('t-1', 'note', 'u-1', 'User', 't-1');
      expect(saved.tenantId).toBe('t-1');
    });
  });
});
