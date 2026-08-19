import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { ProjectDesignLoad } from '../entities/project-design-load.entity';
import { ProjectDesignLoadStage } from '../entities/project-design-load-stage.entity';
import { DesignSystem, DesignSystemStatus } from '../entities/design-system.entity';
import { Employee, EmployeeStatus } from '../../people/entities/employee.entity';
import { EmployeeSkill, ProficiencyLevel } from '../../people/entities/employee-skill.entity';
import { Skill } from '../../people/entities/skill.entity';
import { Project } from '../../project/entities/project.entity';
import { AuditService } from '../../audit/services/audit.service';
import { CapacityIntelligenceService } from './capacity-intelligence.service';
import {
  AnalyzeLevelingDto,
  ApplyLevelingActionDto,
  LevelingActionType,
} from '../dto/capacity-leveling.dto';

import { CapacityHorizon } from '../dto/capacity-planning.dto';

const PROFICIENCY_RANK: Record<ProficiencyLevel, number> = {
  [ProficiencyLevel.BEGINNER]: 1,
  [ProficiencyLevel.INTERMEDIATE]: 2,
  [ProficiencyLevel.ADVANCED]: 3,
  [ProficiencyLevel.EXPERT]: 4,
};

export interface LevelingRecommendationItem {
  id: string;
  actionType: LevelingActionType;
  title: string;
  reason: string;
  projectId: string;
  projectName?: string;
  stageId?: string;
  stageName?: string;
  sourceEngineerId?: string;
  sourceEngineerName?: string;
  targetEngineerId?: string;
  targetEngineerName?: string;
  allocatedHoursDelta: number;
  estimatedResolutionHours: number;
  explanation: string;
  requiresApproval: boolean;
}

export interface LevelingAnalysisReport {
  timestamp: string;
  totalActiveProjects: number;
  overloadedEngineersCount: number;
  saturatedWorkstationsCount: number;
  totalUnresolvedGapHours: number;
  recommendations: LevelingRecommendationItem[];
  simulationOutcome: {
    baselineGapHours: number;
    resolvedGapHours: number;
    remainingSimulatedGapHours: number;
  };
}

@Injectable()
export class CapacityLevelingService {
  constructor(
    @InjectRepository(ProjectDesignLoad)
    private readonly designLoadRepo: Repository<ProjectDesignLoad>,
    @InjectRepository(ProjectDesignLoadStage)
    private readonly stageRepo: Repository<ProjectDesignLoadStage>,
    @InjectRepository(DesignSystem)
    private readonly systemRepo: Repository<DesignSystem>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeSkill)
    private readonly employeeSkillRepo: Repository<EmployeeSkill>,
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly capacityIntelligenceService: CapacityIntelligenceService,
    private readonly auditService: AuditService,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async analyzeAndRecommend(
    tenantId: string | null | undefined,
    dto: AnalyzeLevelingDto = {},
  ): Promise<LevelingAnalysisReport> {
    const scopeTenant = this.requireTenant(tenantId);
    const utilization = await this.capacityIntelligenceService.getEngineerUtilization(scopeTenant);
    const summary = await this.capacityIntelligenceService.getCapacitySummary(
      { horizon: CapacityHorizon.WEEKLY },
      scopeTenant,
    );

    const overloaded = utilization.filter((u) => u.isOverloaded || u.allocatedUtilizationPct > 100);
    const underutilized = utilization.filter((u) => !u.isOverloaded && u.allocatedUtilizationPct < 80);

    const stagesWhere: any = { deletedAt: IsNull(), tenantId: scopeTenant };
    if (dto.projectId) {
      stagesWhere.designLoad = { projectId: dto.projectId };
    }
    const stages = await this.stageRepo.find({
      where: stagesWhere,
      relations: ['designLoad'],
      order: { sequence: 'ASC' },
    });

    const recommendations: LevelingRecommendationItem[] = [];
    let resolvedHoursAccumulator = 0;

    // 1. REASSIGN_ENGINEER recommendations for overloaded engineers
    for (const ov of overloaded) {
      const assignedStages = stages.filter((s) => s.assignedEmployeeId === ov.employeeId);
      for (const stage of assignedStages) {
        if (underutilized.length > 0) {
          const candidate = underutilized[0];
          const hoursDelta = Number(stage.plannedHours ?? stage.standardHours ?? 20);
          recommendations.push({
            id: `rec-reassign-${stage.id}`,
            actionType: LevelingActionType.REASSIGN_ENGINEER,
            title: `Reassign ${stage.stageName} to ${candidate.fullName}`,
            reason: `Engineer ${ov.fullName} is overloaded at ${ov.allocatedUtilizationPct}% allocation (${ov.allocatedHours}h / ${ov.availableHours}h).`,
            projectId: stage.designLoad?.projectId || 'n/a',
            stageId: stage.id,
            stageName: stage.stageName,
            sourceEngineerId: ov.employeeId,
            sourceEngineerName: ov.fullName,
            targetEngineerId: candidate.employeeId,
            targetEngineerName: candidate.fullName,
            allocatedHoursDelta: hoursDelta,
            estimatedResolutionHours: hoursDelta,
            explanation: `Transferring ${stage.stageName} (${hoursDelta}h) levels workload across the design team without modifying project finish dates.`,
            requiresApproval: true,
          });
          resolvedHoursAccumulator += hoursDelta;
        }
      }
    }

    // 2. EXTEND_SHIFT_OVERTIME recommendations if aggregate demand gap > 0
    if (summary.capacityGapHours > 0) {
      const maxOt = dto.maxOvertimeHoursPerWeek ?? 10;
      const otHours = Math.min(summary.capacityGapHours, maxOt * 2);
      recommendations.push({
        id: `rec-overtime-${Date.now()}`,
        actionType: LevelingActionType.EXTEND_SHIFT_OVERTIME,
        title: `Authorize Shift Overtime (${otHours}h total)`,
        reason: `Net capacity deficit of ${summary.capacityGapHours}h detected across active CAD workstations and design stages.`,
        projectId: dto.projectId || 'all-active',
        allocatedHoursDelta: otHours,
        estimatedResolutionHours: otHours,
        explanation: `Approving ${otHours}h of planned overtime covers acute demand spikes during critical detailing and file submission phases.`,
        requiresApproval: true,
      });
      resolvedHoursAccumulator += otHours;
    }

    // 3. OUTSOURCE_STAGE recommendation if gap remains high
    if (dto.allowOutsourcing !== false && summary.capacityGapHours > 30) {
      const outsourceHours = Math.min(summary.capacityGapHours, 40);
      recommendations.push({
        id: `rec-outsource-${Date.now()}`,
        actionType: LevelingActionType.OUTSOURCE_STAGE,
        title: `Outsource Non-Critical Detailing Workload (${outsourceHours}h)`,
        reason: `Workload exceeds internal CAD studio capacity threshold.`,
        projectId: dto.projectId || 'all-active',
        allocatedHoursDelta: outsourceHours,
        estimatedResolutionHours: outsourceHours,
        explanation: `Partner with approved external tooling design bureau for standard component detailing to safeguard project delivery milestones.`,
        requiresApproval: true,
      });
      resolvedHoursAccumulator += outsourceHours;
    }

    const baselineGap = summary.capacityGapHours;
    const resolvedGap = Math.min(baselineGap, resolvedHoursAccumulator);

    return {
      timestamp: new Date().toISOString(),
      totalActiveProjects: summary.activeProjectsCount,
      overloadedEngineersCount: overloaded.length,
      saturatedWorkstationsCount: summary.overloadedWorkstationsCount,
      totalUnresolvedGapHours: baselineGap,
      recommendations,
      simulationOutcome: {
        baselineGapHours: baselineGap,
        resolvedGapHours: resolvedGap,
        remainingSimulatedGapHours: Math.max(0, baselineGap - resolvedGap),
      },
    };
  }

  /**
   * Apply an approved leveling action to the production schedule.
   * Modifies production stage assignment only upon explicit human approval.
   */
  async applyLevelingAction(
    tenantId: string | null | undefined,
    dto: ApplyLevelingActionDto,
    userId: string,
  ) {
    const scopeTenant = this.requireTenant(tenantId);

    if (dto.actionType === LevelingActionType.REASSIGN_ENGINEER) {
      if (!dto.stageId || !dto.targetEngineerId) {
        throw new BadRequestException('stageId and targetEngineerId are required for REASSIGN_ENGINEER');
      }

      const stage = await this.stageRepo.findOne({
        where: { id: dto.stageId, deletedAt: IsNull(), tenantId: scopeTenant },
        relations: ['designLoad'],
      });
      if (!stage) {
        throw new NotFoundException('Design stage not found');
      }

      const targetEngineer = await this.employeeRepo.findOne({
        where: { id: dto.targetEngineerId, deletedAt: IsNull(), tenantId: scopeTenant },
      });
      if (!targetEngineer) {
        throw new NotFoundException('Target engineer not found');
      }

      const previousEngineerId = stage.assignedEmployeeId;
      const targetEngineerName = `${targetEngineer.firstName} ${targetEngineer.lastName}`.trim();

      stage.assignedEmployeeId = targetEngineer.id;
      stage.updatedBy = userId;
      const savedStage = await this.stageRepo.save(stage);

      await this.auditService.logBusinessEvent(
        'capacity.leveling.applied',
        'ProjectDesignLoadStage',
        stage.id,
        userId,
        {
          actionType: dto.actionType,
          stageId: stage.id,
          stageName: stage.stageName,
          previousEngineerId,
          newEngineerId: targetEngineer.id,
          newEngineerName: targetEngineerName,
          notes: dto.notes,
          projectId: stage.designLoad?.projectId,
          tenantId: scopeTenant,
        },
        undefined,
        stage.designLoad?.projectId,
      );

      return {
        applied: true,
        actionType: dto.actionType,
        stage: savedStage,
        message: `Successfully reassigned stage ${stage.stageName} to ${targetEngineerName}.`,
      };
    }

    // For other recommendations (overtime, outsourcing, rescheduling)
    await this.auditService.logBusinessEvent(
      'capacity.leveling.authorized',
      'CapacityPlan',
      dto.projectId || 'all-active',
      userId,
      {
        actionType: dto.actionType,
        hours: dto.hours,
        shiftDays: dto.shiftDays,
        notes: dto.notes,
        projectId: dto.projectId,
        tenantId: scopeTenant,
      },
      undefined,
      dto.projectId,
    );

    return {
      applied: true,
      actionType: dto.actionType,
      message: `Leveling action ${dto.actionType} approved and recorded in audit log.`,
    };
  }
}
