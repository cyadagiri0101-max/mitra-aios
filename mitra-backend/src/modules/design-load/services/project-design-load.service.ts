import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { OutboxService } from '../../platform/services/outbox.service';
import {
  ProjectDesignLoad,
  ProjectDesignLoadStatus,
} from '../entities/project-design-load.entity';
import {
  ProjectDesignLoadStage,
  ProjectStageStatus,
} from '../entities/project-design-load-stage.entity';
import {
  DesignLoadStandard,
  DesignStandardStatus,
} from '../entities/design-load-standard.entity';
import {
  DesignLoadStandardStage,
  StandardStageStatus,
} from '../entities/design-load-standard-stage.entity';
import { Employee, EmployeeStatus } from '../../people/entities/employee.entity';
import { EmployeeSkill, ProficiencyLevel } from '../../people/entities/employee-skill.entity';
import { ResourceAvailability } from '../../people/entities/resource-availability.entity';
import {
  CreateProjectDesignLoadDto,
  UpdateProjectDesignLoadDto,
  EstimateDesignLoadDto,
  UpdateProjectDesignLoadStageDto,
} from '../dto/design-load.dto';

const PROFICIENCY_RANKS: Record<ProficiencyLevel, number> = {
  [ProficiencyLevel.BEGINNER]: 1,
  [ProficiencyLevel.INTERMEDIATE]: 2,
  [ProficiencyLevel.ADVANCED]: 3,
  [ProficiencyLevel.EXPERT]: 4,
};

@Injectable()
export class ProjectDesignLoadService extends TenantAwareService<ProjectDesignLoad> {
  constructor(
    @InjectRepository(ProjectDesignLoad) repo: Repository<ProjectDesignLoad>,
    @InjectRepository(ProjectDesignLoadStage)
    private readonly stageRepo: Repository<ProjectDesignLoadStage>,
    @InjectRepository(DesignLoadStandard)
    private readonly standardRepo: Repository<DesignLoadStandard>,
    @InjectRepository(DesignLoadStandardStage)
    private readonly standardStageRepo: Repository<DesignLoadStandardStage>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeSkill)
    private readonly employeeSkillRepo: Repository<EmployeeSkill>,
    @InjectRepository(ResourceAvailability)
    private readonly availabilityRepo: Repository<ResourceAvailability>,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'ProjectDesignLoad');
  }

  private async generateLoadNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repo.count({ where: { tenantId } as any });
    const seq = (count + 1).toString().padStart(4, '0');
    return `DLD-${year}-${seq}`;
  }

  async findAll(
    tenantId?: string | null,
    page = 1,
    limit = 50,
    projectId?: string,
    status?: ProjectDesignLoadStatus,
    search?: string,
  ): Promise<{ data: ProjectDesignLoad[]; total: number; page: number; limit: number; totalPages: number }> {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.repo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.stages', 'stage')
      .leftJoinAndSelect('l.standard', 'standard')
      .where('l.deleted_at IS NULL')
      .andWhere('l.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (projectId) {
      qb.andWhere('l.project_id = :projectId', { projectId });
    }
    if (status) {
      qb.andWhere('l.status = :status', { status });
    }
    if (search?.trim()) {
      qb.andWhere('(l.load_number ILIKE :q OR l.title ILIKE :q)', { q: `%${search.trim()}%` });
    }

    qb.orderBy('l.created_at', 'DESC');
    qb.addOrderBy('stage.sequence', 'ASC');
    qb.skip((page - 1) * limit).take(Math.min(limit, 100));

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / (limit || 1)) };
  }

  async findOneWithStages(id: string, tenantId?: string | null): Promise<ProjectDesignLoad> {
    const scopeTenant = this.requireTenant(tenantId);
    const load = await this.repo.findOne({
      where: { id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      relations: ['stages', 'standard'],
      order: { stages: { sequence: 'ASC' } } as any,
    });
    if (!load) {
      throw new NotFoundException(`Project design load ${id} not found`);
    }
    return load;
  }

  async createLoad(
    dto: CreateProjectDesignLoadDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ProjectDesignLoad> {
    const scopeTenant = this.requireTenant(tenantId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const loadNumber = await this.generateLoadNumber(scopeTenant);
      const factor = dto.complexityFactor ? Number(dto.complexityFactor) : 1.0;

      let standard: DesignLoadStandard | null = null;
      let standardStages: DesignLoadStandardStage[] = [];

      if (dto.standardId) {
        standard = await this.standardRepo.findOne({
          where: { id: dto.standardId, tenantId: scopeTenant, status: DesignStandardStatus.ACTIVE, deletedAt: IsNull() } as any,
          relations: ['stages'],
        });
        if (standard && standard.stages) {
          standardStages = standard.stages.filter(
            (s) => s.status === StandardStageStatus.ACTIVE,
          );
        }
      }

      const standardDays = standard ? Number(standard.totalStandardDurationDays) : 10.0;
      const standardHrs = standard ? Number(standard.totalStandardHours) : 80.0;
      const plannedDays = Number((standardDays * factor).toFixed(2));
      const plannedHrs = Number((standardHrs * factor).toFixed(2));

      // Calculate planned finish if start provided
      let plannedFinish: Date | null = null;
      if (dto.plannedStartDate) {
        const start = new Date(dto.plannedStartDate);
        plannedFinish = new Date(start.getTime() + plannedDays * 24 * 60 * 60 * 1000);
      }

      // Generate explainable calculation text
      const standardName = standard ? standard.name : 'Custom / Unspecified';
      const explanation = `Standard [${standardName}] (${standardDays} days, ${standardHrs} hrs) adjusted by Complexity Factor ${factor.toFixed(2)} -> Planned ${plannedDays} days (${plannedHrs} hrs).`;

      const designLoad = this.repo.create({
        tenantId: scopeTenant,
        loadNumber,
        projectId: dto.projectId,
        standardId: standard?.id ?? null,
        title: dto.title,
        projectType: dto.projectType ?? standard?.projectType ?? null,
        moldType: dto.moldType ?? standard?.moldType ?? null,
        complexityFactor: factor,
        standardDurationDays: standardDays,
        standardHours: standardHrs,
        plannedDurationDays: plannedDays,
        plannedHours: plannedHrs,
        plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : null,
        plannedFinishDate: plannedFinish,
        currentStageCode: standardStages.length > 0 ? standardStages[0].stageCode : 'MOLD_DEVELOPMENT',
        status: ProjectDesignLoadStatus.PLANNED,
        explanation,
        notes: dto.notes ?? null,
        createdBy: userId,
        stages: [],
      });

      const savedLoad = await queryRunner.manager.save(designLoad);

      // Create Stages
      if (standardStages.length > 0) {
        let runningDate = dto.plannedStartDate ? new Date(dto.plannedStartDate) : null;

        const stageEntities = standardStages.map((stdStage) => {
          const sDays = Number(stdStage.standardDurationDays);
          const sHrs = Number(stdStage.standardHours);
          const pDays = Number((sDays * factor).toFixed(2));
          const pHrs = Number((sHrs * factor).toFixed(2));

          let stageStart: Date | null = null;
          let stageFinish: Date | null = null;

          if (runningDate) {
            stageStart = new Date(runningDate);
            stageFinish = new Date(runningDate.getTime() + pDays * 24 * 60 * 60 * 1000);
            runningDate = new Date(stageFinish);
          }

          return this.stageRepo.create({
            tenantId: scopeTenant,
            designLoadId: savedLoad.id,
            stageCode: stdStage.stageCode,
            stageName: stdStage.stageName,
            sequence: stdStage.sequence,
            standardDurationDays: sDays,
            standardHours: sHrs,
            plannedDurationDays: pDays,
            plannedHours: pHrs,
            plannedStartDate: stageStart,
            plannedFinishDate: stageFinish,
            status: ProjectStageStatus.NOT_STARTED,
            requiredSkillId: stdStage.requiredSkillId,
            minimumProficiency: stdStage.minimumProficiency,
            createdBy: userId,
          });
        });

        savedLoad.stages = await queryRunner.manager.save(stageEntities);
      } else {
        const defaultStages = [
          { stageCode: '3D_CAVITY_DETAIL', stageName: '3D Cavity Detailing', sDays: 4.0, sHrs: 32.0, seq: 1 },
          { stageCode: '2D_DETAILING', stageName: '2D Manufacturing Prints', sDays: 3.0, sHrs: 24.0, seq: 2 },
          { stageCode: 'BOM_GENERATION', stageName: 'BOM Generation', sDays: 2.0, sHrs: 16.0, seq: 3 },
        ];
        const stageEntities = defaultStages.map((stg) => this.stageRepo.create({
          tenantId: scopeTenant,
          designLoadId: savedLoad.id,
          stageCode: stg.stageCode,
          stageName: stg.stageName,
          sequence: stg.seq,
          standardDurationDays: stg.sDays,
          standardHours: stg.sHrs,
          plannedDurationDays: Number((stg.sDays * factor).toFixed(2)),
          plannedHours: Number((stg.sHrs * factor).toFixed(2)),
          status: ProjectStageStatus.NOT_STARTED,
          createdBy: userId,
        }));
        savedLoad.stages = await queryRunner.manager.save(stageEntities);
      }

      await queryRunner.commitTransaction();

      await this.auditService.logBusinessEvent(
        'design_load.created',
        'project_design_load',
        savedLoad.id,
        userId ?? 'system',
        {
          loadNumber: savedLoad.loadNumber,
          standardDays,
          plannedDays,
          factor,
        },
        undefined,
        dto.projectId,
        scopeTenant,
      );

      await this.outboxService.append(
        'design_load.created',
        'project_design_load',
        savedLoad.id,
        {
          id: savedLoad.id,
          projectId: dto.projectId,
          loadNumber: savedLoad.loadNumber,
          plannedDays,
        },
        { tenantId: scopeTenant, actorId: userId },
      );

      return this.findOneWithStages(savedLoad.id, scopeTenant);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async estimate(
    id: string,
    dto: EstimateDesignLoadDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ProjectDesignLoad> {
    const scopeTenant = this.requireTenant(tenantId);
    const load = await this.findOneWithStages(id, scopeTenant);

    const factor = dto.complexityFactor ? Number(dto.complexityFactor) : Number(load.complexityFactor);
    const standardId = dto.standardId ?? load.standardId;

    let standard: DesignLoadStandard | null = null;

    if (standardId) {
      standard = await this.standardRepo.findOne({
        where: { id: standardId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        relations: ['stages'],
      });
    }

    const standardDays = standard ? Number(standard.totalStandardDurationDays) : Number(load.standardDurationDays);
    const standardHrs = standard ? Number(standard.totalStandardHours) : Number(load.standardHours);
    const plannedDays = Number((standardDays * factor).toFixed(2));
    const plannedHrs = Number((standardHrs * factor).toFixed(2));

    const startDate = dto.plannedStartDate
      ? new Date(dto.plannedStartDate)
      : load.plannedStartDate
        ? new Date(load.plannedStartDate)
        : null;

    let plannedFinish: Date | null = null;
    if (startDate) {
      plannedFinish = new Date(startDate.getTime() + plannedDays * 24 * 60 * 60 * 1000);
    }

    const standardName = standard ? standard.name : 'Current';
    const explanation = `Standard [${standardName}] (${standardDays} days, ${standardHrs} hrs) adjusted by Complexity Factor ${factor.toFixed(2)} -> Planned ${plannedDays} days (${plannedHrs} hrs).`;

    load.standardId = standardId;
    load.complexityFactor = factor;
    load.standardDurationDays = standardDays;
    load.standardHours = standardHrs;
    load.plannedDurationDays = plannedDays;
    load.plannedHours = plannedHrs;
    load.plannedStartDate = startDate;
    load.plannedFinishDate = plannedFinish;
    load.explanation = explanation;
    load.updatedBy = userId ?? null;

    await this.repo.save(load);

    // Update existing stages if they match
    if (load.stages && load.stages.length > 0) {
      let runningDate = startDate ? new Date(startDate) : null;
      for (const stage of load.stages) {
        const sDays = Number(stage.standardDurationDays);
        const sHrs = Number(stage.standardHours);
        const pDays = Number((sDays * factor).toFixed(2));
        const pHrs = Number((sHrs * factor).toFixed(2));

        stage.plannedDurationDays = pDays;
        stage.plannedHours = pHrs;
        if (runningDate) {
          stage.plannedStartDate = new Date(runningDate);
          stage.plannedFinishDate = new Date(runningDate.getTime() + pDays * 24 * 60 * 60 * 1000);
          runningDate = new Date(stage.plannedFinishDate);
        }
        await this.stageRepo.save(stage);
      }
    }

    await this.auditService.logBusinessEvent(
      'design_load.estimated',
      'project_design_load',
      load.id,
      userId ?? 'system',
      { factor, plannedDays, plannedHrs },
      undefined,
      load.projectId,
      scopeTenant,
    );

    return this.findOneWithStages(id, scopeTenant);
  }

  async updateLoad(
    id: string,
    dto: UpdateProjectDesignLoadDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ProjectDesignLoad> {
    const scopeTenant = this.requireTenant(tenantId);
    const load = await this.findOneWithStages(id, scopeTenant);

    Object.assign(load, dto, { updatedBy: userId });
    if (dto.plannedStartDate) load.plannedStartDate = new Date(dto.plannedStartDate);
    if (dto.plannedFinishDate) load.plannedFinishDate = new Date(dto.plannedFinishDate);
    if (dto.actualStartDate) load.actualStartDate = new Date(dto.actualStartDate);
    if (dto.actualFinishDate) load.actualFinishDate = new Date(dto.actualFinishDate);

    const updated = await this.repo.save(load);

    await this.auditService.logBusinessEvent(
      'design_load.updated',
      'project_design_load',
      id,
      userId ?? 'system',
      dto,
      undefined,
      load.projectId,
      scopeTenant,
    );

    return updated;
  }

  async updateStage(
    stageId: string,
    dto: UpdateProjectDesignLoadStageDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ProjectDesignLoadStage> {
    const scopeTenant = this.requireTenant(tenantId);
    const stage = await this.stageRepo.findOne({
      where: { id: stageId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      relations: ['designLoad'],
    });
    if (!stage) {
      throw new NotFoundException(`Design load stage ${stageId} not found`);
    }

    Object.assign(stage, dto, { updatedBy: userId });
    if (dto.plannedStartDate) stage.plannedStartDate = new Date(dto.plannedStartDate);
    if (dto.plannedFinishDate) stage.plannedFinishDate = new Date(dto.plannedFinishDate);
    if (dto.actualStartDate) stage.actualStartDate = new Date(dto.actualStartDate);
    if (dto.actualFinishDate) stage.actualFinishDate = new Date(dto.actualFinishDate);

    const updated = await this.stageRepo.save(stage);

    // If stage completed, advance design load current stage
    if (dto.status === ProjectStageStatus.COMPLETED && stage.designLoad) {
      const nextStages = await this.stageRepo.find({
        where: {
          designLoadId: stage.designLoadId,
          tenantId: scopeTenant,
          status: In([ProjectStageStatus.NOT_STARTED, ProjectStageStatus.IN_PROGRESS]),
          deletedAt: IsNull(),
        } as any,
        order: { sequence: 'ASC' } as any,
      });
      if (nextStages.length > 0) {
        stage.designLoad.currentStageCode = nextStages[0].stageCode;
        await this.repo.save(stage.designLoad);
      } else {
        stage.designLoad.currentStageCode = 'DESIGN_COMPLETE';
        stage.designLoad.status = ProjectDesignLoadStatus.COMPLETED;
        await this.repo.save(stage.designLoad);
      }
    }

    await this.auditService.logBusinessEvent(
      'design_load.stage_updated',
      'project_design_load_stage',
      stageId,
      userId ?? 'system',
      dto,
      undefined,
      stage.designLoad?.projectId,
      scopeTenant,
    );

    return updated;
  }

  async findCandidateResources(
    loadId: string,
    stageId?: string,
    tenantId?: string | null,
  ): Promise<{
    requiredSkillId: string | null;
    minimumProficiency: ProficiencyLevel;
    candidates: Array<{
      employeeId: string;
      employeeCode: string;
      fullName: string;
      designation: string | null;
      department: string | null;
      proficiencyLevel: ProficiencyLevel;
      certification: string | null;
      isQualified: boolean;
    }>;
  }> {
    const scopeTenant = this.requireTenant(tenantId);
    let requiredSkillId: string | null = null;
    let minProficiency: ProficiencyLevel = ProficiencyLevel.INTERMEDIATE;

    if (stageId) {
      const stage = await this.stageRepo.findOne({
        where: { id: stageId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      });
      if (stage) {
        requiredSkillId = stage.requiredSkillId;
        minProficiency = stage.minimumProficiency;
      }
    } else {
      const load = await this.findOneWithStages(loadId, scopeTenant);
      if (load.stages && load.stages.length > 0) {
        const activeStage =
          load.stages.find((s) => s.status === ProjectStageStatus.IN_PROGRESS) || load.stages[0];
        requiredSkillId = activeStage.requiredSkillId;
        minProficiency = activeStage.minimumProficiency;
      }
    }

    if (!requiredSkillId) {
      const engineers = await this.employeeRepo.find({
        where: { tenantId: scopeTenant, status: EmployeeStatus.ACTIVE, deletedAt: IsNull() } as any,
      });
      return {
        requiredSkillId: null,
        minimumProficiency: minProficiency,
        candidates: engineers.map((e) => ({
          employeeId: e.id,
          employeeCode: e.employeeCode,
          fullName: `${e.firstName} ${e.lastName}`,
          designation: e.designation,
          department: e.department,
          proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
          certification: null,
          isQualified: true,
        })),
      };
    }

    const minRank = PROFICIENCY_RANKS[minProficiency] ?? 1;

    const employeeSkills = await this.employeeSkillRepo.find({
      where: { skillId: requiredSkillId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });

    if (employeeSkills.length === 0) {
      return { requiredSkillId, minimumProficiency: minProficiency, candidates: [] };
    }

    const empIds = employeeSkills.map((es) => es.employeeId);
    const employees = await this.employeeRepo.find({
      where: { id: In(empIds), tenantId: scopeTenant, status: EmployeeStatus.ACTIVE, deletedAt: IsNull() } as any,
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const candidates = employeeSkills
      .filter((es) => empMap.has(es.employeeId))
      .map((es) => {
        const emp = empMap.get(es.employeeId)!;
        const candidateRank = PROFICIENCY_RANKS[es.proficiencyLevel] ?? 1;
        return {
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          fullName: `${emp.firstName} ${emp.lastName}`,
          designation: emp.designation,
          department: emp.department,
          proficiencyLevel: es.proficiencyLevel,
          certification: es.certification,
          isQualified: candidateRank >= minRank,
        };
      })
      .sort((a, b) => (b.isQualified ? 1 : 0) - (a.isQualified ? 1 : 0));

    return {
      requiredSkillId,
      minimumProficiency: minProficiency,
      candidates,
    };
  }
}
