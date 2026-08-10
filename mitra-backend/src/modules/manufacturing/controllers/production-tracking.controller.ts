import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ProductionTrackingService } from '../services/production-tracking.service';
import { WorkOrderStatus } from '../entities/workorder.entity';

const READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturing/production')
export class ProductionTrackingController {
  constructor(private readonly service: ProductionTrackingService) {}

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('dashboard')
  async dashboard(@Query() q: { projectId?: string; from?: string; to?: string }, @CurrentUser() user: AuthUser) {
    return this.service.dashboard(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('board')
  async board(@Query() q: { projectId?: string; status?: WorkOrderStatus }, @CurrentUser() user: AuthUser) {
    return this.service.board(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('history/:workOrderId')
  async history(@Param('workOrderId', ParseUUIDPipe) workOrderId: string, @CurrentUser() user: AuthUser) {
    return this.service.history(workOrderId, user.tenantId ?? undefined);
  }
}
