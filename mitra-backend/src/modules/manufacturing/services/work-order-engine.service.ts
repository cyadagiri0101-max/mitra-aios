import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkOrder, WorkOrderStatus } from '../entities/workorder.entity';
import { JobCard, JobCardStatus } from '../entities/jobcard.entity';
import { MaterialReservation } from '../entities/material-reservation.entity';
import { InspectionCheckpoint, CheckpointStatus } from '../entities/inspection-checkpoint.entity';
import { WorkflowService } from '@modules/workflow/services/workflow.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { WorkOrderService } from './workorder.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { WORK_ORDER_TRANSITIONS, WORK_ORDER_WORKFLOW_TYPE, JOB_WORKFLOW_TYPE } from '../manufacturing.constants';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Sprint 2.4 MES — Work Order Engine (Phase 2/3).
 *
 * A work order is generated from released Engineering artifacts and becomes
 * an immutable execution package on RELEASE:
 *   • snapshot of drawing / BOM / routing / process-plan revisions (jsonb)
 *   • cost baseline from the released routing
 *   • job cards created per routing operation
 *   • material reservations from the released BOM items
 *   • inspection checkpoints from routing quality checkpoints
 *   • trace edges written to engineering_trace_edges
 *
 * State transitions run through the existing DB-driven workflow engine
 * (manufacturing_work_order). No second event mechanism — every transition
 * appends a transactional outbox row.
 */
@Injectable()
export class WorkOrderEngineService {
  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(MaterialReservation)
    private readonly reservationRepo: Repository<MaterialReservation>,
    @InjectRepository(InspectionCheckpoint)
    private readonly checkpointRepo: Repository<InspectionCheckpoint>,
    private readonly dataSource: DataSource,
    private readonly workOrderService: WorkOrderService,
    private readonly workflowService: WorkflowService,
    private readonly outboxService: OutboxService,
  ) {}

  // ── Generation (Phase 2) ─────────────────────────────────────────────────
  /** Generate a DRAFT work order from released artifacts. */
  async generateFromArtifacts(data: Record<string, unknown>, user: AuthUser) {
    if (!data.routingId) {
      throw new BadRequestException('A released routing is required to generate a work order');
    }
    const routing = await this.workOrderService.assertReleased('engineering_routings', data.routingId, 'Routing', user.tenantId);

    const generated: Record<string, unknown> = {
      ...data,
      partName: (data.partName as string) ?? routing.part_number ?? 'Part',
      operationType: (data.operationType as string) ?? 'MANUFACTURING',
      status: 'DRAFT',
      costBaseline: data.costBaseline ?? routing.total_cost ?? 0,
      estimatedHours: data.estimatedHours ?? routing.total_standard_hours,
      snapshot: {
        generatedAt: new Date().toISOString(),
        routing: {
          id: routing.id,
          routingNumber: routing.routing_number,
          version: routing.version,
          totalCost: routing.total_cost,
        },
      },
    };
    return this.workOrderService.create(generated, user.id, user.tenantId);
  }

  // ── Release (Phase 2) — immutable execution package ─────────────────────
  async release(workOrderId: string, user: AuthUser) {
    const tenantId = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const wo = await em.getRepository(WorkOrder).findOne({
        where: { id: workOrderId, tenantId, deletedAt: undefined },
      });
      if (!wo) throw new NotFoundException('Work order not found');
      if (wo.status !== WorkOrderStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT work orders can be released');
      }

      const ctx = this.buildContext(user);
      const instance = await this.workflowService.findInstanceByEntity('work_order', wo.id, tenantId, em)
        ?? await this.workflowService.createInstance(WORK_ORDER_WORKFLOW_TYPE, 'work_order', wo.id, ctx, em);
      const transition = await this.workflowService.executeTransition(instance.id, WORK_ORDER_TRANSITIONS.RELEASE, ctx, em);

      const snapshot = await this.buildSnapshot(wo, em);
      const costBaseline = snapshot.routing?.totalCost ?? wo.costBaseline ?? 0;

      await em.getRepository(WorkOrder).update(wo.id, {
        status: WorkOrderStatus.RELEASED,
        snapshot: snapshot as unknown as Record<string, any>,
        costBaseline,
        releasedBy: user.id,
        releasedAt: new Date(),
        updatedBy: user.id,
      });

      await this.generateJobCards(wo, snapshot, user, em).then(async (jobs) => {
        for (const job of jobs) {
          await this.workflowService.createInstance(JOB_WORKFLOW_TYPE, 'job_card', job.id, ctx, em);
        }
      });
      await this.generateReservations(wo, snapshot, user, em);
      await this.generateCheckpoints(wo, snapshot, user, em);
      await this.writeTraceEdges(wo, em);

      await this.outboxService.append(
        EngineeringDomainEventType.WORK_ORDER_RELEASED,
        'work_order',
        wo.id,
        {
          projectId: wo.projectId,
          entityId: wo.id,
          entityNumber: wo.woNumber,
          routingId: wo.routingId,
          bomId: wo.bomId,
          drawingId: wo.drawingId,
          costBaseline,
        },
        { tenantId: user.tenantId, actorId: user.id, em },
      );

      return {
        id: wo.id,
        status: 'RELEASED',
        snapshot,
        costBaseline,
        transition: { from: transition.history?.[transition.history.length - 1]?.fromState ?? 'DRAFT', to: transition.currentState.stateCode },
      };
    });
  }

  // ── Transitions (Phase 3) — Start / Pause / Resume / Hold / Complete / Cancel / Rework / Scrap
  async transition(workOrderId: string, transitionKey: keyof typeof WORK_ORDER_TRANSITIONS, user: AuthUser, remarks?: string) {
    const transitionId = WORK_ORDER_TRANSITIONS[transitionKey];
    if (!transitionId) throw new BadRequestException(`Unknown work order transition: ${String(transitionKey)}`);
    const tenantId = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const wo = await em.getRepository(WorkOrder).findOne({
        where: { id: workOrderId, tenantId, deletedAt: undefined },
      });
      if (!wo) throw new NotFoundException('Work order not found');

      const ctx = this.buildContext(user);
      const instance = await this.workflowService.findInstanceByEntity('work_order', wo.id, tenantId, em);
      if (!instance) throw new BadRequestException('Work order workflow instance not found — release the work order first');
      const transition = await this.workflowService.executeTransition(
        instance.id,
        transitionId,
        { ...ctx, remarks },
        em,
      );
      const toState = transition.currentState.stateCode as WorkOrderStatus;

      const patch: Record<string, unknown> = { status: toState, updatedBy: user.id };
      if (toState === WorkOrderStatus.IN_PROGRESS && !wo.actualStartDate) {
        patch.actualStartDate = new Date();
      }
      if (toState === WorkOrderStatus.COMPLETED) {
        patch.actualEndDate = new Date();
        const jobCards = await em.getRepository(JobCard).find({ where: { workOrderId: wo.id, tenantId, deletedAt: undefined } });
        patch.completedQty = jobCards.reduce((s, j) => s + Number(j.producedQty || 0) - Number(j.rejectedQty || 0) - Number(j.scrapQty || 0), 0);
        patch.actualHours = jobCards.reduce((s, j) => s + Number(j.actualHours || 0), 0);
        await em.getRepository(MaterialReservation).update(
          { workOrderId: wo.id, tenantId },
          { status: 'RELEASED' as any, updatedBy: user.id },
        );
      }
      await em.getRepository(WorkOrder).update(wo.id, patch);

      const eventMap: Record<string, EngineeringDomainEventType> = {
        RELEASED: EngineeringDomainEventType.WORK_ORDER_RELEASED,
        IN_PROGRESS: EngineeringDomainEventType.WORK_ORDER_STARTED,
        PAUSED: EngineeringDomainEventType.WORK_ORDER_PAUSED,
        ON_HOLD: EngineeringDomainEventType.WORK_ORDER_HOLD,
        COMPLETED: EngineeringDomainEventType.WORK_ORDER_COMPLETED,
        CANCELLED: EngineeringDomainEventType.WORK_ORDER_CANCELLED,
        REWORK: EngineeringDomainEventType.WORK_ORDER_REWORK,
        SCRAPPED: EngineeringDomainEventType.WORK_ORDER_SCRAPPED,
      };
      const eventType = eventMap[toState];
      if (eventType) {
        await this.outboxService.append(eventType, 'work_order', wo.id, {
          projectId: wo.projectId,
          entityId: wo.id,
          entityNumber: wo.woNumber,
          remarks,
        }, { tenantId: user.tenantId, actorId: user.id, em });
      }

      return {
        id: wo.id,
        status: toState,
        transition: { from: transition.history?.[transition.history.length - 1]?.fromState ?? wo.status, to: transition.currentState.stateCode },
        completedQty: patch.completedQty ?? wo.completedQty,
      };
    });
  }

  // ── Reads ────────────────────────────────────────────────────────────────
  async listJobCards(workOrderId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    return this.jobCardRepo.find({
      where: { workOrderId, tenantId: scopeTenant, deletedAt: undefined },
      order: { operationNumber: 'ASC', createdAt: 'ASC' } as any,
    });
  }

  async listReservations(workOrderId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    return this.reservationRepo.find({ where: { workOrderId, tenantId: scopeTenant, deletedAt: undefined } });
  }

  async listCheckpoints(workOrderId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    return this.checkpointRepo.find({
      where: { workOrderId, tenantId: scopeTenant, deletedAt: undefined },
      order: { operationNumber: 'ASC', checkpointNumber: 'ASC' } as any,
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  /** Fail-closed tenant guard - mirrors TenantAwareService.requireTenant. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  private buildContext(user: AuthUser) {
    return {
      userId: user.id,
      userRole: [user.role],
      userPermissions: user.permissions ?? [],
      tenantId: user.tenantId ?? undefined,
    };
  }

  private async buildSnapshot(wo: WorkOrder, em: any) {
    const sql = async (table: string, id: string | null) => {
      if (!id) return null;
      const rows = await em.query(`SELECT * FROM "${table}" WHERE id = $1 AND deleted_at IS NULL`, [id]);
      return rows?.[0] ?? null;
    };

    const drawing = await sql('engineering_drawings', wo.drawingId);
    let drawingRevision = null;
    if (drawing?.current_revision) {
      const rows = await em.query(
        `SELECT revision, version_number, status, released_at FROM engineering_drawing_revisions
         WHERE drawing_id = $1 AND revision = $2 AND deleted_at IS NULL ORDER BY version_number DESC LIMIT 1`,
        [wo.drawingId, drawing.current_revision],
      );
      drawingRevision = rows?.[0] ?? null;
    }

    const bom = await sql('engineering_boms', wo.bomId);
    let bomRevision = null;
    if (bom?.revision) {
      const rows = await em.query(
        `SELECT revision, version_number, total_cost, released_at FROM engineering_bom_revisions
         WHERE bom_id = $1 AND revision = $2 AND deleted_at IS NULL ORDER BY version_number DESC LIMIT 1`,
        [wo.bomId, bom.revision],
      );
      bomRevision = rows?.[0] ?? null;
    }

    const routing = await sql('engineering_routings', wo.routingId);
    let routingRevision = null;
    if (routing?.version) {
      const rows = await em.query(
        `SELECT version, snapshot, change_summary, released_at FROM engineering_routing_revisions
         WHERE routing_id = $1 AND version = $2 AND deleted_at IS NULL LIMIT 1`,
        [wo.routingId, routing.version],
      );
      routingRevision = rows?.[0] ?? null;
    }

    const processPlan = await sql('process_plans', wo.processPlanId);

    let operations: any[] = [];
    if (wo.routingId) {
      operations = await em.query(
        `SELECT id, operation_number, operation_code, description, work_center_id, machine_id,
                setup_time_minutes, cycle_time_minutes, standard_time_minutes, quantity_per_cycle,
                cost_per_hour, operation_cost, predecessor_operation_id, inspection_required,
                tool_requirements, material_requirements, quality_checkpoints
         FROM engineering_operations
         WHERE routing_id = $1 AND deleted_at IS NULL ORDER BY operation_number ASC`,
        [wo.routingId],
      );
    }

    return {
      capturedAt: new Date().toISOString(),
      drawing: drawing ? { id: drawing.id, drawingNumber: drawing.drawing_number, title: drawing.title, currentRevision: drawing.current_revision } : null,
      drawingRevision,
      bom: bom ? { id: bom.id, bomNumber: bom.bom_number, name: bom.name, revision: bom.revision, versionNumber: bom.version_number, totalCost: bom.total_cost } : null,
      bomRevision,
      routing: routing ? { id: routing.id, routingNumber: routing.routing_number, name: routing.name, version: routing.version, totalCost: routing.total_cost } : null,
      routingRevision,
      processPlan: processPlan ? { id: processPlan.id, planNumber: processPlan.plan_number, planVersion: processPlan.plan_version } : null,
      operations,
      bomItems: wo.bomId
        ? await em.query(
            `SELECT id, parent_item_id, line_number, part_number, part_name, item_type, source_type,
                    quantity, quantity_per, uom, unit_cost, extended_cost, drawing_id, effective_from, effective_to
             FROM engineering_bom_items
             WHERE bom_id = $1 AND deleted_at IS NULL ORDER BY sort_order ASC, line_number ASC`,
            [wo.bomId],
          )
        : [],
    };
  }

  private async generateJobCards(wo: WorkOrder, snapshot: any, user: AuthUser, em: any): Promise<JobCard[]> {
    if (!snapshot.operations?.length) return [];
    const repo = em.getRepository(JobCard);
    const prefix = `JC-${wo.woNumber.replace(/\s/g, '')}-`;
    const jobs = snapshot.operations.map((op: any, idx: number) => ({
      jobCardNumber: `${prefix}${idx + 1}`,
      workOrderId: wo.id,
      operationId: op.id,
      operationNumber: op.operation_number,
      operationCode: op.operation_code,
      machineId: op.machine_id ?? wo.machineId,
      operatorId: wo.operatorId,
      plannedDate: wo.plannedStartDate,
      plannedHours: op.standard_time_minutes ? Number(op.standard_time_minutes) / 60 : null,
      qtyPlanned: wo.plannedQty,
      status: JobCardStatus.OPEN,
      createdBy: user.id,
      updatedBy: user.id,
      tenantId: wo.tenantId,
    }));
    return repo.save(repo.create(jobs as any[])) as unknown as Promise<JobCard[]>;
  }

  private async generateReservations(wo: WorkOrder, snapshot: any, user: AuthUser, em: any) {
    const items = snapshot.bomItems ?? [];
    if (!items.length) return;
    const repo = em.getRepository(MaterialReservation);
    const prefix = `RES-${wo.woNumber.replace(/\s/g, '')}-`;
    const reservations = items.map((item: any, idx: number) => {
      const plannedQty = Number(item.quantity ?? item.quantity_per ?? 0) * Number(wo.plannedQty ?? 1);
      return {
        reservationNumber: `${prefix}${idx + 1}`,
        workOrderId: wo.id,
        bomItemId: item.id,
        partNumber: item.part_number,
        partName: item.part_name,
        uom: item.uom ?? 'KG',
        plannedQty,
        reservedQty: plannedQty,
        issuedQty: 0,
        status: 'RESERVED',
        createdBy: user.id,
        updatedBy: user.id,
        tenantId: wo.tenantId,
      };
    });
    await repo.save(repo.create(reservations as any[]));
  }

  private async generateCheckpoints(wo: WorkOrder, snapshot: any, user: AuthUser, em: any) {
    const repo = em.getRepository(InspectionCheckpoint);
    const rows: any[] = [];
    for (const op of snapshot.operations ?? []) {
      const qcs = Array.isArray(op.quality_checkpoints) ? op.quality_checkpoints : [];
      qcs.forEach((qc: any, idx: number) => {
        rows.push({
          checkpointNumber: `${String(op.operation_number ?? '').padStart(2, '0')}.${idx + 1}`,
          workOrderId: wo.id,
          operationId: op.id,
          operationNumber: op.operation_number,
          operationCode: op.operation_code,
          checkpointName: qc.name ?? qc.checkpoint ?? `Checkpoint ${idx + 1}`,
          description: qc.description ?? null,
          dimension: qc.dimension ?? null,
          tolerance: qc.tolerance ?? null,
          instrument: qc.instrument ?? null,
          method: qc.method ?? null,
          isCritical: Boolean(qc.is_critical),
          status: CheckpointStatus.PENDING,
          createdBy: user.id,
          updatedBy: user.id,
          tenantId: wo.tenantId,
        });
      });
    }
    if (rows.length) await repo.save(repo.create(rows));
  }

  private async writeTraceEdges(wo: WorkOrder, em: any) {
    const rows: any[] = [];
    const add = (sourceType: string, sourceId: string, targetType: string, targetId: string, relation: string) => {
      rows.push({
        project_id: wo.projectId,
        source_entity_type: sourceType,
        source_entity_id: sourceId,
        target_entity_type: targetType,
        target_entity_id: targetId,
        relation_type: relation,
        tenant_id: wo.tenantId,
      });
    };
    if (wo.drawingId) add('WORK_ORDER', wo.id, 'DRAWING', wo.drawingId, 'MANUFACTURES');
    if (wo.bomId) add('WORK_ORDER', wo.id, 'BOM', wo.bomId, 'CONSUMES');
    if (wo.bomItemId) add('WORK_ORDER', wo.id, 'BOM_ITEM', wo.bomItemId, 'CONSUMES');
    if (wo.routingId) add('WORK_ORDER', wo.id, 'ROUTING', wo.routingId, 'EXECUTES');
    if (wo.processPlanId) add('WORK_ORDER', wo.id, 'PROCESS_PLAN', wo.processPlanId, 'FOLLOWS');
    if (!rows.length) return;
    for (const row of rows) {
      await em.query(
        `INSERT INTO engineering_trace_edges
           (id, created_at, updated_at, created_by, updated_by, tenant_id,
            project_id, source_entity_type, source_entity_id, target_entity_type, target_entity_id, relation_type)
         VALUES (uuid_generate_v4(), now(), now(), NULL, NULL, $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [row.tenant_id, row.project_id, row.source_entity_type, row.source_entity_id, row.target_entity_type, row.target_entity_id, row.relation_type],
      );
    }
  }
}
