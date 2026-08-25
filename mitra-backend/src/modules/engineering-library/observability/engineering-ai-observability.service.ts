import { Injectable, Logger } from '@nestjs/common';

export interface AiExecutionMetrics {
  queryId: string;
  tenantId: string;
  durationMs: number;
  retrievalLatencyMs: number;
  candidateCount: number;
  graphHopCount: number;
  citationCount: number;
  isRefusal: boolean;
  refusalReason?: string;
  timestamp: string;
}

@Injectable()
export class EngineeringAiObservabilityService {
  private readonly logger = new Logger(EngineeringAiObservabilityService.name);
  private readonly metricsHistory: AiExecutionMetrics[] = [];

  /**
   * Record AI execution metrics safely without secret or token leakage.
   */
  recordExecution(metrics: AiExecutionMetrics): void {
    const sanitized: AiExecutionMetrics = {
      ...metrics,
      timestamp: metrics.timestamp || new Date().toISOString(),
    };

    this.metricsHistory.push(sanitized);
    if (this.metricsHistory.length > 500) {
      this.metricsHistory.shift();
    }

    this.logger.log(
      `[AI-OBSERVABILITY] Query=${sanitized.queryId} Tenant=${sanitized.tenantId} ` +
      `Latency=${sanitized.durationMs}ms (Retrieval=${sanitized.retrievalLatencyMs}ms) ` +
      `Candidates=${sanitized.candidateCount} GraphHops=${sanitized.graphHopCount} ` +
      `Citations=${sanitized.citationCount} Refusal=${sanitized.isRefusal}`
    );
  }

  /**
   * Retrieve aggregate performance diagnostics for observability.
   */
  getAggregateMetrics() {
    const total = this.metricsHistory.length;
    if (total === 0) {
      return {
        totalQueries: 0,
        averageDurationMs: 0,
        averageRetrievalLatencyMs: 0,
        refusalRate: 0,
      };
    }

    const avgDuration = this.metricsHistory.reduce((acc, m) => acc + m.durationMs, 0) / total;
    const avgRetrieval = this.metricsHistory.reduce((acc, m) => acc + m.retrievalLatencyMs, 0) / total;
    const refusalCount = this.metricsHistory.filter((m) => m.isRefusal).length;

    return {
      totalQueries: total,
      averageDurationMs: Math.round(avgDuration),
      averageRetrievalLatencyMs: Math.round(avgRetrieval),
      refusalRate: parseFloat((refusalCount / total).toFixed(3)),
    };
  }

  /**
   * Reset metrics (useful in testing).
   */
  resetMetrics(): void {
    this.metricsHistory.length = 0;
  }
}
