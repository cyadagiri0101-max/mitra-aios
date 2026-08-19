import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { JobCard, JobCardStatus } from '../entities/jobcard.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { MachineMasterService } from '@modules/machine/services/machinemaster.service';
import { BookingStatus } from '@modules/machine/entities/machinebooking.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Sprint 2.4 MES — Finite Scheduling (Phase 4).
 *
 * Assignment is machine-type driven: a job card inherits the machine type
 * of its engineering operation; this service picks the least-loaded machine
 * of that type, persists the machine assignment on the job card, and writes
 * a machine_booking. Bookings are advisory (soft overlap) — urgent override
 * remains possible for authorised users.
 */
@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly dataSource: DataSource,
    private readonly machineService: MachineMasterService,
    private readonly outboxService: OutboxService,
  ) {}

  /** Fail-closed tenant guard - mirrors TenantAwareService.requireTenant. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  /** Overview for the scheduling board: machines + load + active jobs. */
  async overview(q: { from?: string; to?: string; machineTypeId?: string }, tenantId?: string) {
    const from = q.from ?? new Date().toISOString().slice(0, 10);
    const to = q.to ?? from;
    const machines = await this.machineService.findAll({ limit: 100, machineTypeId: q.machineTypeId }, tenantId);
    const machineIds = machines.data.map((m) => m.id);
    let loadRows: any[] = [];
    let jobRows: any[] = [];
    if (machineIds.length > 0) {
      loadRows = await this.dataSource.query(
        `SELECT machine_id, status,
                COALESCE(SUM(booked_hours), 0) AS booked_hours
           FROM machine_bookings
          WHERE machine_id = ANY($1) AND deleted_at IS NULL
            AND status IN ('CONFIRMED','IN_USE')
            AND start_datetime::date BETWEEN $2::date AND $3::date
          GROUP BY machine_id, status`,
        [machineIds, from, to],
      );
      jobRows = await this.dataSource.query(
        `SELECT machine_id, status, COUNT(*) AS open_jobs
           FROM job_cards
          WHERE machine_id = ANY($1) AND deleted_at IS NULL
            AND status NOT IN ('COMPLETED','CANCELLED','SCRAPPED')
          GROUP BY machine_id, status`,
        [machineIds],
      );
    }
    const loadBy = (rows: any[], key: string) => {
      const map: Record<string, any> = {};
      for (const r of rows) {
        map[r[key]] = (map[r[key]] ?? 0) + Number(r.booked_hours ?? r.open_jobs ?? 0);
      }
      return map;
    };
    return {
      from,
      to,
      machines: machines.data.map((m) => ({
        id: m.id,
        machineNumber: m.machineNumber,
        machineName: m.machineName,
        machineTypeId: m.machineTypeId,
        status: m.status,
        bookedHours: loadBy(loadRows, 'machine_id')[m.id] ?? 0,
        openJobs: loadBy(jobRows, 'machine_id')[m.id] ?? 0,
      })),
      total: machines.total,
    };
  }

  /** Assign a job card to a specific machine (+ booking). */
  async assignToMachine(jobId: string, machineId: string, user: AuthUser, dto: { startDatetime?: string; endDatetime?: string; shift?: string; allowOverlap?: boolean } = {}) {
    const tenantId = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const job = await em.getRepository(JobCard).findOne({ where: { id: jobId, tenantId } });
      if (!job) throw new NotFoundException('Job card not found');
      if (job.status === JobCardStatus.COMPLETED || job.status === JobCardStatus.CANCELLED || job.status === JobCardStatus.SCRAPPED) {
        throw new BadRequestException('Cannot reassign a terminal job');
      }
      await this.machineService.findOne(machineId, tenantId);

      const hours = job.plannedHours ?? 8;
      const start = dto.startDatetime ? new Date(dto.startDatetime) : new Date();
      const end = dto.endDatetime ? new Date(dto.endDatetime) : new Date(start.getTime() + hours * 3600000);

      // Check machine conflict if overlap is not explicitly allowed
      if (!dto.allowOverlap && !['ADMIN', 'MANAGEMENT'].includes(user.role)) {
        const conflicts = await em.query(
          `SELECT id, booking_number, start_datetime, end_datetime 
             FROM machine_bookings 
            WHERE machine_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
              AND status IN ('CONFIRMED', 'IN_USE')
              AND start_datetime < $4 AND end_datetime > $3`,
          [machineId, tenantId, start, end],
        );
        if (conflicts.length > 0) {
          throw new BadRequestException(
            `Machine conflict: machine is already booked for booking ${conflicts[0].booking_number} from ${new Date(conflicts[0].start_datetime).toISOString()} to ${new Date(conflicts[0].end_datetime).toISOString()}. Set allowOverlap=true for supervisor override.`,
          );
        }
      }

      await em.getRepository(JobCard).update({ id: job.id, tenantId }, { machineId, updatedBy: user.id } as any);
      const booking = await this.machineService.createBooking({
        machineId,
        workOrderId: job.workOrderId,
        startDatetime: start,
        endDatetime: end,
        bookedHours: hours,
        shift: dto.shift ?? null,
        purpose: `Job ${job.jobCardNumber}`,
      }, user);

      await this.outboxService.append(EngineeringDomainEventType.SCHEDULE_ASSIGNED, 'job_card', job.id, {
        entityId: job.id,
        entityNumber: job.jobCardNumber,
        workOrderId: job.workOrderId,
        machineId,
        bookingId: booking.id,
        startDatetime: start.toISOString(),
        endDatetime: end.toISOString(),
      }, { tenantId: user.tenantId, actorId: user.id, em });

      return { id: job.id, machineId, booking };
    });
  }

  /**
   * Auto-schedule all unassigned job cards of a released work order:
   * machines are selected by operation machine type, least-loaded first.
   */
  async batchSchedule(workOrderId: string, user: AuthUser) {
    const tenantId = this.requireTenant(user.tenantId);
    const wo = await this.workOrderRepo.findOne({ where: { id: workOrderId, tenantId } });
    if (!wo) throw new NotFoundException('Work order not found');
    const jobs = await this.jobCardRepo.find({ where: { workOrderId, machineId: IsNull(), tenantId } });
    const results: Array<Record<string, unknown>> = [];
    for (const job of jobs) {
      const machine = await this.pickMachine(job.operationId, tenantId);
      if (!machine) {
        results.push({ jobId: job.id, jobCardNumber: job.jobCardNumber, assigned: false, reason: 'no machine of required type available' });
        continue;
      }
      await this.assignToMachine(job.id, machine.id, user, {});
      results.push({ jobId: job.id, jobCardNumber: job.jobCardNumber, assigned: true, machineId: machine.id, machineNumber: machine.machineNumber });
    }
    return { workOrderId, woNumber: wo.woNumber, scheduled: results.filter((r) => r.assigned).length, unscheduled: results.length - results.filter((r) => r.assigned).length, results };
  }

  /** Machines of the same type as the job's operation, least-loaded first. */
  async alternates(jobId: string, tenantId?: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const job = await this.jobCardRepo.findOne({ where: { id: jobId, tenantId: scopeTenant } });
    if (!job) throw new NotFoundException('Job card not found');
    const machineTypeId = await this.operationMachineTypeId(job.operationId, scopeTenant);
    if (!machineTypeId) return [];
    const machines = await this.machineService.findAll({ limit: 100, machineTypeId }, scopeTenant);
    return machines.data;
  }

  /** Bookings across machines (delegates to the machine module). */
  async listBookings(q: { workOrderId?: string; machineId?: string; status?: BookingStatus; from?: string; to?: string }, tenantId?: string) {
    return this.machineService.listBookings(q, tenantId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private async operationMachineTypeId(operationId: string | null, tenantId: string): Promise<string | null> {
    if (!operationId) return null;
    const rows = await this.dataSource.query(
      `SELECT machine_type_id FROM engineering_operations WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [operationId, tenantId],
    );
    return rows[0]?.machine_type_id ?? null;
  }

  private async pickMachine(operationId: string | null, tenantId: string): Promise<{ id: string; machineNumber: string } | null> {
    const machineTypeId = await this.operationMachineTypeId(operationId, tenantId);
    if (!machineTypeId) return null;
    const rows = await this.dataSource.query(
      `SELECT m.id, m.machine_number, COUNT(jc.id) AS load_count
         FROM machine_masters m
         LEFT JOIN job_cards jc
           ON jc.machine_id = m.id AND jc.deleted_at IS NULL AND jc.tenant_id = $2
          AND jc.status NOT IN ('COMPLETED','CANCELLED','SCRAPPED')
        WHERE m.machine_type_id = $1 AND m.tenant_id = $2 AND m.deleted_at IS NULL
          AND m.status IN ('ACTIVE','IDLE')
        GROUP BY m.id, m.machine_number
        ORDER BY load_count ASC, m.machine_number ASC
        LIMIT 1`,
      [machineTypeId, tenantId],
    );
    return rows[0] ? { id: rows[0].id, machineNumber: rows[0].machine_number } : null;
  }
}
