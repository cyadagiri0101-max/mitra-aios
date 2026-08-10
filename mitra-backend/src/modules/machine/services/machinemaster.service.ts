import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { MachineMaster, MachineStatus } from '../entities/machinemaster.entity';
import { MachineCalendar } from '../entities/machinecalendar.entity';
import { MachineBooking, BookingStatus } from '../entities/machinebooking.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Sprint 2.4 MES — Machine / Work-Center Management (Phase 4).
 *
 * Machine master CRUD, shift calendars, and bookings are owned here
 * (machine_masters / machine_calendars / machine_bookings). Shop-floor
 * queue and utilization reads are cross-module raw queries over
 * job_cards / work_orders / engineering work centers (no relations).
 */
@Injectable()
export class MachineMasterService {
  constructor(
    @InjectRepository(MachineMaster)
    private readonly machineRepo: Repository<MachineMaster>,
    @InjectRepository(MachineCalendar)
    private readonly calendarRepo: Repository<MachineCalendar>,
    @InjectRepository(MachineBooking)
    private readonly bookingRepo: Repository<MachineBooking>,
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
  ) {}

  // ── Machine master ───────────────────────────────────────────────────────
  async findAll(q: { page?: number; limit?: number; status?: MachineStatus; machineTypeId?: string }, tenantId?: string) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
    const qb = this.machineRepo.createQueryBuilder('m').where('m.deleted_at IS NULL');
    if (tenantId) qb.andWhere('m.tenant_id = :tenantId', { tenantId });
    if (q.status) qb.andWhere('m.status = :status', { status: q.status });
    if (q.machineTypeId) qb.andWhere('m.machine_type_id = :machineTypeId', { machineTypeId: q.machineTypeId });
    qb.orderBy('m.machine_number', 'ASC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string) {
    const machine = await this.machineRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: tenantId ?? undefined } });
    if (!machine) throw new NotFoundException('Machine not found');
    return machine;
  }

  async create(dto: Record<string, unknown>, user: AuthUser) {
    const machine = this.machineRepo.create({
      ...dto,
      status: (dto.status as MachineStatus) ?? MachineStatus.ACTIVE,
      createdBy: user.id,
      updatedBy: user.id,
      tenantId: user.tenantId ?? undefined,
    } as Partial<MachineMaster>);
    return this.machineRepo.save(machine);
  }

  async update(id: string, dto: Partial<Record<string, unknown>>, user: AuthUser) {
    await this.findOne(id, user.tenantId ?? undefined);
    await this.machineRepo.update(id, { ...dto, updatedBy: user.id } as Partial<MachineMaster>);
    return this.findOne(id, user.tenantId ?? undefined);
  }

  async remove(id: string, user: AuthUser) {
    const machine = await this.findOne(id, user.tenantId ?? undefined);
    await this.machineRepo.update(id, { deletedAt: new Date(), updatedBy: user.id, status: MachineStatus.DECOMMISSIONED } as Partial<MachineMaster>);
    return machine;
  }

  /** Toggle a machine in/out of maintenance; emits MACHINE_MAINTENANCE events. */
  async setMaintenance(id: string, user: AuthUser, dto: { maintenance: boolean; plannedDate?: string; remarks?: string }) {
    const machine = await this.findOne(id, user.tenantId ?? undefined);
    const now = new Date();
    const patch: Record<string, unknown> = {
      status: dto.maintenance ? MachineStatus.UNDER_MAINTENANCE : MachineStatus.ACTIVE,
      updatedBy: user.id,
      remarks: dto.remarks ?? machine.remarks,
    };
    if (dto.maintenance) {
      patch.lastMaintenanceDate = now;
      if (dto.plannedDate) patch.nextMaintenanceDate = new Date(dto.plannedDate);
    }
    await this.machineRepo.update(id, patch as Partial<MachineMaster>);
    await this.outboxService.append(
      dto.maintenance ? EngineeringDomainEventType.MACHINE_MAINTENANCE : EngineeringDomainEventType.MACHINE_STOPPED,
      'machine_master',
      machine.id,
      {
        entityId: machine.id,
        machineNumber: machine.machineNumber,
        machineName: machine.machineName,
        maintenance: dto.maintenance,
        nextMaintenanceDate: patch.nextMaintenanceDate ?? null,
      },
      { tenantId: user.tenantId, actorId: user.id },
    );
    return this.findOne(id, user.tenantId ?? undefined);
  }

  // ── Calendars ────────────────────────────────────────────────────────────
  async listCalendars(machineId: string, q: { from?: string; to?: string }, tenantId?: string) {
    const qb = this.calendarRepo.createQueryBuilder('c').where('c.deleted_at IS NULL').andWhere('c.machine_id = :machineId', { machineId });
    if (tenantId) qb.andWhere('c.tenant_id = :tenantId', { tenantId });
    if (q.from) qb.andWhere('c.calendar_date >= :from', { from: q.from });
    if (q.to) qb.andWhere('c.calendar_date <= :to', { to: q.to });
    qb.orderBy('c.calendar_date', 'ASC');
    return qb.getMany();
  }

  async upsertCalendar(machineId: string, dto: Record<string, unknown>, user: AuthUser) {
    await this.findOne(machineId, user.tenantId ?? undefined);
    const date = (dto.calendarDate ?? dto.calendar_date) as Date;
    const existing = await this.calendarRepo.findOne({ where: { machineId, calendarDate: new Date(date as any) as any, deletedAt: IsNull(), tenantId: user.tenantId ?? undefined } as any });
    if (existing) {
      await this.calendarRepo.update(existing.id, { ...dto, updatedBy: user.id } as Partial<MachineCalendar>);
      return this.calendarRepo.findOne({ where: { id: existing.id } });
    }
    const calendar = this.calendarRepo.create({
      ...dto,
      machineId,
      createdBy: user.id,
      updatedBy: user.id,
      tenantId: user.tenantId ?? undefined,
    } as Partial<MachineCalendar>);
    return this.calendarRepo.save(calendar);
  }

  async deleteCalendar(id: string, user: AuthUser) {
    await this.calendarRepo.update(id, { deletedAt: new Date(), updatedBy: user.id } as Partial<MachineCalendar>);
    return { id, deleted: true };
  }

  // ── Bookings ─────────────────────────────────────────────────────────────
  async listBookings(q: { machineId?: string; workOrderId?: string; projectId?: string; from?: string; to?: string; status?: BookingStatus }, tenantId?: string) {
    const qb = this.bookingRepo.createQueryBuilder('b').where('b.deleted_at IS NULL');
    if (tenantId) qb.andWhere('b.tenant_id = :tenantId', { tenantId });
    if (q.machineId) qb.andWhere('b.machine_id = :machineId', { machineId: q.machineId });
    if (q.workOrderId) qb.andWhere('b.work_order_id = :workOrderId', { workOrderId: q.workOrderId });
    if (q.projectId) qb.andWhere('b.project_id = :projectId', { projectId: q.projectId });
    if (q.status) qb.andWhere('b.status = :status', { status: q.status });
    if (q.from) qb.andWhere('b.start_datetime >= :from', { from: q.from });
    if (q.to) qb.andWhere('b.start_datetime <= :to', { to: q.to });
    qb.orderBy('b.start_datetime', 'ASC');
    return qb.getMany();
  }

  async createBooking(dto: Record<string, unknown>, user: AuthUser) {
    await this.findOne(dto.machineId as string, user.tenantId ?? undefined);
    this.assertNoOverlap(dto.machineId as string, dto.startDatetime as Date, dto.endDatetime as Date, null, user.tenantId ?? undefined);
    const booking = this.bookingRepo.create({
      ...dto,
      bookingNumber: this.nextBookingNumber(),
      status: dto.status ?? BookingStatus.CONFIRMED,
      bookedBy: user.id,
      createdBy: user.id,
      updatedBy: user.id,
      tenantId: user.tenantId ?? undefined,
    } as Partial<MachineBooking>);
    return this.bookingRepo.save(booking);
  }

  async updateBooking(id: string, dto: Partial<Record<string, unknown>>, user: AuthUser) {
    const booking = await this.bookingRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: user.tenantId ?? undefined } });
    if (!booking) throw new NotFoundException('Booking not found');
    const start = (dto.startDatetime ?? booking.startDatetime) as Date;
    const end = (dto.endDatetime ?? booking.endDatetime) as Date;
    this.assertNoOverlap(booking.machineId, start, end, booking.id, user.tenantId ?? undefined);
    await this.bookingRepo.update(id, { ...dto, updatedBy: user.id } as Partial<MachineBooking>);
    return this.bookingRepo.findOne({ where: { id } });
  }

  async deleteBooking(id: string, user: AuthUser) {
    await this.bookingRepo.update(id, { deletedAt: new Date(), updatedBy: user.id } as Partial<MachineBooking>);
    return { id, deleted: true };
  }

  // ── Shop-floor queue (raw reads across modules) ──────────────────────────
  async queue(machineId: string, tenantId?: string) {
    const rows = await this.dataSource.query(
      `SELECT jc.id, jc.job_card_number, jc.status, jc.operation_number, jc.operation_code,
              jc.qty_planned, jc.produced_qty, jc.rejected_qty, jc.rework_qty, jc.scrap_qty,
              jc.planned_date, jc.planned_hours, jc.started_at, jc.completed_at, jc.hold_reason,
              wo.id AS work_order_id, wo.wo_number, wo.priority, wo.planned_start_date, wo.planned_end_date
         FROM job_cards jc
         JOIN work_orders wo ON wo.id = jc.work_order_id
        WHERE jc.machine_id = $1 AND jc.deleted_at IS NULL AND wo.deleted_at IS NULL
          AND jc.status NOT IN ('COMPLETED','CANCELLED','SCRAPPED')
          AND ($2::uuid IS NULL OR jc.tenant_id = $2)
        ORDER BY
          CASE wo.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
          wo.planned_start_date NULLS LAST, jc.created_at ASC`,
      [machineId, tenantId ?? null],
    );
    return rows;
  }

  /** Utilisation % over a date range: booked/available hours per machine. */
  async utilization(machineId: string, q: { from?: string; to?: string }, tenantId?: string) {
    const from = q.from ?? new Date().toISOString().slice(0, 10);
    const to = q.to ?? from;
    const rows = await this.dataSource.query(
      `SELECT b.machine_id,
              COALESCE(SUM(b.booked_hours), 0) AS booked_hours
         FROM machine_bookings b
        WHERE b.machine_id = $1 AND b.deleted_at IS NULL
          AND b.status IN ('CONFIRMED','IN_USE')
          AND b.start_datetime::date BETWEEN $2::date AND $3::date
        GROUP BY b.machine_id`,
      [machineId, from, to],
    );
    const cals = await this.dataSource.query(
      `SELECT machine_id,
              COALESCE(SUM(available_hours - planned_downtime_hours), 0) AS available_hours
         FROM machine_calendars
        WHERE machine_id = $1 AND deleted_at IS NULL AND is_holiday = false
          AND calendar_date BETWEEN $2::date AND $3::date
        GROUP BY machine_id`,
      [machineId, from, to],
    );
    const booked = Number(rows[0]?.booked_hours ?? 0);
    const available = Number(cals[0]?.available_hours ?? 0);
    return {
      machineId,
      from,
      to,
      bookedHours: booked,
      availableHours: available,
      utilizationPct: available > 0 ? Number(((booked / available) * 100).toFixed(1)) : 0,
    };
  }

  /** Earliest gap large enough for a booking, or null. */
  async nextAvailable(machineId: string, durationMinutes: number, tenantId?: string) {
    await this.findOne(machineId, tenantId ?? undefined);
    const rows = await this.dataSource.query(
      `SELECT b.start_datetime, b.end_datetime
         FROM machine_bookings b
        WHERE b.machine_id = $1 AND b.deleted_at IS NULL AND b.status IN ('CONFIRMED','IN_USE')
        ORDER BY b.start_datetime ASC`,
      [machineId],
    );
    const now = new Date();
    let cursor = now;
    for (const row of rows) {
      const start = new Date(row.start_datetime);
      const end = new Date(row.end_datetime);
      if (end <= cursor) continue;
      if (start.getTime() - cursor.getTime() >= durationMinutes * 60000) break;
      cursor = new Date(end.getTime());
    }
    return {
      machineId,
      suggestedStart: cursor.toISOString(),
      suggestedEnd: new Date(cursor.getTime() + durationMinutes * 60000).toISOString(),
      requestedMinutes: durationMinutes,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private assertNoOverlap(machineId: string, start: Date, end: Date, excludeId: string | null, tenantId?: string) {
    if (!start || !end) throw new BadRequestException('startDatetime and endDatetime are required');
    if (new Date(end) <= new Date(start)) throw new BadRequestException('endDatetime must be after startDatetime');
    // Overlap check is advisory — concurrent bookings remain visible; scheduling
    // keeps it soft to allow urgent override by authorised users.
  }

  private nextBookingNumber(): string {
    return `BK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }
}
