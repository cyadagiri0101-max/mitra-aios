import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignProjectComplexity } from '../entities/design-project-complexity.entity';
import { DesignChecklist } from '../entities/design-checklist.entity';
import { DesignChecklistItem } from '../entities/design-checklist-item.entity';
import { DesignDependency } from '../entities/design-dependency.entity';
import { DesignBlocker } from '../entities/design-blocker.entity';
import { DesignHistoricalWorkload } from '../entities/design-historical-workload.entity';
import { DesignReplanRequest } from '../entities/design-replan-request.entity';
import { DesignWorkPackage } from '../entities/design-work-package.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolProvingCycle } from '../entities/tool-proving-cycle.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { EkosEntityType } from '../../ekos/entities/ekos-graph-node.entity';
import { EkosRelationType, EkosProvenanceType } from '../../ekos/entities/ekos-graph-edge.entity';
import {
  CalculateProjectComplexityDto,
  CreateDesignChecklistDto,
  CompleteChecklistItemDto,
  CreateDesignDependencyDto,
  CreateDesignBlockerDto,
  ProjectAcceptanceSimulationDto,
  WhatIfScenarioDto,
  RecordHistoricalWorkloadDto,
} from '../dto/design-planning-delivery.dto';

@Injectable()
export class DesignPlanningDeliveryService {
  private readonly logger = new Logger(DesignPlanningDeliveryService.name);

  constructor(
    @InjectRepository(DesignProjectComplexity)
    private readonly complexityRepo: Repository<DesignProjectComplexity>,
    @InjectRepository(DesignChecklist)
    private readonly checklistRepo: Repository<DesignChecklist>,
    @InjectRepository(DesignChecklistItem)
    private readonly checklistItemRepo: Repository<DesignChecklistItem>,
    @InjectRepository(DesignDependency)
    private readonly dependencyRepo: Repository<DesignDependency>,
    @InjectRepository(DesignBlocker)
    private readonly blockerRepo: Repository<DesignBlocker>,
    @InjectRepository(DesignHistoricalWorkload)
    private readonly historicalRepo: Repository<DesignHistoricalWorkload>,
    @InjectRepository(DesignReplanRequest)
    private readonly replanRepo: Repository<DesignReplanRequest>,
    @InjectRepository(DesignWorkPackage)
    private readonly packageRepo: Repository<DesignWorkPackage>,
    @InjectRepository(DesignEngineerProfile)
    private readonly engineerRepo: Repository<DesignEngineerProfile>,
    @InjectRepository(ToolProvingCycle)
    private readonly cycleRepo: Repository<ToolProvingCycle>,
    @InjectRepository(ToolModificationWorkload)
    private readonly modificationRepo: Repository<ToolModificationWorkload>,
    private readonly auditService: AuditService,
    private readonly ekosGraphService: EkosGraphService,
  ) {}

  /**
   * Phase 1: Governed Project Complexity Model
   */
  async calculateAndSaveComplexity(
    dto: CalculateProjectComplexityDto,
    tenantId: string,
  ): Promise<DesignProjectComplexity> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    if (!dto.projectId) throw new BadRequestException('Project ID is required');

    let score = 1.0;
    const cavityCount = dto.cavityCount || 1;
    if (cavityCount > 4) score += 0.5;
    else if (cavityCount > 1) score += 0.25;

    const sliders = dto.sliderCount || 0;
    score += sliders * 0.15;

    const lifters = dto.lifterCount || 0;
    score += lifters * 0.1;

    if (dto.coolingComplexityLevel === 'CONFORMAL') score += 0.4;
    else if (dto.coolingComplexityLevel === 'BAFFLE_COMPLEX') score += 0.2;

    if (dto.gatingComplexityLevel === 'HOT_RUNNER_SEQUENTIAL') score += 0.35;
    else if (dto.gatingComplexityLevel === 'EDGE_SUB_GATE') score += 0.15;

    if (dto.toleranceClass === 'ULTRA_PRECISION') score += 0.5;
    else if (dto.toleranceClass === 'PRECISION') score += 0.25;

    if (dto.surfaceFinishClass === 'OPTICAL_SPI_A1') score += 0.3;

    const multiplier = Number(score.toFixed(2));

    let record = await this.complexityRepo.findOne({
      where: { tenantId, projectId: dto.projectId },
    });

    if (!record) {
      record = this.complexityRepo.create({
        tenantId,
        projectId: dto.projectId,
        moldType: dto.moldType,
        cavityCount,
        moldSizeClass: dto.moldSizeClass || 'MEDIUM',
        sliderCount: sliders,
        lifterCount: lifters,
        insertCount: dto.insertCount || 0,
        coolingComplexityLevel: dto.coolingComplexityLevel || 'STANDARD',
        gatingComplexityLevel: dto.gatingComplexityLevel || 'STANDARD',
        toleranceClass: dto.toleranceClass || 'STANDARD',
        surfaceFinishClass: dto.surfaceFinishClass || 'COMMERCIAL',
        specialMaterialFactors: dto.specialMaterialFactors || {},
        calculatedComplexityScore: multiplier,
        workloadMultiplier: multiplier,
      });
    } else {
      record.moldType = dto.moldType;
      record.cavityCount = cavityCount;
      record.moldSizeClass = dto.moldSizeClass || record.moldSizeClass;
      record.sliderCount = sliders;
      record.lifterCount = lifters;
      record.insertCount = dto.insertCount || record.insertCount;
      record.coolingComplexityLevel = dto.coolingComplexityLevel || record.coolingComplexityLevel;
      record.gatingComplexityLevel = dto.gatingComplexityLevel || record.gatingComplexityLevel;
      record.toleranceClass = dto.toleranceClass || record.toleranceClass;
      record.surfaceFinishClass = dto.surfaceFinishClass || record.surfaceFinishClass;
      record.calculatedComplexityScore = multiplier;
      record.workloadMultiplier = multiplier;
    }

    const saved = await this.complexityRepo.save(record);

    await this.auditService.log({
      tenantId,
      projectId: dto.projectId,
      entityType: 'DesignProjectComplexity',
      entityId: saved.id,
      action: 'CALCULATE_COMPLEXITY',
      metadata: { complexityScore: multiplier, workloadMultiplier: multiplier },
    });

    return saved;
  }

  /**
   * Phase 3: Governed Checklist Engine
   */
  async createChecklist(
    dto: CreateDesignChecklistDto,
    tenantId: string,
  ): Promise<DesignChecklist> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    if (!dto.projectId || !dto.stage || !dto.title) {
      throw new BadRequestException('Project ID, stage, and title are required');
    }

    const mandatoryTotal = dto.items.filter((i) => i.isMandatory !== false).length;

    const checklist = this.checklistRepo.create({
      tenantId,
      projectId: dto.projectId,
      packageId: dto.packageId,
      stage: dto.stage,
      checklistType: dto.checklistType,
      title: dto.title,
      status: 'PENDING',
      mandatoryItemsTotal: mandatoryTotal,
      mandatoryItemsCompleted: 0,
      allMandatoryPassed: mandatoryTotal === 0,
    });

    const savedChecklist = await this.checklistRepo.save(checklist);

    const items = dto.items.map((item) =>
      this.checklistItemRepo.create({
        tenantId,
        checklistId: savedChecklist.id,
        itemCode: item.itemCode,
        description: item.description,
        isMandatory: item.isMandatory !== false,
        ownerRole: item.ownerRole || 'ENGINEER',
        status: 'PENDING',
      }),
    );

    savedChecklist.items = await this.checklistItemRepo.save(items);
    return savedChecklist;
  }

  async completeChecklistItem(
    itemId: string,
    dto: CompleteChecklistItemDto,
    tenantId: string,
    user: any,
  ): Promise<DesignChecklistItem> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    const item = await this.checklistItemRepo.findOne({
      where: { id: itemId, tenantId },
      relations: ['checklist'],
    });

    if (!item) throw new NotFoundException('Checklist item not found');

    item.status = 'COMPLETED';
    item.completionTimestamp = new Date();
    item.evidenceReference = dto.evidenceReference || item.evidenceReference;
    item.reviewNotes = dto.reviewNotes || item.reviewNotes;
    item.reviewerId = user?.userId || user?.sub || 'lead-engineer';

    const updatedItem = await this.checklistItemRepo.save(item);

    // Refresh checklist status
    const allItems = await this.checklistItemRepo.find({
      where: { checklistId: item.checklistId, tenantId },
    });

    const mandatoryItems = allItems.filter((i) => i.isMandatory);
    const mandatoryCompleted = mandatoryItems.filter((i) => i.status === 'COMPLETED' || i.status === 'WAIVED');

    const checklist = item.checklist;
    checklist.mandatoryItemsTotal = mandatoryItems.length;
    checklist.mandatoryItemsCompleted = mandatoryCompleted.length;
    checklist.allMandatoryPassed = mandatoryCompleted.length === mandatoryItems.length;
    if (checklist.allMandatoryPassed) {
      checklist.status = 'COMPLETED';
    } else {
      checklist.status = 'IN_PROGRESS';
    }

    await this.checklistRepo.save(checklist);
    return updatedItem;
  }

  /**
   * Phase 5: Dependency & Blocker Engine
   */
  async createDependency(
    dto: CreateDesignDependencyDto,
    tenantId: string,
  ): Promise<DesignDependency> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    if (dto.sourceStage === dto.targetStage) {
      throw new BadRequestException('Circular dependency: source and target stage cannot be identical');
    }

    const dep = this.dependencyRepo.create({
      tenantId,
      projectId: dto.projectId,
      sourceStage: dto.sourceStage,
      targetStage: dto.targetStage,
      category: dto.category || 'ENGINEERING',
      description: dto.description,
      isBlocking: dto.isBlocking !== false,
      status: 'ACTIVE',
    });

    return await this.dependencyRepo.save(dep);
  }

  async createBlocker(
    dto: CreateDesignBlockerDto,
    tenantId: string,
  ): Promise<DesignBlocker> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    const blocker = this.blockerRepo.create({
      tenantId,
      projectId: dto.projectId,
      packageId: dto.packageId,
      stage: dto.stage,
      blockerCode: dto.blockerCode,
      category: dto.category || 'ENGINEERING',
      description: dto.description,
      impactSeverity: dto.impactSeverity || 'HIGH',
      evidenceReference: dto.evidenceReference,
      status: 'ACTIVE',
    });

    return await this.blockerRepo.save(blocker);
  }

  async resolveBlocker(
    blockerId: string,
    resolutionNotes: string,
    tenantId: string,
  ): Promise<DesignBlocker> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    const blocker = await this.blockerRepo.findOne({
      where: { id: blockerId, tenantId },
    });

    if (!blocker) throw new NotFoundException('Blocker not found');

    blocker.status = 'RESOLVED';
    blocker.resolutionNotes = resolutionNotes;
    blocker.resolvedAt = new Date();

    return await this.blockerRepo.save(blocker);
  }

  /**
   * Phase 6: Team Load Board Multi-View
   */
  async getTeamLoadBoard(tenantId: string, timeframe: string = '30_DAYS'): Promise<any> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');

    const engineers = await this.engineerRepo.find({ where: { tenantId } });
    let totalCap = 0;
    let totalAssigned = 0;

    const engineerViews = engineers.map((eng) => {
      const cap = Number(eng.weeklyCapacityHours || 40.0);
      const allocated = (eng.activeAssignments || []).reduce(
        (acc, a) => acc + Number(a.allocatedWeeklyHours || 0),
        0,
      );
      totalCap += cap;
      totalAssigned += allocated;

      const util = cap > 0 ? (allocated / cap) * 100 : 0;
      let status = 'HEALTHY';
      if (util < 70) status = 'UNDER_UTILIZED';
      else if (util <= 90) status = 'HEALTHY';
      else if (util <= 100) status = 'HIGH';
      else status = 'OVERLOADED';

      return {
        id: eng.id,
        engineerCode: eng.engineerCode,
        name: eng.name,
        proficiencyLevel: eng.proficiencyLevel,
        weeklyCapacityHours: cap,
        allocatedHours: allocated,
        utilizationPercentage: Number(util.toFixed(1)),
        status,
        primarySkills: eng.primarySkills,
        assignedProjects: eng.activeAssignments || [],
      };
    });

    const avgUtil = totalCap > 0 ? (totalAssigned / totalCap) * 100 : 0;
    const overloadedCount = engineerViews.filter((e) => e.status === 'OVERLOADED').length;

    return {
      timeframe,
      totalEngineers: engineers.length,
      totalWeeklyCapacityHours: totalCap,
      totalAllocatedHours: totalAssigned,
      averageUtilizationPercentage: Number(avgUtil.toFixed(1)),
      overloadedEngineersCount: overloadedCount,
      engineers: engineerViews,
    };
  }

  /**
   * Phase 7 & 8: Project Load Control & Dynamic Forecasting
   */
  async getProjectLoadControl(projectId: string, tenantId: string): Promise<any> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');

    const packages = await this.packageRepo.find({
      where: { projectId, tenantId },
    });

    const blockers = await this.blockerRepo.find({
      where: { projectId, tenantId, status: 'ACTIVE' },
    });

    const checklists = await this.checklistRepo.find({
      where: { projectId, tenantId },
      relations: ['items'],
    });

    const complexity = await this.complexityRepo.findOne({
      where: { projectId, tenantId },
    });

    const plannedLoad = packages.reduce((acc, p) => acc + Number(p.plannedWorkloadUnits || 0), 0);
    const actualLoad = packages.reduce((acc, p) => acc + Number(p.actualWorkloadUnits || 0), 0);
    const remainingLoad = Math.max(0, plannedLoad - actualLoad);
    const variance = Number((actualLoad - plannedLoad).toFixed(1));

    const totalStages = packages.reduce((acc, p) => acc + (p.stagesState?.length || 14), 0);
    const completedStages = packages.reduce(
      (acc, p) => acc + (p.stagesState?.filter((s: any) => s.status === 'COMPLETED').length || 0),
      0,
    );
    const completionPercentage = totalStages > 0 ? Number(((completedStages / totalStages) * 100).toFixed(1)) : 0;

    let scheduleHealth: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' = 'ON_TRACK';
    if (blockers.some((b) => b.impactSeverity === 'CRITICAL' || b.impactSeverity === 'HIGH')) {
      scheduleHealth = 'CRITICAL';
    } else if (variance > 10 || blockers.length > 0) {
      scheduleHealth = 'AT_RISK';
    }

    const replanRequired = scheduleHealth === 'CRITICAL' || variance > 15;

    return {
      projectId,
      moldComplexityMultiplier: complexity?.workloadMultiplier || 1.0,
      completionPercentage,
      scheduleHealth,
      replanRequired,
      replanReason: replanRequired
        ? `Variance of ${variance}u and ${blockers.length} active blockers require governed replanning.`
        : null,
      workload: {
        plannedUnits: plannedLoad,
        actualUnits: actualLoad,
        remainingUnits: remainingLoad,
        varianceUnits: variance,
      },
      activeBlockersCount: blockers.length,
      blockers,
      checklistsSummary: {
        totalChecklists: checklists.length,
        completedChecklists: checklists.filter((c) => c.status === 'COMPLETED').length,
        allMandatoryPassed: checklists.every((c) => c.allMandatoryPassed),
      },
    };
  }

  /**
   * Phase 11: New Project Acceptance Simulator (Non-mutating)
   */
  async simulateProjectAcceptance(
    dto: ProjectAcceptanceSimulationDto,
    tenantId: string,
  ): Promise<any> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');

    const engineers = await this.engineerRepo.find({ where: { tenantId } });
    const complexityScore = dto.complexityScore || 1.2;
    const baseUnits = dto.estimatedWorkloadUnits || 40.0;
    const totalRequiredUnits = Number((baseUnits * complexityScore).toFixed(1));

    const totalWeeklyCap = engineers.reduce((acc, e) => acc + Number(e.weeklyCapacityHours || 40.0), 0);
    const totalAllocated = engineers.reduce(
      (acc, e) =>
        acc +
        (e.activeAssignments || []).reduce(
          (sum, a) => sum + Number(a.allocatedWeeklyHours || 0),
          0,
        ),
      0,
    );
    const availableCapacity = Math.max(0, totalWeeklyCap - totalAllocated);

    const requiredSkills = dto.requiredSkills || ['MOLD_DESIGN', 'CAVITY_MODELING'];
    const bottleneckSkills: string[] = [];

    for (const skill of requiredSkills) {
      const qualified = engineers.filter(
        (e) => e.primarySkills?.some((s) => s.skill === skill) && e.status !== 'OVERLOADED',
      );
      if (qualified.length === 0) {
        bottleneckSkills.push(skill);
      }
    }

    const hasCapacityShortage = totalRequiredUnits > availableCapacity;
    const deliveryRisk = hasCapacityShortage || bottleneckSkills.length > 0 ? 'HIGH' : 'LOW';

    const daysRequired = Math.ceil((totalRequiredUnits / (availableCapacity > 0 ? availableCapacity : 40.0)) * 7);
    const earliestFeasibleStart = new Date();
    earliestFeasibleStart.setDate(earliestFeasibleStart.getDate() + (hasCapacityShortage ? 7 : 1));

    return {
      simulationStatus: 'COMPLETE',
      isAutonomousDecision: false,
      recommendedDecision: deliveryRisk === 'LOW' ? 'ACCEPT' : 'ACCEPT_WITH_REPLAN',
      estimatedWorkloadUnits: totalRequiredUnits,
      availableCapacityHours: availableCapacity,
      capacityShortageHours: hasCapacityShortage ? totalRequiredUnits - availableCapacity : 0,
      bottleneckSkills,
      deliveryRiskLevel: deliveryRisk,
      recommendedEarliestFeasibleStart: earliestFeasibleStart.toISOString().split('T')[0],
      predictedCalendarDaysRequired: daysRequired,
      confidenceScore: 0.92,
      assumptions: [
        'Tool-proving T0 developmental workload estimated at baseline multiplier.',
        'Assumes standard 40-hour working week without unexpected absenteeism.',
      ],
    };
  }

  /**
   * Phase 12: What-If Planning Simulation (Non-mutating)
   */
  async simulateWhatIf(dto: WhatIfScenarioDto, tenantId: string): Promise<any> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');

    const engineers = await this.engineerRepo.find({ where: { tenantId } });
    let totalCap = engineers.reduce((acc, e) => acc + Number(e.weeklyCapacityHours || 40.0), 0);
    let totalAllocated = engineers.reduce(
      (acc, e) =>
        acc +
        (e.activeAssignments || []).reduce(
          (sum, a) => sum + Number(a.allocatedWeeklyHours || 0),
          0,
        ),
      0,
    );

    let scenarioDescription = '';
    let utilizationDelta = 0;
    let bottleneckRisk = 'LOW';

    switch (dto.scenarioType) {
      case 'T0_SURGE_30_PERCENT':
        const surgeHours = totalAllocated * 0.3;
        totalAllocated += surgeHours;
        utilizationDelta = (surgeHours / totalCap) * 100;
        scenarioDescription = `Simulated 30% surge in T0 tool modifications (+${surgeHours.toFixed(1)} hrs).`;
        bottleneckRisk = 'HIGH';
        break;
      case 'ADD_DESIGN_ENGINEER':
        const addedHours = dto.addedCapacityHours || 40.0;
        totalCap += addedHours;
        utilizationDelta = -((totalAllocated / totalCap) * 10);
        scenarioDescription = `Simulated addition of 1 Senior Mold Design Engineer (+${addedHours} hrs/week).`;
        break;
      case 'ENGINEER_UNAVAILABLE':
        totalCap -= 40.0;
        utilizationDelta = 15.0;
        scenarioDescription = `Simulated 1 engineer on unexpected leave (-40 hrs capacity).`;
        bottleneckRisk = 'CRITICAL';
        break;
      default:
        scenarioDescription = `Simulated schedule priority re-alignment for ${dto.projectId || 'active projects'}.`;
    }

    const newUtilization = totalCap > 0 ? (totalAllocated / totalCap) * 100 : 100;

    return {
      scenarioType: dto.scenarioType,
      scenarioDescription,
      mutatedProductionData: false,
      baselineUtilizationPercentage: 85.0,
      simulatedUtilizationPercentage: Number(newUtilization.toFixed(1)),
      utilizationDeltaPercentage: Number(utilizationDelta.toFixed(1)),
      bottleneckRisk,
      projectDeliveryImpactSummary:
        bottleneckRisk === 'CRITICAL'
          ? 'Delivery schedule at critical risk; requires human task load rebalancing.'
          : 'Scenario absorbed within permissible capacity margins.',
    };
  }

  /**
   * Phase 14: Historical Learning Foundation
   */
  async recordHistoricalWorkload(
    dto: RecordHistoricalWorkloadDto,
    tenantId: string,
  ): Promise<DesignHistoricalWorkload> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');

    const varianceUnits = dto.actualWorkloadUnits - dto.plannedWorkloadUnits;
    const variancePercentage =
      dto.plannedWorkloadUnits > 0 ? (varianceUnits / dto.plannedWorkloadUnits) * 100 : 0;

    const hist = this.historicalRepo.create({
      tenantId,
      projectId: dto.projectId,
      moldType: dto.moldType,
      stage: dto.stage,
      templateCode: dto.templateCode,
      engineerId: dto.engineerId,
      requiredSkill: dto.requiredSkill,
      plannedDurationDays: dto.plannedDurationDays,
      actualDurationDays: dto.actualDurationDays,
      plannedWorkloadUnits: dto.plannedWorkloadUnits,
      actualWorkloadUnits: dto.actualWorkloadUnits,
      varianceUnits: Number(varianceUnits.toFixed(2)),
      variancePercentage: Number(variancePercentage.toFixed(2)),
      rootCauseCategory: dto.rootCauseCategory || 'STANDARD_EXECUTION',
      metadata: dto.metadata || {},
    });

    const saved = await this.historicalRepo.save(hist);

    // EKOS Projection
    try {
      await this.ekosGraphService.recordEdge(
        {
          sourceEntityType: EkosEntityType.PROJECT,
          sourceEntityId: dto.projectId,
          sourceEntityRevision: 'Rev A',
          targetEntityType: EkosEntityType.CAD_MODEL,
          targetEntityId: saved.id,
          relationType: EkosRelationType.DERIVED_FROM,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          properties: {
            stage: dto.stage,
            varianceUnits: saved.varianceUnits,
          },
        },
        tenantId,
      );
    } catch (err: any) {
      this.logger.warn(`EKOS projection non-blocking: ${(err as any)?.message}`);
    }

    return saved;
  }
}
