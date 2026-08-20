import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { WorkOrder, WorkOrderStatus } from '../entities/workorder.entity';
import { JobCard } from '../entities/jobcard.entity';
import { OperationLog } from '../entities/operationlog.entity';

/**
 * Sprint 2.4 MES — Production Tracking (Phase 5/10).
 *
 * Read-only dashboards: KPI roll-up, work-order board, and the full
 * execution timeline of a work order (job cards + operation logs).
 */
@Injectable()
export class ProductionTrackingService {
  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(OperationLog)
    private readonly operationLogRepo: Repository<OperationLog>,
    private readonly dataSource: DataSource,
  ) {}

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async dashboard(q: { projectId?: string; from?: string; to?: string }, tenantId?: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.workOrderRepo.createQueryBuilder('wo').where('wo.deleted_at IS NULL');
    qb.andWhere('wo.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (q.projectId) qb.andWhere('wo.project_id = :projectId', { projectId: q.projectId });
    if (q.from) qb.andWhere('wo.created_at >= :from', { from: new Date(q.from) });
    if (q.to) qb.andWhere('wo.created_at <= :to', { to: new Date(q.to) });

    const wos = await qb.getMany();
    const statusCounts: Record<string, number> = {};
    for (const s of Object.values(WorkOrderStatus)) statusCounts[s] = 0;
    for (const wo of wos) statusCounts[wo.status] = (statusCounts[wo.status] ?? 0) + 1;

    const ids = wos.map((w) => w.id);
    let jobStats = { open: 0, inProgress: 0, runningMachines: 0, late: 0 };
    if (ids.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT jc.status, COUNT(*) AS cnt, COUNT(DISTINCT jc.machine_id) AS machines
           FROM job_cards jc
          WHERE jc.work_order_id = ANY($1) AND jc.deleted_at IS NULL
          GROUP BY jc.status`,
        [ids],
      );
      for (const r of rows) {
        if (['OPEN', 'PAUSED', 'ON_HOLD', 'REWORK'].includes(r.status)) jobStats.open += Number(r.cnt);
        if (r.status === 'IN_PROGRESS') {
          jobStats.inProgress += Number(r.cnt);
          jobStats.runningMachines += Number(r.machines);
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      const lateRows = await this.dataSource.query(
        `SELECT COUNT(*) AS cnt
           FROM work_orders wo
          WHERE wo.id = ANY($1) AND wo.deleted_at IS NULL
            AND wo.status IN ('RELEASED','IN_PROGRESS','PAUSED','ON_HOLD','REWORK')
            AND wo.planned_end_date IS NOT NULL AND wo.planned_end_date < $2::date`,
        [ids, today],
      );
      jobStats.late = Number(lateRows[0]?.cnt ?? 0);
    }

    return {
      totalWorkOrders: wos.length,
      statusCounts,
      quantities: {
        planned: wos.reduce((s, w) => s + Number(w.plannedQty ?? 0), 0),
        completed: wos.reduce((s, w) => s + Number(w.completedQty ?? 0), 0),
        rejected: wos.reduce((s, w) => s + Number(w.rejectedQty ?? 0), 0),
        rework: wos.reduce((s, w) => s + Number(w.reworkQty ?? 0), 0),
        scrap: wos.reduce((s, w) => s + Number(w.scrapQty ?? 0), 0),
      },
      hours: {
        estimated: wos.reduce((s, w) => s + Number(w.estimatedHours ?? 0), 0),
        actual: wos.reduce((s, w) => s + Number(w.actualHours ?? 0), 0),
      },
      jobs: jobStats,
    };
  }

  /** Work-order board grouped by status, each with its job cards. */
  async board(q: { projectId?: string; status?: WorkOrderStatus }, tenantId?: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.workOrderRepo.createQueryBuilder('wo')
      .where('wo.deleted_at IS NULL')
      .orderBy('wo.created_at', 'DESC');
    qb.andWhere('wo.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (q.projectId) qb.andWhere('wo.project_id = :projectId', { projectId: q.projectId });
    if (q.status) qb.andWhere('wo.status = :status', { status: q.status });
    const wos = await qb.getMany();
    const ids = wos.map((w) => w.id);
    const jobs = ids.length > 0
      ? await this.jobCardRepo.find({ where: { workOrderId: In(ids), deletedAt: IsNull() }, order: { operationNumber: 'ASC' } as any })
      : [];
    const byWo: Record<string, any[]> = {};
    for (const j of jobs) {
      (byWo[j.workOrderId] ??= []).push({
        id: j.id,
        jobCardNumber: j.jobCardNumber,
        operationNumber: j.operationNumber,
        operationCode: j.operationCode,
        status: j.status,
        machineId: j.machineId,
        operatorId: j.operatorId,
        qtyPlanned: j.qtyPlanned,
        producedQty: j.producedQty,
        rejectedQty: j.rejectedQty,
        reworkQty: j.reworkQty,
        scrapQty: j.scrapQty,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
        holdReason: j.holdReason,
      });
    }
    const board: Record<string, any[]> = {};
    for (const s of Object.values(WorkOrderStatus)) board[s] = [];
    for (const wo of wos) {
      board[wo.status].push({
        id: wo.id,
        woNumber: wo.woNumber,
        partName: wo.partName,
        partId: wo.partId,
        projectId: wo.projectId,
        status: wo.status,
        priority: wo.priority,
        plannedQty: wo.plannedQty,
        completedQty: wo.completedQty,
        reworkQty: wo.reworkQty,
        scrapQty: wo.scrapQty,
        plannedStartDate: wo.plannedStartDate,
        plannedEndDate: wo.plannedEndDate,
        actualEndDate: wo.actualEndDate,
        actualHours: wo.actualHours,
        estimatedHours: wo.estimatedHours,
        releasedAt: wo.releasedAt,
        snapshot: wo.snapshot ? { released: true, revision: wo.snapshot.revision ?? null, items: wo.snapshot.bomItems?.length ?? 0, operations: wo.snapshot.operations?.length ?? 0 } : null,
        jobs: byWo[wo.id] ?? [],
      });
    }
    return board;
  }

  /** Full execution timeline of a work order (jobs + operation logs). */
  async history(workOrderId: string, tenantId?: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const wo = await this.workOrderRepo.findOne({ where: { id: workOrderId, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!wo) return null;
    const jobs = await this.jobCardRepo.find({ where: { workOrderId, deletedAt: IsNull() }, order: { operationNumber: 'ASC', createdAt: 'ASC' } as any });
    const logs = await this.operationLogRepo.find({ where: { workOrderId, deletedAt: IsNull() }, order: { createdAt: 'ASC' } });
    const events: any[] = [];
    const releasedAt = wo.releasedAt;
    if (releasedAt) {
      events.push({ at: releasedAt, type: 'WORK_ORDER_RELEASED', detail: `Released by ${wo.releasedBy ?? 'n/a'} with ${jobs.length} job cards` });
    }
    for (const j of jobs) {
      if (j.startedAt) events.push({ at: j.startedAt, type: 'JOB_STARTED', jobCardNumber: j.jobCardNumber, detail: `Job ${j.jobCardNumber} started${j.machineId ? ' on machine ' + j.machineId : ''}` });
      if (j.completedAt) events.push({ at: j.completedAt, type: 'JOB_COMPLETED', jobCardNumber: j.jobCardNumber, detail: `Job ${j.jobCardNumber} completed: ${j.producedQty}/${j.qtyPlanned} qty, ${j.actualHours}h actual` });
    }
    for (const l of logs) {
      events.push({
        at: l.endTime ?? l.logDate,
        type: 'OPERATION_LOG',
        jobCardId: l.jobCardId,
        operationId: l.operationId,
        detail: `${l.qtyProduced} produced, ${l.qtyRejected} rejected, ${l.reworkQty} rework, ${l.scrapQty} scrap (${l.durationMinutes ?? 0} min)`,
      });
    }
    events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return {
      workOrder: {
        id: wo.id,
        woNumber: wo.woNumber,
        partName: wo.partName,
        status: wo.status,
        plannedQty: wo.plannedQty,
        completedQty: wo.completedQty,
        reworkQty: wo.reworkQty,
        scrapQty: wo.scrapQty,
        actualHours: wo.actualHours,
        releasedAt: wo.releasedAt,
        actualEndDate: wo.actualEndDate,
      },
      jobs,
      logs,
      events,
    };
  }
}
