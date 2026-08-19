import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { EngineeringDecisionService } from '../services/engineering-decision.service';
import {
  CreateEngineeringDecisionDto,
  UpdateEngineeringDecisionDto,
  RejectDecisionDto,
  SupersedeDecisionDto,
} from '../dto/engineering-decision.dto';

/**
 * Engineering Decision Log (M1 Sprint 1) — the durable, queryable,
 * auditable project decision record mandated by TRACEABILITY_MODEL.md.
 * All lifecycle transitions are permission-gated and audited.
 */
@ApiTags('engineering-decisions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering-decisions')
export class EngineeringDecisionsController {
  constructor(private readonly service: EngineeringDecisionService) {}

  @Get()
  @Permissions('engineering_decision:read')
  async findAll(
    @Query() q: PaginationDto,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.findAll(
      user?.tenantId ?? undefined,
      q.page ?? 1,
      q.limit ?? 20,
      projectId,
      status,
      type,
      search,
    );
  }

  @Get(':id')
  @Permissions('engineering_decision:read')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('engineering_decision:create')
  @Post()
  async create(@Body() dto: CreateEngineeringDecisionDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('engineering_decision:update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEngineeringDecisionDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('engineering_decision:submit')
  @Post(':id/submit')
  @HttpCode(200)
  async submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.submit(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('engineering_decision:approve')
  @Post(':id/approve')
  @HttpCode(200)
  async approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.approve(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('engineering_decision:reject')
  @Post(':id/reject')
  @HttpCode(200)
  async reject(@Param('id') id: string, @Body() dto: RejectDecisionDto, @CurrentUser() user: AuthUser) {
    return this.service.reject(id, dto.reason, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('engineering_decision:cancel')
  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('engineering_decision:supersede')
  @Post(':id/supersede')
  @HttpCode(200)
  async supersede(
    @Param('id') id: string,
    @Body() dto: SupersedeDecisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.supersede(id, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering_decision:cancel')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user.id, user.tenantId);
  }
}