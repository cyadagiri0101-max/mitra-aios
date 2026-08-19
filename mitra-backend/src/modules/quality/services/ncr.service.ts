import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { NcrRecord, NcrStatus } from '../entities/ncr-record.entity';
import { CapaVerification, CapaStatus, CapaType } from '../entities/capaverification.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Sprint 2.4 MES — Non-Conformance Records (Phase 9).
 *
 * NCRs link a failed inspection checkpoint (or manual quality finding) to
 * a work order / operation with severity and disposition. The lifecycle is
 * DB-driven in spirit (OPEN → INVESTIGATION → ACTION → VERIFIED → CLOSED)
 * with quality:ncr:* permissions.
 */
@Injectable()
export class NcrService {
  constructor(
    @InjectRepository(NcrRecord)
    private readonly ncrRepo: Repository<NcrRecord>,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async findAll(q: { page?: number; limit?: number; status?: NcrStatus; workOrderId?: string; projectId?: string; severity?: string }, tenantId?: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
    const qb = this.ncrRepo.createQueryBuilder('n').where('n.deleted_at IS NULL');
    qb.andWhere('n.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (q.status) qb.andWhere('n.status = :status', { status: q.status });
    if (q.workOrderId) qb.andWhere('n.work_order_id = :workOrderId', { workOrderId: q.workOrderId });
    if (q.projectId) qb.andWhere('n.project_id = :projectId', { projectId: q.projectId });
    if (q.severity) qb.andWhere('n.severity = :severity', { severity: q.severity });
    qb.orderBy('n.created_at', 'DESC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string) {
    const ncr = await this.ncrRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: this.requireTenant(tenantId) } });
    if (!ncr) throw new NotFoundException('NCR not found');
    return ncr;
  }

  async create(dto: Record<string, unknown>, user: AuthUser) {
    const scopeTenant = this.requireTenant(user.tenantId);
    const ncr = this.ncrRepo.create({
      ...dto,
      ncrNumber: this.nextNcrNumber(),
      status: dto.status ?? NcrStatus.OPEN,
      createdBy: user.id,
      updatedBy: user.id,
      tenantId: scopeTenant,
    } as Partial<NcrRecord>);
    const saved = await this.ncrRepo.save(ncr);
    await this.outboxService.append(EngineeringDomainEventType.NCR_RAISED, 'ncr_record', saved.id, {
      entityId: saved.id,
      ncrNumber: saved.ncrNumber,
      workOrderId: saved.workOrderId,
      projectId: saved.projectId,
      severity: saved.severity,
      description: saved.description,
    }, { tenantId: scopeTenant, actorId: user.id });
    return saved;
  }

  async update(id: string, dto: Record<string, unknown>, user: AuthUser) {
    const scopeTenant = this.requireTenant(user.tenantId);
    await this.findOne(id, scopeTenant);
    const allowed = [
      'description', 'severity', 'ncrType', 'disposition', 'status', 'action',
      'rootCause', 'detectedQty', 'rejectedQty', 'projectId', 'workOrderId',
      'jobCardId', 'operationId', 'materialLot', 'inspectionReportId',
    ];
    const clean = Object.fromEntries(Object.entries(dto).filter(([k]) => allowed.includes(k)));
    await this.ncrRepo.update({ id, tenantId: scopeTenant }, { ...clean, updatedBy: user.id } as Partial<NcrRecord>);
    return this.findOne(id, scopeTenant);
  }

  async transition(id: string, toStatus: NcrStatus, user: AuthUser, dto: { disposition?: string; action?: string; remarks?: string } = {}) {
    const scopeTenant = this.requireTenant(user.tenantId);
    const ncr = await this.findOne(id, scopeTenant);
    const allowed: Record<NcrStatus, NcrStatus[]> = {
      [NcrStatus.OPEN]: [NcrStatus.INVESTIGATION, NcrStatus.CLOSED],
      [NcrStatus.INVESTIGATION]: [NcrStatus.ACTION, NcrStatus.CLOSED],
      [NcrStatus.ACTION]: [NcrStatus.VERIFIED, NcrStatus.CLOSED],
      [NcrStatus.VERIFIED]: [NcrStatus.CLOSED],
      [NcrStatus.CLOSED]: [],
    };
    if (!allowed[ncr.status]?.includes(toStatus)) {
      throw new BadRequestException(`Illegal NCR transition ${ncr.status} → ${toStatus}`);
    }
    const patch: Record<string, unknown> = { status: toStatus, updatedBy: user.id };
    if (dto.disposition) patch.disposition = dto.disposition;
    if (toStatus === NcrStatus.CLOSED) patch.closedAt = new Date();
    await this.ncrRepo.update({ id, tenantId: scopeTenant }, patch as Partial<NcrRecord>);
    if (toStatus === NcrStatus.CLOSED) {
      await this.outboxService.append(EngineeringDomainEventType.NCR_CLOSED, 'ncr_record', ncr.id, {
        entityId: ncr.id,
        ncrNumber: ncr.ncrNumber,
        workOrderId: ncr.workOrderId,
        disposition: patch.disposition ?? ncr.disposition,
      }, { tenantId: scopeTenant, actorId: user.id });
    }
    return this.findOne(id, scopeTenant);
  }

  async escalateToCapa(
    id: string,
    user: AuthUser,
    dto: {
      problemDescription?: string;
      rootCause?: string;
      rootCauseMethod?: string;
      correctiveAction?: string;
      preventiveAction?: string;
      responsiblePersonId?: string;
      targetDate?: string;
      capaType?: CapaType;
    } = {},
  ) {
    const scopeTenant = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const ncr = await em.getRepository(NcrRecord).findOne({
        where: { id, tenantId: scopeTenant, deletedAt: IsNull() },
      });
      if (!ncr) throw new NotFoundException('NCR not found');
      if (ncr.status === NcrStatus.CLOSED) {
        throw new BadRequestException('Cannot escalate a closed NCR to CAPA');
      }

      const capaNumber = `CAPA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const capa = em.getRepository(CapaVerification).create({
        capaNumber,
        ncrId: ncr.id,
        projectId: ncr.projectId,
        workOrderId: ncr.workOrderId,
        jobCardId: ncr.jobCardId,
        drawingId: ncr.drawingId,
        bomId: ncr.bomId,
        routingId: ncr.routingId,
        machineId: ncr.machineId,
        operatorId: ncr.operatorId,
        materialLot: ncr.materialLot,
        supplierId: ncr.supplierId,
        inspectionPlanId: ncr.inspectionPlanId,
        capaType: dto.capaType ?? CapaType.CORRECTIVE,
        problemDescription: dto.problemDescription ?? ncr.description,
        rootCause: dto.rootCause ?? ncr.rootCause ?? null,
        rootCauseMethod: dto.rootCauseMethod ?? '5_WHY',
        correctiveAction: dto.correctiveAction ?? null,
        preventiveAction: dto.preventiveAction ?? null,
        responsiblePersonId: dto.responsiblePersonId ?? user.id,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        status: CapaStatus.OPEN,
        tenantId: scopeTenant,
        createdBy: user.id,
        updatedBy: user.id,
      });
      const savedCapa = await em.getRepository(CapaVerification).save(capa);

      // Advance NCR status to ACTION
      await em.getRepository(NcrRecord).update(
        { id: ncr.id, tenantId: scopeTenant },
        {
          status: NcrStatus.ACTION,
          rootCause: dto.rootCause ?? ncr.rootCause,
          updatedBy: user.id,
        } as any,
      );

      await this.outboxService.append(
        EngineeringDomainEventType.CAPA_OPENED,
        'capa_verification',
        savedCapa.id,
        {
          entityId: savedCapa.id,
          capaNumber: savedCapa.capaNumber,
          ncrId: ncr.id,
          ncrNumber: ncr.ncrNumber,
          projectId: ncr.projectId,
          workOrderId: ncr.workOrderId,
        },
        { tenantId: scopeTenant, actorId: user.id, em },
      );

      return {
        ncr: { id: ncr.id, ncrNumber: ncr.ncrNumber, status: NcrStatus.ACTION },
        capa: savedCapa,
      };
    });
  }

  private nextNcrNumber(): string {
    return `NCR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }
}
