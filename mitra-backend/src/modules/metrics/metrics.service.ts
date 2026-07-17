import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';

/**
 * Prometheus metrics service.
 *
 * Exposes:
 *   - http_requests_total          (counter)   — requests by method/route/status
 *   - http_request_duration_seconds (histogram) — latency percentiles
 *   - http_errors_total            (counter)   — 4xx/5xx by route
 *   - db_pool_active               (gauge)     — TypeORM pool active connections
 *   - db_pool_idle                 (gauge)     — TypeORM pool idle connections
 *   + default Node.js process metrics (memory, CPU, event loop lag)
 *
 * GET /api/metrics returns text/plain Prometheus exposition format.
 * This endpoint is restricted to ADMIN role — it leaks internal system state.
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  readonly httpErrorsTotal = new Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors (4xx + 5xx)',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly dbPoolActive = new Gauge({
    name: 'db_pool_active_connections',
    help: 'Number of active TypeORM DB pool connections',
    registers: [this.registry],
  });

  readonly dbPoolIdle = new Gauge({
    name: 'db_pool_idle_connections',
    help: 'Number of idle TypeORM DB pool connections',
    registers: [this.registry],
  });

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    // Default Node.js metrics: heap, RSS, CPU, GC, event-loop lag
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'mitra_',
    });

    // Poll pool stats every 15 seconds
    setInterval(() => this.pollPoolStats(), 15_000);
  }

  private pollPoolStats() {
    try {
      const driver = (this.dataSource.driver as any);
      const pool   = driver?.pool ?? driver?.master;
      if (pool) {
        this.dbPoolActive.set(pool.totalCount ?? 0);
        this.dbPoolIdle.set(pool.idleCount ?? 0);
      }
    } catch { /* pool not yet initialized */ }
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  recordRequest(method: string, route: string, statusCode: number, durationMs: number) {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs / 1000);
    if (statusCode >= 400) {
      this.httpErrorsTotal.inc(labels);
    }
  }
}
