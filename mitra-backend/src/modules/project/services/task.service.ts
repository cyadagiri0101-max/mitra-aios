import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Like } from 'typeorm';
import { ProjectTask, TaskStatus } from '../entities/projecttask.entity';
import { TaskDependency, DependencyType } from '../entities/taskdependency.entity';
import { TaskComment } from '../entities/taskcomment.entity';
import { TaskAttachment } from '../entities/taskattachment.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

/**
 * Task management: subtasks, assignment, priorities, dates, hours,
 * dependencies (cycle-safe), attachments, comments and activity feed.
 */
@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(ProjectTask) private readonly taskRepo: Repository<ProjectTask>,
    @InjectRepository(TaskDependency) private readonly dependencyRepo: Repository<TaskDependency>,
    @InjectRepository(TaskComment) private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(TaskAttachment) private readonly attachmentRepo: Repository<TaskAttachment>,
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
    private readonly eventBus: DomainEventBus,
  ) {}

  // ── CRUD ───────────────────────────────────────────────────────────────────

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async findByProject(projectId: string, query: Record<string, any> = {}, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.taskRepo.createQueryBuilder('t')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.deleted_at IS NULL');

    qb.andWhere('t.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority) qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.assigneeId) qb.andWhere('t.assignee_id = :assigneeId', { assigneeId: query.assigneeId });
    if (query.milestoneId) qb.andWhere('t.milestone_id = :milestoneId', { milestoneId: query.milestoneId });
    if (query.search) {
      qb.andWhere('(t.title ILIKE :search OR t.description ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.parentTaskId) {
      qb.andWhere('t.parent_task_id = :parentTaskId', { parentTaskId: query.parentTaskId });
    } else if (query.subtasks === false) {
      qb.andWhere('t.parent_task_id IS NULL');
    }

    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));

    qb.orderBy('t.sort_order', 'ASC').addOrderBy('t.created_at', 'ASC');
    const [tasks, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    const withSubtasks = await this.attachSubtasks(tasks, projectId, scopeTenant);
    const withDependencies = await this.attachDependencies(withSubtasks, scopeTenant);
    return { data: withDependencies, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null): Promise<ProjectTask> {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { id, deletedAt: IsNull(), tenantId: scopeTenant };
    const task = await this.taskRepo.findOne({ where });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(projectId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    if (data.parentTaskId) {
      const parent = await this.findOne(data.parentTaskId, scopeTenant);
      if (parent.projectId !== projectId) {
        throw new BadRequestException('Parent task does not belong to this project');
      }
    }

    const task = this.taskRepo.create({
      ...data,
      projectId,
      status: data.status ?? TaskStatus.TODO,
      createdBy: userId,
      updatedBy: userId,
      tenantId: scopeTenant,
    });
    const saved = await this.taskRepo.save(task);

    if (data.dependencies?.length) {
      await this.addDependencies(saved.id, data.dependencies, undefined, scopeTenant);
    }

    await this.logActivity(saved.projectId, 'task.created', `Task created: ${saved.title}`, userId, scopeTenant, {
      taskId: saved.id,
    });
    this.eventBus.publish({
      eventType: ProjectDomainEventType.TASK_CREATED,
      occurredAt: new Date(),
      projectId,
      tenantId: scopeTenant,
      actorId: userId ?? null,
      payload: { taskId: saved.id, title: saved.title },
    });
    return saved;
  }

  async update(
    id: string,
    data: Record<string, any>,
    userId: string,
    tenantId?: string | null,
    metadata?: Record<string, any>,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const task = await this.findOne(id, scopeTenant);
    const previousStatus = task.status;
    const transitioningToDone = data.status === TaskStatus.DONE && previousStatus !== TaskStatus.DONE;

    if (data.parentTaskId !== undefined && data.parentTaskId !== task.parentTaskId) {
      await this.assertParentChangeAllowed(id, data.parentTaskId, scopeTenant);
    }

    Object.assign(task, data, { updatedBy: userId });

    if (transitioningToDone) {
      await this.assertCompletable(task, scopeTenant);
    }

    if (task.status === TaskStatus.DONE && previousStatus !== TaskStatus.DONE) {
      task.completedAt = new Date();
      task.progressPct = 100;
    } else if (task.status !== TaskStatus.DONE) {
      task.completedAt = null;
    }

    const saved = await this.taskRepo.save(task);

    if (data.dependencies) {
      await this.replaceDependencies(id, data.dependencies, data.dependencyType, scopeTenant);
    }

    await this.logActivity(saved.projectId, 'task.updated', `Task updated: ${saved.title}`, userId, scopeTenant, {
      taskId: saved.id,
      previousStatus,
      status: saved.status,
      ...(metadata ?? {}),
    });

    if (previousStatus !== saved.status) {
      this.eventBus.publish({
        eventType: ProjectDomainEventType.TASK_STATUS_CHANGED,
        occurredAt: new Date(),
        projectId: saved.projectId,
        tenantId: scopeTenant,
        actorId: userId ?? null,
        payload: { taskId: saved.id, from: previousStatus, to: saved.status },
      });
    }
    return saved;
  }

  async changeStatus(id: string, status: TaskStatus, note: string | null, userId: string, tenantId?: string | null) {
    return this.update(id, { status }, userId, tenantId, { note });
  }

  /** Log time against a task: adds hours to `actualHours` with an activity entry. */
  async logTime(id: string, hours: number, note: string | null, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const task = await this.findOne(id, scopeTenant);
    if (!(hours > 0)) throw new BadRequestException('Hours must be a positive number');
    task.actualHours = Number(task.actualHours ?? 0) + hours;
    task.updatedBy = userId;
    const saved = await this.taskRepo.save(task);
    await this.logActivity(saved.projectId, 'task.time_logged', `Time logged on ${saved.title}: ${hours}h`, userId, scopeTenant, {
      taskId: saved.id,
      hours,
      note,
    });
    return saved;
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const task = await this.findOne(id, scopeTenant);
    const dependent = await this.dependencyRepo.findOne({ where: { dependsOnTaskId: id, deletedAt: IsNull() } });
    if (dependent) {
      const t = await this.taskRepo.findOne({ where: { id: dependent.taskId, tenantId: scopeTenant, deletedAt: IsNull() } });
      throw new BadRequestException(`Cannot delete: task "${t?.title}" depends on it`);
    }
    // Orphaned subtasks: detach instead of deleting children (T-5)
    await this.taskRepo.update(
      { parentTaskId: id, tenantId: scopeTenant, deletedAt: IsNull() },
      { parentTaskId: null, updatedBy: userId },
    );
    task.deletedAt = new Date();
    task.updatedBy = userId;
    const saved = await this.taskRepo.save(task);
    await this.logActivity(saved.projectId, 'task.deleted', `Task deleted: ${saved.title}`, userId, scopeTenant, { taskId: saved.id });
    return { deleted: true, id };
  }

  /**
   * Rejects moving a task under itself or one of its own descendants
   * (would create a parent/child cycle) or under a task of another project.
   */
  private async assertParentChangeAllowed(taskId: string, newParentId: string | null, tenantId?: string | null): Promise<void> {
    if (!newParentId) return;
    const scopeTenant = this.requireTenant(tenantId);
    if (newParentId === taskId) throw new BadRequestException('A task cannot be its own parent');
    const task = await this.findOne(taskId, scopeTenant);
    const parent = await this.findOne(newParentId, scopeTenant);
    if (parent.projectId !== task.projectId) {
      throw new BadRequestException('Parent task does not belong to this project');
    }
    // Walk up from the new parent — if we reach `taskId` the move is circular.
    let cursor: string | null = newParentId;
    const guard = new Set<string>();
    while (cursor) {
      if (cursor === taskId) throw new BadRequestException('Parent would create a cycle — rejected');
      if (guard.has(cursor)) break;
      guard.add(cursor);
      const row = await this.taskRepo.findOne({ where: { id: cursor, tenantId: scopeTenant, deletedAt: IsNull() } });
      cursor = row?.parentTaskId ?? null;
    }
  }

  /** Rejects completing a task that still has open (non-DONE/CANCELLED) dependencies. */
  private async assertCompletable(task: ProjectTask, tenantId?: string | null): Promise<void> {
    const scopeTenant = this.requireTenant(tenantId);
    const blockers = await this.dependencyRepo.find({
      where: { taskId: task.id, tenantId: scopeTenant, deletedAt: IsNull() },
    });
    if (!blockers.length) return;
    const deps = await this.taskRepo.find({
      where: { id: In(blockers.map((b) => b.dependsOnTaskId)), tenantId: scopeTenant, deletedAt: IsNull() },
    });
    const open = deps.filter((d) => d.status !== TaskStatus.DONE && d.status !== TaskStatus.CANCELLED);
    if (open.length) {
      throw new BadRequestException(
        `Cannot complete: open dependency(s): ${open.map((d) => d.title).join(', ')}`,
      );
    }
  }

  // ── Dependencies (cycle-safe) ──────────────────────────────────────────────

  /** Add a single dependency to an existing task (cycle-safe, same-project enforced). */
  async addDependency(taskId: string, dependsOnTaskId: string, dependencyType: DependencyType | undefined, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const task = await this.findOne(taskId, scopeTenant);
    if (dependsOnTaskId === taskId) throw new BadRequestException('A task cannot depend on itself');
    const target = await this.findOne(dependsOnTaskId, scopeTenant);
    if (target.projectId !== task.projectId) {
      throw new BadRequestException('Dependency target does not belong to this project');
    }
    await this.assertNoCycle(taskId, dependsOnTaskId, scopeTenant);
    const existing = await this.dependencyRepo.findOne({
      where: { taskId, dependsOnTaskId, tenantId: scopeTenant, deletedAt: IsNull() },
    });
    if (!existing) {
      await this.dependencyRepo.save(
        this.dependencyRepo.create({
          taskId,
          dependsOnTaskId,
          dependencyType: dependencyType ?? undefined,
          tenantId: scopeTenant,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        }),
      );
    }
    return { added: true };
  }

  /** Remove a dependency edge. */
  async removeDependency(taskId: string, dependsOnTaskId: string, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { taskId, dependsOnTaskId, tenantId: scopeTenant, deletedAt: IsNull() };
    const dep = await this.dependencyRepo.findOne({ where });
    if (dep) {
      dep.deletedAt = new Date();
      dep.updatedBy = userId ?? null;
      await this.dependencyRepo.save(dep);
    }
    return { removed: true };
  }

  private async addDependencies(taskId: string, dependsOnIds: string[], dependencyType: DependencyType | undefined, tenantId: string) {
    for (const depId of dependsOnIds) {
      if (depId === taskId) throw new BadRequestException('A task cannot depend on itself');
      await this.assertNoCycle(taskId, depId, tenantId);
      const existing = await this.dependencyRepo.findOne({
        where: { taskId, dependsOnTaskId: depId, tenantId, deletedAt: IsNull() },
      });
      if (!existing) {
        await this.dependencyRepo.save(
          this.dependencyRepo.create({
            taskId,
            dependsOnTaskId: depId,
            dependencyType: dependencyType ?? undefined,
            tenantId,
          }),
        );
      }
    }
  }

  private async replaceDependencies(taskId: string, dependsOnIds: string[], dependencyType: DependencyType | undefined, tenantId: string) {
    await this.dependencyRepo.update({ taskId, tenantId, deletedAt: IsNull() }, { deletedAt: new Date() });
    if (dependsOnIds?.length) {
      await this.addDependencies(taskId, dependsOnIds, dependencyType, tenantId);
    }
  }

  /**
   * DFS from `dependsOnTaskId` — if we reach `taskId`, adding the edge
   * would create a cycle. Rejects self-reference too.
   */
  private async assertNoCycle(taskId: string, dependsOnTaskId: string, tenantId: string): Promise<void> {
    const visited = new Set<string>();
    const stack: string[] = [dependsOnTaskId];

    while (stack.length) {
      const current = stack.pop()!;
      if (current === taskId) {
        throw new BadRequestException('Dependency would create a cycle — rejected');
      }
      if (visited.has(current)) continue;
      visited.add(current);
      const edges = await this.dependencyRepo.find({
        where: { taskId: current, tenantId, deletedAt: IsNull() },
      });
      stack.push(...edges.map((e) => e.dependsOnTaskId));
    }
  }

  private async attachDependencies<T extends { id: string }>(tasks: T[], tenantId: string): Promise<T[]> {
    if (!tasks.length) return tasks;
    const edges = await this.dependencyRepo.find({
      where: { taskId: In(tasks.map((t) => t.id)), tenantId, deletedAt: IsNull() },
      take: 2000,
    });
    const byTask = new Map<string, string[]>();
    for (const e of edges) {
      byTask.set(e.taskId, [...(byTask.get(e.taskId) ?? []), e.dependsOnTaskId]);
    }
    return tasks.map((t) => ({ ...t, dependencies: byTask.get(t.id) ?? [] }));
  }

  private async attachSubtasks<T extends { id: string }>(tasks: T[], projectId: string, tenantId: string): Promise<(T & { subtasks: ProjectTask[] })[]> {
    const ids = tasks.map((t) => t.id);
    if (!ids.length) return tasks.map((t) => ({ ...t, subtasks: [] }));
    const subtasks = await this.taskRepo.find({
      where: { projectId, tenantId, parentTaskId: In(ids), deletedAt: IsNull() },
      order: { sortOrder: 'ASC' } as any,
      take: 500,
    });
    const byParent = new Map<string, ProjectTask[]>();
    for (const s of subtasks) {
      byParent.set(s.parentTaskId!, [...(byParent.get(s.parentTaskId!) ?? []), s]);
    }
    return tasks.map((t) => ({ ...t, subtasks: byParent.get(t.id) ?? [] }));
  }

  // ── Comments & attachments ─────────────────────────────────────────────────

  async addComment(taskId: string, body: string, userId: string, userName: string | null, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.findOne(taskId, scopeTenant);
    const comment = this.commentRepo.create({
      taskId,
      body,
      authorId: userId ?? null,
      authorName: userName,
      createdBy: userId ?? null,
      tenantId: scopeTenant,
    });
    return this.commentRepo.save(comment);
  }

  async findComments(taskId: string, tenantId?: string | null) {
    const where: any = { taskId, tenantId: this.requireTenant(tenantId), deletedAt: IsNull() };
    return this.commentRepo.find({ where, order: { createdAt: 'ASC' } as any, take: 500 });
  }

  async addAttachment(
    taskId: string,
    file: { fileName: string; filePath: string; mimeType?: string | null; fileSize?: number },
    userId: string,
    userName: string | null,
    tenantId?: string | null,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const task = await this.findOne(taskId, scopeTenant);
    const attachment = this.attachmentRepo.create({
      taskId,
      fileName: file.fileName,
      filePath: file.filePath,
      mimeType: file.mimeType ?? null,
      fileSize: file.fileSize ?? 0,
      uploadedBy: userId ?? null,
      uploadedByName: userName,
      createdBy: userId ?? null,
      tenantId: scopeTenant,
    });
    const saved = await this.attachmentRepo.save(attachment);
    await this.logActivity(task.projectId, 'task.attachment_added', `Attachment added: ${file.fileName}`, userId, scopeTenant, {
      taskId,
      attachmentId: saved.id,
    });
    return saved;
  }

  async findAttachments(taskId: string, tenantId?: string | null) {
    const where: any = { taskId, tenantId: this.requireTenant(tenantId), deletedAt: IsNull() };
    return this.attachmentRepo.find({ where, order: { createdAt: 'DESC' } as any, take: 200 });
  }

  async removeAttachment(id: string, userId: string, tenantId?: string | null) {
    const where: any = { id, tenantId: this.requireTenant(tenantId), deletedAt: IsNull() };
    const attachment = await this.attachmentRepo.findOne({ where });
    if (!attachment) throw new NotFoundException('Attachment not found');
    attachment.deletedAt = new Date();
    attachment.updatedBy = userId;
    return this.attachmentRepo.save(attachment);
  }

  /** Task activity feed (status changes etc. — derived from project activity). */
  async findActivity(projectId: string, tenantId?: string | null, page = 1, limit = 50) {
    const where: any = { projectId, activityType: Like('task.%'), tenantId: this.requireTenant(tenantId), deletedAt: IsNull() };
    const [data, total] = await this.activityRepo.findAndCount({
      where,
      order: { occurredAt: 'DESC' } as any,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async logActivity(
    projectId: string,
    type: string,
    title: string,
    userId: string,
    tenantId: string,
    metadata?: Record<string, any>,
  ) {
    await this.activityRepo.save(
      this.activityRepo.create({
        projectId,
        activityType: type,
        title,
        actorId: userId ?? null,
        tenantId,
        metadata: metadata ?? null,
      }),
    );
  }
}
