import { EngineeringWorkflowIntelligenceService } from './engineering-workflow-intelligence.service';

describe('EngineeringWorkflowIntelligenceService (S8)', () => {
  let service: EngineeringWorkflowIntelligenceService;

  beforeEach(() => {
    service = new EngineeringWorkflowIntelligenceService();
  });

  it('should calculate complete project workflow health and digital thread coverage', () => {
    const tasks = [
      { stage: 'DESIGN' as const, completed: true },
      { stage: 'DETAILING' as const, completed: true },
      { stage: 'REVIEW' as const, completed: true },
      { stage: 'APPROVAL' as const, completed: true },
      { stage: 'SUBMISSION' as const, completed: true },
    ];

    const report = service.evaluateProjectWorkflowHealth('proj-101', 'tenant-alpha', tasks, 10, 10, 0);

    expect(report.projectId).toBe('proj-101');
    expect(report.tenantId).toBe('tenant-alpha');
    expect(report.digitalThreadCoveragePercent).toBe(100);
    expect(report.overallHealthScore).toBe(100);
    expect(report.bottlenecksDetected.length).toBe(0);
    expect(report.isAutonomousDecision).toBe(false); // Invariant
  });

  it('should detect bottlenecks when ECRs are high and digital thread coverage is low', () => {
    const report = service.evaluateProjectWorkflowHealth('proj-102', 'tenant-alpha', [], 10, 4, 5);

    expect(report.digitalThreadCoveragePercent).toBe(40);
    expect(report.bottlenecksDetected).toContain('HIGH_PENDING_ECR_LOAD');
    expect(report.bottlenecksDetected).toContain('LOW_CAD_BOM_ALIGNMENT');
    expect(report.overallHealthScore).toBeLessThan(80);
    expect(report.isAutonomousDecision).toBe(false);
  });
});
