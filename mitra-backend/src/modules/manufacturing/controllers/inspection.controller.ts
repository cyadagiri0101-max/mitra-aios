import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { InspectionService } from '../services/inspection.service';
import { CheckpointStatus } from '../entities/inspection-checkpoint.entity';

const INSPECT_ROLES = ['ADMIN', 'MANAGEMENT', 'QUALITY', 'PRODUCTION'];
const READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturing/inspection')
export class InspectionController {
  constructor(private readonly service: InspectionService) {}

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('checkpoints/:workOrderId')
  async listByWorkOrder(@Param('workOrderId', ParseUUIDPipe) workOrderId: string, @Query() q: { status?: CheckpointStatus }, @CurrentUser() user: AuthUser) {
    return this.service.listByWorkOrder(workOrderId, q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...INSPECT_ROLES)
  @Post('checkpoints/:id/result')
  async recordResult(@Param('id', ParseUUIDPipe) id: string, @Body() dto: {
    result: CheckpointStatus; measuredValue?: string; inspectionReportId?: string; remarks?: string;
  }, @CurrentUser() user: AuthUser) {
    return this.service.recordResult(id, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('summary/:workOrderId')
  async summary(@Param('workOrderId', ParseUUIDPipe) workOrderId: string, @CurrentUser() user: AuthUser) {
    return this.service.summary(workOrderId, user.tenantId ?? undefined);
  }
}
