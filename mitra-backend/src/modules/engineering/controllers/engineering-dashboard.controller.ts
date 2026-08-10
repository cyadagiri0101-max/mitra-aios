import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringDashboardService } from '../services/engineering-dashboard.service';
import { DashboardQueryDto } from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('engineering/dashboard')
export class EngineeringDashboardController {
  constructor(private readonly service: EngineeringDashboardService) {}

  @Get('stats')
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:dashboard:read')
  @ApiOperation({ summary: 'Engineering KPIs: counts, status groups, releases, pending reviews' })
  async stats(@CurrentUser() user: AuthUser) {
    return this.service.getStats(user.tenantId);
  }
  @Get('pending-reviews')
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:dashboard:read')
  async pendingReviews(@Query('limit') limit: string, @CurrentUser() user: AuthUser) {
    return this.service.getPendingReviews(user.tenantId, Number(limit) || 50);
  }
}
