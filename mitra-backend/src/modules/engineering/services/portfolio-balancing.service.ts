import { Injectable, Logger } from '@nestjs/common';
import { PortfolioDemandService, PortfolioDemandSummary } from './portfolio-demand.service';
import { PortfolioCapacityService, PortfolioCapacitySummary } from './portfolio-capacity.service';

export interface DetectedBottleneck {
  bottleneckId: string;
  type: 'ENGINEER_OVERLOAD' | 'SKILL_SHORTAGE' | 'DEADLINE_COLLISION' | 'DEPENDENCY_BLOCKAGE' | 'CAPACITY_DEFICIT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectId?: string;
  resourceId?: string;
  description: string;
  impactSummary: string;
  recommendedAction: string;
}

export interface BalancingRecommendation {
  recommendationId: string;
  type: 'REALLOCATE_ENGINEER' | 'LEVEL_WORKLOAD' | 'STAGGER_DEADLINE' | 'SKILL_UPSKILL';
  sourceProjectId?: string;
  targetProjectId?: string;
  engineerId?: string;
  engineerName?: string;
  suggestedHours: number;
  expectedUtilizationDelta: number;
  rationale: string;
  isAutonomousDecision: false;
}

export interface BalancingAnalysisResult {
  tenantId: string;
  timestamp: string;
  overallHealthScore: number;
  bottlenecks: DetectedBottleneck[];
  recommendations: BalancingRecommendation[];
  isAutonomousDecision: false;
}

@Injectable()
export class PortfolioBalancingService {
  private readonly logger = new Logger(PortfolioBalancingService.name);

  constructor(
    private readonly demandService: PortfolioDemandService,
    private readonly capacityService: PortfolioCapacityService,
  ) {}

  public async analyzeAndBalance(
    tenantId: string,
    targetUtilizationCap: number = 100.0,
  ): Promise<BalancingAnalysisResult> {
    this.logger.log(`Executing deterministic balancing analysis for tenant: ${tenantId}`);

    const demand: PortfolioDemandSummary = await this.demandService.calculatePortfolioDemand(tenantId);
    const capacity: PortfolioCapacitySummary = await this.capacityService.calculatePortfolioCapacity(tenantId);

    const bottlenecks: DetectedBottleneck[] = [];
    const recommendations: BalancingRecommendation[] = [];

    // 1. Detect Engineer Overload Bottlenecks
    capacity.engineers.forEach((eng) => {
      if (eng.utilizationPercentage > targetUtilizationCap) {
        const excessHours = Math.max(0, eng.allocatedHoursPerWeek - eng.baseWeeklyCapacityHours);
        const severity = eng.utilizationPercentage > 130 ? 'CRITICAL' : eng.utilizationPercentage > 115 ? 'HIGH' : 'MEDIUM';

        bottlenecks.push({
          bottleneckId: `btnk-eng-overload-${eng.engineerId}`,
          type: 'ENGINEER_OVERLOAD',
          severity,
          resourceId: eng.engineerId,
          description: `Engineer ${eng.name} is allocated at ${eng.utilizationPercentage}% (${eng.allocatedHoursPerWeek}h / ${eng.baseWeeklyCapacityHours}h capacity)`,
          impactSummary: `Risk of fatigue and delivery slippage across ${eng.activeAllocations.length} assigned projects.`,
          recommendedAction: `Reallocate ~${Math.round(excessHours)}h/week to underutilized peer engineers with matching skill profile.`,
        });

        // Generate Rebalancing Recommendation
        // Find underutilized engineer with capacity
        const candidate = capacity.engineers.find(
          (peer) => peer.engineerId !== eng.engineerId && peer.utilizationPercentage < 80.0,
        );

        if (candidate) {
          const shiftHours = Math.min(excessHours, candidate.remainingCapacityHours);
          if (shiftHours > 0) {
            recommendations.push({
              recommendationId: `rec-rebal-${eng.engineerId}-${candidate.engineerId}`,
              type: 'REALLOCATE_ENGINEER',
              sourceProjectId: eng.activeAllocations[0]?.projectId || 'GENERAL',
              targetProjectId: eng.activeAllocations[0]?.projectId || 'GENERAL',
              engineerId: candidate.engineerId,
              engineerName: candidate.name,
              suggestedHours: Math.round(shiftHours * 10) / 10,
              expectedUtilizationDelta: Math.round(((shiftHours / candidate.baseWeeklyCapacityHours) * 100) * 10) / 10,
              rationale: `Transfer ${Math.round(shiftHours)}h load from overloaded ${eng.name} (${eng.utilizationPercentage}%) to available ${candidate.name} (${candidate.utilizationPercentage}%).`,
              isAutonomousDecision: false,
            });
          }
        }
      }
    });

    // 2. Detect Project Capacity Deficit
    demand.projects.forEach((proj) => {
      if (proj.uncalibratedDeliverablesCount > 0) {
        bottlenecks.push({
          bottleneckId: `btnk-uncalibrated-${proj.projectId}`,
          type: 'CAPACITY_DEFICIT',
          severity: 'MEDIUM',
          projectId: proj.projectId,
          description: `Project ${proj.projectId} contains ${proj.uncalibratedDeliverablesCount} uncalibrated deliverables lacking duration estimates.`,
          impactSummary: 'Demand calculation relies on nominal fallback baselines.',
          recommendedAction: 'Calibrate deliverable complexity against historical workload models.',
        });
      }
    });

    // Calculate Overall Health Score (0 - 100)
    let healthScore = 100.0;
    bottlenecks.forEach((b) => {
      if (b.severity === 'CRITICAL') healthScore -= 25;
      else if (b.severity === 'HIGH') healthScore -= 15;
      else if (b.severity === 'MEDIUM') healthScore -= 8;
      else healthScore -= 3;
    });
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore * 10) / 10));

    return {
      tenantId,
      timestamp: new Date().toISOString(),
      overallHealthScore: healthScore,
      bottlenecks,
      recommendations,
      isAutonomousDecision: false,
    };
  }
}
