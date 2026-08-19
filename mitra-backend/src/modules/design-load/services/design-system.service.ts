import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { DesignSystem, DesignSystemStatus } from '../entities/design-system.entity';
import { DesignShift } from '../entities/design-shift.entity';
import { CreateDesignSystemDto, UpdateDesignSystemDto } from '../dto/design-system.dto';

@Injectable()
export class DesignSystemService extends TenantAwareService<DesignSystem> {
  constructor(
    @InjectRepository(DesignSystem) repo: Repository<DesignSystem>,
    @InjectRepository(DesignShift)
    private readonly shiftRepo: Repository<DesignShift>,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'DesignSystem');
  }

  async findAllSystems(
    tenantId?: string | null,
    status?: DesignSystemStatus,
    search?: string,
  ): Promise<{ data: DesignSystem[]; total: number; totalDailyCapacityHours: number }> {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere('s.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (status) {
      qb.andWhere('s.status = :status', { status });
    }
    if (search?.trim()) {
      qb.andWhere('(s.system_code ILIKE :q OR s.name ILIKE :q)', { q: `%${search.trim()}%` });
    }

    qb.orderBy('s.system_code', 'ASC');

    const [data, total] = await qb.getManyAndCount();
    const totalDailyCapacityHours = data
      .filter((s) => s.status === DesignSystemStatus.ACTIVE)
      .reduce((acc, s) => acc + Number(s.dailyCapacityHours || 0), 0);

    return { data, total, totalDailyCapacityHours };
  }

  async findOneSystem(id: string, tenantId?: string | null): Promise<DesignSystem> {
    const scopeTenant = this.requireTenant(tenantId);
    const system = await this.repo.findOne({
      where: { id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (!system) {
      throw new NotFoundException(`Design system ${id} not found`);
    }
    return system;
  }

  async createSystem(
    dto: CreateDesignSystemDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<DesignSystem> {
    const scopeTenant = this.requireTenant(tenantId);
    const systemCode = dto.systemCode.trim();

    const existing = await this.repo.findOne({
      where: { systemCode, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (existing) {
      throw new BadRequestException(`Design system with code '${systemCode}' already exists`);
    }

    const system = this.repo.create({
      ...dto,
      tenantId: scopeTenant,
      createdBy: userId,
    });

    const saved = await this.repo.save(system);

    await this.auditService.logBusinessEvent(
      'design_system.created',
      'design_system',
      saved.id,
      userId ?? 'system',
      { systemCode: saved.systemCode, name: saved.name },
      undefined,
      undefined,
      scopeTenant,
    );

    return saved;
  }

  async updateSystem(
    id: string,
    dto: UpdateDesignSystemDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<DesignSystem> {
    const scopeTenant = this.requireTenant(tenantId);
    const system = await this.findOneSystem(id, scopeTenant);

    Object.assign(system, dto, { updatedBy: userId });
    const updated = await this.repo.save(system);

    await this.auditService.logBusinessEvent(
      'design_system.updated',
      'design_system',
      id,
      userId ?? 'system',
      dto,
      undefined,
      undefined,
      scopeTenant,
    );

    return updated;
  }

  async findAllShifts(tenantId?: string | null): Promise<DesignShift[]> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.shiftRepo.find({
      where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
      order: { shiftCode: 'ASC' } as any,
    });
  }

  async seedDefaultSystemsAndShifts(
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ systemsCount: number; shiftsCount: number }> {
    const scopeTenant = this.requireTenant(tenantId);

    // 1. Seed 3 default shifts
    const existingShifts = await this.shiftRepo.find({
      where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (existingShifts.length === 0) {
      const defaultShifts = [
        { shiftCode: 'SHIFT_1', name: 'Morning Shift', startTime: '06:00', endTime: '14:00', durationHours: 8.0 },
        { shiftCode: 'SHIFT_2', name: 'Evening Shift', startTime: '14:00', endTime: '22:00', durationHours: 8.0 },
        { shiftCode: 'SHIFT_3', name: 'Night Shift', startTime: '22:00', endTime: '06:00', durationHours: 8.0 },
      ];
      await this.shiftRepo.save(
        defaultShifts.map((s) => this.shiftRepo.create({ ...s, tenantId: scopeTenant, createdBy: userId })),
      );
    }

    // 2. Seed 10 default workstations if none exist
    const existingSystems = await this.repo.find({
      where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (existingSystems.length === 0) {
      const workstations = Array.from({ length: 10 }, (_, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        return {
          systemCode: `CAD-WS-${num}`,
          name: `Design Workstation ${num}`,
          specifications: '32-core Xeon, 64GB RAM, RTX A4000 GPU',
          softwareLicenses: 'Siemens NX CAD, Moldflow, Mastercam',
          location: 'Design Engineering Studio',
          totalShiftsSupported: 3,
          shift1Available: true,
          shift2Available: true,
          shift3Available: true,
          dailyCapacityHours: 24.0,
        };
      });
      await this.repo.save(
        workstations.map((ws) => this.repo.create({ ...ws, tenantId: scopeTenant, createdBy: userId })),
      );
    }

    const currentSystems = await this.repo.count({
      where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    const currentShifts = await this.shiftRepo.count({
      where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    return { systemsCount: currentSystems, shiftsCount: currentShifts };
  }
}
