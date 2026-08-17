import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InspectionCheckpoint, CheckpointStatus } from '../entities/inspection-checkpoint.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { NcrService } from '@modules/quality/services/ncr.service';
import { NcrSeverity } from '@modules/quality/entities/ncr-record.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Sprint 2.4 MES — In-Process Inspection (Phase 9).
 *
 * Checkpoints are auto-generated at work-order release from the routing
 * operation quality_checkpoints. Recording a FAIL raises an NCR
 * (severity CRITICAL for critical checkpoints, MAJOR otherwise).
 */
@Injectable()
export class InspectionService {
  constructor(
    @InjectRepository(InspectionCheckpoint)
    private readonly checkpointRepo: Repository<InspectionCheckpoint>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly ncrService: NcrService,
    private readonly outboxService: OutboxService,
  ) {}

  async listByWorkOrder(workOrderId: string, q: { status?: CheckpointStatus } = {}, tenantId?: string) {
    const qb = this.checkpointRepo.createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .andWhere('c.work_order_id = :workOrderId', { workOrderId });
    if (tenantId) qb.andWhere('c.tenant_id = :tenantId', { tenantId });
    if (q.status) qb.andWhere('c.status = :status', { status: q.status });
    qb.orderBy('c.operation_number', 'ASC').addOrderBy('c.checkpoint_number', 'ASC');
    return qb.getMany();
  }

  /** Fail-closed tenant guard - mirrors TenantAwareService.requireTenant. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async recordResult(checkpointId: string, user: AuthUser, dto: {
    result?: CheckpointStatus;
    status?: CheckpointStatus;
    measuredValue?: string;
    inspectionReportId?: string;
    remarks?: string;
  }) {
    const tenantId = this.requireTenant(user.tenantId);
    const targetStatus = dto.result ?? dto.status;
    if (!targetStatus || ![CheckpointStatus.PASS, CheckpointStatus.FAIL, CheckpointStatus.SKIP, CheckpointStatus.NA].includes(targetStatus)) {
      throw new NotFoundException('Invalid checkpoint result');
    }
    const checkpoint = await this.checkpointRepo.findOne({ where: { id: checkpointId, tenantId, deletedAt: IsNull() } });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');

    const patch: Record<string, unknown> = {
      status: targetStatus,
      measuredValue: dto.measuredValue ?? null,
      inspectionReportId: dto.inspectionReportId ?? null,
      inspectedBy: user.id,
      inspectedAt: new Date(),
      remarks: dto.remarks ?? null,
      updatedBy: user.id,
    };
    await this.checkpointRepo.update({ id: checkpoint.id, tenantId }, patch as Partial<InspectionCheckpoint>);

    let ncr = null;
    if (targetStatus === CheckpointStatus.FAIL) {
      const wo = await this.workOrderRepo.findOne({ where: { id: checkpoint.workOrderId, tenantId, deletedAt: undefined } });
      ncr = await this.ncrService.create({
        projectId: wo?.projectId ?? undefined,
        workOrderId: checkpoint.workOrderId,
        operationId: checkpoint.operationId,
        partId: wo?.partId ?? undefined,
        drawingId: wo?.drawingId ?? undefined,
        bomItemId: wo?.bomItemId ?? undefined,
        machineId: undefined,
        operatorId: undefined,
        ncrType: 'INTERNAL',
        severity: checkpoint.isCritical ? NcrSeverity.CRITICAL : NcrSeverity.MAJOR,
        description: `Checkpoint ${checkpoint.checkpointNumber} (${checkpoint.checkpointName ?? 'inspection'}) failed on ${checkpoint.dimension ?? 'dimension'} — measured ${dto.measuredValue ?? 'n/a'} vs tolerance ${checkpoint.tolerance ?? 'n/a'}`,
        status: 'OPEN',
        rejectedQty: checkpoint.isCritical ? undefined : undefined,
        remarks: dto.remarks ?? null,
      } as any, user);

      await this.outboxService.append(EngineeringDomainEventType.INSPECTION_FAILED, 'inspection_checkpoint', checkpoint.id, {
        entityId: checkpoint.id,
        checkpointNumber: checkpoint.checkpointNumber,
        workOrderId: checkpoint.workOrderId,
        operationId: checkpoint.operationId,
        measuredValue: dto.measuredValue ?? null,
        ncrId: ncr?.id ?? null,
      }, { tenantId, actorId: user.id });
    }

    return this.checkpointRepo.findOne({ where: { id: checkpoint.id, tenantId } });
  }

  async summary(workOrderId: string, tenantId?: string) {
    const checkpoints = await this.listByWorkOrder(workOrderId, {}, tenantId);
    const counts: Record<string, number> = {
      PENDING: 0, PASS: 0, FAIL: 0, SKIP: 0, NA: 0,
    };
    for (const c of checkpoints) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return {
      workOrderId,
      total: checkpoints.length,
      counts,
      passed: counts.PASS,
      failed: counts.FAIL,
      pending: counts.PENDING,
      skipped: counts.SKIP,
      na: counts.NA,
      criticalFails: checkpoints.filter((c) => c.status === CheckpointStatus.FAIL && c.isCritical).length,
      allPassed: checkpoints.length > 0 && checkpoints.every((c) => c.status !== CheckpointStatus.PENDING && c.status !== CheckpointStatus.FAIL),
    };
  }
}
