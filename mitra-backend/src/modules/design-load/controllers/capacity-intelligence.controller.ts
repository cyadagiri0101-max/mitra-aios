import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { CapacityIntelligenceService } from '../services/capacity-intelligence.service';
import { CapacityQueryDto, WhatIfSimulationDto } from '../dto/capacity-planning.dto';

@ApiTags('Capacity Intelligence & Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planning/capacity')
export class CapacityIntelligenceController {
  constructor(private readonly capacityService: CapacityIntelligenceService) {}

  @Get('summary')
  @Permissions('capacity:read')
  @ApiOperation({ summary: 'Get aggregate design demand vs multi-dimensional capacity summary' })
  @ApiResponse({ status: 200, description: 'Capacity summary' })
  async getSummary(
    @Query() dto: CapacityQueryDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.capacityService.getCapacitySummary(dto, user?.tenantId ?? undefined);
  }

  @Get('timeline')
  @Permissions('capacity:read')
  @ApiOperation({ summary: 'Get time-distributed demand vs capacity timeline buckets (Daily/Weekly/Monthly)' })
  async getTimeline(
    @Query() dto: CapacityQueryDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.capacityService.getCapacityTimeline(dto, user?.tenantId ?? undefined);
  }

  @Get('utilization')
  @Permissions('capacity:read')
  @ApiOperation({ summary: 'Get live engineer utilization, allocated vs actual hours, and overload flags' })
  async getUtilization(@CurrentUser() user?: AuthUser) {
    return this.capacityService.getEngineerUtilization(user?.tenantId ?? undefined);
  }

  @Post('what-if')
  @Permissions('capacity:simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run what-if capacity and workload simulation scenario' })
  async runWhatIf(
    @Body() dto: WhatIfSimulationDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.capacityService.runWhatIfSimulation(dto, user?.tenantId ?? undefined);
  }

  @Get('recommendations')
  @Permissions('capacity:read')
  @ApiOperation({ summary: 'Get deterministic capacity leveling & mitigation recommendations' })
  async getRecommendations(@CurrentUser() user?: AuthUser) {
    return this.capacityService.getCapacityRecommendations(user?.tenantId ?? undefined);
  }

  @Get('risks')
  @Permissions('capacity:read')
  @ApiOperation({ summary: 'Get active capacity overload, skill shortage, and bottleneck risk alerts' })
  async getRisks(@CurrentUser() user?: AuthUser) {
    return this.capacityService.getCapacityRisks(user?.tenantId ?? undefined);
  }
}
