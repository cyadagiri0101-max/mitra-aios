import { EngineeringAiControlTowerService } from './engineering-ai-control-tower.service';
import { EngineeringAiObservabilityService } from '../observability/engineering-ai-observability.service';

describe('EngineeringAiControlTowerService (S7)', () => {
  let controlTower: EngineeringAiControlTowerService;
  let observability: EngineeringAiObservabilityService;

  beforeEach(() => {
    observability = new EngineeringAiObservabilityService();
    controlTower = new EngineeringAiControlTowerService(observability);
  });

  it('should return HEALTHY status on clean baseline', () => {
    const health = controlTower.getHealthStatus();
    expect(health.status).toBe('HEALTHY');
    expect(health.totalQueries).toBe(0);
    expect(health.ragHealth).toBe('OPERATIONAL');
  });

  it('should report correct operational KPIs and enforce 0% autonomous decisions', () => {
    observability.recordExecution({
      queryId: 'q-1',
      tenantId: 'tenant-1',
      durationMs: 200,
      retrievalLatencyMs: 50,
      candidateCount: 5,
      graphHopCount: 1,
      citationCount: 2,
      isRefusal: false,
      timestamp: '2026-08-25T13:00:00Z',
    });

    const kpis = controlTower.getOperationalKpis();
    expect(kpis.totalObservedQueries).toBe(1);
    expect(kpis.citationAccuracyRate).toBe(1.0);
    expect(kpis.autonomousDecisionRate).toBe(0.0); // Mandatory invariant
    expect(kpis.hallucinationSuppressionRate).toBe(1.0);
  });
});
