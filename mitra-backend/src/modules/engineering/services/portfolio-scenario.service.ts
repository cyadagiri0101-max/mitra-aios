import { Injectable, Logger } from '@nestjs/common';
import { PortfolioDemandService, PortfolioDemandSummary } from './portfolio-demand.service';
import { PortfolioCapacityService, PortfolioCapacitySummary } from './portfolio-capacity.service';
import { SimulatePortfolioScenarioDto } from '../dto/portfolio-orchestration.dto';

export interface ScenarioSimulationResult {
  scenarioName: string;
  tenantId: string;
  simulatedAt: string;
  baselineSummary: {
    totalDemandHours: number;
    totalCapacityHours: number;
    utilizationPercentage: number;
    overloadedEngineersCount: number;
  };
  simulatedSummary: {
    totalDemandHours: number;
    totalCapacityHours: number;
    utilizationPercentage: number;
    overloadedEngineersCount: number;
  };
  deltas: {
    demandHoursDelta: number;
    capacityHoursDelta: number;
    utilizationDelta: number;
    overloadedEngineersDelta: number;
  };
  affectedProjects: Array<{
    projectId: string;
    impactDescription: string;
  }>;
  affectedEngineers: Array<{
    engineerId: string;
    engineerName: string;
    previousUtilization: number;
    simulatedUtilization: number;
    status: 'OPTIMAL' | 'OVERLOADED' | 'UNDERUTILIZED';
  }>;
  scenarioBottlenecks: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  isAutonomousDecision: false;
}

@Injectable()
export class PortfolioScenarioService {
  private readonly logger = new Logger(PortfolioScenarioService.name);

  constructor(
    private readonly demandService: PortfolioDemandService,
    private readonly capacityService: PortfolioCapacityService,
  ) {}

  public async simulateScenario(
    tenantId: string,
    dto: SimulatePortfolioScenarioDto,
  ): Promise<ScenarioSimulationResult> {
    this.logger.log(`Simulating portfolio scenario: ${dto.scenarioName} for tenant: ${tenantId}`);

    const baselineDemand: PortfolioDemandSummary = await this.demandService.calculatePortfolioDemand(tenantId);
    const baselineCapacity: PortfolioCapacitySummary = await this.capacityService.calculatePortfolioCapacity(tenantId);

    // Deep copy baseline for simulation
    let simDemandHours = baselineDemand.totalDemandHours;
    let simCapacityHours = baselineCapacity.totalAvailableWeeklyCapacityHours * (dto.capacityMultiplier || 1.0);

    const affectedProjects: Array<{ projectId: string; impactDescription: string }> = [];
    const affectedEngineers: Array<{
      engineerId: string;
      engineerName: string;
      previousUtilization: number;
      simulatedUtilization: number;
      status: 'OPTIMAL' | 'OVERLOADED' | 'UNDERUTILIZED';
    }> = [];
    const scenarioBottlenecks: Array<{ type: string; severity: string; description: string }> = [];

    // 1. Process delayed projects
    if (dto.delayedProjects && dto.delayedProjects.length > 0) {
      dto.delayedProjects.forEach((dp) => {
        affectedProjects.push({
          projectId: dp.projectId,
          impactDescription: `Project timeline shifted by +${dp.delayDays} days, deferring demand across portfolio horizon.`,
        });
      });
    }

    // 2. Process added / removed projects
    if (dto.addedProjectIds && dto.addedProjectIds.length > 0) {
      const addedHours = dto.addedProjectIds.length * 120.0; // Nominal 120h per injected program
      simDemandHours += addedHours;
      dto.addedProjectIds.forEach((pid) => {
        affectedProjects.push({
          projectId: pid,
          impactDescription: `Injected prospective project adding ~120h tooling demand.`,
        });
      });
    }

    if (dto.removedProjectIds && dto.removedProjectIds.length > 0) {
      dto.removedProjectIds.forEach((pid) => {
        const p = baselineDemand.projects.find((pr) => pr.projectId === pid);
        const removedHours = p ? p.remainingDemandHours : 80.0;
        simDemandHours = Math.max(0, simDemandHours - removedHours);
        affectedProjects.push({
          projectId: pid,
          impactDescription: `De-scoped project releasing ~${Math.round(removedHours)}h demand.`,
        });
      });
    }

    // 3. Process engineer unavailability & reassignments
    const unavailableSet = new Set(dto.unavailableEngineers || []);
    let simAllocatedHours = 0;
    let simOverloadedCount = 0;

    baselineCapacity.engineers.forEach((eng) => {
      let allocated = eng.allocatedHoursPerWeek;
      let capacity = eng.baseWeeklyCapacityHours * (dto.capacityMultiplier || 1.0);

      if (unavailableSet.has(eng.engineerId)) {
        simCapacityHours = Math.max(0, simCapacityHours - capacity);
        capacity = 0;
        scenarioBottlenecks.push({
          type: 'ENGINEER_UNAVAILABLE',
          severity: 'HIGH',
          description: `Engineer ${eng.name} marked unavailable in scenario. ${allocated}h workload requires reassignment.`,
        });
      }

      // Check reassignments
      if (dto.reassignments && dto.reassignments.length > 0) {
        dto.reassignments.forEach((r) => {
          if (r.engineerId === eng.engineerId) {
            allocated += r.allocatedHours;
          }
        });
      }

      const util = capacity > 0 ? (allocated / capacity) * 100 : (allocated > 0 ? 999.0 : 0.0);
      const isOver = util > 100.0;
      if (isOver) simOverloadedCount++;

      simAllocatedHours += allocated;

      if (util !== eng.utilizationPercentage || unavailableSet.has(eng.engineerId)) {
        affectedEngineers.push({
          engineerId: eng.engineerId,
          engineerName: eng.name,
          previousUtilization: eng.utilizationPercentage,
          simulatedUtilization: Math.round(util * 10) / 10,
          status: util > 100.0 ? 'OVERLOADED' : util < 60.0 ? 'UNDERUTILIZED' : 'OPTIMAL',
        });
      }
    });

    const simUtilization = simCapacityHours > 0 ? (simAllocatedHours / simCapacityHours) * 100 : 0;

    return {
      scenarioName: dto.scenarioName,
      tenantId,
      simulatedAt: new Date().toISOString(),
      baselineSummary: {
        totalDemandHours: baselineDemand.totalDemandHours,
        totalCapacityHours: baselineCapacity.totalAvailableWeeklyCapacityHours,
        utilizationPercentage: baselineCapacity.overallUtilizationPercentage,
        overloadedEngineersCount: baselineCapacity.overloadedEngineersCount,
      },
      simulatedSummary: {
        totalDemandHours: Math.round(simDemandHours * 10) / 10,
        totalCapacityHours: Math.round(simCapacityHours * 10) / 10,
        utilizationPercentage: Math.round(simUtilization * 10) / 10,
        overloadedEngineersCount: simOverloadedCount,
      },
      deltas: {
        demandHoursDelta: Math.round((simDemandHours - baselineDemand.totalDemandHours) * 10) / 10,
        capacityHoursDelta: Math.round((simCapacityHours - baselineCapacity.totalAvailableWeeklyCapacityHours) * 10) / 10,
        utilizationDelta: Math.round((simUtilization - baselineCapacity.overallUtilizationPercentage) * 10) / 10,
        overloadedEngineersDelta: simOverloadedCount - baselineCapacity.overloadedEngineersCount,
      },
      affectedProjects,
      affectedEngineers,
      scenarioBottlenecks,
      isAutonomousDecision: false,
    };
  }
}
