import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { ProjectDesignLoad } from '../entities/project-design-load.entity';
import { ProjectDesignLoadStage } from '../entities/project-design-load-stage.entity';
import { DesignSystem, DesignSystemStatus } from '../entities/design-system.entity';
import { DesignShift } from '../entities/design-shift.entity';
import { Employee, EmployeeStatus } from '../../people/entities/employee.entity';
import { EmployeeSkill, ProficiencyLevel } from '../../people/entities/employee-skill.entity';
import { Skill } from '../../people/entities/skill.entity';
import { ResourceAvailability, AvailabilityType } from '../../people/entities/resource-availability.entity';
import { Project } from '../../project/entities/project.entity';
import { CapacityQueryDto, CapacityHorizon, WhatIfSimulationDto } from '../dto/capacity-planning.dto';
import { AuditService } from '../../audit/services/audit.service';

const PROFICIENCY_RANK: Record<ProficiencyLevel, number> = {
  [ProficiencyLevel.BEGINNER]: 1,
  [ProficiencyLevel.INTERMEDIATE]: 2,
  [ProficiencyLevel.ADVANCED]: 3,
  [ProficiencyLevel.EXPERT]: 4,
};

export interface CapacitySummary {
  horizon: CapacityHorizon;
  startDate: string;
  endDate: string;
  totalDesignDemandHours: number;
  theoreticalWorkstationCapacityHours: number;
  availableWorkstationCapacityHours: number;
  totalEngineerAvailableHours: number;
  skillConstrainedEligibleHours: number;
  allocatedHours: number;
  actualLoggedHours: number;
  remainingCapacityHours: number;
  capacityGapHours: number;
  averageEngineerUtilizationPct: number;
  averageWorkstationUtilizationPct: number;
  activeProjectsCount: number;
  activeWorkstationsCount: number;
  activeDesignEngineersCount: number;
  overloadedWorkstationsCount: number;
}

export interface CapacityTimelineBucket {
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
  demandHours: number;
  engineerCapacityHours: number;
  workstationCapacityHours: number;
  eligibleSkillCapacityHours: number;
  capacityGapHours: number;
  utilizationPct: number;
  status: 'OPTIMAL' | 'NEAR_CAPACITY' | 'OVERLOADED';
}

export interface EngineerUtilizationReport {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  department: string;
  skills: Array<{ skillName: string; proficiency: string }>;
  availableHours: number;
  allocatedHours: number;
  actualHours: number;
  allocatedUtilizationPct: number;
  actualUtilizationPct: number;
  remainingHours: number;
  isOverloaded: boolean;
  status: 'UNDERUTILIZED' | 'HEALTHY' | 'OVERLOADED';
}

export interface CapacityRecommendation {
  id: string;
  recommendationType: 'NO_ACTION' | 'REASSIGN' | 'OVERTIME' | 'ADD_ENGINEER' | 'OUTSOURCE' | 'DELAY_NON_CRITICAL' | 'ADD_WORKSTATION';
  title: string;
  reason: string;
  affectedProjectCode?: string;
  affectedProjectId?: string;
  affectedStage?: string;
  capacityGapHours: number;
  estimatedImpact: string;
  requiresApproval: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CapacityRiskAlert {
  id: string;
  riskType: 'OVERLOAD' | 'SKILL_SHORTAGE' | 'WORKSTATION_SHORTAGE' | 'DEADLINE_RISK' | 'STAGE_BOTTLENECK';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  affectedProjectCode?: string;
  affectedProjectId?: string;
  requiredSkill?: string;
  gapHours: number;
  recommendedMitigation: string;
}

@Injectable()
export class CapacityIntelligenceService extends TenantAwareService<ProjectDesignLoad> {
  constructor(
    @InjectRepository(ProjectDesignLoad) repo: Repository<ProjectDesignLoad>,
    @InjectRepository(ProjectDesignLoadStage)
    private readonly stageRepo: Repository<ProjectDesignLoadStage>,
    @InjectRepository(DesignSystem)
    private readonly systemRepo: Repository<DesignSystem>,
    @InjectRepository(DesignShift)
    private readonly shiftRepo: Repository<DesignShift>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeSkill)
    private readonly employeeSkillRepo: Repository<EmployeeSkill>,
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(ResourceAvailability)
    private readonly availabilityRepo: Repository<ResourceAvailability>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'ProjectDesignLoad');
  }

  async getCapacitySummary(
    dto: CapacityQueryDto,
    tenantId?: string | null,
  ): Promise<CapacitySummary> {
    const scopeTenant = this.requireTenant(tenantId);
    const horizon = dto.horizon || CapacityHorizon.WEEKLY;

    const today = new Date();
    const startDateStr = dto.startDate || today.toISOString().split('T')[0];
    const end = new Date(today);
    if (horizon === CapacityHorizon.DAILY) end.setDate(today.getDate() + 14);
    else if (horizon === CapacityHorizon.WEEKLY) end.setDate(today.getDate() + 60);
    else end.setDate(today.getDate() + 180);
    const endDateStr = dto.endDate || end.toISOString().split('T')[0];

    const daysCount = Math.max(1, Math.ceil((new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24)));

    // 1. Fetch active design loads and stages
    const loadsQb = this.repo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.stages', 'stage')
      .where('l.deleted_at IS NULL')
      .andWhere('l.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (dto.projectId) {
      loadsQb.andWhere('l.project_id = :projectId', { projectId: dto.projectId });
    }

    const loads = await loadsQb.getMany();

    // 2. Fetch workstations & shifts
    const [systems, shifts, employees, employeeSkills] = await Promise.all([
      this.systemRepo.find({ where: { tenantId: scopeTenant, deletedAt: IsNull() } as any }),
      this.shiftRepo.find({ where: { tenantId: scopeTenant, deletedAt: IsNull(), isActive: true } as any }),
      this.employeeRepo.find({
        where: { tenantId: scopeTenant, deletedAt: IsNull(), status: EmployeeStatus.ACTIVE } as any,
      }),
      this.employeeSkillRepo.find({
        where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
      }),
    ]);

    // Calculate metrics
    const totalDesignDemandHours = loads.reduce((acc, l) => acc + Number(l.plannedHours || l.standardHours || 0), 0);
    const allocatedHours = loads.reduce((acc, l) => {
      const stageAlloc = (l.stages || []).reduce((sAcc, stg) => sAcc + (stg.assignedEmployeeId ? Number(stg.plannedHours || 0) : 0), 0);
      return acc + stageAlloc;
    }, 0);
    const actualLoggedHours = loads.reduce((acc, l) => acc + Number(l.actualHours || 0), 0);

    const activeWorkstations = systems.filter((s) => s.status === DesignSystemStatus.ACTIVE);
    const shiftsCount = shifts.length || 3;
    const theoreticalWorkstationCapacityHours = systems.length * shiftsCount * 8 * (daysCount * (5 / 7)); // Working days factor
    const availableWorkstationCapacityHours = activeWorkstations.length * shiftsCount * 8 * (daysCount * (5 / 7));

    // Design engineers (Department = Design or Engineering)
    const designEngineers = employees.filter((e) =>
      ['design', 'engineering', 'cad', 'development'].some((d) => e.department?.toLowerCase().includes(d)),
    );
    const totalDesignEngineers = designEngineers.length > 0 ? designEngineers.length : employees.length;
    const workingDays = Math.max(1, Math.round(daysCount * (5 / 7)));
    const totalEngineerAvailableHours = totalDesignEngineers * workingDays * 8;

    // Skill constrained capacity (engineers possessing skills for active loads)
    const activeSkillIds = new Set<string>();
    loads.forEach((l) => l.stages?.forEach((s) => s.requiredSkillId && activeSkillIds.add(s.requiredSkillId)));
    const qualifiedEmployees = new Set(
      employeeSkills.filter((es) => activeSkillIds.size === 0 || activeSkillIds.has(es.skillId)).map((es) => es.employeeId),
    );
    const skillConstrainedEligibleHours = Math.max(1, qualifiedEmployees.size) * workingDays * 8;

    const capacityGapHours = Math.max(0, totalDesignDemandHours - skillConstrainedEligibleHours);
    const remainingCapacityHours = Math.max(0, skillConstrainedEligibleHours - totalDesignDemandHours);

    const averageEngineerUtilizationPct = totalEngineerAvailableHours > 0
      ? Number(((totalDesignDemandHours / totalEngineerAvailableHours) * 100).toFixed(1))
      : 0;

    const averageWorkstationUtilizationPct = availableWorkstationCapacityHours > 0
      ? Number(((totalDesignDemandHours / availableWorkstationCapacityHours) * 100).toFixed(1))
      : 0;

    return {
      horizon,
      startDate: startDateStr,
      endDate: endDateStr,
      totalDesignDemandHours,
      theoreticalWorkstationCapacityHours: Math.round(theoreticalWorkstationCapacityHours),
      availableWorkstationCapacityHours: Math.round(availableWorkstationCapacityHours),
      totalEngineerAvailableHours,
      skillConstrainedEligibleHours,
      allocatedHours,
      actualLoggedHours,
      remainingCapacityHours,
      capacityGapHours,
      averageEngineerUtilizationPct,
      averageWorkstationUtilizationPct,
      activeProjectsCount: new Set(loads.map((l) => l.projectId)).size,
      activeWorkstationsCount: activeWorkstations.length,
      activeDesignEngineersCount: totalDesignEngineers,
      overloadedWorkstationsCount: averageWorkstationUtilizationPct > 100 ? activeWorkstations.length : 0,
    };
  }

  async getCapacityTimeline(
    dto: CapacityQueryDto,
    tenantId?: string | null,
  ): Promise<CapacityTimelineBucket[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const horizon = dto.horizon || CapacityHorizon.WEEKLY;

    const [loads, systems, employees] = await Promise.all([
      this.repo.find({
        where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
        relations: ['stages'],
      }),
      this.systemRepo.find({ where: { tenantId: scopeTenant, deletedAt: IsNull(), status: DesignSystemStatus.ACTIVE } as any }),
      this.employeeRepo.find({ where: { tenantId: scopeTenant, deletedAt: IsNull(), status: EmployeeStatus.ACTIVE } as any }),
    ]);

    const designEngineersCount = Math.max(
      1,
      employees.filter((e) => ['design', 'engineering', 'cad'].some((d) => e.department?.toLowerCase().includes(d))).length || employees.length,
    );
    const activeWorkstationsCount = Math.max(1, systems.length || 10);

    const buckets: CapacityTimelineBucket[] = [];
    const numBuckets = horizon === CapacityHorizon.DAILY ? 14 : horizon === CapacityHorizon.WEEKLY ? 8 : 6;
    const bucketDays = horizon === CapacityHorizon.DAILY ? 1 : horizon === CapacityHorizon.WEEKLY ? 7 : 30;

    const today = new Date();

    for (let i = 0; i < numBuckets; i++) {
      const bStart = new Date(today);
      bStart.setDate(today.getDate() + i * bucketDays);
      const bEnd = new Date(bStart);
      bEnd.setDate(bStart.getDate() + bucketDays - 1);

      const periodKey = `${bStart.toISOString().split('T')[0]}_${bEnd.toISOString().split('T')[0]}`;
      const label = horizon === CapacityHorizon.DAILY
        ? `Day ${i + 1} (${bStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })})`
        : horizon === CapacityHorizon.WEEKLY
        ? `Week ${i + 1} (${bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
        : `Month ${i + 1} (${bStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;

      // Distribute demand across periods
      let demandHours = 0;
      for (const l of loads) {
        for (const stg of l.stages || []) {
          const stgHrs = Number(stg.plannedHours || stg.standardHours || 0);
          // Proportionally distribute across buckets
          demandHours += stgHrs / numBuckets;
        }
      }

      const workingDaysInBucket = horizon === CapacityHorizon.DAILY ? 1 : Math.round(bucketDays * (5 / 7));
      const engineerCapacityHours = designEngineersCount * workingDaysInBucket * 8;
      const workstationCapacityHours = activeWorkstationsCount * 3 * 8 * workingDaysInBucket;
      const eligibleSkillCapacityHours = Math.round(engineerCapacityHours * 0.85);

      const capacityGapHours = Math.max(0, demandHours - eligibleSkillCapacityHours);
      const utilizationPct = eligibleSkillCapacityHours > 0
        ? Number(((demandHours / eligibleSkillCapacityHours) * 100).toFixed(1))
        : 0;

      let status: CapacityTimelineBucket['status'] = 'OPTIMAL';
      if (utilizationPct > 105) status = 'OVERLOADED';
      else if (utilizationPct > 85) status = 'NEAR_CAPACITY';

      buckets.push({
        periodKey,
        label,
        startDate: bStart.toISOString().split('T')[0],
        endDate: bEnd.toISOString().split('T')[0],
        demandHours: Math.round(demandHours),
        engineerCapacityHours,
        workstationCapacityHours,
        eligibleSkillCapacityHours,
        capacityGapHours: Math.round(capacityGapHours),
        utilizationPct,
        status,
      });
    }

    return buckets;
  }

  async getEngineerUtilization(
    tenantId?: string | null,
  ): Promise<EngineerUtilizationReport[]> {
    const scopeTenant = this.requireTenant(tenantId);

    const [employees, employeeSkills, skills, stages] = await Promise.all([
      this.employeeRepo.find({
        where: { tenantId: scopeTenant, deletedAt: IsNull(), status: EmployeeStatus.ACTIVE } as any,
      }),
      this.employeeSkillRepo.find({
        where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
      }),
      this.skillRepo.find({
        where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
      }),
      this.stageRepo.find({
        where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
      }),
    ]);

    const skillMap = new Map(skills.map((s) => [s.id, s.name]));

    const skillsByEmp = new Map<string, Array<{ skillName: string; proficiency: string }>>();
    for (const es of employeeSkills) {
      const arr = skillsByEmp.get(es.employeeId) || [];
      const skillName = skillMap.get(es.skillId) || 'Skill';
      arr.push({ skillName, proficiency: es.proficiencyLevel });
      skillsByEmp.set(es.employeeId, arr);
    }

    const assignedHoursByEmp = new Map<string, { planned: number; actual: number }>();
    for (const stg of stages) {
      if (stg.assignedEmployeeId) {
        const cur = assignedHoursByEmp.get(stg.assignedEmployeeId) || { planned: 0, actual: 0 };
        cur.planned += Number(stg.plannedHours || stg.standardHours || 0);
        cur.actual += Number(stg.actualHours || 0);
        assignedHoursByEmp.set(stg.assignedEmployeeId, cur);
      }
    }

    const standardMonthlyAvailableHours = 160.0;

    return employees.map((emp) => {
      const allocated = assignedHoursByEmp.get(emp.id)?.planned || 0;
      const actual = assignedHoursByEmp.get(emp.id)?.actual || 0;

      const allocatedUtilizationPct = Number(((allocated / standardMonthlyAvailableHours) * 100).toFixed(1));
      const actualUtilizationPct = Number(((actual / standardMonthlyAvailableHours) * 100).toFixed(1));
      const remainingHours = Math.max(0, standardMonthlyAvailableHours - allocated);
      const isOverloaded = allocatedUtilizationPct > 100;

      let status: EngineerUtilizationReport['status'] = 'HEALTHY';
      if (isOverloaded) status = 'OVERLOADED';
      else if (allocatedUtilizationPct < 50) status = 'UNDERUTILIZED';

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: `${emp.firstName} ${emp.lastName}`.trim(),
        designation: emp.designation || 'Engineer',
        department: emp.department || 'Design',
        skills: skillsByEmp.get(emp.id) || [],
        availableHours: standardMonthlyAvailableHours,
        allocatedHours: allocated,
        actualHours: actual,
        allocatedUtilizationPct,
        actualUtilizationPct,
        remainingHours,
        isOverloaded,
        status,
      };
    });
  }

  async runWhatIfSimulation(
    dto: WhatIfSimulationDto,
    tenantId?: string | null,
  ): Promise<{
    baselineSummary: CapacitySummary;
    simulatedSummary: CapacitySummary;
    deltaCapacityHours: number;
    deltaDemandHours: number;
    resolvedGapHours: number;
    explanation: string;
  }> {
    const scopeTenant = this.requireTenant(tenantId);
    const baseline = await this.getCapacitySummary({ horizon: CapacityHorizon.MONTHLY }, scopeTenant);

    const addedEngineers = dto.addEngineers || 0;
    const addedEngHours = addedEngineers * (dto.engineerWeeklyHours || 40) * 4;
    const addedWorkstations = dto.addWorkstations || 0;
    const addedWsHours = addedWorkstations * 3 * 8 * 22; // 22 working days
    const outsourceHrs = dto.outsourceHours || 0;

    const simulatedCapacity = baseline.skillConstrainedEligibleHours + addedEngHours;
    const simulatedDemand = Math.max(0, baseline.totalDesignDemandHours - outsourceHrs);
    const simulatedGap = Math.max(0, simulatedDemand - simulatedCapacity);
    const simulatedRemaining = Math.max(0, simulatedCapacity - simulatedDemand);

    const simulatedUtil = simulatedCapacity > 0
      ? Number(((simulatedDemand / simulatedCapacity) * 100).toFixed(1))
      : 0;

    const simulated: CapacitySummary = {
      ...baseline,
      totalDesignDemandHours: simulatedDemand,
      skillConstrainedEligibleHours: simulatedCapacity,
      totalEngineerAvailableHours: baseline.totalEngineerAvailableHours + addedEngHours,
      availableWorkstationCapacityHours: baseline.availableWorkstationCapacityHours + addedWsHours,
      capacityGapHours: simulatedGap,
      remainingCapacityHours: simulatedRemaining,
      averageEngineerUtilizationPct: simulatedUtil,
    };

    const resolvedGapHours = baseline.capacityGapHours - simulatedGap;

    const explanation = `Simulation Scenario: Adding ${addedEngineers} engineer(s) (+${addedEngHours}h), ${addedWorkstations} CAD workstation(s) (+${addedWsHours}h), and outsourcing ${outsourceHrs}h reduces capacity gap from ${baseline.capacityGapHours}h to ${simulatedGap}h (${resolvedGapHours >= 0 ? '-' : '+'}${Math.abs(resolvedGapHours)}h net gap change). Utilization shifts to ${simulatedUtil}%.`;

    return {
      baselineSummary: baseline,
      simulatedSummary: simulated,
      deltaCapacityHours: addedEngHours,
      deltaDemandHours: -outsourceHrs,
      resolvedGapHours,
      explanation,
    };
  }

  async getCapacityRecommendations(
    tenantId?: string | null,
  ): Promise<CapacityRecommendation[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const [summary, utilization, loads] = await Promise.all([
      this.getCapacitySummary({ horizon: CapacityHorizon.MONTHLY }, scopeTenant),
      this.getEngineerUtilization(scopeTenant),
      this.repo.find({
        where: { tenantId: scopeTenant, deletedAt: IsNull() } as any,
        relations: ['stages'],
      }),
    ]);

    const recommendations: CapacityRecommendation[] = [];

    // Rule 1: Capacity gap exists
    if (summary.capacityGapHours > 0) {
      const underutilized = utilization.filter((u) => u.status === 'UNDERUTILIZED');
      if (underutilized.length > 0) {
        recommendations.push({
          id: 'rec-reassign-1',
          recommendationType: 'REASSIGN',
          title: 'Reassign Workload to Available Engineers',
          reason: `${underutilized.length} engineers have <50% utilization while a ${summary.capacityGapHours}h design capacity gap exists.`,
          capacityGapHours: summary.capacityGapHours,
          estimatedImpact: `Resolves up to ${underutilized.reduce((a, b) => a + b.remainingHours, 0)}h of demand without additional costs.`,
          requiresApproval: true,
          priority: 'HIGH',
        });
      } else if (summary.capacityGapHours <= summary.totalEngineerAvailableHours * 0.15) {
        recommendations.push({
          id: 'rec-overtime-1',
          recommendationType: 'OVERTIME',
          title: 'Schedule Weekend Shift / Overtime',
          reason: `Capacity gap of ${summary.capacityGapHours}h is within manageable 15% overtime threshold.`,
          capacityGapHours: summary.capacityGapHours,
          estimatedImpact: `Closes ${summary.capacityGapHours}h gap in current monthly cycle.`,
          requiresApproval: true,
          priority: 'MEDIUM',
        });
      } else {
        recommendations.push({
          id: 'rec-outsource-1',
          recommendationType: 'OUTSOURCE',
          title: 'Outsource Detailing & CAM Workload',
          reason: `High capacity deficit of ${summary.capacityGapHours}h exceeds internal capacity headroom.`,
          capacityGapHours: summary.capacityGapHours,
          estimatedImpact: `Eliminates schedule delay risks on critical mold delivery commitments.`,
          requiresApproval: true,
          priority: 'HIGH',
        });
      }
    }

    // Rule 2: Overloaded engineers
    const overloaded = utilization.filter((u) => u.isOverloaded);
    if (overloaded.length > 0) {
      recommendations.push({
        id: 'rec-level-1',
        recommendationType: 'REASSIGN',
        title: `Balance Workload for ${overloaded.length} Overloaded Engineer(s)`,
        reason: `Engineers (${overloaded.map((o) => o.fullName).join(', ')}) exceed 100% planned utilization.`,
        capacityGapHours: overloaded.reduce((a, b) => a + (b.allocatedHours - b.availableHours), 0),
        estimatedImpact: 'Prevents engineering burnout and design defect escalation.',
        requiresApproval: true,
        priority: 'HIGH',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec-optimal-1',
        recommendationType: 'NO_ACTION',
        title: 'Design Studio Capacity is Healthy',
        reason: 'Current project design demand is within balanced engineer and workstation capacity limits.',
        capacityGapHours: 0,
        estimatedImpact: 'All planned milestones remain on schedule.',
        requiresApproval: false,
        priority: 'LOW',
      });
    }

    return recommendations;
  }

  async getCapacityRisks(
    tenantId?: string | null,
  ): Promise<CapacityRiskAlert[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const [summary, utilization] = await Promise.all([
      this.getCapacitySummary({ horizon: CapacityHorizon.MONTHLY }, scopeTenant),
      this.getEngineerUtilization(scopeTenant),
    ]);

    const risks: CapacityRiskAlert[] = [];

    if (summary.capacityGapHours > 0) {
      risks.push({
        id: 'risk-cap-gap',
        riskType: 'OVERLOAD',
        severity: summary.capacityGapHours > 100 ? 'CRITICAL' : 'HIGH',
        title: 'Design Studio Workload Overload Deficit',
        description: `Aggregate design demand (${summary.totalDesignDemandHours}h) exceeds eligible capacity (${summary.skillConstrainedEligibleHours}h) by ${summary.capacityGapHours}h.`,
        gapHours: summary.capacityGapHours,
        recommendedMitigation: 'Activate what-if simulation to evaluate stage outsourcing or weekend overtime scheduling.',
      });
    }

    const overloaded = utilization.filter((u) => u.isOverloaded);
    if (overloaded.length > 0) {
      risks.push({
        id: 'risk-eng-overload',
        riskType: 'OVERLOAD',
        severity: 'HIGH',
        title: 'Engineer Individual Overload Warning',
        description: `${overloaded.length} designer(s) allocated > 100% of standard monthly hours.`,
        gapHours: overloaded.reduce((a, b) => a + (b.allocatedHours - b.availableHours), 0),
        recommendedMitigation: 'Reassign tasks to underutilized team members.',
      });
    }

    return risks;
  }
}
