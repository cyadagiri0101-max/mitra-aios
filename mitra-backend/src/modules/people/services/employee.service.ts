import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { Employee, EmployeeStatus } from '../entities/employee.entity';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class EmployeeService extends TenantAwareService<Employee> {
  constructor(
    @InjectRepository(Employee) repo: Repository<Employee>,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'Employee');
  }

  async findAll(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    skill?: string,
    status?: string,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.deleted_at IS NULL')
      .andWhere('e.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (search?.trim()) {
      qb.andWhere(
        '(e.employee_code ILIKE :search OR e.first_name ILIKE :search OR e.last_name ILIKE :search OR e.email ILIKE :search OR e.designation ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }
    if (status) {
      qb.andWhere('e.status = :status', { status });
    }
    if (skill?.trim()) {
      qb.innerJoin('employee_skills', 'es', 'es.employee_id = e.id AND es.deleted_at IS NULL AND es.tenant_id = e.tenant_id')
        .innerJoin('skills', 's', 's.id = es.skill_id AND s.deleted_at IS NULL')
        .andWhere('(s.code ILIKE :skill OR s.name ILIKE :skill)', { skill: `%${skill.trim()}%` });
    }

    qb.orderBy('e.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(Math.min(limit, 100));

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Employee> {
    const scopeTenant = this.requireTenant(tenantId);
    const employeeCode = String(dto.employeeCode ?? '').trim();
    if (!employeeCode) throw new BadRequestException('employeeCode is required');

    const duplicate = await this.repo.findOne({
      where: { employeeCode, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (duplicate) {
      throw new BadRequestException(`Employee code already exists: ${employeeCode}`);
    }

    const employee = this.repo.create({
      ...this.extractAllowedFields(dto),
      employeeCode,
      status: (dto.status as EmployeeStatus) ?? EmployeeStatus.ACTIVE,
      tenantId: scopeTenant,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    } as unknown as Employee);

    const saved = await this.repo.save(employee);
    await this.auditService.logBusinessEvent(
      'employee.created',
      'Employee',
      saved.id,
      userId ?? 'system',
      { employeeCode: saved.employeeCode, email: saved.email, tenantId: scopeTenant },
    );
    return saved;
  }

  async update(
    id: string,
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Employee> {
    const scopeTenant = this.requireTenant(tenantId);
    const employee = await this.findOne(id, scopeTenant);

    if (dto.employeeCode !== undefined && String(dto.employeeCode).trim() !== employee.employeeCode) {
      const duplicate = await this.repo.findOne({
        where: { employeeCode: String(dto.employeeCode).trim(), tenantId: scopeTenant, deletedAt: IsNull() } as any,
      });
      if (duplicate) {
        throw new BadRequestException(`Employee code already exists: ${dto.employeeCode}`);
      }
    }

    const wasActive = employee.status === EmployeeStatus.ACTIVE;
    const allowed = this.extractAllowedFields(dto);
    Object.assign(employee, allowed, { updatedBy: userId ?? null });
    const saved = await this.repo.save(employee);

    const nowInactive = saved.status !== EmployeeStatus.ACTIVE;
    if (wasActive && nowInactive) {
      await this.auditService.logBusinessEvent(
        'employee.deactivated',
        'Employee',
        saved.id,
        userId ?? 'system',
        { employeeCode: saved.employeeCode, tenantId: scopeTenant },
      );
    } else {
      await this.auditService.logBusinessEvent(
        'employee.updated',
        'Employee',
        saved.id,
        userId ?? 'system',
        { employeeCode: saved.employeeCode, changedFields: Object.keys(allowed), tenantId: scopeTenant },
      );
    }
    return saved;
  }

  async remove(
    id: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ deleted: true; id: string }> {
    const scopeTenant = this.requireTenant(tenantId);
    const employee = await this.findOne(id, scopeTenant);
    const now = new Date();
    employee.deletedAt = now;
    employee.updatedBy = userId ?? null;
    await this.repo.save(employee);
    await this.auditService.logBusinessEvent(
      'employee.deleted',
      'Employee',
      id,
      userId ?? 'system',
      { employeeCode: employee.employeeCode, tenantId: scopeTenant },
    );
    return { deleted: true, id };
  }

  /** Tenant-scoped helper for the skill matrix service. */
  async findActive(tenantId?: string | null): Promise<Employee[]> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.repo.find({
      where: { tenantId: scopeTenant, deletedAt: IsNull(), status: EmployeeStatus.ACTIVE } as any,
      order: { employeeCode: 'ASC' } as any,
      take: 1000,
    });
  }

  /** Resolve employees by skill code (used by /skills/:id/employees via EmployeeSkillService). */
  async findBySkillCodes(codes: string[], tenantId?: string | null): Promise<Employee[]> {
    if (!codes.length) return [];
    const scopeTenant = this.requireTenant(tenantId);
    return this.repo
      .createQueryBuilder('e')
      .innerJoin('employee_skills', 'es', 'es.employee_id = e.id AND es.deleted_at IS NULL AND es.status = :esStatus AND es.tenant_id = e.tenant_id')
      .innerJoin('skills', 's', 's.id = es.skill_id AND s.deleted_at IS NULL')
      .where('e.deleted_at IS NULL')
      .andWhere('e.tenant_id = :tenantId', { tenantId: scopeTenant })
      .andWhere('s.code IN (:...codes)', { codes })
      .setParameters({ esStatus: 'ACTIVE' })
      .orderBy('e.employee_code', 'ASC')
      .limit(500)
      .getMany();
  }
}