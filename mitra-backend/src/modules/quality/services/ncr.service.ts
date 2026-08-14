import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NcrRecord, NcrStatus } from '../entities/ncr-record.entity';
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

  private nextNcrNumber(): string {
    return `NCR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }
}
