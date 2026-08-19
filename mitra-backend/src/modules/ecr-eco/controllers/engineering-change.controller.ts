import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { EngineeringChangeService, ChangeActor } from '../services/engineering-change.service';

const CHANGE_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'];

@ApiTags('engineering-change')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering-changes')
export class EngineeringChangeController {
  constructor(private readonly service: EngineeringChangeService) {}

  private actor(user: AuthUser): ChangeActor {
    return {
      userId: user.id,
      userRole: [user.role],
      userPermissions: user.permissions,
      tenantId: user.tenantId ?? undefined,
    };
  }

  // ── ECR ───────────────────────────────────────────────────────────────────

  @Get('ecr')
  async findECRs(@Query() query: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.findECRs(user.tenantId, query);
  }

  @Get('ecr/:id')
  async findECR(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findECR(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles(...CHANGE_ROLES)
  @Post('ecr')
  async createECR(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.createECR(body, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles(...CHANGE_ROLES)
  @Patch('ecr/:id')
  async updateECR(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.updateECR(id, body, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Delete('ecr/:id')
  @HttpCode(204)
  async removeECR(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removeECR(id, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles(...CHANGE_ROLES)
  @Post('ecr/:id/link-decision')
  @HttpCode(200)
  async linkDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { decisionId: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.linkDecision(id, body.decisionId, this.actor(user));
  }

  @Get('ecr/:id/workflow')
  async getWorkflow(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.getWorkflow(id, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles(...CHANGE_ROLES)
  @Post('ecr/:id/workflow/transition')
  @HttpCode(200)
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { transitionId: string; remarks?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.transition(id, body.transitionId, this.actor(user), body.remarks);
  }

  // ── Impact analysis ───────────────────────────────────────────────────────

  @Get('ecr/:id/impacts')
  async listImpacts(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listImpacts(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles(...CHANGE_ROLES)
  @Post('ecr/:id/impacts')
  async addImpact(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.addImpact(id, body, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles(...CHANGE_ROLES)
  @Patch('ecr/:id/impacts/:impactId')
  async updateImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('impactId', ParseUUIDPipe) impactId: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateImpact(id, impactId, body, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Delete('ecr/:id/impacts/:impactId')
  @HttpCode(204)
  async removeImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('impactId', ParseUUIDPipe) impactId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeImpact(id, impactId, this.actor(user));
  }

  // ── ECO ───────────────────────────────────────────────────────────────────

  @Get('eco')
  async findECOs(@Query() query: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.findECOs(user.tenantId, query);
  }

  @Get('eco/:id')
  async findECO(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findECO(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN')
  @Post('eco')
  async createECO(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.createECO(body, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN')
  @Patch('eco/:id')
  async updateECO(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.updateECO(id, body, this.actor(user));
  }

  // ── ECN ───────────────────────────────────────────────────────────────────

  @Get('ecn')
  async findECNs(@Query() query: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.findECNs(user.tenantId, query);
  }

  @Get('ecn/:id')
  async findECN(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findECN(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING')
  @Post('eco/:ecoId/ecn')
  async issueECN(@Param('ecoId', ParseUUIDPipe) ecoId: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.issueECN(ecoId, body, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING')
  @Patch('ecn/:id')
  async updateECN(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.updateECN(id, body, this.actor(user));
  }
}
