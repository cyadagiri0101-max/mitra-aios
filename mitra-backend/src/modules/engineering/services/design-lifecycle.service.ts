import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DesignWorkPackage,
  DesignStageEnum,
  DesignPackageStatus,
  DesignStageState,
} from '../entities/design-work-package.entity';
import {
  DesignWorkloadTemplate,
} from '../entities/design-workload-template.entity';
import {
  CreateDesignWorkPackageDto,
  AdvanceDesignStageDto,
  CreateWorkloadTemplateDto,
} from '../dto/design-lifecycle-capacity.dto';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { EkosEntityType } from '../../ekos/entities/ekos-graph-node.entity';
import { EkosRelationType, EkosProvenanceType } from '../../ekos/entities/ekos-graph-edge.entity';
import { AuditService } from '../../audit/services/audit.service';

const ORDERED_STAGES: DesignStageEnum[] = [
  DesignStageEnum.CUSTOMER_INPUTS,
  DesignStageEnum.KICK_OFF_INPUT_SHEET,
  DesignStageEnum.LAYOUT,
  DesignStageEnum.CAVITY_MODEL,
  DesignStageEnum.MOLD_DESIGN,
  DesignStageEnum.MASK_DESIGN,
  DesignStageEnum.DESIGN_REVIEW,
  DesignStageEnum.CUSTOMER_APPROVAL,
  DesignStageEnum.RAW_MATERIAL,
  DesignStageEnum.PROCESS_PLANNING,
  DesignStageEnum.FINAL_PART_LIST,
  DesignStageEnum.FINAL_DESIGN_REVIEW,
  DesignStageEnum.DATA_TO_PROGRAMMING,
  DesignStageEnum.DESIGN_DELIVERY_COMPLETE,
];

@Injectable()
export class DesignLifecycleService {
  private readonly logger = new Logger(DesignLifecycleService.name);

  constructor(
    @InjectRepository(DesignWorkPackage)
    private readonly packageRepo: Repository<DesignWorkPackage>,
    @InjectRepository(DesignWorkloadTemplate)
    private readonly templateRepo: Repository<DesignWorkloadTemplate>,
    private readonly ekosGraphService: EkosGraphService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create or seed a workload template (e.g. Type A Standard, Type B Complex)
   */
  async createWorkloadTemplate(
    dto: CreateWorkloadTemplateDto,
    tenantId: string,
  ): Promise<DesignWorkloadTemplate> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const template = this.templateRepo.create({
      tenantId,
      templateCode: dto.templateCode,
      name: dto.name,
      moldType: dto.moldType,
      description: dto.description || null,
      estimatedTotalWorkloadUnits: dto.estimatedTotalWorkloadUnits,
      estimatedCalendarDurationDays: dto.estimatedCalendarDurationDays,
      stageDefinitions: dto.stageDefinitions,
      status: 'ACTIVE',
      version: '1.0',
    });

    return await this.templateRepo.save(template);
  }

  /**
   * Get all active workload templates
   */
  async getTemplates(tenantId: string): Promise<DesignWorkloadTemplate[]> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');
    return await this.templateRepo.find({ where: { tenantId, status: 'ACTIVE' } });
  }

  /**
   * Create a new 14-stage Design Work Package from template
   */
  async createWorkPackage(
    dto: CreateDesignWorkPackageDto,
    tenantId: string,
    user?: any,
  ): Promise<DesignWorkPackage> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');
    if (!dto.projectId) throw new BadRequestException('Project ID is required.');

    let plannedUnits = 40.0;
    let template: DesignWorkloadTemplate | null = null;

    if (dto.templateId) {
      template = await this.templateRepo.findOne({
        where: { id: dto.templateId, tenantId },
      });
      if (template) {
        plannedUnits = Number(template.estimatedTotalWorkloadUnits || 40.0);
      }
    }

    // Build initial 14-stage states
    const stagesState: DesignStageState[] = ORDERED_STAGES.map((stage, idx) => ({
      stage,
      order: idx + 1,
      status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      plannedWorkloadUnits: Number((plannedUnits / ORDERED_STAGES.length).toFixed(2)),
      actualWorkloadUnits: 0,
      requiredSkills: ['MOLD_DESIGN'],
      deliverablesCount: 0,
      approvalStatus: stage === DesignStageEnum.CUSTOMER_APPROVAL ? 'PENDING' : 'NOT_REQUIRED',
    }));

    const pkg = this.packageRepo.create({
      tenantId,
      projectId: dto.projectId,
      packageCode: dto.packageCode,
      name: dto.name,
      templateId: dto.templateId || null,
      leadEngineerId: dto.leadEngineerId || null,
      activeRevision: dto.activeRevision || 'Rev A',
      status: DesignPackageStatus.IN_PROGRESS,
      currentStage: DesignStageEnum.CUSTOMER_INPUTS,
      plannedStartDate: new Date(),
      plannedWorkloadUnits: plannedUnits,
      actualWorkloadUnits: 0,
      stagesState,
      deliverables: [],
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          actor: user?.email || 'SYSTEM',
          action: 'CREATED_DESIGN_PACKAGE',
          stage: DesignStageEnum.CUSTOMER_INPUTS,
          notes: `Created package ${dto.packageCode} for project ${dto.projectId}`,
        },
      ],
    });

    const saved = await this.packageRepo.save(pkg);

    // Project to EKOS
    try {
      await this.ekosGraphService.recordEdge(
        {
          sourceEntityType: EkosEntityType.PROJECT,
          sourceEntityId: dto.projectId,
          sourceEntityRevision: dto.activeRevision || 'Rev A',
          targetEntityType: EkosEntityType.CAD_MODEL,
          targetEntityId: saved.id,
          relationType: EkosRelationType.DERIVED_FROM,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          properties: { packageCode: saved.packageCode, currentStage: saved.currentStage },
        },
        tenantId,
      );
    } catch (err: any) {
      this.logger.warn(`EKOS projection non-blocking failure: ${err?.message}`);
    }

    return saved;
  }

  /**
   * Advance design lifecycle stage with validation of dependencies & gates
   */
  async advanceStage(
    packageId: string,
    dto: AdvanceDesignStageDto,
    tenantId: string,
    user?: any,
  ): Promise<DesignWorkPackage> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const pkg = await this.packageRepo.findOne({ where: { id: packageId, tenantId } });
    if (!pkg) throw new NotFoundException(`Design work package ${packageId} not found.`);

    const currentIndex = ORDERED_STAGES.indexOf(pkg.currentStage);
    const targetIndex = ORDERED_STAGES.indexOf(dto.targetStage);

    if (targetIndex < 0) {
      throw new BadRequestException(`Invalid target stage ${dto.targetStage}`);
    }

    if (targetIndex < currentIndex) {
      throw new BadRequestException(
        `Cannot regress stage from ${pkg.currentStage} to ${dto.targetStage}`,
      );
    }

    // Gate rule: Cannot skip Customer Approval without approval
    if (
      currentIndex < ORDERED_STAGES.indexOf(DesignStageEnum.CUSTOMER_APPROVAL) &&
      targetIndex > ORDERED_STAGES.indexOf(DesignStageEnum.CUSTOMER_APPROVAL)
    ) {
      const custStage = pkg.stagesState.find((s) => s.stage === DesignStageEnum.CUSTOMER_APPROVAL);
      if (custStage && custStage.approvalStatus !== 'APPROVED') {
        throw new BadRequestException(
          'Cannot advance past CUSTOMER_APPROVAL stage without verified customer approval status.',
        );
      }
    }

    // Update stages state
    pkg.stagesState = pkg.stagesState.map((s) => {
      const sIdx = ORDERED_STAGES.indexOf(s.stage);
      if (sIdx < targetIndex) {
        return { ...s, status: 'COMPLETED' };
      } else if (sIdx === targetIndex) {
        return {
          ...s,
          status: 'IN_PROGRESS',
          actualWorkloadUnits: (s.actualWorkloadUnits || 0) + (dto.actualWorkloadUnits || 0),
        };
      }
      return s;
    });

    pkg.currentStage = dto.targetStage;
    if (dto.actualWorkloadUnits) {
      pkg.actualWorkloadUnits = Number(pkg.actualWorkloadUnits || 0) + Number(dto.actualWorkloadUnits);
    }

    if (dto.targetStage === DesignStageEnum.DESIGN_DELIVERY_COMPLETE) {
      pkg.status = DesignPackageStatus.COMPLETED;
      pkg.actualFinishDate = new Date();
    }

    pkg.auditTrail.push({
      timestamp: new Date().toISOString(),
      actor: user?.email || 'ENGINEER',
      action: 'STAGE_TRANSITION',
      stage: dto.targetStage,
      notes: dto.notes || `Advanced to ${dto.targetStage}`,
    });

    return await this.packageRepo.save(pkg);
  }

  /**
   * Record Customer Approval Decision Gate
   */
  async recordCustomerApproval(
    packageId: string,
    approved: boolean,
    notes: string,
    tenantId: string,
    user?: any,
  ): Promise<DesignWorkPackage> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const pkg = await this.packageRepo.findOne({ where: { id: packageId, tenantId } });
    if (!pkg) throw new NotFoundException(`Design work package ${packageId} not found.`);

    pkg.stagesState = pkg.stagesState.map((s) => {
      if (s.stage === DesignStageEnum.CUSTOMER_APPROVAL) {
        return {
          ...s,
          approvalStatus: approved ? 'APPROVED' : 'REJECTED',
          approvalNotes: notes,
          status: approved ? 'COMPLETED' : 'BLOCKED',
        };
      }
      return s;
    });

    pkg.auditTrail.push({
      timestamp: new Date().toISOString(),
      actor: user?.email || 'CUSTOMER_DESK',
      action: approved ? 'CUSTOMER_APPROVAL_GRANTED' : 'CUSTOMER_APPROVAL_REJECTED',
      stage: DesignStageEnum.CUSTOMER_APPROVAL,
      notes,
    });

    return await this.packageRepo.save(pkg);
  }

  /**
   * Get Package by ID
   */
  async getPackageById(packageId: string, tenantId: string): Promise<DesignWorkPackage> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');
    const pkg = await this.packageRepo.findOne({ where: { id: packageId, tenantId } });
    if (!pkg) throw new NotFoundException(`Design work package ${packageId} not found.`);
    return pkg;
  }

  /**
   * Get Packages by Project
   */
  async getPackagesByProject(projectId: string, tenantId: string): Promise<DesignWorkPackage[]> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');
    return await this.packageRepo.find({ where: { projectId, tenantId } });
  }
}
