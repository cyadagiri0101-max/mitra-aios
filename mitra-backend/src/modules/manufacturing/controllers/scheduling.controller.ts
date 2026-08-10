import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { SchedulingService } from '../services/scheduling.service';
import { BookingStatus } from '@modules/machine/entities/machinebooking.entity';

const SCHEDULE_ROLES = ['ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION'];
const READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturing/scheduling')
export class SchedulingController {
  constructor(private readonly service: SchedulingService) {}

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('overview')
  async overview(@Query() q: { from?: string; to?: string; machineTypeId?: string }, @CurrentUser() user: AuthUser) {
    return this.service.overview(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...SCHEDULE_ROLES)
  @Post('assign')
  async assign(@Body() dto: { jobId: string; machineId: string; startDatetime?: string; endDatetime?: string; shift?: string }, @CurrentUser() user: AuthUser) {
    return this.service.assignToMachine(dto.jobId, dto.machineId, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...SCHEDULE_ROLES)
  @Post('batch/:workOrderId')
  async batch(@Param('workOrderId', ParseUUIDPipe) workOrderId: string, @CurrentUser() user: AuthUser) {
    return this.service.batchSchedule(workOrderId, user);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('alternates/:jobId')
  async alternates(@Param('jobId', ParseUUIDPipe) jobId: string, @CurrentUser() user: AuthUser) {
    return this.service.alternates(jobId, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('bookings')
  async bookings(@Query() q: { workOrderId?: string; machineId?: string; status?: BookingStatus; from?: string; to?: string }, @CurrentUser() user: AuthUser) {
    return this.service.listBookings(q, user.tenantId ?? undefined);
  }
}
