import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { ResourceAvailability, AvailabilityType } from '../entities/resource-availability.entity';
import { EmployeeService } from './employee.service';
import { AuditService } from '../../audit/services/audit.service';

/**
 * Resource availability foundation (M1 Sprint 1).
 *
 * Tenant isolation: employee is resolved through the tenant-scoped
 * EmployeeService before any mutation; every query is tenant-filtered.
 * Unique constraint: one row per (employee, work_date, tenant).
 */
@Injectable()
export class ResourceAvailabilityService extends TenantAwareService<ResourceAvailability> {
  constructor(
    @InjectRepository(ResourceAvailability) repo: Repository<ResourceAvailability>,
    private readonly employeeService: EmployeeService,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'ResourceAvailability');
  }

  async findByEmployee(
    employeeId: string,
    from?: string,
    to?: string,
    tenantId?: string | null,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.employeeService.findOne(employeeId, scopeTenant);

    const qb = this.repo
      .createQueryBuilder('ra')
      .where('ra.deleted_at IS NULL')
      .andWhere('ra.tenant_id = :tenantId', { tenantId: scopeTenant })
      .andWhere('ra.employee_id = :employeeId', { employeeId });

    if (from) qb.andWhere('ra.work_date >= :from', { from });
    if (to) qb.andWhere('ra.work_date <= :to', { to });

    qb.orderBy('ra.work_date', 'ASC');
    const rows = await qb.getMany();
    return { data: rows, total: rows.length };
  }

  async findForRange(
    from?: string,
    to?: string,
    tenantId?: string | null,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.repo
      .createQueryBuilder('ra')
      .innerJoin('employees', 'e', 'e.id = ra.employee_id AND e.deleted_at IS NULL')
      .where('ra.deleted_at IS NULL')
      .andWhere('ra.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (from) qb.andWhere('ra.work_date >= :from', { from });
    if (to) qb.andWhere('ra.work_date <= :to', { to });

    qb.orderBy('ra.work_date', 'ASC')
      .addOrderBy('ra.employee_id', 'ASC')
      .limit(1000);

    const rows = await qb.getMany();
    return { data: rows, total: rows.length };
  }

  async createForEmployee(
    employeeId: string,
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ResourceAvailability> {
    const scopeTenant = this.requireTenant(tenantId);
    const employee = await this.employeeService.findOne(employeeId, scopeTenant);
    const workDate = new Date(String(dto.workDate));

    const existing = await this.repo.findOne({
      where: { employeeId: employee.id, workDate, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (existing) {
      throw new BadRequestException('Availability already exists for this date; update it instead');
    }

    const row = this.repo.create({
      employeeId: employee.id,
      workDate,
      availabilityType: (dto.availabilityType as AvailabilityType) ?? AvailabilityType.AVAILABLE,
      availableHours: (dto.availableHours as number) ?? null,
      notes: (dto.notes as string) ?? null,
      tenantId: scopeTenant,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    } as unknown as ResourceAvailability);

    const saved = await this.repo.save(row);
    await this.auditService.logBusinessEvent(
      'availability.created',
      'ResourceAvailability',
      saved.id,
      userId ?? 'system',
      { employeeId: saved.employeeId, workDate: saved.workDate.toISOString().slice(0, 10), availabilityType: saved.availabilityType, tenantId: scopeTenant },
    );
    return saved;
  }

  async updateForEmployee(
    employeeId: string,
    workDate: string,
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ResourceAvailability> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.employeeService.findOne(employeeId, scopeTenant);
    const row = await this.findOneByEmployeeAndDate(employeeId, new Date(workDate), scopeTenant);

    const protectedFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'tenantId', 'employeeId'];
    const allowed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (!protectedFields.includes(key)) allowed[key] = value;
    }
    Object.assign(row, allowed, { updatedBy: userId ?? null });
    const saved = await this.repo.save(row);
    await this.auditService.logBusinessEvent(
      'availability.updated',
      'ResourceAvailability',
      saved.id,
      userId ?? 'system',
      { employeeId: saved.employeeId, workDate: saved.workDate.toISOString().slice(0, 10), changedFields: Object.keys(allowed), tenantId: scopeTenant },
    );
    return saved;
  }

  async removeForEmployee(
    employeeId: string,
    workDate: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ deleted: true; id: string }> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.employeeService.findOne(employeeId, scopeTenant);
    const row = await this.findOneByEmployeeAndDate(employeeId, new Date(workDate), scopeTenant);
    row.deletedAt = new Date();
    row.updatedBy = userId ?? null;
    await this.repo.save(row);
    await this.auditService.logBusinessEvent(
      'availability.deleted',
      'ResourceAvailability',
      row.id,
      userId ?? 'system',
      { employeeId: row.employeeId, workDate: row.workDate.toISOString().slice(0, 10), tenantId: scopeTenant },
    );
    return { deleted: true, id: row.id };
  }

  private async findOneByEmployeeAndDate(
    employeeId: string,
    workDate: Date,
    tenantId: string,
  ): Promise<ResourceAvailability> {
    const row = await this.repo.findOne({
      where: { employeeId, workDate, tenantId, deletedAt: IsNull() } as any,
    });
    if (!row) {
      throw new BadRequestException('No availability record for this employee and date');
    }
    return row;
  }
}