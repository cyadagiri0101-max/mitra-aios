import { Injectable, Logger } from '@nestjs/common';

export interface ProjectRiskFactors {
  projectId: string;
  tenantId: string;
  ecrVelocityPerWeek: number;
  workloadSaturationPercent: number;
  historicalDefectCount: number;
}

export interface PredictiveRiskAssessment {
  projectId: string;
  tenantId: string;
  predictiveRiskScore: number; // 0-100 (0 = low risk, 100 = critical risk)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomalySignals: string[];
  recommendations: {
    action: string;
    confidence: number;
    evidenceSource: string;
  }[];
  isAutonomousDecision: false;
  timestamp: string;
}

@Injectable()
export class EnterprisePredictiveIntelligenceService {
  private readonly logger = new Logger(EnterprisePredictiveIntelligenceService.name);

  /**
   * Generates explainable predictive intelligence assessments for engineering projects.
   */
  evaluatePredictiveRisk(input: ProjectRiskFactors): PredictiveRiskAssessment {
    const anomalySignals: string[] = [];
    const recommendations: PredictiveRiskAssessment['recommendations'] = [];

    let score = 10; // baseline risk

    if (input.ecrVelocityPerWeek > 5) {
      score += 35;
      anomalySignals.push('HIGH_ECR_VELOCITY_SPIKE');
      recommendations.push({
        action: 'Schedule interim design review with lead tooling engineer',
        confidence: 0.92,
        evidenceSource: 'ECR Velocity Baseline Model',
      });
    }

    if (input.workloadSaturationPercent > 90) {
      score += 30;
      anomalySignals.push('DESIGN_TEAM_CAPACITY_OVERLOAD');
      recommendations.push({
        action: 'Re-balance workload across available senior design engineers',
        confidence: 0.88,
        evidenceSource: 'Design Capacity Allocation Engine',
      });
    }

    if (input.historicalDefectCount > 3) {
      score += 25;
      anomalySignals.push('HISTORICAL_DEFECT_CORRELATION_WARNING');
      recommendations.push({
        action: 'Enforce pre-release DFM simulation gate before tool freeze',
        confidence: 0.95,
        evidenceSource: 'MEKB Historical Defect Knowledge Graph',
      });
    }

    const predictiveRiskScore = Math.max(0, Math.min(100, score));
    let riskLevel: PredictiveRiskAssessment['riskLevel'] = 'LOW';
    if (predictiveRiskScore >= 75) riskLevel = 'CRITICAL';
    else if (predictiveRiskScore >= 50) riskLevel = 'HIGH';
    else if (predictiveRiskScore >= 25) riskLevel = 'MEDIUM';

    const assessment: PredictiveRiskAssessment = {
      projectId: input.projectId,
      tenantId: input.tenantId,
      predictiveRiskScore,
      riskLevel,
      anomalySignals,
      recommendations,
      isAutonomousDecision: false, // Mandatory invariant
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[PREDICTIVE-AI] Project=${input.projectId} Tenant=${input.tenantId} Score=${predictiveRiskScore} ` +
      `RiskLevel=${riskLevel} Anomalies=${anomalySignals.length}`
    );

    return assessment;
  }
}
