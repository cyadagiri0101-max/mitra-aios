import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { MaterialManagementService } from '../services/material-management.service';
import { ReservationStatus } from '../entities/material-reservation.entity';

const MATERIAL_ROLES = ['ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION'];
const READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturing/materials')
export class MaterialManagementController {
  constructor(private readonly service: MaterialManagementService) {}

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('reservations')
  async listReservations(@Query() q: { workOrderId?: string; status?: ReservationStatus; partNumber?: string }, @CurrentUser() user: AuthUser) {
    return this.service.listReservations(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...MATERIAL_ROLES)
  @Post('reservations/:id/issue')
  async issue(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { qty?: number; issueDate?: string; storeLocation?: string; remarks?: string }, @CurrentUser() user: AuthUser) {
    return this.service.issue(id, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...MATERIAL_ROLES)
  @Post('reservations/:id/release-unused')
  async releaseUnused(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { qty?: number; remarks?: string }, @CurrentUser() user: AuthUser) {
    return this.service.releaseUnused(id, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...MATERIAL_ROLES)
  @Post('issue-all/:workOrderId')
  async issueAll(@Param('workOrderId', ParseUUIDPipe) workOrderId: string, @Body() dto: { issueDate?: string }, @CurrentUser() user: AuthUser) {
    return this.service.issueAll(workOrderId, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('consumption/:workOrderId')
  async consumption(@Param('workOrderId', ParseUUIDPipe) workOrderId: string, @CurrentUser() user: AuthUser) {
    return this.service.consumptionSummary(workOrderId, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get('shortages')
  async shortages(@Query() q: { workOrderId?: string }, @CurrentUser() user: AuthUser) {
    return this.service.shortages(q, user.tenantId ?? undefined);
  }
}
