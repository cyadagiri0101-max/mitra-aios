import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { JobCard, JobCardStatus } from '../entities/jobcard.entity';
import { OperationLog } from '../entities/operationlog.entity';
import { MaterialReservation, ReservationStatus } from '../entities/material-reservation.entity';
import { WorkOrder, WorkOrderStatus } from '../entities/workorder.entity';
import { WorkflowService } from '@modules/workflow/services/workflow.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { JOB_TRANSITIONS, TERMINAL_JOB_STATUSES, WORK_ORDER_TRANSITIONS } from '../manufacturing.constants';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Sprint 2.4 MES — Shop Floor Execution (Phase 3/5).
 *
 * Job-card lifecycle runs through the DB-driven manufacturing_job workflow;
 * every state change appends a transactional outbox row. Production capture
 * (operation_logs) is accumulated into the job card and rolled up into the
 * work order.
 */
@Injectable()
export class ShopFloorService {
  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(OperationLog)
    private readonly operationLogRepo: Repository<OperationLog>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly dataSource: DataSource,
    private readonly workflowService: WorkflowService,
    private readonly outboxService: OutboxService,
  ) {}

  // ── Start job ────────────────────────────────────────────────────────────
  async startJob(jobId: string, user: AuthUser, dto: { operatorId?: string; machineId?: string; startTime?: string; shift?: string }) {
    const tenantId = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const job = await this.getJob(em, jobId, tenantId);
      const ctx = this.buildContext(user);
      const instance = await this.workflowService.findInstanceByEntity('job_card', job.id, user.tenantId ?? undefined, em);
      if (!instance) {
        throw new BadRequestException('Job workflow instance missing — release the parent work order first');
      }
      const transition = await this.workflowService.executeTransition(instance.id, JOB_TRANSITIONS.START, ctx, em);

      const startedAt = dto.startTime ? new Date(dto.startTime) : new Date();
      const patch: Record<string, unknown> = {
        status: JobCardStatus.IN_PROGRESS,
        startedAt,
        updatedBy: user.id,
      };
      if (dto.operatorId) patch.operatorId = dto.operatorId;
      if (dto.machineId) patch.machineId = dto.machineId;
      await em.getRepository(JobCard).update(job.id, patch);

      await em.getRepository(OperationLog).save(em.getRepository(OperationLog).create({
        workOrderId: job.workOrderId,
        jobCardId: job.id,
        operationId: job.operationId,
        operatorId: dto.operatorId ?? job.operatorId,
        machineId: dto.machineId ?? job.machineId,
        shift: dto.shift ?? null,
        logDate: startedAt,
        startTime: startedAt,
        qtyProduced: 0,
        qtyRejected: 0,
        createdBy: user.id,
        updatedBy: user.id,
        tenantId: user.tenantId,
      } as any));

      await this.outboxService.append(EngineeringDomainEventType.JOB_STARTED, 'job_card', job.id, {
        entityId: job.id,
        entityNumber: job.jobCardNumber,
        workOrderId: job.workOrderId,
        operatorId: dto.operatorId ?? job.operatorId,
        machineId: dto.machineId ?? job.machineId,
      }, { tenantId: user.tenantId, actorId: user.id, em });

      await this.rollUpWorkOrder(em, job.workOrderId, user);

      return { id: job.id, status: 'IN_PROGRESS', startedAt, transition: transition.currentState.stateCode };
    });
  }

  // ── Production capture ───────────────────────────────────────────────────
  async logProduction(jobId: string, user: AuthUser, dto: {
    qtyProduced: number;
    qtyRejected?: number;
    qtyRework?: number;
    qtyScrap?: number;
    endTime?: string;
    downtimeMinutes?: number;
    downtimeReason?: string;
    setupTimeMinutes?: number;
    rejectionReason?: string;
    remarks?: string;
  }) {
    const tenantId = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const job = await this.getJob(em, jobId, tenantId);
      if (job.status !== JobCardStatus.IN_PROGRESS && job.status !== JobCardStatus.REWORK) {
        throw new BadRequestException('Production can only be logged against an IN_PROGRESS or REWORK job');
      }
      const endTime = dto.endTime ? new Date(dto.endTime) : new Date();
      const startTime = job.startedAt ?? endTime;
      const durationMinutes = Math.max(0, Math.round((endTime.getTime() - new Date(startTime).getTime()) / 60000));

      const produced = dto.qtyProduced ?? 0;
      const rejected = dto.qtyRejected ?? 0;
      const rework = dto.qtyRework ?? 0;
      const scrap = dto.qtyScrap ?? 0;

      await em.getRepository(OperationLog).save(em.getRepository(OperationLog).create({
        workOrderId: job.workOrderId,
        jobCardId: job.id,
        operationId: job.operationId,
        operatorId: job.operatorId,
        machineId: job.machineId,
        logDate: endTime,
        startTime,
        endTime,
        durationMinutes,
        qtyProduced: produced,
        qtyRejected: rejected,
        reworkQty: rework,
        scrapQty: scrap,
        setupTimeMinutes: dto.setupTimeMinutes ?? 0,
        machineDowntimeMinutes: dto.downtimeMinutes ?? 0,
        downtimeReason: dto.downtimeReason ?? null,
        rejectionReason: dto.rejectionReason ?? null,
        remarks: dto.remarks ?? null,
        createdBy: user.id,
        updatedBy: user.id,
        tenantId: user.tenantId,
      } as any));

      const logs = await em.getRepository(OperationLog).find({ where: { jobCardId: job.id, deletedAt: undefined } });
      const sums = logs.reduce((acc, l) => ({
        produced: acc.produced + Number(l.qtyProduced || 0),
        rejected: acc.rejected + Number(l.qtyRejected || 0),
        rework: acc.rework + Number(l.reworkQty || 0),
        scrap: acc.scrap + Number(l.scrapQty || 0),
        downtime: acc.downtime + Number(l.machineDowntimeMinutes || 0),
        setup: acc.setup + Number(l.setupTimeMinutes || 0),
        duration: acc.duration + Number(l.durationMinutes || 0),
      }), { produced: 0, rejected: 0, rework: 0, scrap: 0, downtime: 0, setup: 0, duration: 0 });

      await em.getRepository(JobCard).update(job.id, {
        producedQty: sums.produced,
        rejectedQty: sums.rejected,
        reworkQty: sums.rework,
        scrapQty: sums.scrap,
        downtimeMinutes: sums.downtime,
        setupTimeMinutes: sums.setup,
        actualHours: Number((sums.duration / 60).toFixed(2)),
        updatedBy: user.id,
      });

      await this.outboxService.append(EngineeringDomainEventType.MATERIAL_CONSUMED, 'job_card', job.id, {
        entityId: job.id,
        entityNumber: job.jobCardNumber,
        workOrderId: job.workOrderId,
        qtyProduced: produced,
        qtyRejected: rejected,
        qtyRework: rework,
        qtyScrap: scrap,
        durationMinutes,
      }, { tenantId: user.tenantId, actorId: user.id, em });

      await this.rollUpWorkOrder(em, job.workOrderId, user);

      return {
        id: job.id,
        totals: sums,
        durationMinutes,
      };
    });
  }

  // ── Job transitions (pause/resume/hold/complete/cancel/rework/scrap) ─────
  async transitionJob(jobId: string, transitionKey: keyof typeof JOB_TRANSITIONS, user: AuthUser, dto: {
    holdReason?: string;
    remarks?: string;
    qtyProduced?: number;
    completedQuantity?: number;
    qtyScrap?: number;
    scrapQuantity?: number;
    qtyRejected?: number;
    rejectedQuantity?: number;
    operatorId?: string;
    machineId?: string;
  }) {
    const tenantId = this.requireTenant(user.tenantId);
    const transitionId = JOB_TRANSITIONS[transitionKey];
    if (!transitionId) throw new BadRequestException(`Unknown job transition: ${String(transitionKey)}`);
    return this.dataSource.transaction(async (em) => {
      const job = await this.getJob(em, jobId, tenantId);
      const ctx = this.buildContext(user);
      const instance = await this.workflowService.findInstanceByEntity('job_card', job.id, user.tenantId ?? undefined, em);
      if (!instance) throw new BadRequestException('Job workflow instance missing');
      const transition = await this.workflowService.executeTransition(
        instance.id,
        transitionId,
        { ...ctx, remarks: dto.remarks ?? dto.holdReason },
        em,
      );
      const toState = transition.currentState.stateCode as JobCardStatus;

      const patch: Record<string, unknown> = { status: toState, updatedBy: user.id };
      if (toState === JobCardStatus.COMPLETED) patch.completedAt = new Date();
      if (toState === JobCardStatus.ON_HOLD) patch.holdReason = dto.holdReason ?? null;
      if (dto.operatorId) patch.operatorId = dto.operatorId;
      if (dto.machineId) patch.machineId = dto.machineId;

      const produced = dto.qtyProduced ?? dto.completedQuantity;
      const scrap = dto.qtyScrap ?? dto.scrapQuantity;
      const rejected = dto.qtyRejected ?? dto.rejectedQuantity;

      if (produced !== undefined || scrap !== undefined || rejected !== undefined) {
        const now = new Date();
        const startTime = job.startedAt ?? now;
        const durationMinutes = Math.max(0, Math.round((now.getTime() - new Date(startTime).getTime()) / 60000));

        await em.getRepository(OperationLog).save(em.getRepository(OperationLog).create({
          workOrderId: job.workOrderId,
          jobCardId: job.id,
          operationId: job.operationId,
          operatorId: dto.operatorId ?? job.operatorId,
          machineId: dto.machineId ?? job.machineId,
          logDate: now,
          startTime,
          endTime: now,
          durationMinutes,
          qtyProduced: produced ?? 0,
          qtyRejected: rejected ?? 0,
          reworkQty: 0,
          scrapQty: scrap ?? 0,
          remarks: dto.remarks ?? null,
          createdBy: user.id,
          updatedBy: user.id,
          tenantId: user.tenantId,
        } as any));

        const logs = await em.getRepository(OperationLog).find({ where: { jobCardId: job.id, deletedAt: undefined } });
        const sums = logs.reduce((acc, l) => ({
          produced: acc.produced + Number(l.qtyProduced || 0),
          rejected: acc.rejected + Number(l.qtyRejected || 0),
          rework: acc.rework + Number(l.reworkQty || 0),
          scrap: acc.scrap + Number(l.scrapQty || 0),
          downtime: acc.downtime + Number(l.machineDowntimeMinutes || 0),
          setup: acc.setup + Number(l.setupTimeMinutes || 0),
          duration: acc.duration + Number(l.durationMinutes || 0),
        }), { produced: 0, rejected: 0, rework: 0, scrap: 0, downtime: 0, setup: 0, duration: 0 });

        patch.producedQty = sums.produced;
        patch.rejectedQty = sums.rejected;
        patch.reworkQty = sums.rework;
        patch.scrapQty = sums.scrap;
        patch.downtimeMinutes = sums.downtime;
        patch.setupTimeMinutes = sums.setup;
        patch.actualHours = Number((sums.duration / 60).toFixed(2));
      }

      await em.getRepository(JobCard).update(job.id, patch);

      const eventMap: Record<string, EngineeringDomainEventType> = {
        PAUSED: EngineeringDomainEventType.JOB_PAUSED,
        ON_HOLD: EngineeringDomainEventType.JOB_HOLD,
        COMPLETED: EngineeringDomainEventType.JOB_COMPLETED,
        CANCELLED: EngineeringDomainEventType.JOB_CANCELLED,
        REWORK: EngineeringDomainEventType.JOB_REWORK,
        SCRAPPED: EngineeringDomainEventType.JOB_SCRAPPED,
      };
      const eventType = eventMap[toState];
      if (eventType) {
        await this.outboxService.append(eventType, 'job_card', job.id, {
          entityId: job.id,
          entityNumber: job.jobCardNumber,
          workOrderId: job.workOrderId,
          holdReason: dto.holdReason,
          producedQty: patch.producedQty ?? job.producedQty,
          scrapQty: patch.scrapQty ?? job.scrapQty,
        }, { tenantId: user.tenantId, actorId: user.id, em });
      }

      await this.rollUpWorkOrder(em, job.workOrderId, user);

      return { id: job.id, status: toState, transition: transition.currentState.stateCode };
    });
  }

  // ── Query helpers ────────────────────────────────────────────────────────
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async listJobCards(q: { workOrderId?: string; status?: string; machineId?: string }, tenantId?: string) {
    const qb = this.jobCardRepo.createQueryBuilder('jc').where('jc.deleted_at IS NULL');
    if (tenantId) qb.andWhere('jc.tenant_id = :tenantId', { tenantId });
    if (q.workOrderId) qb.andWhere('jc.work_order_id = :workOrderId', { workOrderId: q.workOrderId });
    if (q.status) qb.andWhere('jc.status = :status', { status: q.status });
    if (q.machineId) qb.andWhere('jc.machine_id = :machineId', { machineId: q.machineId });
    qb.orderBy('jc.operation_number', 'ASC').addOrderBy('jc.created_at', 'ASC');
    return qb.getMany();
  }

  async findOne(id: string, tenantId?: string) {
    const job = await this.jobCardRepo.findOne({ where: { id, deletedAt: undefined, tenantId: tenantId ?? undefined } });
    if (!job) throw new NotFoundException('Job card not found');
    const logs = await this.operationLogRepo.find({ where: { jobCardId: id, deletedAt: undefined }, order: { createdAt: 'ASC' } });
    return { ...job, logs };
  }

  // ── Work-order roll-up ───────────────────────────────────────────────────
  /**
   * Auto-completes the parent work order when every job card has reached a
   * terminal state (production history generated automatically, Phase 5).
   */
  private async rollUpWorkOrder(em: EntityManager, workOrderId: string, user: AuthUser) {
    const tenantId = this.requireTenant(user.tenantId);
    const jobs = (await em.getRepository(JobCard).find({ where: { workOrderId, tenantId, deletedAt: undefined } })) as JobCard[];
    const wo = await em.getRepository(WorkOrder).findOne({ where: { id: workOrderId, tenantId, deletedAt: undefined } });
    if (!wo || jobs.length === 0) return;

    const produced = jobs.reduce((s, j) => s + Number(j.producedQty || 0), 0);
    const rejected = jobs.reduce((s, j) => s + Number(j.rejectedQty || 0), 0);
    const rework = jobs.reduce((s, j) => s + Number(j.reworkQty || 0), 0);
    const scrap = jobs.reduce((s, j) => s + Number(j.scrapQty || 0), 0);
    const actualHours = jobs.reduce((s, j) => s + Number(j.actualHours || 0), 0);

    const patch: Record<string, unknown> = {
      completedQty: produced - rejected - scrap,
      rejectedQty: rejected,
      reworkQty: rework,
      scrapQty: scrap,
      actualHours: Number(actualHours.toFixed(2)),
      updatedBy: user.id,
    };

    const allTerminal = jobs.length > 0 && jobs.every((j) => TERMINAL_JOB_STATUSES.includes(j.status));
    if (allTerminal && wo.status === WorkOrderStatus.IN_PROGRESS) {
      const instance = await this.workflowService.findInstanceByEntity('work_order', wo.id, user.tenantId ?? undefined, em);
      if (instance) {
        const allScrapped = jobs.every((j) => j.status === 'SCRAPPED') || (produced === 0 && scrap > 0);
        const transitionKey = allScrapped ? 'SCRAP' : 'COMPLETE';
        const transition = await this.workflowService
          .executeTransition(instance.id, WORK_ORDER_TRANSITIONS[transitionKey], {
            ...this.buildContext(user),
            remarks: 'auto-complete by shop floor roll-up',
          }, em)
          .catch(() => null);
        if (transition) {
          const toState = transition.currentState.stateCode;
          patch.status = toState;
          if (toState === 'COMPLETED') patch.actualEndDate = new Date();
          const eventType = toState === 'COMPLETED'
            ? EngineeringDomainEventType.WORK_ORDER_COMPLETED
            : EngineeringDomainEventType.WORK_ORDER_SCRAPPED;
          await this.outboxService.append(eventType, 'work_order', wo.id, {
            entityId: wo.id,
            entityNumber: wo.woNumber,
            projectId: wo.projectId,
            remarks: 'auto-complete by shop floor roll-up',
          }, { tenantId: user.tenantId, actorId: user.id, em });
          if (toState === 'COMPLETED') {
            await em.getRepository(MaterialReservation).update(
              { workOrderId: wo.id, tenantId },
              { status: 'RELEASED' as ReservationStatus, updatedBy: user.id },
            );
          }
        }
      }
    }
    await em.getRepository(WorkOrder).update(wo.id, patch);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private async getJob(em: EntityManager, jobId: string, tenantId?: string) {
    const job = await em.getRepository(JobCard).findOne({ where: { id: jobId, tenantId, deletedAt: undefined } });
    if (!job) throw new NotFoundException('Job card not found');
    return job;
  }

  private buildContext(user: AuthUser) {
    return {
      userId: user.id,
      userRole: [user.role],
      userPermissions: user.permissions ?? [],
      tenantId: user.tenantId ?? undefined,
    };
  }
}
