import { Injectable, Logger } from '@nestjs/common';

export interface MachineMatchAssessment {
  machineId: string;
  isCapable: boolean;
  tonnageCapacityKn: number;
  requiredClampingForceKn: number;
}

export interface ProductionReadinessReport {
  projectId: string;
  tenantId: string;
  readinessScore: number;
  machineAssessments: MachineMatchAssessment[];
  unresolvedTrialDefects: number;
  riskFactors: string[];
  isAutonomousDecision: false;
  timestamp: string;
}

@Injectable()
export class ManufacturingEngineeringIntelligenceService {
  private readonly logger = new Logger(ManufacturingEngineeringIntelligenceService.name);

  /**
   * Evaluates engineering-to-manufacturing digital thread readiness and machine matching.
   */
  evaluateProductionReadiness(
    projectId: string,
    tenantId: string,
    machineMatches: { machineId: string; capacityKn: number; requiredKn: number }[] = [],
    unresolvedTrialDefects: number = 0,
    cycleTimeVariancePercent: number = 0
  ): ProductionReadinessReport {
    const machineAssessments: MachineMatchAssessment[] = machineMatches.map((m) => ({
      machineId: m.machineId,
      isCapable: m.capacityKn >= m.requiredKn,
      tonnageCapacityKn: m.capacityKn,
      requiredClampingForceKn: m.requiredKn,
    }));

    const riskFactors: string[] = [];
    const incapableMachines = machineAssessments.filter((m) => !m.isCapable);
    if (incapableMachines.length > 0) {
      riskFactors.push(`INSUFFICIENT_CLAMPING_FORCE_${incapableMachines.length}_MACHINES`);
    }
    if (unresolvedTrialDefects > 0) {
      riskFactors.push(`UNRESOLVED_TRIAL_DEFECTS_${unresolvedTrialDefects}`);
    }
    if (cycleTimeVariancePercent > 20) {
      riskFactors.push('CYCLE_TIME_VARIANCE_EXCEEDS_20_PERCENT');
    }

    let readinessScore = 100;
    if (incapableMachines.length > 0) readinessScore -= incapableMachines.length * 25;
    if (unresolvedTrialDefects > 0) readinessScore -= unresolvedTrialDefects * 10;
    if (cycleTimeVariancePercent > 20) readinessScore -= 15;
    readinessScore = Math.max(0, Math.min(100, readinessScore));

    const report: ProductionReadinessReport = {
      projectId,
      tenantId,
      readinessScore,
      machineAssessments,
      unresolvedTrialDefects,
      riskFactors,
      isAutonomousDecision: false, // Mandatory invariant
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[MFG-INTELLIGENCE] Project=${projectId} Tenant=${tenantId} ReadinessScore=${readinessScore} ` +
      `IncapableMachines=${incapableMachines.length} Defects=${unresolvedTrialDefects}`
    );

    return report;
  }
}
