import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, IsNull } from 'typeorm';
import { Project, ProjectStage } from '../entities/project.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../platform/services/notification.service';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

export const PROJECT_WORKFLOW_TYPE = 'project_management';

/**
 * Workflow state → legacy `project.stage` mapping. The stage column remains
 * the stable lifecycle identifier (used by reporting, health and exports);
 * the workflow state is its operational mirror. States without a mapping
 * (e.g. ARCHIVED) leave the stage untouched.
 */
const STAGE_BY_STATE: Partial<Record<string, ProjectStage>> = {
  DRAFT: ProjectStage.ENQUIRY,
  KICKOFF: ProjectStage.PROJECT_CREATED,
  DESIGN: ProjectStage.DESIGN_INITIATED,
  PLANNING: ProjectStage.PROCESS_PLANNING,
  EXECUTION: ProjectStage.MANUFACTURING,
  MONITORING: ProjectStage.CUSTOMER_TRIAL,
  CLOSING: ProjectStage.CUSTOMER_APPROVAL,
  COMPLETED: ProjectStage.DISPATCH,
};

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
 * the workflow instance state. The legacy `stage` column is kept in sync
 * via STAGE_BY_STATE. Nothing is hardcoded.
 */
@Injectable()
export class ProjectWorkflowService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
    private readonly dataSource: DataSource,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly eventBus: DomainEventBus,
  ) {}

  private async findProject(id: string, tenantId?: string | null): Promise<Project> {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const project = await this.projectRepo.findOne({ where });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /**
   * Lazy-initialize the workflow instance if it does not exist yet.
   * When `em` is provided all writes join the caller's transaction.
   */
  private async ensureInstance(
    project: Project,
    actor: WorkflowActor,
    em?: EntityManager,
  ): Promise<any> {
    const tenantId = actor.tenantId ?? project.tenantId;
    const instance = await this.workflowService.findInstanceByEntity(
      'project',
      project.id,
      tenantId ?? undefined,
      em,
    );
    if (!instance) {
      const created = await this.workflowService.createInstance(
        PROJECT_WORKFLOW_TYPE,
        'project',
        project.id,
        {
          userId: actor.userId,
          userRole: actor.userRole,
          userPermissions: actor.userPermissions,
          tenantId: tenantId ?? undefined,
        },
        em,
      );
      const projectRepo = em ? em.getRepository(Project) : this.projectRepo;
      project.workflowInstanceId = created.id;
      project.status = created.currentState?.stateCode ?? project.status;
      await projectRepo.save(project);
      return created;
    }
    return instance;
  }

  /**
   * Return a safe snapshot even when workflow seed data is missing.
   * The project lifecycle still works; only workflow metadata is omitted.
   */
  private async getWorkflowSnapshot(project: Project, actor: WorkflowActor, instance?: any, em?: EntityManager) {
    const tenantId = actor.tenantId ?? project.tenantId;

    const workflowInstance = instance ?? await this.workflowService.findInstanceByEntity(
      'project',
      project.id,
      tenantId ?? undefined,
      em,
    );

    if (!workflowInstance) {
      return {
        workflowType: PROJECT_WORKFLOW_TYPE,
        instanceId: null,
        currentState: null,
        stateEnteredAt: null,
        availableTransitions: [],
        history: [],
      };
    }

    const transitions = await this.workflowService.findTransitionsForState(
      workflowInstance.currentStateId,
      tenantId ?? undefined,
      PROJECT_WORKFLOW_TYPE,
    );
    const history = await this.workflowService.getInstanceHistory(workflowInstance.id, tenantId ?? undefined);

    const visible = transitions.filter((t) => {
      if (t.requiredRoles?.length && !t.requiredRoles.some((r) => actor.userRole.includes(r))) return false;
      if (t.requiredPermissions?.length && !t.requiredPermissions.some((p) => actor.userPermissions.includes(p))) return false;
      return true;
    });

    return {
      workflowType: PROJECT_WORKFLOW_TYPE,
      instanceId: workflowInstance.id,
      currentState: workflowInstance.currentState,
      stateEnteredAt: workflowInstance.stateEnteredAt,
      availableTransitions: visible,
      history,
    };
  }

  /**
   * Public workflow snapshot wrapper.
   */
  async getWorkflow(projectId: string, actor: WorkflowActor): Promise<Record<string, any>> {
    const project = await this.findProject(projectId, actor.tenantId);
    const instance = await this.ensureInstance(project, actor);
    return this.getWorkflowSnapshot(project, actor, instance);
  }

  /**
   * Execute a DB-driven transition on the project workflow.
   *
   * ALL writes (workflow instance + history, project status, activity log,
   * audit record, notification) commit in ONE database transaction — a
   * failure at any step rolls everything back (no partial transitions).
   * Domain events are published only AFTER commit.
   */
  async transition(
    projectId: string,
    transitionId: string,
    actor: WorkflowActor,
    remarks?: string,
  ): Promise<Record<string, any>> {
    const project = await this.findProject(projectId, actor.tenantId);

    const result = await this.dataSource.transaction(async (em) => {
      const instance = await this.ensureInstance(project, actor, em);

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
        em,
      );

      const fromState = updated.history?.[updated.history.length - 1]?.fromState ?? project.status;
      const toState = updated.currentState?.stateCode ?? fromState;

      project.status = toState;
      const nextStage = STAGE_BY_STATE[toState];
      if (nextStage && project.stage !== nextStage) {
        project.stage = nextStage;
        project.stageEnteredAt = new Date();
      }
      if (toState === 'COMPLETED') {
        project.actualEndDate = new Date();
      }
      project.updatedBy = actor.userId;
      await em.getRepository(Project).save(project);

      await em.getRepository(ProjectActivityLog).save(
        em.getRepository(ProjectActivityLog).create({
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
        em,
      );

      if (project.projectManagerId) {
        await this.notificationService.enqueue(
          {
            channel: 'inapp',
            recipient: project.projectManagerId,
            subject: `Project ${project.projectNumber} transitioned: ${fromState} → ${toState}`,
            body: remarks ?? undefined,
            tenantId: project.tenantId ?? null,
          },
          em,
        );
      }

      return {
        project: { id: project.id, status: project.status, actualEndDate: project.actualEndDate },
        transition: { from: fromState, to: toState, transitionId, performedBy: actor.userId, at: new Date() },
        instanceId: updated.id,
      };
    });

    this.eventBus.publish({
      eventType: ProjectDomainEventType.PROJECT_STATUS_CHANGED,
      occurredAt: new Date(),
      projectId,
      tenantId: project.tenantId,
      actorId: actor.userId ?? null,
      payload: { from: result.transition.from, to: result.transition.to, transitionId, remarks },
    });

    return result;
  }
}
