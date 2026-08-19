import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { OutboxService } from '../../platform/services/outbox.service';
import {
  DesignLoadStandard,
  DesignStandardStatus,
} from '../entities/design-load-standard.entity';
import {
  DesignLoadStandardStage,
  StandardStageStatus,
} from '../entities/design-load-standard-stage.entity';
import {
  CreateDesignStandardDto,
  UpdateDesignStandardDto,
  CreateStandardStageDto,
} from '../dto/design-standard.dto';

@Injectable()
export class DesignLoadStandardService extends TenantAwareService<DesignLoadStandard> {
  constructor(
    @InjectRepository(DesignLoadStandard) repo: Repository<DesignLoadStandard>,
    @InjectRepository(DesignLoadStandardStage)
    private readonly stageRepo: Repository<DesignLoadStandardStage>,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'DesignLoadStandard');
  }

  async findAll(
    tenantId?: string | null,
    page = 1,
    limit = 50,
    status?: DesignStandardStatus,
    projectType?: string,
    moldType?: string,
    search?: string,
  ): Promise<{ data: DesignLoadStandard[]; total: number; page: number; limit: number; totalPages: number }> {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.repo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.stages', 'stage')
      .where('s.deleted_at IS NULL')
      .andWhere('s.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (status) {
      qb.andWhere('s.status = :status', { status });
    }
    if (projectType) {
      qb.andWhere('s.project_type = :projectType', { projectType });
    }
    if (moldType) {
      qb.andWhere('s.mold_type = :moldType', { moldType });
    }
    if (search?.trim()) {
      qb.andWhere('(s.code ILIKE :q OR s.name ILIKE :q OR s.description ILIKE :q)', {
        q: `%${search.trim()}%`,
      });
    }

    qb.orderBy('s.created_at', 'DESC');
    qb.addOrderBy('stage.sequence', 'ASC');
    qb.skip((page - 1) * limit).take(Math.min(limit, 100));

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / (limit || 1)) };
  }

  async findOneWithStages(id: string, tenantId?: string | null): Promise<DesignLoadStandard> {
    const scopeTenant = this.requireTenant(tenantId);
    const standard = await this.repo.findOne({
      where: { id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      relations: ['stages'],
      order: { stages: { sequence: 'ASC' } } as any,
    });
    if (!standard) {
      throw new NotFoundException(`Design standard ${id} not found`);
    }
    return standard;
  }

  async createStandard(
    dto: CreateDesignStandardDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<DesignLoadStandard> {
    const scopeTenant = this.requireTenant(tenantId);
    const code = dto.code.trim();

    const existing = await this.repo.findOne({
      where: { code, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (existing) {
      throw new BadRequestException(`Design standard with code '${code}' already exists`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let calculatedDays = dto.totalStandardDurationDays ?? 0;
      let calculatedHours = dto.totalStandardHours ?? 0;

      if (dto.stages && dto.stages.length > 0) {
        calculatedDays = dto.stages.reduce((acc, s) => acc + Number(s.standardDurationDays), 0);
        calculatedHours = dto.stages.reduce((acc, s) => acc + Number(s.standardHours), 0);
      }

      const standard = this.repo.create({
        ...dto,
        tenantId: scopeTenant,
        createdBy: userId,
        totalStandardDurationDays: calculatedDays > 0 ? calculatedDays : 10.0,
        totalStandardHours: calculatedHours > 0 ? calculatedHours : 80.0,
        stages: [],
      });

      const savedStandard = await queryRunner.manager.save(standard);

      if (dto.stages && dto.stages.length > 0) {
        const stageEntities = dto.stages.map((stageDto) =>
          this.stageRepo.create({
            ...stageDto,
            standardId: savedStandard.id,
            tenantId: scopeTenant,
            createdBy: userId,
          }),
        );
        savedStandard.stages = await queryRunner.manager.save(stageEntities);
      }

      await queryRunner.commitTransaction();

      await this.auditService.logBusinessEvent(
        'design_standard.created',
        'design_load_standard',
        savedStandard.id,
        userId ?? 'system',
        { code: savedStandard.code, name: savedStandard.name },
        undefined,
        undefined,
        scopeTenant,
      );

      await this.outboxService.append(
        'design_standard.created',
        'design_load_standard',
        savedStandard.id,
        { id: savedStandard.id, code: savedStandard.code },
        { tenantId: scopeTenant, actorId: userId },
      );

      return this.findOneWithStages(savedStandard.id, scopeTenant);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStandard(
    id: string,
    dto: UpdateDesignStandardDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<DesignLoadStandard> {
    const scopeTenant = this.requireTenant(tenantId);
    const standard = await this.findOneWithStages(id, scopeTenant);

    Object.assign(standard, dto, { updatedBy: userId });
    const updated = await this.repo.save(standard);

    await this.auditService.logBusinessEvent(
      'design_standard.updated',
      'design_load_standard',
      id,
      userId ?? 'system',
      dto,
      undefined,
      undefined,
      scopeTenant,
    );

    return updated;
  }

  async addStage(
    standardId: string,
    dto: CreateStandardStageDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<DesignLoadStandardStage> {
    const scopeTenant = this.requireTenant(tenantId);
    const standard = await this.findOneWithStages(standardId, scopeTenant);

    const stage = this.stageRepo.create({
      ...dto,
      standardId: standard.id,
      tenantId: scopeTenant,
      createdBy: userId,
    });

    const savedStage = await this.stageRepo.save(stage);

    // Recalculate totals
    const allStages = await this.stageRepo.find({
      where: { standardId: standard.id, tenantId: scopeTenant, status: StandardStageStatus.ACTIVE } as any,
    });
    standard.totalStandardDurationDays = allStages.reduce((acc, s) => acc + Number(s.standardDurationDays), 0);
    standard.totalStandardHours = allStages.reduce((acc, s) => acc + Number(s.standardHours), 0);
    await this.repo.save(standard);

    await this.auditService.logBusinessEvent(
      'design_standard.stage_added',
      'design_load_standard_stage',
      savedStage.id,
      userId ?? 'system',
      { standardId, stageCode: savedStage.stageCode },
      undefined,
      undefined,
      scopeTenant,
    );

    return savedStage;
  }

  async removeStandard(id: string, userId?: string, tenantId?: string | null): Promise<void> {
    const scopeTenant = this.requireTenant(tenantId);
    const standard = await this.findOneWithStages(id, scopeTenant);

    await this.repo.softDelete(standard.id);

    await this.auditService.logBusinessEvent(
      'design_standard.deleted',
      'design_load_standard',
      id,
      userId ?? 'system',
      undefined,
      undefined,
      undefined,
      scopeTenant,
    );
  }
}
