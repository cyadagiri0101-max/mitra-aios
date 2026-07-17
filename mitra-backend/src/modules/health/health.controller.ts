import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  /**
   * Readiness probe — verifies DB connectivity.
   * Used by: Docker HEALTHCHECK, Kubernetes readinessProbe, load balancer.
   */
  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — checks DB, returns 200/503' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }

  /**
   * Liveness probe — no external dependency check.
   * If this fails, the container is restarted.
   * Used by: Kubernetes livenessProbe.
   */
  @Public()
  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe — always 200 if process is up' })
  liveness(): Record<string, unknown> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
