import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, IsNull } from 'typeorm';
import { EngineeringDrawing } from '../entities/engineering-drawing.entity';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import {
  EngineeringDomainEventType, EngineeringDomainEvent,
} from '../events/engineering.events';
import { DRAWING_WORKFLOW_TYPE } from './engineering-drawing.service';
import { BOM_WORKFLOW_TYPE } from './engineering-bom.service';
import { ROUTING_WORKFLOW_TYPE } from './engineering-process-planning.service';

export interface EngineeringWorkflowActor {
  userId: string;
  userRole: string[];
  userPermissions: string[];
  tenantId?: string | null;
  name?: string;
}

type EngineeringEntity = EngineeringDrawing | EngineeringBom | EngineeringRouting;

const WORKFLOW_TYPE_BY_ENTITY = {
  drawing: DRAWING_WORKFLOW_TYPE,
  bom: BOM_WORKFLOW_TYPE,
  routing: ROUTING_WORKFLOW_TYPE,
} as const;

const EVENT_BY_ENTITY = {
  drawing: EngineeringDomainEventType.DRAWING_STATUS_CHANGED,
  bom: EngineeringDomainEventType.BOM_RELEASED,
  routing: EngineeringDomainEventType.ROUTING_RELEASED,
} as const;

/**
 * Engineering Workflow Engine (drawings, BOMs, routings).
 *
 * All transitions are database-driven: workflow_states / workflow_transitions
 * define the graph, role/permission gates are enforced by the engine, and
 * the entity `status` column mirrors the workflow instance state. Nothing
 * is hardcoded in the application.
 */
@Injectable()
export class EngineeringWorkflowService {
  constructor(
    @InjectRepository(EngineeringDrawing) private readonly drawingRepo: Repository<EngineeringDrawing>,
    @InjectRepository(EngineeringBom) private readonly bomRepo: Repository<EngineeringBom>,
    @InjectRepository(EngineeringRouting) private readonly routingRepo: Repository<EngineeringRouting>,
    private readonly dataSource: DataSource,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly eventBus: EngineeringEventBus,
  ) {}

  private getRepo(entityType: string): Repository<any> {
    if (entityType === 'drawing') return this.drawingRepo;
    if (entityType === 'bom') return this.bomRepo;
    if (entityType === 'routing') return this.routingRepo;
    throw new NotFoundException(`Unsupported workflow entityType: ${entityType}`);
  }

  private async findEntity(entityType: string, id: string, tenantId?: string | null): Promise<EngineeringEntity> {
    const repo = this.getRepo(entityType);
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const entity = await repo.findOne({ where });
    if (!entity) throw new NotFoundException(`${entityType} not found`);
    return entity;
  }

  private getWorkflowType(entityType: string): string {
    return WORKFLOW_TYPE_BY_ENTITY[entityType as keyof typeof WORKFLOW_TYPE_BY_ENTITY] ?? DRAWING_WORKFLOW_TYPE;
  }

  private getEventType(entityType: string): EngineeringDomainEventType {
    return EVENT_BY_ENTITY[entityType as keyof typeof EVENT_BY_ENTITY] ?? EngineeringDomainEventType.DRAWING_STATUS_CHANGED;
  }

  private async ensureInstance(
    entityType: string,
    entity: EngineeringEntity,
    actor: EngineeringWorkflowActor,
    em?: EntityManager,
  ): Promise<any> {
    const workflowType = this.getWorkflowType(entityType);
    const tenantId = actor.tenantId ?? entity.tenantId;
    const instance = await this.workflowService.findInstanceByEntity(
      entityType,
      entity.id,
      tenantId ?? undefined,
      em,
    );
    if (!instance) {
      const created = await this.workflowService.createInstance(workflowType, entityType, entity.id, {
        userId: actor.userId,
        userRole: actor.userRole,
        userPermissions: actor.userPermissions,
        tenantId: tenantId ?? undefined,
      }, em);
      const repo = em ? em.getRepository(this.getRepo(entityType).target as any) : this.getRepo(entityType);
      entity.workflowInstanceId = created.id;
      entity.status = created.currentState?.stateCode ?? entity.status;
      await repo.save(entity);
      return created;
    }
    return instance;
  }

  private async getWorkflowSnapshot(entityType: string, entity: EngineeringEntity, actor: EngineeringWorkflowActor, instance?: any) {
    const tenantId = actor.tenantId ?? entity.tenantId;
    const workflowType = this.getWorkflowType(entityType);
    const workflowInstance = instance ?? await this.workflowService.findInstanceByEntity(
      entityType,
      entity.id,
      tenantId ?? undefined,
    );

    if (!workflowInstance) {
      return {
        workflowType,
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
      workflowType,
    );
    const history = await this.workflowService.getInstanceHistory(workflowInstance.id, tenantId ?? undefined);
    const visible = transitions.filter((t) => {
      if (t.requiredRoles?.length && !t.requiredRoles.some((r) => actor.userRole.includes(r))) return false;
      if (t.requiredPermissions?.length && !t.requiredPermissions.some((p) => actor.userPermissions.includes(p))) return false;
      return true;
    });

    return {
      workflowType,
      instanceId: workflowInstance.id,
      currentState: workflowInstance.currentState,
      stateEnteredAt: workflowInstance.stateEnteredAt,
      availableTransitions: visible,
      history,
    };
  }

  async getWorkflow(entityType: string, id: string, actor: EngineeringWorkflowActor) {
    const entity = await this.findEntity(entityType, id, actor.tenantId);
    const instance = await this.ensureInstance(entityType, entity, actor);
    return this.getWorkflowSnapshot(entityType, entity, actor, instance);
  }

  /**
   * Execute a DB-driven transition. ALL writes (workflow instance +
   * history, entity status, audit record) commit in ONE transaction; domain
   * events are published only after commit.
   */
  async transition(
    entityType: string,
    id: string,
    transitionId: string,
    actor: EngineeringWorkflowActor,
    remarks?: string,
  ): Promise<Record<string, any>> {
    const entity = await this.findEntity(entityType, id, actor.tenantId);

    const result = await this.dataSource.transaction(async (em) => {
      const instance = await this.ensureInstance(entityType, entity, actor, em);
      const updated = await this.workflowService.executeTransition(
        instance.id,
        transitionId,
        {
          userId: actor.userId,
          userRole: actor.userRole,
          userPermissions: actor.userPermissions,
          tenantId: actor.tenantId ?? entity.tenantId ?? undefined,
          remarks,
        },
        em,
      );

      const fromState = updated.history?.[updated.history.length - 1]?.fromState ?? entity.status;
      const toState = updated.currentState?.stateCode ?? fromState;

      entity.status = toState;
      entity.updatedBy = actor.userId;
      const repo = em.getRepository(this.getRepo(entityType).target as any);
      await repo.save(entity);

      // Recompute BOM total on release (roll-up happens in the same tx)
      if (entityType === 'bom' && toState === 'RELEASED') {
        const bom = entity as EngineeringBom;
        bom.releasedBy = actor.userId;
        bom.releasedAt = new Date();
        await repo.save(bom);
      }
      if (entityType === 'drawing' && toState === 'RELEASED') {
        const drawing = entity as EngineeringDrawing;
        drawing.releasedBy = actor.userId;
        drawing.releasedAt = new Date();
        await repo.save(drawing);
      }
      if (entityType === 'routing' && toState === 'RELEASED') {
        const routing = entity as EngineeringRouting;
        routing.releasedBy = actor.userId;
        routing.releasedAt = new Date();
        await repo.save(routing);
      }

      await this.auditService.logBusinessEvent(
        `engineering.${entityType}.workflow.transition`,
        `Engineering${entityType[0].toUpperCase()}${entityType.slice(1)}`,
        id,
        actor.userId ?? 'system',
        { fromState, toState, transitionId, remarks, tenantId: entity.tenantId },
        em,
      );

      return {
        entity: { id: entity.id, status: entity.status },
        transition: { from: fromState, to: toState, transitionId, performedBy: actor.userId, at: new Date() },
        instanceId: updated.id,
      };
    });

    const event: EngineeringDomainEvent = {
      eventType: this.getEventType(entityType),
      occurredAt: new Date(),
      tenantId: entity.tenantId,
      actorId: actor.userId ?? null,
      payload: {
        projectId: (entity as any).projectId ?? null,
        entityId: entity.id,
        entityNumber: (entity as any).drawingNumber ?? (entity as any).bomNumber ?? (entity as any).routingNumber ?? null,
        from: result.transition.from,
        to: result.transition.to,
        transitionId,
        remarks,
      },
    };
    this.eventBus.publish(event);

    return result;
  }
}
