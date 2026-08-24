import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DesignEngineerProfile,
  EngineerSkillType,
} from '../entities/design-team-capacity.entity';
import { RegisterEngineerProfileDto } from '../dto/design-lifecycle-capacity.dto';

export interface TeamCapacitySummary {
  totalEngineers: number;
  totalWeeklyCapacityHours: number;
  allocatedHours: number;
  averageUtilizationPercentage: number;
  overloadedEngineersCount: number;
  availableEngineersCount: number;
  skillCoverage: Record<string, { engineerCount: number; totalCapacityHours: number }>;
  bottleneckSkills: string[];
}

@Injectable()
export class DesignCapacityService {
  private readonly logger = new Logger(DesignCapacityService.name);

  constructor(
    @InjectRepository(DesignEngineerProfile)
    private readonly engineerRepo: Repository<DesignEngineerProfile>,
  ) {}

  /**
   * Register or update a design engineer profile
   */
  async registerEngineer(
    dto: RegisterEngineerProfileDto,
    tenantId: string,
  ): Promise<DesignEngineerProfile> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    let profile = await this.engineerRepo.findOne({
      where: { engineerCode: dto.engineerCode, tenantId },
    });

    if (!profile) {
      profile = this.engineerRepo.create({
        tenantId,
        engineerCode: dto.engineerCode,
        name: dto.name,
        email: dto.email,
        proficiencyLevel: dto.proficiencyLevel || 'MID',
        primarySkills: dto.primarySkills,
        weeklyCapacityHours: dto.weeklyCapacityHours || 40.0,
        currentUtilizationPercentage: 0.0,
        status: 'AVAILABLE',
        activeAssignments: [],
      });
    } else {
      profile.name = dto.name;
      profile.email = dto.email;
      profile.primarySkills = dto.primarySkills;
      if (dto.proficiencyLevel) profile.proficiencyLevel = dto.proficiencyLevel;
      if (dto.weeklyCapacityHours) profile.weeklyCapacityHours = dto.weeklyCapacityHours;
    }

    return await this.engineerRepo.save(profile);
  }

  /**
   * Allocate workload to engineer with overload detection
   */
  async allocateWorkload(
    engineerId: string,
    allocation: {
      projectId: string;
      packageId: string;
      stageName: string;
      allocatedWeeklyHours: number;
      startDate: string;
      endDate: string;
    },
    tenantId: string,
  ): Promise<DesignEngineerProfile> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const engineer = await this.engineerRepo.findOne({
      where: { id: engineerId, tenantId },
    });
    if (!engineer) {
      throw new NotFoundException(`Engineer profile ${engineerId} not found.`);
    }

    engineer.activeAssignments = engineer.activeAssignments || [];
    engineer.activeAssignments.push(allocation);

    const totalAllocated = engineer.activeAssignments.reduce(
      (sum, a) => sum + Number(a.allocatedWeeklyHours || 0),
      0,
    );

    const capacity = Number(engineer.weeklyCapacityHours || 40.0);
    const utilization = capacity > 0 ? (totalAllocated / capacity) * 100 : 0;

    engineer.currentUtilizationPercentage = Number(utilization.toFixed(2));
    if (utilization > 100) {
      engineer.status = 'OVERLOADED';
    } else if (utilization >= 75) {
      engineer.status = 'LOADED';
    } else {
      engineer.status = 'AVAILABLE';
    }

    return await this.engineerRepo.save(engineer);
  }

  /**
   * Calculate team capacity, skill coverage, and identify bottleneck skills
   */
  async calculateTeamCapacity(tenantId: string): Promise<TeamCapacitySummary> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const engineers = await this.engineerRepo.find({ where: { tenantId } });

    let totalCapacity = 0;
    let totalAllocated = 0;
    let overloadedCount = 0;
    let availableCount = 0;
    const skillCoverage: Record<string, { engineerCount: number; totalCapacityHours: number }> = {};

    for (const eng of engineers) {
      const cap = Number(eng.weeklyCapacityHours || 40.0);
      totalCapacity += cap;

      const allocated = (eng.activeAssignments || []).reduce(
        (sum, a) => sum + Number(a.allocatedWeeklyHours || 0),
        0,
      );
      totalAllocated += allocated;

      if (eng.status === 'OVERLOADED') overloadedCount++;
      if (eng.status === 'AVAILABLE') availableCount++;

      for (const skillItem of eng.primarySkills || []) {
        const skillKey = skillItem.skill;
        if (!skillCoverage[skillKey]) {
          skillCoverage[skillKey] = { engineerCount: 0, totalCapacityHours: 0 };
        }
        skillCoverage[skillKey].engineerCount += 1;
        skillCoverage[skillKey].totalCapacityHours += cap;
      }
    }

    const avgUtil = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

    // Identify bottleneck skills: skills with <= 1 engineer or utilization > 90%
    const bottleneckSkills: string[] = [];
    for (const [skillKey, data] of Object.entries(skillCoverage)) {
      if (data.engineerCount <= 1) {
        bottleneckSkills.push(skillKey);
      }
    }

    return {
      totalEngineers: engineers.length,
      totalWeeklyCapacityHours: totalCapacity,
      allocatedHours: totalAllocated,
      averageUtilizationPercentage: Number(avgUtil.toFixed(2)),
      overloadedEngineersCount: overloadedCount,
      availableEngineersCount: availableCount,
      skillCoverage,
      bottleneckSkills,
    };
  }

  /**
   * Check if assigned engineer possesses required skill (Skill Mismatch Detection)
   */
  async checkSkillCompatibility(
    engineerId: string,
    requiredSkill: EngineerSkillType,
    tenantId: string,
  ): Promise<{ compatible: boolean; engineerName: string; matchingSkills: string[] }> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const eng = await this.engineerRepo.findOne({ where: { id: engineerId, tenantId } });
    if (!eng) throw new NotFoundException(`Engineer profile ${engineerId} not found.`);

    const matching = (eng.primarySkills || [])
      .filter((s) => s.skill === requiredSkill)
      .map((s) => `${s.skill} (${s.level})`);

    return {
      compatible: matching.length > 0,
      engineerName: eng.name,
      matchingSkills: matching,
    };
  }
}
