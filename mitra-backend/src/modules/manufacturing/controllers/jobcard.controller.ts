import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ShopFloorService } from '../services/shop-floor.service';

const FLOOR_ROLES = ['ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION'];
const READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturing/job-cards')
export class JobCardController {
  constructor(private readonly service: ShopFloorService) {}

  @UseGuards(RolesGuard)
  @Roles(...FLOOR_ROLES)
  @Post(':id/start')
  async start(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { operatorId?: string; machineId?: string; startTime?: string; shift?: string }, @CurrentUser() user: AuthUser) {
    return this.service.startJob(id, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...FLOOR_ROLES)
  @Post(':id/production')
  async logProduction(@Param('id', ParseUUIDPipe) id: string, @Body() dto: {
    qtyProduced: number; qtyRejected?: number; qtyRework?: number; qtyScrap?: number;
    endTime?: string; downtimeMinutes?: number; downtimeReason?: string;
    setupTimeMinutes?: number; rejectionReason?: string; remarks?: string;
  }, @CurrentUser() user: AuthUser) {
    return this.service.logProduction(id, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...FLOOR_ROLES)
  @Post(':id/transition')
  async transition(@Param('id', ParseUUIDPipe) id: string, @Body() dto: {
    transition: string;
    holdReason?: string;
    remarks?: string;
    qtyProduced?: number;
    completedQuantity?: number;
    qtyScrap?: number;
    scrapQuantity?: number;
    qtyRejected?: number;
    rejectedQuantity?: number;
    operatorId?: string;
    machineId?: string;
  }, @CurrentUser() user: AuthUser) {
    return this.service.transitionJob(id, dto.transition as keyof typeof import('../manufacturing.constants').JOB_TRANSITIONS, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...FLOOR_ROLES)
  @Patch(':id/transition')
  async patchTransition(@Param('id', ParseUUIDPipe) id: string, @Body() dto: {
    transition: string;
    holdReason?: string;
    remarks?: string;
    qtyProduced?: number;
    completedQuantity?: number;
    qtyScrap?: number;
    scrapQuantity?: number;
    qtyRejected?: number;
    rejectedQuantity?: number;
    operatorId?: string;
    machineId?: string;
  }, @CurrentUser() user: AuthUser) {
    return this.service.transitionJob(id, dto.transition as keyof typeof import('../manufacturing.constants').JOB_TRANSITIONS, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get()
  async findAll(@Query() q: { workOrderId?: string; status?: string; machineId?: string }, @CurrentUser() user: AuthUser) {
    return this.service.listJobCards(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }
}
