import { EngineeringAiObservabilityService, AiExecutionMetrics } from './engineering-ai-observability.service';

describe('EngineeringAiObservabilityService (S6.8)', () => {
  let service: EngineeringAiObservabilityService;

  beforeEach(() => {
    service = new EngineeringAiObservabilityService();
  });

  it('should record execution metrics and calculate aggregate metrics', () => {
    const metric1: AiExecutionMetrics = {
      queryId: 'q-101',
      tenantId: 'tenant-1',
      durationMs: 450,
      retrievalLatencyMs: 80,
      candidateCount: 15,
      graphHopCount: 2,
      citationCount: 4,
      isRefusal: false,
      timestamp: '2026-08-25T12:00:00Z',
    };

    const metric2: AiExecutionMetrics = {
      queryId: 'q-102',
      tenantId: 'tenant-1',
      durationMs: 150,
      retrievalLatencyMs: 40,
      candidateCount: 0,
      graphHopCount: 0,
      citationCount: 0,
      isRefusal: true,
      refusalReason: 'Insufficient evidence',
      timestamp: '2026-08-25T12:01:00Z',
    };

    service.recordExecution(metric1);
    service.recordExecution(metric2);

    const agg = service.getAggregateMetrics();
    expect(agg.totalQueries).toBe(2);
    expect(agg.averageDurationMs).toBe(300);
    expect(agg.averageRetrievalLatencyMs).toBe(60);
    expect(agg.refusalRate).toBe(0.5);
  });

  it('should return zeros for empty metrics history', () => {
    const agg = service.getAggregateMetrics();
    expect(agg.totalQueries).toBe(0);
    expect(agg.averageDurationMs).toBe(0);
  });
});
