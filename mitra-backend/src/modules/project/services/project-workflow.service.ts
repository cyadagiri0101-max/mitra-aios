import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

export const PROJECT_WORKFLOW_TYPE = 'project_management';

export interface WorkflowActor {
  userId: string;
  userRole: string[];
  userPermissions: string[];
  tenantId?: string | null;
  name?: string;
}

/**
 * Project Workflow Engine.
 *
 * All transitions are database-driven: the workflow_states /
 * workflow_transitions tables define the graph, role/permission gates are
 * enforced by the engine, and the project's `status` column always mirrors
 * the workflow instance state. Nothing is hardcoded.
 */
@Injectable()
export class ProjectWorkflowService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly eventBus: DomainEventBus,
  ) {}

  private async findProject(id: string, tenantId?: string | null): Promise<Project> {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const project = await this.projectRepo.findOne({ where });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /** Lazy-initialize the workflow instance if it does not exist yet. */
  private async ensureInstance(project: Project, actor: WorkflowActor): Promise<any> {
    const tenantId = actor.tenantId ?? project.tenantId;
    let instance = await this.workflowService.findInstanceByEntity('project', project.id, tenantId ?? undefined);
    if (!instance) {
      instance = await this.workflowService.createInstance(PROJECT_WORKFLOW_TYPE, 'project', project.id, {
        userId: actor.userId,
        userRole: actor.userRole,
        userPermissions: actor.userPermissions,
        tenantId: tenantId ?? undefined,
      });
      project.workflowInstanceId = instance.id;
      project.status = instance.currentState?.stateCode ?? project.status;
      await this.projectRepo.save(project);
    }
    return instance;
  }

  /**
   * Full workflow snapshot: instance, current state, allowed outgoing
   * transitions and history. The client renders the state machine from data.
   */
  async getWorkflow(projectId: string, actor: WorkflowActor): Promise<Record<string, any>> {
    const project = await this.findProject(projectId, actor.tenantId);
    const instance = await this.ensureInstance(project, actor);

    const transitions = await this.workflowService.findTransitionsForState(
      instance.currentStateId,
      actor.tenantId ?? undefined,
      PROJECT_WORKFLOW_TYPE,
    );
    const history = await this.workflowService.getInstanceHistory(instance.id, actor.tenantId ?? undefined);

    const visible = transitions.filter((t) => {
      if (t.requiredRoles?.length && !t.requiredRoles.some((r) => actor.userRole.includes(r))) return false;
      if (t.requiredPermissions?.length && !t.requiredPermissions.some((p) => actor.userPermissions.includes(p))) return false;
      return true;
    });

    return {
      workflowType: PROJECT_WORKFLOW_TYPE,
      instanceId: instance.id,
      currentState: instance.currentState,
      stateEnteredAt: instance.stateEnteredAt,
      availableTransitions: visible,
      history,
    };
  }

  /**
   * Execute a DB-driven transition on the project workflow.
   * The project status is synced and the transition is fully auditable.
   */
  async transition(
    projectId: string,
    transitionId: string,
    actor: WorkflowActor,
    remarks?: string,
  ): Promise<Record<string, any>> {
    const project = await this.findProject(projectId, actor.tenantId);
    const instance = await this.ensureInstance(project, actor);

    const updated = await this.workflowService.executeTransition(
      instance.id,
      transitionId,
      {
        userId: actor.userId,
        userRole: actor.userRole,
        userPermissions: actor.userPermissions,
        tenantId: actor.tenantId ?? project.tenantId ?? undefined,
        remarks,
      },
    );

    const fromState = updated.history?.[updated.history.length - 1]?.fromState ?? project.status;
    const toState = updated.currentState?.stateCode ?? fromState;

    project.status = toState;
    if (toState === 'COMPLETED') {
      project.actualEndDate = new Date();
    }
    project.updatedBy = actor.userId;
    await this.projectRepo.save(project);

    await this.activityRepo.save(
      this.activityRepo.create({
        projectId,
        activityType: 'project.status_changed',
        title: `Status changed to ${toState}`,
        description: remarks ?? `Transitioned from ${fromState} to ${toState}`,
        actorId: actor.userId ?? null,
        actorName: actor.name ?? null,
        tenantId: project.tenantId ?? undefined,
        metadata: { fromState, toState, transitionId },
      }),
    );

    await this.auditService.logBusinessEvent(
      'project.workflow.transition',
      'Project',
      projectId,
      actor.userId ?? 'system',
      { fromState, toState, transitionId, remarks, tenantId: project.tenantId },
    );

    this.eventBus.publish({
      eventType: ProjectDomainEventType.PROJECT_STATUS_CHANGED,
      occurredAt: new Date(),
      projectId,
      tenantId: project.tenantId,
      actorId: actor.userId ?? null,
      payload: { fromState, toState, transitionId, remarks },
    });

    return {
      project: { id: project.id, status: project.status, actualEndDate: project.actualEndDate },
      transition: { from: fromState, to: toState, transitionId, performedBy: actor.userId, at: new Date() },
      instanceId: updated.id,
    };
  }
}
