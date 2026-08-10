import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { MaterialReservation, ReservationStatus } from '../entities/material-reservation.entity';
import { MaterialIssue } from '../entities/materialissue.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Sprint 2.4 MES — Material Consumption (Phase 4).
 *
 * Reservations are created at work-order release (engine). This service
 * issues material against reservations (material_issues), tracks
 * partial/short supply, releases unused quantities, and reports
 * consumption vs. plan. No inventory module exists — stock movement
 * remains out of scope (documented in Manufacturing_Gap_Analysis).
 */
@Injectable()
export class MaterialManagementService {
  constructor(
    @InjectRepository(MaterialReservation)
    private readonly reservationRepo: Repository<MaterialReservation>,
    @InjectRepository(MaterialIssue)
    private readonly issueRepo: Repository<MaterialIssue>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly outboxService: OutboxService,
  ) {}

  async listReservations(q: { workOrderId?: string; status?: ReservationStatus; partNumber?: string }, tenantId?: string) {
    const qb = this.reservationRepo.createQueryBuilder('r').where('r.deleted_at IS NULL');
    if (tenantId) qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (q.workOrderId) qb.andWhere('r.work_order_id = :workOrderId', { workOrderId: q.workOrderId });
    if (q.status) qb.andWhere('r.status = :status', { status: q.status });
    if (q.partNumber) qb.andWhere('r.part_number ILIKE :partNumber', { partNumber: `%${q.partNumber}%` });
    qb.orderBy('r.created_at', 'ASC');
    return qb.getMany();
  }

  /** Issue a reservation (full or partial). */
  async issue(reservationId: string, user: AuthUser, dto: { qty?: number; issueDate?: string; storeLocation?: string; remarks?: string }) {
    const reservation = await this.reservationRepo.findOne({ where: { id: reservationId, deletedAt: IsNull() } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.RELEASED) {
      throw new BadRequestException('Reservation is closed');
    }
    const qty = dto.qty ?? Number(reservation.reservedQty) - Number(reservation.issuedQty);
    if (qty <= 0) throw new BadRequestException('Issue quantity must be positive');
    if (Number(reservation.issuedQty) + qty > Number(reservation.reservedQty)) {
      throw new BadRequestException(`Issue exceeds reserved quantity (reserved ${reservation.reservedQty}, issued ${reservation.issuedQty})`);
    }

    const issue = this.issueRepo.create({
      issueNumber: this.nextIssueNumber(),
      workOrderId: reservation.workOrderId,
      issuedToId: reservation.workOrderId,
      issuedById: user.id,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
      materialCode: reservation.partNumber ?? reservation.id,
      materialDescription: reservation.partName ?? reservation.partNumber ?? 'Reserved material',
      quantity: qty,
      unit: reservation.uom ?? 'KG',
      batchId: reservation.batchId ?? undefined,
      storeLocation: dto.storeLocation ?? reservation.storeLocation,
      remarks: dto.remarks ?? null,
      createdBy: user.id,
      updatedBy: user.id,
      tenantId: user.tenantId ?? undefined,
    } as any);
    await this.issueRepo.save(issue);

    const issuedTotal = Number(reservation.issuedQty) + qty;
    const status = issuedTotal >= Number(reservation.reservedQty) ? ReservationStatus.ISSUED : ReservationStatus.PARTIALLY_ISSUED;
    await this.reservationRepo.update(reservation.id, { issuedQty: issuedTotal, status, updatedBy: user.id } as any);

    if (status === ReservationStatus.PARTIALLY_ISSUED) {
      await this.outboxService.append(EngineeringDomainEventType.MATERIAL_SHORTAGE, 'material_reservation', reservation.id, {
        entityId: reservation.id,
        reservationNumber: reservation.reservationNumber,
        workOrderId: reservation.workOrderId,
        partNumber: reservation.partNumber,
        reservedQty: reservation.reservedQty,
        issuedQty: issuedTotal,
      }, { tenantId: user.tenantId, actorId: user.id });
    } else {
      await this.outboxService.append(EngineeringDomainEventType.MATERIAL_RESERVED, 'material_reservation', reservation.id, {
        entityId: reservation.id,
        reservationNumber: reservation.reservationNumber,
        workOrderId: reservation.workOrderId,
        partNumber: reservation.partNumber,
        qty,
      }, { tenantId: user.tenantId, actorId: user.id });
    }

    return this.reservationRepo.findOne({ where: { id: reservation.id } });
  }

  /** Release unused reservation quantity (partial or full) back to store. */
  async releaseUnused(reservationId: string, user: AuthUser, dto: { qty?: number; remarks?: string }) {
    const reservation = await this.reservationRepo.findOne({ where: { id: reservationId, deletedAt: IsNull() } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.RELEASED) {
      throw new BadRequestException('Reservation is closed');
    }
    const releaseQty = dto.qty ?? Math.max(0, Number(reservation.reservedQty) - Number(reservation.issuedQty));
    if (releaseQty <= 0) throw new BadRequestException('No unused quantity to release');

    await this.reservationRepo.update(reservation.id, {
      reservedQty: Number(reservation.reservedQty) - releaseQty,
      status: Number(reservation.reservedQty) - releaseQty <= Number(reservation.issuedQty) ? ReservationStatus.ISSUED : ReservationStatus.PARTIALLY_ISSUED,
      remarks: dto.remarks ?? reservation.remarks,
      updatedBy: user.id,
    } as any);

    await this.outboxService.append(EngineeringDomainEventType.MATERIAL_VARIANCE, 'material_reservation', reservation.id, {
      entityId: reservation.id,
      reservationNumber: reservation.reservationNumber,
      workOrderId: reservation.workOrderId,
      partNumber: reservation.partNumber,
      releasedQty: releaseQty,
    }, { tenantId: user.tenantId, actorId: user.id });

    return this.reservationRepo.findOne({ where: { id: reservation.id } });
  }

  /** Batch-issue every reservation of a work order (store picking). */
  async issueAll(workOrderId: string, user: AuthUser, dto: { issueDate?: string } = {}) {
    const reservations = await this.reservationRepo.find({
      where: { workOrderId, status: ReservationStatus.RESERVED, deletedAt: IsNull() } as any,
    });
    const results = [];
    for (const r of reservations) {
      results.push(await this.issue(r.id, user, { qty: Number(r.reservedQty) - Number(r.issuedQty), issueDate: dto.issueDate }));
    }
    return { workOrderId, issued: results.length };
  }

  /** Consumption vs. plan summary for a work order. */
  async consumptionSummary(workOrderId: string, tenantId?: string) {
    const reservations = await this.listReservations({ workOrderId }, tenantId);
    const issues = await this.issueRepo.find({ where: { workOrderId, deletedAt: IsNull() } });
    const issuedTotal = issues.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
    const planned = reservations.reduce((s, r) => s + Number(r.plannedQty ?? 0), 0);
    const reserved = reservations.reduce((s, r) => s + Number(r.reservedQty ?? 0), 0);
    const issued = reservations.reduce((s, r) => s + Number(r.issuedQty ?? 0), 0);
    return {
      workOrderId,
      planned,
      reserved,
      issued,
      variance: Number((planned - issued).toFixed(3)),
      items: reservations.map((r) => ({
        reservationNumber: r.reservationNumber,
        partNumber: r.partNumber,
        partName: r.partName,
        uom: r.uom,
        plannedQty: r.plannedQty,
        reservedQty: r.reservedQty,
        issuedQty: r.issuedQty,
        status: r.status,
      })),
      issues: issues.map((i) => ({
        issueNumber: i.issueNumber,
        materialCode: i.materialCode,
        quantity: i.quantity,
        unit: i.unit,
        issueDate: i.issueDate,
        storeLocation: i.storeLocation,
      })),
    };
  }

  /** Reservations that cannot be fully issued (short supply). */
  async shortages(q: { workOrderId?: string }, tenantId?: string) {
    const qb = this.reservationRepo.createQueryBuilder('r')
      .where('r.deleted_at IS NULL')
      .andWhere("r.status IN ('RESERVED','PARTIALLY_ISSUED')");
    if (tenantId) qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (q.workOrderId) qb.andWhere('r.work_order_id = :workOrderId', { workOrderId: q.workOrderId });
    qb.orderBy('r.created_at', 'ASC');
    const rows = await qb.getMany();
    return rows.map((r) => ({
      ...r,
      shortQty: Number((Number(r.reservedQty) - Number(r.issuedQty)).toFixed(3)),
    }));
  }

  private nextIssueNumber(): string {
    return `MI-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }
}
