import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EmployeeSkill, EmployeeSkillStatus, ProficiencyLevel } from '../entities/employee-skill.entity';
import { EmployeeService } from './employee.service';
import { SkillService } from './skill.service';
import { AuditService } from '../../audit/services/audit.service';

/**
 * Employee–skill matrix service. Tenant isolation is enforced by resolving
 * the employee and skill through the tenant-scoped Employee/Skill services
 * before any relationship mutation; every query is tenant-filtered.
 */
@Injectable()
export class EmployeeSkillService {
  constructor(
    @InjectRepository(EmployeeSkill)
    private readonly repo: Repository<EmployeeSkill>,
    private readonly employeeService: EmployeeService,
    private readonly skillService: SkillService,
    private readonly auditService: AuditService,
  ) {}

  async findByEmployee(employeeId: string, tenantId?: string | null) {
    const employee = await this.employeeService.findOne(employeeId, tenantId);
    const scopeTenant = employee.tenantId as string;
    const rows = await this.repo
      .createQueryBuilder('es')
      .innerJoinAndSelect('skills', 's', 's.id = es.skill_id AND s.deleted_at IS NULL')
      .where('es.employee_id = :employeeId', { employeeId })
      .andWhere('es.deleted_at IS NULL')
      .andWhere('es.tenant_id = :tenantId', { tenantId: scopeTenant })
      .orderBy('s.name', 'ASC')
      .getMany();

    return rows.map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      skillId: row.skillId,
      skillCode: (row as unknown as { s_code?: string }).s_code ?? null,
      skillName: (row as unknown as { s_name?: string }).s_name ?? null,
      proficiencyLevel: row.proficiencyLevel,
      certification: row.certification,
      effectiveDate: row.effectiveDate,
      expiresAt: row.expiresAt,
      status: row.status,
      notes: row.notes,
    }));
  }

  async assign(
    employeeId: string,
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<EmployeeSkill> {
    const employee = await this.employeeService.findOne(employeeId, tenantId);
    const scopeTenant = employee.tenantId as string;
    const skill = await this.skillService.findOne(dto.skillId as string, scopeTenant);

    const existing = await this.repo.findOne({
      where: { employeeId: employee.id, skillId: skill.id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (existing) {
      throw new BadRequestException('Skill is already assigned to this employee');
    }

    const row = this.repo.create({
      employeeId: employee.id,
      skillId: skill.id,
      proficiencyLevel: (dto.proficiencyLevel as ProficiencyLevel) ?? ProficiencyLevel.BEGINNER,
      certification: (dto.certification as string) ?? null,
      effectiveDate: dto.effectiveDate ? new Date(String(dto.effectiveDate)) : null,
      expiresAt: dto.expiresAt ? new Date(String(dto.expiresAt)) : null,
      status: (dto.status as EmployeeSkillStatus) ?? EmployeeSkillStatus.ACTIVE,
      notes: (dto.notes as string) ?? null,
      tenantId: scopeTenant,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    } as unknown as EmployeeSkill);

    const saved = await this.repo.save(row);
    await this.auditService.logBusinessEvent(
      'employee_skill.assigned',
      'EmployeeSkill',
      saved.id,
      userId ?? 'system',
      { employeeId: saved.employeeId, skillId: saved.skillId, proficiencyLevel: saved.proficiencyLevel, tenantId: scopeTenant },
    );
    return saved;
  }

  async update(
    employeeId: string,
    skillId: string,
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<EmployeeSkill> {
    const employee = await this.employeeService.findOne(employeeId, tenantId);
    const scopeTenant = employee.tenantId as string;
    const row = await this.findOne(employeeId, skillId, scopeTenant);

    const protectedFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'tenantId', 'employeeId', 'skillId'];
    const allowed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (!protectedFields.includes(key)) allowed[key] = value;
    }
    Object.assign(row, allowed, { updatedBy: userId ?? null });
    const saved = await this.repo.save(row);
    await this.auditService.logBusinessEvent(
      'employee_skill.updated',
      'EmployeeSkill',
      saved.id,
      userId ?? 'system',
      { employeeId: saved.employeeId, skillId: saved.skillId, changedFields: Object.keys(allowed), tenantId: scopeTenant },
    );
    return saved;
  }

  async remove(
    employeeId: string,
    skillId: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ deleted: true; id: string }> {
    const employee = await this.employeeService.findOne(employeeId, tenantId);
    const scopeTenant = employee.tenantId as string;
    const row = await this.findOne(employeeId, skillId, scopeTenant);
    row.deletedAt = new Date();
    row.updatedBy = userId ?? null;
    await this.repo.save(row);
    await this.auditService.logBusinessEvent(
      'employee_skill.removed',
      'EmployeeSkill',
      row.id,
      userId ?? 'system',
      { employeeId: row.employeeId, skillId: row.skillId, tenantId: scopeTenant },
    );
    return { deleted: true, id: row.id };
  }

  /** Employees holding one of the given skill codes (tenant-scoped). */
  async employeesForSkillCodes(codes: string[], tenantId?: string | null) {
    return this.employeeService.findBySkillCodes(codes, tenantId);
  }

  private async findOne(
    employeeId: string,
    skillId: string,
    tenantId: string,
  ): Promise<EmployeeSkill> {
    const row = await this.repo.findOne({
      where: { employeeId, skillId, tenantId, deletedAt: IsNull() } as any,
    });
    if (!row) throw new NotFoundException('Employee skill assignment not found');
    return row;
  }
}