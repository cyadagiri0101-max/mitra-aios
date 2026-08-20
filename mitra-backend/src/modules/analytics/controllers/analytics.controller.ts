import { Controller, Get, Query, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { AnalyticsDashboardService } from '../services/analytics-dashboard.service';
import { AnalyticsKpiService } from '../services/analytics-kpi.service';
import { AnalyticsReportService } from '../services/analytics-report.service';

const ANALYTICS_READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SERVICE'];

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly dashboardService: AnalyticsDashboardService,
    private readonly kpiService: AnalyticsKpiService,
    private readonly reportService: AnalyticsReportService,
  ) {}

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(...ANALYTICS_READ_ROLES)
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Executive BI dashboard payload assembled from existing domain services' })
  async executiveDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getExecutiveDashboard(user.tenantId ?? undefined);
  }

  @Get('dashboard/widgets')
  @UseGuards(RolesGuard)
  @Roles(...ANALYTICS_READ_ROLES)
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'List configurable BI dashboard widgets' })
  async widgets() {
    return this.dashboardService.getWidgetDefinitions();
  }

  @Get('kpis')
  @UseGuards(RolesGuard)
  @Roles(...ANALYTICS_READ_ROLES)
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'List KPI definitions and latest computed values from the shared KPI engine' })
  async kpis(@CurrentUser() user: AuthUser, @Query('period') period = '30d') {
    return this.kpiService.getKpis(user.tenantId ?? undefined, period);
  }

  @Get('trends')
  @UseGuards(RolesGuard)
  @Roles(...ANALYTICS_READ_ROLES)
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Monthly project and quality time series from real record creation dates (deterministic, not a forecast)' })
  async trends(@CurrentUser() user: AuthUser, @Query('months') months?: string) {
    const bucketCount = months ? parseInt(months, 10) : 6;
    return this.dashboardService.getTrends(user.tenantId ?? undefined, Number.isNaN(bucketCount) ? 6 : bucketCount);
  }

  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles(...ANALYTICS_READ_ROLES)
  @Permissions('analytics:report:read')
  @ApiOperation({ summary: 'List saved BI reports and report templates' })
  async reports() {
    return this.reportService.listReports();
  }

  @Get('reports/:id/export')
  @UseGuards(RolesGuard)
  @Roles(...ANALYTICS_READ_ROLES)
  @Permissions('analytics:report:read')
  @ApiOperation({ summary: 'Generate a report export reference for the requested report format' })
  async export(@Param('id', ParseUUIDPipe) id: string, @Query('format') format = 'json') {
    return this.reportService.generateExport(id, format);
  }
}
