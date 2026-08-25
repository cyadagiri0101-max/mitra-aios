import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignEngineerProfile, ActiveProjectAssignment, EngineerSkillProficiency } from '../entities/design-team-capacity.entity';
import { CrossProjectAllocation } from '../entities/cross-project-allocation.entity';

export interface EngineerCapacityDetail {
  engineerId: string;
  name: string;
  role: string;
  proficiencyLevel: string;
  baseWeeklyCapacityHours: number;
  allocatedHoursPerWeek: number;
  remainingCapacityHours: number;
  utilizationPercentage: number;
  isOverloaded: boolean;
  isUnderutilized: boolean;
  skills: Array<{ skillType: string; level: string; yearsExperience: number }>;
  activeAllocations: Array<{
    allocationId: string;
    projectId: string;
    allocatedHours: number;
    role: string;
    status: string;
  }>;
}

export interface PortfolioCapacitySummary {
  tenantId: string;
  totalEngineersCount: number;
  totalAvailableWeeklyCapacityHours: number;
  totalAllocatedWeeklyCapacityHours: number;
  overallUtilizationPercentage: number;
  overloadedEngineersCount: number;
  underutilizedEngineersCount: number;
  engineers: EngineerCapacityDetail[];
}

@Injectable()
export class PortfolioCapacityService {
  private readonly logger = new Logger(PortfolioCapacityService.name);

  constructor(
    @InjectRepository(DesignEngineerProfile)
    private readonly engineerRepo: Repository<DesignEngineerProfile>,
    @InjectRepository(CrossProjectAllocation)
    private readonly allocationRepo: Repository<CrossProjectAllocation>,
  ) {}

  public async calculatePortfolioCapacity(
    tenantId: string,
    roleFilter?: string,
  ): Promise<PortfolioCapacitySummary> {
    this.logger.log(`Calculating portfolio capacity for tenant: ${tenantId}`);

    // Fetch engineers
    const engineerQuery = this.engineerRepo.createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId });
    if (roleFilter) {
      engineerQuery.andWhere('e.proficiency_level = :roleFilter', { roleFilter });
    }
    const engineers = await engineerQuery.getMany();

    // Fetch active allocations
    const allocations = await this.allocationRepo.find({
      where: {
        tenantId,
        allocationStatus: 'ACTIVE',
      },
    });

    const allocationMap = new Map<string, CrossProjectAllocation[]>();
    allocations.forEach((a) => {
      if (!allocationMap.has(a.engineerId)) {
        allocationMap.set(a.engineerId, []);
      }
      allocationMap.get(a.engineerId)!.push(a);
    });

    let totalAvailableWeekly = 0;
    let totalAllocatedWeekly = 0;
    let overloadedCount = 0;
    let underutilizedCount = 0;
    const engineerDetails: EngineerCapacityDetail[] = [];

    engineers.forEach((eng) => {
      const baseHours = Number(eng.weeklyCapacityHours) || 40.0;
      const engAllocations = allocationMap.get(eng.engineerCode) || allocationMap.get(eng.id) || [];
      
      let allocatedHours = 0;
      engAllocations.forEach((a) => {
        allocatedHours += Number(a.allocatedHoursPerWeek) || 0;
      });

      // Also include activeAssignments from profile if no CrossProjectAllocations exist yet
      if (engAllocations.length === 0 && eng.activeAssignments && eng.activeAssignments.length > 0) {
        eng.activeAssignments.forEach((assign: ActiveProjectAssignment) => {
          allocatedHours += Number(assign.allocatedWeeklyHours) || 0;
        });
      }

      const utilization = baseHours > 0 ? (allocatedHours / baseHours) * 100 : 0;
      const remaining = Math.max(0, baseHours - allocatedHours);
      const isOverloaded = utilization > 100.0;
      const isUnderutilized = utilization < 60.0;

      totalAvailableWeekly += baseHours;
      totalAllocatedWeekly += allocatedHours;
      if (isOverloaded) overloadedCount++;
      if (isUnderutilized) underutilizedCount++;

      engineerDetails.push({
        engineerId: eng.engineerCode || eng.id,
        name: eng.name,
        role: eng.proficiencyLevel || 'TOOL_DESIGNER',
        proficiencyLevel: eng.proficiencyLevel,
        baseWeeklyCapacityHours: baseHours,
        allocatedHoursPerWeek: Math.round(allocatedHours * 100) / 100,
        remainingCapacityHours: Math.round(remaining * 100) / 100,
        utilizationPercentage: Math.round(utilization * 100) / 100,
        isOverloaded,
        isUnderutilized,
        skills: (eng.primarySkills || []).map((s: EngineerSkillProficiency) => ({
          skillType: s.skill,
          level: s.level,
          yearsExperience: s.yearsExperience || 0,
        })),
        activeAllocations: engAllocations.map((a) => ({
          allocationId: a.id,
          projectId: a.projectId,
          allocatedHours: Number(a.allocatedHoursPerWeek),
          role: a.allocationRole,
          status: a.allocationStatus,
        })),
      });
    });

    const overallUtilization = totalAvailableWeekly > 0
      ? (totalAllocatedWeekly / totalAvailableWeekly) * 100
      : 0;

    return {
      tenantId,
      totalEngineersCount: engineers.length,
      totalAvailableWeeklyCapacityHours: Math.round(totalAvailableWeekly * 100) / 100,
      totalAllocatedWeeklyCapacityHours: Math.round(totalAllocatedWeekly * 100) / 100,
      overallUtilizationPercentage: Math.round(overallUtilization * 100) / 100,
      overloadedEngineersCount: overloadedCount,
      underutilizedEngineersCount: underutilizedCount,
      engineers: engineerDetails,
    };
  }
}
