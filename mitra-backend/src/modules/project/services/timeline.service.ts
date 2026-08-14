import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectTask, TaskStatus } from '../entities/projecttask.entity';
import { ProjectMilestone } from '../entities/projectmilestone.entity';
import { TaskDependency } from '../entities/taskdependency.entity';

export interface GanttRow {
  id: string;
  type: 'task' | 'milestone' | 'summary';
  title: string;
  start: string | null;
  end: string | null;
  progressPct: number;
  status: string;
  assigneeName: string | null;
  parentId: string | null;
  dependencies: string[];
  isCritical: boolean;
  sortOrder: number;
}

export interface TimelineResult {
  project: { id: string; projectNumber: string; name: string; startDate: string | null; plannedEndDate: string | null };
  range: { start: string | null; end: string | null };
  rows: GanttRow[];
  links: { from: string; to: string; type: string }[];
  criticalPath: string[];
  criticalPathDurationDays: number | null;
  summary: { tasks: number; milestones: number; openTasks: number; completedTasks: number; delayedMilestones: number };
}

/**
 * Project Timeline service.
 *
 * Produces a Gantt-ready dataset (rows + dependency links), a dependency
 * graph and the critical path via the Critical Path Method (forward and
 * backward pass). Calendar/timeline views are derived from the same data.
 */
@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectTask) private readonly taskRepo: Repository<ProjectTask>,
    @InjectRepository(ProjectMilestone) private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(TaskDependency) private readonly dependencyRepo: Repository<TaskDependency>,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async build(projectId: string, options: { includeTasks?: boolean; includeMilestones?: boolean; criticalPathOnly?: boolean } = {}, tenantId?: string | null): Promise<TimelineResult> {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { id: projectId, deletedAt: IsNull(), tenantId: scopeTenant };
    const project = await this.projectRepo.findOne({ where });
    if (!project) throw new NotFoundException('Project not found');

    const includeTasks = options.includeTasks !== false;
    const includeMilestones = options.includeMilestones !== false;

    const tasks = includeTasks
      ? await this.taskRepo.find({ where: { projectId, deletedAt: IsNull(), tenantId: scopeTenant }, order: { sortOrder: 'ASC' } as any, take: 2000 })
      : [];
    const milestones = includeMilestones
      ? await this.milestoneRepo.find({ where: { projectId, deletedAt: IsNull() }, order: { sequenceNumber: 'ASC' } as any, take: 500 })
      : [];
    const dependencies = includeTasks && tasks.length
      ? await this.dependencyRepo.find({ where: { taskId: In(tasks.map((t) => t.id)), deletedAt: IsNull() }, take: 5000 })
      : [];

    const depsByTask = new Map<string, string[]>();
    for (const d of dependencies) {
      depsByTask.set(d.taskId, [...(depsByTask.get(d.taskId) ?? []), d.dependsOnTaskId]);
    }

    // ── Rows ────────────────────────────────────────────────────────────────
    const rows: GanttRow[] = [];
    const milestoneIdByStage = new Map<string, string>();

    for (const m of milestones) {
      milestoneIdByStage.set(m.milestoneStage, m.id);
      rows.push({
        id: m.id,
        type: 'milestone',
        title: m.milestoneName,
        start: m.plannedDate ? m.plannedDate.toISOString().slice(0, 10) : null,
        end: (m.actualDate ?? m.revisedDate ?? m.plannedDate)?.toISOString?.().slice(0, 10) ?? null,
        progressPct: m.completionPct,
        status: m.status,
        assigneeName: null,
        parentId: null,
        dependencies: m.dependsOnMilestoneId ? [m.dependsOnMilestoneId] : [],
        isCritical: m.isCriticalPath,
        sortOrder: m.sequenceNumber,
      });
    }

    for (const t of tasks) {
      rows.push({
        id: t.id,
        type: 'task',
        title: t.title,
        start: t.startDate ? t.startDate.toISOString().slice(0, 10) : null,
        end: (t.completedAt ?? t.dueDate)?.toISOString?.().slice(0, 10) ?? null,
        progressPct: t.progressPct,
        status: t.status,
        assigneeName: t.assigneeName,
        parentId: t.parentTaskId,
        dependencies: depsByTask.get(t.id) ?? [],
        isCritical: false, // assigned by CPM below
        sortOrder: t.sortOrder,
      });
    }

    // ── Dependency graph + critical path (CPM) ──────────────────────────────
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const byParent = new Map<string, ProjectTask[]>();
    const graph = new Map<string, string[]>();
    for (const t of tasks) {
      if (t.parentTaskId) {
        byParent.set(t.parentTaskId, [...(byParent.get(t.parentTaskId) ?? []), t]);
      }
      graph.set(t.id, depsByTask.get(t.id) ?? []);
    }

    const critical = this.computeCriticalPath(tasks, graph, byParent);
    const criticalIds = new Set(critical.path);
    for (const row of rows) {
      if (row.type === 'task' && criticalIds.has(row.id)) row.isCritical = true;
    }

    // ── Links (for Gantt renderers) ─────────────────────────────────────────
    const links: { from: string; to: string; type: string }[] = [];
    for (const d of dependencies) {
      links.push({ from: d.dependsOnTaskId, to: d.taskId, type: d.dependencyType });
    }

    const allRows = options.criticalPathOnly ? rows.filter((r) => r.isCritical || r.type === 'milestone') : rows;

    // ── Range ───────────────────────────────────────────────────────────────
    const dates = allRows
      .map((r) => [r.start, r.end])
      .flat()
      .filter((d): d is string => !!d)
      .concat(project.startDate ? [project.startDate.toISOString().slice(0, 10)] : [])
      .concat(project.plannedEndDate ? [project.plannedEndDate.toISOString().slice(0, 10)] : []);
    const range = dates.length
      ? { start: dates.sort()[0], end: dates.sort()[dates.length - 1] }
      : { start: null, end: null };

    return {
      project: {
        id: project.id,
        projectNumber: project.projectNumber,
        name: project.name,
        startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : null,
        plannedEndDate: project.plannedEndDate ? project.plannedEndDate.toISOString().slice(0, 10) : null,
      },
      range,
      rows: allRows,
      links,
      criticalPath: critical.path,
      criticalPathDurationDays: critical.durationDays,
      summary: {
        tasks: tasks.length,
        milestones: milestones.length,
        openTasks: tasks.filter((t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED).length,
        completedTasks: tasks.filter((t) => t.status === TaskStatus.DONE).length,
        delayedMilestones: milestones.filter((m) => m.status === 'DELAYED').length,
      },
    };
  }

  /**
   * Critical Path Method on the task graph.
   * Forward pass: earliest start/finish. Backward pass: latest start/finish.
   * Tasks on the critical path have zero float.
   * Sub-task chains (parent → child) are treated as hard links.
   */
  private computeCriticalPath(
    tasks: ProjectTask[],
    graph: Map<string, string[]>,
    byParent: Map<string, ProjectTask[]>,
  ): { path: string[]; durationDays: number | null } {
    if (!tasks.length) return { path: [], durationDays: null };

    const duration = (t: ProjectTask): number => {
      const start = t.startDate ? new Date(t.startDate).getTime() : 0;
      const end = (t.dueDate ?? t.startDate) ? new Date(t.dueDate ?? t.startDate!).getTime() : start;
      return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24))) + 1;
    };

    // Predecessors: task → list of tasks it depends on (or children it blocks)
    const predecessors = new Map<string, string[]>();
    for (const [taskId, deps] of graph) {
      for (const dep of deps) {
        predecessors.set(dep, [...(predecessors.get(dep) ?? []), taskId]);
      }
    }
    for (const [parentId, children] of byParent) {
      for (const child of children) {
        predecessors.set(child.id, [...(predecessors.get(child.id) ?? []), parentId]);
      }
    }

    const ids = tasks.map((t) => t.id);
    const idSet = new Set(ids);

    // Forward pass (topological with cycle safety)
    const es = new Map<string, number>(); // earliest start
    const ef = new Map<string, number>(); // earliest finish
    const durationMap = new Map(tasks.map((t) => [t.id, duration(t)]));
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const visit = (id: string): number => {
      if (ef.has(id)) return ef.get(id)!;
      if (inStack.has(id)) return durationMap.get(id) ?? 0; // cycle guard
      inStack.add(id);
      const deps = (graph.get(id) ?? []).filter((d) => idSet.has(d));
      const children = (byParent.get(id) ?? []).map((c) => c.id).filter((c) => idSet.has(c));
      let latest = 0;
      for (const d of [...deps, ...children]) {
        latest = Math.max(latest, visit(d));
      }
      const start = latest;
      const finish = start + (durationMap.get(id) ?? 0);
      es.set(id, start);
      ef.set(id, finish);
      inStack.delete(id);
      return finish;
    };

    for (const id of ids) visit(id);

    // Backward pass
    const projectFinish = Math.max(...ids.map((id) => ef.get(id) ?? 0));
    const ls = new Map<string, number>();
    const lf = new Map<string, number>();

    const visitLate = (id: string): number => {
      if (lf.has(id)) return lf.get(id)!;
      if (inStack.has(id)) return projectFinish;
      inStack.add(id);
      const successors = (predecessors.get(id) ?? []).filter((s) => idSet.has(s));
      const latest = successors.length
        ? Math.min(...successors.map((s) => visitLate(s)))
        : projectFinish;
      const finish = latest;
      const start = finish - (durationMap.get(id) ?? 0);
      ls.set(id, start);
      lf.set(id, finish);
      inStack.delete(id);
      return start;
    };

    for (const id of ids) visitLate(id);

    // Zero-float tasks = critical path
    const criticalIds = ids.filter((id) => (ls.get(id) ?? 0) === (es.get(id) ?? 0));
    const criticalSet = new Set(criticalIds);

    // Path ordering: topological by dependencies
    const order = this.topoOrder(tasks, graph);
    const path = order.filter((id) => criticalSet.has(id));

    return { path, durationDays: projectFinish };
  }

  private topoOrder(tasks: ProjectTask[], graph: Map<string, string[]>): string[] {
    const indegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const t of tasks) {
      indegree.set(t.id, 0);
      adj.set(t.id, []);
    }
    for (const [taskId, deps] of graph) {
      for (const dep of deps) {
        if (!indegree.has(dep)) continue;
        adj.set(dep, [...(adj.get(dep) ?? []), taskId]);
        indegree.set(taskId, (indegree.get(taskId) ?? 0) + 1);
      }
    }
    const queue = [...indegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
    const result: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      result.push(id);
      for (const next of adj.get(id) ?? []) {
        indegree.set(next, (indegree.get(next) ?? 0) - 1);
        if (indegree.get(next) === 0) queue.push(next);
      }
    }
    return result;
  }
}
