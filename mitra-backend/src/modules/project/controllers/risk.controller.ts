import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RiskService } from '../services/risk.service';
import { CreateRiskDto, UpdateRiskDto, CloseRiskDto, ReopenRiskDto, RiskQueryDto } from '../dto/risk.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

const RISK_READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('project-risks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project/:projectId/risks')
export class RiskController {
  constructor(private readonly service: RiskService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...RISK_READ_ROLES)
  @Permissions('project:risk:read')
  @ApiOperation({ summary: 'List risks of a project (paginated, filtered, exposure-ranked)' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() q: RiskQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findByProject(projectId, q, user.tenantId ?? undefined);
  }

  @Get('/dashboard')
  @UseGuards(RolesGuard)
  @Roles(...RISK_READ_ROLES)
  @Permissions('project:risk:read')
  @ApiOperation({ summary: 'Risk dashboard aggregation (status/category/level/exposure)' })
  async dashboard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.dashboard(projectId, user.tenantId ?? undefined);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...RISK_READ_ROLES)
  @Permissions('project:risk:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:risk:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Raise a risk (exposure = impact × probability)' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateRiskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(projectId, dto, user.id, user.email, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:risk:update')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRiskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:risk:close')
  @Post(':id/close')
  @HttpCode(200)
  @ApiOperation({ summary: 'Close a risk' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseRiskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.close(id, dto.resolution ?? null, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:risk:update')
  @Post(':id/reopen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reopen a closed risk' })
  async reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenRiskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.reopen(id, dto.reason ?? null, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:risk:delete')
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}
