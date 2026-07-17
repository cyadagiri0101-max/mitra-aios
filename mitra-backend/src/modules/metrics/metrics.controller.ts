import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint.
   *
   * Returns RED metrics (Rate/Errors/Duration) for all HTTP routes,
   * TypeORM DB pool stats, and default Node.js process metrics.
   *
   * Restricted to ADMIN — this endpoint reveals internal system topology.
   * In production, configure your Prometheus scraper to use a service
   * account with ADMIN credentials, or run a separate internal metrics
   * port (METRICS_PORT env var) without authentication.
   */
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics — ADMIN only' })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
