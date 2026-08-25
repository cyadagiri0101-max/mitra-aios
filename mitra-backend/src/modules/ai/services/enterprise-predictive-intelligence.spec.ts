import { EnterprisePredictiveIntelligenceService } from './enterprise-predictive-intelligence.service';

describe('EnterprisePredictiveIntelligenceService (S11)', () => {
  let service: EnterprisePredictiveIntelligenceService;

  beforeEach(() => {
    service = new EnterprisePredictiveIntelligenceService();
  });

  it('should assess low risk for healthy project with normal velocity and workload', () => {
    const assessment = service.evaluatePredictiveRisk({
      projectId: 'proj-101',
      tenantId: 'tenant-alpha',
      ecrVelocityPerWeek: 1,
      workloadSaturationPercent: 65,
      historicalDefectCount: 0,
    });

    expect(assessment.projectId).toBe('proj-101');
    expect(assessment.tenantId).toBe('tenant-alpha');
    expect(assessment.predictiveRiskScore).toBe(10);
    expect(assessment.riskLevel).toBe('LOW');
    expect(assessment.anomalySignals.length).toBe(0);
    expect(assessment.isAutonomousDecision).toBe(false);
  });

  it('should detect critical risk with multiple anomaly signals and provide explainable recommendations', () => {
    const assessment = service.evaluatePredictiveRisk({
      projectId: 'proj-102',
      tenantId: 'tenant-alpha',
      ecrVelocityPerWeek: 8,
      workloadSaturationPercent: 95,
      historicalDefectCount: 5,
    });

    expect(assessment.predictiveRiskScore).toBe(100); // 10 + 35 + 30 + 25 = 100
    expect(assessment.riskLevel).toBe('CRITICAL');
    expect(assessment.anomalySignals).toContain('HIGH_ECR_VELOCITY_SPIKE');
    expect(assessment.anomalySignals).toContain('DESIGN_TEAM_CAPACITY_OVERLOAD');
    expect(assessment.anomalySignals).toContain('HISTORICAL_DEFECT_CORRELATION_WARNING');
    expect(assessment.recommendations.length).toBe(3);
    expect(assessment.recommendations[0].confidence).toBeGreaterThan(0.85);
    expect(assessment.isAutonomousDecision).toBe(false);
  });
});
