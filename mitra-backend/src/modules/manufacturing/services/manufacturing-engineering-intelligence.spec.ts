import { ManufacturingEngineeringIntelligenceService } from './manufacturing-engineering-intelligence.service';

describe('ManufacturingEngineeringIntelligenceService (S9)', () => {
  let service: ManufacturingEngineeringIntelligenceService;

  beforeEach(() => {
    service = new ManufacturingEngineeringIntelligenceService();
  });

  it('should calculate 100% production readiness on verified machine capacity and 0 trial defects', () => {
    const machineMatches = [
      { machineId: 'm-101', capacityKn: 2500, requiredKn: 2000 },
      { machineId: 'm-102', capacityKn: 3500, requiredKn: 3000 },
    ];

    const report = service.evaluateProductionReadiness('proj-101', 'tenant-alpha', machineMatches, 0, 5);

    expect(report.projectId).toBe('proj-101');
    expect(report.tenantId).toBe('tenant-alpha');
    expect(report.readinessScore).toBe(100);
    expect(report.riskFactors.length).toBe(0);
    expect(report.isAutonomousDecision).toBe(false);
  });

  it('should detect risks and reduce readiness when machine clamping force is insufficient', () => {
    const machineMatches = [
      { machineId: 'm-103', capacityKn: 1500, requiredKn: 2000 },
    ];

    const report = service.evaluateProductionReadiness('proj-102', 'tenant-alpha', machineMatches, 2, 25);

    expect(report.readinessScore).toBe(40);
    expect(report.riskFactors).toContain('INSUFFICIENT_CLAMPING_FORCE_1_MACHINES');

    expect(report.riskFactors).toContain('UNRESOLVED_TRIAL_DEFECTS_2');
    expect(report.riskFactors).toContain('CYCLE_TIME_VARIANCE_EXCEEDS_20_PERCENT');
    expect(report.isAutonomousDecision).toBe(false);
  });
});
